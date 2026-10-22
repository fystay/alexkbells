#!/usr/bin/env bash
# Cuts the fast hero film from the owner's phone clips (2026-10-22), in the
# style of a gym-chain hero: short shots, whip/blur transitions, a few slow-mo
# shots for impact. Usage: scripts/hero_montage.sh <dir with c1..c12 clips> <out dir>
# Landscape crop of the vertical footage, slightly warmed, 30 fps, silent.
# With ORIENT=portrait it cuts the phone version instead (9:16, zoomed in and
# cropped low in the frame to keep signage out): hero-portrait.{mp4,webm,jpg}.
# Shots avoid third-party signage and people lying down (checked by eye).
set -euo pipefail
SRC=$1; OUT=$2
ORIENT=${ORIENT:-landscape}
# "clip@start[:crop height %][*speed]". c12 has small signage near the top, so it is cropped lower.
[[ $ORIENT == portrait ]] && SHOTS=(c7@0.5 c8@1.0 c7@5.5*0.6 c8@3.5 c7@2.5 c8@6.0*0.6 c7@10.0 c8@9.0 c7@12.0 c8@12.0*0.6 c7@8.0 c8@15.0) || \
SHOTS=(c7@0.5 c8@1.0 c12@3.0:0.72 c7@5.5*0.6 c8@3.5 c12@12.0:0.72*1.4 c7@2.5 c8@6.0*0.6 c12@6.0:0.72 c7@10.0 c12@20.0:0.72 c7@8.0*0.6)
TRANS=(hblur zoomin smoothleft hblur fadegrays hblur zoomin smoothleft hblur zoomin hblur)
OUTLEN=0.85   # seconds each shot lasts in the film
XF=0.15       # transition length
args=(); filt=""; i=0
if [[ $ORIENT == portrait ]]; then SIZE=540:960; NAME=hero-portrait; else SIZE=960:480; NAME=hero; fi
for s in "${SHOTS[@]}"; do
  c=${s%%@*}; rest=${s#*@}
  speed=1; [[ $rest == *"*"* ]] && speed=${rest#*\*} && rest=${rest%\**}
  pos=0.58; [[ $ORIENT == portrait ]] && pos=0.85
  [[ $rest == *:* ]] && pos=${rest#*:} && rest=${rest%%:*}
  [[ $ORIENT == portrait && $c != c7 ]] && pos=1
  t=$rest
  dur=$(python3 -c "print(round($OUTLEN*$speed+0.2,3))")
  f=$(ls "$SRC"/$c.* | head -1)
  if [[ $ORIENT == portrait ]]; then CROP="crop=iw/1.45:iw/1.45*16/9:(iw-iw/1.45)/2:(ih-iw/1.45*16/9)*$pos"; else CROP="crop=iw:iw/2:0:(ih-iw/2)*$pos"; fi
  args+=(-ss "$t" -t "$dur" -i "$f")
  filt+="[$i:v]setpts=(PTS-STARTPTS)/$speed,fps=30,trim=duration=$OUTLEN,setpts=PTS-STARTPTS,$CROP,scale=$SIZE:flags=lanczos,setsar=1,eq=brightness=0.05:contrast=1.06:saturation=1.05,format=yuv420p[v$i];"
  i=$((i+1))
done
cur="v0"; len=$OUTLEN
for ((k=1;k<i;k++)); do
  off=$(python3 -c "print(round($len-$XF,3))")
  filt+="[$cur][v$k]xfade=transition=${TRANS[$((k-1))]}:duration=$XF:offset=$off[x$k];"
  cur="x$k"; len=$(python3 -c "print(round($len+$OUTLEN-$XF,3))")
done
filt=${filt%;}
ffmpeg -v error -y "${args[@]}" -filter_complex "$filt" -map "[$cur]" -an -r 30 -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -crf 26 -preset slow -movflags +faststart "$OUT/$NAME.mp4"
ffmpeg -v error -y -i "$OUT/$NAME.mp4" -an -c:v libvpx-vp9 -b:v 0 -crf 36 -pix_fmt yuv420p "$OUT/$NAME.webm"
ffmpeg -v error -y -i "$OUT/$NAME.mp4" -frames:v 1 -q:v 3 "$OUT/$NAME-poster.jpg"
