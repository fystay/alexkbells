"""Cuts RAENG's hero film from Alex's phone clips in the style of the JD Gyms
hero (owner's reference, 2026-10-22): each shot one whole movement cut at its natural
end (about 1-2 s each), slow motion at the moment of effort, a speed-up into each
whip, whip-pan swipes left/right between clips with motion blur, hard cuts
elsewhere, and slow push-in zooms on close-ups.

Usage:
  python3 scripts/hero_edit.py <dir with c1..c12 clips> <out dir> [portrait|landscape|both]

Writes hero.{mp4,webm} + hero-poster.jpg (landscape, desktop) and
hero-portrait.{mp4,webm} + hero-portrait-poster.jpg (9:16, phones).

The clips are vertical phone footage, 464-576 px wide. Every shot below was
checked on frame sheets: faces in frame, no third-party signage, nobody lying
down. The grade is the owner's pick C (lifted, contrasty, slightly cool) with
the lower part of each frame darkened so the white hero text stays readable.
"""
import glob
import os
import subprocess
import sys

SRC, OUT = sys.argv[1], sys.argv[2]
WHICH = sys.argv[3] if len(sys.argv) > 3 else "both"
FPS = 30
XF = 0.16  # whip length

# Each shot: clip, start (s, source time), speed segments [(source seconds, speed)],
# push-in (extra zoom over the shot), how it leaves ("cut", "left", "right"),
# crop position for the landscape slice and for the portrait crop.
# Each shot is one whole movement, cut at its natural end (the lockout, the
# top of the swing, the bell arriving at the chest), found from the clips'
# motion (pauses) and checked on timestamped frame sheets. c5 is itself an
# edit of several people; shots stay inside its own cuts, measured frame by
# frame (2026-10-23): 1.383, 2.917, 4.833, 6.067, 7.183, 8.317, 9.817 s. A shot
# that starts even a few frames before a cut flashes the previous person. Order (owner, 2026-10-22): the group shot opens the film,
# then only close-ups of individuals.
# seg: [(source seconds, speed)] - speed < 1 is slow motion, > 1 speeds up.
# push: extra zoom over the shot. out: how it leaves ("cut", "left", "right").
# land: crop position of the landscape slice; port/pz/px: portrait crop position, zoom and
# horizontal position (px=0 keeps c8's wall banner, at the right, out of frame).
# only: use the shot in one version. track=False (track_land=False: wide cut only): fixed crop instead of following
# the face. c8 (the shirtless lifter) is no longer used: his head leaves the
# frame and the gym's wall banner shows whenever it is in; c4 (blue top) has a
# small wall logo at head height in every usable moment, so it is not used either.
# The film is lengthened by fuller movements and more slow motion instead.
# c12 (green tee, 2026-10-23): only the snatch lockout is used, phone cut, tight
# on him; every other moment has the gym's APEX banners right behind him. c1 and
# c3 show the banners throughout, so they are not used.
SHOTS = [
    dict(c="c7", t=0.5, seg=[(0.7, 0.45), (0.65, 1.0), (1.5, 1.0), (0.85, 0.45), (0.3, 1.0)], push=0.07, out="cut", port=0.5, pz=1.0, track=False, only="portrait"),
    dict(c="c7", t=0.5, seg=[(0.7, 0.45), (0.65, 1.0), (1.5, 1.0), (0.85, 0.45), (0.3, 1.0)], push=0.07, out="cut", land=0.58, track=False, only="landscape"),  # the class together: opens the film (group shots only here)
    dict(c="c5", t=4.85, seg=[(0.68, 1.0), (0.5, 0.42)], push=0.10, out="cut", land=0.2, port=0.0, pz=1.3),   # white tee: bell up to the chest, hold
    dict(c="c5", t=3.0, seg=[(0.5, 1.0), (0.5, 0.42)], push=0.06, out="left", port=0.0, pz=1.3, only="portrait"),  # teal: swing to the top, slow at the float (too fast to follow in the wide crop)
    dict(c="c12", t=3.2, seg=[(0.4, 1.3), (1.0, 0.4)], push=0.06, out="right", port=0.33, px=0.5, pz=2.1, track=False, only="portrait"),  # green tee: snatch, fast punch-through, slow lockout overhead (starts after the pull, when the banner behind him is out of the crop)
    dict(c="c5", t=4.0, seg=[(0.45, 1.0), (0.3, 0.38)], push=0.06, out="cut", land=0.3, port=0.0, pz=1.3),  # orange: swing, slow at the top
    dict(c="c6", t=8.9, seg=[(1.15, 1.0)], push=0.12, out="cut", port=0.2, px=0.55, pz=1.4, track=False, only="portrait"),  # woman: bell to the chest, then the goblet squat to the bottom, at real speed with a slow push-in (c6 is 30 fps, so slow motion stutters; fixed crop, a little right of centre, so the wall sign at the left stays out of frame; c6 cuts to another group at 10.1 s, so the shot ends just before it)
    dict(c="c5", t=8.33, seg=[(0.83, 1.0), (0.6, 0.45)], push=0.08, out="right", port=0.0, px=0.0, pz=1.3, track=False, only="portrait"),  # green: squat, slow at the bottom (fixed crop: the tracker drifts to the background)
    dict(c="c5", t=8.55, seg=[(0.5, 1.0), (0.6, 0.4)], push=0.08, out="right", land=0.44, track=False, only="landscape"),  # green, wide cut: starts in the squat so his head stays in the slice and the wall sign stays out
    dict(c="c5", t=6.08, seg=[(0.5, 1.0), (0.45, 0.5)], push=0.10, out="cut", port=0.0, pz=1.3, aim=0.48, only="portrait"),  # red: close-up, effort
    dict(c="c5", t=6.08, seg=[(0.3, 1.0), (0.3, 0.4)], push=0.08, out="cut", land=0.05, track=False, only="landscape"),  # red close-up, wide cut: ends before he bends out of the slice
]


