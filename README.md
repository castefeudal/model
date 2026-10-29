# PAVEL MARKOV / Model & On-camera Portfolio

A dependency-free, fully static editorial portfolio for GitHub Pages.

## Deployment
Repository: https://github.com/castefeudal/model
Expected URL: https://castefeudal.github.io/model/

GitHub → Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save. Wait for GitHub to report the deployment as successful.

## Files
- `index.html`: semantic layout, SEO and dialogs
- `styles.css`: responsive editorial design, print card
- `app.js`: language, gallery, keyboard/swipe viewer, video, sharing, comp card
- `data/profile.js`: casting profile and verified booking contacts
- `data/i18n.js`: Russian, English, Chinese translations
- `data/media.js`: images, hero image and verified videos
- `assets/`: SVG assets, and folders to add your own media
- `PHOTO_GUIDE.md`: photo shoot and import guidance

No images of other people, fictional film credits, unverified contacts or artificial casting portraits are included. Gallery and video sections are hidden until real assets are provided. The current typography-only hero is intentional.

## Testing
Open `index.html` through any static HTTP server (e.g. `python -m http.server 8080`), or on Pages. Test RU / EN / 中文, mobile menu, card dialog and print view, sharing, media after importing them.
