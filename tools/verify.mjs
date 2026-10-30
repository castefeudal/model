#!/usr/bin/env node
// Self-contained structural checks for the GitHub Pages portfolio.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const root=path.resolve(import.meta.dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const exists=p=>fs.existsSync(path.join(root,p));
const errors=[],ok=msg=>console.log("✓ "+msg),fail=msg=>errors.push(msg);
const required=["index.html","atelier.css","editions.css","clarity.css","art-direction.css","bundle.css","folio.css","premiere.css","finish.css","issue08.css","app.js","polish.js","premiere.js","data/profile.js","data/media.js","data/i18n.js","assets/edition-ru.svg","assets/edition-en.svg","assets/edition-zh.svg","assets/editorial-markovmade.webp","assets/editorial-markovmade-960.avif","assets/editorial-markovmade-1600.avif","assets/portrait-fashion.webp","assets/portrait-athletic.webp","assets/portrait-digital.webp","assets/portrait-stage.webp","assets/portrait-character.webp","assets/social-cover.png","assets/favicon.svg","assets/fonts/NotoSansSC-subset.woff2","assets/fonts/NotoSerifSC-subset.woff2","assets/fonts/covered-glyphs.txt",".nojekyll"];
required.forEach(p=>{if(!exists(p))fail("Missing "+p)});
assert(exists("index.html"),"index missing");
const html=read("index.html");
if(exists("assets/fonts/covered-glyphs.txt")){
 const all=read("data/i18n.js")+html;
 const needed=new Set([...all].filter(ch=>(ch.codePointAt(0)>=0x3400&&ch.codePointAt(0)<=0x9FFF)||
  (ch.codePointAt(0)>=0x3000&&ch.codePointAt(0)<=0x303F)||
  (ch.codePointAt(0)>=0xFF00&&ch.codePointAt(0)<=0xFFEF)));
 const covered=new Set([...read("assets/fonts/covered-glyphs.txt")]);
 const missing=[...needed].filter(ch=>!covered.has(ch));
 if(missing.length)fail("CJK font subset lacks new localized characters: "+missing.join(""));
 else ok("Self-hosted Chinese font glyph coverage: "+needed.size+" required characters");
}
try{execFileSync(process.execPath,["tools/build-css.mjs","--check"],{cwd:root,stdio:"pipe"});ok("Production CSS bundle is fresh")}
catch(e){fail("Production CSS bundle out of date: run node tools/build-css.mjs")}
if(fs.statSync(path.join(root,"bundle.css")).size>65000)fail("Edition 08 design CSS exceeds 65 KB budget");
if(read("tools/build-css.mjs").includes('"atelier.css"')||read("tools/build-css.mjs").includes('"premiere.css"'))fail("Legacy layered CSS must not ship to production");
if(!read("bundle.css").includes("PM CJK Sans"))fail("Self-hosted Simplified Chinese font missing from production CSS");
ok("One editorial CSS source, performance budget and local Chinese typography");
const scripts=["data/profile.js","data/media.js","data/i18n.js","app.js","polish.js","premiere.js","tools/browser-qa.mjs"];
scripts.forEach(p=>{if(!exists(p))return;try{execFileSync(process.execPath,["--check",path.join(root,p)],{stdio:"pipe"});ok("Syntax "+p)}catch(e){fail("JavaScript syntax: "+p+" "+e.stderr?.toString())}});
const sandbox={window:{}};
for(const p of scripts.slice(0,3))if(exists(p))vm.runInNewContext(read(p),sandbox,{filename:p});
const d=sandbox.window.MODEL_I18N,p=sandbox.window.MODEL_PROFILE,photos=sandbox.window.MODEL_PHOTOS||[],archive=sandbox.window.MODEL_ARCHIVE||[],videos=sandbox.window.MODEL_VIDEOS||[];
for(const l of ["ru","en","zh"])if(!d[l])fail("Missing language: "+l);
if(d?.ru && d?.en && d?.zh){
 const sets=Object.fromEntries(["ru","en","zh"].map(l=>[l,new Set(Object.keys(d[l]))]));
 const union=[...new Set(Object.keys(d).flatMap(l=>Object.keys(d[l])))];
 for(const l of ["ru","en","zh"]){const missing=union.filter(k=>!sets[l].has(k));if(missing.length)fail("Untranslated "+l+": "+missing.join(", "));else ok("Locale "+l+": "+sets[l].size+" entries")}
 const used=[...html.matchAll(/data-i18n="([^"]+)"/g)].map(x=>x[1]);
 for(const key of used)if(!d.ru[key])fail("Missing translation key "+key);
 ok("Markup translation keys: "+new Set(used).size);
}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
const duplicates=ids.filter((x,i)=>ids.indexOf(x)!==i);
if(duplicates.length)fail("Duplicate ids: "+duplicates.join(", "));else ok("Unique ids: "+ids.length);
for(const href of html.matchAll(/href="#([^"]+)"/g))if(!ids.includes(href[1]))fail("Broken anchor #"+href[1]);
if(!html.includes('name="viewport"'))fail("Missing viewport");
if(!html.includes('property="og:image"'))fail("Missing OG image");
if(!html.includes('rel="canonical"'))fail("Missing canonical");
if(!html.includes('name="description"'))fail("Missing description");
if(!html.includes('application/ld+json'))fail("Missing structured data");
if(!html.includes('id="compDialog"'))fail("Missing comp card");
if(!html.includes('href="./bundle.css"'))fail("Production CSS bundle not linked");
for(const edition of ["ru","en","zh"]){
 if(!read("editions.css").includes('data-edition="'+edition+'"'))fail("Missing theme "+edition);
 if(!read("editions.css").includes('edition-'+edition+'.svg'))fail("Missing art binding "+edition);
}
if(!html.includes('data-i18n="heroName1"')||!html.includes('data-i18n="heroName2"'))fail("Heading is not localized");
if(!html.includes('href="./bundle.css"'))fail("Production CSS bundle not linked");
for(const id of ["portfolioEmpty","specGrid","contactMethods","compDialog","readingProgress"])if(!html.includes('id="'+id+'"'))fail("Missing UX element "+id);
if(!html.includes('class="facts-bar"'))fail("Casting profile quick facts are missing");
if(!html.includes('class="shot-card"'))fail("Photo portfolio guide is missing");
if(!html.includes('class="editorial-spread"'))fail("Curated portrait feature missing");
if(!html.includes('<details class="portfolio-empty casting-digitals"'))fail("Accessible authentic-photo requirements missing");
if(!html.includes('src="./assets/portrait-fashion.webp"'))fail("Optimized, visible archival cover image missing");
if(!html.includes('id="heroImage"')||!html.includes('fetchpriority="high"'))fail("High-priority LCP hero missing");
if(!html.includes('class="cover-deck"')||!html.includes('data-cover="2"'))fail("Cover selector missing");
if(!html.includes('id="coverMobileSource"')||!html.includes('assets/thumbs/portrait-fashion.webp'))fail("Mobile responsive initial hero source missing");
if(!html.includes('data-i18n-alt="fashionPortraitAlt"'))fail("Localized main portrait alt missing");
for(const k of ["data-i18n-aria","id=\"editorialSpreadTitle\""])if(!html.includes(k))fail("Accessibility data missing: "+k);
// VOL.06: every archive image is in the editorial book and every booking control has a functional target.
for(const id of ["bookingDialog","bookingForm","bookingEmail","bookingDetails","bookingCopy","bookingStatus","portraitHeading"])if(!ids.includes(id))fail("Premiere element missing #"+id);
if(!html.includes('src="./assets/portrait-digital.webp"'))fail("Direct portrait feature missing");
const folioFiles=[...html.matchAll(/class="folio-open"[^>]*><img src="\.\/assets\/([^"]+)"/g)].map(x=>x[1]);
if(folioFiles.length!==6 || new Set(folioFiles).size!==6)fail("Contact sheet must include six distinct archival photos");
if((html.match(/data-folio-index="/g)||[]).length!==6)fail("All lookbook frames must open in a full-resolution viewer");
if(!html.includes('class="comp-archive-image"')||!html.includes('data-i18n="compArchiveLabel"'))fail("Comp card requires an honestly labelled real archival portrait");
for(const l of ["ru","en","zh"])for(const key of ["folioOpen","folioSwipe","compArchiveLabel"])if(!d[l][key])fail("Untranslated finished-book label "+l+":"+key);
for(const f of folioFiles)if(!exists("assets/"+f))fail("Folio image missing "+f);
if(!html.includes('data-open-booking')||!html.includes('id="bookingDialog"'))fail("Direct booking trigger missing");
for(const key of ["bookingAction","bookingTitle","bookingYourBrief","bookingEmailSubject","bookingOpening","bookingPrivacy","portraitHeadline","portraitStory"]){
  for(const l of ["ru","en","zh"])if(!d?.[l]?.[key])fail("Premiere translation "+l+":"+key);
}
if(!html.includes('src="./premiere.js"')||!read("tools/build-css.mjs").includes('"issue08.css"'))fail("Edition 08 must ship its single consolidated art-directed stylesheet");
ok("Premiere: 6 source images, booking controls and tri-lingual copy");
const sm=read("sitemap.xml");
for(const lang of ["ru","en","zh"])if(!sm.includes("?lang="+lang))fail("Sitemap missing locale "+lang);
if((sm.match(/<url>/g)||[]).length!==3)fail("Three canonical URLs expected in sitemap");



for(const cssfile of ["atelier.css","editions.css","clarity.css","art-direction.css","bundle.css","folio.css","premiere.css","finish.css","issue08.css"]){
 const css=read(cssfile);
 for(const m of css.matchAll(/url\((['"]?)([^)'"]+)\1\)/g)){
   const v=m[2];if(v.startsWith("http")||v.startsWith("data:"))continue;
   if(!exists(path.normalize(path.join(path.dirname(cssfile),v))))fail(cssfile+": unresolved url "+v);
 }
 ok("Stylesheet references "+cssfile);
}
if(p?.height!==188)fail("Unexpected verified height");
for(const [k,v] of Object.entries(p?.contacts||{}))if(v&&!/^(https?:|@|[^\s@]+@[^\s@]+$)/.test(v))fail("Check contact "+k);
const categories=new Set(["portraits","editorial","athletic","commercial","cinematic"]);
for(const img of photos){
 if(!img.src?.startsWith("assets/photos/"))fail("Unexpected photo path "+img.src);
 if(!categories.has(img.category))fail("Unknown photo category "+img.category);
 if(!img.alt?.ru||!img.alt?.en||!img.alt?.zh)fail("Missing localized alt "+img.src);
 if(!exists(img.src))fail("Photo missing "+img.src);
}
for(const v of videos){
 if(!v.src?.startsWith("assets/video/")&&!/^https:\/\/www\.youtube\.com\/embed\/[\w-]{11}$/.test(v.src))fail("Invalid video path "+v.src);
 if(v.src.startsWith("assets/video/")&&!exists(v.src))fail("Video missing "+v.src);
}
const actualArchive=new Set();
for(const img of archive){
 if(!img.src?.startsWith("assets/portrait-")&&img.src!=="assets/editorial-markovmade.webp")fail("Archive photo path not in curated set: "+img.src);
 if(!categories.has(img.category))fail("Archive category is invalid: "+img.category);
 if(!exists(img.src))fail("Archive photo missing "+img.src);
 if(!img.archive)fail("Unlabelled archived image "+img.src);
 if(!img.alt?.ru||!img.alt?.en||!img.alt?.zh)fail("Missing archive alt translations "+img.src);
 if(!img.caption?.ru||!img.caption?.en||!img.caption?.zh)fail("Missing archive caption translations "+img.src);
 if(actualArchive.has(img.src))fail("Duplicate archive image "+img.src);
 if(img.thumbnail){if(!img.thumbnail.startsWith("assets/thumbs/"))fail("Unexpected thumbnail path "+img.thumbnail);if(!exists(img.thumbnail))fail("Thumbnail missing "+img.thumbnail)}
 actualArchive.add(img.src);
}
if(archive.length<5)fail("At least five verified source archive images expected");
if(archive.filter(im=>im.featured).length!==3)fail("Three lead archive images expected: cover / movement / stage");
if(!html.includes('src="./assets/portrait-athletic.webp"'))fail("Athletic editorial spread missing");
if(!html.includes('src="./assets/portrait-stage.webp"'))fail("On-stage proof image missing");
if(!html.includes('id="archiveHeading"'))fail("Archive gallery heading missing");
if(!html.includes('class="hero-shortcuts"'))fail("Above-the-fold mobile casting actions absent");
if(!html.includes('class="lang-latin"')||!html.includes('class="lang-cn"'))fail("CJK language toggle lacks Latin fallback");
const covers=sandbox.window.MODEL_COVERS||[];
if(covers.length!==3)fail("Exactly three manually selectable cover looks required");
for(const [i,c] of covers.entries()){
 if(!exists(c.src))fail("Cover #"+i+" asset missing: "+c.src);
 if(!c.altKey||!c.captionKey||!c.labelKey)fail("Cover #"+i+" localized metadata missing");
 if(!c.mobile||!exists(c.mobile))fail("Cover #"+i+" missing mobile responsive thumbnail");
 for(const l of ["ru","en","zh"])for(const key of [c.altKey,c.captionKey,c.labelKey])if(!d[l][key])fail("Untranslated cover #"+i+" "+l+":"+key);
}
if(!html.includes('id="heroImage"')||!html.includes('class="hero-shortcuts"'))fail("Direct portfolio actions missing");


if(sandbox.window.HERO_IMAGE&&!exists(sandbox.window.HERO_IMAGE))fail("Hero asset missing");
if(sandbox.window.EDITORIAL_PORTRAIT&&!exists(sandbox.window.EDITORIAL_PORTRAIT))fail("Editorial portrait file missing");
ok("Media paths & contacts");
if(errors.length){console.error("\nFAILED:\n"+errors.map(x=>"- "+x).join("\n"));process.exit(1)}
console.log("\nPASS — portfolio structure, localized content, JavaScript syntax and file paths.");
