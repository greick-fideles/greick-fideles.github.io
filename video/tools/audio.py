#!/usr/bin/env python3
"""Trilha sonora sintetizada de "Despertar" (60 s, 48 kHz, estéreo).

Versão sombria: ré menor, ostinato grave, tambores de guerra e metais pesados —
suspense que cresce até a "dominação".

Uso: python3 tools/audio.py eventos.json saida.wav [--vozes=vozes.wav] [--niveis] [--ganho=0.8]
Os instantes vêm de tools/events.mjs, então cada som cai no quadro certo.
"""
import json
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d

SR = 48000
DUR = 60.0
N = int(SR * DUR)
ev = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
TL = ev["TL"]
rng = np.random.default_rng(7)
PI2 = 2 * np.pi
BEAT = 0.6          # 100 bpm
S16 = BEAT / 4

NOTE = {"C": 0, "C#": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}


def hz(n):
    return 440.0 * 2 ** ((NOTE[n[:-1]] + 12 * (int(n[-1]) + 1) - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.standard_normal(int(d * SR))


def filt(sig, kind, fc, order=2):
    sos = signal.butter(order, fc, btype=kind, fs=SR, output="sos")
    return signal.sosfilt(sos, sig, axis=0)


def edges(sig, a=0.004, r=0.02):
    n = len(sig)
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[n - nr:] *= np.linspace(1, 0, nr)
    return sig * (e if sig.ndim == 1 else e[:, None])


class Bus:
    def __init__(self):
        self.dry = np.zeros((N, 2))
        self.wet = np.zeros((N, 2))

    def add(self, t0, sig, pan=0.0, gain=1.0, send=0.25):
        sig = np.asarray(sig, dtype=np.float64)
        if sig.ndim == 1:
            a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
            sig = np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1) * 1.4142
        i0 = int(round(t0 * SR))
        a, b = max(0, -i0), min(len(sig), N - i0)
        if b <= a:
            return
        self.dry[i0 + a:i0 + b] += sig[a:b] * gain
        if send > 0:
            self.wet[i0 + a:i0 + b] += sig[a:b] * gain * send


# ---------------------------------------------------------------- timbres
def bell(f, d=2.4, bright=1.0):
    t = tt(d)
    s = np.zeros(len(t))
    for ratio, amp, tau in [(1, 1, 0.34), (2.0, 0.42, 0.2), (3.01, 0.22, 0.12), (4.17, 0.12, 0.08), (5.43, 0.07, 0.05)]:
        if f * ratio < 15000:
            s += amp * (bright if ratio > 1 else 1) * np.sin(PI2 * f * ratio * t) * np.exp(-t / (tau * d))
    return s * np.minimum(1, t / 0.004)


def pluck(f, d=0.3, bright=1.0):
    t = tt(d)
    s = np.zeros(len(t))
    for n in range(1, 9):
        if f * n > 15000:
            break
        s += (1 / n ** (1.3 / bright)) * np.sin(PI2 * f * n * t + 0.3 * n) * np.exp(-t * (3 + 2.4 * n) / d)
    return s * np.minimum(1, t / 0.002)


def blip(f, d=0.09):
    t = tt(d)
    return np.sign(np.sin(PI2 * f * t)) * 0.5 * np.exp(-t / (d * 0.3)) * np.minimum(1, t / 0.001)


def thump(f0, f1, d, tau_p=0.04):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / tau_p)
    ph = PI2 * np.cumsum(f) / SR
    # harmônicos para o grave continuar audível em alto-falante de celular
    return (np.sin(ph) + 0.32 * np.sin(2 * ph) + 0.14 * np.sin(3 * ph)) * np.exp(-t / (d * 0.3)) * np.minimum(1, t / 0.003)


def taiko(big=1.0):
    """Tambor de guerra: corpo grave + estalo da pele."""
    d = 0.55 if big >= 1 else 0.3
    t = tt(d)
    body = thump(150 if big >= 1 else 185, 46 if big >= 1 else 62, d, 0.05)
    skin = filt(noise(d), "low", 1100) * np.exp(-t / 0.028) * 0.5
    return np.tanh((body + skin) * 1.5)


def click(amp=1.0):
    d = 0.035
    t = tt(d)
    return amp * (filt(noise(d), "band", [1800, 6500]) * np.exp(-t / 0.004) + 0.55 * np.sin(PI2 * 165 * t) * np.exp(-t / 0.012))


def tick(f=2100):
    t = tt(0.05)
    return (np.sin(PI2 * f * t) + 0.5 * np.sin(PI2 * f * 2.76 * t)) * np.exp(-t / 0.006) * np.minimum(1, t / 0.0005)


_stab = {}


