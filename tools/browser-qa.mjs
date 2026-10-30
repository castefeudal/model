#!/usr/bin/env node
/* Visual and behavioral QA for all three international editorial editions.
   Uses installed Chrome via CDP; no npm dependencies. */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
const chrome=process.env.CHROME_BIN||"google-chrome",port=9456;
const child=spawn(chrome,["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-first-run","--remote-allow-origins=*","--remote-debugging-port="+port,"--user-data-dir=/tmp/model-editions-"+process.pid,"about:blank"],{stdio:"ignore"});
let sock,seq=0;const pending=new Map(),handlers=new Map();const on=(e,h)=>{handlers.set(e,h);return()=>handlers.delete(e)};
async function endpoint(){
 for(let i=0;i<110;i++){
  if(child.exitCode!=null)throw Error("Chrome failed to start");
  try{const r=await fetch("http://127.0.0.1:"+port+"/json/list");if(r.ok){const a=await r.json(),p=a.find(x=>x.type==="page");if(p)return p.webSocketDebuggerUrl}}catch{}
  await sleep(100);
 }throw Error("Chrome DevTools not ready");
}
async function connect(url){
 sock=new WebSocket(url);
 await new Promise((ok,fail)=>{sock.addEventListener("open",ok,{once:true});sock.addEventListener("error",fail,{once:true})});
 sock.addEventListener("message",event=>{
  const v=JSON.parse(event.data);
  if(v.id){const p=pending.get(v.id);if(p){pending.delete(v.id);v.error?p.reject(Error(v.error.message)):p.resolve(v.result)}}
  else if(v.method&&handlers.has(v.method))handlers.get(v.method)(v.params);
 });
}
function send(method,params={}){const id=++seq;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});sock.send(JSON.stringify({id,method,params}))})}
async function go(url){
 let finish;const ready=new Promise(resolve=>finish=resolve);
 const off=on("Page.loadEventFired",()=>{off();finish()});
 const r=await send("Page.navigate",{url});if(r.errorText)throw Error(r.errorText);
 await Promise.race([ready,sleep(15000).then(()=>{throw Error("Navigation timeout "+url)})]);
 await exec('document.fonts.ready.then(()=>true)');
 await sleep(350);
}
async function exec(expression){
 const response=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
 if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text||"Browser code failed");
 return response.result.value;
}
async function screenshot(label){
 const s=await send("Page.captureScreenshot",{format:"jpeg",quality:73,captureBeyondViewport:false});
 console.log("SCREENSHOT_"+label+"_BEGIN");console.log(s.data);console.log("SCREENSHOT_"+label+"_END");
}
const state='(()=>{const $=s=>document.querySelector(s),h=$("#heroHeading"),v=$("#heroArtwork"),r=h.getBoundingClientRect();return {lang:document.documentElement.lang,edition:document.documentElement.dataset.edition,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth-innerWidth,heroBg:getComputedStyle($(".hero")).backgroundColor,art:getComputedStyle(v).backgroundImage,heading:h.innerText,headingScroll:h.scrollWidth-headingWidth(),headingLeft:r.left,headingRight:r.right,hasGallery:!!$("#gallery"),specs:document.querySelectorAll("#specGrid>div").length,cardActions:document.querySelectorAll("[data-open-card]").length,menuVisible:getComputedStyle($("#menuToggle")).display!=="none"};function headingWidth(){return h.clientWidth}})()';
const tests=[
 {label:"RU_DESKTOP",lang:"ru",width:1440,height:900},
 {label:"EN_DESKTOP",lang:"en",width:1440,height:900},
 {label:"ZH_DESKTOP",lang:"zh",width:1440,height:900},
 {label:"RU_MOBILE",lang:"ru",width:390,height:844},
 {label:"EN_MOBILE",lang:"en",width:390,height:844},
 {label:"ZH_MOBILE",lang:"zh",width:360,height:800},
 {label:"RU_TABLET",lang:"ru",width:768,height:1024}
];
let errors=[],passed=[];
try{
 await connect(await endpoint());await send("Page.enable");await send("Runtime.enable");
 on("Runtime.exceptionThrown",p=>errors.push(p.exceptionDetails?.exception?.description||p.exceptionDetails?.text||"Uncaught browser exception"));
 for(const x of tests){
  await send("Emulation.setDeviceMetricsOverride",{width:x.width,height:x.height,deviceScaleFactor:1,mobile:x.width<=760});
  await go("http://127.0.0.1:8765/?lang="+x.lang);
  const v=await exec(state);
  console.log("TEST "+x.label+" "+JSON.stringify(v));
  assert.equal(v.edition,x.lang,"Wrong edition after direct language link");
  assert(v.lang.toLowerCase().startsWith(x.lang),"Wrong HTML lang");
  assert(v.art.includes("edition-"+x.lang+".svg"),"Art not tied to edition");
  assert(v.overflow<=2,"Horizontal overflow "+v.overflow);
  const clarity=await exec('(()=>{const s=x=>parseFloat(getComputedStyle(document.querySelector(x)).fontSize);return {body:s("body"),detail:s(".hero-detail"),section:s(".section-description"),screen:s(".screen-details>p"),about:s(".about-copy>p:not(.about-opening)"),contact:s(".contact-pending"),nav:s(".site-nav a"),language:s(".lang-btn"),button:s(".hero-actions .action"),specLabel:s(".spec-grid dt"),factLabel:s(".fact-label"),facts:!!document.querySelector(".facts-bar"),shots:document.querySelectorAll(".shot-card").length,portfolioEmpty:!!document.querySelector(".portfolio-pending")};})()');
  console.log("TYPOGRAPHY "+x.label+" "+JSON.stringify(clarity));
  assert(clarity.body>=16,"Body smaller than 16px");
  assert(clarity.detail>=15,"Hero detail too small");
  assert(clarity.section>=15,"Section descriptions too small");
  assert(clarity.screen>=15,"On-camera details too small");
  assert(clarity.about>=16,"About text too small");
  assert(clarity.contact>=16,"Booking text too small");
  assert(clarity.nav>=12,"Navigation too small");
  assert(clarity.language>=12,"Language switch too small");
  assert(clarity.button>=13,"Primary button label too small");
  assert(clarity.specLabel>=12,"Casting labels too small");
  assert(clarity.factLabel>=11,"Stats labels too small");
  assert(clarity.facts&&clarity.portfolioEmpty&&clarity.shots===3,"Casting layout incomplete");
  assert(v.headingLeft>=-5&&v.headingRight<=x.width+5,"Heading outside viewport");
  assert(v.headingScroll<=4,"Heading text overflow "+v.headingScroll);
  assert(v.specs>=7&&v.cardActions>=2&&v.hasGallery,"Casting functions unavailable");
  if(x.width<=760)assert(v.menuVisible,"Mobile navigation unavailable");
  // Real dialog, not a dead placeholder.
  await exec('document.querySelector("[data-open-card]").click()');
  assert(await exec('document.querySelector("#compDialog").open'),"Comp card did not open");
  await exec('document.querySelector("#closeComp").click()');
  assert(!(await exec('document.querySelector("#compDialog").open')),"Comp card did not close");
  await screenshot(x.label);
  if(x.label==="EN_DESKTOP"){
   await exec('document.querySelector("#portfolio").scrollIntoView({behavior:"instant"})');
   await sleep(500);await screenshot("PORTFOLIO");
  }
  if(x.label==="ZH_MOBILE"){
   await exec('document.querySelector("#profile").scrollIntoView({behavior:"instant"})');
   await sleep(450);await screenshot("PROFILE_ZH");
  }
  passed.push(x.label);
 }
 // No navigation/reload during theme and language switching; URL and content follow.
 await send("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 // Stay on the same document. A hash-only navigation does not emit loadEventFired in Chrome.
 await exec('window.__editionProbe="retained";document.querySelector(".lang-btn[data-lang=ru]").click();true');
 await exec('document.querySelector(".lang-btn[data-lang=en]").click();true');
 let change=await exec('({edition:document.documentElement.dataset.edition,text:document.querySelector("#heroHeading").innerText,url:location.search,probe:window.__editionProbe,lang:document.documentElement.lang})');
 assert.equal(change.edition,"en");assert.equal(change.probe,"retained");assert(change.url.includes("lang=en"));assert(change.text.includes("PAVEL"));
 await exec('document.querySelector(".lang-btn[data-lang=zh]").click();true');
 change=await exec('({edition:document.documentElement.dataset.edition,text:document.querySelector("#heroHeading").innerText,url:location.search,probe:window.__editionProbe,lang:document.documentElement.lang})');
 assert.equal(change.edition,"zh");assert.equal(change.probe,"retained");assert(change.url.includes("lang=zh"));assert(change.text.includes("帕维尔"));assert.equal(change.lang,"zh-CN");
 await exec('document.querySelector(".lang-btn[data-lang=ru]").click();true');
 assert.equal(await exec('document.documentElement.dataset.edition'),"ru");
 if(errors.length)throw Error("Runtime exceptions: "+errors.join(" | "));
 console.log("PASS: "+passed.join(", ")+"; theme-switch RU→EN→ZH→RU without reload; dialogs; URLs; no JS exceptions.");
}catch(err){console.error("FAIL — "+err.stack);process.exitCode=1}
finally{try{sock?.close()}catch{}child.kill("SIGTERM")}
