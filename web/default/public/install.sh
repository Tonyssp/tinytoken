#!/usr/bin/env bash
# TinyToken cross-platform setup launcher.
# macOS / Linux / WSL:
#   curl -fsSL https://tinyapi.org/install.sh | bash
#
# Local test:
#   TINYTOKEN_INSTALLER_URL=http://127.0.0.1:3001/tinytoken-setup.mjs \
#   curl -fsSL http://127.0.0.1:3001/install.sh | bash

set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required. Install it from https://nodejs.org/ first." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js >= 20 required. Current: $(node -v 2>/dev/null || echo unknown)" >&2
  exit 1
fi

INSTALLER_URL="${TINYTOKEN_INSTALLER_URL:-https://tinyapi.org/tinytoken-setup.mjs}"
TMP_FILE="$(mktemp "${TMPDIR:-/tmp}/tinytoken-setup.XXXXXX.mjs")"
trap 'rm -f "$TMP_FILE"' EXIT

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$INSTALLER_URL" -o "$TMP_FILE"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP_FILE" "$INSTALLER_URL"
else
  echo "curl or wget is required to download TinyToken setup." >&2
  exit 1
fi

node "$TMP_FILE" "$@"
