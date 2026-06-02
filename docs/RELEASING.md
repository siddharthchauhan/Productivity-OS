# Releasing a signed & notarized macOS build

By default, `npm run package:mac` produces an **ad-hoc–signed** app: it runs on
your own Mac, but other Macs show a Gatekeeper warning on first open (see the
README / release notes for the one-time bypass).

To produce a build that opens with **no warning anywhere**, sign it with an Apple
**Developer ID** and **notarize** it. The pipeline is already wired up — it stays
dormant until you provide credentials.

## One-time setup

1. **Join the [Apple Developer Program](https://developer.apple.com/programs/)** (paid, ~$99/yr).
2. **Create a "Developer ID Application" certificate** (Xcode → Settings → Accounts → Manage Certificates → `+`, or developer.apple.com → Certificates). Install it in your **login keychain**. electron-builder auto-discovers it.
3. **Get notary credentials** — either:
   - **App-specific password:** create one at [account.apple.com](https://account.apple.com) → Sign-In & Security → App-Specific Passwords. Note your **Team ID** (developer.apple.com → Membership).
   - **or App Store Connect API key:** create a key (Developer → Integrations), download the `.p8`, note the Key ID and Issuer ID.

## Cutting a release

Set the credentials in your environment and run `release:mac`:

```sh
# Option A — app-specific password
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="XXXXXXXXXX"

# Option B — App Store Connect API key (instead of A)
# export APPLE_API_KEY="/path/to/AuthKey_XXXXXXXXXX.p8"
# export APPLE_API_KEY_ID="XXXXXXXXXX"
# export APPLE_API_ISSUER="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

npm run release:mac
```

What happens:
1. `electron-vite build` compiles the app.
2. `electron-builder` signs it with your Developer ID (hardened runtime +
   `build/entitlements.mac.plist`).
3. The `afterSign` hook (`scripts/notarize.cjs`) submits it to Apple's notary
   service and **staples** the ticket. With no credentials set, this step is
   skipped automatically — so dev builds never fail.
4. The signed, notarized `dist/Pulse-<version>-arm64.dmg` opens cleanly on any Mac.

Then attach it to a GitHub release:

```sh
gh release upload v<version> dist/Pulse-<version>-arm64.dmg --clobber
```

## Notes

- **Architecture:** `release:mac` builds Apple Silicon (`arm64`) only. For Intel
  support you need a universal build (`--universal` / `--x64`), which also requires
  `better-sqlite3` compiled for x64.
- **Native rebuilds:** `release:mac` passes `-c.npmRebuild=false` to reuse the
  existing `better-sqlite3` binary (electron-builder still signs it). If you ever
  need a from-source rebuild on Node 25 / Python 3.14, install the `setuptools`
  shim first (distutils was removed in Python 3.12+).
- **Verify a build:** `spctl -a -vvv -t install dist/mac-arm64/Pulse.app` should
  report `source=Notarized Developer ID` once notarized.
