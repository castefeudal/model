# PAVEL MARKOV — MODEL / ACTOR / ON-CAMERA TALENT

**Live:** https://castefeudal.github.io/model/  
**Repository:** https://github.com/castefeudal/model

A responsive, cinematic editorial portfolio for model agencies, casting directors, filmmakers, photographers and brands. Static HTML/CSS/vanilla JavaScript, deployed via GitHub Pages without a build pipeline or paid APIs.

## What is included

- High-fashion / cinema-inspired art direction with custom, original SVG artwork, color system and serif/sans editorial typography.
- Responsive mobile-first casting presentation, desktop spreads and prominent measurements.
- Russian, English and Simplified Chinese localization; shared URLs using `?lang=ru|en|zh`; persistent language selection.
- Photo book infrastructure: category filters, editorial/contact-sheet layouts, accessible lightbox with keyboard, buttons and mobile swipe gestures.
- Actual compact casting specifications, automatic omission of unknown fields, printable A4 comp card.
- Confirmed contact buttons (shown only when verified), share/copy page, copy casting specifications.
- Verified real video support (local MP4/WebM or YouTube embed); empty sections remain hidden.
- SEO, Person schema, hreflang, robots.txt/sitemap, custom favicon and a **PNG social preview**.
- Built-in tests: static validation and real Chromium smoke tests covering RU/EN/Chinese, 1440/768/390/360px and comp-card dialog.

**Integrity:** Never use another person's photo, fabricated film credits, invented booking emails or manipulated headshots to stand in for Pavel. Current illustrations are clearly abstract visual studies, not photos.

## What to update first

1. **Your real casting photographs:** see [PHOTO_GUIDE.md](PHOTO_GUIDE.md). Upload to `assets/photos/`, then list them in `data/media.js`. A professional portfolio needs recent, unaltered headshots and full-length shots.
2. **Booking contact:** confirm a public email and/or a Telegram/Instagram account for casting enquiries, then update `data/profile.js`.
3. **Measurements:** confirm current weight, waist, clothing and shoe sizes in `data/profile.js`.
4. **Screen footage:** upload genuine footage in `assets/video/` and register in `data/media.js`. Do not call ordinary creator content an acting showreel.

## File map

| File | Purpose |
| --- | --- |
| `index.html` | Semantic page, SEO, layout, dialogs |
| `styles.css` | Core layout and print card |
| `editorial.css` | Art direction, cinematic sections, responsive editorial system |
| `app.js` | Localization, media, gallery viewer, contact and share logic |
| `polish.js` | Scroll progress, active navigation, reveal, casting utilities |
| `data/profile.js` | Single source for model details and verified contacts |
| `data/media.js` | Photo order, category, hero image, videos |
| `data/i18n.js` | Three professionally adapted locales |
| `assets/hero-art.svg` | Abstract cover until a real hero photograph is provided |
| `assets/study-*.svg` | Original photo-shoot art direction plates |
| `assets/social-cover.png` | PNG for chat previews |
| `tools/verify.mjs` | Zero-dependency structural and translation checks |
| `tools/browser-qa.mjs` | Headless Chromium responsive/browser checks |

## Deployment

GitHub → **Settings → Pages** → **Build and deployment** → **Deploy from a branch**, branch `main`, directory `/(root)` → Save. The site is published at `https://castefeudal.github.io/model/`. The existing repository has a successful Pages deployment.

## Local QA

```bash
node tools/verify.mjs
python3 -m http.server 8765
# In another terminal (requires a current Chrome): node tools/browser-qa.mjs
```

CI workflows automatically verify code, accessibility-sensitive structural elements, responsive geometry and dialogs. Because no authentic portfolio photos were supplied, the gallery remains intentionally empty while retaining ready-to-use functionality.
