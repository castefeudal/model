/* ISSUE 09 / Casting Desk.
   A genuinely useful quick-cast view, without manufactured photos, credits or backend. */
(() => {
  "use strict";
  const dialog = document.getElementById("castingPeek");
  if (!dialog || typeof dialog.showModal !== "function") return;
  const $ = s => document.querySelector(s);
  const triggers = [...document.querySelectorAll("[data-open-casting-peek]")];
  let opener = null;
  function render(){
    const source = $("#specGrid"), target = $("#peekSpecs");
    if (!source || !target) return;
    const rows = [...source.querySelectorAll(":scope > div")];
    const fragment = document.createDocumentFragment();
    // Use the exact localized and verified values shown in the real casting sheet.
    for (const row of rows) {
      const dt = row.querySelector("dt"), dd = row.querySelector("dd");
      if (!dt || !dd || !dd.textContent.trim()) continue;
      const pair = document.createElement("div");
      pair.className = "peek-spec";
      const key = document.createElement("span"), value = document.createElement("strong");
      key.textContent = dt.textContent.trim();
      value.textContent = dd.textContent.trim();
      pair.append(key, value);
      fragment.append(pair);
    }
    target.replaceChildren(fragment);
  }
  function close(){ if(dialog.open) dialog.close(); }
  function open(){
    opener = document.activeElement;
    render();
    dialog.showModal();
  }
  triggers.forEach(t => t.addEventListener("click", open));
  $("#peekClose")?.addEventListener("click", close);
  dialog.addEventListener("close", () => { if(opener?.isConnected) opener.focus(); opener=null; });
  dialog.addEventListener("click", event => {
    if(event.target !== dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) close();
  });
  function handoff(selector){
    // Only move to a genuine native action that already exists in the page.
    opener=null;
    close();
    queueMicrotask(() => $(selector)?.click());
  }
  $("#peekEnquiry")?.addEventListener("click",()=>handoff(".header-enquiry"));
  $("#peekComp")?.addEventListener("click",()=>handoff(".profile-action"));
  for (const b of document.querySelectorAll(".lang-btn")) b.addEventListener("click",()=>queueMicrotask(render));
})();
