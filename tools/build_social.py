#!/usr/bin/env python3
"""Produce the 1200x630 editorial Open Graph cover from the owner's own archive."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "portrait-fashion.webp"
OUTPUT = ROOT / "assets" / "social-cover.png"
W, H, PHOTO_W = 1200, 630, 678
INK = (29, 28, 32)
IVORY = (247, 243, 233)
ACCENT = (196, 139, 131)
MUTED = (202, 197, 190)
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"

def font(path, size):
    return ImageFont.truetype(path, size)

portrait = Image.open(SOURCE)
portrait = ImageOps.exif_transpose(portrait).convert("RGB")
portrait = ImageOps.fit(portrait, (PHOTO_W, H), method=Image.Resampling.LANCZOS, centering=(.52,.34))
cover = Image.new("RGB", (W, H), INK)
cover.paste(portrait, (0, 0))
draw = ImageDraw.Draw(cover)
x = PHOTO_W + 52
# The portrait is real archive material; editorial styling is not a casting claim.
draw.rectangle((PHOTO_W, 0, PHOTO_W + 4, H), fill=ACCENT)
draw.rectangle((23, 22, 167, 76), fill=(29, 28, 32))
draw.text((42, 34), "P / M", fill=IVORY, font=font(SANS, 24))
draw.rectangle((25, 560, 425, 607), fill=(29, 28, 32))
draw.text((44, 574), "THE HUMAN FRAME  /  2026", fill=IVORY, font=font(SANS, 14))
draw.text((x, 44), "PERSONAL EDITION     /     ISSUE 07", fill=ACCENT, font=font(SANS, 15))
draw.line((x, 94, W - 48, 94), fill=(91, 87, 89), width=2)

def fit_label(value, max_width, size):
    while size > 18 and draw.textlength(value, font=font(SANS, size)) > max_width:
        size -= 1
    return font(SANS, size)

draw.text((x - 5, 155), "PAVEL", font=fit_label("PAVEL", 453, 94), fill=IVORY)
draw.text((x - 5, 267), "MARKOV", font=fit_label("MARKOV", 453, 82), fill=IVORY)
draw.rectangle((x, 395, x + 76, 401), fill=ACCENT)
draw.text((x, 427), "MODEL  /  ON CAMERA", font=font(SERIF, 26), fill=IVORY)
draw.text((x, 471), "EDITORIAL  /  ATHLETIC", font=font(SERIF, 23), fill=MUTED)
draw.line((x, 550, W - 48, 550), fill=(91, 87, 89), width=1)
draw.text((x, 569), "188 CM   /   BELARUS", font=font(REG, 18), fill=MUTED)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
cover.save(OUTPUT, format="PNG", optimize=True, compress_level=9)
with Image.open(OUTPUT) as saved:
    assert saved.size == (1200, 630)
print(f"Created editorial social preview: {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
