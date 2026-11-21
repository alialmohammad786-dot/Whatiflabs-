# More expressive Kokoro voiceover: the two liveliest voices blended, each phrase's pitch movement widened,
# key phrases pushed harder, and every phrase kept to the same length as before so the captions still match.
import json, os, subprocess, sys, warnings
warnings.filterwarnings("ignore")
import numpy as np, soundfile as sf, pyworld as pw
from kokoro_onnx import Kokoro, EspeakConfig
import espeakng_loader
KIT = sys.argv[1]
k = Kokoro(os.path.join(KIT, "models/kokoro-v1.0.onnx"), os.path.join(KIT, "models/voices-v1.0.bin"),
           espeak_config=EspeakConfig(lib_path=espeakng_loader.get_library_path(), data_path=espeakng_loader.get_data_path()))
style = 0.5 * k.get_voice_style("am_fenrir") + 0.5 * k.get_voice_style("am_puck")
# start, length to match, spoken text (punctuation steers the delivery), pitch widening, loudness, pitch offset in semitones
C = [
 [0.00, 2.01, "If you shot a bullet at ancient armor,",                        1.30, 1.00,  0.4],
 [2.60, 2.69, "some people think it could actually stop the impact.",          1.30, 0.95,  0.0],
 [6.10, 4.02, "But armor like chain mail, was designed to block slashing swords.", 1.35, 1.05, 0.3],
 [10.70, 3.17, "And plate armor was even better, at deflecting strikes,",      1.35, 1.00,  0.2],
 [14.10, 2.69, "by spreading the blunt force across more area,",               1.25, 0.95, -0.2],
 [17.30, 1.23, "lessening its impact.",                                        1.20, 0.92, -0.6],
 [18.90, 3.04, "But these materials weren't very good at stopping arrows!",    1.40, 1.08,  0.5],
 [22.70, 2.09, "which had enough energy to enter the armor.",                  1.30, 1.00,  0.0],
 [25.40, 3.26, "So a modern bullet would have no trouble, going right through!", 1.40, 1.12, -0.3],
]
sr = 24000; FP = 5.0
total = np.zeros(int(30.5 * sr))
for start, target, text, widen, gain, shift in C:
    s, _ = k.create(text, voice=style, speed=1.0, lang="en-us")
    idx = np.where(np.abs(s) > 0.01)[0]; s = s[max(0, idx[0] - 360): idx[-1] + 1440]
    sp_ = float(np.clip(len(s) / sr / target, 0.85, 1.25))
    s, _ = k.create(text, voice=style, speed=sp_, lang="en-us")
    idx = np.where(np.abs(s) > 0.01)[0]; s = s[max(0, idx[0] - 360): idx[-1] + 1440].astype(np.float64)
    f0, t = pw.harvest(s, sr, frame_period=FP); spc = pw.cheaptrick(s, f0, t, sr); ap = pw.d4c(s, f0, t, sr)
    v = f0 > 0; med = np.median(f0[v])
    f0[v] = np.clip(med * 2 ** ((np.log2(f0[v] / med) * widen) + shift / 12), 55, 340)
    n2 = int(round(target * 1000 / FP)); src = np.linspace(0, len(f0) - 1, n2); i = np.round(src).astype(int)   # exact length
    y = pw.synthesize(np.ascontiguousarray(f0[i]), np.ascontiguousarray(spc[i]), np.ascontiguousarray(ap[i]), sr, FP) * gain
    fd = 200; y[:fd] *= np.linspace(0, 1, fd); y[-fd:] *= np.linspace(1, 0, fd)
    a = int(start * sr); total[a:a + len(y)] += y
    st = 12 * np.log2(f0[v] / med)
    print(f"{start:5.2f} speed {sp_:.2f} len {len(y)/sr:.2f}s pitch-spread {st.std():.1f}st  {text}")
sf.write("audio/vo2_raw.wav", total / max(1, np.abs(total).max() / 0.95), sr)
chain = ",".join(["highpass=f=70", "equalizer=f=140:t=q:w=0.9:g=2.5", "equalizer=f=320:t=q:w=1.2:g=-1.5",
    "equalizer=f=3400:t=q:w=1.0:g=2.5", "equalizer=f=7600:t=q:w=2.5:g=-2.5",
    "acompressor=threshold=-22dB:ratio=2.2:attack=10:release=160:makeup=3",   # lighter squeeze than before, keeps the emphasis
    "aecho=0.9:0.25:18|31:0.10|0.06", "alimiter=limit=0.9"])
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "audio/vo2_raw.wav", "-af", chain, "-ac", "1", "-ar", "44100", "audio/vo2.wav"], check=True)
