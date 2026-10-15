"""Generate web logo assets from the supplied artwork.

Source: assets/brand/alexkbells-logo-source.jpg (supplied by the client,
white/grey artwork on a pure black background, 1254x1254).

Nothing is redrawn: outputs are crops of the original. For transparent
PNGs, each pixel's luminance becomes its alpha over white, which exactly
reproduces the artwork when composited on any dark surface. These PNGs
must therefore only be placed on dark backgrounds (see DESIGN.md).

Usage (requires Pillow):  python3 scripts/brand_assets.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/brand/alexkbells-logo-source.jpg"
INK = (11, 11, 11)  # --color-ink

# Content bounds measured from the source (luminance > 60), inclusive.
MARK_BOX = (253, 338, 977, 689)  # AR monogram + kettlebell
LOCKUP_BOX = (149, 338, 1110, 875)  # monogram + ALEX.KBELLS + KETTLEBELL COACH


def padded(box, pad):
    x0, y0, x1, y1 = box
    return (x0 - pad, y0 - pad, x1 + 1 + pad, y1 + 1 + pad)


def to_transparent(img):
    """White artwork whose alpha is the source luminance."""
    alpha = img.convert("L")
    out = Image.new("RGBA", img.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    return out


def on_ink(transparent, size, scale):
    """Centre transparent artwork on an ink canvas, `scale` of canvas width."""
    canvas = Image.new("RGB", size, INK)
    w = round(size[0] * scale)
    h = round(transparent.height * w / transparent.width)
    if h > size[1] * scale:
        h = round(size[1] * scale)
        w = round(transparent.width * h / transparent.height)
    art = transparent.resize((w, h), Image.LANCZOS)
    canvas.paste(art, ((size[0] - w) // 2, (size[1] - h) // 2), art)
    return canvas


def main():
    src = Image.open(SOURCE).convert("RGB")
    mark = to_transparent(src.crop(padded(MARK_BOX, 8)))
    lockup = to_transparent(src.crop(padded(LOCKUP_BOX, 8)))

    public = ROOT / "public/brand"
    public.mkdir(parents=True, exist_ok=True)
    mark.save(public / "logo-mark.png", optimize=True)
    lockup.save(public / "logo-lockup.png", optimize=True)

    app = ROOT / "src/app"
    on_ink(mark, (512, 512), 0.8).save(app / "icon.png", optimize=True)
    on_ink(mark, (180, 180), 0.78).save(app / "apple-icon.png", optimize=True)
    on_ink(lockup, (1200, 630), 0.55).save(public.parent / "og-image.png", optimize=True)

    for name, img in [("logo-mark", mark), ("logo-lockup", lockup)]:
        print(f"{name}: {img.width}x{img.height}")


if __name__ == "__main__":
    main()
