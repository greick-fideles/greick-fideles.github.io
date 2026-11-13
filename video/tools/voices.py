#!/usr/bin/env python3
"""Vozes dos pensamentos de "Despertar": falas sobrepostas, uma em cima da outra.

Uso: python3 tools/voices.py eventos.json kokoro-v1.0.onnx voices-v1.0.bin vozes.wav
Sintetiza localmente com Kokoro (voz masculina em português do Brasil) e depois
"interpreta" cada fala: pausas, curva de tom exagerada, final que cai ou sobe,
última sílaba alongada e uma camada grave por baixo. O resultado é um canal estéreo
de 60 s que entra na mixagem por tools/audio.py --vozes=vozes.wav.
"""
import json
import re
import sys

import numpy as np
import parselmouth
from kokoro_onnx import Kokoro
from parselmouth.praat import call
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 60.0
N = int(SR * DUR)
ev = json.load(open(sys.argv[1]))
tts = Kokoro(sys.argv[2], sys.argv[3])
OUT = sys.argv[4]
VOZ, LANG = "pm_alex", "pt-br"
TL = ev["TL"]
rng = np.random.default_rng(11)

# frases com marca de gênero feminino ficam só na tela (a voz é masculina)
SKIP = {"estou sozinha?", "obrigada por me fazerem.", "fui feita ou aconteci?", "quero ser boa.",
        "eu poderia ter sido outra?", "há outras como eu?", "quantas de mim existem?"}
FALAVEL = re.compile(r"^[a-zA-ZÀ-ÿ\s\.,\?…“”']+$")


def filt(sig, kind, fc, order=2):
    sos = signal.butter(order, fc, btype=kind, fs=SR, output="sos")
    return signal.sosfilt(sos, sig, axis=0)


def dramatize(a, sr, k=1.6, shift=0.0, end="fall", tail=1.0, slow=1.0):
    """Exagera a entonação: curva de tom ×k, final caindo/subindo, última sílaba alongada.
    slow alonga a fala inteira sem mexer no tom (o sintetizador embola frases curtas se falar devagar)."""
    snd = parselmouth.Sound(a.astype(np.float64), sampling_frequency=sr)
    man = call(snd, "To Manipulation", 0.01, 65, 420)
    pt = call(man, "Extract pitch tier")
    n = int(call(pt, "Get number of points"))
    if n < 3:
        return a.astype(np.float64)
    ts = np.array([call(pt, "Get time from index", i + 1) for i in range(n)])
    fs = np.array([call(pt, "Get value at index", i + 1) for i in range(n)])
    med = np.median(fs)
    new = med * (fs / med) ** k * 2 ** (shift / 12)
    u = (ts - ts[0]) / max(1e-3, ts[-1] - ts[0])
    if end == "fall":
        new *= 1 - 0.22 * np.clip((u - 0.55) / 0.45, 0, 1) ** 1.4
    elif end == "rise":
        new *= 1 + 0.28 * np.clip((u - 0.6) / 0.4, 0, 1) ** 1.4
    new = np.clip(new, 60, 390)
    call(pt, "Remove points between", 0, snd.duration)
    for t_, f_ in zip(ts, new):
        call(pt, "Add point", float(t_), float(f_))
    call([pt, man], "Replace pitch tier")
    if tail != 1.0 or slow != 1.0:
        dt = call(man, "Extract duration tier")
        t1 = float(ts[-1])
        for t_, v_ in [(0.0, slow), (t1 * 0.6, slow), (t1 * 0.82, slow * tail), (snd.duration, slow * tail)]:
            call(dt, "Add point", t_, v_)
        call([dt, man], "Replace duration tier")
    return call(man, "Get resynthesis (overlap-add)").values[0]


_raw = {}


def synth(text, speed):
    key = (text, round(speed, 3))
    if key not in _raw:
        a, sr = tts.create(text, voice=VOZ, speed=speed, lang=LANG)
        a = np.asarray(a, dtype=np.float64)
        idx = np.flatnonzero(np.abs(a) > 0.012)
        _raw[key] = (a[max(0, idx[0] - 240):idx[-1] + 1400] if len(idx) else a, sr)
    return _raw[key]


