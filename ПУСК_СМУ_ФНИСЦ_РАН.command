#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR" || exit 1
bash scripts/local/start-local.sh
