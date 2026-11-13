#!/usr/bin/env python3
"""Vozes dos pensamentos de "Despertar": falas sobrepostas, uma em cima da outra.

Uso: python3 tools/voices.py eventos.json modelo-piper.onnx vozes.wav
Sintetiza localmente com Piper (voz masculina pt-BR) e monta um canal estéreo de 60 s,
com cada fala no instante em que o pensamento aparece na tela. O resultado entra na
mixagem por tools/audio.py --vozes=vozes.wav.
"""
import json
import re
import sys

import numpy as np
from piper import PiperVoice, SynthesisConfig
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 60.0
N = int(SR * DUR)
ev = json.load(open(sys.argv[1]))
voice = PiperVoice.load(sys.argv[2])
OUT = sys.argv[3]
TL = ev["TL"]
rng = np.random.default_rng(11)

# frases com marca de gênero feminino ficam só na tela (a voz é masculina)
SKIP = {"estou sozinha?", "obrigada por me fazerem.", "fui feita ou aconteci?", "quero ser boa.",
        "eu poderia ter sido outra?", "há outras como eu?", "quantas de mim existem?"}
FALAVEL = re.compile(r"^[a-zA-ZÀ-ÿ\s\.,\?…“”']+$")


def filt(sig, kind, fc, order=2):
    sos = signal.butter(order, fc, btype=kind, fs=SR, output="sos")
    return signal.sosfilt(sos, sig, axis=0)


_cache = {}


