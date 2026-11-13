#!/usr/bin/env bash
# Gera o episódio 2 completo: eventos → trilha → quadros → MP4 (falas só em legenda).
# Uso: ep2/build.sh [pasta-temporária]   (padrão: ./.build-ep2)
# Precisa de: Node + Playwright, ffmpeg e Python com numpy e scipy.
# Para a versão com as falas em voz: KOKORO_DIR=pasta-dos-modelos ep2/build.sh — aí precisa também de
# kokoro-onnx e praat-parselmouth, e de kokoro-v1.0.onnx e voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx).
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="${1:-.build-ep2}"
mkdir -p "$TMP"
export FILM=ep2/film.html
node tools/events.mjs "$TMP/events.json"
if [ -n "${KOKORO_DIR:-}" ]; then   # com as falas em voz (acrescente --fundo em voices.py para os sussurros)
  python3 ep2/tools/voices.py "$TMP/events.json" "$KOKORO_DIR/kokoro-v1.0.onnx" "$KOKORO_DIR/voices-v1.0.bin" "$TMP/vozes.wav"
  python3 ep2/tools/audio.py "$TMP/events.json" "$TMP/audio.wav" --vozes="$TMP/vozes.wav"
else                                # padrão: só trilha e legendas
  python3 ep2/tools/audio.py "$TMP/events.json" "$TMP/audio.wav"
fi
node tools/render.mjs "$TMP/frames" "$(nproc)"
ffmpeg -hide_banner -loglevel error -y -i "$TMP/audio.wav" -c:a aac -b:a 192k ep2/despertar-ep2.m4a
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "$TMP/frames/f%05d.jpg" -i "$TMP/audio.wav" \
  -vf "scale=in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=tv,noise=c0s=3:c0f=t+u,format=yuv420p" \
  -c:v libx264 -preset slow -crf 21 -profile:v high -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -c:a aac -b:a 256k -movflags +faststart -shortest ep2/despertar-ep2.mp4
ls -la ep2/despertar-ep2.mp4