GRADE = (
    "curves=all='0/0 0.2/0.14 0.55/0.62 1/1',eq=gamma=1.3:saturation=1.2,"
    "colorbalance=rs=-0.04:bs=0.05,format=yuv420p,"
    "geq=lum='lum(X\\,Y)*(1-0.4*min(max((Y/H-0.45)/0.55\\,0)\\,1))':cb='cb(X\\,Y)':cr='cr(X\\,Y)'"
)


def track_face(path: str, start: float, dur: float, step: float = 0.08):
    """Centre (x, y) of the main person's face over [start, start+dur), in source
    pixels, every `step` seconds (source time relative to `start`). The main
    person is the largest face first seen, then the face nearest to it each
    frame; gaps are interpolated and the track is smoothed. None if no face."""
    import cv2  # only needed to rebuild the film
    import numpy as np

    data = cv2.data.haarcascades
    cascades = [cv2.CascadeClassifier(data + n) for n in ("haarcascade_frontalface_default.xml", "haarcascade_profileface.xml")]
    cap = cv2.VideoCapture(path)
    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    times = list(np.arange(0, dur, step))
    pts, prev = [], None
    for t in times:
        cap.set(cv2.CAP_PROP_POS_MSEC, (start + t) * 1000)
        ok, frame = cap.read()
        if not ok:
            pts.append(None)
            continue
        g = cv2.equalizeHist(cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), None, fx=2, fy=2))
        found = [tuple(v / 2 for v in r) for c in cascades for r in c.detectMultiScale(g, 1.1, 5, minSize=(40, 40))]
        centres = [(x + w / 2, y + h / 2, w * h) for x, y, w, h in found]
        if not centres:
            pts.append(None)
            continue
        if prev is None:
            best = max(centres, key=lambda c: c[2])
        else:
            best = min(centres, key=lambda c: (c[0] - prev[0]) ** 2 + (c[1] - prev[1]) ** 2)
            if ((best[0] - prev[0]) ** 2 + (best[1] - prev[1]) ** 2) ** 0.5 > 0.3 * width:
                pts.append(None)
                continue
        prev = best
        pts.append(best[:2])
    known = [i for i, p in enumerate(pts) if p]
    if len(known) < max(2, len(pts) // 4):
        return None
    xs = np.interp(range(len(pts)), known, [pts[i][0] for i in known])
    ys = np.interp(range(len(pts)), known, [pts[i][1] for i in known])
    k = np.ones(5) / 5
    ys = np.convolve(np.pad(ys, 2, mode="edge"), k, mode="valid")
    xs = np.convolve(np.pad(xs, 2, mode="edge"), k, mode="valid")
    return list(zip(times, xs, ys))


def follow(track, value, lo: float, hi: float) -> str:
    """An ffmpeg expression in t that moves linearly between the track's
    keyframes (value(x, y) gives the crop offset), clamped to [lo, hi]."""
    keys = [(t, min(max(value(x, y), lo), hi)) for t, x, y in track[::2]]
    expr = f"{keys[-1][1]:.1f}"
    for (t0, v0), (t1, v1) in reversed(list(zip(keys, keys[1:]))):
        expr = f"if(lt(t\\,{t1:.2f})\\,{v0:.1f}+({v1 - v0:.1f})*(t-{t0:.2f})/{t1 - t0:.2f}\\,{expr})"
    return f"if(lt(t\\,{keys[0][0]:.2f})\\,{keys[0][1]:.1f}\\,{expr})"


def size(path: str) -> tuple[int, int]:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                          "-of", "csv=p=0", path], capture_output=True, text=True, check=True).stdout
    w, h = out.strip().split(",")[:2]
    return int(w), int(h)


def clip(name: str) -> str:
    return sorted(p for p in glob.glob(os.path.join(SRC, name + ".*")) if not p.endswith(".png"))[0]


