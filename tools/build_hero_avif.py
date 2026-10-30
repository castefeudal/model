#!/usr/bin/env python3
"""Generate AVIF delivery variants of the owner's verified archival hero.

The unmodified WebP source remains in assets and provides full fallback.
No face editing, generation, color manipulation or upscale is performed.
"""
from pathlib import Path
from PIL import Image, ImageOps, features

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/portrait-fashion.webp"
if not features.check("avif"):
    raise RuntimeError("Pillow AVIF encoder unavailable")

with Image.open(SOURCE) as input_image:
    src = ImageOps.exif_transpose(input_image).convert("RGB")
    for edge in (960, 1600):
        frame = src.copy()
        frame.thumbnail((edge, edge), Image.Resampling.LANCZOS)
        target = ROOT / f"assets/portrait-fashion-{edge}.avif"
        frame.save(target, "AVIF", quality=65, speed=6)
        with Image.open(target) as verified:
            verified.load()
            assert verified.size == frame.size
        ratio = target.stat().st_size / SOURCE.stat().st_size
        print(f"{target.name}: {frame.size}, {target.stat().st_size:,} bytes ({ratio:.1%} of source)")
        if ratio > .92:
            raise RuntimeError(f"AVIF is not materially smaller than source: {target.name}")
