# Model / Acting Portfolio — verified release audit

Date: 2026-10-31. Starting branch: main (bdcb9f03191e139288994319ee6a7428013787a1).

## Evidence and decisions

The preceding GitHub Lighthouse run measured desktop performance RU/EN 100, ZH 98; mobile RU/EN 92, ZH 81. Mobile LCP was 3.2 s for RU/EN and 4.4 s for ZH (synthetic lab; not field Core Web Vitals). All six accessibility categories scored 100 in that run, but automation is not proof of perfect accessibility or conversion.

## Findings (impact / correction)

- **P0 / Casting decision path:** the mobile hero led to photographs and contact, forcing a separate search for measurements. A casting dossier is now a primary one-tap action, with a follow-on link to the photographic book.
- **P1 / Keyboard:** the filmstrip handled arrow keys only when its non-focusable container was focused. Make it a correctly named keyboard-focusable scroll region on mobile/tablet, with arrows and semantic live counter.
- **P1 / Motion:** the JS controller overwrote the footer button's localized visible text while updating its state. Preserve label and update icon only. Keep motion user-controlled and opt out when the system requests reduced motion.
- **P1 / China delivery:** every language downloaded Google Fonts CSS, despite self-hosted CJK fonts. Load Latin remote CSS only for RU/EN, including late language switches.
- **P2 / Responsiveness:** original visual/browser checks stopped at 1440 px. Add 1920 px and 375/414 px localized coverage, keeping 320/360/390/768/1024/1440 coverage.
- **P2 / Photo integrity:** existing six actual owner-archive images are labeled as old/styled, not current unretouched digitals. Preserve separation of `MODEL_ARCHIVE` from empty `MODEL_PHOTOS` and `MODEL_VIDEOS`; no invented filmography.

## Accepted editorial boundaries

Keep the authored hero photograph, asymmetrical lookbook, three localized color/typography themes, real contact routes, printable archival comp card, and the one-source CSS compiler (`issue09.css` -> `bundle.css`). Animations must use opacity and transform rather than layout-affecting geometry. No autoplay, trackers, fancy fake AI photos, or opaque form submission.

## Remaining real-world needs

The project still requires recent verified front/three-quarter/profile/full-body digitals, accurately measured current wardrobe/shoe dimensions, and a genuine showreel or self-tape. These cannot be replaced by CSS. Run manual auditions with actual casting decision-makers before claiming conversion gains.

## Validation

`node tools/verify.mjs`; `node tools/browser-qa.mjs` with Chrome and local HTTP server; six Lighthouse combinations using `tools/grade.mjs`. Watch mobile LCP especially for ZH. Check the live production build and GitHub Pages deployment SHA after merge.

## Controlled image optimization experiments — rejected

The owner-provided `assets/portrait-fashion.webp` original remains unchanged. Temporary AVIF encodings were generated and tested, but neither shipped. All photos stay honest archives rather than invented casting digitals.

| Synthetic Lighthouse ZH mobile experiment | Performance | LCP |
| --- | ---: | ---: |
| Early responsive WebP + locale-aware fonts | 92 | 3.4s |
| 1600px AVIF on mobile | 77 | 5.6s |
| 960px AVIF on mobile | 81 | 4.7s |
| Later restored mobile WebP in a separate run | 80 | 4.9s |

The discrepancy between two WebP runs demonstrates **laboratory variance**; these tests alone cannot prove format causality. Since AVIF was not reliably beneficial, it was removed entirely, including the unused generator and workflow. Release criteria prioritize **no missing Chinese glyphs, functional casting navigation, honest photos, and passing 15 real-browser layouts** over synthetic micro-optimizations. A single Lighthouse performance score is not a field Core Web Vitals measurement.
