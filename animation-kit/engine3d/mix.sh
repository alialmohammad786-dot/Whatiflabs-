#!/usr/bin/env bash
# Mix voice + sfx + music + ambient bed (voice about 10 dB on top, everything ducks under it) and attach to silent.mp4.
#   bash mix.sh <duration-seconds> <output.mp4>
# Needs audio/vo.wav, audio/sfx.wav, audio/music.wav, audio/atmos.wav and silent.mp4.
set -euo pipefail
D="${1:?duration}"; OUT="${2:?output file}"
ffmpeg -v error -y -i audio/vo.wav -af "loudnorm=I=-16:TP=-2:LRA=11,aresample=48000" -ac 2 audio/vo_n.wav
ffmpeg -v error -y -i audio/vo_n.wav -i audio/sfx.wav -i audio/music.wav -i audio/atmos.wav -filter_complex "[0:a]asplit=4[v0][v1][v2][v3];[2:a]volume=0.27[m];[m][v0]sidechaincompress=threshold=0.05:ratio=4:attack=15:release=400[md];[1:a]volume=0.62[fx];[fx][v1]sidechaincompress=threshold=0.08:ratio=2.5:attack=5:release=200[fxd];[3:a]volume=0.30[at];[at][v2]sidechaincompress=threshold=0.06:ratio=2.5:attack=20:release=400[atd];[fxd][md][atd]amix=inputs=3:normalize=0:duration=longest[bed];[v3][bed]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.89:attack=3:release=60[out]" -map "[out]" -t "$D" audio/mix.wav
ffmpeg -v error -y -i silent.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -af "apad,loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$OUT"
echo "wrote $OUT"
