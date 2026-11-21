# Sound design for "Can you slice a bullet?" — all synthesised. Writes audio/sfx.wav, music.wav, atmos.wav (48 kHz stereo).
import numpy as np, soundfile as sf
import synth as S
SR, N, D = S.SR, S.N, S.DUR
t = np.arange(N) / SR
rng = np.random.default_rng(31)
L = np.zeros(N + SR * 4); R = np.zeros(N + SR * 4)
def put(x, at, gain=1.0, p0=0.0, p1=None):
    a = max(0, int(at * SR)); x = x[: len(L) - a]
    p = np.linspace(p0, p0 if p1 is None else p1, len(x))
    L[a:a + len(x)] += x * gain * np.sqrt((1 - p) / 2) * 1.414; R[a:a + len(x)] += x * gain * np.sqrt((1 + p) / 2) * 1.414
def big(d=0.55, deep=True):
    n = int(d * SR); x = S.whoosh(d, 350, 3200, 700)[:n]
    if deep: x = x + 0.9 * S.norm(S.lp(S.noise(d), 260)[:n] * np.hanning(n) ** 2)
    return S.norm(x)
def swell(d=1.0):
    n = int(d * SR); x = S.hp(S.noise(d), 3000)[:n] * np.linspace(0, 1, n) ** 3
    x[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR)); return S.norm(x)
def flyby(d=0.5, f=1400):
    return S.norm(S.swept_noise(d, f * 1.6, f, f * 0.45, q=0.5) * np.hanning(int(d * SR)) ** 3)
def shing(f=2300, d=1.6):                     # bright blade ring
    tt = np.arange(int(d * SR)) / SR
    x = sum(np.sin(2 * np.pi * f * r * tt + i) * np.exp(-tt / (d / (4 + 2 * i))) / (1 + i) for i, r in enumerate([1, 1.5, 2.26, 3.1]))
    return S.norm(x * np.minimum(1, tt / 0.03))
def woodthud():
    x = S.thud(170, 70, 0.25) + 0.6 * S.norm(S.bp(S.noise(0.25), 400, 2500)[: int(0.25 * SR)] * S.env_exp(0.25, 0.02))
    return S.norm(x)
CUTS = [2.4, 4.6, 8.55, 12.5, 17.25, 19.5]
for i, cut in enumerate(CUTS):
    if cut == 4.6: continue                                       # that one is a dip to black with its own hit
    pan = (-0.7, 0.7) if i % 2 == 0 else (0.7, -0.7)
    put(big(0.55), cut - 0.30, 0.50, *pan); put(S.boom(0.7, 60, 32), cut, 0.2)
