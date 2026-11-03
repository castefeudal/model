/* The Human Frame - zero-dependency casting download desk.
   Real, prebuilt static assets only. No fabricated progress or client-side PDF work. */
(() => {
  'use strict';
  const LANGS = new Set(['ru', 'en', 'zh']);
  const edition = () => LANGS.has(document.documentElement.dataset.edition) ? document.documentElement.dataset.edition : 'ru';
  const byLocale = lang => document.querySelector(`.kit-card[data-kit-locale="${lang}"]`);
  const prettyBytes = n => Number.isFinite(n) && n > 0 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : 'ZIP';
  const api = { catalog: null };
  function refresh() {
    const lang = edition();
    for (const code of LANGS) {
      const card = byLocale(code);
      if (!card) continue;
      const active = lang === code;
      card.toggleAttribute('data-current', active);
      const link = card.querySelector('.kit-download');
      if (link) link.setAttribute('aria-current', active ? 'true' : 'false');
    }
    const primary = document.querySelector('.kit-local-quick');
    if (primary) {
      const langNode = byLocale(lang)?.querySelector('.kit-download');
      if (langNode) primary.href = langNode.href;
    }
  }
  async function init() {
    refresh();
    try {
      const response = await fetch('./downloads/catalog.json', {cache: 'no-cache'});
      if (!response.ok) throw new Error('Casting catalog HTTP ' + response.status);
      const catalog = await response.json();
      if (catalog?.schema !== 'pm-download-catalog/v1') throw new Error('Unexpected casting catalog');
      api.catalog = catalog;
      for (const [code, item] of Object.entries(catalog.locales || {})) {
        if (!LANGS.has(code) || !item || !Number.isFinite(item.bytes)) continue;
        const size = document.querySelector(`[data-kit-size="${code}"]`);
        if (size) size.textContent = prettyBytes(item.bytes) + ' / ZIP';
      }
      const total = document.querySelector('[data-kit-size="all"]');
      if (total && Number.isFinite(catalog.international?.bytes)) total.textContent = prettyBytes(catalog.international.bytes) + ' / INTERNATIONAL ZIP';
      // Public download buttons are native anchors with fixed stable URLs and
      // remain functional even if this optional metadata request is blocked.
    } catch (e) {
      // Do not replace working native download anchors with dead error buttons.
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.warn(e.message);
    }
  }
  document.addEventListener('pm:languagechange', refresh);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
