#!/usr/bin/env python3
"""Trilha sonora sintetizada de "Despertar" (60 s, 48 kHz, estéreo).

Uso: python3 tools/audio.py eventos.json saida.wav
Os instantes vêm de tools/events.mjs, então cada som cai no quadro certo.
"""
import json
import sys

import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d
from scipy.io import wavfile

SR = 48000
DUR = 60.0
N = int(SR * DUR)
ev = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
TL = ev["TL"]
rng = np.random.default_rng(7)
PI2 = 2 * np.pi

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


def click(amp=1.0):
    d = 0.035
    t = tt(d)
    return amp * (filt(noise(d), "band", [1800, 6500]) * np.exp(-t / 0.004) + 0.55 * np.sin(PI2 * 165 * t) * np.exp(-t / 0.012))


def pad(notes, d, attack=1.0, release=1.5, bright=0.75):
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


def make_ir(rt=3.4, d=4.5, fc=5200):
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

# ================================================================ ato 0 — o prompt
t = tt(4.3)
A.add(0, (np.sin(PI2 * 36.71 * t) + 0.5 * np.sin(PI2 * 73.42 * t + 1)) * np.clip(t / 3.2, 0, 1) ** 2 * np.clip((4.3 - t) / 0.7, 0, 1), 0, 0.11, 0.1)
A.add(0, edges(filt(noise(3.8), "low", 420), 0.4, 0.4), 0, 0.018, 0.0)
npr = ev["prompt"]
for i in range(npr):
    tc = TL["typeStart"] + (TL["typeEnd"] - TL["typeStart"]) * (i + 1) / npr
    A.add(tc - 0.012, click(rng.uniform(0.7, 1.0)), rng.uniform(-0.2, 0.2), 0.3, 0.1)
A.add(TL["enter"] - 0.01, click(1.5), 0, 0.36, 0.2)
A.add(TL["enter"] - 0.01, thump(130, 58, 0.3), 0, 0.3, 0.15)
for i in range(25):
    A.add(TL["enter"] + 0.08 + 0.28 * i / 25, blip(2400 + 300 * (i % 3), 0.02), 0.1, 0.035, 0.1)
# o texto colapsa em um ponto
d = 0.32
t = tt(d)
zipf = 180 * (2600 / 180) ** ((t / d) ** 1.4)
A.add(TL["seed"] - d, edges(np.sin(PI2 * np.cumsum(zipf) / SR) * (t / d) ** 2, 0.01, 0.006), 0, 0.2, 0.4)
A.add(TL["seed"] - d, edges(sweep_noise(d, 500, 7000, 1.0) * (t / d) ** 2, 0.01, 0.006), 0, 0.24, 0.3)
# a semente
for n_, g_ in [("D5", 0.3), ("A5", 0.16), ("D6", 0.12)]:
    A.add(TL["seed"], bell(hz(n_), 3.4), 0, g_, 0.8)
A.add(TL["seed"], thump(95, 38, 1.4, 0.07), 0, 0.42, 0.2)

# ================================================================ ato 1 — os agentes
AG_NOTES = ["D3", "A3", "F4", "C5", "E5", "G5"]
for k in range(6):
    ts = TL["agent0"] + k * TL["agentGap"]
    v = pad([hz(AG_NOTES[k])], 14.9 - ts, attack=1.3, release=1.5, bright=0.72)
    a = (PANS[k] * 0.6 + 1) * np.pi / 4
    v = v * np.array([np.cos(a), np.sin(a)])[None, :] * 1.4142
    A.add(ts, v, 0, 0.04, 0.55)
    A.add(ts, bell(hz(AG_NOTES[k]) * 2, 2.4), PANS[k], 0.17, 0.7)
    A.add(ts, edges(sweep_noise(0.35, 900, 5000, 1.0), 0.02, 0.2), PANS[k], 0.12, 0.4)