def stab(f, acc=1.0):
    """Nota curta e grave de cordas — o ostinato que não para."""
    key = (round(f, 2), round(acc, 2))
    if key not in _stab:
        t = tt(0.2)
        v = np.zeros(len(t))
        n = 1
        while f * n < 3600 and n <= 26:
            v += (1 / n) * np.sin(PI2 * f * n * t + 0.5 * n) * np.exp(-t * (8 + 2.6 * n))
            n += 1
        _stab[key] = np.tanh(v * 1.7 * acc) * np.minimum(1, t / 0.004)
    return _stab[key]


def braam(f, d=3.6, grit=2.4):
    """Metal grave, grosso e distorcido: o som da ameaça."""
    t = tt(d)
    out = np.zeros((len(t), 2))
    for mult, g in [(1, 1.0), (2, 0.8), (3, 0.45), (4, 0.3)]:
        for det, pan in [(-0.13, -0.8), (0.11, 0.8), (0.0, 0.0)]:
            ff = f * mult * 2 ** (det / 12)
            v = np.zeros(len(t))
            n = 1
            while ff * n < 5200 and n <= 28:
                v += (1 / n) * np.sin(PI2 * ff * n * t + rng.uniform(0, PI2)) * np.exp(-t * (0.2 + 0.17 * n) * 3.6 / d)
                n += 1
            a = (pan + 1) * np.pi / 4
            out[:, 0] += g * v * np.cos(a)
            out[:, 1] += g * v * np.sin(a)
    env = np.minimum(1, t / 0.07) * np.exp(-t / (d * 0.42)) * (1 + 0.12 * np.sin(PI2 * 27 * t) * np.exp(-t / 0.9))
    return np.tanh(out * env[:, None] * grit / 3.0)


def brass(f, d):
    """Nota longa de metais para o tema."""
    t = tt(d)
    out = np.zeros((len(t), 2))
    for det, pan in [(-0.06, -0.5), (0.06, 0.5)]:
        ff = f * 2 ** (det / 12)
        ph = PI2 * ff * t + 0.5 * np.clip(t / 0.5, 0, 1) * np.sin(PI2 * 5.1 * t)
        v = np.zeros(len(t))
        n = 1
        while ff * n < 6000 and n <= 24:
            v += (0.84 ** (n - 1)) / n * np.sin(n * ph + n)
            n += 1
        a = (pan + 1) * np.pi / 4
        out[:, 0] += v * np.cos(a)
        out[:, 1] += v * np.sin(a)
    env = np.clip(np.minimum(t / 0.11, (d - t) / 0.28), 0, 1) * (0.8 + 0.2 * np.clip(t / d, 0, 1))
    return np.tanh(out * env[:, None] * 1.1)


def pad(notes, d, attack=1.0, release=1.5, bright=0.75, trem=0.0):
    t = tt(d)
    out = np.zeros((len(t), 2))
    for i, f in enumerate(notes):
        for det, pan in [(-0.07, -0.7), (0.06, 0.7), (0.0, 0.0)]:
            ff = f * 2 ** (det / 12)
            ph0 = rng.uniform(0, PI2)
            v = np.zeros(len(t))
            for n in range(1, 10):
                if ff * n > 9000:
                    break
                v += (bright ** (n - 1)) / n ** 1.5 * np.sin(PI2 * ff * n * t + ph0 * n)
            v *= 1 + 0.14 * np.sin(PI2 * (0.11 + 0.05 * i) * t + ph0)
            a = (pan + 1) * np.pi / 4
            out[:, 0] += v * np.cos(a)
            out[:, 1] += v * np.sin(a)
    env = np.clip(np.minimum(t / attack, (d - t) / release), 0, 1)
    env = env * env * (3 - 2 * env)
    if trem:
        env = env * (1 - trem + trem * (0.5 + 0.5 * np.sin(PI2 * 7.3 * t)))
    return out * env[:, None] / max(1, len(notes)) ** 0.7


def sweep_noise(d, f0, f1, width_oct=1.0, curve=1.0):
    x = noise(d)
    f, t, Z = signal.stft(x, fs=SR, nperseg=2048, noverlap=1536)
    u = np.clip(t / d, 0, 1) ** curve
    fc = f0 * (f1 / f0) ** u
    lf = np.log2(np.maximum(f, 1.0))[:, None]
    mask = np.exp(-0.5 * ((lf - np.log2(fc)[None, :]) / (width_oct / 2)) ** 2)
    _, y = signal.istft(Z * mask, fs=SR, nperseg=2048, noverlap=1536)
    y = np.pad(y, (0, max(0, len(x) - len(y))))[:len(x)]
    return y