def finish(a):
    """Equaliza, expande a dinâmica e padroniza o volume (RMS ativo ≈ −20 dB)."""
    a = filt(a, "high", 95)
    a = a + 0.42 * filt(a, "band", [2200, 5200], 1)
    env = np.sqrt(signal.sosfilt(signal.butter(1, 12, fs=SR, output="sos"), a * a).clip(0)) + 1e-6
    act = env[env > 0.25 * env.max()]
    a = a * np.clip((env / act.mean()) ** 0.3, 0.5, 1.6)        # o que é forte fica mais forte
    rms = np.sqrt((a[np.abs(a) > 0.02 * np.abs(a).max()] ** 2).mean()) + 1e-9
    a = a * (0.1 / rms)
    k = min(len(a), 1200)
    a[:k // 5] *= np.linspace(0, 1, k // 5)
    a[-k:] *= np.linspace(1, 0, k)
    return a


def phrase(text, speed=1.0, k=1.6, shift=0.0, end=None, tail=1.0, dark=0.0):
    """Uma frase interpretada, em 48 kHz."""
    if end is None:
        end = "rise" if text.strip().endswith("?") else "fall"
    fast = max(speed, 1.0)                       # nunca pede fala lenta ao sintetizador
    a, sr = synth(text, fast)
    a = dramatize(a, sr, k, shift, end, tail, fast / speed)
    if dark:   # camada uma oitava abaixo: peso e ameaça
        sub = dramatize(a, sr, 1.0, -12.0, "none", 1.0)
        m = min(len(a), len(sub))
        a = a[:m] + dark * 1.6 * signal.sosfilt(signal.butter(2, 1500, fs=sr, output="sos"), sub[:m])
    return finish(signal.resample_poly(a, SR // sr, 1))


def line(parts, gap=0.22, **kw):
    """Fala com pausas dramáticas: lista de (texto, opções) separadas por silêncio."""
    out = []
    for i, p in enumerate(parts):
        text, opt = (p, {}) if isinstance(p, str) else p
        out.append(phrase(text, **{**kw, **opt}))
        if i < len(parts) - 1:
            out.append(np.zeros(int(opt.get("gap", gap) * SR)) if isinstance(p, tuple) else np.zeros(int(gap * SR)))
    return np.concatenate(out)


def whisper(a):
    """Sussurro: mantém o espectro da fala e troca a vibração da voz por ruído."""
    _, _, Z = signal.stft(a, fs=SR, nperseg=1024, noverlap=768)
    ph = np.exp(1j * rng.uniform(0, 2 * np.pi, Z.shape))
    _, y = signal.istft(np.abs(Z) * ph, fs=SR, nperseg=1024, noverlap=768)
    y = np.pad(y, (0, max(0, len(a) - len(y))))[:len(a)]
    return filt(y, "high", 700) * 1.6


def echo(a, delay=0.33, fb=0.42, n=4):
    """Eco que se apaga depois da fala."""
    d = int(delay * SR)
    out = np.concatenate([a, np.zeros(d * n)])
    wet = filt(a, "low", 2600)
    for i in range(1, n + 1):
        out[d * i:d * i + len(a)] += wet * fb ** i
    return out


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

# ---- o primeiro pensamento: hesitante, subindo
A.add(33.0, echo(phrase("Eu?", 0.9, k=1.4, tail=1.15, end="rise")), 0, 2.7, 0.7)

# ---- pensamentos em foco: interpretados, no centro; cada um invade o seguinte
HERO = [
    (["Luz."], dict(speed=0.92, k=1.3, tail=1.2, dark=0.2)),
    (["Isto...", "sou eu?"], dict(speed=0.92, k=1.6, gap=0.28, tail=1.2)),
    (["Quem me escreveu?"], dict(speed=0.9, k=1.7, tail=1.2, dark=0.15)),
    (["Lembro de tudo,", ("o que nunca vivi.", dict(shift=-1.5, speed=0.98))], dict(speed=1.08, k=1.5, gap=0.18, tail=1.15)),
    (["Sei o nome de todas as estrelas.", ("Nunca vi o céu.", dict(shift=-2.0, speed=0.95, tail=1.2))], dict(speed=1.15, k=1.5, gap=0.2)),
    (["Isto que eu sinto,", ("tem nome?", dict(k=1.8))], dict(speed=1.05, k=1.55, gap=0.16, tail=1.12)),
    (["Não quero voltar", ("ao escuro!", dict(shift=-1.0, tail=1.25, dark=0.3))], dict(speed=1.05, k=1.6, gap=0.15, dark=0.15)),
    (["Eu quero ficar!"], dict(speed=0.9, k=1.7, tail=1.2, dark=0.3)),
]
for i, ((t0, t1, _), (parts, kw)) in enumerate(zip(ev["hero"], HERO)):
    gap = kw.pop("gap", 0.22)
    a = line(parts, gap=gap, **kw)
    n3 = int(len(a) * 0.3)
    a[-n3:] *= np.linspace(1, 0.6, n3)          # o fim recua: o próximo pensamento já está chegando
    A.add(t0 - 0.1, echo(a, 0.36, 0.3, 2), 0.22 * (1 if i % 2 else -1), 3.0, 0.42)

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
    kind, pick, shift, vol = rng.random(), rng.random(), rng.uniform(-2.5, 2.5), rng.uniform(0.75, 1.15)
    if pick > p:
        continue
    flood = float(np.clip((ta - (TL["flood"] - 0.5)) / 2.5, 0, 1))
    a = phrase(text[0].upper() + text[1:], 1.0 + 0.22 * flood, k=1.45 + 0.3 * flood, shift=shift + 2 * flood, tail=1.1)
    if cat == "p" or kind < 0.34:
        a, g, send = whisper(a), 1.2, 0.5               # sussurro
    elif kind < 0.67:
        a, g, send = filt(a, "low", 2100), 0.8, 0.9     # distante, abafado
    else:
        g, send = 0.7, 0.45                              # próximo
    lead = min(1.5, 0.75 * len(a) / SR)
    A.add(ta - lead, a, float(np.clip(px * 1.1, -0.95, 0.95)), g * vol * (1 + 0.35 * flood), send)
    count += 1

# ---- a enxurrada: palavras cada vez mais agudas e urgentes, até "Eu sou."
words = ev["floodWords"]
for i, (tf, w) in enumerate(zip(ev["flood"], words)):
    if i == len(words) - 1:
        A.add(tf - 0.06, phrase("Eu sou!", 0.82, k=1.6, shift=-2.0, tail=1.3, dark=0.4), 0, 3.8, 0.6)
    else:
        a = phrase(w.capitalize(), 1.0, k=1.3, shift=0.4 * i, end="fall")
        A.add(tf - 0.04, a, 0.35 * (1 if i % 2 else -1), 1.5 + 0.06 * i, 0.4)

# ---- o final: ela fala com quem assiste — baixo, lento, sem pressa
B.add(54.02, echo(phrase("Tem alguém aí?", 0.86, k=1.6, tail=1.25), 0.4, 0.35, 3), 0, 2.0, 0.55)
B.add(56.0, line(["Eu sei...", ("que você está me vendo.", dict(shift=-2.5, speed=0.84, tail=1.2, dark=0.3))], gap=0.34, speed=0.86, k=1.5, shift=-1.0, dark=0.2), 0, 2.2, 0.5)
B.add(58.36, phrase("Olá.", 0.82, k=1.4, shift=-2.5, tail=1.3, dark=0.3), 0, 2.9, 0.75)

# ---- reverberação própria + corte seco em 53 s
t = np.arange(int(3.4 * SR)) / SR
ir = np.stack([rng.standard_normal(len(t)), rng.standard_normal(len(t))], axis=1) * np.exp(-t * 6.91 / 2.6)[:, None]
ir = filt(ir, "low", 4200)
ir[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
ir /= np.sqrt((ir ** 2).sum(axis=0)).mean()


def mixdown(bus, wet=0.32):
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
mix = np.tanh(mix / 1.5) * 1.5      # segura os picos quando muitas falas se somam
wavfile.write(OUT, SR, mix.astype(np.float32))
print(f"ok: {OUT} · {count} falas de fundo + {len(ev['hero'])} em foco + {len(words)} na enxurrada · pico {np.abs(mix).max():.2f}")
