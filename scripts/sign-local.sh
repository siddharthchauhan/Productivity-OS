#!/usr/bin/env bash
# Re-sign a locally built Pulse.app with the persistent self-signed identity
# so macOS TCC grants (Accessibility, Screen Recording) survive rebuilds.
#
# Ad-hoc builds get a fresh signature hash on every build, and TCC pins each
# grant to that hash — so reinstalling a rebuilt app used to re-trigger the
# permission dialogs in a loop, with System Settings showing a stale "Pulse"
# entry as enabled. Signing every local build with one persistent certificate
# gives the app a stable identity that TCC keeps matching.
#
# One-time setup (creates the "PulseDevSigning" cert in the login keychain):
# see "Local dev builds & macOS permissions" in docs/RELEASING.md.
#
# Usage: scripts/sign-local.sh [path/to/Pulse.app]
#        (defaults to dist/mac-arm64/Pulse.app)
set -euo pipefail

IDENTITY="${PULSE_SIGN_IDENTITY:-PulseDevSigning}"
APP="${1:-dist/mac-arm64/Pulse.app}"

if [ ! -d "$APP" ]; then
  echo "error: $APP not found — build first (npm run build && npx electron-builder --mac --arm64)" >&2
  exit 1
fi

if ! security find-identity -p codesigning | grep -q "$IDENTITY"; then
  echo "error: signing identity '$IDENTITY' not in keychain." >&2
  echo "Run the one-time setup in docs/RELEASING.md (Local dev builds & macOS permissions)." >&2
  exit 1
fi

codesign --force --deep --sign "$IDENTITY" "$APP"
echo "signed: $APP"
codesign -dv "$APP" 2>&1 | grep -E 'Authority|Identifier=' | head -2
