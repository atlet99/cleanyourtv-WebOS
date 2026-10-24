#!/bin/bash
# CI-only dependencies live in RUNNER_TEMP, never in the app or a global npm installation.
set -euo pipefail
: "${RUNNER_TEMP:?}" "${GITHUB_OUTPUT:?}"
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
tooling=$(mktemp -d "$RUNNER_TEMP/webos-packager.XXXXXX")
echo "directory=$tooling" >> "$GITHUB_OUTPUT"
cp "$here/package.json" "$here/package-lock.json" "$tooling/"
(
  cd -- "$tooling"
  npm ci --cache "$tooling/npm-cache" --ignore-scripts --omit=peer --no-audit --no-fund
)
