#!/usr/bin/env bash
# Make a fresh 3D-short project folder from the engine.   bash new_project.sh /path/to/my-video
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
P="${1:?project folder}"
mkdir -p "$P/audio"
cp -R "$HERE/engine3d/src" "$HERE/engine3d/index.html" "$HERE/engine3d/render.mjs" "$HERE/engine3d/captions.py" "$HERE/engine3d/voice.py" "$HERE/engine3d/synth.py" "$HERE/engine3d/render.sh" "$HERE/engine3d/mix.sh" "$P/"
ln -sfn "$HERE/pack/kit/node_modules" "$P/node_modules"
echo "project ready in $P (kit: $HERE/pack/kit)"
