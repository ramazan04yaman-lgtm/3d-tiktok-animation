#!/usr/bin/env bash
# Komplette Pipeline: Voice-over -> Audio-Mix -> 3D-Render -> MP4
# Voraussetzung: pip install piper-tts faster-whisper scipy; npm i (im Repo-Root); Piper-Stimme de_DE-thorsten-high.onnx
set -e
cd "$(dirname "$0")"
VOICE=${VOICE:-de_DE-thorsten-high.onnx}
HF_HUB_DISABLE_XET=1 python3 voice.py "$VOICE" build
python3 audio.py
WORKERS=${WORKERS:-2} PR=${PR:-0.6} node render.js
ffmpeg -y -v error -framerate 30 -i build/frames/%05d.jpg -i build/mix.wav \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart ../eisbaer_tiktok.mp4
echo "fertig: eisbaer_tiktok.mp4"