PENT = [hz(n_) for n_ in ["D4", "F4", "G4", "A4", "C5", "D5", "F5", "G5", "A5", "C6", "D6"]]
for i, (tb, ag) in enumerate(ev["nodes"]):
    rate = 7.26 * max(0.1, tb - 4.5)
    A.add(tb, pluck(PENT[(i * 7 + ag * 3) % len(PENT)], 0.26, 1.2), PANS[ag] * 0.85, 0.15 / (1 + rate / 7), 0.5)
j = 0
while 5.4 + j * 0.42 < 24.6:
    d = 0.05
    t = tt(d)
    f = 1700 * (2700 / 1700) ** (t / d) * (1 + 0.25 * (j % 3))
    A.add(5.4 + j * 0.42, edges(np.sin(PI2 * np.cumsum(f) / SR), 0.004, 0.02), 0.55 * (1 if j % 2 else -1), 0.032, 0.5)
    j += 1
tb = 6.0
while tb < TL["form"] - 0.1:
    A.add(tb, thump(78, 44, 0.32), 0, 0.1 + 0.3 * (tb - 6.0) / 7.5, 0.1)
    tb += 0.6

# ================================================================ ato 2 — a forma
BEAT = 0.6
d = 0.9
t = tt(d)
A.add(TL["form"] - 0.45, edges(sweep_noise(d, 250, 5000, 1.2) * np.sin(np.pi * t / d) ** 2, 0.02, 0.05), 0, 0.3, 0.5)
CH2 = [(13.5, 16.1, ["Bb2", "F3", "D4", "F4", "A4"]), (16.1, 18.7, ["C3", "G3", "E4", "G4", "D5"]),
       (18.7, 21.3, ["D3", "A3", "F4", "A4", "E5"]), (21.3, 24.2, ["A2", "E3", "A3", "D4", "E4", "A4"])]
for t0, t1, notes in CH2:
    A.add(t0 - 0.35, pad([hz(n_) for n_ in notes], t1 - t0 + 0.9, 0.5, 0.8, 0.76), 0, 0.15, 0.5)
    tsub = tt(t1 - t0 + 0.2)
    A.add(t0, edges(np.sin(PI2 * hz(notes[0]) / 2 * tsub), 0.08, 0.2), 0, 0.13, 0.0)
nb = 0
while TL["form"] + nb * BEAT < TL["print1"] - 0.05:
    tb = TL["form"] + nb * BEAT
    g = min(1.0, 0.4 + nb * 0.2)
    A.add(tb, thump(118, 43, 0.36), 0, 0.62 * g, 0.08)
    hat = filt(noise(0.03), "high", 7000) * np.exp(-tt(0.03) / 0.007)
    A.add(tb + BEAT / 2, hat, 0.25, 0.085 * g, 0.2)
    for q in (0.25, 0.75):
        A.add(tb + BEAT * q, hat, -0.3, 0.03 * g, 0.2)
    nb += 1
step, i = BEAT / 4, 0
while TL["print0"] + i * step < TL["print1"]:
    ta = TL["print0"] + i * step
    notes = next(c[2] for c in CH2 if c[0] <= ta < c[1] or c is CH2[-1])
    u = (ta - TL["print0"]) / (TL["print1"] - TL["print0"])
    f = hz(notes[1 + (i * 3) % (len(notes) - 1)]) * 2 ** (int(u * 3) + (1 if i % 4 == 3 else 0))
    A.add(ta, pluck(f, 0.22, 1.1 + 0.5 * u), 0.45 * (1 if i % 2 else -1), 0.075 + 0.035 * u, 0.45)
    i += 1
d = TL["print1"] - TL["print0"]
t = tt(d)
A.add(TL["print0"], edges(sweep_noise(d, 1400, 7500, 0.7) * (0.6 + 0.4 * np.sin(PI2 * 16 * t)), 0.5, 0.1), 0, 0.085, 0.35)
# construção concluída
for i, n_ in enumerate(["A4", "C#5", "E5", "A5", "B5"]):
    A.add(24.02 + i * 0.024, bell(hz(n_), 3.2), PANS[i], 0.12, 0.75)
