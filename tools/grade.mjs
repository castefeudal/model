#!/usr/bin/env node
import fs from "node:fs";
const variants=["ru","en","zh","ru-mobile","en-mobile","zh-mobile"],rows=[];
for(const v of variants){
 const file="lighthouse-"+v+".json";
 if(!fs.existsSync(file)){console.error("Missing "+file);process.exitCode=1;continue;}
 const d=JSON.parse(fs.readFileSync(file,"utf8"));
 const cat=Object.fromEntries(Object.entries(d.categories).map(([k,x])=>[k,Math.round((x.score||0)*100)]));
 const metrics=Object.fromEntries(["first-contentful-paint","largest-contentful-paint","speed-index","total-blocking-time","cumulative-layout-shift"].map(k=>[k,d.audits[k]?.displayValue||"n/a"]));
 rows.push({edition:v,categories:cat,metrics});
 console.log("LIGHTHOUSE "+v+": "+JSON.stringify({categories:cat,metrics}));
 const weak=Object.values(d.audits).filter(x=>x.score!==null&&x.score!==undefined&&x.score<.91&&x.scoreDisplayMode==="numeric"&&x.title).sort((a,b)=>(a.score||0)-(b.score||0)).slice(0,8);
 for(const a of weak)console.log("  IMPROVE "+v+": "+a.id+" — "+a.title+" ("+Math.round((a.score||0)*100)+")");
}
const md=[
 "# Lighthouse baseline — international casting portfolio","",
 "> Synthetic CI lab scores, not field Core Web Vitals. These numbers are not guaranteed across users and networks.","",
 "| Edition | Performance | Accessibility | Best practices | SEO | LCP | CLS |",
 "|---|---:|---:|---:|---:|---|---|",
 ...rows.map(x=>"| "+x.edition+" | "+x.categories.performance+" | "+x.categories.accessibility+" | "+x.categories["best-practices"]+" | "+x.categories.seo+" | "+x.metrics["largest-contentful-paint"]+" | "+x.metrics["cumulative-layout-shift"]+" |"),
 "",
 "Field Web Vitals targets: LCP <=2.5 seconds, INP <=200 ms, CLS <=0.1 (75th percentile). Field metrics differ from lab results.",
 "Manual audits still needed: design taste, real-photo provenance, actual booking conversion, mainland China connectivity.",""
].join("\n");
fs.writeFileSync("lighthouse-scorecard.md",md);
console.log("\n"+md);
if(rows.length!==variants.length)process.exitCode=1;

/* Fail on meaningful regressions without treating one throttled Chinese mobile run as an invariant. ZH threshold is calibrated against observed baseline scores 79-92 and LCP 3.4-5.6 s; A11Y/SEO are always >=95. */
const failures=[];
for(const r of rows){
 const mobile=r.edition.endsWith("-mobile");
 const minScore=r.edition==="zh-mobile"?78:(mobile?85:95);
 if(r.categories.performance<minScore)failures.push(r.edition+": Performance "+r.categories.performance+" below "+minScore);
 for(const category of ["accessibility","best-practices","seo"]){
  if(r.categories[category]<95)failures.push(r.edition+": "+category+" below 95");
 }
 const report=JSON.parse(fs.readFileSync("lighthouse-"+r.edition+".json","utf8"));
 const lcp=report.audits["largest-contentful-paint"]?.numericValue;
 const limit=r.edition==="zh-mobile"?5200:(mobile?4600:2500);
 if(!Number.isFinite(lcp)||lcp>limit)failures.push(r.edition+": LCP "+lcp+" ms above "+limit+" ms");
}
if(failures.length){
 console.error("LIGHTHOUSE REGRESSION:\n"+failures.map(x=>"- "+x).join("\n"));
 process.exitCode=1;
}else if(rows.length===variants.length){
 console.log("PASS — all 6 editions meet Lighthouse quality and speed gates.");
}
