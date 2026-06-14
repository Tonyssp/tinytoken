#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found."
  echo "Please install Node.js 20 or newer, then run this file again."
  exit 1
fi

node ./tinytoken-setup.mjs "$@"
