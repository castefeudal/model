#!/usr/bin/env python3
"""Editorial social cover matching Issue 04. Uses owned archival imagery, not casting digitals."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "portrait-fashion.webp"
OUTPUT = ROOT / "assets" / "social-cover.png"
W, H, PHOTO_W = 1200, 630, 682
INK = (32, 31, 35)
PAPER = (246, 241, 231)
RED = (190, 133, 132)
MUTED = (221, 214, 207)
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"

portrait = Image.open(SOURCE).convert("RGB")
crop = ImageOps.fit(portrait, (PHOTO_W, H), method=Image.Resampling.LANCZOS, centering=(0.52, 0.38))
cover = Image.new("RGB", (W, H), INK)
cover.paste(crop, (0, 0))
draw = ImageDraw.Draw(cover)

def font(path, size):
    return ImageFont.truetype(path, size)

def fitted(word, size, max_width, path):
    while draw.textlength(word, font=font(path, size)) > max_width:
        size -= 1
    return font(path, size)

# An editorial vertical split, not a generic gradient overlay.
draw.rectangle((PHOTO_W, 0, PHOTO_W + 7, H), fill=RED)
draw.text((45, 43), "P / M", font=font(SANS, 25), fill=PAPER, stroke_width=0)
draw.line((43, 86, 144, 86), fill=PAPER, width=2)
draw.text((45, 572), "THE PERSONAL ARCHIVE   /   2026", font=font(SANS, 13), fill=PAPER)
draw.text((PHOTO_W + 52, 49), "ISSUE 04   /   CASTING BOOK", font=font(SANS, 16), fill=RED)
draw.line((PHOTO_W + 52, 101, W - 47, 101), fill=(109, 103, 103), width=1)

draw.text((PHOTO_W + 43, 165), "PAVEL", font=fitted("PAVEL", 99, 457, SANS), fill=PAPER)
draw.text((PHOTO_W + 43, 276), "MARKOV", font=fitted("MARKOV", 87, 457, SANS), fill=PAPER)
draw.rectangle((PHOTO_W + 52, 397, PHOTO_W + 116, 402), fill=RED)
draw.text((PHOTO_W + 52, 428), "MODEL  /  ON-CAMERA", font=font(SERIF, 25), fill=PAPER)
draw.text((PHOTO_W + 52, 467), "ATHLETIC PRESENCE", font=font(SERIF, 25), fill=MUTED)
draw.line((PHOTO_W + 52, 547, W - 47, 547), fill=(109, 103, 103), width=1)
draw.text((PHOTO_W + 52, 568), "188 CM    /    BELARUS", font=font(REG, 17), fill=MUTED)

cover.save(OUTPUT, "PNG", optimize=True, compress_level=9)
print(f"Created editorial social cover: {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
