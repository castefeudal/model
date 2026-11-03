# Director's Edition — implementation and evidence (2026-11-03)

## Reference baseline
Repository: castefeudal/model, main commit 29e51bc250df4b31a5eb82dadcfee0b52aa3992a.

Historical successful Lighthouse CI (2026-10-30): desktop Performance RU/EN/ZH 100 / 100 / 99; mobile 93 / 92 / 80; mobile LCP 3.2 / 3.2 / 4.6 seconds. Chromium smoke checked 14 responsive/locale combinations. These are *pre-change laboratory metrics*; check CI on this branch for current evidence.

## Implemented changes
- **Casting-first information sequence.** Essential physical measurements and comp card now appear before the extended face portrait and photographic book.
- **Direct booker contact.** The two prominent hero CTAs open the confirmed Telegram contact @markovmade with a properly localized draft; existing email/booking composer remains available elsewhere.
- **Shareable casting dossier.** URL query `?lang=en&view=casting` opens the native casting overview, including verified measurements. Copying casting specifications now shares the dossier-specific link.
- **Curated photographic rhythm.** Less repetitive section height, a landscape aspect ratio for the genuine stage photograph on desktop, improved proportions for selected photos, and more readable casting labels.
- **Responsive readability.** Tighter first-screen height on phones; larger critical action areas and measurement notes; keep photo details and user control.
- **Chinese performance hygiene.** Initial Chinese edition skips unnecessary external Latin Google Fonts request while retaining self-hosted licensed CJK type.
- **Regression gate.** Browser tests now include contact-link localization, section ordering and direct casting URL.

## Authenticity limitations
Current unretouched agency digitals, up-to-date verified wardrobe and shoe measurements, and original self-tape/showreel are not in the repository. The PR does not generate, retouch, mislabel or invent these inputs. Professional portrait provenance remains marked archival.

## Evidence to confirm
- `node tools/build-css.mjs --check`
- `node tools/verify.mjs`
- `python3 -m http.server 8765` plus `node tools/browser-qa.mjs`
- Lighthouse synthetic benchmarks RU/EN/ZH desktop/mobile
- Manual image checks on phone/tablet/desktop, including Chinese layout

CI success is not proof of increased casting conversion or of top-market visual status. Real booking feedback and new authentic photography remain essential.
