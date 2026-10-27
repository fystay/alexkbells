#!/bin/bash
# Cut the /coaching explainer loops from the cleaned class clip (see content/media.ts).
#   bash scripts/coaching_clips.sh <cleaned.mp4> public/media/coaching
# Each: 464x400 crop, two-thirds speed, the home film's grade C (scripts/hero_edit.py,
# without the darkened lower part: no words sit on these), 4.6 s with a
# cross-fade from its own tail so it loops seamlessly; MP4, WebM and a poster.
set -e
IN=${1:?cleaned clip}; OUT=${2:?output folder}; mkdir -p "$OUT"; T=$(mktemp -d)
L=4.6; F=0.5            # output loop length and crossfade (seconds, after slow-down)
SRC=$(python3 -c "print(round(($L+$F)/1.5,3))")
GRADE="crop=464:400:0:275,setpts=1.5*PTS,fps=30,scale=640:-2:flags=lanczos,curves=all='0/0 0.2/0.14 0.55/0.62 1/1',eq=gamma=1.3:saturation=1.2,colorbalance=rs=-0.04:bs=0.05,format=yuv420p"
while read name start; do
  ffmpeg -nostdin -v error -y -ss $start -t $SRC -i "$IN" -an -vf "$GRADE" -c:v libx264 -crf 8 -preset veryfast "$T/$name.mp4"
  # tail [L, L+F] fades into head [0, ...] => seamless loop of length L
  ffmpeg -nostdin -v error -y -i "$T/$name.mp4" -filter_complex "[0]split[a][b];[a]trim=$L:$(echo "$L+$F"|bc),setpts=PTS-STARTPTS[t];[b]trim=0:$L,setpts=PTS-STARTPTS[h];[t][h]xfade=transition=fade:duration=$F:offset=0,format=yuv420p[v]" -map "[v]" -c:v libx264 -profile:v high -crf 23 -preset slow -movflags +faststart "$OUT/$name".mp4
  ffmpeg -nostdin -v error -y -i "$OUT/$name".mp4 -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good "$OUT/$name".webm
  ffmpeg -nostdin -v error -y -i "$OUT/$name".mp4 -frames:v 1 -q:v 3 "$OUT/$name"-poster.jpg
done <<LIST
strength 13.4
technique 8.3
movement 0.0
request 20.1
confirm 3.6
together 10.0
LIST
