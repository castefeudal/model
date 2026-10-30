#!/usr/bin/env node
import fs from "node:fs";
const sources=["atelier.css","editions.css","clarity.css","art-direction.css","folio.css","premiere.css"];
const text=sources.map(p=>fs.readFileSync(p,"utf8")).join("\n");
const compressed=text.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\s+/g," ").replace(/\s*([{};,])\s*/g,"$1").replace(/:\s+/g,":").replace(/;}/g,"}").trim();
if(process.argv.includes("--check")){
 const current=fs.existsSync("bundle.css")?fs.readFileSync("bundle.css","utf8"):"";
 if(current!==compressed){console.error("bundle.css is outdated; run node tools/build-css.mjs");process.exit(1)}
 console.log("bundle.css current ("+compressed.length+" bytes)");
}else{
 fs.writeFileSync("bundle.css",compressed);
 console.log("bundle.css generated from "+sources.join(", ")+" ("+compressed.length+" bytes)");
}