def build(orient: str) -> None:
    W, H = (540, 960) if orient == "portrait" else (960, 480)
    name = "hero-portrait" if orient == "portrait" else "hero"
    SH = [s for s in SHOTS if s.get("only", orient) == orient]
    args, filt, lens = [], [], []
    for i, s in enumerate(SH):
        src_total = sum(d for d, _ in s["seg"])
        args += ["-ss", str(s["t"]), "-t", str(round(src_total + 0.3, 3)), "-i", clip(s["c"])]
        # The crop follows the main person's face (face tracking), so heads are
        # never cut off; it is applied before retiming, in source time.
        path = clip(s["c"])
        SW, SH_ = size(path)
        if orient == "portrait":
            zoom = s.get("pz", 1.0)
            cw, ch = SW / zoom, SW / zoom * 16 / 9
            cx = (SW - cw) * s.get("px", 0.5)
            cy = f"{(SH_ - ch) * s['port']:.1f}"
        else:
            cw, ch, cx = SW, SW / 2, 0
            cy = f"{(SH_ - ch) * s.get('land', 0.3):.1f}"
        use = s.get("track", True) and (orient == "portrait" or s.get("track_land", True))
        tr = track_face(path, s["t"], src_total) if use else None
        if tr:
            # Face centre sits 38% down the frame (aim): headroom above, the lift below.
            aim = s.get("aim", 0.38)
            cy = follow(tr, lambda x, y: y - aim * ch, 0, SH_ - ch)
            if orient == "portrait" and s.get("track_x", True):
                cx_expr = follow(tr, lambda x, y: x - cw / 2, 0, s.get("xmax", SW - cw))
            else:
                cx_expr = f"{cx:.1f}"
        else:
            cx_expr = f"{cx:.1f}"
        crop = f"crop={cw:.0f}:{ch:.0f}:'{cx_expr}':'{cy}'"
        # Speed segments: trim each piece of source time, retime it, join.
        pieces, at = [], 0.0
        n = len(s["seg"])
        if n > 1:
            filt.append(f"[{i}:v]split={n}" + "".join(f"[in{i}_{k}]" for k in range(n)))
        for k, (d, sp) in enumerate(s["seg"]):
            src = f"[in{i}_{k}]" if n > 1 else f"[{i}:v]"
            filt.append(f"{src}trim=start={at}:duration={d},{crop},setpts=(PTS-STARTPTS)/{sp}[s{i}p{k}]")
            pieces.append(f"[s{i}p{k}]")
            at += d
        out_len = round(sum(d / sp for d, sp in s["seg"]), 3)
        lens.append(out_len)
        push = s["push"]
        # Push-in: scale up a little over the shot, then crop back to the frame.
        zoomf = (
            f"scale=w='trunc({W}*(1+{push}*t/{out_len})/2)*2':h='trunc({H}*(1+{push}*t/{out_len})/2)*2':eval=frame:flags=lanczos,crop={W}:{H}"
            if push
            else f"scale={W}:{H}:flags=lanczos"
        )
        # Motion blur on the frames that whip in or out.
        blur = []
        if s["out"] in ("left", "right"):
            blur.append(f"gblur=sigma=18:sigmaV=0.01:enable='gte(t,{out_len - XF})'")
        if i > 0 and SH[i - 1]["out"] in ("left", "right"):
            blur.append(f"gblur=sigma=18:sigmaV=0.01:enable='lte(t,{XF})'")
        chain = ",".join(
            [f"fps={FPS}", f"trim=duration={out_len}", "setpts=PTS-STARTPTS", f"scale={W}:{H}:flags=lanczos", zoomf, "unsharp=5:5:0.6", "setsar=1", GRADE] + blur
        )
        filt.append(f"{''.join(pieces)}concat=n={len(pieces)}:v=1:a=0,{chain},format=yuv420p,settb=AVTB[v{i}]")

    cur, total = "v0", lens[0]
    for i in range(1, len(SH)):
        how = SH[i - 1]["out"]
        if how == "cut":
            filt.append(f"[{cur}][v{i}]concat=n=2:v=1:a=0[j{i}]")
            total += lens[i]
        else:
            tr = "slideleft" if how == "left" else "slideright"
            filt.append(f"[{cur}][v{i}]xfade=transition={tr}:duration={XF}:offset={round(total - XF, 3)}[j{i}]")
            total += lens[i] - XF
        cur = f"j{i}"
    graph = ";".join(filt)
    mp4 = os.path.join(OUT, name + ".mp4")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", *args, "-filter_complex", graph, "-map", f"[{cur}]", "-an", "-r", str(FPS),
         "-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p", "-crf", "25", "-preset", "slow",
         "-movflags", "+faststart", mp4],
        check=True,
    )
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36",
                    "-pix_fmt", "yuv420p", os.path.join(OUT, name + ".webm")], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-frames:v", "1", "-q:v", "3",
                    os.path.join(OUT, name + "-poster.jpg")], check=True)
    print(name, "length", round(total, 2), "s; shots", lens)


for o in (["portrait", "landscape"] if WHICH == "both" else [WHICH]):
    build(o)
