# Sound design for the armour short, synthesised from scratch (no samples, nothing to license).
# Writes audio/sfx.wav and audio/music.wav (48 kHz stereo). Event times are seconds in the edit.
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 29.5
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


L = np.zeros(N + SR * 3); R = np.zeros(N + SR * 3)
def put(x, at, gain=1.0, pan=0.0):
    a = int(at * SR); x = x[: len(L) - a]
    L[a: a + len(x)] += x * gain * np.sqrt((1 - pan) / 2) * 1.414
    R[a: a + len(x)] += x * gain * np.sqrt((1 + pan) / 2) * 1.414


# ---- shot 1: gun fires (0.0) ----
put(gunshot(), 0.02, 0.55, -0.2)
# ---- shot 2 (2.42): slow-motion bullet, flattens at 5.37 ----
put(whoosh(0.3, 400, 1800, 500), 2.30, 0.30)
put(slowmo_air(2.9), 2.45, 0.22)
put(reverb(clang(210, 2.0, 0.8, seed=1), 1.4, 0.4), 5.37, 0.50, 0.1)       # pitched-down "slow" impact
put(boom(1.6, 70, 34), 5.37, 0.55)
# ---- the "But" turn (dip to black 6.0-6.5) ----
put(riser(0.75), 5.28, 0.22)
put(boom(2.4, 80, 28), 6.08, 0.80)
# ---- shot 3 (6.25): sword swing, hits 8.00 ----
put(whoosh(0.34, 500, 3600, 900), 7.72, 0.55, 0.3)
put(reverb(clang(880, 1.3, 1.0, seed=2), 0.9, 0.3), 8.00, 0.60, 0.15)
# ---- shot 4 (8.75): blade scrapes across the mail ----
put(whoosh(0.25, 600, 3000, 800), 8.66, 0.28)
put(reverb(scrape(1.45), 0.6, 0.2), 8.92, 0.34, -0.1)
# ---- shot 5 (10.68): mace slams the plate at 12.58 ----
put(whoosh(0.25, 300, 1600, 500), 10.60, 0.26)
put(whoosh(0.42, 250, 1900, 400), 12.22, 0.60, -0.3)
put(reverb(clang(330, 1.8, 0.9, seed=3), 1.2, 0.35), 12.58, 0.75)
put(thud(110, 40, 0.6), 12.58, 0.80)
# ---- shot 6 (13.0): the force ripple spreads ----
put(ripple_pulse(4.3), 13.05, 0.30)
# ---- shot 7 (19.45): archer looses at 21.05 ----
put(whoosh(0.28, 400, 2200, 600), 19.36, 0.26)
put(twang(), 21.05, 0.55, -0.3)
put(whistle(0.6), 21.10, 0.30, 0.2)
# ---- shot 8 (21.85): arrow punches in at 21.97 ----
put(whistle(0.16), 21.84, 0.30)
put(thud(140, 60, 0.3), 21.97, 0.70)
put(reverb(clang(1250, 0.7, 0.9, seed=4), 0.7, 0.3), 21.97, 0.42, 0.1)
# ---- shot 9 (25.4): bullet through plate (26.45) then mail (27.95) ----
put(whoosh(0.5, 500, 4200, 1200), 25.32, 0.45)
put(gunshot(), 25.42, 0.38, -0.3)
put(reverb(clang(420, 1.2, 1.0, seed=5), 1.0, 0.35), 26.45, 0.70, -0.15)
put(thud(120, 45, 0.4), 26.45, 0.60)
put(reverb(clang(1500, 0.6, 1.1, seed=6), 0.7, 0.3), 27.95, 0.50, 0.25)
put(thud(130, 55, 0.3), 27.95, 0.50)
put(boom(2.0, 65, 30), 28.95, 0.55)

sfx = np.stack([L, R], 1)[:N]
sfx[-int(0.25 * SR):] *= np.linspace(1, 0, int(0.25 * SR))[:, None]
sf.write('audio/sfx.wav', np.tanh(sfx * 0.9) * 0.9, SR)

