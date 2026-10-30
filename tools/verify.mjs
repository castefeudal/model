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
const required=["index.html","atelier.css","editions.css","clarity.css","app.js","polish.js","data/profile.js","data/media.js","data/i18n.js","assets/edition-ru.svg","assets/edition-en.svg","assets/edition-zh.svg","assets/editorial-markovmade.webp","assets/social-cover.png","assets/favicon.svg",".nojekyll"];
required.forEach(p=>{if(!exists(p))fail("Missing "+p)});
assert(exists("index.html"),"index missing");
const html=read("index.html");
const scripts=["data/profile.js","data/media.js","data/i18n.js","app.js","polish.js"];
scripts.forEach(p=>{if(!exists(p))return;try{execFileSync(process.execPath,["--check",path.join(root,p)],{stdio:"pipe"});ok("Syntax "+p)}catch(e){fail("JavaScript syntax: "+p+" "+e.stderr?.toString())}});
const sandbox={window:{}};
for(const p of scripts.slice(0,3))if(exists(p))vm.runInNewContext(read(p),sandbox,{filename:p});
const d=sandbox.window.MODEL_I18N,p=sandbox.window.MODEL_PROFILE,photos=sandbox.window.MODEL_PHOTOS||[],videos=sandbox.window.MODEL_VIDEOS||[];
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
if(!html.includes('href="./atelier.css"')||!html.includes('href="./editions.css"'))fail("Edition styles are not linked");
for(const edition of ["ru","en","zh"]){
 if(!read("editions.css").includes('data-edition="'+edition+'"'))fail("Missing theme "+edition);
 if(!read("editions.css").includes('edition-'+edition+'.svg'))fail("Missing art binding "+edition);
}
if(!html.includes('data-i18n="heroName1"')||!html.includes('data-i18n="heroName2"'))fail("Heading is not localized");
if(!html.includes('href="./clarity.css"'))fail("Clarity stylesheet not linked");
for(const id of ["portfolioEmpty","specGrid","contactMethods","compDialog","readingProgress"])if(!html.includes('id="'+id+'"'))fail("Missing UX element "+id);
if(!html.includes('class="facts-bar"'))fail("Casting profile quick facts are missing");
if(!html.includes('class="shot-card"'))fail("Photo portfolio guide is missing");
if(!html.includes('class="editorial-spread"'))fail("Curated portrait feature missing");
if(!html.includes('<details class="portfolio-empty casting-digitals"'))fail("Accessible authentic-photo requirements missing");
if(!html.includes('src="./assets/editorial-markovmade.webp"'))fail("Hero lacks early image src; LCP regression");
if(!html.includes('data-i18n-alt="editorialPortraitAlt"'))fail("Localised image alt missing");
for(const k of ["data-i18n-aria","id=\"editorialSpreadTitle\""])if(!html.includes(k))fail("Accessibility data missing: "+k);
const sm=read("sitemap.xml");
for(const lang of ["ru","en","zh"])if(!sm.includes("?lang="+lang))fail("Sitemap missing locale "+lang);
if((sm.match(/<url>/g)||[]).length!==3)fail("Three canonical URLs expected in sitemap");



for(const cssfile of ["atelier.css","editions.css","clarity.css"]){
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
if(sandbox.window.HERO_IMAGE&&!exists(sandbox.window.HERO_IMAGE))fail("Hero asset missing");
if(sandbox.window.EDITORIAL_PORTRAIT&&!exists(sandbox.window.EDITORIAL_PORTRAIT))fail("Editorial portrait file missing");
ok("Media paths & contacts");
if(errors.length){console.error("\nFAILED:\n"+errors.map(x=>"- "+x).join("\n"));process.exit(1)}
console.log("\nPASS — portfolio structure, localized content, JavaScript syntax and file paths.");
