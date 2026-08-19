#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/gekicluna42-spec/Claude-code.git"
BRANCH="claude/dip-studio-cinematic-redesign-a1l1vg"

rm -rf source dist
git clone --depth 1 --branch "$BRANCH" "$REPO" source

cd source/dip-studio
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run build
cd ../..

mv source/dip-studio/dist dist
