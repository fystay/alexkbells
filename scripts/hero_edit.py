"""Cuts RAENG's hero film from Alex's phone clips in the style of the JD Gyms
hero (owner's reference, 2026-10-22): varied rhythm (quick 0.3-0.4 s hits and
held ~1 s beats), slow motion at the moment of effort, a speed-up into each
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
SHOTS = [
    dict(c="c7", t=0.5, seg=[(0.7, 1.0)], push=0.06, out="cut", land=0.58, port=0.5),
    dict(c="c5", t=3.0, seg=[(0.4, 1.0)], push=0.0, out="left", land=0.02, port=0.0),
    dict(c="c5", t=4.7, seg=[(0.35, 1.0), (0.35, 0.45)], push=0.10, out="cut", land=0.02, port=0.0),
    dict(c="c8", t=1.0, seg=[(0.45, 1.0)], push=0.0, out="right", land=0.58, port=1.0),
    dict(c="c7", t=5.5, seg=[(0.15, 1.0), (0.4, 0.4)], push=0.05, out="cut", land=0.58, port=0.5),
    dict(c="c5", t=6.0, seg=[(0.35, 1.0)], push=0.0, out="left", land=0.32, port=0.2),
    dict(c="c8", t=3.5, seg=[(0.5, 2.0), (0.3, 0.5)], push=0.08, out="cut", land=0.58, port=1.0),
    dict(c="c7", t=2.5, seg=[(0.6, 1.0)], push=0.06, out="right", land=0.58, port=0.5),
    dict(c="c8", t=6.0, seg=[(0.45, 0.5)], push=0.10, out="cut", land=0.58, port=1.0),
    dict(c="c7", t=4.0, seg=[(0.4, 1.0)], push=0.0, out="left", land=0.58, port=0.5),
    dict(c="c5", t=3.3, seg=[(0.3, 1.0), (0.3, 0.5)], push=0.08, out="cut", land=0.02, port=0.0),
    dict(c="c7", t=8.5, seg=[(0.55, 1.0)], push=0.05, out="cut", land=0.58, port=0.5),
]

GRADE = (
    "curves=all='0/0 0.2/0.14 0.55/0.62 1/1',eq=gamma=1.3:saturation=1.2,"
    "colorbalance=rs=-0.04:bs=0.05,format=yuv420p,"
    "geq=lum='lum(X\\,Y)*(1-0.4*min(max((Y/H-0.45)/0.55\\,0)\\,1))':cb='cb(X\\,Y)':cr='cr(X\\,Y)'"
)


def clip(name: str) -> str:
    return sorted(p for p in glob.glob(os.path.join(SRC, name + ".*")) if not p.endswith(".png"))[0]


def build(orient: str) -> None:
    W, H = (540, 960) if orient == "portrait" else (960, 480)
    name = "hero-portrait" if orient == "portrait" else "hero"
    args, filt, lens = [], [], []
    for i, s in enumerate(SHOTS):
        src_total = sum(d for d, _ in s["seg"])
        args += ["-ss", str(s["t"]), "-t", str(round(src_total + 0.3, 3)), "-i", clip(s["c"])]
        # Speed segments: trim each piece of source time, retime it, join.
        pieces, at = [], 0.0
        n = len(s["seg"])
        if n > 1:
            filt.append(f"[{i}:v]split={n}" + "".join(f"[in{i}_{k}]" for k in range(n)))
        for k, (d, sp) in enumerate(s["seg"]):
            src = f"[in{i}_{k}]" if n > 1 else f"[{i}:v]"
            filt.append(f"{src}trim=start={at}:duration={d},setpts=(PTS-STARTPTS)/{sp}[s{i}p{k}]")
            pieces.append(f"[s{i}p{k}]")
            at += d
        out_len = round(sum(d / sp for d, sp in s["seg"]), 3)
        lens.append(out_len)
        if orient == "portrait":
            zoom = 1.3 if s["c"] in ("c5",) else (1.45 if s["c"] == "c8" else 1.0)
            crop = f"crop=iw/{zoom}:iw/{zoom}*16/9:(iw-iw/{zoom})/2:(ih-iw/{zoom}*16/9)*{s['port']}"
        else:
            crop = f"crop=iw:iw/2:0:(ih-iw/2)*{s['land']}"
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
        if i > 0 and SHOTS[i - 1]["out"] in ("left", "right"):
            blur.append(f"gblur=sigma=18:sigmaV=0.01:enable='lte(t,{XF})'")
        chain = ",".join(
            [f"fps={FPS}", f"trim=duration={out_len}", "setpts=PTS-STARTPTS", crop, f"scale={W}:{H}:flags=lanczos", zoomf, "unsharp=5:5:0.6", "setsar=1", GRADE] + blur
        )
        filt.append(f"{''.join(pieces)}concat=n={len(pieces)}:v=1:a=0,{chain},format=yuv420p,settb=AVTB[v{i}]")

    cur, total = "v0", lens[0]
    for i in range(1, len(SHOTS)):
        how = SHOTS[i - 1]["out"]
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
