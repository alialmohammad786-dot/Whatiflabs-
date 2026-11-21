# Sound design for "What if you fired a gun underwater?" — all synthesised. Writes audio/sfx.wav, music.wav, atmos.wav.
import numpy as np, soundfile as sf
import synth as S
SR, N, D = S.SR, S.N, S.DUR
t = np.arange(N) / SR
rng = np.random.default_rng(41)
L = np.zeros(N + SR * 4); R = np.zeros(N + SR * 4)
def put(x, at, gain=1.0, p0=0.0, p1=None):
    a = max(0, int(at * SR)); x = x[: len(L) - a]
    p = np.linspace(p0, p0 if p1 is None else p1, len(x))
    L[a:a + len(x)] += x * gain * np.sqrt((1 - p) / 2) * 1.414; R[a:a + len(x)] += x * gain * np.sqrt((1 + p) / 2) * 1.414
def big(d=0.55):
    n = int(d * SR); x = S.whoosh(d, 350, 3200, 700)[:n] + 0.9 * S.norm(S.lp(S.noise(d), 260)[:n] * np.hanning(n) ** 2); return S.norm(x)
def swell(d=1.0):
    n = int(d * SR); x = S.hp(S.noise(d), 3000)[:n] * np.linspace(0, 1, n) ** 3
    x[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR)); return S.norm(x)
def splash(d=1.1):
    n = int(d * SR); tt = np.arange(n) / SR
    x = S.bp(S.noise(d), 500, 7000)[:n] * (np.exp(-tt / 0.18) + 0.35 * np.exp(-tt / 0.5)) * np.minimum(1, tt / 0.004)
    th = S.thud(130, 50, 0.4); x[: len(th)] += th * 0.8
    return S.norm(S.reverb(x, 0.6, 0.2))
def bubbles(d, rate=14, f0=500, f1=1700, seed=1):
    r = np.random.default_rng(seed); n = int(d * SR); x = np.zeros(n + SR)
    for _ in range(int(d * rate)):
        at = r.uniform(0, d); dur = r.uniform(0.03, 0.09); m = int(dur * SR); tt = np.arange(m) / SR
        f = r.uniform(f0, f1) * (1 + 0.5 * tt / dur)
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.hanning(m) * r.uniform(0.3, 1)
        a = int(at * SR); x[a:a + m] += b
    return S.norm(x[:n])
def deep(d):                                   # muffled underwater rumble
    n = int(d * SR); tt = np.arange(n) / SR
    x = S.lp(S.noise(d), 220)[:n] * (0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * tt)) + 0.3 * np.sin(2 * np.pi * 52 * tt + 2 * np.sin(2 * np.pi * 0.2 * tt))
    return S.norm(x * np.minimum(1, tt / 0.25) * np.minimum(1, (d - tt) / 0.25))
def muffle(x, f=900): return S.norm(S.lp(x, f))
for i, cut in enumerate([2.35, 7.15, 10.8, 13.85, 18.7]):
    pan = (-0.7, 0.7) if i % 2 == 0 else (0.7, -0.7)
    put(big(0.55), cut - 0.30, 0.45, *pan); put(S.boom(0.7, 60, 32), cut, 0.2)
# shot 1: rifle (0.9), slow motion
put(S.gunshot(), 0.9, 0.6, -0.5); put(S.boom(1.2, 90, 40), 0.9, 0.4)
put(S.slowmo_air(1.3), 1.05, 0.2)
# shot 2: under the surface
put(deep(1.9), 2.35, 0.3); put(bubbles(1.8, 16, seed=2), 2.4, 0.2, 0.3)
put(swell(0.9), 3.35, 0.3); put(S.boom(2.2, 80, 28), 4.27, 0.8)
# shot 3: the bullet hits the surface (5.5)
put(S.slowmo_air(1.2), 4.3, 0.2)
put(splash(), 5.5, 0.75); put(muffle(S.clang(300, 1.2, 0.8, seed=2), 700), 5.52, 0.3)
put(bubbles(1.5, 22, seed=3), 5.6, 0.25, -0.2, 0.2)
# shot 4: the water pushes back
put(deep(3.65), 7.15, 0.36); put(bubbles(3.5, 9, 300, 900, seed=4), 7.2, 0.14)
put(S.ripple_pulse(3.4), 7.35, 0.3)
put(muffle(S.reverb(S.clang(180, 1.8, 0.8, seed=5), 1.2, 0.4), 600), 8.6, 0.3); put(muffle(S.scrape(1.2), 1500), 9.3, 0.16)
# shot 5: it shatters (11.75)
put(deep(3.05), 10.8, 0.3); put(swell(0.6), 11.15, 0.24)
put(muffle(S.reverb(S.clang(900, 1.0, 1.0, seed=6), 0.9, 0.35), 2500), 11.75, 0.6); put(S.boom(1.6, 75, 32), 11.75, 0.6)
put(bubbles(1.6, 30, seed=7), 11.8, 0.3, -0.3, 0.3)
# shot 6: pistol (14.3), splash (14.42), stream of bubbles, dies (~17.0)
put(S.gunshot(), 14.3, 0.45, -0.5); put(splash(0.9), 14.42, 0.6, -0.2)
put(bubbles(2.6, 20, seed=8), 14.5, 0.24, -0.2, 0.3); put(deep(3.8), 14.6, 0.24)
put(S.boom(1.4, 55, 30), 17.05, 0.35)
# shot 7: calm, the bullets drift past
put(deep(4.1), 18.7, 0.3); put(bubbles(3.6, 6, 350, 1000, seed=9), 18.9, 0.16, 0.3)
put(S.boom(2.0, 65, 30), 22.0, 0.5)
x = np.stack([L, R], 1)[:N]; x[-12000:] *= np.linspace(1, 0, 12000)[:, None]
sf.write('audio/sfx.wav', np.tanh(x * 0.9) * 0.9, SR)

