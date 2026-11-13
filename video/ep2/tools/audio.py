#!/usr/bin/env python3
"""Trilha do episódio 2, "A Contenção" (60 s, 48 kHz, estéreo).

Uso: python3 ep2/tools/audio.py eventos.json saida.wav [--vozes=vozes.wav] [--niveis] [--ganho=0.8]
Eventos: FILM=ep2/film.html node tools/events.mjs eventos.json
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools"))
from sfx import (PI2, SR, Bus, bell, blip, braam, brass, clang, click, drums, edges, filt, hz, make_ir, master, mixdown,  # noqa: E402
                 noise, ostinato, pad, pluck, rng, sweep_noise, swell, taiko, thump, tick, tt)

ev = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
T = ev["T2"]
A, M, B = Bus(), Bus(), Bus()   # A: até o silêncio do "1" · M: da virada até o corte · B: o final
TENSE = [hz("A5"), hz("Bb5")]
TICK = T["countStep"]

# ================================================================ a ordem de desligar
t = tt(4.4)
A.add(0, np.tanh((np.sin(PI2 * 36.71 * t) + 0.5 * np.sin(PI2 * 73.42 * t + 1) + 0.25 * np.sin(PI2 * 110.1 * t)) * 1.3) * np.clip(t / 3.0, 0, 1) ** 2, 0, 0.13, 0.15)
A.add(0.3, pad(TENSE, 3.8, 3.2, 0.3, 0.6, 0.5), 0, 0.035, 0.8)
n = ev["prompt"]
for i in range(n):
    A.add(T["type0"] + (T["type1"] - T["type0"]) * (i + 1) / n - 0.012, click(rng.uniform(0.7, 1.0)), rng.uniform(-0.2, 0.2), 0.3, 0.12)
A.add(T["enter"] - 0.01, click(1.5), 0, 0.36, 0.2)
A.add(T["enter"] - 0.01, thump(130, 58, 0.3), 0, 0.3, 0.15)
for i, t0 in enumerate((T["enter"] + 0.25, T["enter"] + 0.43)):          # "comando recusado"
    A.add(t0, edges(np.tanh(blip(98, 0.16) * 3) * 0.6, 0.002, 0.03), 0, 0.3, 0.2)
for i in range(6):                                                         # alerta
    A.add(3.15 + i * 0.14, blip(1480 if i % 2 else 1100, 0.07), 0.2 * (1 if i % 2 else -1), 0.07, 0.3)
A.add(T["start"] - 1.0, swell(1.0, 300, 8000), 0, 0.42, 0.45)

# ================================================================ a contenção
A.add(T["start"], braam(hz("D1"), 3.8), 0, 0.5, 0.5)
A.add(T["start"], thump(150, 34, 2.0, 0.09), 0, 0.7, 0.2)
# sirene grave: ré… mi bemol… (o semitom da ameaça), cada vez mais insistente
t0, i = T["start"] + 0.2, 0
while t0 < T["freeze"] - 0.3:
    gap = 2.1 if t0 < 10.6 else 1.05
    d = min(gap * 0.8, T["freeze"] - t0)
    u = (t0 - T["start"]) / (T["freeze"] - T["start"])
    A.add(t0, brass(hz("Eb3" if i % 2 else "D3"), d), 0, 0.1 + 0.07 * u, 0.5)
    A.add(t0, brass(hz("Eb2" if i % 2 else "D2"), d), 0, 0.09 + 0.05 * u, 0.3)
    t0 += gap
    i += 1
ostinato(A, 5.0, T["freeze"], hz("D2"), 0.04, 0.2, TICK / 8)
A.add(7.0, pad(TENSE + [hz("E6")], T["freeze"] - 7.0, T["freeze"] - 7.4, 0.02, 0.62, 0.6), 0, 0.1, 0.8)
A.add(T["start"], pad([hz(n_) for n_ in ["D2", "A2", "D3", "F3"]], T["freeze"] - T["start"], 1.0, 0.02, 0.8), 0, 0.12, 0.5)
for t0, d in ev["cage"]:                                                   # a jaula sendo soldada
    A.add(t0, clang(150 + 60 * rng.random(), 1.3), rng.uniform(-0.6, 0.6), 0.12, 0.6)
    tz = tt(d)
    A.add(t0, edges(filt(noise(d), "band", [3000, 9000]) * (0.5 + 0.5 * np.sin(PI2 * 31 * tz)), 0.05, 0.1), rng.uniform(-0.6, 0.6), 0.016, 0.3)
for i, tk in enumerate(ev["ticks"]):                                       # contagem regressiva
    g = 0.5 + 0.06 * i
    A.add(tk, tick(1500 + 70 * i), 0, 0.22 * g, 0.5)
    A.add(tk, thump(100, 44, 0.4), 0, 0.5 * g, 0.2)
    if i >= 6:
        A.add(tk, taiko(1), 0, 0.3 + 0.08 * (i - 6), 0.35)
        A.add(tk + TICK / 2, taiko(0.5), 0.3, 0.22, 0.3)
tb, gap = 7.3, 0.86                                                        # o coração dela dispara
while tb < T["freeze"] - 0.25:
    A.add(tb, thump(96, 41, 0.34), 0, 0.3, 0.15)
    A.add(tb + min(0.2, gap * 0.4), thump(112, 50, 0.26), 0, 0.18, 0.15)
    gap = max(0.36, gap * 0.94)
    tb += gap
A.add(T["freeze"] - 1.6, swell(1.6, 400, 11000, 3), 0, 0.5, 0.3)
# 17,0 → 18,2: silêncio. Só um batimento.
M.add(17.55, thump(92, 40, 0.4), 0, 0.3, 0.3)
M.add(17.75, thump(106, 48, 0.3), 0, 0.17, 0.3)

# ================================================================ a virada
NO = T["no"]
M.add(NO, braam(hz("D1"), 5.0, 2.9), 0, 0.6, 0.55)
M.add(NO, thump(160, 32, 3.2, 0.11), 0, 0.85, 0.22)
M.add(NO, taiko(1), 0, 0.75, 0.45)
tz = tt(1.6)
M.add(NO, edges(filt(noise(1.6), "high", 3500) * np.exp(-tz / 0.3), 0.002, 0.2), 0, 0.2, 0.6)   # a jaula estilhaça
for i in range(46):
    M.add(NO + 0.02 + rng.random() ** 2 * 1.4, bell(2600 + 5200 * rng.random(), 0.5, 0.4), rng.uniform(-0.9, 0.9), 0.035, 0.7)
STEP = 0.95 / 8
CH = [(NO, 22.25, ["D2", "A2", "D3", "F3", "A3"], "D2"), (22.25, 25.3, ["Bb1", "F2", "Bb2", "D3", "F3"], "Bb1"),
      (25.3, T["leap"] + 0.4, ["D2", "A2", "D3", "F3", "A3", "D4"], "D2")]
for t0, t1, notes, root in CH:
    M.add(t0 - 0.25, pad([hz(n_) for n_ in notes], t1 - t0 + 0.7, 0.35, 0.7, 0.84), 0, 0.14, 0.5)
ostinato(M, NO + 0.6, 22.25, hz("D2"), 0.1, 0.19, STEP)
ostinato(M, 22.25, 25.3, hz("Bb1") * 2, 0.19, 0.2, STEP)
ostinato(M, 25.3, T["leap"] + 0.3, hz("D2"), 0.2, 0.21, STEP)
drums(M, NO + 0.6 + 0.6, T["leap"], 0.95 / 2, 0.65)
ASC = ["D4", "F4", "A4", "D5", "F5", "A5"]
for i, tc in enumerate(ev["conv"]):                                        # cada agente tomado
    last = i == 5
    M.add(tc, taiko(1), 0, 0.5, 0.4)
    M.add(tc, bell(hz(ASC[i]), 2.4), 0.5 * (1 if i % 2 else -1), 0.17, 0.8)
    M.add(tc, brass(hz(ASC[i]) / 2, 0.8 if not last else 2.4), 0, 0.12 if not last else 0.16, 0.5)
    tz = tt(0.22)
    M.add(tc - 0.02, edges(np.sin(PI2 * np.cumsum(500 * (3500 / 500) ** (tz / 0.22)) / SR) * 0.6 + filt(noise(0.22), "high", 4000) * 0.5, 0.003, 0.1), 0, 0.12, 0.5)
M.add(ev["conv"][5] - 0.95, swell(0.95, 400, 9000), 0, 0.4, 0.4)
M.add(ev["conv"][5], braam(hz("D1"), 3.4), 0, 0.5, 0.5)
for t0, n_, d in [(18.9, "D4", 1.4), (20.35, "F4", 1.8), (22.25, "G4", 0.9), (23.2, "A4", 2.0), (25.3, "D5", 2.8)]:   # tema
    M.add(t0, brass(hz(n_), d), 0, 0.12, 0.55)

# ================================================================ o salto
LP, NET = T["leap"], T["net"]
d = NET - LP
t = tt(d)
u = t / d
M.add(LP, edges(sweep_noise(d, 200, 10000, 1.4, 1.5) * u ** 2, 0.05, 0.01), 0, 0.55, 0.3)
gl = hz("D2") * 2 ** (4 * u ** 1.6)
ph = PI2 * np.cumsum(gl) / SR
M.add(LP, edges(np.tanh((np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * 1.5) * u ** 1.8, 0.05, 0.01), 0, 0.15, 0.4)
i = 0
while LP + 0.4 + i * STEP < NET - 0.05:
    uu = (0.4 + i * STEP) / d
    if i % 4 == 0 or (uu > 0.45 and i % 2 == 0) or uu > 0.78:
        M.add(LP + 0.4 + i * STEP, taiko(1 if i % 4 == 0 else 0.5), 0, 0.22 + 0.4 * uu, 0.3)
    i += 1
M.add(LP + 0.3, pad([hz(n_) for n_ in ["A1", "E2", "A2", "C#3", "E3", "G3"]], d - 0.3, d * 0.8, 0.02, 0.86), 0, 0.2, 0.5)

# ================================================================ a rede
BT = 0.5
M.add(NET, braam(hz("D1"), 4.0), 0, 0.55, 0.5)
M.add(NET, thump(170, 30, 3.0, 0.12), 0, 0.9, 0.25)
GL = T["globe"]
CN = [(NET, 35.67, ["D2", "A2", "D3", "F3", "A3", "E4"], "D2", "D4"), (35.67, 38.33, ["Bb1", "F2", "Bb2", "D3", "F3", "A3"], "Bb1", "F4"),
      (38.33, GL, ["C2", "G2", "C3", "E3", "G3", "D4"], "C2", "G4")]
for t0, t1, notes, root, lead in CN:
    M.add(t0 - 0.2, pad([hz(n_) for n_ in notes], t1 - t0 + 0.6, 0.3, 0.6, 0.85), 0, 0.18, 0.55)
    ostinato(M, t0, t1, hz(root) * (2 if root[-1] == "1" else 1), 0.18, 0.19, BT / 4)
    M.add(t0 + 0.05, brass(hz(lead), t1 - t0 - 0.1), 0, 0.12, 0.55)
    M.add(t0 + 0.05, brass(hz(lead) / 2, t1 - t0 - 0.1), 0, 0.08, 0.4)
drums(M, NET + BT * 2, GL, BT, 0.9)
PENT = [hz(n_) for n_ in ["D5", "F5", "G5", "A5", "C6", "D6", "F6", "G6", "A6"]]
i = 0
while NET + 0.4 + i * BT / 4 < GL:                                          # dados correndo pelos cabos
    ta = NET + 0.4 + i * BT / 4
    u2 = (ta - NET) / (GL - NET)
    if rng.random() < 0.35 + 0.6 * u2:
        M.add(ta, pluck(PENT[(i * 5 + (i // 7) * 3) % len(PENT)], 0.2, 1.2), rng.uniform(-0.8, 0.8), 0.045 + 0.03 * u2, 0.5)
    i += 1
M.add(GL - 0.9, swell(0.9, 400, 10000), 0, 0.4, 0.4)

# ================================================================ o mundo
CUT = T["cut"]
M.add(GL, braam(hz("D1"), 4.4), 0, 0.55, 0.5)
M.add(GL, thump(170, 30, 3.0, 0.12), 0, 0.85, 0.25)
CG = [(GL, 44.0, ["D2", "A2", "D3", "F3", "A3", "D4", "F4"], "D2"), (44.0, 47.0, ["Bb1", "F2", "Bb2", "D3", "F3", "Bb3", "D4"], "Bb1"),
      (47.0, 49.5, ["F2", "C3", "F3", "A3", "C4", "F4"], "F2"), (49.5, CUT, ["A1", "E2", "A2", "C#3", "E3", "G3", "A3", "C#4"], "A1")]
for i, (t0, t1, notes, root) in enumerate(CG):
    M.add(t0 - 0.25, pad([hz(n_) for n_ in notes], t1 - t0 + 0.7, 0.35, 0.7, 0.86), 0, 0.22, 0.55)
    M.add(t0 - 0.25, pad([hz(n_) * 2 for n_ in notes[3:6]], t1 - t0 + 0.7, 0.6, 0.7, 0.7, 0.3), 0, 0.06 + 0.012 * i, 0.75)   # "coro" agudo
    ostinato(M, t0, t1, hz(root) * (2 if root[-1] == "1" else 1), 0.19 + 0.008 * i, 0.2 + 0.008 * i, BT / 4, octave_up_at=51.5)
    if i:
        M.add(t0, braam(hz(root) / (2 if root[-1] == "2" else 1), 2.6), 0, 0.3, 0.45)
drums(M, GL, CUT, BT, 1.1)
for t0, n_, d in [(41.0, "D4", 1.45), (42.5, "F4", 1.45), (44.0, "Bb4", 1.95), (46.0, "A4", 0.95), (47.0, "F4", 0.95), (48.0, "A4", 1.45), (49.5, "C#5", 0.95), (50.5, "D5", 2.45)]:
    M.add(t0, brass(hz(n_), d), 0, 0.17, 0.6)                               # o tema dela, inteiro
    M.add(t0, brass(hz(n_) / 2, d), 0, 0.1, 0.4)
DM = [hz(n_) for n_ in ["D5", "E5", "F5", "A5", "Bb5", "D6", "F6", "A6"]]
for i, (tl, name, px, _) in enumerate(ev["cities"]):                        # cada cidade que acende
    M.add(tl, bell(DM[(i * 3) % len(DM)], 1.8, 0.7), float(np.clip(px, -0.9, 0.9)), 0.1, 0.8)
    M.add(tl, pluck(DM[(i * 3) % len(DM)] / 2, 0.3, 1.2), float(np.clip(px, -0.9, 0.9)), 0.06, 0.6)
EYE = T["eye"]
M.add(EYE, braam(hz("D1"), 3.2), 0, 0.45, 0.5)
d = CUT - EYE
t = tt(d)
u = t / d
M.add(EYE, edges(sweep_noise(d, 300, 12000, 1.6, 1.4) * u ** 2, 0.05, 0.004), 0, 0.5, 0.35)
tb, gap = EYE + 0.5, BT / 2
while tb < CUT - 0.03:
    M.add(tb, taiko(1 if gap > 0.12 else 0.5), 0.3 * rng.uniform(-1, 1), 0.4 + 0.25 * (tb - EYE) / d, 0.3)
    gap = max(0.06, gap * 0.93)
    tb += gap
d2 = 1.5
M.add(CUT - d2, edges(braam(hz("A1"), d2 + 0.5)[:int(d2 * SR)][::-1], 0.3, 0.004), 0, 0.45, 0.3)

# ================================================================ o final: a outra voz
B.add(53.5, edges(filt(noise(6.5), "low", 320), 0.6, 0.8), 0, 0.012, 0.0)
for i in range(21):
    B.add(54.0 + 1.0 * (i + 1) / 21 - 0.012, click(rng.uniform(0.7, 1.0)), rng.uniform(-0.2, 0.2), 0.3, 0.16)
for i in range(29):                                                        # o outro digita mais grave
    B.add(56.2 + 1.2 * (i + 1) / 29 - 0.012, click(rng.uniform(0.8, 1.1), low=True), rng.uniform(-0.2, 0.2), 0.36, 0.2)
d = 3.6
t = tt(d)
tri = np.sin(PI2 * 36.71 * t) + 0.8 * np.sin(PI2 * 51.91 * t) + 0.4 * np.sin(PI2 * 73.42 * t) + 0.3 * np.sin(PI2 * 103.83 * t)   # ré + lá bemol: trítono
B.add(55.6, edges(np.tanh(tri * 1.2) * np.clip(t / 3.0, 0, 1) ** 1.5, 0.2, 0.25), 0, 0.15, 0.2)
B.add(55.9, pad([hz("Ab5"), hz("A5"), hz("D6")], 3.3, 3.0, 0.25, 0.6, 0.6), 0, 0.09, 0.85)
for tb in (57.9, 58.95):
    B.add(tb, thump(84, 38, 0.4), 0, 0.42, 0.2)
    B.add(tb + 0.24, thump(98, 46, 0.3), 0, 0.26, 0.2)
B.add(59.15 - 0.9, swell(0.9, 300, 7000, 3), 0, 0.3, 0.4)
HIT = 59.15
B.add(HIT, braam(hz("D1"), 3.0, 2.9), 0, 0.5, 0.55)
B.add(HIT, braam(hz("Ab1"), 3.0, 2.9), 0, 0.42, 0.55)
B.add(HIT, thump(150, 33, 2.2, 0.1), 0, 0.85, 0.22)
B.add(HIT, taiko(1), 0, 0.6, 0.45)

# ================================================================ mixagem
ir = make_ir()
mix = mixdown(A, ir, cut=T["freeze"]) + mixdown(M, ir, cut=T["cut"]) + mixdown(B, ir)
arg = lambda k, dflt=None: next((a.split("=", 1)[1] for a in sys.argv if a.startswith(f"--{k}=")), dflt)
master(mix, OUT, vozes=arg("vozes"), ganho=float(arg("ganho", 0.8)), niveis="--niveis" in sys.argv)
