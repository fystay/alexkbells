"""Cut Alex's before/after photos for the "Alex's journey" section from his reel.

The reel opens with selfies from before he started training and later shows
him today, so both photos come from Alex's own footage. Uses the same overlay
removal as hero_video.py (his "1% everyday" caption and Instagram handle).

Usage (needs opencv-python-headless + numpy):
    python3 scripts/journey_photos.py path/to/reel.mp4
Outputs: public/journey/before.jpg, public/journey/after.jpg (720x900, 4:5)
"""

import sys

import cv2
import numpy as np

from hero_video import ROOT, build_templates, read_clip, remove_overlays

OUT_DIR = ROOT / "public/journey"

# name: (search window start s, end s, crop (x, y, w) of a 4:5 window in the 720x1280 source)
SHOTS = {
    "before": (0.0, 0.9, (0, 170, 720)),  # early selfie, before training
    "after": (21.2, 21.9, (0, 300, 720)),  # today, kneeling in the gym
}


def sharpness(frame):
    return cv2.Laplacian(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()


def main(src):
    cap = cv2.VideoCapture(str(src))
    fps = cap.get(cv2.CAP_PROP_FPS)
    templates = build_templates(cap, fps)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, (a, b, (x, y, w)) in SHOTS.items():
        frame = max(read_clip(cap, fps, a, b), key=sharpness)
        clean = remove_overlays(frame, templates)
        h = round(w * 5 / 4)
        crop = cv2.resize(clean[y : y + h, x : x + w], (720, 900), interpolation=cv2.INTER_LANCZOS4)
        # Same black-and-white grade as the hero video.
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32)
        graded = np.clip((gray - 128) * 1.08 + 128, 0, 255).astype(np.uint8)
        cv2.imwrite(str(OUT_DIR / f"{name}.jpg"), graded, [cv2.IMWRITE_JPEG_QUALITY, 88])
        print(f"{name}: {OUT_DIR / f'{name}.jpg'}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