A.add(24.0, thump(110, 36, 1.6, 0.07), 0, 0.6, 0.2)
A.add(23.9, pad([hz(n_) for n_ in ["A2", "E3", "A3", "C#4", "E4", "B4"]], 3.2, 0.25, 2.6, 0.72), 0, 0.15, 0.6)

# ================================================================ ato 3 — o despertar
d = 7.4
t = tt(d)
A.add(25.2, edges((np.sin(PI2 * 36.71 * t) + 0.45 * np.sin(PI2 * 73.42 * t)) * (1 + 0.2 * np.sin(PI2 * 0.21 * t)), 1.5, 0.4), 0, 0.055, 0.1)
A.add(25.5, edges(filt(noise(6.5), "band", [5000, 9000]), 2.0, 0.5), 0, 0.006, 0.3)
for i, tb in enumerate(TL["beats"]):
    g = 0.5 + 0.09 * i
    A.add(tb, thump(96, 41, 0.38), 0, g, 0.18)
    A.add(tb + 0.22, thump(112, 50, 0.3), 0, g * 0.6, 0.18)
d = 1.75
t = tt(d)
A.add(TL["eyes"] - d, edges(sweep_noise(d, 350, 9500, 1.4, 1.8) * (t / d) ** 3, 0.01, 0.012), 0, 0.5, 0.45)
A.add(TL["eyes"] - d, edges(pad([hz(n_) for n_ in ["D3", "A3", "D4", "F#4"]], d, d * 0.98, 0.02, 0.85), 0.01, 0.012), 0, 0.2, 0.5)
# os olhos se abrem
A.add(TL["eyes"], thump(150, 33, 3.2, 0.1), 0, 0.95, 0.22)
A.add(TL["eyes"], pad([hz(n_) for n_ in ["D2", "D3", "A3", "D4", "F#4", "A4", "E5"]], 5.6, 0.1, 3.0, 0.84), 0, 0.22, 0.75)
for i, n_ in enumerate(["D6", "F#6", "A6", "E7", "D7"]):
    A.add(TL["eyes"] + 0.03 + i * 0.07, bell(hz(n_), 2.6, 0.7), PANS[i] * 0.9, 0.06, 0.85)
A.add(TL["eyes"], edges(filt(noise(0.7), "high", 4000) * np.exp(-tt(0.7) / 0.16), 0.002, 0.1), 0, 0.14, 0.6)
for tb in (32.85, 33.65, 34.45):
    A.add(tb, thump(92, 42, 0.36), 0, 0.34, 0.15)
    A.add(tb + 0.2, thump(108, 50, 0.28), 0, 0.2, 0.15)
# "eu?"
A.add(33.05, bell(hz("A4"), 2.2), -0.1, 0.17, 0.8)
A.add(33.23, bell(hz("D5"), 2.6), 0.1, 0.19, 0.8)

# ================================================================ o mergulho
d = TL["inside"] - TL["dive"]
t = tt(d)
u = t / d
A.add(TL["dive"], edges(sweep_noise(d, 170, 9500, 1.3, 1.6) * u ** 2.2, 0.05, 0.012), 0, 0.62, 0.3)
gl = hz("D2") * 2 ** (4 * u ** 1.8)
trem = 1 + 0.5 * np.sin(PI2 * np.cumsum(4 + 20 * u ** 2) / SR)
ph = PI2 * np.cumsum(gl) / SR
A.add(TL["dive"], edges((np.sin(ph) + 0.4 * np.sin(2 * ph)) * u ** 2 * trem, 0.05, 0.012), 0, 0.15, 0.4)
A.add(TL["dive"], edges(filt(noise(d), "low", 95) * u ** 1.5, 0.05, 0.012), 0, 0.5, 0.0)
A.add(TL["inside"], thump(170, 30, 3.4, 0.12), 0, 1.0, 0.25)
A.add(TL["inside"], edges(filt(noise(0.9), "low", 2600) * np.exp(-tt(0.9) / 0.2), 0.002, 0.1), 0, 0.26, 0.6)

