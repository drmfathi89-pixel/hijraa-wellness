#!/bin/sh
cd "$(dirname "$0")"
[ -f package.json ] || { echo "Please unzip hijraa-pc-gateway.zip first, then run start.command from the extracted folder."; exit 1; }
command -v node >/dev/null || { echo "Install Node.js LTS from https://nodejs.org first"; exit 1; }
[ -d node_modules ] || npm install --omit=dev --no-audit --no-fund
node index.mjs
