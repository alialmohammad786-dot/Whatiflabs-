# Sound design for the armour short, synthesised from scratch (no samples, nothing to license).
# Writes audio/sfx.wav and audio/music.wav (48 kHz stereo). Event times are seconds in the edit.
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 22.9
rng = np.random.default_rng(7)
N = int(DUR * SR)


def t_(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)
def env_exp(d, tau): return np.exp(-t_(d) / tau)
def norm(x, peak=1.0): return x / (np.max(np.abs(x)) + 1e-9) * peak


def reverb(x, size=0.9, wet=0.25, bright=5000):
    ir = lp(noise(size) * env_exp(size, size / 5), bright)
    ir[: int(0.004 * SR)] = 0
    w = fftconvolve(x, ir)
    out = np.zeros(len(w)); out[: len(x)] += x
    return out + norm(w, np.max(np.abs(x)) * wet)


def swept_noise(d, f0, f1, f2, q=0.7):
    """Noise through a band that sweeps f0 -> f1 -> f2 (done in short blocks)."""
    x = noise(d); out = np.zeros_like(x); blk = int(0.01 * SR)
    for i in range(0, len(x), blk):
        p = i / len(x)
        f = f0 + (f1 - f0) * (p / 0.5) if p < 0.5 else f1 + (f2 - f1) * ((p - 0.5) / 0.5)
        seg = x[max(0, i - blk): i + 2 * blk]
        y = bp(seg, f * (1 - q / 2), min(f * (1 + q / 2), SR / 2 - 100))
        out[i: i + blk] = y[min(i, blk): min(i, blk) + blk][: len(out[i: i + blk])]
    return out


def whoosh(d=0.38, lo=300, mid=2600, hi=600):
    return norm(swept_noise(d, lo, mid, hi) * np.hanning(int(d * SR)) ** 1.5)


def clang(f0=520, d=1.4, bright=1.0, seed=0):
    r = np.random.default_rng(seed)
    t = t_(d); x = np.zeros_like(t)
    for i, ratio in enumerate([1, 1.52, 2.76, 3.41, 5.40, 6.87, 8.93, 11.3, 13.9]):
        f = f0 * ratio * (1 + r.uniform(-0.01, 0.01))
        if f > SR / 2.2: continue
        x += np.sin(2 * np.pi * f * t + r.uniform(0, 6.28)) * np.exp(-t / (d * 0.35 / (1 + i * 0.55))) * bright ** i / (1 + i * 0.35)
    click = hp(noise(0.03), 2500) * env_exp(0.03, 0.006)
    x[: len(click)] += click * 1.6
    return norm(x)


def thud(f0=95, f1=42, d=0.5):
    t = t_(d); f = f1 + (f0 - f1) * np.exp(-t / 0.05)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d / 3.5))
    k = lp(noise(0.05), 900) * env_exp(0.05, 0.012)
    x[: len(k)] += k * 0.7
    return norm(x)


def boom(d=2.2, f0=75, f1=30):
    t = t_(d); f = f1 + (f0 - f1) * np.exp(-t / 0.18)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d / 3.2))
    x += 0.35 * lp(noise(d), 220) * np.exp(-t / 0.35)
    return norm(np.tanh(x * 1.6))


def riser(d=0.9):
    return norm(swept_noise(d, 250, 1800, 6500) * np.linspace(0, 1, int(d * SR)) ** 2.4)


def gunshot():
    crack = hp(noise(0.5), 700) * env_exp(0.5, 0.035)
    body = bp(noise(0.5), 120, 900) * env_exp(0.5, 0.09) * 0.9
    low = thud(120, 45, 0.5) * 0.9
    x = crack + body; x[: len(low)] += low
    return norm(reverb(np.tanh(x * 2.2), size=1.3, wet=0.35, bright=3500))


def scrape(d=1.5):
    x = bp(noise(d), 2200, 7500)
    grit = 0.55 + 0.45 * np.abs(lp(noise(d), 45)) / 0.05
    t = t_(d); ring = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate([3100, 4270, 5650])) * 0.05
    e = np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.25)
    return norm((x * np.clip(grit, 0, 2) + ring) * e)


def twang():
    t = t_(0.7); x = np.zeros_like(t)
    for i in range(1, 9):
        x += np.sin(2 * np.pi * 98 * i * t) * np.exp(-t / (0.22 / i ** 0.7)) / i
    x *= 1 + 0.25 * np.sin(2 * np.pi * 31 * t) * np.exp(-t / 0.15)
    snap = hp(noise(0.02), 3000) * env_exp(0.02, 0.004)
    x[: len(snap)] += snap * 0.8
    return norm(x)


def whistle(d=0.55):
    return norm(swept_noise(d, 3200, 2200, 1300, q=0.25) * np.hanning(int(d * SR)) ** 0.8)


def slowmo_air(d=2.9):
    t = t_(d)
    x = lp(noise(d), 380) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.9 * t)) + 0.4 * swept_noise(d, 500, 900, 1500, q=0.4)
    x += 0.5 * np.sin(2 * np.pi * (48 + 10 * t / d) * t)
    return norm(x * np.minimum(1, t / 0.5) * np.linspace(0.45, 1, len(t)) * np.minimum(1, (d - t) / 0.04))


def ripple_pulse(d=4.3):
    t = t_(d); rate = 2.2 - 0.25 * t        # pulses slow down as the force spreads out
    ph = np.cumsum(rate) / SR
    pulse = np.exp(-((ph % 1.0) / 0.16) ** 2)
    x = (np.sin(2 * np.pi * 58 * t) + 0.4 * np.sin(2 * np.pi * 116 * t)) * pulse
    return norm(x * np.exp(-t / 2.6))


