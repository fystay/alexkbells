"""Cut the homepage hero loop from Alex's Instagram reel.

Source: Alex's own reel (720x1280, 30 fps, 43 s), supplied 2026-10-15. Not
committed (30 MB). Its overlays are Alex's own branding added in editing:
the "1% everyday" caption and an Instagram icon + @ALEX.KBELLS handle.

What this does:
1. Builds an exact pixel template for each overlay (pixels that stay bright
   across clips with different backgrounds) and removes it per frame with
   OpenCV inpainting. Only overlay pixels are touched.
2. Cuts the selected kettlebell clips, crops each to 4:5 with a per-clip
   vertical offset, converts to black and white to match the monochrome
   brand, and encodes silent VP9 WebM + H.264 MP4 files plus a poster frame.

Usage (needs opencv-python-headless + numpy, and ffmpeg on PATH):
    python3 scripts/hero_video.py path/to/reel.mp4
Outputs: public/media/hero.webm, hero.mp4, hero-poster.jpg
"""

import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public/media"
W, H = 720, 900  # 4:5

# (start s, end s, crop, brightness gain) — order is the edit order.
# crop is a y-offset for a full-width 720x900 window, or (x, y, w) for a
# smaller 4:5 window that is scaled up to 720x900.
# Gain lifts the darker gym clips so the sequence reads evenly.
#
# Where the Instagram icon sat top-right (ig_right), inpainting left a soft
# patch over busy backgrounds, so those clips are framed to exclude the icon
# area (source x >= 552 and y <= 377) instead of relying on the fill.
CLIPS = [
    (14.90, 15.85, 190, 1.0),            # group goblet squats (opening frame + poster)
    (15.90, 16.85, 80, 1.0),             # double-bell overhead press
    (12.00, 12.85, 260, 1.0),            # double-bell swing
    (22.15, 22.85, 378, 1.0),            # coaching swings side by side (crop below the icon)
    (10.90, 11.85, 250, 1.1),            # single-bell clean
    (29.40, 30.30, 300, 1.25),           # swing in class
    (31.40, 32.40, 100, 1.3),            # group class
    (33.00, 34.20, 150, 1.3),            # group double-bell press
    (36.90, 37.65, (0, 40, 552), 1.6),   # kneeling overhead hold (crop left of the icon)
]
POSTER_AT = (0, 0.0)  # (clip index, seconds into clip) — first frame, so play starts without a jump

# Overlay search boxes (x0, y0, x1, y1), measured from the source.
BOXES = {
    "caption": (270, 612, 455, 660),
    "ig_left": (45, 744, 175, 835),
    "ig_right": (555, 290, 685, 381),
}
# Clips where each overlay sits over varied backgrounds, for its template.
TEMPLATE_CLIPS = {
    "caption": [(14.9, 15.85), (19.05, 20.0), (31.4, 32.6), (36.6, 37.6)],
    "ig_left": [(14.9, 15.85), (31.4, 32.6)],
    "ig_right": [(19.05, 20.0), (36.6, 37.6)],
}
# Mask growth per overlay: the caption has a soft shadow, so it needs more.
DILATE = {"caption": 9, "ig_left": 7, "ig_right": 7}
BRIGHT = 150


def read_clip(cap, fps, a, b):
    cap.set(cv2.CAP_PROP_POS_FRAMES, round(a * fps))
    frames = []
    for _ in range(round((b - a) * fps)):
        ok, frame = cap.read()
        if not ok:
            break
        frames.append(frame)
    return frames


def build_templates(cap, fps):
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    templates = {}
    for name, clips in TEMPLATE_CLIPS.items():
        always_bright = np.ones((h, w), bool)
        for a, b in clips:
            lum = np.stack([cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) for f in read_clip(cap, fps, a, b)])
            always_bright &= lum.min(0) > BRIGHT
        x0, y0, x1, y1 = BOXES[name]
        box = np.zeros((h, w), bool)
        box[y0:y1, x0:x1] = True
        core = (always_bright & box).astype(np.uint8) * 255
        size = DILATE[name]
        templates[name] = {
            "core": core > 0,
            "fill": cv2.dilate(core, np.ones((size, size), np.uint8)),
        }
    return templates


def remove_overlays(frame, templates):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    mask = np.zeros(gray.shape, np.uint8)
    for tpl in templates.values():
        if (gray[tpl["core"]] > BRIGHT).mean() >= 0.75:  # overlay present in this shot
            mask |= tpl["fill"]
    if not mask.any():
        return frame
    return cv2.inpaint(frame, mask, 6, cv2.INPAINT_TELEA)


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def main(src):
    cap = cv2.VideoCapture(str(src))
    fps = cap.get(cv2.CAP_PROP_FPS)
    templates = build_templates(cap, fps)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    grade = "hue=s=0,eq=contrast=1.08:gamma=0.97"

    # 1. Lossless, graded intermediate so both delivery formats share one master.
    master = OUT_DIR / "_master.mkv"
    writer = subprocess.Popen(
        [
            "ffmpeg", "-v", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
            "-vf", grade, "-an", "-c:v", "ffv1", "-pix_fmt", "yuv420p", str(master),
        ],
        stdin=subprocess.PIPE,
    )
    poster = None
    for index, (a, b, crop, gain) in enumerate(CLIPS):
        x, y, w = (0, crop, W) if isinstance(crop, int) else crop
        h = round(w * H / W)
        for i, frame in enumerate(read_clip(cap, fps, a, b)):
            out = remove_overlays(frame, templates)[y : y + h, x : x + w]
            if w != W:
                out = cv2.resize(out, (W, H), interpolation=cv2.INTER_LANCZOS4)
            if gain != 1.0:
                out = cv2.convertScaleAbs(out, alpha=gain)
            writer.stdin.write(np.ascontiguousarray(out).tobytes())
            if index == POSTER_AT[0] and i == round(POSTER_AT[1] * fps):
                poster = out
    writer.stdin.close()
    if writer.wait() != 0:
        sys.exit("ffmpeg failed writing the master")

    # 2. Delivery formats: VP9 WebM (Chrome, Firefox, Android) listed first,
    #    H.264 MP4 for Safari/iOS. Both silent.
    ffmpeg("-i", str(master), "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "37",
           "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", str(OUT_DIR / "hero.webm"))
    ffmpeg("-i", str(master), "-an", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow",
           "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUT_DIR / "hero.mp4"))
    master.unlink()

    # 3. Poster frame with the same black-and-white grade.
    tmp = OUT_DIR / "_poster.png"
    cv2.imwrite(str(tmp), poster)
    ffmpeg("-i", str(tmp), "-vf", grade, "-q:v", "4", str(OUT_DIR / "hero-poster.jpg"))
    tmp.unlink()

    total = sum(b - a for a, b, _, _ in CLIPS)
    print(f"hero: {len(CLIPS)} clips, {total:.1f}s -> hero.webm, hero.mp4, hero-poster.jpg")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
