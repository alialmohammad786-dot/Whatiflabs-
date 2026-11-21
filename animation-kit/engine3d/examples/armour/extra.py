# Extra layers: (1) an original eerie, curious ambient bed in the style of fact-short channels, (2) more whooshes and transitions.
import numpy as np, soundfile as sf
import sound as S                      # reuses the synth helpers (also rebuilds sfx.wav / music.wav identically)
SR, N, D = S.SR, S.N, S.DUR
t = np.arange(N) / SR
rng = np.random.default_rng(23)

# ---------- 1. ambient bed (D minor, matches the music) ----------
def bell(f, d=3.2):
    tt = np.arange(int(d * SR)) / SR
    x = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / (d / (3 + 2 * i))) for i, (r, a) in enumerate([(1, 1), (2.0, 0.35), (3.01, 0.18), (4.2, 0.08)]))
    x *= np.minimum(1, tt / 0.012)
    return x
bed = np.zeros(N + SR * 5)
# glassy high pad that slowly breathes
for f, a, ph in [(587.33, 0.5, 0.0), (880.0, 0.35, 1.3), (698.46, 0.3, 2.1), (1174.66, 0.15, 0.7)]:
    bed[:N] += a * np.sin(2 * np.pi * f * t + 1.5 * np.sin(2 * np.pi * 0.21 * t + ph)) * (0.55 + 0.45 * np.sin(2 * np.pi * t / 7.3 + ph)) * 0.16
# dark low texture
bed[:N] += 0.5 * S.lp(rng.standard_normal(N), 140) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 11)) * 0.9
# sparse music-box notes on the beat grid: a simple questioning motif
D4, E4, F4, A4, C5, D5 = 293.66, 329.63, 349.23, 440.0, 523.25, 587.33
motif = [D5, A4, F4, A4, E4, A4, D5, C5, A4, F4, E4, D4]
for i, f in enumerate(motif):
    at = 0.6 + i * 2.4
    if at > D - 1: break
    b = bell(f); a = int(at * SR); bed[a:a + len(b)] += 0.30 * b
    b2 = bell(f * 2, 2.0); a2 = int((at + 1.2) * SR); bed[a2:a2 + len(b2)] += 0.10 * b2      # soft echo an octave up
bed = S.reverb(bed, size=2.6, wet=0.6, bright=4200)[:N]
bed *= np.clip(t / 1.0, 0, 1) * np.clip((D - t) / 1.0, 0, 1)
wide = np.roll(bed, int(0.017 * SR))
sf.write('audio/atmos.wav', np.stack([bed, 0.7 * bed + 0.3 * wide], 1) / np.abs(bed).max() * 0.7, SR)

# ---------- 2. whooshes and transitions ----------
L = np.zeros(N + SR * 3); R = np.zeros(N + SR * 3)
def put(x, at, gain=1.0, p0=0.0, p1=None):
    """place a sound; pan sweeps from p0 to p1 (-1 left .. 1 right)"""
    a = max(0, int(at * SR)); x = x[: len(L) - a]
    p = np.linspace(p0, p0 if p1 is None else p1, len(x))
    L[a:a + len(x)] += x * gain * np.sqrt((1 - p) / 2) * 1.414; R[a:a + len(x)] += x * gain * np.sqrt((1 + p) / 2) * 1.414
def big(d=0.55, deep=True):            # layered cut whoosh: airy top + low body
    n = int(d * SR); x = S.whoosh(d, 350, 3200, 700)[:n]
    if deep: x = x + 0.9 * S.norm(S.lp(S.noise(d), 260)[:n] * np.hanning(n) ** 2)
    return S.norm(x)
def swell(d=1.0):                      # reverse-cymbal style swell that sucks into a cut
    n = int(d * SR); x = S.hp(S.noise(d), 3000)[:n] * np.linspace(0, 1, n) ** 3
    x[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR)); return S.norm(x)
def flyby(d=0.5, f=1400):              # fast object passing the camera
    return S.norm(S.swept_noise(d, f * 1.6, f, f * 0.45, q=0.5) * np.hanning(int(d * SR)) ** 3)
def sub(d=0.9): return S.boom(d, 60, 32)

for cut, pan in [(2.42, (-0.7, 0.7)), (6.25, (0.7, -0.7)), (8.75, (-0.6, 0.6)), (10.68, (0.6, -0.6)), (13.0, (-0.5, 0.5)), (19.45, (0.7, -0.7)), (21.85, (-0.7, 0.7)), (25.4, (0.8, -0.8))]:
    put(big(0.55), cut - 0.30, 0.50, *pan)            # peaks right on the cut
    put(sub(0.7), cut, 0.22)
put(swell(1.0), 5.25, 0.30); put(swell(0.9), 18.55, 0.30); put(swell(1.1), 24.3, 0.34)       # into the "But" turns and the finale
put(flyby(0.6, 900), 3.2, 0.22, -0.8, 0.6)            # slow-motion bullet drifting past
put(big(0.4, False), 0.9, 0.25, -0.5, 0.5)            # camera push-in on the opening
put(flyby(0.35, 1800), 9.0, 0.30, 0.8, -0.6)          # blade sweeping across
put(big(0.5), 13.9, 0.22, 0.4, -0.4); put(big(0.5), 16.4, 0.22, -0.4, 0.4)   # camera drifting over the ripple
put(flyby(0.4, 2200), 21.12, 0.40, -0.9, 0.9)         # arrow in flight
put(flyby(0.45, 2600), 25.75, 0.50, -0.9, 0.9)        # final bullet
put(big(0.6), 25.95, 0.35, -0.6, 0.6)                 # camera whip to the plate
put(big(0.7), 27.2, 0.35, -0.7, 0.7)                  # pan across to the mail
put(big(0.8), 28.35, 0.40, 0.6, -0.6); put(sub(1.2), 28.65, 0.35)            # wide reveal
x = np.stack([L, R], 1)[:N]; x[-12000:] *= np.linspace(1, 0, 12000)[:, None]
sf.write('audio/sfx2.wav', np.tanh(x * 0.9) * 0.9, SR)
print('ok')
