#!/usr/bin/env bash
# One-time setup: installs three.js + Playwright, the free Kokoro voice, word timings, and the pitch tool the voice script uses.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$HERE/pack/kit/setup.sh" --voice
"$HERE/pack/kit/.venv/bin/python" -m pip install -q pyworld "setuptools<81"
echo "ready. Start a video with: bash $HERE/new_project.sh <folder>"
