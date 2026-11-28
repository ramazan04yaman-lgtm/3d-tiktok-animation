#!/bin/bash
# Full pipeline (video 08): voice -> plan -> music -> sfx -> frames -> final mp4
# needs: piper voice model (de_DE-thorsten-high.onnx), three@0.160.0, playwright
set -e
cd "$(dirname "$0")"; VOICE=${VOICE:?path to de_DE-thorsten-high.onnx}; FR=${FRAMES:-build/frames}
python3 tts.py "$VOICE" build && python3 plan.py && python3 music.py && python3 sfx.py
for w in 0 1 2 3; do node render.js "$FR" 1080 30 $w 4 & done; wait
ffmpeg -y -framerate 30 -pattern_type glob -i "$FR/*.jpg" -i build/voice.wav -i build/music.wav -i build/sfx.wav \
 -filter_complex "[1:a]aresample=44100,highpass=f=90,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=3.5,acompressor=threshold=-20dB:ratio=3.5:attack=5:release=120,volume=1.8,pan=stereo|c0=c0|c1=c0,asplit=2[v1][vs];[2:a]volume=0.20[m];[m][vs]sidechaincompress=threshold=0.04:ratio=6:attack=20:release=350[md];[3:a]volume=0.55[fx];[md][fx][v1]amix=inputs=3:normalize=0,alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=9[a]" \
 -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -r 30 -c:a aac -b:a 256k -ar 44100 -t "$(python3 -c "import json;print(json.load(open('build/plan.json'))['duration'])")" -movflags +faststart taschenuhr_gallipoli.mp4
