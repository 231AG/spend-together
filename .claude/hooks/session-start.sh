#!/usr/bin/env bash
# Bootstraps Claude Code on the web sessions: activate the pinned pnpm and install the
# workspace so lint, typecheck and tests run immediately. No-op on local machines.
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi
cd "${CLAUDE_PROJECT_DIR:-.}"
corepack enable >/dev/null 2>&1 || true
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack prepare --activate >/dev/null 2>&1 || true
pnpm install --frozen-lockfile
