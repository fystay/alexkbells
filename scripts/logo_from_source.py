"""Cuts the site's logo files from the supplied artwork (2026-10-22: RAENG FITNESS).

Usage: python3 scripts/logo_from_source.py
Reads assets/brand/raeng-fitness-logo-source.jpg and writes, in the artwork's
own shapes (nothing retyped or redrawn), transparent PNGs in #171717:
  public/brand/raeng-header-black.png  monogram + RAENG + FITNESS + rule
  public/brand/raeng-mark-black.png    monogram only
  public/brand/raeng-lockup-black.png  the whole logo
plus the favicon, Apple icon and share image on the artwork's own background.
"""
from PIL import Image
import numpy as np

SRC = "assets/brand/raeng-fitness-logo-source.jpg"
INK = (0x17, 0x17, 0x17)
img = Image.open(SRC).convert("RGB")
lum = np.asarray(img.convert("L")).astype(float)
bg = np.percentile(lum, 95)
alpha = np.clip((bg - lum) / (bg - 25) * 255, 0, 255).astype(np.uint8)
alpha[alpha < 12] = 0

def bands(mask, axis, gap):
    idx = np.where(mask.any(axis=axis))[0]
    out, start, prev = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - prev > gap:
            out.append((start, prev)); start = i
        prev = i
    out.append((start, prev))
    return out

ink = alpha > 40
rows = bands(ink, 1, 4)  # monogram, RAENG, FITNESS, rule, tagline
assert len(rows) >= 5, rows
mono, word, fit, rule, tag = rows[:5]

def cut(y0, y1, name, pad=6):
    sub = ink[y0:y1 + 1]
    x0, x1 = np.where(sub.any(axis=0))[0][[0, -1]]
    box = (max(x0 - pad, 0), max(y0 - pad, 0), min(x1 + pad + 1, img.width), min(y1 + pad + 1, img.height))
    a = Image.fromarray(alpha).crop(box)
    out = Image.new("RGBA", a.size, INK + (0,))
    out.putalpha(a)
    out.save(f"public/brand/{name}.png", optimize=True)
    print(name, out.size)
    return out.size

cut(mono[0], rule[1], "raeng-header-black")
cut(mono[0], mono[1], "raeng-mark-black")
cut(mono[0], tag[1], "raeng-lockup-black")

# Favicon, Apple icon, share image: the artwork itself on its own background.
sq = img.crop((0, 0, img.width, img.height))
sq.resize((512, 512), Image.LANCZOS).save("src/app/icon.png")
sq.resize((180, 180), Image.LANCZOS).save("src/app/apple-icon.png")
og = Image.new("RGB", (1200, 630), img.getpixel((5, 5)))
logo = sq.resize((630, 630), Image.LANCZOS)
og.paste(logo, (285, 0))
og.save("public/og-image.png")
