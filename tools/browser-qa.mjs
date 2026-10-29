#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
const chrome=process.env.CHROME_BIN||"google-chrome",port=9456;
const child=spawn(chrome,["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-first-run","--remote-allow-origins=*","--remote-debugging-port="+port,"--user-data-dir=/tmp/model-chrome-"+process.pid,"about:blank"],{stdio:"ignore"});
let sock,seq=0;
const pending=new Map(),handlers=new Map();
const on=(event,handler)=>{handlers.set(event,handler);return()=>handlers.delete(event)};
async function waitDevtools(){
 for(let n=0;n<100;n++){if(child.exitCode!=null)throw Error("Chrome exited early");
  try{const r=await fetch("http://127.0.0.1:"+port+"/json/list");if(r.ok){const v=await r.json();const tab=v.find(t=>t.type==="page");if(tab)return tab.webSocketDebuggerUrl}}catch{}
  await sleep(100);
 }throw Error("Chrome debugging endpoint unavailable")
}
async function cdpConnect(url){
 sock=new WebSocket(url);
 await new Promise((resolve,reject)=>{sock.addEventListener("open",resolve,{once:true});sock.addEventListener("error",reject,{once:true})});
 sock.addEventListener("message",ev=>{
  const msg=JSON.parse(ev.data);
  if(msg.id){const p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result)}
  else if(msg.method&&handlers.has(msg.method))handlers.get(msg.method)(msg.params);
 });
}
function send(method,params={}){
 const id=++seq;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});sock.send(JSON.stringify({id,method,params}))});
}
async function navigate(url){
 let finish;const done=new Promise(resolve=>finish=resolve);
 const off=on("Page.loadEventFired",()=>{off();finish()});
 const resp=await send("Page.navigate",{url});if(resp.errorText)throw Error(resp.errorText);
 await Promise.race([done,sleep(12000).then(()=>{throw Error("Page load timeout "+url)})]);await sleep(700);
}
async function evaluate(expression){
 const v=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
 if(v.exceptionDetails)throw Error(v.exceptionDetails.text||"Browser expression failed");
 return v.result.value;
}
let faults=[];
try{
 await cdpConnect(await waitDevtools());await send("Page.enable");await send("Runtime.enable");
 on("Runtime.exceptionThrown",p=>faults.push(p.exceptionDetails?.exception?.description||p.exceptionDetails?.text||"Browser exception"));
 const cases=[{width:1440,height:900,lang:"ru",label:"DESKTOP"},{width:390,height:844,lang:"en",label:"MOBILE_EN"},{width:360,height:800,lang:"zh",label:"MOBILE_ZH"},{width:768,height:1024,lang:"ru",label:"TABLET"}];
 const statement='(()=>{const $=s=>document.querySelector(s);const w=window.innerWidth;const b=$("#heroHeading").getBoundingClientRect();return {lang:document.documentElement.lang,innerWidth:w,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth-w,heading:{left:b.left,right:b.right},hasArt:!!$("#heroArtwork"),specs:document.querySelectorAll("#specGrid>div").length,portfolio:!!$("#portfolio"),styles:getComputedStyle($(".hero")).display,menuVisible:getComputedStyle($("#menuToggle")).display!=="none",cardButtons:document.querySelectorAll("[data-open-card]").length,interlude:!!$(".motion-interlude")};})()';
 for(const test of cases){
  await send("Emulation.setDeviceMetricsOverride",{width:test.width,height:test.height,deviceScaleFactor:1,mobile:test.width<=760});
  await navigate("http://127.0.0.1:8765/?lang="+test.lang);
  const result=await evaluate(statement);
  console.log(test.label+" "+JSON.stringify(result));
  assert(result.lang.toLowerCase().startsWith(test.lang));
  assert(result.overflow<=2,"Horizontal overflow "+test.label+" "+result.overflow);
  assert(result.specs>=7,"Profile values missing");
  assert(result.hasArt&&result.interlude);
  assert(result.heading.left>=-6&&result.heading.right<=test.width+6,"Heading out of viewport");
  if(test.width<=760)assert(result.menuVisible,"Mobile menu button missing");
  await evaluate('document.querySelector("[data-open-card]").click()');
  assert(await evaluate('document.querySelector("#compDialog").open'),"Comp card did not open");
  await evaluate('document.querySelector("#closeComp").click()');
  assert(!(await evaluate('document.querySelector("#compDialog").open')),"Comp card did not close");
  if(test.label==="DESKTOP"||test.label==="MOBILE_EN"){
   const shot=await send("Page.captureScreenshot",{format:"jpeg",quality:67,captureBeyondViewport:false});
   console.log("SCREENSHOT_"+test.label+"_BEGIN");
   console.log(shot.data);
   console.log("SCREENSHOT_"+test.label+"_END");
   if(test.label==="DESKTOP"||test.label==="MOBILE_EN"){
    const section=test.label==="DESKTOP"?"#portfolio":"#profile";
    await evaluate('document.documentElement.style.scrollBehavior="auto";document.querySelector("'+section+'").scrollIntoView({behavior:"instant"});true');
    await sleep(1100);
    const extra=await send("Page.captureScreenshot",{format:"jpeg",quality:64,captureBeyondViewport:false});
    const name=test.label==="DESKTOP"?"PORTFOLIO":"MOBILE_PROFILE";
    console.log("SCREENSHOT_"+name+"_BEGIN");
    console.log(extra.data);
    console.log("SCREENSHOT_"+name+"_END");
   }
  }
 }
 assert(!faults.length,"Browser JS exception(s): "+faults.join(" | "));
 console.log("PASS — responsive widths, 3 languages, card dialogs, no JS exceptions.");
}catch(err){console.error("FAIL — "+err.stack);process.exitCode=1}
finally{try{sock?.close()}catch{}child.kill("SIGTERM")}
