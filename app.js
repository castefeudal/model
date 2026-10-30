(() => {
"use strict";
const p=window.MODEL_PROFILE,media=window.MODEL_PHOTOS||[],archive=window.MODEL_ARCHIVE||[],covers=window.MODEL_COVERS||[],videos=window.MODEL_VIDEOS||[],dict=window.MODEL_I18N;
const qs=s=>document.querySelector(s), qsa=s=>Array.from(document.querySelectorAll(s));
const locale=new URLSearchParams(location.search).get("lang");
let persisted="ru";
try{persisted=localStorage.getItem("pm-lang")||"ru"}catch{}
let lang=["ru","en","zh"].includes(locale)?locale:(["ru","en","zh"].includes(persisted)?persisted:"ru");
let visible=[],lightboxItems=[],active=0,filter="all",lastFocus=null,coverIndex=0;
// Chinese typography uses native PingFang / Microsoft YaHei / Noto CJK fallbacks.
 // Avoid loading megabytes of remote CJK font subsets. Google Fonts are
 // unreliable for mainland-China visitors, and the native font stack works offline.
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
 const canonical="https://castefeudal.github.io/model/?lang="+lang;
 document.querySelector('link[rel="canonical"]')?.setAttribute("href",canonical);
 document.querySelector('meta[property="og:url"]')?.setAttribute("content",canonical);
 qsa("[data-i18n]").forEach(node=>{const k=node.dataset.i18n;if(Object.hasOwn(dict[lang],k))node.innerHTML=dict[lang][k]});
 qsa("[data-i18n-alt]").forEach(node=>node.setAttribute("alt",t(node.dataset.i18nAlt)));
 qsa("[data-i18n-aria]").forEach(node=>node.setAttribute("aria-label",t(node.dataset.i18nAria)));
 qsa("[data-folio-index]").forEach(node=>{
   const index=Number(node.dataset.folioIndex);
   node.setAttribute("aria-label",t("folioOpen")+" "+String(index+1).padStart(2,"0")+" / "+String(archive.length).padStart(2,"0"));
 });
 qsa(".folio-frame-archival").forEach((node,index)=>{
   node.textContent=t("archiveBadge")+" / "+String(index+1).padStart(2,"0");
 });
 qsa(".lang-btn").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.lang===lang)));
 qs("#menuToggle").setAttribute("aria-label",t("menu"));
 document.querySelector('meta[property="og:locale"]')?.setAttribute("content",lang==="ru"?"ru_RU":lang==="zh"?"zh_CN":"en_US");
 document.title=lang==="ru"?"Павел Марков — модель / актёр / съёмки":lang==="zh"?"帕维尔·马尔科夫 — 模特与镜头表现":"Pavel Markov — Model / Actor / On-camera Talent";

 document.querySelector('meta[name="description"]').content=lang==="ru"?"Павел Марков — модель и талант для съёмок. Рост 188 см, атлетический типаж, Беларусь.":lang==="zh"?"帕维尔·马尔科夫个人模特与选角作品集。身高188厘米，运动型外形，来自白俄罗斯。":"Pavel Markov: model and on-camera talent. 188 cm, athletic build, based in Belarus.";
 renderSpecs();renderGallery();renderVideos();renderContacts();setHero();
}
const captionText=im=>typeof im.caption==="object"?(im.caption[lang]||im.caption.en||"PAVEL MARKOV"):im.caption||"PAVEL MARKOV";
function renderGallery(){
 const items=[...media,...archive.filter(im=>!im.featured)];
 const cats=["all","portraits","editorial","athletic","commercial","cinematic"];
 const available=cats.filter(c=>c==="all"||items.some(im=>im.category===c));
 const filters=qs("#galleryFilters");
 filters.hidden=items.length<2||available.length<2;
 if(!available.includes(filter))filter="all";
 filters.innerHTML=available.map(c=>'<button type="button" class="filter" data-filter="'+c+'" aria-pressed="'+(filter===c)+'">'+safe(t(c==="athletic"?"athleticFilter":c))+'</button>').join("");
 visible=items.filter(im=>filter==="all"||im.category===filter);
 const cards=visible.map((im,i)=>{
   const label=im.alt?.[lang]||im.alt?.en||t("photo");
   const caption=captionText(im);
   const stamp=im.archive?t("archiveBadge"):t("castingBadge");
   return '<button class="gallery-item '+(i===0?"gallery-first":i===1?"gallery-second":"gallery-third")+'" data-index="'+i+'" type="button">'+
    '<span class="gallery-frame"><img src="'+safe(im.thumbnail||im.src)+'" loading="lazy" decoding="async" width="840" height="1080" alt="'+safe(label)+'" style="object-position:'+safe(im.position||"50% 50%")+'">'+
    '<span class="gallery-stamp">'+safe(stamp)+'</span><span class="gallery-open" aria-hidden="true">↗</span></span>'+
    '<span class="gallery-caption"><span>'+safe(caption)+'</span><span>'+String(i+1).padStart(2,"0")+' / '+String(visible.length).padStart(2,"0")+'</span></span></button>';
 });
 qs("#gallery").innerHTML=cards.join("");
 qs("#portfolioEmpty").hidden=media.length>0;
 qs("#galleryFootnote").hidden=media.length>0;
}
function openLightbox(index,collection=null){
 // The archive lookbook contains all six photographs, while the casting
 // gallery intentionally remains filtered. One accessible dialog serves both.
 if(collection)lightboxItems=collection;
 else if(!qs("#lightbox").open)lightboxItems=visible;
 const items=lightboxItems;
 if(!items.length)return;
 active=(index+items.length)%items.length;
 const im=items[active];qs("#lbImage").src=im.full||im.src;
 qs("#lbImage").onerror=()=>{qs("#lbImage").removeAttribute("src");qs("#lbCaption").textContent=t("missingImage")};
 qs("#lbImage").alt=im.alt?.[lang]||im.alt?.en||"Pavel Markov";
 qs("#lbCaption").textContent=captionText(im);
 qs("#lbCounter").textContent=(active+1)+" / "+items.length;
 [items[(active+1)%items.length],items[(active-1+items.length)%items.length]].forEach(x=>{if(x){const image=new Image();image.src=x.full||x.src;}});
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
 const configs=[["telegram","Telegram",v=>"https://t.me/"+v.replace(/^@/,"")+"?text="+encodeURIComponent(t("inquiryTelegram"))],["email","Email",v=>"mailto:"+v+"?subject="+encodeURIComponent(t("inquirySubject"))],["instagram","Instagram",v=>"https://instagram.com/"+v.replace(/^@/,"")],["agency","Agency",v=>v]];
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
 const cover=covers[coverIndex]||null;
 const src=castingSrc||cover?.src||window.EDITORIAL_PORTRAIT;
 const mobileSource=qs("#coverMobileSource");
 if(mobileSource)mobileSource.srcset=castingSrc?src:(cover?.mobile||src);
 if(!src)return;
 const figure=qs("#heroVisual"),img=qs("#heroImage"),caption=qs('[data-i18n="artDisclaimer"]');
 const deck=qs(".cover-deck"),count=qs(".visual-caption-index");
 if(deck)deck.hidden=!!castingSrc;
 qsa("[data-cover]").forEach((button,i)=>{
   button.setAttribute("aria-pressed",String(!castingSrc&&i===coverIndex));
   // Each cover button remains directly reachable by Tab; arrows are an optional shortcut.
 });
 if(count)count.textContent=castingSrc?"01 / 01":String(coverIndex+1).padStart(2,"0")+" / "+String(covers.length).padStart(2,"0");
 if(caption){
   const key=castingSrc?"realHeroCaption":cover?.captionKey||"editorialHeroCaption";
   caption.dataset.i18n=key;
   caption.textContent=t(key);
 }
 img.alt=castingSrc?(media[0]?.alt?.[lang]||t("portraitAlt")):(cover?.altKey?t(cover.altKey):t("editorialPortraitAlt"));
 img.style.objectPosition=castingSrc?"50% 30%":cover?.position||"50% 33%";
 const finish=()=>{
   if(img.naturalWidth<1)return;
   img.hidden=false;
   figure.classList.add("hero-image-ready");
   figure.classList.toggle("editorial-cover",!castingSrc);
   figure.classList.remove("cover-loading");
   qs("#heroArtwork").hidden=true;
   if(castingSrc){
     qs("#compPhoto").style.backgroundImage='url("'+src.replace(/["\\]/g,"")+'")';
     qs("#compPhoto").textContent="";
     qs("#compPhoto").classList.remove("comp-photo-archive");
   }
 };
 img.onload=finish;
 img.onerror=()=>{
   img.hidden=true;figure.classList.remove("hero-image-ready","editorial-cover","cover-loading");
   qs("#heroArtwork").hidden=false;
 };
 if(img.src!==new URL(src,document.baseURI).href){
   figure.classList.add("cover-loading");
   img.src=src;
 }
 if(img.complete&&img.naturalWidth>0)finish();
}
function copyLink(){
 const url=new URL(location.href);url.searchParams.set("lang",lang);
 const success=()=>{qs("#feedback").textContent=t("copied")};
 if(navigator.clipboard?.writeText){navigator.clipboard.writeText(url.href).then(success,()=>qs("#feedback").textContent=t("notCopied"))}
 else {const a=document.createElement("textarea");a.value=url.href;a.style.position="fixed";a.style.opacity=0;document.body.append(a);a.select();const ok=document.execCommand("copy");a.remove();qs("#feedback").textContent=t(ok?"copied":"notCopied")}
}
qsa(".lang-btn").forEach(b=>b.addEventListener("click",()=>setLanguage(b.dataset.lang)));
const setCover=(index,focus=false)=>{
 if(!covers.length||window.HERO_IMAGE||media[0]?.src)return;
 coverIndex=(index+covers.length)%covers.length;
 setHero();
 if(focus)qs('[data-cover="'+coverIndex+'"]')?.focus();
};
qsa("[data-cover]").forEach(button=>button.addEventListener("click",()=>setCover(Number(button.dataset.cover),true)));
qs(".cover-deck")?.addEventListener("keydown",event=>{
 if(event.key!=="ArrowRight"&&event.key!=="ArrowLeft")return;
 event.preventDefault();
 setCover(coverIndex+(event.key==="ArrowRight"?1:-1),true);
});

qs("#menuToggle").addEventListener("click",()=>{const open=qs("#siteNav").classList.toggle("open");qs("#menuToggle").setAttribute("aria-expanded",String(open))});
qsa("#siteNav a").forEach(a=>a.addEventListener("click",()=>{qs("#siteNav").classList.remove("open");qs("#menuToggle").setAttribute("aria-expanded","false")}));
qs("#galleryFilters").addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;filter=b.dataset.filter;renderGallery()});
qs("#gallery").addEventListener("click",e=>{const b=e.target.closest("[data-index]");if(b)openLightbox(Number(b.dataset.index))});
qs(".folio-track")?.addEventListener("click",e=>{
 const b=e.target.closest("[data-folio-index]");
 if(b)openLightbox(Number(b.dataset.folioIndex),archive);
});
qs("#lbPrev").addEventListener("click",()=>openLightbox(active-1));
qs("#lbNext").addEventListener("click",()=>openLightbox(active+1));
qs("#lbClose").addEventListener("click",()=>qs("#lightbox").close());
qs("#lightbox").addEventListener("click",e=>{if(e.target===qs("#lightbox"))qs("#lightbox").close()});
qs("#lightbox").addEventListener("close",()=>lastFocus?.focus());
document.addEventListener("keydown",e=>{if(!qs("#lightbox").open)return;if(e.key==="ArrowRight")openLightbox(active+1);if(e.key==="ArrowLeft")openLightbox(active-1)});
let touchX=0;qs("#lightbox").addEventListener("touchstart",e=>{touchX=e.changedTouches[0].clientX},{passive:true});
qs("#lightbox").addEventListener("touchend",e=>{const d=e.changedTouches[0].clientX-touchX;if(Math.abs(d)>45)openLightbox(active+(d<0?1:-1))},{passive:true});
let lastCardFocus=null;
qsa("[data-open-card]").forEach(b=>b.addEventListener("click",()=>{lastCardFocus=document.activeElement;qs("#compDialog").showModal()}));
qs("#compDialog").addEventListener("close",()=>lastCardFocus?.focus());
qs("#closeComp").addEventListener("click",()=>qs("#compDialog").close());
qs("#printButton").addEventListener("click",()=>{document.body.classList.add("print-comp");window.print()});
window.addEventListener("afterprint",()=>document.body.classList.remove("print-comp"));
qs("#copyButton").addEventListener("click",copyLink);
qs("#shareButton").addEventListener("click",async()=>{const url=new URL(location.href);url.searchParams.set("lang",lang);if(navigator.share){try{await navigator.share({title:document.title,url:url.href})}catch(e){if(e.name!=="AbortError")copyLink()}}else copyLink()});
setLanguage(lang);
})();