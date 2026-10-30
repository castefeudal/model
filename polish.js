/* Pavel Markov — small, dependency-free interaction and accessibility layer. */
(() => {
  "use strict";
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const dict=window.MODEL_I18N||{},profile=window.MODEL_PROFILE||{},photos=window.MODEL_PHOTOS||[],archive=window.MODEL_ARCHIVE||[];
  const t=key=>dict[(document.documentElement.lang||"ru").split("-")[0]]?.[key]||dict.en?.[key]||key;
  const header=$(".site-header"),progress=$("#readingProgress"),menu=$("#siteNav"),toggle=$("#menuToggle");
  const navLinks=$$("#siteNav a[href^='#']");
  const supportsObserver="IntersectionObserver" in window;
  const prefersReduce=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let queued=false;
  function updateScroll(){
    queued=false;
    const scrolled=Math.max(0,window.scrollY||0);
    const travel=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    if(progress)progress.style.width=Math.min(100,100*scrolled/travel).toFixed(2)+"%";
    if(header)header.classList.toggle("compact",scrolled>75);
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(updateScroll)}}
  window.addEventListener("scroll",schedule,{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  updateScroll();
  function closeMenu(){
    menu?.classList.remove("open");
    toggle?.setAttribute("aria-expanded","false");
  }
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});
  document.addEventListener("pointerdown",e=>{
    if(!menu?.classList.contains("open"))return;
    if(!menu.contains(e.target)&&!toggle?.contains(e.target))closeMenu();
  });
  navLinks.forEach(link=>link.addEventListener("click",closeMenu));
  if(supportsObserver){
    const io=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add("is-visible");io.unobserve(entry.target);}
      });
    },{threshold:.09,rootMargin:"0px 0px -20px 0px"});
    if(!prefersReduce){
      const selector=".section-heading,.profile-statement,.profile-data,.screen-intro,.screen-details,.about-layout .display-heading,.about-copy,.contact-heading,.contact-side,.empty-lead,.empty-card";
      $$(selector).forEach(el=>{el.classList.add("reveal");io.observe(el)});
      document.body.classList.add("motion-enabled");
    }
    const sections=$$("main section[id]");
    const navio=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        navLinks.forEach(link=>{
          if(link.getAttribute("href")==="#"+entry.target.id)link.setAttribute("aria-current","location");
          else link.removeAttribute("aria-current");
        });
      });
    },{rootMargin:"-17% 0px -66% 0px",threshold:0});
    sections.forEach(sec=>navio.observe(sec));
  }
  // No broken-photo icon if a file path is accidentally configured before its upload.
  document.addEventListener("error",e=>{
    const img=e.target;
    if(!(img instanceof HTMLImageElement)||img.id==="heroImage")return;
    const card=img.closest(".gallery-item");
    if(card){
      card.classList.add("image-failed");
      card.setAttribute("aria-label",t("missingImage"));
      img.alt=t("missingImage");
    }
  },true);
  // Gallery can be switched to a dense contact-sheet view for casting.
  const filters=$("#galleryFilters"),gallery=$("#gallery");
  if(filters&&gallery&&(photos.length+archive.filter(im=>!im.featured).length)>=3){
    const switcher=document.createElement("button");
    switcher.type="button";
    switcher.className="filter view-toggle";
    switcher.setAttribute("aria-pressed","false");
    const renderLabel=()=>switcher.textContent=gallery.classList.contains("contact-sheet")?t("editorialView"):t("contactSheet");
    renderLabel();
    const mount=()=>{if(switcher.parentElement!==filters.parentElement)filters.parentElement.append(switcher);switcher.hidden=false};
    mount();
    switcher.addEventListener("click",()=>{
      const on=gallery.classList.toggle("contact-sheet");
      switcher.setAttribute("aria-pressed",String(on));renderLabel();
    });
    $$(".lang-btn").forEach(b=>b.addEventListener("click",()=>queueMicrotask(renderLabel)));
  }
  // Authentic additional photographs appear on a comp card automatically, without invented shots.
  const sheet=$("#compSheet"),comp=$("#compPhoto");
  if(sheet&&comp&&photos.length>1){
    const strip=document.createElement("div");
    strip.className="comp-extra";
    strip.setAttribute("aria-label","Additional casting photographs");
    photos.slice(0,3).forEach(photo=>{
      if(!photo?.src)return;
      const image=document.createElement("img");
      image.loading="lazy";image.decoding="async";
      image.src=photo.src;
      image.alt=photo.alt?.en||"Pavel Markov casting photo";
      image.addEventListener("error",()=>image.remove());
      strip.append(image);
    });
    sheet.insertBefore(strip,$(".comp-bottom"));
  }
  // Reusable copy-details control: only profile values actually present are included.
  const profileBlock=$(".profile-statement"),primary=profileBlock?.querySelector(".profile-action");
  if(profileBlock&&primary){
    const copy=document.createElement("button");
    copy.type="button";
    copy.className="profile-copy";
    copy.textContent=t("copySpecs");
    primary.insertAdjacentElement("afterend",copy);
    $$(".lang-btn").forEach(b=>b.addEventListener("click",()=>queueMicrotask(()=>copy.textContent=t("copySpecs"))));
    copy.addEventListener("click",async()=>{
      const rows=$$("#specGrid>div").map(node=>node.querySelector("dt")?.textContent+": "+node.querySelector("dd")?.textContent);
      const text=["PAVEL MARKOV","MODEL / ACTOR / ON-CAMERA TALENT",...rows.filter(Boolean),location.origin+location.pathname+"?lang="+(new URLSearchParams(location.search).get("lang")||"ru")].join("\n");
      try{
        if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text)}
        else{
          const input=document.createElement("textarea");input.value=text;input.style.position="fixed";input.style.opacity="0";
          document.body.append(input);input.select();
          if(!document.execCommand("copy"))throw Error("Copy failed");
          input.remove();
        }
        copy.textContent=t("specsCopied");
        setTimeout(()=>{copy.textContent=t("copySpecs")},1700);
      }catch(err){copy.textContent=t("copyUnavailable")}
    });
  }
  // Make a dialog's backdrop dismissible without hijacking pointer interaction inside it.
  const compDialog=$("#compDialog");
  compDialog?.addEventListener("click",event=>{
    const rect=compDialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom){
      compDialog.close();
    }
  });
  // Update the artwork label to the selected language for screen-reader users.
  function updateArtLabel(){
    const a=$("#heroArtwork");if(a)a.setAttribute("aria-label",t("artPlaceholder"));
  }
  updateArtLabel();
  $$(".lang-btn").forEach(b=>b.addEventListener("click",()=>queueMicrotask(updateArtLabel)));
})();