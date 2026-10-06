#!/usr/bin/env bash
set -euo pipefail

# Runs a generator from turbo/generators. Without a generator name it runs the interactive `new`.
#   pnpm gen                                   # interactive
#   pnpm gen library --args my-lib apps/web frontend jit
#
# `turbo gen` can't be used: it launches `npx @turbo/gen@<version>`, which the root package.json's
# devEngines rejects, and which would bypass the lockfile anyway. So @turbo/gen is a pinned devDependency.

cd "$(dirname "$0")/.."

generator=new
if [ $# -gt 0 ] && [[ "$1" != -* ]]; then
  generator=$1
  shift
fi

exec ./node_modules/.bin/gen run "$generator" --config generators/config.ts "$@"
