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
 {label:"RU_TABLET",lang:"ru",width:768,height:1024},
 {label:"EN_SMALL_LAPTOP",lang:"en",width:1024,height:768},
 {label:"RU_320",lang:"ru",width:320,height:740},
 {label:"ZH_320",lang:"zh",width:320,height:740}
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
  const colors=await exec('(()=>{const samples=[".hero-detail",".section-description",".portfolio-pending>p",".shot-card p",".spec-grid dt",".spec-grid dd",".screen-details>p",".about-copy>p:not(.about-opening)",".contact-pending",".site-nav a",".lang-btn[aria-pressed=true]"];function parse(s){const values=s.match(/[0-9.]+/g);if(!values||values.length<3)return [0,0,0,1];const n=values.map(Number),unit=s.startsWith("color(")?255:1;return [n[0]*unit,n[1]*unit,n[2]*unit,n[3]===undefined?1:n[3]]}function blend(a,b){return a.slice(0,3).map((x,i)=>x*a[3]+b[i]*(1-a[3]))}function bg(el){const list=[];for(let n=el;n;n=n.parentElement)list.push(parse(getComputedStyle(n).backgroundColor));let c=[255,255,255];for(let i=list.length-1;i>=0;i--)c=blend(list[i],c);return c;}function lum(a){const c=a.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]}function ratio(el){const f=parse(getComputedStyle(el).color),back=bg(el),fg=blend(f,back),l1=lum(fg),l2=lum(back);return +((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)).toFixed(2)}return Object.fromEntries(samples.map(s=>[s,ratio(document.querySelector(s))]))})()');
  console.log("CONTRAST "+x.label+" "+JSON.stringify(colors));
  for(const [selector,ratio] of Object.entries(colors))assert(ratio>=4.5,"Text contrast below WCAG AA at "+x.label+" "+selector+": "+ratio);

  assert(v.headingLeft>=-5&&v.headingRight<=x.width+5,"Heading outside viewport");
  assert(v.headingScroll<=4,"Heading text overflow "+v.headingScroll);
  const coverUX=await exec('(()=>{const box=document.querySelector(".hero-shortcuts");const z=document.querySelector(".lang-btn[data-lang=zh]");const r=box.getBoundingClientRect();return {shortcuts:getComputedStyle(box).display,visible:r.height>0 && r.width>0,buttons:box.querySelectorAll("a,button").length,chineseLabel:z.innerText.trim(),imageDisplay:getComputedStyle(document.querySelector("#heroVisual")).backgroundColor}})()');
  if(x.width<=880)assert(coverUX.shortcuts==="grid" && coverUX.visible && coverUX.buttons===2,"Mobile casting actions missing");
  if(x.width>880)assert(coverUX.shortcuts==="none","Desktop should keep original primary actions");
  assert(coverUX.chineseLabel===(x.lang==="zh"?"中文":"ZH"),"Chinese language switch is not legible in "+x.lang);

  const clipped=await exec('(()=>{const selectors=[".hero-name",".portfolio-section .display-heading",".spread-editorial h3",".profile-statement .display-heading",".screen-intro .display-heading",".about-layout .display-heading",".contact-heading"];return selectors.flatMap(sel=>Array.from(document.querySelectorAll(sel)).map(e=>{const r=document.createRange();r.selectNodeContents(e);const b=r.getBoundingClientRect();return {name:sel,left:+b.left.toFixed(1),right:+b.right.toFixed(1)}})).filter(x=>x.left < -6 || x.right>innerWidth+6)})()');
  console.log("CLIPPED_HEADINGS "+x.label+" "+JSON.stringify(clipped));
  assert(!clipped.length,"Text clipped outside viewport: "+JSON.stringify(clipped));

  assert(v.specs>=7&&v.cardActions>=2&&v.hasGallery,"Casting functions unavailable");
  const archiveData=await exec('(()=>({cards:document.querySelectorAll("#gallery .gallery-item").length,images:document.querySelectorAll("#gallery .gallery-item img").length,stamps:document.querySelectorAll("#gallery .gallery-stamp").length,filters:document.querySelectorAll("#galleryFilters .filter").length,screen:document.querySelector(".screen-archive img")?.getAttribute("src"),fashion:document.querySelector(".spread-image img")?.getAttribute("src"),digitalsVisible:!document.querySelector("#portfolioEmpty").hidden}))()');
  assert(archiveData.cards===3 && archiveData.images===3 && archiveData.stamps===3 && archiveData.filters>=4,"Archive gallery is incomplete");
  assert(archiveData.digitalsVisible,"Authentic casting photo placeholder must remain available");
  assert(archiveData.screen?.includes("portrait-stage.webp") && archiveData.fashion?.includes("portrait-fashion.webp"),"Distinct editorial images not loaded");

  const editorial=await exec('(()=>{const s=document.querySelector("#editorialSpread"),d=document.querySelector("#portfolioEmpty"),i=s.querySelector("img");return {has:s.getBoundingClientRect().height>0,portrait:i.complete&&i.naturalWidth>0,alt:i.alt,folded:!d.open,native:d.tagName==="DETAILS",canonical:document.querySelector("link[rel=canonical]").href,og:document.querySelector("meta[property=\\\"og:url\\\"]").content,heading:document.querySelector("#editorialSpreadTitle").innerText};})()');
  assert(editorial.has&&editorial.portrait&&editorial.alt&&editorial.folded&&editorial.native,"Editorial feature/photo disclosure incomplete");
  assert(editorial.canonical.endsWith("?lang="+x.lang)&&editorial.og.endsWith("?lang="+x.lang),"Localized SEO metadata incorrect");
  await exec('document.querySelector("#portfolioEmpty").open=true');
  assert(await exec('document.querySelector("#portfolioEmpty").open'),"Casting photo requirements cannot be opened");
  await exec('document.querySelector("#portfolioEmpty").open=false');

  const portrait=await exec('(()=>{const img=document.querySelector("#heroImage"),comp=document.querySelector("#compPhoto");return {loaded:img.complete&&img.naturalWidth>0,visible:!img.hidden,editorial:document.querySelector("#heroVisual").classList.contains("editorial-cover"),compPending:comp.textContent.includes("PHOTO / PENDING"),imageWidth:img.naturalWidth};})()');
  assert(portrait.loaded&&portrait.visible&&portrait.editorial,"Owned editorial image failed to display");
  assert(portrait.compPending,"Branded editorial cover must not be passed off as a casting headshot");

  if(x.width<=760)assert(v.menuVisible,"Mobile navigation unavailable");
  if(x.width<=1050){
    await exec('document.querySelector("#menuToggle").click()');
    assert(await exec('document.querySelector("#siteNav").classList.contains("open") && document.querySelector("#menuToggle").getAttribute("aria-expanded")==="true"'),"Navigation did not open");
    await exec('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    assert(!(await exec('document.querySelector("#siteNav").classList.contains("open")')),"Escape did not close navigation");
  }

  // Real dialog, not a dead placeholder.
  await exec('document.querySelector("[data-open-card]").click()');
  assert(await exec('document.querySelector("#compDialog").open'),"Comp card did not open");
  await exec('document.querySelector("#closeComp").click()');
  assert(!(await exec('document.querySelector("#compDialog").open')),"Comp card did not close");
  await screenshot(x.label);
  if(x.label==="EN_DESKTOP"){
   await exec('document.querySelector("[data-filter=portraits]").click()');
   assert.equal(await exec('document.querySelectorAll("#gallery .gallery-item").length'),1,"Category filter incorrect");
   await exec('document.querySelector("[data-filter=all]").click()');
   assert.equal(await exec('document.querySelectorAll("#gallery .gallery-item").length'),3,"All archive images not restored");
   await exec('document.querySelector("[data-index]").click()');
   assert(await exec('document.querySelector("#lightbox").open'),"Archive image lightbox did not open");
   await exec('document.querySelector("#lbNext").click()');
   assert.equal(await exec('document.querySelector("#lbCounter").innerText'),"2 / 3","Next photo failed");
   await exec('document.querySelector("#lbClose").click()');
   assert(!(await exec('document.querySelector("#lightbox").open')),"Lightbox did not close");
   await exec('document.querySelector("#archiveHeading").scrollIntoView({behavior:"instant"})');
   await sleep(520);
   await screenshot("ARCHIVE_GALLERY");
   await exec('document.querySelector("#screenTitle").scrollIntoView({behavior:"instant"})');
   await sleep(470);
   await screenshot("ON_CAMERA");
  }
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
 assert.equal(change.edition,"zh");assert.equal(change.probe,"retained");assert(change.url.includes("lang=zh"));assert(change.text.includes("帕维尔"));assert.equal(change.lang,"zh-CN"); assert.equal(await exec('document.querySelector("link[rel=canonical]").href.endsWith("?lang=zh")'),true,"Canonicals must update on language switch");
 await exec('document.querySelector(".lang-btn[data-lang=ru]").click();true');
 assert.equal(await exec('document.documentElement.dataset.edition'),"ru");
 if(errors.length)throw Error("Runtime exceptions: "+errors.join(" | "));
 console.log("PASS: "+passed.join(", ")+"; theme-switch RU→EN→ZH→RU without reload; dialogs; URLs; no JS exceptions.");
}catch(err){console.error("FAIL — "+err.stack);process.exitCode=1}
finally{try{sock?.close()}catch{}child.kill("SIGTERM")}