# ================= music bed: dark pulse in D minor, 100 BPM =================
BEAT = 0.6
t = np.arange(N) / SR
D1, D2, F2, A2, C3, D3, F3, A3 = 36.71, 73.42, 87.31, 110.0, 130.81, 146.83, 174.61, 220.0


def saw(f, tt, det=0.0):
    return sum(2 * ((f * (1 + d) * tt) % 1.0) - 1 for d in (-det, 0, det)) / 3


def pad(freqs, cutoff):
    x = sum(saw(f, t, 0.004) for f in freqs) / len(freqs)
    return lp(x, cutoff, 2)


music = np.zeros(N)
# drone, always there, swelling slowly
music += 0.50 * (np.sin(2 * np.pi * D1 * t) + 0.5 * np.sin(2 * np.pi * D2 * t)) * (0.75 + 0.25 * np.sin(2 * np.pi * t / 9.6))
# pad: Dm for the set-up, then Dm -> Bb -> F -> C under the examples, back to Dm for the pay-off
BB2, F1b, C2 = 58.27, 43.65, 65.41
sections = [(0, 6.2, [D3, F3, A3]), (6.2, 10.7, [D3, F3, A3]), (10.7, 15.5, [116.54, D3, F3]),
            (15.5, 19.4, [F2 * 2, A3, C3 * 2]), (19.4, 25.4, [C3, 164.81, 196.0]), (25.4, DUR, [D3, F3, A3])]
for a, b, ch in sections:
    m = (t >= a - 0.4) & (t < b + 0.4)
    e = np.clip((t - (a - 0.4)) / 0.8, 0, 1) * np.clip(((b + 0.4) - t) / 0.8, 0, 1)
    music += 0.22 * pad(ch, 520 + 380 * (a > 6)) * e * m
# pulse bass: eighth notes, enters after the "But" turn
roots = [(6.2, 10.7, D2), (10.7, 15.5, BB2), (15.5, 19.4, F2), (19.4, 25.4, C2), (25.4, 28.9, D2)]
for a, b, f in roots:
    k = a
    while k < b - 0.05:
        n = int(0.28 * SR); tt = np.arange(n) / SR
        note = lp(saw(f, tt), 380) * np.exp(-tt / 0.11)
        i = int(k * SR); music[i: i + n] += 0.42 * note[: N - i]
        k += BEAT / 2
# soft kick on the beat from the examples onward, a little harder in the final run
k = 6.2
while k < 28.9:
    n = int(0.3 * SR); tt = np.arange(n) / SR
    kick = np.sin(2 * np.pi * np.cumsum(45 + 70 * np.exp(-tt / 0.03)) / SR) * np.exp(-tt / 0.09)
    i = int(k * SR); music[i: i + n] += (0.50 if k < 19.4 else 0.62) * kick[: N - i]
    k += BEAT
# ticking hats (16ths) from the mace shot onward, for pace
k = 10.7; j = 0
while k < 28.9:
    n = int(0.04 * SR)
    hat = hp(rng.standard_normal(n), 7000) * np.exp(-np.arange(n) / SR / 0.008)
    i = int(k * SR); music[i: i + n] += (0.10 if j % 4 else 0.17) * hat[: N - i]
    k += BEAT / 4; j += 1
# breathing room: drop the rhythm out for the black dip, fade in at the top and out at the end
music *= np.clip(t / 0.6, 0, 1) * np.clip((DUR - t) / 0.7, 0, 1)
music = np.tanh(music * 0.9)
wide = lp(np.roll(music, int(0.011 * SR)), 3000)             # gentle stereo spread
sf.write('audio/music.wav', np.stack([music * 0.85 + wide * 0.15, music * 0.85 - wide * 0.15 + wide * 0.3], 1) * 0.8, SR)
print('wrote audio/sfx.wav and audio/music.wav')
