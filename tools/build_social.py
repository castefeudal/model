#!/usr/bin/env python3
"""Generate an authentic typography-only Open Graph card. No stock or synthetic faces."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
image = Image.new("RGB", (W, H), (24, 32, 27))
draw = ImageDraw.Draw(image)
foreground = (242, 239, 228)
muted = (182, 191, 173)
accent = (189, 112, 82)
draw.rectangle((36, 36, W-36, H-36), outline=(73, 86, 73), width=2)
for radius in (210, 260, 320, 380):
    colour = 57 + radius // 20
    draw.ellipse((855-radius, 292-radius, 855+radius, 292+radius),
                 outline=(colour, colour+13, colour+1), width=2)
draw.line((820, 0, 820, H), fill=(69, 79, 66), width=2)
draw.rectangle((72, 78, 126, 83), fill=accent)
font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
label = ImageFont.truetype(font_path, 24)
small = ImageFont.truetype(font_path, 20)
large = ImageFont.truetype(font_path, 160)
draw.text((72, 98), "MODEL  /  ACTOR  /  ON-CAMERA TALENT", font=label, fill=muted)
draw.text((58, 210), "PAVEL", font=large, fill=foreground)
draw.text((58, 360), "MARKOV", font=large, fill=foreground)
draw.text((72, 558), "188 CM   /   ATHLETIC   /   BELARUS", font=small, fill=muted)
draw.text((1066, 558), "PM — 01", font=small, fill=accent)
output = Path(__file__).resolve().parent.parent / "assets" / "social-cover.png"
image.quantize(colors=32, method=Image.Quantize.MEDIANCUT,
               dither=Image.Dither.NONE).save(output, format="PNG", optimize=True, compress_level=9)
print(f"Generated {output} ({output.stat().st_size} bytes)")
