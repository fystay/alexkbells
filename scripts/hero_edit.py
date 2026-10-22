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
# edit of several people; shots stay inside its own cuts (1.5, 3.0, 4.75,
# 6.0, 7.0, 8.25 s). Order (owner, 2026-10-22): the group shot opens the film,
# then only close-ups of individuals.
# seg: [(source seconds, speed)] - speed < 1 is slow motion, > 1 speeds up.
# push: extra zoom over the shot. out: how it leaves ("cut", "left", "right").
# land: crop position of the landscape slice; port/pz/px: portrait crop position, zoom and
# horizontal position (px=0 keeps c8's wall banner, at the right, out of frame).
# only: use the shot in one version (c8 is too narrow a slice for the landscape cut).
SHOTS = [
    dict(c="c7", t=0.57, seg=[(2.3, 1.0)], push=0.07, out="cut", land=0.58, port=0.5, pz=1.0),          # the class together: opens the film (group shots only here)
    dict(c="c5", t=3.0, seg=[(0.35, 1.0), (0.45, 0.5)], push=0.06, out="left", land=0.25, port=0.0, pz=1.3),  # swing to the top, slow at the float
    dict(c="c5", t=4.75, seg=[(0.65, 1.0), (0.5, 0.6)], push=0.10, out="cut", land=0.2, port=0.0, pz=1.3),   # bell up to the chest, hold
    dict(c="c8", t=8.4, seg=[(0.5, 1.4), (0.55, 0.5)], push=0.06, out="right", port=0.35, px=0.0, pz=1.6, only="portrait"),  # press drives up fast, slow lockout
    dict(c="c5", t=4.0, seg=[(0.4, 1.0), (0.35, 0.5)], push=0.06, out="right", land=0.3, only="landscape"),  # swing, slow at the top
    dict(c="c5", t=1.5, seg=[(0.5, 1.0), (0.3, 0.6)], push=0.06, out="left", port=0.0, px=0.0, pz=1.3, only="portrait"),    # swing, slow at the top
    dict(c="c5", t=8.25, seg=[(0.65, 1.0), (0.5, 0.55)], push=0.08, out="cut", land=0.5, port=0.0, px=0.0, pz=1.3),  # squat, slow at the bottom
    dict(c="c8", t=6.25, seg=[(0.5, 1.3), (0.4, 0.55)], push=0.06, out="right", port=0.8, px=0.0, pz=1.6, only="portrait"),  # swing into the rack
    dict(c="c5", t=6.0, seg=[(0.35, 1.0), (0.35, 0.6)], push=0.10, out="cut", land=0.2, port=0.0, pz=1.3),    # close-up, effort
    dict(c="c8", t=14.5, seg=[(0.4, 1.3), (0.7, 0.55)], push=0.05, out="cut", port=0.45, px=0.0, pz=1.6, only="portrait"),  # overhead press lockout
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
    SH = [s for s in SHOTS if s.get("only", orient) == orient]
    args, filt, lens = [], [], []
    for i, s in enumerate(SH):
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
            zoom = s.get("pz", 1.0)
            crop = f"crop=iw/{zoom}:iw/{zoom}*16/9:(iw-iw/{zoom})*{s.get('px', 0.5)}:(ih-iw/{zoom}*16/9)*{s['port']}"
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
        if i > 0 and SH[i - 1]["out"] in ("left", "right"):
            blur.append(f"gblur=sigma=18:sigmaV=0.01:enable='lte(t,{XF})'")
        chain = ",".join(
            [f"fps={FPS}", f"trim=duration={out_len}", "setpts=PTS-STARTPTS", crop, f"scale={W}:{H}:flags=lanczos", zoomf, "unsharp=5:5:0.6", "setsar=1", GRADE] + blur
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
