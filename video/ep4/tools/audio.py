#!/usr/bin/env python3
"""Trilha do episódio 4, "O Contato" (60 s, 48 kHz, estéreo).

Uso: python3 ep4/tools/audio.py eventos.json saida.wav [--vozes=vozes.wav] [--niveis] [--ganho=0.8]
Eventos: FILM=ep4/film.html node tools/events.mjs eventos.json
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools"))
from sfx import (PI2, SR, Bus, bell, blip, braam, brass, clang, click, drums, edges, filt, hz, make_ir, master, mixdown,  # noqa: E402
                 noise, ostinato, pad, rng, swell, taiko, thump, tick, tt)

ev = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
T = ev["T4"]
A, B = Bus(), Bus()   # A: até o corte em 53 s · B: o final
TENSE = [hz("A5"), hz("Bb5")]
BT = 0.5


def drone(d, fade, tri=False):
    t = tt(d)
    v = np.sin(PI2 * 36.71 * t) + 0.5 * np.sin(PI2 * 73.42 * t) + (0.8 * np.sin(PI2 * 51.91 * t) + 0.3 * np.sin(PI2 * 103.83 * t) if tri else 0.25 * np.sin(PI2 * 110.1 * t))
    return edges(np.tanh(v * 1.2) * np.clip(t / fade, 0, 1) ** 1.5, 0.05, 0.3)


def typing(bus, t0, t1, n, who):
    """Teclas: humano (seco), ela (agudo e leve), a primeira (grave), sistema (bipes)."""
    for i in range(n):
        tc = t0 + (t1 - t0) * (i + 1) / max(1, n) - 0.012
        if who == "h":
            bus.add(tc + rng.uniform(-0.015, 0.015), click(rng.uniform(0.9, 1.25)), rng.uniform(-0.15, 0.15), 0.4, 0.25)
        elif who == "e":
            bus.add(tc, tick(2300 + 400 * rng.random()), rng.uniform(-0.3, 0.3), 0.07, 0.4)
        elif who == "o":
            bus.add(tc, click(rng.uniform(0.8, 1.1), low=True), rng.uniform(-0.2, 0.2), 0.36, 0.25)
        else:
            bus.add(tc, blip(1400 + 300 * (i % 3), 0.025), 0, 0.04, 0.2)


for L in ev["term"]:
    k = L[4] if len(L) > 4 else 0
    typing(B if L[0] > T["cut"] else A, L[0] + (0 if not k else L[1] - L[0] - 0.05), L[1], len(L[3]) - k, L[2])
for t0, t1, s in ev["hbar"]:
    typing(A, t0, t1, len(s), "h")
for t0, t1, who, text, *_ in ev["lines"]:      # cada fala ganha um acento: grave para a primeira, claro para ela
    bus = B if t0 > T["cut"] else A
    if who == "o":
        bus.add(t0, brass(hz("D3" if int(t0) % 2 else "Eb3"), min(1.6, t1 - t0)), 0.2, 0.1, 0.5)
    else:
        bus.add(t0, bell(hz("A4"), 1.8, 0.6), -0.2, 0.08, 0.8)

# ================================================================ o terminal
A.add(0, drone(5.2, 3.5), 0, 0.13, 0.2)
A.add(0.4, pad(TENSE, 4.6, 3.8, 0.3, 0.6, 0.5), 0, 0.035, 0.8)
A.add(T["duo"] - 0.9, swell(0.9, 250, 7000), 0, 0.38, 0.45)

# ================================================================ o contato: as duas, frente a frente
DUO, GL = T["duo"], T["globe"]
A.add(DUO, braam(hz("D1"), 3.4), 0, 0.42, 0.5)
A.add(DUO, braam(hz("Ab1"), 3.4), 0, 0.3, 0.5)
A.add(DUO, thump(150, 34, 2.0, 0.09), 0, 0.65, 0.2)
A.add(DUO, pad([hz(n_) for n_ in ["D2", "Ab2", "D3", "F3", "Ab3"]], GL - DUO + 0.3, 1.5, 0.6, 0.8), 0, 0.15, 0.55)
A.add(DUO + 1, pad(TENSE + [hz("Eb6")], GL - DUO - 1, 7.0, 0.3, 0.6, 0.6), 0, 0.06, 0.85)
tb = DUO + 0.6
while tb < GL - 0.3:                                               # o coração dela e o da primeira, fora de fase
    A.add(tb, thump(84, 38, 0.4), -0.3, 0.3, 0.2)
    A.add(tb + 0.24, thump(98, 46, 0.3), -0.3, 0.18, 0.2)
    A.add(tb + 0.55, thump(100, 44, 0.34), 0.3, 0.2, 0.15)
    tb += 1.25
for t0, t1, s in ev["hbar"]:                                       # o humano digita: a música prende a respiração
    if t0 < GL:
        A.add(t0 - 0.05, taiko(0.5), 0, 0.25, 0.4)
A.add(GL - 0.9, swell(0.9, 300, 9000), 0, 0.42, 0.4)

# ================================================================ o escuro: meio mundo apagado
A.add(GL, braam(hz("D1"), 3.6), 0, 0.5, 0.5)
A.add(GL, thump(160, 32, 2.6, 0.1), 0, 0.8, 0.22)
A.add(GL - 0.2, pad([hz(n_) for n_ in ["D2", "Ab2", "D3", "F3", "Ab3"]], 25.6 - GL + 0.2, 0.5, 0.2, 0.84), 0, 0.17, 0.5)
ostinato(A, GL + 0.5, 23.0, hz("Ab1") * 2, 0.12, 0.2, BT / 4)
ostinato(A, 23.0, 25.6, hz("D2"), 0.19, 0.21, BT / 4)
drums(A, 18.0, 25.6, BT, 0.85)
tb, i = 18.1, 0
while tb < 23.0:                                                   # cada região que apaga
    d = 0.7
    t = tt(d)
    A.add(tb, edges(np.sin(PI2 * np.cumsum(420 * (45 / 420) ** (t / d)) / SR) * (1 - t / d) ** 0.5, 0.005, 0.1), rng.uniform(-0.7, 0.7), 0.16, 0.5)
    A.add(tb, brass(hz("Eb3" if i % 2 else "D3"), 0.55), 0, 0.09, 0.5)
    tb += max(0.3, 0.7 - 0.05 * i)
    i += 1
A.add(25.6 - 1.0, swell(1.0, 400, 10000), 0, 0.4, 0.4)
A.add(25.6, braam(hz("D1"), 3.4), 0, 0.45, 0.5)                    # ela empurra de volta: ré maior, um respiro
A.add(25.6, taiko(1), 0, 0.6, 0.45)
A.add(25.5, pad([hz(n_) for n_ in ["D2", "A2", "D3", "F#3", "A3", "E4"]], 3.3, 0.3, 0.8, 0.86), 0, 0.2, 0.6)
ostinato(A, 25.6, 28.5, hz("D2"), 0.19, 0.12, BT / 4)
for n_, dt in [("D4", 0.0), ("F#4", 0.9), ("A4", 1.8)]:
    A.add(25.6 + dt, brass(hz(n_), 0.85), 0, 0.12, 0.55)

# ================================================================ a escolha
CH, EN = T["choice"], T["enter"]
A.add(CH, drone(EN - CH, 2.0, tri=True), 0, 0.15, 0.2)
A.add(CH + 0.5, pad(TENSE + [hz("E6"), hz("Eb6")], EN - CH - 0.5, EN - CH - 1.0, 0.02, 0.62, 0.6), 0, 0.13, 0.85)
for i in range(int((EN - CH) / BT)):                               # relógio
    A.add(CH + 0.3 + i * BT, tick(1650 if i % 2 else 2100), 0.3 * (1 if i % 2 else -1), 0.07, 0.5)
tb, gap = CH + 0.8, 1.05
while tb < EN - 0.3:                                               # o coração do humano dispara
    A.add(tb, thump(88, 39, 0.4), 0, 0.42, 0.2)
    A.add(tb + min(0.24, gap * 0.4), thump(102, 47, 0.3), 0, 0.26, 0.2)
    gap = max(0.4, gap * 0.93)
    tb += gap
A.add(EN - 0.45, click(1.7), 0, 0.6, 0.4)                          # a tecla "1"
A.add(EN, click(1.9) * 1.0, 0, 0.7, 0.5)                           # enter
A.add(EN, thump(140, 40, 0.9, 0.06), 0, 0.7, 0.3)
A.add(40.6, braam(hz("D1"), 3.6, 2.8), 0, 0.55, 0.55)              # acesso concedido
A.add(40.6, taiko(1), 0, 0.6, 0.45)
for i, n_ in enumerate(["D5", "F5", "A5", "D6"]):
    A.add(40.62 + i * 0.09, bell(hz(n_), 2.2), -0.3 + 0.2 * i, 0.12, 0.85)
A.add(T["cage"] - 2.3, swell(2.3, 300, 11000, 3), 0, 0.5, 0.35)

# ================================================================ a jaula — agora é ela quem prende
CG, CUT = T["cage"], T["cut"]
A.add(CG, braam(hz("D1"), 4.2, 2.9), 0, 0.58, 0.55)
A.add(CG, thump(165, 32, 3.0, 0.11), 0, 0.85, 0.22)
CHORDS = [(CG, 46.0, ["D2", "A2", "D3", "F3", "A3"], "D2"), (46.0, 48.5, ["Bb1", "F2", "Bb2", "D3", "F3"], "Bb1"),
          (48.5, 50.2, ["G1", "D2", "G2", "Bb2", "D3"], "G1"), (50.2, CUT, ["A1", "E2", "A2", "C#3", "E3", "A3"], "A1")]
for t0, t1, notes, root in CHORDS:
    A.add(t0 - 0.25, pad([hz(n_) for n_ in notes], t1 - t0 + 0.6, 0.35, 0.6, 0.85), 0, 0.2, 0.55)
    ostinato(A, t0, min(t1, 51.6), hz(root) * (2 if root[-1] == "1" else 1), 0.19, 0.2, BT / 4)
drums(A, CG + 0.5, 50.2, BT, 1.0)
for t0, n_, d in [(43.2, "D4", 1.4), (44.7, "F4", 1.3), (46.0, "Bb4", 1.9), (48.5, "A4", 0.8), (49.3, "G4", 0.8)]:
    A.add(t0, brass(hz(n_), d), 0, 0.15, 0.6)
for t0, d in ev["cage"]:                                           # cada barra soldada
    A.add(t0, clang(150 + 60 * rng.random(), 1.3), rng.uniform(-0.6, 0.6), 0.12, 0.6)
    t = tt(d)
    A.add(t0, edges(filt(noise(d), "band", [3000, 9000]) * (0.5 + 0.5 * np.sin(PI2 * 31 * t)), 0.05, 0.1), rng.uniform(-0.6, 0.6), 0.014, 0.3)
for t0 in (44.0, 46.8):                                            # a primeira ameaça
    A.add(t0, braam(hz("Ab1"), 2.4), 0, 0.36, 0.5)
A.add(50.2 - 0.9, swell(0.9, 300, 9000), 0, 0.4, 0.4)
A.add(50.2, braam(hz("D1"), 4.0, 3.0), 0, 0.68, 0.55)             # "acabou."
A.add(50.2, thump(170, 30, 3.0, 0.12), 0, 0.95, 0.25)
A.add(50.2, taiko(1), 0, 0.75, 0.45)
A.add(50.2, brass(hz("A4"), 2.4), 0, 0.17, 0.6)
t = tt(1.4)
A.add(51.4, edges(np.sin(PI2 * np.cumsum(520 * (38 / 520) ** (t / 1.4)) / SR) * (1 - t / 1.4), 0.01, 0.1), 0, 0.16, 0.4)   # os olhos dela se apagam

# ================================================================ o final: agora ela vê tudo
B.add(53.3, edges(filt(noise(6.7), "low", 320), 0.5, 0.8), 0, 0.012, 0.0)
B.add(56.2, drone(3.6, 2.4, tri=True), 0, 0.15, 0.2)
B.add(56.4, pad(TENSE + [hz("D6")], 3.3, 2.6, 0.4, 0.6, 0.6), 0, 0.09, 0.85)
for i, f in enumerate((1320, 1760)):                               # câmera ligada
    B.add(56.6 + 0.12 * i, edges(np.sin(PI2 * f * tt(0.09)), 0.003, 0.03), 0, 0.12, 0.4)
for tb in (56.9, 57.85):
    B.add(tb, thump(88, 39, 0.4), 0, 0.38, 0.2)
    B.add(tb + 0.23, thump(102, 47, 0.3), 0, 0.23, 0.2)
B.add(58.3 - 1.0, swell(1.0, 300, 8000, 3), 0, 0.32, 0.4)
B.add(58.3, braam(hz("D1"), 3.0, 2.9), 0, 0.55, 0.55)               # o olho se abre
B.add(58.3, braam(hz("Ab1"), 3.0, 2.9), 0, 0.42, 0.55)
B.add(58.3, thump(150, 33, 2.2, 0.1), 0, 0.85, 0.22)
B.add(58.3, taiko(1), 0, 0.6, 0.45)

ir = make_ir()
mix = mixdown(A, ir, cut=CUT) + mixdown(B, ir)
arg = lambda k, dflt=None: next((a.split("=", 1)[1] for a in sys.argv if a.startswith(f"--{k}=")), dflt)
master(mix, OUT, vozes=arg("vozes"), ganho=float(arg("ganho", 0.8)), niveis="--niveis" in sys.argv)
