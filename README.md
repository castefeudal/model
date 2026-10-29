# PAVEL MARKOV / THREE EDITIONS

**Live:** https://castefeudal.github.io/model/  
**Repository:** https://github.com/castefeudal/model

An international casting / model portfolio designed as **three distinct editorial editions** that change in one click with the language. Plain HTML, CSS, vanilla JS; GitHub Pages, no paid service or build step.

## Visual editions

| Language | Edition | Approach |
| --- | --- | --- |
| **RU** | **IMPERIAL NOIR** | Black ink, warm paper, oxblood pigment, assertive Russian typography and architectural forms |
| **EN** | **STUDIO / INTERNATIONAL** | Cool ivory, electric cobalt, chrome-cut shapes, inverse split composition and editorial serif typography |
| **中文** | **朱印 / RED LACQUER** | Cinnabar, rice paper, modern Chinese seal visual grammar and Chinese-language display typography |

This is one coherent personal brand with three visually different treatments, **not three disconnected sites**. Switching language instantly updates typography, art, palette, navigation copy, page title and shareable URL without reloading. Choice persists on future visits. Direct links: `?lang=ru`, `?lang=en`, `?lang=zh`.

No clip-art flags, dragons, stock models, AI faces or counterfeit acting credits. Cultural motifs are used as contemporary editorial references, not stereotypes.

## Where to edit

| Path | Purpose |
| --- | --- |
| `index.html` | Editorial layouts, metadata, gallery and casting-card dialogs |
| `atelier.css` | Entire core layout, mobile, accessibility and A4 print |
| `editions.css` | Palette and composition for the RU / EN / ZH themes |
| `assets/edition-ru.svg`, `assets/edition-en.svg`, `assets/edition-zh.svg` | Original vector art for the three editions |
| `data/i18n.js` | RU / EN / 简体中文 translation strings |
| `app.js` | Instant language + edition change, profile, gallery, lightbox, verified contact links, print |
| `polish.js` | Active navigation, scroll progress, accessibility refinements |
| `data/profile.js` | Central casting specs and verified contacts |
| `data/media.js` | Order of real photos, hero photo and real videos |
| `PHOTO_GUIDE.md` | Photo requirements and import instructions |
| `tools/verify.mjs` | No-dependency integrity/translation/syntax checks |
| `tools/browser-qa.mjs` | Actual Chromium tests at desktop/tablet/mobile widths and for all editions |

**Current media limitation:** Real photos and videos have not yet been supplied. The elaborate image compositions are deliberately **abstract vector art** and are not presented as Pavel's photographs. Authentic, recent headshots and full-body shots are essential before sending this as a finished casting portfolio.

## Features

- Responsive fashion-oriented landing screen with different compositions by locale
- True casting profile; unknown measurements hidden; approximate values marked
- Printable PDF-style A4 comp card through the browser
- Image gallery with filters, editorial/contact-sheet views, keyboard/swipe full-screen viewer
- Video support without fabricated clips
- Sharing, copying measurements and confirmed booking details
- Language-specific URLs, sitemap/hreflang, structured Person metadata and PNG social preview
- Accessible keyboard focus, reduced-motion support, and no mandatory JS frameworks

## Production

Deployment: GitHub → Settings → Pages → Deploy from a branch → `main` → `/(root)`.  
Validation: both Actions workflows **Portfolio quality checks** and **Browser UI smoke** should pass before presenting the version to agents.

## Local checks
```sh
node tools/verify.mjs
python3 -m http.server 8765
# Separate terminal, Chrome installed:
node tools/browser-qa.mjs
```

## Photo and contact setup

Read [PHOTO_GUIDE.md](PHOTO_GUIDE.md) to add only actual pictures of Pavel into `assets/photos/` and `data/media.js`. The gallery and cover appear automatically. Update only publicly confirmed email / Telegram / Instagram in `data/profile.js`; no working email is invented. Exact clothes, shoes and travel availability also remain unset until confirmed.
