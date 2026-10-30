#!/usr/bin/env python3
"""Build reproducible, tiny, first-party CJK webfont subsets from licensed Noto.
Owner's portfolio ships only the glyphs used by its Chinese editorial copy.
No font download occurs in visitor browsers. Source license texts are bundled.
"""
from __future__ import annotations
from pathlib import Path
from io import BytesIO
import urllib.request
import re
import json
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "assets" / "fonts"
DEST.mkdir(parents=True, exist_ok=True)
SOURCES = [
    ("NotoSansSC-subset.woff2", "ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf",
     "2894aab31764f10f29c421bdfd2340d3b382d384", "NotoSansSC-OFL.txt"),
    ("NotoSerifSC-subset.woff2", "ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf",
     "2e61f4355afd22b801791b0df176065082423b87", "NotoSerifSC-OFL.txt"),
]
text = (ROOT / "data/i18n.js").read_text(encoding="utf-8")
text += (ROOT / "index.html").read_text(encoding="utf-8")
charsets = {
    ord(ch) for ch in text
    if 0x3400 <= ord(ch) <= 0x9FFF or 0x3000 <= ord(ch) <= 0x303F
    or 0xFF00 <= ord(ch) <= 0xFFEF
}
charsets.update(range(0x20, 0x7F))
charsets.update(map(ord, "—–·“”‘’«»→↑↗℃×°"))
# Serif is reserved for actual editorial display lines, not the whole website.
# Keeping only these Chinese glyphs avoids a ~220 KB first-screen font download.
SERIF_KEYS = {
    "heroName1", "heroName2", "heroLine", "portraitHeadline",
    "folioTitle", "spreadTitle", "archiveTitle", "screenStatement",
    "aboutOpening", "contactHead2", "contactLead", "interludeTitle",
    "bookingTitle", "portfolioTitle", "screenTitle", "profileTitle",
    "aboutTitle"
}
copy = (ROOT / "data/i18n.js").read_text(encoding="utf-8")
serif_text = ""
for key in sorted(SERIF_KEYS):
    results = re.findall(r'"' + re.escape(key) + r'"\s*:\s*"((?:\\.|[^"\\])*)"', copy)
    if len(results) != 3:
        raise SystemExit(f"Expected RU/EN/ZH values for {key}, found {len(results)}")
    serif_text += json.loads('"' + results[-1] + '"')
serif_chars = {
    ord(ch) for ch in serif_text
    if 0x3400 <= ord(ch) <= 0x9FFF or 0x3000 <= ord(ch) <= 0x303F
    or 0xFF00 <= ord(ch) <= 0xFFEF
}
serif_chars.update(range(0x20, 0x7F))
serif_chars.update(map(ord, "—–·“”‘’«»→↑↗℃×°"))
if len(serif_chars) < 115:
    raise SystemExit(f"Too few editorial characters: {len(serif_chars)}")
(DEST / "serif-covered-glyphs.txt").write_text(
    "".join(chr(c) for c in sorted(serif_chars) if c >= 0x3000), encoding="utf-8"
)

(DEST / "covered-glyphs.txt").write_text(
    "".join(chr(c) for c in sorted(charsets) if c >= 0x3000), encoding="utf-8"
)
if len(charsets) < 170:
    raise SystemExit("Unexpectedly small Chinese character coverage: "+str(len(charsets)))

def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "PavelMarkov-portfolio-CJK-asset-builder/1.0"})
    with urllib.request.urlopen(req, timeout=120) as reply:
        return reply.read()

for filename, upstream_path, revision, license_file in SOURCES:
    base = "https://raw.githubusercontent.com/google/fonts/" + revision + "/"
    font_bytes = download(base + upstream_path)
    if len(font_bytes) < 200000:
        raise SystemExit("Source font unexpectedly small")
    font = TTFont(BytesIO(font_bytes))
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = [1, 2, 4, 6]
    opts.name_languages = ["*"]
    sub = subset.Subsetter(options=opts)
    selected = charsets if filename.startswith("NotoSans") else serif_chars
    sub.populate(unicodes=selected)
    sub.subset(font)
    font.flavor = "woff2"
    path = DEST / filename
    font.save(path)
    font.close()
    with TTFont(path) as saved:
        covered = set(saved.getBestCmap())
        required = {c for c in selected if 0x3400 <= c <= 0x9FFF}
        missing = sorted(required - covered)
        if missing:
            raise SystemExit(f"{filename} misses {len(missing)} Chinese glyphs: {missing[:10]}")
    if not 10000 < path.stat().st_size < 200000:
        raise SystemExit(f"{filename} unusual size {path.stat().st_size} bytes")
    license_path = upstream_path.rsplit("/", 1)[0] + "/OFL.txt"
    license_content = download(base + license_path).decode("utf-8")
    (DEST / license_file).write_text(license_content, encoding="utf-8")
    print(f"{filename}: {path.stat().st_size} bytes; {len(required)} confirmed Chinese codepoints")

print("First-party Chinese font subsets are ready; no runtime Google Fonts needed.")