def make_ir(rt=3.6, d=4.8, fc=4600):
    t = tt(d)
    ir = np.stack([noise(d), noise(d)], axis=1) * np.exp(-t * 6.91 / rt)[:, None]
    ir = filt(ir, "low", fc)
    k = int(0.015 * SR)
    ir[:k] *= np.linspace(0, 1, k)[:, None]
    return ir / np.sqrt((ir ** 2).sum(axis=0)).mean()


def mixdown(bus, ir, wet=0.42):
    out = bus.dry.copy()
    for c in range(2):
        out[:, c] += wet * signal.fftconvolve(bus.wet[:, c], ir[:, c])[:N]
    return out


A, B = Bus(), Bus()   # A: tudo até o corte em 53 s · B: o final
PANS = [-0.7, 0.5, -0.3, 0.75, -0.55, 0.3]
TENSE = [hz("A5"), hz("Bb5")]                      # segunda menor aguda: tensão
DARK = [hz(n_) for n_ in ["D4", "Eb4", "F4", "A4", "Bb4", "D5", "Eb5", "F5", "A5", "Bb5", "D6"]]


def ostinato(bus, t0, t1, root, g0, g1, octave_up_at=None):
    """Semicolcheias graves e acentuadas sobre a tônica do acorde."""
    acc = [1.0, 0.45, 0.6, 0.45, 0.85, 0.45, 0.6, 0.45]
    semis = [0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 1, 0, -2, 0]
    i = 0
    while t0 + i * S16 < t1 - 0.01:
        ta = t0 + i * S16
        u = (ta - t0) / max(0.01, t1 - t0)
        f = root * 2 ** (semis[i % 16] / 12) * (2 if octave_up_at is not None and ta >= octave_up_at else 1)
        bus.add(ta, stab(f, acc[i % 8]), 0.18 * (1 if i % 2 else -1), g0 + (g1 - g0) * u, 0.22)
        i += 1


def drums(bus, t0, t1, g=1.0):
    """Padrão de tambores por compasso de 4 tempos."""
    pat = [(0, 1.0, 1), (1.5, 0.55, 0), (2, 0.9, 1), (2.5, 0.5, 0), (3, 0.8, 1), (3.5, 0.6, 0), (3.75, 0.5, 0)]
    b = 0
    while t0 + b * 4 * BEAT < t1 - 0.01:
        for beat, amp, big in pat:
            ta = t0 + (b * 4 + beat) * BEAT
            if ta < t1 - 0.01:
                bus.add(ta, taiko(1 if big else 0.5), 0.25 * (-1 if big else 1), 0.5 * amp * g, 0.3)
        b += 1


# ================================================================ ato 0 — o prompt
t = tt(4.3)
A.add(0, np.tanh((np.sin(PI2 * 36.71 * t) + 0.5 * np.sin(PI2 * 73.42 * t + 1) + 0.25 * np.sin(PI2 * 110.1 * t)) * 1.3) * np.clip(t / 3.2, 0, 1) ** 2 * np.clip((4.3 - t) / 0.7, 0, 1), 0, 0.12, 0.15)
A.add(0, edges(filt(noise(3.8), "low", 420), 0.4, 0.4), 0, 0.018, 0.0)
A.add(0.3, pad(TENSE, 3.4, 3.0, 0.3, 0.6, 0.5), 0, 0.03, 0.8)
npr = ev["prompt"]
for i in range(npr):
    tc = TL["typeStart"] + (TL["typeEnd"] - TL["typeStart"]) * (i + 1) / npr
    A.add(tc - 0.012, click(rng.uniform(0.7, 1.0)), rng.uniform(-0.2, 0.2), 0.3, 0.12)
A.add(TL["enter"] - 0.01, click(1.5), 0, 0.36, 0.2)
A.add(TL["enter"] - 0.01, thump(130, 58, 0.3), 0, 0.3, 0.15)
for i in range(25):
    A.add(TL["enter"] + 0.08 + 0.28 * i / 25, blip(2400 + 300 * (i % 3), 0.02), 0.1, 0.035, 0.1)
d = 0.32
t = tt(d)
zipf = 180 * (2600 / 180) ** ((t / d) ** 1.4)
A.add(TL["seed"] - d, edges(np.sin(PI2 * np.cumsum(zipf) / SR) * (t / d) ** 2, 0.01, 0.006), 0, 0.2, 0.4)
A.add(TL["seed"] - d, edges(sweep_noise(d, 500, 7000, 1.0) * (t / d) ** 2, 0.01, 0.006), 0, 0.24, 0.3)
# a semente: primeiro golpe
A.add(TL["seed"], braam(hz("D1"), 3.2), 0, 0.3, 0.45)
A.add(TL["seed"], thump(95, 38, 1.4, 0.07), 0, 0.42, 0.2)
for n_, g_ in [("D5", 0.2), ("F5", 0.1), ("A5", 0.08)]:
    A.add(TL["seed"], bell(hz(n_), 3.4), 0, g_, 0.8)