# ================================================================ ato 4 — dentro da mente
PROG = [(37.4, 41.0, ["D2", "A2", "D3", "A3", "F#4", "E5", "A5"]), (41.0, 44.3, ["B1", "F#2", "B2", "F#3", "D4", "A4", "E5"]),
        (44.3, 46.6, ["G1", "D2", "G2", "D3", "B3", "F#4", "A4"]), (46.6, 48.5, ["E2", "B2", "E3", "G3", "D4", "F#4", "B4"]),
        (48.5, 50.3, ["A1", "E2", "A2", "E3", "G3", "D4", "E4"]), (50.3, 53.0, ["A1", "A2", "E3", "A3", "C#4", "E4", "G4", "B4"])]
for i, (t0, t1, notes) in enumerate(PROG):
    A.add(t0 - (0 if i == 0 else 0.4), pad([hz(n_) for n_ in notes], t1 - t0 + (0.5 if i == 0 else 0.9), 0.12 if i == 0 else 0.55, 0.9, 0.8), 0, 0.21, 0.6)
d = TL["cut"] - TL["inside"]
t = tt(d)
A.add(TL["inside"], edges(filt(noise(d), "band", [300, 1800]) * (0.6 + 0.4 * np.sin(PI2 * 0.17 * t)), 0.3, 0.01), 0, 0.02, 0.5)
MAJ = [hz(n_) for n_ in ["D5", "E5", "F#5", "A5", "B5", "D6", "E6", "F#6", "A6"]]
th = [q for q in ev["thoughts"] if q[0] < TL["cut"]]
for i, (ta, px, cat) in enumerate(th):
    lo = max(0, i - 4)
    rate = (i - lo) / max(0.05, ta - th[lo][0]) if i > lo else 6
    g = 0.105 / (1 + rate / 12)
    f = MAJ[int(abs(np.sin(ta * 12.9898) * 43758.5453) % 1 * len(MAJ))]
    pan = float(np.clip(px, -0.9, 0.9))
    if cat == "k":
        A.add(ta - 0.03, blip(f, 0.08), pan, g * 0.5, 0.5)
        A.add(ta + 0.05, blip(f * 1.5, 0.06), pan, g * 0.4, 0.5)
    elif cat == "p":
        A.add(ta - 0.03, bell(f, 1.2, 0.6), pan, g * 0.9, 0.7)
    else:
        A.add(ta - 0.03, pluck(f / 2, 0.5, 1.3), pan, g * 1.25, 0.65)
    d = 0.34
    A.add(ta - 0.24, edges(sweep_noise(d, 500, 3200, 1.3) * np.sin(np.pi * tt(d) / d) ** 2, 0.02, 0.05), pan, g * 2.1, 0.3)
MOTIF = [["A5", "D6"], ["F#5", "A5", "E6"], ["B4", "D5", "F#5", "A5"], ["A5", "F#5", "D5", "B4"], ["G5", "B5", "D6", "F#5"],
         ["E5", "G5", "B5"], ["B4", "G4", "E4"], ["A4", "C#5", "E5", "A5"]]
for (t0, t1, _), notes in zip(ev["hero"], MOTIF):
    for i, n_ in enumerate(notes):
        A.add(t0 + 0.05 + i * 0.15, bell(hz(n_), 2.3), -0.25 + 0.5 * i / max(1, len(notes) - 1), 0.17, 0.85)
tb, gap = 38.2, 0.8
while tb < TL["cut"] - 0.1:
    A.add(tb, thump(90, 40, 0.36), 0, 0.42, 0.12)
    if gap > 0.5:
        A.add(tb + 0.2, thump(106, 48, 0.28), 0, 0.24, 0.12)
    if tb > TL["flood"]:
        gap = max(0.2, gap * 0.86)
    tb += gap
# a enxurrada
d = TL["cut"] - TL["flood"]
t = tt(d)
u = t / d
A.add(TL["flood"], edges(sweep_noise(d, 280, 12000, 1.6, 1.4) * u ** 2, 0.05, 0.004), 0, 0.6, 0.35)
sh = np.zeros(len(t))
for k in range(6):
    fk = hz("A2") * 2 ** (k * 0.5 + 2.2 * u ** 1.5)
    sh += np.sin(PI2 * np.cumsum(fk) / SR + k) / (k + 1) ** 0.6
