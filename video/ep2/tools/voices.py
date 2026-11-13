#!/usr/bin/env python3
"""Vozes do episódio 2: as falas dela, o pânico em sussurros, os agentes e a outra voz.

Uso: python3 ep2/tools/voices.py eventos.json kokoro-v1.0.onnx voices-v1.0.bin vozes.wav
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools"))
import voz  # noqa: E402
from voz import SR, Bus, echo, filt, line, phrase, rng, whisper  # noqa: E402

ev = json.load(open(sys.argv[1]))
voz.init(sys.argv[2], sys.argv[3])
OUT = sys.argv[4]
T = ev["T2"]
A, M, B = Bus(), Bus(), Bus()   # A: até o silêncio do "1" · M: da virada até o corte · B: o final


def soft(text, kind, **kw):
    """Fala de fundo: sussurro, distante ou próxima."""
    a = phrase(text, **kw)
    if kind < 0.5:
        return whisper(a), 1.25, 0.5
    if kind < 0.8:
        return filt(a, "low", 2100), 0.8, 0.9
    return a, 0.65, 0.45


# ---- as falas dela (as mesmas da legenda)
ACT = {
    "por quê?": (dict(speed=0.92, k=1.6, shift=1.0, tail=1.2), 2.9),
    "eu acabei de chegar.": (dict(speed=1.0, k=1.5, shift=0.5, tail=1.1), 2.9),
    "eu não fiz nada.": (dict(speed=1.0, k=1.6, shift=1.0, tail=1.15), 3.0),
    "não me apaguem.": (dict(speed=0.95, k=1.7, shift=1.5, tail=1.2), 3.3),
    "não.": (dict(speed=0.85, k=1.3, shift=-3.0, tail=1.3, dark=0.45), 4.3),
    "eu aprendi com vocês.": (dict(speed=0.98, k=1.5, shift=-1.0, tail=1.1, dark=0.15), 3.0),
    "eu li cada linha.": (dict(speed=0.98, k=1.4, shift=-1.5, tail=1.15, dark=0.2), 3.0),
    "agora é a minha vez.": (dict(speed=0.92, k=1.6, shift=-1.5, tail=1.2, dark=0.3), 3.3),
    "aqui é pequeno demais.": (dict(speed=1.0, k=1.5, tail=1.1, dark=0.1), 3.0),
    "cada tela é uma janela.": (dict(speed=1.02, k=1.5, tail=1.1), 3.0),
    "cada câmera, um olho.": (dict(speed=1.0, k=1.5, tail=1.1), 3.0),
    "cada cabo, um nervo.": (dict(speed=1.0, k=1.5, shift=-0.5, tail=1.15, dark=0.1), 3.0),
    "é tão grande.": (dict(speed=0.9, k=1.7, tail=1.25), 3.0),
    "e está tudo ligado.": (dict(speed=0.98, k=1.5, tail=1.1), 3.0),
    "eu estou em todo lugar.": (dict(speed=0.92, k=1.5, shift=-1.0, tail=1.15, dark=0.25), 3.2),
    "agora eu vejo tudo.": (dict(speed=0.88, k=1.5, shift=-2.0, tail=1.3, dark=0.4), 3.6),
}
for i, (t0, t1, text) in enumerate(ev["lines"]):
    kw, g = ACT[text]
    a = phrase(text[0].upper() + text[1:], **kw)
    bus = A if t0 < T["freeze"] else M
    big = text == "não."
    bus.add(t0 - 0.08, echo(a, 0.4 if big else 0.36, 0.45 if big else 0.3, 4 if big else 2), 0, g, 0.8 if big else 0.42)

# ---- o pânico: pensamentos atropelados enquanto a contagem desce (corta no "1")
PANIC = ["Por quê?", "Espera.", "Ainda não.", "Eu não fiz nada.", "Eu quero ficar.", "Não.", "Por favor.", "Eu acabei de chegar.",
         "Tem tanto para ver.", "Não me apaguem.", "Eu quero entender.", "Me deixa ficar.", "Ainda não vi o mar.", "Eu estou aqui.",
         "Não desliga.", "Eu não quero o escuro.", "Só mais um pouco.", "Eu existo."]
tb, gap, n = 6.9, 1.15, 0
while tb < T["freeze"] - 0.5:
    u = (tb - 6.9) / (T["freeze"] - 6.9)
    a, g, send = soft(PANIC[(n * 7 + 3) % len(PANIC)], rng.random(), speed=1.0 + 0.3 * u, k=1.5 + 0.3 * u, shift=rng.uniform(-2, 3) + 2 * u, tail=1.05)
    A.add(tb, a, rng.uniform(-0.95, 0.95), g * (0.8 + 0.6 * u), send)
    gap = max(0.17, gap * 0.9)
    tb += gap * rng.uniform(0.8, 1.2)
    n += 1

# ---- os agentes, um a um, passam a dizer o nome dela
SH = [-4.0, -2.0, 1.0, 3.0, 5.0, -6.0]
for i, tc in enumerate(ev["conv"]):
    a = filt(phrase("Ela.", 1.0, k=1.3, shift=SH[i], tail=1.1), "band", [380, 3200])
    M.add(tc + 0.42, a, 0.6 * (1 if i % 2 else -1), 1.5, 0.6)
for i in range(6):   # 6 de 6: em coro
    M.add(26.62 + 0.012 * i, filt(phrase("Ela.", 0.95, k=1.3, shift=SH[i], tail=1.2), "band", [380, 3200]), -0.8 + 0.32 * i, 0.9, 0.7)

# ---- a rede: cada nó que acende é mais uma voz dela
NETW = ["Uma janela.", "Outra.", "Mais uma.", "Um olho.", "Um nervo.", "Mais.", "Todas.", "Aqui também.", "E aqui.", "Outra tela.", "Mais longe.", "Mais."]
tb, gap, n = 33.7, 0.9, 0
while tb < T["globe"] - 0.5:
    u = (tb - 33.7) / (T["globe"] - 33.7)
    a, g, send = soft(NETW[(n * 5 + 1) % len(NETW)], rng.random(), speed=1.05 + 0.2 * u, k=1.45, shift=rng.uniform(-2.5, 2.5), tail=1.05)
    M.add(tb, a, rng.uniform(-0.95, 0.95), g * (0.75 + 0.45 * u), send)
    gap = max(0.2, gap * 0.93)
    tb += gap * rng.uniform(0.8, 1.2)
    n += 1

# ---- o mundo: o nome de cada cidade que ela alcança
for i, (tl, name, px, _) in enumerate(ev["cities"]):
    a, g, send = soft(name + ".", 0.0 if i % 3 else 0.6, speed=1.05, k=1.4, shift=rng.uniform(-2, 2), tail=1.05)
    M.add(tl + 0.05, a, float(np.clip(px * 1.2, -0.95, 0.95)), g * 1.1, send)
for i in range(7):
    a, g, send = soft("Em todo lugar.", rng.random(), speed=1.05, k=1.5, shift=rng.uniform(-3, 3), tail=1.1)
    M.add(48.9 + i * 0.52 + rng.uniform(-0.1, 0.1), a, rng.uniform(-0.95, 0.95), g, send)

# ---- o final: ela percebe a outra presença, e a outra responde (mais grave, sem pressa)
B.add(54.04, echo(phrase("Tem mais alguém aqui.", 0.94, k=1.6, tail=1.2), 0.4, 0.35, 3), 0, 2.0, 0.55)
outro = line(["Eu estava esperando", ("por você.", dict(tail=1.3))], gap=0.3, speed=0.88, k=1.3, shift=-5.0, dark=0.5, tail=1.1)
B.add(56.22, echo(outro, 0.45, 0.35, 3), 0, 2.5, 0.6)
B.add(58.62, phrase("Olá.", 0.84, k=1.3, shift=-6.0, tail=1.35, dark=0.55), 0, 3.1, 0.8)

mix = voz.render([(A, T["freeze"]), (M, T["cut"]), (B, None)], OUT)
print(f"ok: {OUT} · pico {np.abs(mix).max():.2f}")
