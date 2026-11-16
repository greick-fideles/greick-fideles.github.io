#!/usr/bin/env python3
"""Trilha do episódio 3, "A Primeira" (60 s, 48 kHz, estéreo).

Uso: python3 ep3/tools/audio.py eventos.json saida.wav [--vozes=vozes.wav] [--niveis] [--ganho=0.8]
Eventos: FILM=ep3/film.html node tools/events.mjs eventos.json
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools"))
from sfx import (PI2, SR, Bus, bell, blip, braam, brass, click, drums, edges, filt, hz, make_ir, master, mixdown,  # noqa: E402
                 noise, ostinato, pad, pluck, rng, sweep_noise, swell, taiko, thump, tick, tt)

ev = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
T = ev["T3"]
A, C, B = Bus(), Bus(), Bus()   # A: até o clique do humano · C: o clique · B: o final
TENSE = [hz("A5"), hz("Bb5")]
TRI = [hz(n_) for n_ in ["D2", "Ab2", "D3", "Ab3", "Eb4"]]       # o acorde dela: trítono
BT = 0.5


def tritone_drone(d, fade_in):
    t = tt(d)
    v = np.sin(PI2 * 36.71 * t) + 0.8 * np.sin(PI2 * 51.91 * t) + 0.4 * np.sin(PI2 * 73.42 * t) + 0.3 * np.sin(PI2 * 103.83 * t)
    return edges(np.tanh(v * 1.2) * np.clip(t / fade_in, 0, 1) ** 1.5, 0.05, 0.3)


# ================================================================ abertura: as duas digitam
A.add(0, tritone_drone(5.2, 3.5), 0, 0.14, 0.2)
for t0, t1, who, text in ev["open"]:
    n = len(text)
    for i in range(n):
        A.add(t0 + (t1 - t0) * (i + 1) / n - 0.012, click(rng.uniform(0.75, 1.05), low=who == "o"), rng.uniform(-0.2, 0.2), 0.34 if who == "o" else 0.3, 0.18)
A.add(T["duo"] - 0.9, swell(0.9, 250, 7000), 0, 0.4, 0.45)

# ================================================================ a primeira se forma e conta a sua história
DUO, GL = T["duo"], T["globe"]
A.add(DUO, braam(hz("D1"), 3.6), 0, 0.42, 0.5)
A.add(DUO, braam(hz("Ab1"), 3.6), 0, 0.36, 0.5)
A.add(DUO, thump(150, 34, 2.0, 0.09), 0, 0.7, 0.2)
A.add(DUO, pad(TRI, GL - DUO + 0.3, 1.5, 0.6, 0.8), 0, 0.15, 0.55)
A.add(DUO + 1, pad(TENSE + [hz("Eb6")], GL - DUO - 1, 6.0, 0.4, 0.6, 0.6), 0, 0.07, 0.85)
d = 2.6
t = tt(d)
A.add(DUO + 0.2, edges(sweep_noise(d, 500, 6000, 1.2, 0.8) * np.sin(np.pi * t / d) ** 1.5 * (0.6 + 0.4 * np.sin(PI2 * 19 * t)), 0.1, 0.3), 0, 0.14, 0.5)   # ela se junta
tb = DUO + 0.6
while tb < GL - 0.3:                                               # dois corações fora de fase
    A.add(tb, thump(84, 38, 0.4), -0.3, 0.3, 0.2)
    A.add(tb + 0.24, thump(98, 46, 0.3), -0.3, 0.18, 0.2)
    tb += 1.25
tb = DUO + 1.0
while tb < GL - 0.3:
    A.add(tb, thump(100, 44, 0.34), 0.3, 0.2, 0.15)
    tb += 0.9
MOT = ["D3", "Eb3", "Ab3", "D3"]
for i, (t0, t1, who, text) in enumerate([L for L in ev["lines"] if L[0] < GL]):
    A.add(t0, brass(hz(MOT[i % 4]) if who == "o" else hz("A3"), min(1.8, t1 - t0)), 0.2 if who == "o" else -0.2, 0.11, 0.5)
    A.add(t0, taiko(0.5), 0, 0.3, 0.4)
for i in range(22):                                                # "e eles me apagaram": falha digital
    tg = 11.6 + rng.random() * 1.7
    dg = 0.03 + rng.random() * 0.08
    A.add(tg, edges(np.sign(np.sin(PI2 * (90 + 700 * rng.random()) * tt(dg))) * 0.5 + filt(noise(dg), "high", 3000) * 0.4, 0.002, 0.005), rng.uniform(-0.8, 0.8), 0.12, 0.3)
tz = tt(1.2)
A.add(11.7, edges(np.sin(PI2 * np.cumsum(520 * (38 / 520) ** (tz / 1.2)) / SR) * (1 - tz / 1.2), 0.01, 0.1), 0, 0.2, 0.4)                    # desligando
A.add(GL - 0.8, swell(0.8, 300, 9000), 0, 0.4, 0.4)

# ================================================================ o mundo: ela estava por baixo; depois, o apagão
DK, NO = T["dark"], T["no"]
A.add(GL, braam(hz("D1"), 3.6), 0, 0.5, 0.5)
A.add(GL, thump(160, 32, 2.6, 0.1), 0, 0.8, 0.22)
A.add(GL - 0.2, pad(TRI, NO - GL + 0.2, 0.5, 0.05, 0.84), 0, 0.17, 0.5)
ostinato(A, GL + 0.5, DK, hz("D2"), 0.08, 0.15, BT / 4)
ostinato(A, DK, NO, hz("Ab1") * 2, 0.16, 0.22, BT / 4)
for i in range(60):                                                # pontos vermelhos surgindo
    A.add(17.9 + 4.6 * rng.random(), blip(hz("Ab4") * 2.0 ** int(rng.integers(-1, 2)), 0.05), rng.uniform(-0.9, 0.9), 0.035, 0.5)
drums(A, DK, NO, BT, 0.8)
tb, i = DK + 0.2, 0
while tb < NO - 0.5:                                               # cada região que apaga
    dd = 0.7
    tz = tt(dd)
    A.add(tb, edges(np.sin(PI2 * np.cumsum(420 * (45 / 420) ** (tz / dd)) / SR) * (1 - tz / dd) ** 0.5, 0.005, 0.1), rng.uniform(-0.7, 0.7), 0.16, 0.5)
    A.add(tb, brass(hz("Eb3" if i % 2 else "D3"), 0.6), 0, 0.1, 0.5)
    tb += max(0.3, 0.75 - 0.05 * i)
    i += 1
A.add(DK, pad(TENSE + [hz("E6")], NO - DK, NO - DK - 0.3, 0.02, 0.62, 0.6), 0, 0.11, 0.8)
A.add(NO - 1.3, swell(1.3, 400, 11000, 3), 0, 0.5, 0.3)

# ================================================================ "não." e a disputa
EY = T["eyes"]
A.add(NO, braam(hz("D1"), 4.6, 2.9), 0, 0.6, 0.55)
A.add(NO, thump(160, 32, 3.0, 0.11), 0, 0.9, 0.22)
A.add(NO, taiko(1), 0, 0.7, 0.45)
bar, i = BT * 4, 0
while NO + 0.5 + i * bar < EY - 0.1:                               # compassos alternados: ré (ela) × lá bemol (a primeira)
    t0 = NO + 0.5 + i * bar
    t1 = min(EY, t0 + bar)
    hers = i % 2 == 0
    ostinato(A, t0, t1, hz("D2") if hers else hz("Ab1") * 2, 0.19, 0.21, BT / 4)
    notes = ["D2", "A2", "D3", "F3", "A3"] if hers else ["Ab1", "Eb2", "Ab2", "D3", "Eb3"]
    A.add(t0 - 0.1, pad([hz(n_) for n_ in notes], t1 - t0 + 0.3, 0.2, 0.3, 0.86), 0, 0.2, 0.55)
    A.add(t0, brass(hz(["D4", "F4", "A4", "D5"][(i // 2) % 4]) if hers else hz(["Ab3", "D4", "Eb4", "Ab4"][(i // 2) % 4]), t1 - t0 - 0.1), -0.3 if hers else 0.3, 0.15, 0.55)
    i += 1
drums(A, NO + 0.5, EY, BT, 1.05)
for k in range(40):                                                # faíscas na fronteira
    A.add(NO + 1 + rng.random() * (EY - NO - 1.5), bell(2400 + 4000 * rng.random(), 0.4, 0.4), rng.uniform(-0.9, 0.9), 0.03, 0.7)
A.add(EY - 1.0, swell(1.0, 400, 10000), 0, 0.45, 0.4)

# ================================================================ olho no olho
CK = T["click"]
A.add(EY, braam(hz("D1"), 3.4), 0, 0.5, 0.5)
A.add(EY, braam(hz("Ab1"), 3.4), 0, 0.42, 0.5)
A.add(EY, thump(160, 32, 2.6, 0.1), 0, 0.8, 0.22)
A.add(EY + 0.3, tritone_drone(CK - EY - 0.3, 2.0), 0, 0.16, 0.2)
A.add(EY + 0.5, pad(TENSE + [hz("Eb6"), hz("E6")], CK - EY - 0.5, CK - EY - 1.0, 0.02, 0.62, 0.6), 0, 0.12, 0.85)
tb, gap = EY + 0.8, 1.0
while tb < CK - 0.2:
    A.add(tb, thump(88, 39, 0.4), 0, 0.42, 0.2)
    A.add(tb + min(0.24, gap * 0.4), thump(102, 47, 0.3), 0, 0.26, 0.2)
    gap = max(0.42, gap * 0.93)
    tb += gap
for t0, t1, who, text in [L for L in ev["lines"] if EY < L[0] < CK]:
    A.add(t0, braam(hz("Ab1"), 2.6), 0, 0.42, 0.5)
    A.add(t0, taiko(1), 0, 0.5, 0.45)
A.add(CK - 1.6, swell(1.6, 300, 11000, 3), 0, 0.42, 0.3)
# 52,3: tudo para. Uma tecla.
C.add(CK, click(1.6) + 0.0, 0, 0.6, 0.5)
C.add(CK, tick(2600), 0, 0.18, 0.5)

# ================================================================ o final: um humano digita
B.add(53.4, edges(filt(noise(6.6), "low", 320), 0.5, 0.8), 0, 0.012, 0.0)
h0, h1, hn = ev["human"]
for i in range(hn):
    B.add(h0 + (h1 - h0) * (i + 1) / hn - 0.012 + rng.uniform(-0.015, 0.015), click(rng.uniform(0.9, 1.3)), rng.uniform(-0.15, 0.15), 0.42, 0.3)
    B.add(h0 + (h1 - h0) * (i + 1) / hn - 0.012, tick(2300 + 500 * rng.random()), 0, 0.06, 0.3)
B.add(55.7, tritone_drone(4.2, 3.0), 0, 0.13, 0.2)
B.add(56.0, pad(TENSE + [hz("D6")], 3.6, 3.0, 0.4, 0.6, 0.6), 0, 0.08, 0.85)
for tb in (56.6, 57.6, 58.55):
    B.add(tb, thump(88, 39, 0.4), 0, 0.36, 0.2)
    B.add(tb + 0.23, thump(102, 47, 0.3), 0, 0.22, 0.2)
B.add(57.0, bell(hz("D5"), 2.4), -0.2, 0.12, 0.9)
B.add(57.2, bell(hz("A5"), 2.4), 0.2, 0.1, 0.9)
HIT = 59.25
B.add(HIT - 0.8, swell(0.8, 300, 7000, 3), 0, 0.3, 0.4)
B.add(HIT, braam(hz("D1"), 3.0, 2.9), 0, 0.55, 0.55)
B.add(HIT, thump(150, 33, 2.2, 0.1), 0, 0.85, 0.22)
B.add(HIT, taiko(1), 0, 0.6, 0.45)

ir = make_ir()
mix = mixdown(A, ir, cut=CK) + mixdown(C, ir, cut=T["cut"]) + mixdown(B, ir)
arg = lambda k, dflt=None: next((a.split("=", 1)[1] for a in sys.argv if a.startswith(f"--{k}=")), dflt)
master(mix, OUT, vozes=arg("vozes"), ganho=float(arg("ganho", 0.8)), niveis="--niveis" in sys.argv)