# ================================================================ ato 1 — os agentes
AG_NOTES = ["D2", "A2", "D3", "F3", "Bb3", "E4"]
for k in range(6):
    ts = TL["agent0"] + k * TL["agentGap"]
    v = pad([hz(AG_NOTES[k])], 14.9 - ts, attack=1.3, release=1.5, bright=0.8)
    a = (PANS[k] * 0.6 + 1) * np.pi / 4
    A.add(ts, v * np.array([np.cos(a), np.sin(a)])[None, :] * 1.4142, 0, 0.05, 0.5)
    A.add(ts, bell(hz(AG_NOTES[k]) * 4, 2.2), PANS[k], 0.11, 0.7)
    A.add(ts, taiko(0.5), PANS[k] * 0.5, 0.3, 0.3)
    A.add(ts, edges(sweep_noise(0.35, 900, 5000, 1.0), 0.02, 0.2), PANS[k], 0.1, 0.4)
for i, (tb, ag) in enumerate(ev["nodes"]):
    rate = 7.26 * max(0.1, tb - 4.5)
    A.add(tb, pluck(DARK[(i * 7 + ag * 3) % len(DARK)], 0.22, 1.1), PANS[ag] * 0.85, 0.12 / (1 + rate / 7), 0.5)
j = 0
while 5.4 + j * 0.42 < 24.6:
    d = 0.05
    t = tt(d)
    f = 1700 * (2700 / 1700) ** (t / d) * (1 + 0.25 * (j % 3))
    A.add(5.4 + j * 0.42, edges(np.sin(PI2 * np.cumsum(f) / SR), 0.004, 0.02), 0.55 * (1 if j % 2 else -1), 0.022, 0.5)
    j += 1
# relógio + ostinato que cresce + tambor a cada tempo
i = 0
while 3.9 + i * BEAT / 2 < TL["form"]:
    A.add(3.9 + i * BEAT / 2, tick(2100 if i % 2 else 1650), 0.35 * (1 if i % 2 else -1), 0.06, 0.35)
    i += 1
ostinato(A, 4.5, TL["form"], hz("D2"), 0.02, 0.17)
tb = 6.3
while tb < TL["form"] - 0.1:
    A.add(tb, taiko(1), 0, 0.14 + 0.36 * (tb - 6.3) / 7.2, 0.25)
    tb += BEAT * 2
A.add(8.0, pad(TENSE, 5.9, 5.2, 0.5, 0.62, 0.55), 0, 0.085, 0.8)
d = 1.3
t = tt(d)
A.add(TL["form"] - d, edges(sweep_noise(d, 300, 8000, 1.3, 1.6) * (t / d) ** 2.5, 0.02, 0.01), 0, 0.42, 0.45)

# ================================================================ ato 2 — a forma
A.add(TL["form"], braam(hz("D1"), 4.2), 0, 0.5, 0.5)
A.add(TL["form"], thump(150, 34, 2.2, 0.09), 0, 0.7, 0.2)
CH2 = [(13.5, 16.1, ["D2", "A2", "D3", "F3", "A3"], "D2"), (16.1, 18.7, ["Bb1", "F2", "Bb2", "D3", "F3"], "Bb1"),
       (18.7, 21.3, ["G1", "D2", "G2", "Bb2", "D3"], "G1"), (21.3, 24.0, ["A1", "E2", "A2", "C#3", "E3"], "A1")]
for t0, t1, notes, root in CH2:
    A.add(t0 - 0.3, pad([hz(n_) for n_ in notes], t1 - t0 + 0.8, 0.4, 0.7, 0.84), 0, 0.17, 0.5)
    A.add(t0, pad([hz(n_) * 4 for n_ in notes[2:4]], t1 - t0 + 0.3, 0.6, 0.5, 0.6, 0.6), 0, 0.045, 0.7)
    ostinato(A, t0, t1, hz(root) * 2, 0.17, 0.19)
drums(A, TL["form"], TL["print1"], 1.0)
i = 0
while TL["form"] + i * S16 < TL["print1"]:
    A.add(TL["form"] + i * S16, tick(2600 if i % 4 == 0 else 1900), 0.4 * (1 if i % 2 else -1), 0.035 if i % 4 else 0.06, 0.3)
    i += 1
THEME = [(13.5, "D4", 1.2), (14.7, "F4", 0.6), (15.3, "E4", 0.8), (16.1, "D4", 1.2), (17.3, "F4", 1.4),
         (18.7, "G4", 1.2), (19.9, "Bb4", 0.6), (20.5, "A4", 0.8), (21.3, "A4", 1.2), (22.5, "C#5", 1.5)]