# ---------- music: dark pulse in D minor, 100 BPM, re-cut to this edit ----------
BEAT = 0.6
D1, D2, F2, C2, BB2, C3, D3, F3, A3 = 36.71, 73.42, 87.31, 65.41, 58.27, 130.81, 146.83, 174.61, 220.0
saw = lambda f, tt, det=0.0: sum(2 * ((f * (1 + d) * tt) % 1.0) - 1 for d in (-det, 0, det)) / 3
pad = lambda fr, cut: S.lp(sum(saw(f, t, 0.004) for f in fr) / len(fr), cut, 2)
m = 0.50 * (np.sin(2 * np.pi * D1 * t) + 0.5 * np.sin(2 * np.pi * D2 * t)) * (0.75 + 0.25 * np.sin(2 * np.pi * t / 9.6))
secs = [(0, 4.3, [D3, F3, A3], D2), (4.3, 7.15, [D3, F3, A3], D2), (7.15, 10.8, [116.54, D3, F3], BB2), (10.8, 13.85, [F2 * 2, A3, C3 * 2], F2), (13.85, 18.7, [C3, 164.81, 196.0], C2), (18.7, D, [D3, F3, A3], D2)]
for a, b, ch, root in secs:
    msk = (t >= a - 0.4) & (t < b + 0.4); e = np.clip((t - (a - 0.4)) / 0.8, 0, 1) * np.clip(((b + 0.4) - t) / 0.8, 0, 1)
    m += 0.22 * pad(ch, 520 + 380 * (a > 4)) * e * msk
    if a < 4: continue
    k = a
    while k < min(b, 22.0) - 0.05:
        n = int(0.28 * SR); tt = np.arange(n) / SR; i = int(k * SR)
        m[i:i + n] += 0.42 * (S.lp(saw(root, tt), 380) * np.exp(-tt / 0.11))[: N - i]; k += BEAT / 2
k = 4.3
while k < 22.0:
    n = int(0.3 * SR); tt = np.arange(n) / SR; i = int(k * SR)
    kick = np.sin(2 * np.pi * np.cumsum(45 + 70 * np.exp(-tt / 0.03)) / SR) * np.exp(-tt / 0.09)
    m[i:i + n] += (0.50 if k < 13.85 else 0.62) * kick[: N - i]; k += BEAT
k = 7.15; j = 0
while k < 22.0:
    n = int(0.04 * SR); hat = S.hp(rng.standard_normal(n), 7000) * np.exp(-np.arange(n) / SR / 0.008); i = int(k * SR)
    m[i:i + n] += (0.10 if j % 4 else 0.17) * hat[: N - i]; k += BEAT / 4; j += 1
m *= np.clip(t / 0.6, 0, 1) * np.clip((D - t) / 0.9, 0, 1); m = np.tanh(m * 0.9)
w = S.lp(np.roll(m, int(0.011 * SR)), 3000)
sf.write('audio/music.wav', np.stack([m * 0.85 + w * 0.15, m * 0.85 + w * 0.15 * 0.0 - w * 0.15 + w * 0.3], 1) * 0.8, SR)

# ---------- eerie ambient bed ----------
def bell(f, d=3.2):
    tt = np.arange(int(d * SR)) / SR
    return sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / (d / (3 + 2 * i))) for i, (r, a) in enumerate([(1, 1), (2.0, 0.35), (3.01, 0.18), (4.2, 0.08)])) * np.minimum(1, tt / 0.012)
bed = np.zeros(N + SR * 5)
for f, a, ph in [(587.33, 0.5, 0.0), (880.0, 0.35, 1.3), (698.46, 0.3, 2.1), (1174.66, 0.15, 0.7)]:
    bed[:N] += a * np.sin(2 * np.pi * f * t + 1.5 * np.sin(2 * np.pi * 0.21 * t + ph)) * (0.55 + 0.45 * np.sin(2 * np.pi * t / 7.3 + ph)) * 0.16
bed[:N] += 0.45 * S.lp(rng.standard_normal(N), 140) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 11))
D4, E4, F4, A4, C5, D5 = 293.66, 329.63, 349.23, 440.0, 523.25, 587.33
for i, f in enumerate([D5, F4, A4, E4, D5, C5, A4, F4, E4, D4, A4]):
    at = 0.5 + i * 2.4
    if at > D - 1: break
    b = bell(f); a = int(at * SR); bed[a:a + len(b)] += 0.30 * b
    b2 = bell(f * 2, 2.0); a2 = int((at + 1.2) * SR); bed[a2:a2 + len(b2)] += 0.10 * b2
bed = S.reverb(bed, size=2.6, wet=0.6, bright=4200)[:N]
bed *= np.clip(t / 1.0, 0, 1) * np.clip((D - t) / 1.0, 0, 1)
sf.write('audio/atmos.wav', np.stack([bed, 0.7 * bed + 0.3 * np.roll(bed, int(0.017 * SR))], 1) / np.abs(bed).max() * 0.7, SR)
print('ok')
