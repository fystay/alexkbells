"""Cut stills for the inner page headers from the hero loop.

Source: public/media/hero.mp4 / hero.webm (made by hero_video.py from Alex's
own reel; black and white, overlays already removed). The original reel is
not committed, so frames come from the committed loop. Frames were chosen by
sharpness; clips that are motion-blurred or show other gyms' branding
(e.g. "APEX") are left out.

The double-swing frame has a soft grey patch where hero_video.py removed the
"1% everyday" caption. It is repaired by cloning the same diamond-plate wall
texture from a fixed offset, feathered at the edges, with a brightness match.

Usage (needs Pillow + numpy, and ffmpeg on PATH):
    python3 scripts/video_stills.py
Outputs: public/images/training/double-swing.jpg, bell-hold.jpg (720x900, 4:5)
"""

import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "public/media"
OUT_DIR = ROOT / "public/images/training"

# name: (source file, 1-based frame number, caption-patch repair or None)
# A repair is ((x0, y0, x1, y1) patch, (dx, dy) offset of clean texture).
STILLS = {
    "double-swing": ("hero.mp4", 80, ((298, 346, 460, 412), (12, 180))),
    "bell-hold": ("hero.webm", 129, None),
}
RING = 10  # px around the patch used to match brightness and feather the edge


def read_frame(video: Path, n: int) -> Image.Image:
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "frame.png"
        subprocess.run(
            ["ffmpeg", "-v", "error", "-i", str(video), "-vf", f"select=eq(n\\,{n - 1})", "-frames:v", "1", str(out)],
            check=True,
        )
        return Image.open(out).convert("L").copy()


def repair(img: Image.Image, box, offset) -> Image.Image:
    a = np.asarray(img, dtype=np.float32).copy()
    (x0, y0, x1, y1), (dx, dy) = box, offset
    r = RING
    target = a[y0 - r : y1 + r, x0 - r : x1 + r]
    source = a[y0 + dy - r : y1 + dy + r, x0 + dx - r : x1 + dx + r]
    ring = np.ones(target.shape, bool)
    ring[r:-r, r:-r] = False
    shift = float((target[ring] - source[ring]).mean())  # match the wall's brightness
    mask = np.zeros(target.shape, np.uint8)
    mask[r - 2 : -r + 2, r - 2 : -r + 2] = 255
    m = np.asarray(Image.fromarray(mask).filter(ImageFilter.GaussianBlur(3)), np.float32) / 255
    a[y0 - r : y1 + r, x0 - r : x1 + r] = target * (1 - m) + (source + shift) * m
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, (file, frame, fix) in STILLS.items():
        img = read_frame(MEDIA / file, frame)
        if fix:
            img = repair(img, *fix)
        path = OUT_DIR / f"{name}.jpg"
        img.save(path, quality=84, optimize=True, progressive=True)
        print(f"{path.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    main()
