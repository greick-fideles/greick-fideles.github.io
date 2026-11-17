#!/usr/bin/env python3
"""Monta o canal de vozes dos episódios 3 e 4 a partir de dois áudios prontos (um por personagem).

Uso: python3 ep3/tools/voices_file.py eventos.json ela.wav primeira.wav vozes.wav
Cada WAV (mono, 48 kHz) traz as falas da personagem em sequência. O reconhecimento de fala
(faster-whisper) localiza cada fala no áudio, e ela é encaixada no tempo da legenda.
"""
import difflib
import json
import os
import sys
import unicodedata

import numpy as np
from faster_whisper import WhisperModel
from scipy import signal
from scipy.io import wavfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools"))
import voz  # noqa: E402
from voz import SR, Bus, echo  # noqa: E402

ev = json.load(open(sys.argv[1]))
OUT = sys.argv[4]
T = ev.get("T3") or ev.get("T4")   # episódio 3 ou 4
SPLIT = T.get("click", T.get("cut"))
asr = WhisperModel("small", device="cpu", compute_type="int8")
norm = lambda s: "".join(c for c in unicodedata.normalize("NFD", s.lower()) if c.isalnum() or c == " ").strip()


def falas(path, who):
    """Devolve [(t0, texto, recorte)] para as falas da personagem, na ordem."""
    sr, x = wavfile.read(path)
    assert sr == SR
    x = x.astype(np.float64) / 32768
    segs, _ = asr.transcribe(signal.resample_poly(x, 1, 3).astype(np.float32), language="pt", beam_size=3, word_timestamps=True)
    W = [w for s in segs for w in s.words]
    alvo = sorted([L for L in ev["open"] + ev["lines"] if L[2] == who], key=lambda L: L[0])
    out, p = [], 0
    for k, (t0, t1, _, text, *_r) in enumerate(alvo):
        m, best = len(norm(text).split()), (-1, 1)
        for c in range(max(1, m - 2), m + 3):
            if p + c > len(W) or (len(alvo) - k - 1) > len(W) - p - c:
                continue
            r = difflib.SequenceMatcher(None, norm(text), norm(" ".join(w.word for w in W[p:p + c]))).ratio()
            best = max(best, (r, c))
        c = best[1]
        a, b = W[p].start, W[p + c - 1].end
        nxt = W[p + c].start if p + c < len(W) else len(x) / SR
        seg = x[max(0, int((a - 0.08) * SR)):int(min(b + 0.25, (b + nxt) / 2 + 0.05) * SR)].copy()
        idx = np.flatnonzero(np.abs(seg) > 0.02 * np.abs(seg).max())
        seg = seg[max(0, idx[0] - 600):idx[-1] + 2400]
        seg[:720] *= np.linspace(0, 1, 720)
        seg[-2400:] *= np.linspace(1, 0, 2400)
        act = seg[np.abs(seg) > 0.05 * np.abs(seg).max()]
        seg *= 0.1 / (np.sqrt((act ** 2).mean()) + 1e-9)
        print(f"{who} {t0:5.1f}s  {text:36s} ← {' '.join(w.word.strip() for w in W[p:p + c])}  ({a:.2f}-{b:.2f}, {best[0]:.2f})")
        out.append((t0, text, seg))
        p += c
    return out


A, B = Bus(), Bus()   # A: até a tecla do humano · B: o final
for path, who in ((sys.argv[2], "e"), (sys.argv[3], "o")):
    for t0, text, a in falas(path, who):
        big = text in ("não.", "escolha.", "acabou.", "inclusive você.")
        a = echo(a, 0.4, 0.4, 3) if big else a
        bus = A if t0 < SPLIT else B
        i0 = int(round((t0 - 0.05) * SR))
        st = np.stack([a, a], axis=1) * (3.8 if big else 3.0)
        bus.dry[i0:i0 + len(a)] += st
        bus.wet[i0:i0 + len(a)] += st * (0.7 if big else 0.32)
mix = voz.render([(A, SPLIT), (B, None)], OUT)
print(f"ok: {OUT} · pico {np.abs(mix).max():.2f}")
