#!/usr/bin/env bash
# Capture desktop + mobile screenshots of the running app (leaves the app running).
set -euo pipefail

time -p cd "$(dirname "$0")"
time -p bash -n capture.sh

: "${CAPTURE_URL:?Set CAPTURE_URL.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR.}"
# Auto-start the game so captures show gameplay instead of the start overlay.
: "${CAPTURE_START_SELECTOR:=#btn-start}"
export CAPTURE_START_SELECTOR

time -p mkdir -p "$CAPTURE_DIR"
time -p node "${RUNTIME_DIR:?}/scripts/default-capture.mjs"
time -p test -f "$CAPTURE_DIR/final-desktop.png"
time -p test -f "$CAPTURE_DIR/final-mobile.png"
time -p ls -l "$CAPTURE_DIR"
