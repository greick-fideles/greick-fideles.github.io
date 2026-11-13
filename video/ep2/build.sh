#!/usr/bin/env bash
# Gera o episódio 2 completo: eventos → vozes → trilha → quadros → MP4.
# Uso: KOKORO_DIR=pasta-dos-modelos ep2/build.sh [pasta-temporária]   (padrão: ./.build-ep2)
# Precisa de: Node + Playwright, ffmpeg, Python com numpy, scipy, kokoro-onnx e praat-parselmouth,
# e dos arquivos kokoro-v1.0.onnx e voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx, "model-files-v1.0").
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="${1:-.build-ep2}"
mkdir -p "$TMP"
export FILM=ep2/film.html
node tools/events.mjs "$TMP/events.json"
python3 ep2/tools/voices.py "$TMP/events.json" "$KOKORO_DIR/kokoro-v1.0.onnx" "$KOKORO_DIR/voices-v1.0.bin" "$TMP/vozes.wav"
python3 ep2/tools/audio.py "$TMP/events.json" "$TMP/audio.wav" --vozes="$TMP/vozes.wav"
node tools/render.mjs "$TMP/frames" "$(nproc)"
ffmpeg -hide_banner -loglevel error -y -i "$TMP/audio.wav" -c:a aac -b:a 192k ep2/despertar-ep2.m4a
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "$TMP/frames/f%05d.jpg" -i "$TMP/audio.wav" \
  -vf "scale=in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=tv,noise=c0s=3:c0f=t+u,format=yuv420p" \
  -c:v libx264 -preset slow -crf 21 -profile:v high -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -c:a aac -b:a 256k -movflags +faststart -shortest ep2/despertar-ep2.mp4
ls -la ep2/despertar-ep2.mp4
