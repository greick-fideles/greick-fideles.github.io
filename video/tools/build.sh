#!/usr/bin/env bash
# Gera o vídeo completo: eventos → trilha → quadros → MP4.
# Uso: [PIPER_VOZ=modelo.onnx] tools/build.sh [pasta-temporária]   (padrão: ./.build)
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="${1:-.build}"
mkdir -p "$TMP"
node tools/events.mjs "$TMP/events.json"
# vozes dos pensamentos: precisa do Piper (pip install piper-tts) e de um modelo de voz pt-BR,
# por exemplo pt_BR-faber-medium.onnx (+ .onnx.json) de huggingface.co/rhasspy/piper-voices
if [ -n "${PIPER_VOZ:-}" ]; then
  python3 tools/voices.py "$TMP/events.json" "$PIPER_VOZ" "$TMP/vozes.wav"
  python3 tools/audio.py "$TMP/events.json" "$TMP/despertar.wav" --vozes="$TMP/vozes.wav"
else
  python3 tools/audio.py "$TMP/events.json" "$TMP/despertar.wav"
fi
node tools/render.mjs "$TMP/frames" "$(nproc)"
ffmpeg -hide_banner -loglevel error -y -i "$TMP/despertar.wav" -c:a aac -b:a 192k despertar.m4a
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "$TMP/frames/f%05d.jpg" -i "$TMP/despertar.wav" \
  -vf "scale=in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=tv,noise=c0s=3:c0f=t+u,format=yuv420p" \
  -c:v libx264 -preset slow -crf 21 -profile:v high -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -c:a aac -b:a 256k -movflags +faststart -shortest despertar.mp4
ls -la despertar.mp4
