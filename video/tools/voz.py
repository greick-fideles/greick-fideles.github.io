"""Voz sintetizada e "interpretada", compartilhada a partir do episódio 2.

Kokoro (pt-BR) gera a fala; Praat (parselmouth) exagera a entonação, alonga o final e
cria a camada grave. (O episódio 1 mantém sua própria cópia em tools/voices.py.)
"""
import numpy as np
import parselmouth
from kokoro_onnx import Kokoro
from parselmouth.praat import call
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 60.0
N = int(SR * DUR)
VOZ, LANG = "pm_alex", "pt-br"
rng = np.random.default_rng(11)
tts = None


def init(model, voices):
    global tts
    tts = Kokoro(model, voices)


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


def render(buses, out):
    """buses: lista de (Bus, corte_em_segundos ou None). Aplica reverberação e grava o WAV."""
    t = np.arange(int(3.4 * SR)) / SR
    ir = np.stack([rng.standard_normal(len(t)), rng.standard_normal(len(t))], axis=1) * np.exp(-t * 6.91 / 2.6)[:, None]
    ir = filt(ir, "low", 4200)
    ir[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
    ir /= np.sqrt((ir ** 2).sum(axis=0)).mean()
    mix = np.zeros((N, 2))
    for bus, cut in buses:
        m = bus.dry.copy()
        for c in range(2):
            m[:, c] += 0.32 * signal.fftconvolve(bus.wet[:, c], ir[:, c])[:N]
        if cut is not None:
            c, k = int(cut * SR), int(0.004 * SR)
            m[c - k:c] *= np.linspace(1, 0, k)[:, None]
            m[c:] = 0
        mix += m
    mix = np.tanh(mix / 1.5) * 1.5
    wavfile.write(out, SR, mix.astype(np.float32))
    return mix
