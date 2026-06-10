#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

run_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
  else
    npm exec --yes -- pnpm "$@"
  fi
}

run_pnpm install
run_pnpm prisma:generate
run_pnpm prisma:migrate
run_pnpm seed
run_pnpm harvest:all:local
run_pnpm dev
