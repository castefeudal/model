/* Production interaction primitives. No framework, trackers, autoplay or scroll hijacking. */
(() => {
  'use strict';
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const t=key=>(window.MODEL_I18N?.[root.dataset.edition]||window.MODEL_I18N?.en||{})[key]||key;
  let disabled=false;
  try { disabled=localStorage.getItem('pm-motion')==='off'; } catch {}
  const canAnimate=()=>!disabled&&!reduced.matches&&typeof root.animate==="function";
  async function copyText(value){
    try { if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return true;} } catch {}
    const active=document.activeElement,field=document.createElement('textarea');
    field.value=value;field.readOnly=true;
    field.style.cssText='position:fixed;inset:0 auto auto -9999px;opacity:0;font-size:16px';
    document.body.append(field);field.select();
    let ok=false;try{ok=document.execCommand('copy')}catch{}finally{field.remove();if(active?.isConnected)active.focus({preventScroll:true})}
    return !!ok;
  }
  window.PMExperience=Object.freeze({canAnimate,copyText});
  function sync(){
    root.dataset.motion=canAnimate()?'on':'off';
    const b=document.getElementById('motionToggle');
    if(!b)return;
    b.setAttribute('aria-pressed',String(!canAnimate()));
    b.setAttribute('aria-label',t(canAnimate()?'motionDisable':reduced.matches?'motionSystem':'motionEnable'));
    b.title=b.getAttribute('aria-label');b.disabled=reduced.matches;
    const icon=b.querySelector('.motion-switch-icon');
    if(icon)icon.textContent=canAnimate()?'Ⅱ':'▷';
    if(!canAnimate())document.getAnimations().forEach(a=>a.cancel());
    document.dispatchEvent(new Event('pm:motionchange'));
  }
  document.getElementById('motionToggle')?.addEventListener('click',()=>{
    disabled=!disabled;try{localStorage.setItem('pm-motion',disabled?'off':'on')}catch{}sync();
  });
  reduced.addEventListener('change',sync);
  document.addEventListener('pm:languagechange',sync);
  sync();
  const revealed=new WeakSet();
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting||revealed.has(entry.target))return;
      revealed.add(entry.target);observer.unobserve(entry.target);
      if(!canAnimate())return;
      entry.target.animate([{opacity:.65,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:640,easing:'cubic-bezier(.22,1,.36,1)'});
    }),{threshold:.1,rootMargin:'0px 0px -15px 0px'});
    document.querySelectorAll('.folio-frame,.profile-statement,.profile-data,.screen-archive,.screen-details,.about-copy,.contact-main,.contact-side').forEach(el=>observer.observe(el));
  }
  for(const dialog of document.querySelectorAll('dialog')){
    new MutationObserver(()=>{
      if(dialog.open&&canAnimate())dialog.animate([{opacity:.5,transform:'translateY(12px) scale(.99)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:260,easing:'ease-out'});
    }).observe(dialog,{attributes:true,attributeFilter:['open']});
  }
  const track=document.getElementById('folioTrack'),prev=document.getElementById('folioPrev'),next=document.getElementById('folioNext'),count=document.getElementById('folioCurrent');
  if(track&&prev&&next){
    let queued=false;
    const frames=[...track.querySelectorAll('.folio-frame')];
    const mobile=matchMedia('(max-width: 880px)');
    function updateFocusable(){
      if(mobile.matches){track.tabIndex=0;track.setAttribute('role','region')}
      else{track.removeAttribute('tabindex');track.removeAttribute('role')}
    }
    updateFocusable();
    mobile.addEventListener?.('change',updateFocusable);
    function position(){
      const bounds=track.getBoundingClientRect();
      let index=0,distance=Infinity;
      frames.forEach((frame,i)=>{const d=Math.abs(frame.getBoundingClientRect().left-bounds.left);if(d<distance){distance=d;index=i}});
      return index;
    }
    function update(){
      queued=false;
      const index=position();
      count.textContent=String(index+1).padStart(2,'0')+' / '+String(frames.length).padStart(2,'0');
      prev.setAttribute('aria-disabled',String(track.scrollLeft<=2));
      next.setAttribute('aria-disabled',String(track.scrollLeft>=track.scrollWidth-track.clientWidth-2));
    }
    function schedule(){if(!queued){queued=true;requestAnimationFrame(update)}}
    function move(delta){
      const index=Math.max(0,Math.min(frames.length-1,position()+delta));
      const left=track.scrollLeft+frames[index].getBoundingClientRect().left-track.getBoundingClientRect().left;
      track.scrollTo({left,behavior:canAnimate()?'smooth':'instant'});
    }
    prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
    track.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
    track.addEventListener('keydown',event=>{
      if(event.target!==track||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      if(event.key==='Home'||event.key==='End')track.scrollTo({left:event.key==='Home'?0:track.scrollWidth,behavior:canAnimate()?'smooth':'instant'});
      else move(event.key==='ArrowRight'?1:-1);
    });
    document.addEventListener('pm:languagechange',schedule);update();
  }
})();
