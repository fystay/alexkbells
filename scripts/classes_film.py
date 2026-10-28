#!/usr/bin/env python3
"""Re-time and re-edit the classes page hero film for smooth playback.

Writes public/media/classes.{mp4,webm} + classes-poster.jpg (1280 x 544,
640 px and up) and classes-portrait.{mp4,webm} + classes-portrait-poster.jpg
(464 x 832, phones).

Input: the graded films committed in ce98832 (the owner's 13 s, 60 fps class
clip, slowed to two thirds and graded; the phone original isn't in the repo).
They were made by keeping 3 of every 4 source frames, so the motion stepped
1, 2, 1 source frames (judder); the owner's clip has four hard cuts; and the
loop faded through black. This script:
1. Puts every frame back at its source time on the 60 fps grid (frame n is
   source frame 4*(n//3) + (0, 1, 3)[n % 3]) and fills the one missing frame
   in four with motion interpolation.
2. Plays that 60 fps timeline at half speed at 30 fps: even motion, three of
   every four frames are the camera's own.
3. Trims the fades and the frames either side of each cut, joins the shots
   with 0.8 s dissolves, and dissolves the last shot into the first (1 s) so
   the loop has no visible start or end.
Needs ffmpeg with minterpolate and xfade (ffmpeg 6). Run from the repo root:
    python3 scripts/classes_film.py
"""
import os
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "media")
SOURCE_COMMIT = "ce98832"
FPS = 30
CUT_DISSOLVE = 0.8  # seconds, between shots
LOOP_DISSOLVE = 1.0  # seconds, last shot into the first

# Shots as [start, end) frames of the half-speed timeline (step 2), found by
# frame differencing the input: its cuts fall after input frames 115, 210, 364
# and 492; two frames are dropped either side of each (the interpolated frame
# that straddles a cut is a blend of both shots), and the fade-in/out is cut.
SHOTS = [(24, 152), (157, 279), (283, 484), (489, 655), (659, 752)]

FILMS = {"classes": "public/media/classes.mp4", "classes-portrait": "public/media/classes-portrait.mp4"}

SOURCE_TIME = "(4*floor(N/3)+if(eq(mod(N\\,3)\\,0)\\,0\\,if(eq(mod(N\\,3)\\,1)\\,1\\,3)))/60/TB"
INTERPOLATE = "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff"


def run(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def build(name, path, work):
    original = os.path.join(work, name + "-original.mp4")
    with open(original, "wb") as f:
        subprocess.run(["git", "-C", ROOT, "show", f"{SOURCE_COMMIT}:{path}"], stdout=f, check=True)

    # 1-2: even half-speed timeline (high quality intermediate).
    even = os.path.join(work, name + "-even.mp4")
    run("-i", original, "-vf", f"setpts={SOURCE_TIME},{INTERPOLATE},setpts=2*PTS", "-r", str(FPS),
        "-c:v", "libx264", "-crf", "10", "-preset", "medium", "-pix_fmt", "yuv420p", even)

    # 3: shots joined with dissolves, then the loop dissolve.
    filt = [f"[0:v]split={len(SHOTS)}" + "".join(f"[in{i}]" for i in range(len(SHOTS)))]
    for i, (a, b) in enumerate(SHOTS):
        filt.append(f"[in{i}]trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS,fps={FPS},settb=1/{FPS}[s{i}]")
    cur, total = "s0", (SHOTS[0][1] - SHOTS[0][0]) / FPS
    for i in range(1, len(SHOTS)):
        filt.append(f"[{cur}][s{i}]xfade=transition=fade:duration={CUT_DISSOLVE}:offset={total - CUT_DISSOLVE:.4f}[j{i}]")
        cur, total = f"j{i}", total + (SHOTS[i][1] - SHOTS[i][0]) / FPS - CUT_DISSOLVE
    d = LOOP_DISSOLVE
    filt.append(f"[{cur}]split[la][lb]")
    filt.append(f"[la]trim=start={d},setpts=PTS-STARTPTS[tail]")
    filt.append(f"[lb]trim=duration={d},setpts=PTS-STARTPTS[head]")
    filt.append(f"[tail][head]xfade=transition=fade:duration={d}:offset={total - 2 * d:.4f}[film]")
    length = total - d

    mp4 = os.path.join(OUT, name + ".mp4")
    run("-i", even, "-filter_complex", ";".join(filt), "-map", "[film]", "-an", "-r", str(FPS),
        "-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p", "-crf", "25", "-preset", "slow",
        "-movflags", "+faststart", mp4)
    run("-i", mp4, "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", "-pix_fmt", "yuv420p",
        os.path.join(OUT, name + ".webm"))
    run("-i", mp4, "-frames:v", "1", "-q:v", "3", os.path.join(OUT, name + "-poster.jpg"))
    print(name, "length", round(length, 2), "s")


with tempfile.TemporaryDirectory() as work:
    for name, path in FILMS.items():
        build(name, path, work)
