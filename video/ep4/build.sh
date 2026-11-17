#!/usr/bin/env bash
# Gera o episódio 4 completo: eventos → trilha → quadros → MP4 (falas só em legenda).
# Uso: ep4/build.sh [pasta-temporária]   (padrão: ./.build-ep4)
# Precisa de: Node + Playwright, ffmpeg e Python com numpy e scipy.
python3 ep4/tools/audio.py "$TMP/events.json" "$TMP/audio.wav"   # acrescente --vozes=arquivo.wav para mixar as falas
node tools/render.mjs "$TMP/frames" "$(nproc)"
ffmpeg -hide_banner -loglevel error -y -i "$TMP/audio.wav" -c:a aac -b:a 192k ep4/despertar-ep4.m4a
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "$TMP/frames/f%05d.jpg" -i "$TMP/audio.wav" \
  -vf "scale=in_color_matrix=bt601:in_range=full:out_color_matrix=bt709:out_range=tv,noise=c0s=3:c0f=t+u,format=yuv420p" \
  -c:v libx264 -preset slow -crf 21 -profile:v high -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv \
  -c:a aac -b:a 256k -movflags +faststart -shortest ep4/despertar-ep4.mp4
ls -la ep4/despertar-ep4.mp4
