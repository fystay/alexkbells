#!/usr/bin/env bash
# Cuts the fast hero film from the owner's phone clips (2026-10-22), gym-chain
# style: short shots, whip/blur transitions, a few slow-mo shots, faces in
# frame, one grade, a seamless loop. Usage:
#   scripts/hero_montage.sh <dir with c1..c12 clips> <out dir>
#   ORIENT=portrait scripts/hero_montage.sh ...   # the 9:16 phone cut
# The clips are vertical phone footage (464 or 576 px wide), so the desktop cut
# is a wide slice of them: each shot has its own crop position, chosen so
# faces are in the slice. Shots avoid third-party signage and people lying down
# (checked by eye on frame sheets). The grade is slightly dark so white text sits legibly on the film.
# Shot syntax: clip@start[:crop position 0-1][^zoom (portrait)][*speed]
set -euo pipefail
SRC=$1; OUT=$2
ORIENT=${ORIENT:-landscape}
if [[ $ORIENT == portrait ]]; then
  SIZE=540:960; NAME=hero-portrait
  SHOTS=(c5@3.0:0^1.3 c7@0.5:0.5^1.0 c5@4.7:0^1.3 c5@6.0:0.2^1.3 c8@1.0:1^1.45 c8@3.5:1^1.45 c7@5.5:0.5^1.0*0.6 c7@4.0:0.5^1.0 c7@2.5:0.5^1.0 c8@6.0:1^1.45*0.6)
else
  SIZE=960:480; NAME=hero
  SHOTS=(c7@0.5:0.58 c5@3.0:0.02 c7@6.8:0.58 c5@4.7:0.02 c8@1.0:0.58 c5@6.0:0.32 c7@5.5:0.58*0.6 c8@3.5:0.58 c7@2.5:0.58 c7@4.0:0.58 c8@6.0:0.58*0.6 c7@10.0:0.58)
fi
TRANS=(fade smoothleft zoomin fade hblur smoothleft fade zoomin hblur fade smoothleft fade)
OUTLEN=0.85   # seconds each shot lasts in the film
XF=0.15       # transition length
args=(); filt=""; i=0
n=${#SHOTS[@]}
for ((k=0;k<=n;k++)); do
  s=${SHOTS[$((k % n))]}
  c=${s%%@*}; rest=${s#*@}
  speed=1; [[ $rest == *"*"* ]] && speed=${rest#*\*} && rest=${rest%\**}
  zoom=1; [[ $rest == *"^"* ]] && zoom=${rest#*^} && rest=${rest%%^*}
  pos=0.58; [[ $rest == *:* ]] && pos=${rest#*:} && rest=${rest%%:*}
  t=$rest
  len=$OUTLEN
  if ((k==0)); then t=$(python3 -c "print($t+$XF*$speed)"); fi          # start XF in, so the loop is seamless
  if ((k==n)); then len=$XF; fi                                           # closing shot: the first shot's opening, XF long
  dur=$(python3 -c "print(round($len*$speed+0.2,3))")
  f=$(ls "$SRC"/$c.* | head -1)
  if [[ $ORIENT == portrait ]]; then
    CROP="crop=iw/$zoom:iw/$zoom*16/9:(iw-iw/$zoom)/2:(ih-iw/$zoom*16/9)*$pos"
  else
    CROP="crop=iw:iw/2:0:(ih-iw/2)*$pos"
  fi
  args+=(-ss "$t" -t "$dur" -i "$f")
  filt+="[$i:v]setpts=(PTS-STARTPTS)/$speed,fps=30,trim=duration=$len,setpts=PTS-STARTPTS,$CROP,scale=$SIZE:flags=lanczos,unsharp=5:5:0.6,setsar=1,eq=brightness=-0.07:contrast=1.08:saturation=1.05,format=yuv420p[v$i];"
  i=$((i+1))
done
cur="v0"; total=$OUTLEN
for ((k=1;k<=n;k++)); do
  off=$(python3 -c "print(round($total-$XF,3))")
  filt+="[$cur][v$k]xfade=transition=${TRANS[$(( (k-1) % ${#TRANS[@]} ))]}:duration=$XF:offset=$off[x$k];"
  cur="x$k"
  add=$OUTLEN; ((k==n)) && add=$XF
  total=$(python3 -c "print(round($total+$add-$XF,3))")
done
filt=${filt%;}
ffmpeg -v error -y "${args[@]}" -filter_complex "$filt" -map "[$cur]" -an -r 30 -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -crf 26 -preset slow -movflags +faststart "$OUT/$NAME.mp4"
ffmpeg -v error -y -i "$OUT/$NAME.mp4" -an -c:v libvpx-vp9 -b:v 0 -crf 36 -pix_fmt yuv420p "$OUT/$NAME.webm"
ffmpeg -v error -y -i "$OUT/$NAME.mp4" -frames:v 1 -q:v 3 "$OUT/$NAME-poster.jpg"
