/* PAVEL MARKOV / PREMIERE — direct casting inquiry with no server, tracking or sign-up. */
(() => {
 "use strict";
 const $=s=>document.querySelector(s);
 const dialog=$("#bookingDialog");
 const form=$("#bookingForm");
 const status=$("#bookingStatus");
 if(!dialog||!form)return;
 const lang=()=>document.documentElement.dataset.edition||"ru";
 const tr=key=>window.MODEL_I18N?.[lang()]?.[key]||window.MODEL_I18N?.en?.[key]||key;
 const bookingAddress=()=>window.MODEL_PROFILE?.contacts?.email||"";
 let previousFocus=null;
 function updateLocale(){
   document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>el.setAttribute("placeholder",tr(el.dataset.i18nPlaceholder)));
   const direct=dialog.querySelector(".booking-direct a[href^='mailto:']");
   if(direct&&bookingAddress()){
      direct.setAttribute("href","mailto:"+bookingAddress()+"?subject="+encodeURIComponent(tr("bookingEmailSubject")));
      direct.textContent=bookingAddress()+" ↗";
   }
 }
 function openBooking(){
   previousFocus=document.activeElement;
   updateLocale();
   status.textContent="";
   if(!dialog.open){dialog.showModal();}
   $("#bookingEmail")?.focus({preventScroll:true});
 }
 function closeBooking(){
   if(dialog.open)dialog.close();
 }
 document.addEventListener("click",event=>{
   const trigger=event.target.closest("[data-open-booking]");
   if(trigger){event.preventDefault();openBooking();return;}
   if(event.target.closest("[data-close-booking]")){closeBooking();}
 });
 dialog.addEventListener("close",()=>previousFocus?.focus?.({preventScroll:true}));
 dialog.addEventListener("click",event=>{
   if(event.target!==dialog)return;
   const r=dialog.getBoundingClientRect();
   if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeBooking();
 });
 document.querySelectorAll(".lang-btn").forEach(btn=>btn.addEventListener("click",()=>queueMicrotask(updateLocale)));
 function composed(){
   const email=$("#bookingEmail").value.trim();
   const kind=$("#bookingKind").selectedOptions[0]?.textContent.trim()||"";
   const brief=$("#bookingDetails").value.trim();
   if(!email||!brief){status.textContent=tr("bookingMissing");form.reportValidity();return null;}
   if(!$("#bookingEmail").checkValidity()){form.reportValidity();return null;}
   const page=location.origin+location.pathname+"?lang="+lang();
   const subject=tr("bookingEmailSubject")+" — "+kind;
   const body=[
     tr("bookingEmailIntro"),
     "",
     tr("bookingProjectType")+": "+kind,
     tr("bookingYourBrief")+":",
     brief,
     "",
     tr("bookingYourEmail")+": "+email,
     "",
     page
   ].join("\n");
   return {subject,body};
 }
 form.addEventListener("submit",event=>{
   event.preventDefault();
   const draft=composed(),address=bookingAddress();
   if(!draft)return;
   if(!address){status.textContent=tr("bookingNoEmail");return;}
   const href="mailto:"+address+"?subject="+encodeURIComponent(draft.subject)+"&body="+encodeURIComponent(draft.body);
   status.textContent=tr("bookingOpening");
   window.location.href=href;
 });
 $("#bookingCopy")?.addEventListener("click",async()=>{
   const draft=composed();
   if(!draft)return;
   const result=draft.subject+"\n\n"+draft.body;
   try{
     if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(result);}
     else {
       const el=document.createElement("textarea");
       el.value=result;el.style.cssText="position:fixed;left:-9999px;top:0";
       document.body.appendChild(el);el.select();
       const ok=document.execCommand("copy");el.remove();
       if(!ok)throw Error("clipboard unavailable");
     }
     status.textContent=tr("bookingCopied");
   }catch{status.textContent=tr("bookingCopyFailed");}
 });
 updateLocale();
})();