#!/usr/bin/env bash
# Render the whole video in two parallel halves and join them into silent.mp4.
#   bash render.sh <split-seconds>      e.g. bash render.sh 11
# Set CHROME to a Chromium binary if Playwright's own is not installed; set GL=swiftshader on a machine with no GPU.
set -euo pipefail
SPLIT="${1:?give the time (seconds) to split the two halves at, ideally a shot cut}"
node render.mjs video partA.mp4 30 0 "$SPLIT" > logA.txt 2>&1 &
A=$!
node render.mjs video partB.mp4 30 "$SPLIT" > logB.txt 2>&1 &
B=$!
wait $A; wait $B
printf "file 'partA.mp4'\nfile 'partB.mp4'\n" > list.txt
ffmpeg -v error -y -f concat -safe 0 -i list.txt -c copy silent.mp4
echo "wrote silent.mp4"
