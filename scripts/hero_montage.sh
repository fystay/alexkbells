#!/usr/bin/env bash
# Cuts the fast hero film from the owner's phone clips (2026-10-22).
# Usage: scripts/hero_montage.sh <dir with c1..c12 clips> <out dir>
# Each shot is 1.0 s: "clip@start". Landscape crop of the vertical footage at
# 58% height (same focal point as before), warmed slightly, 30 fps, silent.
# Shots were chosen to avoid third-party signage and people lying down.
set -euo pipefail
SRC=$1; OUT=$2
# "clip@start[:crop height %]". c12 has small signage near the top, so it is cropped lower.
SHOTS=(c7@0.5 c8@1.0 c12@3.0:0.72 c7@5.5 c8@3.5 c8@6.0 c12@12.0:0.72 c7@2.5 c7@8.5 c12@20.0:0.72)
DUR=1.0
args=(); filt=""; i=0
for s in "${SHOTS[@]}"; do
  c=${s%@*}; rest=${s#*@}; t=${rest%%:*}; pos=0.58; [[ $rest == *:* ]] && pos=${rest#*:}
  f=$(ls "$SRC"/$c.* | head -1)
  args+=(-ss "$t" -t "$DUR" -i "$f")
  filt+="[$i:v]fps=30,crop=iw:iw/2:0:(ih-iw/2)*$pos,scale=960:480:flags=lanczos,setsar=1,eq=brightness=0.05:contrast=1.06:saturation=1.05[v$i];"
  i=$((i+1))
done
for ((k=0;k<i;k++)); do filt+="[v$k]"; done
filt+="concat=n=$i:v=1:a=0[out]"
ffmpeg -v error -y "${args[@]}" -filter_complex "$filt" -map "[out]" -an -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -crf 26 -preset slow -movflags +faststart "$OUT/hero.mp4"
ffmpeg -v error -y "${args[@]}" -filter_complex "$filt" -map "[out]" -an -c:v libvpx-vp9 -b:v 0 -crf 36 -pix_fmt yuv420p "$OUT/hero.webm"
ffmpeg -v error -y -i "$OUT/hero.mp4" -frames:v 1 -q:v 3 "$OUT/hero-poster.jpg"
