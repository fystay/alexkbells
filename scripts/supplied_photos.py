"""Cut the photos of Alex supplied by the project owner (2026-10-17).

Sources live in assets/journey/. Each is cropped to 4:5, resized to 720x900
and given the hero video's black-and-white grade. The before/after pair use
the same framing (head to waistband).

Usage (needs Pillow):
    python3 scripts/supplied_photos.py
Outputs: public/journey/before.jpg, public/journey/after.jpg,
         public/images/alex/about.jpg
"""

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "assets/journey"

# source name: (output path, (x, y, width) of a 4:5 crop in the source)
SHOTS = {
    "before": ("public/journey/before.jpg", (0, 0, 1525)),  # 1525x1920 phone photo at home
    "after": ("public/journey/after.jpg", (0, 20, 654)),  # 654x960 gym photo
    "about": ("public/images/alex/about.jpg", (0, 20, 900)),  # 1206x1357, head to knees among the kettlebells
}


def main():
    for name, (dest, (x, y, w)) in SHOTS.items():
        image = ImageOps.exif_transpose(Image.open(SRC_DIR / f"{name}-source.jpg"))
        h = round(w * 5 / 4)
        crop = image.crop((x, y, x + w, y + h)).resize((720, 900), Image.LANCZOS)
        # Same black-and-white grade as the hero video: slight contrast lift around mid-grey.
        graded = ImageOps.grayscale(crop).point(lambda v: max(0, min(255, round((v - 128) * 1.08 + 128))))
        out = ROOT / dest
        out.parent.mkdir(parents=True, exist_ok=True)
        graded.save(out, quality=88, optimize=True, progressive=True)
        print(f"{name}: {out}")


if __name__ == "__main__":
    main()