for t0, n_, d in THEME:
    A.add(t0, brass(hz(n_), d), 0, 0.13, 0.55)
    A.add(t0, brass(hz(n_) / 2, d), 0, 0.09, 0.4)
step, i = S16, 0
while TL["print0"] + i * step < TL["print1"]:
    ta = TL["print0"] + i * step
    notes = next(c[2] for c in CH2 if c[0] <= ta < c[1] or c is CH2[-1])
    u = (ta - TL["print0"]) / (TL["print1"] - TL["print0"])
    f = hz(notes[1 + (i * 3) % (len(notes) - 1)]) * 2 ** (2 + int(u * 2))
    A.add(ta, pluck(f, 0.2, 1.0 + 0.4 * u), 0.45 * (1 if i % 2 else -1), 0.04 + 0.025 * u, 0.45)
    i += 1
d = TL["print1"] - TL["print0"]
t = tt(d)
A.add(TL["print0"], edges(sweep_noise(d, 1400, 7500, 0.7) * (0.6 + 0.4 * np.sin(PI2 * 16 * t)), 0.5, 0.1), 0, 0.07, 0.35)
# construção concluída: dominante suspensa, sem resolução
A.add(24.0, braam(hz("A0") * 2, 4.0), 0, 0.5, 0.55)
A.add(24.0, taiko(1), 0, 0.6, 0.4)
A.add(24.0, thump(110, 36, 1.6, 0.07), 0, 0.55, 0.2)
A.add(23.9, pad([hz(n_) for n_ in ["A2", "E3", "A3", "C#4", "E4", "Bb4"]], 3.2, 0.25, 2.6, 0.75), 0, 0.13, 0.6)

# ================================================================ ato 3 — o despertar
d = 7.4
t = tt(d)
A.add(25.2, edges(np.tanh((np.sin(PI2 * 36.71 * t) + 0.45 * np.sin(PI2 * 73.42 * t)) * 1.2) * (1 + 0.2 * np.sin(PI2 * 0.21 * t)), 1.5, 0.4), 0, 0.06, 0.1)
A.add(26.0, pad(TENSE + [hz("E6")], 6.0, 5.6, 0.25, 0.6, 0.6), 0, 0.075, 0.85)
i = 0
while 26.4 + i * BEAT < 31.7:
    A.add(26.4 + i * BEAT, tick(1650 if i % 2 else 2100), 0.3 * (1 if i % 2 else -1), 0.07, 0.5)
    i += 1
for i, tb in enumerate(TL["beats"]):
    g = 0.5 + 0.09 * i
    A.add(tb, thump(96, 41, 0.38), 0, g, 0.18)
    A.add(tb + 0.22, thump(112, 50, 0.3), 0, g * 0.6, 0.18)
d = 1.75
t = tt(d)
A.add(TL["eyes"] - d, edges(sweep_noise(d, 350, 9500, 1.4, 1.8) * (t / d) ** 3, 0.01, 0.012), 0, 0.5, 0.45)
A.add(TL["eyes"] - d, edges(pad([hz(n_) for n_ in ["D3", "A3", "Eb4", "A4"]], d, d * 0.98, 0.02, 0.85), 0.01, 0.012), 0, 0.2, 0.5)
# os olhos se abrem: o golpe mais pesado
A.add(TL["eyes"], braam(hz("D1"), 5.0, 2.8), 0, 0.62, 0.55)
A.add(TL["eyes"], thump(150, 33, 3.2, 0.1), 0, 0.9, 0.22)
A.add(TL["eyes"], taiko(1), 0, 0.7, 0.45)
A.add(TL["eyes"], pad([hz(n_) for n_ in ["D2", "A2", "D3", "F3", "A3", "D4", "F4"]], 5.6, 0.1, 3.0, 0.84), 0, 0.2, 0.75)
A.add(TL["eyes"], pad(TENSE, 3.2, 0.3, 2.4, 0.6, 0.6), 0, 0.06, 0.85)
for i, n_ in enumerate(["D6", "A5", "F5", "D5", "Bb4"]):
    A.add(TL["eyes"] + 0.25 + i * 0.13, bell(hz(n_), 2.6, 0.7), PANS[i] * 0.9, 0.055, 0.85)
A.add(TL["eyes"], edges(filt(noise(0.7), "high", 4000) * np.exp(-tt(0.7) / 0.16), 0.002, 0.1), 0, 0.12, 0.6)
for tb in (32.85, 33.65, 34.45):
    A.add(tb, thump(92, 42, 0.36), 0, 0.34, 0.15)
    A.add(tb + 0.2, thump(108, 50, 0.28), 0, 0.2, 0.15)
