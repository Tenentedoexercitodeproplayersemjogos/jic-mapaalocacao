#!/usr/bin/env bash
# Build usado pelo Cloudflare Pages na integração com o GitHub.
set -euo pipefail

rm -rf dist
mkdir -p dist
cp index.html dist/
cp -r assets dist/
cp _headers dist/
