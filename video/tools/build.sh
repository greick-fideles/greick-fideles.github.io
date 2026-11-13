#!/usr/bin/env bash
# Gera o vídeo completo: eventos → trilha → quadros → MP4.
# Uso: tools/build.sh [pasta-temporária]   (padrão: ./.build)
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="${1:-.build}"
mkdir -p "$TMP"
node tools/events.mjs "$TMP/events.json"
python3 tools/audio.py "$TMP/events.json" "$TMP/despertar.wav"
node tools/render.mjs "$TMP/frames" "$(nproc)"
ffmpeg -hide_banner -loglevel error -y -i "$TMP/despertar.wav" -c:a aac -b:a 192k despertar.m4a
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "$TMP/frames/f%05d.jpg" -i "$TMP/despertar.wav" \
  -vf "scale=in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=tv,noise=c0s=3:c0f=t+u,format=yuv420p" \
  -c:v libx264 -preset slow -crf 21 -profile:v high -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -c:a aac -b:a 256k -movflags +faststart -shortest despertar.mp4
ls -la despertar.mp4
