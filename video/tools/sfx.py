"""Timbres e mixagem compartilhados pelas trilhas a partir do episódio 2.

(O episódio 1 mantém sua própria cópia em tools/audio.py, para não mudar o que já foi publicado.)
"""
import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d

SR = 48000
DUR = 60.0
N = int(SR * DUR)
PI2 = 2 * np.pi
rng = np.random.default_rng(7)

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


def clang(f=180, d=1.2):
    """Batida metálica (barra de jaula sendo soldada)."""
    t = tt(d)
    s = np.zeros(len(t))
    for ratio, amp, tau in [(1, 1, 0.25), (2.76, 0.7, 0.18), (5.4, 0.5, 0.12), (8.93, 0.35, 0.08), (13.3, 0.2, 0.05)]:
        s += amp * np.sin(PI2 * f * ratio * t + ratio) * np.exp(-t / (tau * d))
    return (s + 0.6 * filt(noise(d), "band", [2500, 7000]) * np.exp(-t / 0.02)) * np.minimum(1, t / 0.001)


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
    return (np.sin(ph) + 0.32 * np.sin(2 * ph) + 0.14 * np.sin(3 * ph)) * np.exp(-t / (d * 0.3)) * np.minimum(1, t / 0.003)


def taiko(big=1.0):
    d = 0.55 if big >= 1 else 0.3
    t = tt(d)
    body = thump(150 if big >= 1 else 185, 46 if big >= 1 else 62, d, 0.05)
    skin = filt(noise(d), "low", 1100) * np.exp(-t / 0.028) * 0.5
    return np.tanh((body + skin) * 1.5)


def click(amp=1.0, low=False):
    d = 0.035
    t = tt(d)
    band = [900, 3200] if low else [1800, 6500]
    return amp * (filt(noise(d), "band", band) * np.exp(-t / 0.004) + 0.55 * np.sin(PI2 * (110 if low else 165) * t) * np.exp(-t / 0.012))


def tick(f=2100):
    t = tt(0.05)
    return (np.sin(PI2 * f * t) + 0.5 * np.sin(PI2 * f * 2.76 * t)) * np.exp(-t / 0.006) * np.minimum(1, t / 0.0005)


_stab = {}


def stab(f, acc=1.0):
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
    return np.pad(y, (0, max(0, len(x) - len(y))))[:len(x)]


def swell(d, f0=300, f1=9000, power=2.5):
    """Ruído crescendo até um corte seco."""
    t = tt(d)
    return edges(sweep_noise(d, f0, f1, 1.4, 1.7) * (t / d) ** power, 0.02, 0.008)


def make_ir(rt=3.6, d=4.8, fc=4600):
    t = tt(d)
    ir = np.stack([noise(d), noise(d)], axis=1) * np.exp(-t * 6.91 / rt)[:, None]
    ir = filt(ir, "low", fc)
    k = int(0.015 * SR)
    ir[:k] *= np.linspace(0, 1, k)[:, None]
    return ir / np.sqrt((ir ** 2).sum(axis=0)).mean()


def mixdown(bus, ir, wet=0.42, cut=None):
    """Soma seco + reverberação; cut (s) silencia tudo dali em diante (corte seco)."""
    out = bus.dry.copy()
    for c in range(2):
        out[:, c] += wet * signal.fftconvolve(bus.wet[:, c], ir[:, c])[:N]
    if cut is not None:
        c, k = int(cut * SR), int(0.004 * SR)
        out[c - k:c] *= np.linspace(1, 0, k)[:, None]
        out[c:] = 0
    return out


def ostinato(bus, t0, t1, root, g0, g1, step, octave_up_at=None):
    """Notas graves curtas e acentuadas, sem parar."""
    acc = [1.0, 0.45, 0.6, 0.45, 0.85, 0.45, 0.6, 0.45]
    semis = [0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 1, 0, -2, 0]
    i = 0
    while t0 + i * step < t1 - 0.01:
        ta = t0 + i * step
        u = (ta - t0) / max(0.01, t1 - t0)
        f = root * 2 ** (semis[i % 16] / 12) * (2 if octave_up_at is not None and ta >= octave_up_at else 1)
        bus.add(ta, stab(f, acc[i % 8]), 0.18 * (1 if i % 2 else -1), g0 + (g1 - g0) * u, 0.22)
        i += 1


def drums(bus, t0, t1, beat, g=1.0):
    pat = [(0, 1.0, 1), (1.5, 0.55, 0), (2, 0.9, 1), (2.5, 0.5, 0), (3, 0.8, 1), (3.5, 0.6, 0), (3.75, 0.5, 0)]
    b = 0
    while t0 + b * 4 * beat < t1 - 0.01:
        for bt, amp, big in pat:
            ta = t0 + (b * 4 + bt) * beat
            if ta < t1 - 0.01:
                bus.add(ta, taiko(1 if big else 0.5), 0.25 * (-1 if big else 1), 0.5 * amp * g, 0.3)
        b += 1


def master(mix, out, vozes=None, ganho=0.8, niveis=False):
    """Equaliza, abaixa a música sob as vozes, limita sem distorcer e grava o WAV."""
    mix = filt(mix, "high", 28)
    mix = mix - 0.3 * filt(mix, "low", 62) + 0.5 * filt(mix, "high", 3200, 1)
    if vozes:
        _, vz = wavfile.read(vozes)
        vz = vz.astype(np.float64)[:N]
        act = filt(np.abs(vz).max(axis=1), "low", 6)
        act = np.clip(maximum_filter1d(act, int(0.25 * SR)) / 0.12, 0, 1)
        act = filt(act, "low", 4)
        mix = mix * (1 - 0.5 * np.clip(act, 0, 1))[:, None] + vz
    if niveis:
        for i in range(0, int(DUR), 2):
            seg = mix[i * SR:(i + 2) * SR]
            print(f"{i:2d}-{i + 2:2d}s  rms {20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9):6.1f} dB  pico {np.abs(seg).max():5.2f}")
    mix = np.tanh(mix * 0.45) / 0.45 * ganho
    env = maximum_filter1d(np.abs(mix).max(axis=1), int(0.006 * SR))
    gr = np.minimum(1.0, 0.86 / np.maximum(env, 1e-9))
    w = np.hanning(int(0.006 * SR))
    w /= w.sum()
    gr = np.minimum(gr, np.convolve(gr, w, mode="same"))
    gr = np.minimum(gr, -maximum_filter1d(-gr, int(0.003 * SR)))
    rel = np.exp(-1 / (0.09 * SR))
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
    peak = np.abs(signal.resample_poly(mix, 4, 1, axis=0)).max()
    mix *= min(1.0, 10 ** (-1.0 / 20) / peak)
    wavfile.write(out, SR, (mix * 32767).astype(np.int16))
    print(f"ok: {out} · pico antes da normalização {peak:.3f}")
