#!/bin/bash
# Legt "Folgen"-Hinweis (Mitte des Videos) und "Liken & Folgen"-Endkarte (letzte 4 s) über ein fertiges Video
# Nutzung: bash abo/abo.sh eingabe.mp4 ausgabe.mp4   (optional Y_END=950 für andere Höhe der Endkarte)
set -e; D="$(dirname "$0")"; IN="$1"; OUT="$2"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
M=$(python3 -c "print(round($DUR*0.45,2))"); E=$(python3 -c "print(round($DUR-4,2))")
ffmpeg -y -v error -i "$IN" -loop 1 -i "$D/mid.png" -loop 1 -i "$D/end.png" -filter_complex "\
[1]format=rgba,fade=in:st=$M:d=0.25:alpha=1,fade=out:st=$(python3 -c "print($M+2.4)"):d=0.3:alpha=1[m];\
[2]format=rgba,fade=in:st=$E:d=0.3:alpha=1[e];\
[0][m]overlay=x=0:y='230-60*pow(max(0,1-(t-$M)/0.3),2)':enable='between(t,$M,$M+2.7)':shortest=1[v1];\
[v1][e]overlay=x=0:y='${Y_END:-1130}+90*pow(max(0,1-(t-$E)/0.35),2)':enable='gte(t,$E)':shortest=1[v]" \
 -map "[v]" -map 0:a -c:v libx264 -preset slow -b:v 7000k -maxrate 9000k -bufsize 14000k -profile:v high -level 4.1 -pix_fmt yuv420p -c:a copy -movflags +faststart "$OUT"
echo "$OUT $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")"
