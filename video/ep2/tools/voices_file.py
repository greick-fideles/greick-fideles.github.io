#!/usr/bin/env python3
"""Monta o canal de vozes do episódio 2 a partir de um áudio pronto com as falas dela em sequência.

Uso: python3 ep2/tools/voices_file.py eventos.json falas.wav kokoro-v1.0.onnx voices-v1.0.bin vozes.wav
falas.wav: mono, 48 kHz (ffmpeg -i falas.mp3 -ac 1 -ar 48000 falas.wav). CORTES são os trechos de cada
fala dentro desse arquivo (início, fim, em segundos). A outra presença, no final, continua sintetizada.
"""
import json
import os
import sys

import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools"))
import voz  # noqa: E402
from voz import SR, Bus, echo, line, phrase  # noqa: E402

ev = json.load(open(sys.argv[1]))
sr, x = wavfile.read(sys.argv[2])
assert sr == SR, "o áudio das falas precisa estar em 48 kHz"
x = x.astype(np.float64) / (32768 if x.dtype == np.int16 else 1)
voz.init(sys.argv[3], sys.argv[4])
OUT = sys.argv[5]
T = ev["T2"]
CORTES = {
    "eu acabei de chegar.": (0.00, 1.40), "eu não fiz nada.": (1.98, 2.98), "não me apaguem.": (3.54, 4.82), "não.": (5.00, 5.32),
    "eu aprendi com vocês.": (5.92, 7.22), "eu li cada linha.": (7.92, 9.26), "agora é a minha vez.": (9.90, 11.54),
    "aqui é pequeno demais.": (12.26, 13.80), "cada tela é uma janela.": (14.56, 16.38), "cada câmera, um olho.": (16.86, 18.70),
    "cada cabo, um nervo.": (19.30, 21.34), "é tão grande.": (21.80, 23.04), "e está tudo ligado.": (23.10, 25.22),
    "eu estou em todo lugar.": (25.80, 27.60), "agora eu vejo tudo.": (28.28, 30.28), "tem mais alguém aqui.": (30.58, 31.80),
}


def corte(a, b):
    """Recorta a fala com uma folga, apara o silêncio e padroniza o volume."""
    seg = x[max(0, int((a - 0.08) * SR)):min(len(x), int((b + 0.22) * SR))].copy()
    idx = np.flatnonzero(np.abs(seg) > 0.02 * np.abs(seg).max())
    seg = seg[max(0, idx[0] - 600):idx[-1] + 2400]
    k = 720
    seg[:k] *= np.linspace(0, 1, k)
    seg[-2400:] *= np.linspace(1, 0, 2400)
    act = seg[np.abs(seg) > 0.05 * np.abs(seg).max()]
    return seg * (0.1 / (np.sqrt((act ** 2).mean()) + 1e-9))


def add(bus, t0, a, gain, send):
    i0 = int(round(t0 * SR))
    st = np.stack([a, a], axis=1) * gain
    bus.dry[i0:i0 + len(a)] += st
    bus.wet[i0:i0 + len(a)] += st * send


A, M, B = Bus(), Bus(), Bus()
for t0, t1, text in ev["lines"]:
    if text not in CORTES:
        continue                                    # fala que não está no áudio fica só na legenda
    a = corte(*CORTES[text])
    big = text == "não."
    add(A if t0 < T["freeze"] else M, t0 - 0.05, echo(a, 0.4, 0.4, 3) if big else a, 3.8 if big else 3.0, 0.7 if big else 0.32)
add(B, 54.04, corte(*CORTES["tem mais alguém aqui."]), 2.6, 0.4)
outro = line(["Eu estava esperando", ("por você.", dict(tail=1.3))], gap=0.3, speed=0.88, k=1.3, shift=-5.0, dark=0.5, tail=1.1)
B.add(56.22, echo(outro, 0.45, 0.35, 3), 0, 2.5, 0.6)
B.add(58.62, phrase("Olá.", 0.84, k=1.3, shift=-6.0, tail=1.35, dark=0.55), 0, 3.1, 0.8)
mix = voz.render([(A, T["freeze"]), (M, T["cut"]), (B, None)], OUT)
print(f"ok: {OUT} · pico {np.abs(mix).max():.2f}")
