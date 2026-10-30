(() => {
"use strict";
const p=window.MODEL_PROFILE, media=window.MODEL_PHOTOS||[],videos=window.MODEL_VIDEOS||[],dict=window.MODEL_I18N;
const qs=s=>document.querySelector(s), qsa=s=>Array.from(document.querySelectorAll(s));
const locale=new URLSearchParams(location.search).get("lang");
let persisted="ru";
try{persisted=localStorage.getItem("pm-lang")||"ru"}catch{}
let lang=["ru","en","zh"].includes(locale)?locale:(["ru","en","zh"].includes(persisted)?persisted:"ru");
let visible=[],active=0,filter="all",lastFocus=null;
const t=k=>dict[lang][k]??dict.en[k]??k;
const safe=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const val=x=>x==null||x===""?null:x;
function profileItems(){
 return [
 ["age",p.age && String(p.age)],
 ["height",p.height && p.height+" cm"],
 ["weight",val(p.weight)&&p.weight+" kg"],
 ["waist",val(p.waist)&&p.waist+" cm"],
 ["eyes",val(p.eyes)&&t(p.eyes)],
 ["hair",val(p.hair)&&t(p.hair)],
 ["beard",val(p.beard)&&t(p.beard)],
 ["bodyType",val(p.build)&&t(p.build==="athletic"?"athleticValue":p.build)],
 ["location",val(p.base)&&(p.base==="Belarus"?t("belarus"):p.base)],
 ["clothes",val(p.clothes)],["shoes",val(p.shoes)],["chest",val(p.chest)],["hips",val(p.hips)],["availability",val(p.availability)]
 ].filter(x=>x[1] != null);
}
function renderSpecs(){
 const items=profileItems();
 qs("#specGrid").innerHTML=items.map(([key,value])=>'<div><dt>'+safe(t(key))+'</dt><dd>'+safe(value)+'</dd></div>').join("");
 qs("#compSpecs").innerHTML=items.map(([key,value])=>'<div><dt>'+safe(t(key))+'</dt><dd>'+safe(value)+'</dd></div>').join("");
}
function setLanguage(next){
 const previous=document.documentElement.dataset.edition;
 lang=next;document.documentElement.lang=lang==="zh"?"zh-CN":lang;
 document.documentElement.dataset.edition=lang;
 document.documentElement.style.colorScheme=lang==="ru"?"dark":"light";
 const themeColor={ru:"#18181a",en:"#f5f6f4",zh:"#f2e5d2"};
 document.querySelector('meta[name="theme-color"]')?.setAttribute("content",themeColor[lang]);
 if(previous&&previous!==lang && !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
   document.documentElement.classList.remove("edition-switch");
   void document.documentElement.offsetWidth;
   document.documentElement.classList.add("edition-switch");
   window.setTimeout(()=>document.documentElement.classList.remove("edition-switch"),650);
 }
 try{localStorage.setItem("pm-lang",lang)}catch{}
 const url=new URL(location.href);url.searchParams.set("lang",lang);history.replaceState(null,"",url);
 qsa("[data-i18n]").forEach(node=>{const k=node.dataset.i18n;if(dict[lang][k])node.innerHTML=dict[lang][k]});
 qsa(".lang-btn").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.lang===lang)));
 qs("#menuToggle").setAttribute("aria-label",t("menu"));
 document.querySelector('meta[property="og:locale"]')?.setAttribute("content",lang==="ru"?"ru_RU":lang==="zh"?"zh_CN":"en_US");
 document.title=lang==="ru"?"Павел Марков — модель / актёр / съёмки":lang==="zh"?"帕维尔·马尔科夫 — 模特与镜头表现":"Pavel Markov — Model / Actor / On-camera Talent";
 const heroPhoto=qs("#heroImage");
 if(heroPhoto && !heroPhoto.hidden)heroPhoto.alt=(window.HERO_IMAGE||media[0]?.src)?(media[0]?.alt?.[lang]||t("portraitAlt")):t("editorialPortraitAlt");
 document.querySelector('meta[name="description"]').content=lang==="ru"?"Павел Марков — модель и талант для съёмок. Рост 188 см, атлетический типаж, Беларусь.":lang==="zh"?"帕维尔·马尔科夫个人模特与选角作品集。身高188厘米，运动型外形，来自白俄罗斯。":"Pavel Markov: model and on-camera talent. 188 cm, athletic build, based in Belarus.";
 renderSpecs();renderGallery();renderVideos();renderContacts();
}
function renderGallery(){
 const cats=["all","portraits","editorial","athletic","commercial","cinematic"];
 const available=cats.filter(c=>c==="all"||media.some(im=>im.category===c));
 const filters=qs("#galleryFilters");filters.hidden=media.length<2||available.length<2;
 filters.innerHTML=available.map(c=>'<button type="button" class="filter" data-filter="'+c+'" aria-pressed="'+(filter===c)+'">'+safe(t(c==="athletic"?"athleticFilter":c))+'</button>').join("");
 visible=media.filter(im=>filter==="all"||im.category===filter);
 qs("#gallery").innerHTML=visible.map((im,i)=>'<button class="gallery-item '+(i%5===0?"wide":i%5===1?"narrow":"")+'" data-index="'+i+'" type="button" aria-label="'+safe((im.alt?.[lang]||im.alt?.en||t("photo")))+ '"><img src="'+safe(im.src)+'" loading="lazy" decoding="async" alt="'+safe(im.alt?.[lang]||im.alt?.en||"Pavel Markov")+'" style="object-position:'+safe(im.position||"50% 50%")+'"><span class="gallery-caption"><span>'+safe(im.caption||"PAVEL MARKOV")+'</span><span>'+(i+1).toString().padStart(2,"0")+' / '+visible.length.toString().padStart(2,"0")+'</span></span></button>').join("");
 qs("#portfolioEmpty").hidden=media.length>0;
 qs("#galleryFootnote").hidden=media.length>0;
}
function openLightbox(index){
 if(!visible.length)return;
 active=(index+visible.length)%visible.length;
 const im=visible[active];qs("#lbImage").src=im.full||im.src;
 qs("#lbImage").onerror=()=>{qs("#lbImage").removeAttribute("src");qs("#lbCaption").textContent=t("missingImage")};
 qs("#lbImage").alt=im.alt?.[lang]||im.alt?.en||"Pavel Markov";
 qs("#lbCaption").textContent=im.caption||"PAVEL MARKOV";
 qs("#lbCounter").textContent=(active+1)+" / "+visible.length;
 [visible[(active+1)%visible.length],visible[(active-1+visible.length)%visible.length]].forEach(x=>{if(x){const image=new Image();image.src=x.full||x.src;}});
 if(!qs("#lightbox").open){lastFocus=document.activeElement;qs("#lightbox").showModal();}
}
function renderVideos(){
 const sec=qs("#videoSection");sec.hidden=!videos.length;
 qs("#videoGrid").innerHTML=videos.map(v=>{
 const src=safe(v.src),name=safe(v.title||t("video"));
 if(/^(?:https:\/\/www\.youtube\.com\/embed\/)[\w-]{11}$/.test(v.src))return '<div><iframe loading="lazy" src="'+src+'" title="'+name+'" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe><p>'+name+'</p></div>';
 if(!/^(?:assets\/video\/)[\w./-]+\.(mp4|webm)$/.test(v.src))return "";
 return '<div><video controls playsinline preload="metadata" '+(v.poster?'poster="'+safe(v.poster)+'"':"")+'><source src="'+src+'" type="'+safe(v.type||"video/mp4")+'"></video><p>'+name+'</p></div>';
 }).join("");
}
function renderContacts(){
 const configs=[["email","Email",v=>"mailto:"+v],["telegram","Telegram",v=>"https://t.me/"+v.replace(/^@/,"")],["instagram","Instagram",v=>"https://instagram.com/"+v.replace(/^@/,"")],["agency","Agency",v=>v]];
 const rows=configs.filter(x=>val(p.contacts[x[0]])).map(([key,label,getLink])=>{
 const v=p.contacts[key]; const href=getLink(v);
 if(!(/^(mailto:|https:\/\/)/.test(href)))return "";
 return '<a href="'+safe(href)+'" '+(href.startsWith("https:")?'target="_blank" rel="noopener noreferrer"':"")+'><span>'+label+'</span><span>'+safe(v)+' ↗</span></a>';
 }).join("");
 qs("#contactMethods").innerHTML=rows;
 qs("#contactPending").hidden=!!rows;
 qs("#compContact").innerHTML=configs.filter(x=>val(p.contacts[x[0]])).map(x=>'<div>'+safe(x[1])+': '+safe(p.contacts[x[0]])+'</div>').join("");
}
function setHero(){
 const castingSrc=window.HERO_IMAGE||media[0]?.src;
 const editorialSrc=window.EDITORIAL_PORTRAIT;
 const src=castingSrc||editorialSrc;
 if(!src)return;
 const visual=qs("#heroVisual"), img=qs("#heroImage"), caption=qs('[data-i18n="artDisclaimer"]');
 // Editorial visual from an owned brand project is not a verified casting photo.
 if(caption){
   caption.dataset.i18n=castingSrc?"realHeroCaption":"editorialHeroCaption";
   caption.textContent=t(caption.dataset.i18n);
 }
 img.src=src;
 img.alt=castingSrc?(media[0]?.alt?.[lang]||t("portraitAlt")):t("editorialPortraitAlt");
 img.onload=()=>{
   img.hidden=false;
   visual.classList.add("hero-image-ready");
   if(!castingSrc)visual.classList.add("editorial-cover");
   qs("#heroArtwork").hidden=true;
   // Only confirmed genuine casting media may be used on the printable card.
   if(castingSrc){
     qs("#compPhoto").style.backgroundImage='url("'+src.replace(/["\\]/g,"")+'")';
     qs("#compPhoto").textContent="";
   }
 };
 img.onerror=()=>{img.hidden=true;qs("#heroArtwork").hidden=false;visual.classList.remove("hero-image-ready","editorial-cover")};
}
function copyLink(){
 const url=new URL(location.href);url.searchParams.set("lang",lang);
 const success=()=>{qs("#feedback").textContent=t("copied")};
 if(navigator.clipboard?.writeText){navigator.clipboard.writeText(url.href).then(success,()=>qs("#feedback").textContent=t("notCopied"))}
 else {const a=document.createElement("textarea");a.value=url.href;a.style.position="fixed";a.style.opacity=0;document.body.append(a);a.select();const ok=document.execCommand("copy");a.remove();qs("#feedback").textContent=t(ok?"copied":"notCopied")}
}
qsa(".lang-btn").forEach(b=>b.addEventListener("click",()=>setLanguage(b.dataset.lang)));
qs("#menuToggle").addEventListener("click",()=>{const open=qs("#siteNav").classList.toggle("open");qs("#menuToggle").setAttribute("aria-expanded",String(open))});
qsa("#siteNav a").forEach(a=>a.addEventListener("click",()=>{qs("#siteNav").classList.remove("open");qs("#menuToggle").setAttribute("aria-expanded","false")}));
qs("#galleryFilters").addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;filter=b.dataset.filter;renderGallery()});
qs("#gallery").addEventListener("click",e=>{const b=e.target.closest("[data-index]");if(b)openLightbox(Number(b.dataset.index))});
qs("#lbPrev").addEventListener("click",()=>openLightbox(active-1));
qs("#lbNext").addEventListener("click",()=>openLightbox(active+1));
qs("#lbClose").addEventListener("click",()=>qs("#lightbox").close());
qs("#lightbox").addEventListener("click",e=>{if(e.target===qs("#lightbox"))qs("#lightbox").close()});
qs("#lightbox").addEventListener("close",()=>lastFocus?.focus());
document.addEventListener("keydown",e=>{if(!qs("#lightbox").open)return;if(e.key==="ArrowRight")openLightbox(active+1);if(e.key==="ArrowLeft")openLightbox(active-1)});
let touchX=0;qs("#lightbox").addEventListener("touchstart",e=>{touchX=e.changedTouches[0].clientX},{passive:true});
qs("#lightbox").addEventListener("touchend",e=>{const d=e.changedTouches[0].clientX-touchX;if(Math.abs(d)>45)openLightbox(active+(d<0?1:-1))},{passive:true});
qsa("[data-open-card]").forEach(b=>b.addEventListener("click",()=>qs("#compDialog").showModal()));
qs("#closeComp").addEventListener("click",()=>qs("#compDialog").close());
qs("#printButton").addEventListener("click",()=>{document.body.classList.add("print-comp");window.print()});
window.addEventListener("afterprint",()=>document.body.classList.remove("print-comp"));
qs("#copyButton").addEventListener("click",copyLink);
qs("#shareButton").addEventListener("click",async()=>{const url=new URL(location.href);url.searchParams.set("lang",lang);if(navigator.share){try{await navigator.share({title:document.title,url:url.href})}catch(e){if(e.name!=="AbortError")copyLink()}}else copyLink()});
setLanguage(lang);setHero();
})();