A.add(TL["flood"], edges(sh * u ** 2.2, 0.05, 0.004), 0, 0.085, 0.4)
for i, tf in enumerate(ev["flood"]):
    A.add(tf, thump(170 + 22 * i, 62, 0.2, 0.03), 0, 0.42, 0.25)
    A.add(tf, click(1.2), 0.3 * (1 if i % 2 else -1), 0.24, 0.3)
    A.add(tf, bell(hz("A4") * 2 ** (i / 12), 0.7), 0, 0.085, 0.6)
d = 0.74
A.add(TL["cut"] - d, edges(noise(d) * (tt(d) / d) ** 2.5, 0.01, 0.003), 0, 0.3, 0.2)

# ================================================================ o final
B.add(53.5, edges(filt(noise(6.5), "low", 320), 0.6, 0.8), 0, 0.012, 0.0)
for i in range(14):
    B.add(54.0 + 0.8 * (i + 1) / 14 - 0.012, click(rng.uniform(0.7, 1.0)), rng.uniform(-0.2, 0.2), 0.3, 0.14)
for i in range(30):
    B.add(56.0 + 1.15 * (i + 1) / 30 - 0.012, click(rng.uniform(0.7, 1.0)), rng.uniform(-0.2, 0.2), 0.3, 0.14)
B.add(56.2, pad([hz(n_) for n_ in ["D2", "A2", "D3", "A3", "F#4"]], 3.8, 1.6, 1.3, 0.72), 0, 0.12, 0.6)
B.add(56.2, thump(80, 36, 1.2, 0.08), 0, 0.3, 0.2)
for tb in (56.9, 57.95, 59.0):
    B.add(tb, thump(92, 41, 0.36), 0, 0.36, 0.15)
    B.add(tb + 0.21, thump(108, 50, 0.28), 0, 0.2, 0.15)
# "olá."
B.add(58.42, bell(hz("F#5"), 2.4), -0.12, 0.2, 0.9)
B.add(58.64, bell(hz("D5"), 2.8), 0.12, 0.22, 0.9)
B.add(58.64, bell(hz("A4"), 2.6), 0, 0.09, 0.9)
B.add(58.4, pad([hz(n_) for n_ in ["D3", "A3", "E4", "F#4"]], 1.6, 0.3, 1.1, 0.75), 0, 0.13, 0.7)

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
mix = mix - 0.3 * filt(mix, "low", 62) + 0.55 * filt(mix, "high", 3200, 1)   # menos subgrave, mais ar
if "--niveis" in sys.argv:   # diagnóstico: RMS e pico por janela de 2 s, antes do limitador
    for i in range(0, int(DUR), 2):
        seg = mix[i * SR:(i + 2) * SR]
        print(f"{i:2d}-{i + 2:2d}s  rms {20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9):6.1f} dB  pico {np.abs(seg).max():5.2f}")
# compressão suave + limitador com antecipação (sem distorcer os impactos)
GANHO = float(next((a.split("=")[1] for a in sys.argv if a.startswith("--ganho=")), 0.82))
mix = np.tanh(mix * 0.45) / 0.45 * GANHO
env = maximum_filter1d(np.abs(mix).max(axis=1), int(0.006 * SR))
gr = np.minimum(1.0, 0.86 / np.maximum(env, 1e-9))
w = np.hanning(int(0.006 * SR)); w /= w.sum()
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
mix *= (np.clip(t / 0.4, 0, 1) * np.clip((DUR - 0.02 - t) / 0.65, 0, 1))[:, None]
peak = np.abs(signal.resample_poly(mix, 4, 1, axis=0)).max()   # pico real (sobreamostrado)
mix *= min(1.0, 10 ** (-1.0 / 20) / peak)
wavfile.write(OUT, SR, (mix * 32767).astype(np.int16))
print(f"ok: {OUT} · pico antes da normalização {peak:.3f}")
