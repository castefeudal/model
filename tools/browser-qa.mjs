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
 {label:"RU_1920",lang:"ru",width:1920,height:1080},
 {label:"EN_1920",lang:"en",width:1920,height:1080},
 {label:"ZH_1920",lang:"zh",width:1920,height:1080},
 {label:"EN_375",lang:"en",width:375,height:812},
 {label:"ZH_414",lang:"zh",width:414,height:896},
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
  if(x.lang==="zh"){
    const cjk=await exec('(()=>({fonts:[...document.fonts].filter(f=>f.family.includes("PM CJK")).map(f=>({family:f.family,status:f.status})),remote:!!document.getElementById("pm-fonts-cjk")}))()');
    console.log("LOCAL_CJK_TYPE "+x.label+" "+JSON.stringify(cjk));
    assert(!cjk.remote,"Chinese edition should not request blocked Google font service");
    assert(cjk.fonts.some(f=>f.family==="PM CJK Serif"&&f.status==="loaded"),"Chinese headline font failed to load locally");
    assert(cjk.fonts.some(f=>f.family==="PM CJK Sans"&&f.status==="loaded"),"Chinese UI font failed to load locally");
  }
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
  const latinCss=await exec('!!document.getElementById("pm-latin-fonts")');
  assert.equal(latinCss,x.lang!=="zh","Chinese edition must not download Latin Google Fonts");
  const motionLabel=await exec('(()=>{const b=document.querySelector("#motionToggle"),label=b.querySelector(".motion-switch-label");return {exists:!!label,text:label?.innerText.trim(),icon:!!b.querySelector(".motion-switch-icon")}})()');
  assert(motionLabel.exists&&motionLabel.text&&motionLabel.icon,"Motion switch lost its visible label");
  const coverUX=await exec('(()=>{const box=document.querySelector(".hero-shortcuts");const z=document.querySelector(".lang-btn[data-lang=zh]");const r=box.getBoundingClientRect();return {shortcuts:getComputedStyle(box).display,visible:r.height>0 && r.width>0,buttons:box.querySelectorAll("a,button").length,chineseLabel:z.innerText.trim(),imageDisplay:getComputedStyle(document.querySelector("#heroVisual")).backgroundColor}})()');
  if(x.width<=880){
    assert(coverUX.shortcuts==="grid" && coverUX.visible && coverUX.buttons===2,"Mobile casting actions missing");
    const first=await exec('document.querySelector(".hero-shortcuts [data-open-casting-peek]")?.tagName');
    assert(first==="BUTTON","Mobile primary action must open verified casting specs, not jump over them");
    const keyboard=await exec('(()=>{const e=document.querySelector("#folioTrack");return {focusable:e.tabIndex===0,region:e.getAttribute("role")==="region"}})()');
    assert(keyboard.focusable&&keyboard.region,"Mobile filmstrip not keyboard accessible");
    await exec('(()=>{const e=document.querySelector("#folioTrack");e.focus();e.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));return true})()');
    await sleep(650);
    const position=await exec('document.querySelector("#folioTrack").scrollLeft');
    assert(position>20,"Keyboard ArrowRight did not advance the photo filmstrip");
  }
  if(x.width>880)assert(coverUX.shortcuts==="none","Desktop should keep original primary actions");
  assert(coverUX.chineseLabel===(x.lang==="zh"?"中文":"ZH"),"Chinese language switch is not legible in "+x.lang);

  const clipped=await exec('(()=>{const selectors=[".hero-name",".portfolio-section .display-heading",".spread-editorial h3",".profile-statement .display-heading",".screen-intro .display-heading",".about-layout .display-heading",".contact-heading"];return selectors.flatMap(sel=>Array.from(document.querySelectorAll(sel)).map(e=>{const r=document.createRange();r.selectNodeContents(e);const b=r.getBoundingClientRect();return {name:sel,left:+b.left.toFixed(1),right:+b.right.toFixed(1)}})).filter(x=>x.left < -6 || x.right>innerWidth+6)})()');
  console.log("CLIPPED_HEADINGS "+x.label+" "+JSON.stringify(clipped));
  assert(!clipped.length,"Text clipped outside viewport: "+JSON.stringify(clipped));

  assert(v.specs>=7&&v.cardActions>=2&&v.hasGallery,"Casting functions unavailable");
  const bookingUrls=await exec('Array.from(document.querySelectorAll("#contactMethods a")).map(a=>a.href)');
  assert(bookingUrls.length>=2,"Public project contact routes are missing");
  assert(bookingUrls.some(x=>x.startsWith("https://t.me/markovmade?text=")),"Telegram contact has no localized inquiry draft");
  assert(bookingUrls.some(x=>x.startsWith("mailto:castefeudal@gmail.com?subject=")),"Email contact has no localized subject");

  const archiveData=await exec('(()=>({cards:document.querySelectorAll("#gallery .gallery-item").length,images:document.querySelectorAll("#gallery .gallery-item img").length,stamps:document.querySelectorAll("#gallery .gallery-stamp").length,filters:document.querySelectorAll("#galleryFilters .filter").length,screen:document.querySelector(".screen-archive img")?.getAttribute("src"),fashion:document.querySelector(".spread-image img")?.getAttribute("src"),digitalsVisible:!document.querySelector("#portfolioEmpty").hidden}))()');
  assert(archiveData.cards===3 && archiveData.images===3 && archiveData.stamps===3 && archiveData.filters>=4,"Archive gallery is incomplete");
  assert(await exec('Array.from(document.querySelectorAll("#gallery .gallery-item img")).every(x=>x.getAttribute("src").startsWith("assets/thumbs/"))'),"Gallery must use optimized thumbnails; full quality images reserved for lightbox");
  assert(archiveData.digitalsVisible,"Authentic casting photo placeholder must remain available");
  assert(archiveData.screen?.includes("portrait-stage.webp") && archiveData.fashion?.includes("portrait-athletic.webp"),"Distinct editorial images not loaded");

  // The new portrait and expanded photo-story move this lazy image well below the fold.
  // Decode explicitly rather than falsely treating correct lazy loading as a missing file.
  await exec('document.querySelector("#editorialSpread img").loading="eager";true');
  await exec('document.querySelector("#editorialSpread img").decode().then(()=>true).catch(()=>false)');
  const editorial=await exec('(()=>{const s=document.querySelector("#editorialSpread"),d=document.querySelector("#portfolioEmpty"),i=s.querySelector("img");return {has:s.getBoundingClientRect().height>0,portrait:i.complete&&i.naturalWidth>0,alt:i.alt,folded:!d.open,native:d.tagName==="DETAILS",canonical:document.querySelector("link[rel=canonical]").href,og:document.querySelector("meta[property=\\\"og:url\\\"]").content,heading:document.querySelector("#editorialSpreadTitle").innerText};})()');
  assert(editorial.has&&editorial.portrait&&editorial.alt&&editorial.folded&&editorial.native,"Editorial feature/photo disclosure incomplete");
  assert(editorial.canonical.endsWith("?lang="+x.lang)&&editorial.og.endsWith("?lang="+x.lang),"Localized SEO metadata incorrect");
  await exec('document.querySelector("#portfolioEmpty").open=true');
  assert(await exec('document.querySelector("#portfolioEmpty").open'),"Casting photo requirements cannot be opened");
  await exec('document.querySelector("#portfolioEmpty").open=false');

  const portrait=await exec('(()=>{const img=document.querySelector("#heroImage"),comp=document.querySelector("#compPhoto");return {loaded:img.complete&&img.naturalWidth>0,visible:!img.hidden,editorial:document.querySelector("#heroVisual").classList.contains("editorial-cover"),compArchive:!!comp.querySelector(".comp-archive-image"),archiveDisclosure:!!comp.querySelector(".comp-archive-mark")?.textContent.trim(),imageWidth:img.naturalWidth};})()');
  assert(portrait.loaded&&portrait.visible&&portrait.editorial,"Owned editorial image failed to display");
  const avifDelivery=await exec('(()=>({current:document.querySelector("#heroImage").currentSrc,mobile:document.querySelector("#coverMobileAvif").getAttribute("srcset"),desktop:document.querySelector("#coverDesktopAvif").getAttribute("srcset")}))()');
  assert(avifDelivery.current.includes(".avif")&&avifDelivery.mobile.includes(".avif")&&avifDelivery.desktop.includes(".avif"),"Real optimized AVIF hero not selected by Chromium");
  if(x.width<=880)assert(avifDelivery.current.includes("portrait-fashion-960.avif"),"Mobile should decode the efficient 960 AVIF, not the heavy full-size portrait");
  else assert(avifDelivery.current.includes("portrait-fashion-1600.avif"),"Desktop hero must retain high resolution");
  assert(portrait.compArchive&&portrait.archiveDisclosure,"Comp card requires an explicitly labeled archival photograph");
  const lookData=await exec('(()=>{const b=[...document.querySelectorAll(".cover-choice")];const i=document.querySelector("#heroImage");return {buttons:b.length,pressed:b.filter(x=>x.getAttribute("aria-pressed")==="true").length,image:i.getAttribute("src"),caption:document.querySelector(".visual-caption").innerText,loaded:i.complete&&i.naturalWidth>0}})()');
  assert(lookData.buttons===3&&lookData.pressed===1&&lookData.loaded,"Editorial look selector failed to initialise");
  assert(lookData.image.includes("portrait-fashion.webp"),"First-look cover is not an actual personal archive image");
  assert(await exec('document.querySelector("#coverMobileSource").getAttribute("srcset").includes("portrait-fashion.webp")'),"Mobile cover source should be high quality responsive asset");
  await exec('document.querySelectorAll("[data-cover]")[1].click()');
  assert(await exec('document.querySelector("#heroImage").getAttribute("src").includes("editorial-markovmade.webp")'),"Second cover selection failed");
  await exec('document.querySelectorAll("[data-cover]")[2].click()');
  assert(await exec('document.querySelector("#heroImage").getAttribute("src").includes("portrait-athletic.webp")'),"Third cover selection failed");
  assert(await exec('document.querySelector("#coverMobileAvif").getAttribute("srcset")===""'),"Athletic photo must disable old AVIF source");
  await exec('document.querySelectorAll("[data-cover]")[0].click()');
  assert(await exec('document.querySelector("#heroImage").getAttribute("src").includes("portrait-fashion.webp")'),"Cover did not restore");


  if(x.width<=760)assert(v.menuVisible,"Mobile navigation unavailable");
  if(x.width<=1050){
    await exec('document.querySelector("#menuToggle").click()');
    assert(await exec('document.querySelector("#siteNav").classList.contains("open") && document.querySelector("#menuToggle").getAttribute("aria-expanded")==="true"'),"Navigation did not open");
    await exec('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    assert(!(await exec('document.querySelector("#siteNav").classList.contains("open")')),"Escape did not close navigation");
  }

  // ISSUE 09 / casting-director first: a factual profile in one click.
  assert(!(await exec('document.querySelector("#castingPeek").open')),"Casting Desk should not cover the initial portrait");
  assert(!(await exec('document.querySelector("#archiveCabinet").open')),"The secondary repetitive archive should be closed by default");
  await exec('document.querySelector(innerWidth<=880?".hero-compact-casting":".hero-actions [data-open-casting-peek]").click()');
  assert(await exec('document.querySelector("#castingPeek").open'),"Quick casting overview failed to open");
  const snap=await exec('(()=>{const d=document.querySelector("#castingPeek"),r=d.getBoundingClientRect(),rows=document.querySelectorAll("#peekSpecs .peek-spec"),img=d.querySelector(".peek-picture img");return {left:r.left,right:r.right,rows:rows.length,real:!!img&&img.getAttribute("src").includes("portrait-digital.webp"),height:(innerWidth<=880?document.querySelector(".peek-mobile-head"):document.querySelector(".peek-picture")).getBoundingClientRect().height,firstSpecTop:rows[0]?.getBoundingClientRect().top,specs:[...rows].map(v=>v.innerText)}})()');
  assert(snap.left>=-2&&snap.right<=x.width+2,"Casting Desk overflows viewport width");
  assert(snap.rows>=7&&snap.real&&snap.height>=(x.width<=880?125:260),"Casting Desk must display archival face and verified specifications");
  if(x.width<=880)assert(snap.firstSpecTop<=(x.height-52),"Mobile casting specs should be visible in the first viewport");
  assert(snap.specs.some(x=>x.includes("188")),"Casting Desk lost the verified height");
  assert(await exec('document.querySelector("#peekGallery").getAttribute("href")==="#lookbook"'),"Casting dossier lacks direct photo handoff");
  if(["EN_DESKTOP","RU_MOBILE","ZH_MOBILE"].includes(x.label))await screenshot("CASTING_DESK_"+x.label);
  await exec('document.querySelector("#peekClose").click()');
  assert(!(await exec('document.querySelector("#castingPeek").open')),"Casting overview did not close");
  if(x.label==="RU_MOBILE"){
    await exec('document.querySelector(".hero-shortcuts [data-open-casting-peek]").click()');
    assert(await exec('document.querySelector("#castingPeek").open'),"Above-the-fold casting shortcut failed");
    await exec('document.querySelector("#peekGallery").click()');
    assert(await exec('!document.querySelector("#castingPeek").open && location.hash==="#lookbook"'),"Casting dossier did not hand off to photography");
    await exec('document.querySelector("#top").scrollIntoView({behavior:"instant"})');
  }
  if(x.label==="EN_DESKTOP"){
    await exec('document.querySelector(".hero-proof").click()');
    assert(await exec('document.querySelector("#castingPeek").open'),"Archival face teaser must open Casting Desk");
    await exec('document.querySelector("#peekEnquiry").click()');
    assert(await exec('document.querySelector("#bookingDialog").open')&&!(await exec('document.querySelector("#castingPeek").open')),"Casting Desk booking handoff is broken");
    await exec('document.querySelector("[data-close-booking]").click()');
    await exec('document.querySelector(".hero-proof").click()');
    await exec('document.querySelector("#peekComp").click()');
    assert(await exec('document.querySelector("#compDialog").open'),"Casting Desk printable comp-card handoff failed");
    await exec('document.querySelector("#closeComp").click()');
  }
  // Real dialog, not a dead placeholder.
  await exec('document.querySelector("[data-open-card]").click()');
  assert(await exec('document.querySelector("#compDialog").open'),"Comp card did not open");
  const compImage=await exec('(()=>{const p=document.querySelector("#compPhoto"),i=p.querySelector("img"),cap=p.querySelector(".comp-archive-mark");return {src:i?.getAttribute("src"),ready:i?.complete&&i.naturalWidth>0,label:cap?.textContent.trim(),height:p.getBoundingClientRect().height}})()');
  assert(compImage.src?.includes("portrait-digital.webp")&&compImage.ready&&compImage.label&&compImage.height>220,"Portable casting card must display a real, labeled archive reference");
  if(x.label==="EN_DESKTOP"||x.label==="RU_MOBILE")await screenshot("CASTING_CARD_"+x.label);
  await exec('document.querySelector("#closeComp").click()');
  assert(!(await exec('document.querySelector("#compDialog").open')),"Comp card did not close");
  // Premiere regression: real inquiry dialog, source archive and accessible labels.
  const premiere=await exec('(()=>{const frames=[...document.querySelectorAll(".folio-frame img")].map(i=>i.getAttribute("src")),p=document.querySelector(".portrait-interlude img");return {frames:frames.length,distinct:new Set(frames).size,portrait:p?.getAttribute("src"),triggers:document.querySelectorAll("[data-open-booking]").length,form:!!document.querySelector("#bookingForm"),localeTitle:document.querySelector("#bookingTitle")?.innerText};})()');
  assert(premiere.frames===6&&premiere.distinct===6,"Premiere needs six distinct archive frames");
  assert(premiere.portrait?.includes("portrait-digital.webp")&&premiere.triggers>=3&&premiere.form,"Premiere casting experience incomplete");
  await exec('document.querySelector(innerWidth<=880?".hero-shortcuts [data-open-booking]":".hero-actions [data-open-booking]").click()');
  assert(await exec('document.querySelector("#bookingDialog").open'),"Direct casting enquiry failed to open");
  const enquiry=await exec('(()=>{const d=document.querySelector("#bookingDialog"),r=d.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,email:document.querySelector("#bookingEmail").required,brief:document.querySelector("#bookingDetails").required,copy:!!document.querySelector("#bookingCopy")}})()');
  assert(enquiry.left>=-2&&enquiry.right<=enquiry.width+2,"Booking dialog exceeds screen width");
  assert(enquiry.email&&enquiry.brief&&enquiry.copy,"Enquiry validation / fallback absent");
  const fieldHeights=await exec('["#bookingEmail","#bookingKind","#bookingDetails"].map(sel=>({sel,height:document.querySelector(sel).getBoundingClientRect().height}))');
  console.log("BOOKING_FIELD_DIMENSIONS "+x.label+" "+JSON.stringify(fieldHeights));
  assert(fieldHeights[0].height>=42&&fieldHeights[1].height>=42&&fieldHeights[2].height>=100,"Casting enquiry fields lost usable touch dimensions");

  if(x.label==="EN_DESKTOP"){
    await exec('document.querySelector("#bookingEmail").value="casting@example.com";document.querySelector("#bookingDetails").value="Editorial project, Berlin, 2027, 2 days";Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async t=>{window.__castingCopy=t}}});document.querySelector("#bookingCopy").click();true');
    await sleep(35);
    const copied=await exec('window.__castingCopy||""');
    assert(copied.includes("casting@example.com")&&copied.includes("Berlin")&&copied.includes("Pavel Markov"),"Booking copy does not contain the actual inquiry");
  }
  await exec('document.querySelector("[data-close-booking]").click()');
  assert(!(await exec('document.querySelector("#bookingDialog").open')),"Direct casting enquiry failed to close");

  // Every photographic contact-sheet image opens its OWN full-resolution
  // source, not an unrelated filtered gallery item.
  await exec('document.querySelectorAll(".folio-open")[4].click()');
  assert(await exec('document.querySelector("#lightbox").open'),"Lookbook photo viewer does not open");
  assert.equal(await exec('document.querySelector("#lbCounter").innerText'),"5 / 6","Wrong archival frame");
  assert(await exec('document.querySelector("#lbImage").getAttribute("src").includes("portrait-character.webp")'),"Lookbook is not displaying source photograph");
  await exec('document.querySelector("#lbNext").click()');
  assert.equal(await exec('document.querySelector("#lbCounter").innerText'),"6 / 6","Lookbook next failed");
  await exec('document.querySelector("#lbNext").click()');
  assert.equal(await exec('document.querySelector("#lbCounter").innerText'),"1 / 6","Lookbook wrap-around failed");
  if(x.label==="EN_DESKTOP"){await exec('document.querySelector("#lbImage").decode().then(()=>true).catch(()=>false)');await screenshot("FULLSCREEN_ARCHIVE");}
  await exec('document.querySelector("#lbClose").click()');
  assert(!(await exec('document.querySelector("#lightbox").open')),"Lookbook photo viewer did not close");
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
   await exec('document.querySelector("#archiveCabinet").open=true;document.querySelector("#archiveHeading").scrollIntoView({behavior:"instant"})');
   await sleep(520);
   await screenshot("ARCHIVE_GALLERY");
   await exec('document.querySelector("#screenTitle").scrollIntoView({behavior:"instant"})');
   await sleep(470);
   await screenshot("ON_CAMERA");
   await exec('document.querySelector("#contact").scrollIntoView({behavior:"instant"})');
   await sleep(450);
   await screenshot("CONTACT");
  }
  if(x.label==="EN_DESKTOP"){
   await exec('document.querySelector(".portrait-interlude").scrollIntoView({behavior:"instant"})');
   await sleep(440);
   await screenshot("PORTRAIT_CHAPTER");
   await exec('document.querySelector(".folio-strip").scrollIntoView({behavior:"instant"})');
   await sleep(440);
   await screenshot("LOOKBOOK_GRID");
   await exec('document.querySelector(".header-enquiry").click()');
   assert(await exec('document.querySelector("#bookingDialog").open'),"Header booking control not interactive");
   await screenshot("BOOKING_DIALOG");
   await exec('document.querySelector("[data-close-booking]").click()');
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
 assert(await exec('!!document.getElementById("pm-latin-fonts")'),"Switching from ZH to RU must load Latin display fonts");
 await exec('document.querySelector(".lang-btn[data-lang=en]").click();true');
 let change=await exec('({edition:document.documentElement.dataset.edition,text:document.querySelector("#heroHeading").innerText,url:location.search,probe:window.__editionProbe,lang:document.documentElement.lang})');
 assert.equal(change.edition,"en");assert.equal(change.probe,"retained");assert(change.url.includes("lang=en"));assert(change.text.includes("PAVEL"));
 await exec('document.querySelector(".lang-btn[data-lang=zh]").click();true');
 change=await exec('({edition:document.documentElement.dataset.edition,text:document.querySelector("#heroHeading").innerText,url:location.search,probe:window.__editionProbe,lang:document.documentElement.lang})');
 assert.equal(change.edition,"zh");assert.equal(change.probe,"retained");assert(change.url.includes("lang=zh"));assert(change.text.includes("帕维尔"));assert.equal(change.lang,"zh-CN"); assert.equal(await exec('document.querySelector("link[rel=canonical]").href.endsWith("?lang=zh")'),true,"Canonicals must update on language switch");
 await exec('document.querySelector(".lang-btn[data-lang=ru]").click();true');
 assert.equal(await exec('document.documentElement.dataset.edition'),"ru");
 // Motion must remain user-controlled, legible and safe under OS accessibility rules.
 const beforeMotion=await exec('(()=>{const b=document.querySelector("#motionToggle");return {text:b.innerText.trim(),on:document.documentElement.dataset.motion,pressed:b.getAttribute("aria-pressed")}})()');
 assert(beforeMotion.text.length>0,"Motion button must retain visible localized text");
 await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
 await sleep(80);
 const reducedState=await exec('({motion:document.documentElement.dataset.motion,disabled:document.querySelector("#motionToggle").disabled})');
 assert(reducedState.motion==="off"&&reducedState.disabled,"prefers-reduced-motion must disable editorial motion");
 await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"no-preference"}]});
 await sleep(80);
 await exec('document.querySelector("#motionToggle").click()');
 assert(await exec('document.documentElement.dataset.motion==="off"&&localStorage.getItem("pm-motion")==="off"'),"Manual opt-out not persisted");
 await exec('document.querySelector("#motionToggle").click()');
 assert(await exec('document.documentElement.dataset.motion==="on"&&localStorage.getItem("pm-motion")==="on"'),"Manual motion opt-in not restored");
 if(errors.length)throw Error("Runtime exceptions: "+errors.join(" | "));
 console.log("PASS: "+passed.join(", ")+"; theme-switch RU→EN→ZH→RU without reload; dialogs; URLs; no JS exceptions.");
}catch(err){console.error("FAIL — "+err.stack);process.exitCode=1}
finally{try{sock?.close()}catch{}child.kill("SIGTERM")}
