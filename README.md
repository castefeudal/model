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
| `editions.css` | Locale-specific foundations for RU / EN / ZH |
| `clarity.css` | Final responsive layout, reading sizes, contrast and casting usability |
| `bundle.css` | Minified production bundle loaded in browsers (generated) |
| `tools/build-css.mjs` | Rebuild CSS bundle after changing source stylesheets |
| `assets/edition-ru.svg`, `assets/edition-en.svg`, `assets/edition-zh.svg` | Original vector art for the three editions |
| `data/i18n.js` | RU / EN / 简体中文 translation strings |
| `app.js` | Instant language + edition change, profile, gallery, lightbox, verified contact links, print |
| `polish.js` | Active navigation, scroll progress, accessibility refinements |
| `data/profile.js` | Central casting specs and verified contacts |
| `data/media.js` | Order of real photos, hero photo and real videos |
| `PHOTO_GUIDE.md` | Photo requirements and import instructions |
| `tools/verify.mjs` | No-dependency integrity/translation/syntax checks |
| `tools/browser-qa.mjs` | Actual Chromium tests at desktop/tablet/mobile widths and for all editions |

**Media integrity:** The site uses one explicitly credited branded editorial portrait, plus original vector edition art. That portrait is not a certified untouched casting headshot and is excluded from the official comp card. Genuine casting photographs, showreel and a verified booking contact are still required.

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


## Editorial portrait provenance
The first-screen brand artwork is now sourced from an asset already published in the
owner's own `castefeudal/markovmade` repository:
`assets/media/hero-portrait-1600w.webp`.
A local optimized copy is stored here as `assets/editorial-markovmade.webp`.
This is **branded editorial imagery**, not a certified natural, unretouched casting
headshot. It is excluded from the comp card and from the real-photo portfolio.
When authentic headshots are provided, set `window.HERO_IMAGE` and
`window.MODEL_PHOTOS` in `data/media.js` to replace the editorial cover.

## Readability and QA contract

- Main reading text: 16–17px or larger; critical buttons: 14px or larger on mobile.
- Labels and casting specifications remain readable and visually distinct.
- Actual browser CI checks multiple desktop/tablet/mobile widths, three translations,
  no horizontal overflow, comp-card behavior, visual-theme switching and critical
  text size/contrast. WCAG AA contrast of at least 4.5:1 is the target for reading text.
- Gallery media must be genuine for casting; the owned branded editorial portrait
  is deliberately excluded from the printable comp card.
- `atelier.css` and `editions.css` are legacy foundations; `clarity.css` is loaded last.


## New editorial spread / selected portrait

The portfolio opens with a curated *single-image* brand study, not a staged gallery of fabricated shoots. The same owned MarkovMade portrait is intentionally reframed and clearly labeled editorial, while actual headshots and full-length casting photographs remain separate. Their requirements are accessible through the expandable native `details` element. On photo upload, the real photo gallery appears automatically. All copy, image alternative text, navigation labels and expandable information are localized for RU/EN/中文.

## International search metadata

Each `?lang=ru|en|zh` URL sets its own canonical URL and `og:url` (including before deferred scripts), and `sitemap.xml` lists every edition with reciprocal `hreflang` links. Changing edition updates those values without a page reload. As GitHub Pages serves the same initial HTML shell for all query variants, crawlers must execute the translation scripts to index localized body text; separate prerendered routes would be required for fully server-rendered international SEO.

### CSS delivery
The browser downloads one optimized `bundle.css` instead of three blocking CSS files. When editing `atelier.css`, `editions.css` or `clarity.css`, run `node tools/build-css.mjs` and commit the generated bundle. `node tools/verify.mjs` verifies exact freshness.

## Cross-locale benchmarking

The pinned Lighthouse CI workflow audits all **six** language × device combinations: RU/EN/中文 on desktop and mobile. Reports (including mobile LCP and CLS) are published as downloadable workflow artifacts; synthetic runs vary with GitHub runner/network conditions and are not equivalent to field CWV. The WebP hero is loaded eagerly, the Latin editorial font sheet is non-blocking, Chinese typefaces are fetched only when necessary, and CSS is delivered through the generated single-file production bundle. The social preview uses a deliberately credited branded portrait and a versioned OG image URL to reduce stale social cache risk.

### Modern image formats
The verified owner-controlled editorial cover now has 11.5 KB / 19.4 KB AVIF sources for different viewports and a 59.7 KB WebP fallback for unsupported browsers; the existing photo gallery is reserved for verified authentic casting images. If an original casting hero is supplied, its source disables the branded AVIF automatically.