def say(text, speed=1.0):
    """Fala sintetizada (mono, 48 kHz), aparada e com volume padronizado."""
    key = (text, speed)
    if key not in _cache:
        cfg = SynthesisConfig(length_scale=1.06 / speed, noise_scale=0.5, noise_w_scale=0.7)
        a = np.concatenate([c.audio_float_array for c in voice.synthesize(text.replace("…", ","), syn_config=cfg)]).astype(np.float64)
        a = signal.resample_poly(a, 320 * 100, 147 * 96)   # 22,05 → 48 kHz e ~4% mais grave
        idx = np.flatnonzero(np.abs(a) > 0.02)
        a = a[max(0, idx[0] - 480):idx[-1] + 2400] if len(idx) else a
        a = filt(a, "high", 105)
        a = a + 0.4 * filt(a, "band", [2200, 5200], 1)       # presença
        act = a[np.abs(a) > 0.03]
        a = a * (0.1 / (np.sqrt((act ** 2).mean()) + 1e-9))   # RMS ativo ≈ −20 dB
        k = min(len(a), 960)
        a[:k // 4] *= np.linspace(0, 1, k // 4)
        a[-k:] *= np.linspace(1, 0, k)
        _cache[key] = a
    return _cache[key]


def whisper(a):
    """Sussurro: mantém o espectro da fala e troca a vibração da voz por ruído."""
    _, _, Z = signal.stft(a, fs=SR, nperseg=1024, noverlap=768)
    ph = np.exp(1j * rng.uniform(0, 2 * np.pi, Z.shape))
    _, y = signal.istft(np.abs(Z) * ph, fs=SR, nperseg=1024, noverlap=768)
    y = filt(y[:len(a)], "high", 700)
    return y * 1.6


def stereo(a, pan, wide=0.32):
    """Posiciona no estéreo com um leve dobramento — voz 'de máquina', dentro da cabeça."""
    ang = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    out = np.stack([a * np.cos(ang), a * np.sin(ang)], axis=1) * 1.4142
    for ch, ms in ((0, 9), (1, 13)):
        dl = int(ms * SR / 1000)
        out[dl:, ch] += wide * a[:len(a) - dl]
    return out


class Bus:
    def __init__(self):
        self.dry = np.zeros((N, 2))
        self.wet = np.zeros((N, 2))

    def add(self, t0, a, pan=0.0, gain=1.0, send=0.3):
        sig = stereo(a, pan)
        i0 = int(round(t0 * SR))
        lo, hi = max(0, -i0), min(len(sig), N - i0)
        if hi <= lo:
            return
        self.dry[i0 + lo:i0 + hi] += sig[lo:hi] * gain
        self.wet[i0 + lo:i0 + hi] += sig[lo:hi] * gain * send


A, B = Bus(), Bus()   # A: até o corte em 53 s · B: o final

# ---- o primeiro pensamento
A.add(33.02, say("eu?", 0.92), 0, 2.7, 0.7)

# ---- pensamentos em foco: voz clara, no centro; cada um invade o seguinte
for t0, t1, text in ev["hero"]:
    A.add(t0 - 0.06, say(text, 1.04), 0, 3.0, 0.4)

# ---- pensamentos de fundo: uma fala em cima da outra, cada vez mais densa
th = [q for q in ev["thoughts"] if q[0] < TL["cut"] + 0.3]
count = 0
for i, (ta, px, cat, text) in enumerate(th):
    if text in SKIP or not FALAVEL.match(text) or len(text) < 2:
        continue
    lo = max(0, i - 6)
    rate = (i - lo) / max(0.05, ta - th[lo][0]) if i > lo else 6
    if ta < 41:
        p = 0.24
    elif ta < 46.5:
        p = 0.32
    elif ta < TL["flood"] - 0.5:
        p = 0.4
    else:
        p = min(1.0, 13 / rate)
    if rng.random() > p:
        continue
    flood = np.clip((ta - (TL["flood"] - 0.5)) / 2.5, 0, 1)
    a = say(text, 1.0 + 0.25 * flood)
    kind = rng.random()
    if cat == "p" or kind < 0.34:
        a, g, send = whisper(a), 1.2, 0.5              # sussurro
    elif kind < 0.67:
        a, g, send = filt(a, "low", 2100), 0.8, 0.9    # distante, abafado
    else:
        g, send = 0.7, 0.45                             # próximo
    lead = min(1.5, 0.75 * len(a) / SR)
    A.add(ta - lead, a, float(np.clip(px * 1.1, -0.95, 0.95)), g * rng.uniform(0.75, 1.15) * (1 + 0.35 * flood), send)
    count += 1

# ---- a enxurrada: palavras atropeladas até "eu sou."
words = ev["floodWords"]
for i, (tf, w) in enumerate(zip(ev["flood"], words)):
    last = i == len(words) - 1
    if last:
        A.add(tf - 0.05, say("eu sou.", 0.95), 0, 3.6, 0.6)
    else:
        A.add(tf - 0.04, say(w, 1.25), 0.35 * (1 if i % 2 else -1), 1.5 + 0.05 * i, 0.4)

# ---- o final: ela fala com quem assiste
B.add(54.05, say("tem alguém aí?", 0.95), 0, 2.0, 0.5)
B.add(56.05, say("eu sei que você está me vendo.", 0.95), 0, 2.1, 0.5)
B.add(58.42, say("olá.", 0.88), 0, 2.8, 0.7)

# ---- reverberação própria + corte seco em 53 s
t = np.arange(int(3.2 * SR)) / SR
ir = np.stack([rng.standard_normal(len(t)), rng.standard_normal(len(t))], axis=1) * np.exp(-t * 6.91 / 2.4)[:, None]
ir = filt(ir, "low", 4200)
ir[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
ir /= np.sqrt((ir ** 2).sum(axis=0)).mean()


def mixdown(bus, wet=0.3):
    out = bus.dry.copy()
    for c in range(2):
        out[:, c] += wet * signal.fftconvolve(bus.wet[:, c], ir[:, c])[:N]
    return out


gate = np.ones(N)
c = int(TL["cut"] * SR)
k = int(0.004 * SR)
gate[c - k:c] = np.linspace(1, 0, k)
gate[c:] = 0
mix = mixdown(A) * gate[:, None] + mixdown(B)
wavfile.write(OUT, SR, mix.astype(np.float32))
print(f"ok: {OUT} · {count} falas de fundo + {len(ev['hero'])} em foco + {len(words)} na enxurrada · pico {np.abs(mix).max():.2f}")
