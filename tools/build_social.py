#!/usr/bin/env python3
"""Generate a high-fidelity Open Graph cover using the owner's credited brand portrait.
The source is stylized editorial imagery, not a certified casting headshot.
This image is for social previews only and never replaces casting documentation.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "editorial-markovmade.webp"
OUTPUT = ROOT / "assets" / "social-cover.png"
W, H = 1200, 630
LEFT = 638
paper = (239, 235, 226)
ink = (27, 29, 33)
accent = (147, 63, 74)
muted = (74, 76, 81)

portrait = Image.open(SOURCE).convert("RGB")
crop = ImageOps.fit(
    portrait, (W - LEFT, H),
    method=Image.Resampling.LANCZOS, centering=(0.5, 0.47)
)
cover = Image.new("RGB", (W, H), paper)
cover.paste(crop, (LEFT, 0))
d = ImageDraw.Draw(cover)

bold_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
regular_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
serif_path = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
def font(path, size):
    return ImageFont.truetype(path, size)
def fit_font(text, size, width, path):
    while size > 25 and d.textlength(text, font=font(path,size)) > width:
        size -= 1
    return font(path,size)

# Architectural editorial hierarchy, never a SaaS card.
d.rectangle((0, 0, LEFT - 1, 8), fill=ink)
d.rectangle((LEFT - 7, 0, LEFT, H), fill=accent)
d.rectangle((51, 52, 63, 64), fill=accent)
d.text((77, 49), "P / M    PERSONAL CASTING BOOK", font=font(bold_path, 18), fill=ink)
d.line((50, 103, 590, 103), fill=(187,180,170), width=2)

large = fit_font("PAVEL", 145, 546, bold_path)
d.text((47, 181), "PAVEL", font=large, fill=ink, stroke_width=0)
large2 = fit_font("MARKOV", 121, 552, bold_path)
d.text((47, 317), "MARKOV", font=large2, fill=ink, stroke_width=0)
d.rectangle((53, 467, 116, 473), fill=accent)
d.text((51, 493), "MODEL  /  ON-CAMERA TALENT", font=font(serif_path, 21), fill=ink)

d.line((51, 552, 587, 552), fill=(187,180,170), width=2)
d.text((52, 573), "188 CM   /   ATHLETIC   /   BELARUS", font=font(regular_path, 17), fill=muted)

# Graphic seal is deliberately outside the face.
d.rectangle((1080, 35, 1160, 79), fill=accent)
d.text((1094, 46), "PM-01", font=font(bold_path, 16), fill=(255,250,243))
d.line((660, 20, 1180, 20), fill=(255,255,255), width=1)
d.line((1180, 20, 1180, 610), fill=(255,255,255), width=1)
d.line((660, 610, 1180, 610), fill=(255,255,255), width=1)

cover.save(OUTPUT, format="PNG", optimize=True, compress_level=9)
print(f"Created social preview {OUTPUT} — {OUTPUT.stat().st_size} bytes")
