#!/usr/bin/env bash
set -euo pipefail

target_url="${1:-http://127.0.0.1:4173}"
expected_status="${2:-200}"
node scripts/verify-url.mjs "$target_url" "$expected_status"
