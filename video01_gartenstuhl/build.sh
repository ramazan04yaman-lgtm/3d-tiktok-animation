#!/bin/bash
# Full pipeline: voice -> music -> frames -> final mp4
# needs: piper voice model (de_DE-thorsten-high.onnx), three@0.160.0, playwright
set -e
cd "$(dirname "$0")"; VOICE=${VOICE:?path to de_DE-thorsten-high.onnx}; FR=${FRAMES:-build/frames}
python3 tts.py "$VOICE" build && python3 music.py
for w in 0 1 2 3; do node render.js "$FR" 1080 30 $w 4 & done; wait
ffmpeg -y -framerate 30 -pattern_type glob -i "$FR/*.jpg" -i build/voice.wav -i build/music.wav \
 -filter_complex "[1:a]aresample=44100,highpass=f=80,acompressor=threshold=-18dB:ratio=3,volume=1.6,pan=stereo|c0=c0|c1=c0,asplit=2[v1][vs];[2:a]volume=0.22[m];[m][vs]sidechaincompress=threshold=0.05:ratio=4:release=300[md];[md][v1]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5[a]" \
 -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k -shortest -movflags +faststart lawnchair_larry_final.mp4
