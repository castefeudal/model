#!/usr/bin/env python3
"""Build archival thumbnails for the portfolio, never alter original source photos."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets"
DEST = SRC / "thumbs"
DEST.mkdir(parents=True, exist_ok=True)

FILES = ("portrait-digital.webp", "portrait-character.webp", "editorial-markovmade.webp")
MAX_EDGE = 900

for filename in FILES:
    original = SRC / filename
    if not original.is_file():
        raise FileNotFoundError(original)
    output = DEST / filename
    with Image.open(original) as picture:
        picture = ImageOps.exif_transpose(picture).convert("RGB")
        picture.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        picture.save(output, "WEBP", quality=78, method=6)
    with Image.open(output) as result:
        result.verify()
    ratio = output.stat().st_size / original.stat().st_size
    print(f"{original.name:31s} -> {output.name:31s} {ratio:.1%} of original bytes")
    if ratio > 0.95:
        raise RuntimeError(f"Thumbnail is not meaningfully smaller: {filename}")
