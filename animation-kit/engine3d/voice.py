# Expressive Kokoro voiceover (Fenrir + Puck blend, widened pitch). Phrases are laid end to end with natural pauses;
# writes audio/vo.wav and timing.json (start/end of every phrase) so the shots can be cut to the voice.
import json, os, subprocess, sys, warnings
warnings.filterwarnings("ignore")
import numpy as np, soundfile as sf, pyworld as pw
from kokoro_onnx import Kokoro, EspeakConfig
import espeakng_loader
KIT = sys.argv[1]
k = Kokoro(os.path.join(KIT, "models/kokoro-v1.0.onnx"), os.path.join(KIT, "models/voices-v1.0.bin"),
           espeak_config=EspeakConfig(lib_path=espeakng_loader.get_library_path(), data_path=espeakng_loader.get_data_path()))
style = 0.5 * k.get_voice_style("am_fenrir") + 0.5 * k.get_voice_style("am_puck")
# text, pause after (s), speed, pitch widening, loudness, pitch offset (semitones)
C = json.load(open("clauses.json"))
sr = 24000; FP = 5.0; out = []; t0 = 0.0; timing = []
for text, pause, speed, widen, gain, shift in C:
    s, _ = k.create(text, voice=style, speed=speed, lang="en-us")
    idx = np.where(np.abs(s) > 0.01)[0]; s = s[max(0, idx[0] - 360): idx[-1] + 1440].astype(np.float64)
    f0, t = pw.harvest(s, sr, frame_period=FP); spc = pw.cheaptrick(s, f0, t, sr); ap = pw.d4c(s, f0, t, sr)
    v = f0 > 0; med = np.median(f0[v])
    f0[v] = np.clip(med * 2 ** ((np.log2(f0[v] / med) * widen) + shift / 12), 55, 340)
    y = pw.synthesize(f0, spc, ap, sr, FP) * gain
    y[:200] *= np.linspace(0, 1, 200); y[-200:] *= np.linspace(1, 0, 200)
    timing.append({"text": text, "start": round(t0, 3), "end": round(t0 + len(y) / sr, 3)})
    out.append(y); out.append(np.zeros(int(pause * sr))); t0 += len(y) / sr + pause
total = np.concatenate(out); total /= max(1, np.abs(total).max() / 0.95)
sf.write("audio/vo_raw.wav", total, sr)
chain = ",".join(["highpass=f=70", "equalizer=f=140:t=q:w=0.9:g=2.5", "equalizer=f=320:t=q:w=1.2:g=-1.5",
    "equalizer=f=3400:t=q:w=1.0:g=2.5", "equalizer=f=7600:t=q:w=2.5:g=-2.5",
    "acompressor=threshold=-22dB:ratio=2.2:attack=10:release=160:makeup=3", "aecho=0.9:0.25:18|31:0.10|0.06", "alimiter=limit=0.9"])
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "audio/vo_raw.wav", "-af", chain, "-ac", "1", "-ar", "44100", "audio/vo.wav"], check=True)
json.dump(timing, open("timing.json", "w"), indent=1)
for x in timing: print(f"{x['start']:6.2f} - {x['end']:6.2f}  {x['text']}")