# shot 1: the shot
put(S.gunshot(), 0.02, 0.55, -0.5)
put(flyby(0.5, 1000), 0.9, 0.2, -0.6, 0.5)
# shot 2: slow motion towards the edge, tension, then the "But" turn
put(S.slowmo_air(2.1), 2.45, 0.22)
put(swell(0.9), 3.72, 0.3); put(S.riser(0.7), 3.9, 0.2)
put(S.boom(2.4, 80, 28), 4.62, 0.8)
# shot 3: the bullet opens
put(big(0.5, False), 5.1, 0.28, -0.3, 0.5)
put(S.reverb(S.clang(1700, 0.5, 0.8, seed=2), 0.6, 0.3), 6.08, 0.16, 0.3)
put(S.reverb(S.clang(700, 0.9, 0.7, seed=3), 0.8, 0.3), 7.15, 0.14, -0.2)
# shot 4: glints racing up the hardened edge
put(S.reverb(shing(2300), 1.2, 0.4), 9.3, 0.22, -0.3, 0.3)
put(S.reverb(shing(2750), 1.2, 0.4), 11.12, 0.22, 0.3, -0.3)
put(big(0.5), 10.3, 0.2, 0.4, -0.4)
# shot 5: the slice (contact 15.35)
put(S.slowmo_air(2.7), 12.6, 0.22)
put(swell(1.0), 14.35, 0.34)
put(S.reverb(S.clang(950, 1.5, 1.0, seed=4), 1.0, 0.3), 15.35, 0.6, 0.1)
put(S.reverb(S.clang(240, 2.2, 0.8, seed=5), 1.5, 0.4), 15.35, 0.45)
put(S.boom(1.8, 70, 32), 15.35, 0.6)
put(S.reverb(S.scrape(1.1), 0.6, 0.25), 15.4, 0.3, -0.2, 0.2)
put(flyby(0.6, 800), 16.2, 0.2, -0.7, -0.9); put(flyby(0.6, 850), 16.25, 0.2, 0.7, 0.9)
# shot 6: real speed (edge 17.60, board 17.65)
put(S.gunshot(), 17.5, 0.42, -0.6)
put(S.reverb(S.clang(1300, 0.7, 1.0, seed=6), 0.7, 0.3), 17.6, 0.5, -0.1)
put(woodthud(), 17.65, 0.75, 0.4); put(woodthud(), 17.68, 0.7, 0.7)
# shot 7: first bullet whizzes past (20.25), late swing (20.75), guard (22.2), second bullet splits on the blade (23.85)
put(flyby(0.3, 2600), 20.12, 0.55, -0.9, 0.9)
put(S.whoosh(0.36, 500, 3600, 900), 20.86, 0.55, 0.3, -0.3)
put(big(0.45, False), 22.1, 0.22, -0.2, 0.2)
put(S.reverb(shing(2500, 1.2), 1.0, 0.35), 22.75, 0.16)
put(swell(0.7), 23.15, 0.26)
put(flyby(0.25, 2600), 23.68, 0.5, -0.9, -0.2)
put(S.reverb(S.clang(1100, 1.4, 1.0, seed=7), 1.0, 0.35), 23.85, 0.65, -0.2)
put(S.boom(2.0, 65, 30), 23.86, 0.6)
put(flyby(0.4, 1800), 23.88, 0.35, -0.2, 0.9); put(flyby(0.4, 1700), 23.89, 0.35, -0.2, -0.9)
x = np.stack([L, R], 1)[:N]; x[-12000:] *= np.linspace(1, 0, 12000)[:, None]
sf.write('audio/sfx.wav', np.tanh(x * 0.9) * 0.9, SR)

# ---------- music: dark pulse in D minor, 100 BPM, re-cut to this edit ----------
BEAT = 0.6
D1, D2, F2, C2, BB2, C3, D3, F3, A3 = 36.71, 73.42, 87.31, 65.41, 58.27, 130.81, 146.83, 174.61, 220.0
saw = lambda f, tt, det=0.0: sum(2 * ((f * (1 + d) * tt) % 1.0) - 1 for d in (-det, 0, det)) / 3
pad = lambda fr, cut: S.lp(sum(saw(f, t, 0.004) for f in fr) / len(fr), cut, 2)
m = 0.50 * (np.sin(2 * np.pi * D1 * t) + 0.5 * np.sin(2 * np.pi * D2 * t)) * (0.75 + 0.25 * np.sin(2 * np.pi * t / 9.6))
secs = [(0, 4.7, [D3, F3, A3], D2), (4.7, 8.55, [D3, F3, A3], D2), (8.55, 12.5, [116.54, D3, F3], BB2), (12.5, 17.25, [F2 * 2, A3, C3 * 2], F2), (17.25, 19.5, [C3, 164.81, 196.0], C2), (19.5, D, [D3, F3, A3], D2)]
for a, b, ch, root in secs:
    msk = (t >= a - 0.4) & (t < b + 0.4); e = np.clip((t - (a - 0.4)) / 0.8, 0, 1) * np.clip(((b + 0.4) - t) / 0.8, 0, 1)
    m += 0.22 * pad(ch, 520 + 380 * (a > 4)) * e * msk
    if a < 4: continue
    k = a
    while k < min(b, 24.6) - 0.05:
        n = int(0.28 * SR); tt = np.arange(n) / SR; i = int(k * SR)
        m[i:i + n] += 0.42 * (S.lp(saw(root, tt), 380) * np.exp(-tt / 0.11))[: N - i]; k += BEAT / 2
k = 4.7
while k < 24.6:
    n = int(0.3 * SR); tt = np.arange(n) / SR; i = int(k * SR)
    kick = np.sin(2 * np.pi * np.cumsum(45 + 70 * np.exp(-tt / 0.03)) / SR) * np.exp(-tt / 0.09)
    m[i:i + n] += (0.50 if k < 17.25 else 0.62) * kick[: N - i]; k += BEAT
k = 8.55; j = 0
while k < 24.6:
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