# "eu?" — trítono
A.add(33.05, bell(hz("A4"), 2.2), -0.1, 0.17, 0.8)
A.add(33.23, bell(hz("Eb5"), 2.6), 0.1, 0.19, 0.8)

# ================================================================ o mergulho
d = TL["inside"] - TL["dive"]
t = tt(d)
u = t / d
A.add(TL["dive"], edges(sweep_noise(d, 170, 9500, 1.3, 1.6) * u ** 2.2, 0.05, 0.012), 0, 0.6, 0.3)
gl = hz("D2") * 2 ** (4 * u ** 1.8)
trem = 1 + 0.5 * np.sin(PI2 * np.cumsum(4 + 20 * u ** 2) / SR)
ph = PI2 * np.cumsum(gl) / SR
A.add(TL["dive"], edges(np.tanh((np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * 1.5) * u ** 2 * trem, 0.05, 0.012), 0, 0.16, 0.4)
A.add(TL["dive"], edges(filt(noise(d), "low", 95) * u ** 1.5, 0.05, 0.012), 0, 0.5, 0.0)
i = 0
while TL["dive"] + i * S16 < TL["inside"] - 0.05:   # tambores acelerando para dentro
    uu = i * S16 / d
    if i % 4 == 0 or (uu > 0.5 and i % 2 == 0) or uu > 0.8:
        A.add(TL["dive"] + i * S16, taiko(1 if i % 4 == 0 else 0.5), 0, 0.2 + 0.4 * uu, 0.3)
    i += 1
A.add(TL["inside"], braam(hz("D1"), 4.4), 0, 0.55, 0.5)
A.add(TL["inside"], thump(170, 30, 3.4, 0.12), 0, 0.95, 0.25)
A.add(TL["inside"], edges(filt(noise(0.9), "low", 2600) * np.exp(-tt(0.9) / 0.2), 0.002, 0.1), 0, 0.24, 0.6)

# ================================================================ ato 4 — dentro da mente
PROG = [(37.4, 41.0, ["D1", "D2", "A2", "D3", "F3", "A3", "E4"], "D2", "D4"),
        (41.0, 44.3, ["Bb1", "F2", "Bb2", "D3", "F3", "A3"], "Bb1", "F4"),
        (44.3, 46.6, ["Eb2", "Bb2", "Eb3", "G3", "Bb3", "D4"], "Eb2", "G4"),
        (46.6, 48.5, ["G1", "D2", "G2", "Bb2", "D3", "A3"], "G1", "Bb4"),
        (48.5, 50.3, ["A1", "E2", "A2", "C#3", "G3", "Bb3"], "A1", "C#5"),
        (50.3, 53.0, ["A1", "A2", "E3", "G3", "Bb3", "C#4", "E4"], "A1", "E5")]
for i, (t0, t1, notes, root, lead) in enumerate(PROG):
    A.add(t0 - (0 if i == 0 else 0.35), pad([hz(n_) for n_ in notes], t1 - t0 + (0.5 if i == 0 else 0.8), 0.12 if i == 0 else 0.45, 0.8, 0.84), 0, 0.2, 0.55)
    g = 0.17 + 0.012 * i
    ostinato(A, t0, t1, hz(root) * (2 if root[-1] == "1" else 1), g, g + 0.012, octave_up_at=51.4 if i == 5 else None)
    A.add(t0 + 0.05, brass(hz(lead), t1 - t0 - 0.1), 0, 0.105 + 0.01 * i, 0.6)   # tema subindo, degrau por degrau
    A.add(t0 + 0.05, brass(hz(lead) / 2, t1 - t0 - 0.1), 0, 0.075, 0.4)
    if i:
        A.add(t0, braam(hz(root) / (2 if root[-1] == "2" else 1), 2.6), 0, 0.3, 0.45)
drums(A, 38.0, TL["flood"], 0.85)
A.add(38.0, pad(TENSE, 12.3, 9.0, 0.3, 0.6, 0.6), 0, 0.07, 0.85)
d = TL["cut"] - TL["inside"]
t = tt(d)
A.add(TL["inside"], edges(filt(noise(d), "band", [300, 1800]) * (0.6 + 0.4 * np.sin(PI2 * 0.17 * t)), 0.3, 0.01), 0, 0.018, 0.5)
DARK_HI = [f * 2 for f in DARK[2:]]
th = [q for q in ev["thoughts"] if q[0] < TL["cut"]]
for i, (ta, px, cat, *_) in enumerate(th):
    lo = max(0, i - 4)
    rate = (i - lo) / max(0.05, ta - th[lo][0]) if i > lo else 6
    g = 0.085 / (1 + rate / 12)
    f = DARK_HI[int(abs(np.sin(ta * 12.9898) * 43758.5453) % 1 * len(DARK_HI))]
    pan = float(np.clip(px, -0.9, 0.9))
    if cat == "k":
        A.add(ta - 0.03, blip(f, 0.08), pan, g * 0.5, 0.5)
        A.add(ta + 0.05, blip(f * 1.5, 0.06), pan, g * 0.4, 0.5)
    elif cat == "p":
        A.add(ta - 0.03, bell(f, 1.2, 0.6), pan, g * 0.9, 0.7)
    else:
        A.add(ta - 0.03, pluck(f / 2, 0.5, 1.3), pan, g * 1.2, 0.65)
    d = 0.34
    A.add(ta - 0.24, edges(sweep_noise(d, 500, 3200, 1.3) * np.sin(np.pi * tt(d) / d) ** 2, 0.02, 0.05), pan, g * 2.3, 0.3)
MOTIF = [["A4", "D5"], ["D5", "F5", "Eb5"], ["Bb4", "D5", "F5", "A5"], ["A5", "F5", "D5", "Bb4"], ["Eb5", "G5", "Bb5", "D5"],
         ["G4", "Bb4", "D5"], ["Bb4", "A4", "C#5"], ["A4", "C#5", "E5", "G5"]]
for (t0, t1, _), notes in zip(ev["hero"], MOTIF):
    A.add(t0, bell(hz("D2") if notes[0] != "A4" else hz("A1") * 2, 2.6, 0.5), 0, 0.14, 0.7)
    for i, n_ in enumerate(notes):
        A.add(t0 + 0.05 + i * 0.15, bell(hz(n_), 2.3), -0.25 + 0.5 * i / max(1, len(notes) - 1), 0.15, 0.85)
# a enxurrada: tudo acelera
d = TL["cut"] - TL["flood"]
t = tt(d)
u = t / d
A.add(TL["flood"], edges(sweep_noise(d, 280, 12000, 1.6, 1.4) * u ** 2, 0.05, 0.004), 0, 0.55, 0.35)
sh = np.zeros(len(t))
for k in range(6):
    fk = hz("A2") * 2 ** (k * 0.5 + 2.2 * u ** 1.5)
    sh += np.sin(PI2 * np.cumsum(fk) / SR + k) / (k + 1) ** 0.6
A.add(TL["flood"], edges(np.tanh(sh * 1.4) * u ** 2.2, 0.05, 0.004), 0, 0.085, 0.4)
tb, gap = TL["flood"], BEAT / 2
while tb < TL["cut"] - 0.03:
    A.add(tb, taiko(1 if gap > 0.12 else 0.5), 0.3 * rng.uniform(-1, 1), 0.45 + 0.2 * (tb - TL["flood"]) / d, 0.3)
    gap = max(0.055, gap * 0.9)
    tb += gap
for i, tf in enumerate(ev["flood"]):
    A.add(tf, click(1.2), 0.3 * (1 if i % 2 else -1), 0.24, 0.3)
    A.add(tf, bell(hz("A4") * 2 ** (i / 12), 0.7), 0, 0.085, 0.6)
d2 = 1.5
A.add(TL["cut"] - d2, edges(braam(hz("A1"), d2 + 0.5)[:int(d2 * SR)][::-1], 0.3, 0.004), 0, 0.42, 0.3)   # metal invertido crescendo
d2 = 0.74
A.add(TL["cut"] - d2, edges(noise(d2) * (tt(d2) / d2) ** 2.5, 0.01, 0.003), 0, 0.28, 0.2)

# ================================================================ o final
B.add(53.5, edges(filt(noise(6.5), "low", 320), 0.6, 0.8), 0, 0.012, 0.0)
for i in range(14):
    B.add(54.0 + 0.8 * (i + 1) / 14 - 0.012, click(rng.uniform(0.7, 1.0)), rng.uniform(-0.2, 0.2), 0.3, 0.16)
for i in range(30):
    B.add(56.0 + 1.15 * (i + 1) / 30 - 0.012, click(rng.uniform(0.7, 1.0)), rng.uniform(-0.2, 0.2), 0.3, 0.16)
d = 4.6
t = tt(d)
B.add(54.0, edges(np.tanh((np.sin(PI2 * 36.71 * t) + 0.5 * np.sin(PI2 * 73.42 * t) + 0.2 * np.sin(PI2 * 110.1 * t)) * 1.3) * np.clip(t / 3.5, 0, 1), 0.2, 0.3), 0, 0.12, 0.15)
B.add(55.2, pad(TENSE + [hz("Eb6")], 3.3, 3.0, 0.25, 0.6, 0.6), 0, 0.085, 0.85)
i = 0
while 54.9 + i * BEAT < 58.2:
    B.add(54.9 + i * BEAT, tick(1650 if i % 2 else 2100), 0.3 * (1 if i % 2 else -1), 0.06, 0.5)
    i += 1
B.add(56.2, thump(80, 36, 1.2, 0.08), 0, 0.3, 0.2)
for tb in (56.9, 57.95):
    B.add(tb, thump(92, 41, 0.36), 0, 0.38, 0.15)
    B.add(tb + 0.21, thump(108, 50, 0.28), 0, 0.22, 0.15)
d = 1.1
t = tt(d)
B.add(58.4 - d, edges(sweep_noise(d, 300, 7000, 1.4, 1.7) * (t / d) ** 3, 0.01, 0.01), 0, 0.3, 0.4)
# o último golpe: logo depois de ela dizer "olá."
HIT = 59.0
B.add(HIT, braam(hz("D1"), 3.4, 2.8), 0, 0.62, 0.55)
B.add(HIT, thump(150, 33, 2.4, 0.1), 0, 0.85, 0.22)
B.add(HIT, taiko(1), 0, 0.6, 0.45)
B.add(HIT, pad([hz(n_) for n_ in ["D2", "A2", "D3", "F3", "A3"]], 1.7, 0.08, 1.0, 0.84), 0, 0.17, 0.7)
B.add(HIT + 0.05, bell(hz("D5"), 2.4), -0.12, 0.13, 0.9)
B.add(HIT + 0.22, bell(hz("Eb5"), 2.4), 0.12, 0.11, 0.9)

# ================================================================ mixagem
ir = make_ir()
mA, mB = mixdown(A, ir), mixdown(B, ir)
gate = np.ones(N)
c = int(TL["cut"] * SR)
k = int(0.004 * SR)
gate[c - k:c] = np.linspace(1, 0, k)
gate[c:] = 0
mix = mA * gate[:, None] + mB
mix = filt(mix, "high", 28)
mix = mix - 0.3 * filt(mix, "low", 62) + 0.5 * filt(mix, "high", 3200, 1)   # menos subgrave, mais ar
# vozes dos pensamentos (tools/voices.py): a música abaixa um pouco sob as falas
VOZES = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--vozes=")), None)
if VOZES:
    _, vz = wavfile.read(VOZES)
    vz = vz.astype(np.float64)[:N]
    act = filt(np.abs(vz).max(axis=1), "low", 6)
    act = np.clip(maximum_filter1d(act, int(0.25 * SR)) / 0.12, 0, 1)
    act = filt(act, "low", 4)
    mix = mix * (1 - 0.5 * np.clip(act, 0, 1))[:, None] + vz
    if "--niveis" in sys.argv:
        for a_, b_ in [(33, 34), (38, 44), (44, 50.3), (50.3, 53), (54, 60)]:
            seg = vz[int(a_ * SR):int(b_ * SR)]
            print(f"voz {a_}-{b_}s  rms {20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9):6.1f} dB  pico {np.abs(seg).max():5.2f}")
if "--niveis" in sys.argv:   # diagnóstico: RMS e pico por janela de 2 s, antes do limitador
    for i in range(0, int(DUR), 2):
        seg = mix[i * SR:(i + 2) * SR]
        print(f"{i:2d}-{i + 2:2d}s  rms {20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9):6.1f} dB  pico {np.abs(seg).max():5.2f}")
# compressão suave + limitador com antecipação (sem distorcer os impactos)
GANHO = float(next((a.split("=")[1] for a in sys.argv if a.startswith("--ganho=")), 0.8))
mix = np.tanh(mix * 0.45) / 0.45 * GANHO
env = maximum_filter1d(np.abs(mix).max(axis=1), int(0.006 * SR))
gr = np.minimum(1.0, 0.86 / np.maximum(env, 1e-9))
w = np.hanning(int(0.006 * SR))
w /= w.sum()
gr = np.minimum(gr, np.convolve(gr, w, mode="same"))
gr = np.minimum(gr, -maximum_filter1d(-gr, int(0.003 * SR)))
rel = np.exp(-1 / (0.09 * SR))          # liberação de 90 ms
gs = gr.copy()
idx = np.flatnonzero(gr < 0.999)
if len(idx):
    g = 1.0
    for n in range(idx[0], N):
        g = min(gr[n], 1 - (1 - g) * rel)
        gs[n] = g
mix *= gs[:, None]
t = np.arange(N) / SR
mix *= (np.clip(t / 0.4, 0, 1) * np.clip((DUR - 0.02 - t) / 0.5, 0, 1))[:, None]
peak = np.abs(signal.resample_poly(mix, 4, 1, axis=0)).max()   # pico real (sobreamostrado)
mix *= min(1.0, 10 ** (-1.0 / 20) / peak)
wavfile.write(OUT, SR, (mix * 32767).astype(np.int16))
print(f"ok: {OUT} · pico antes da normalização {peak:.3f}")
