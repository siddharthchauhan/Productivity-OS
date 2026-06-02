// electron-builder `afterSign` hook: notarize + staple the signed .app.
//
// It is CONDITIONAL by design — if no Apple credentials are present in the
// environment, it logs and returns, so normal/dev builds (and the free ad-hoc
// flow) never fail. It only runs when you supply Developer ID + notary creds:
//
//   Password auth:   APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID
//   API-key auth:    APPLE_API_KEY (path to .p8), APPLE_API_KEY_ID, APPLE_API_ISSUER
//
// See docs/RELEASING.md for the full release procedure.
const { notarize } = require('@electron/notarize');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileP = promisify(execFile);

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  if (electronPlatformName !== 'darwin') return;

  const env = process.env;
  const hasPassword = env.APPLE_ID && env.APPLE_APP_SPECIFIC_PASSWORD && env.APPLE_TEAM_ID;
  const hasApiKey = env.APPLE_API_KEY && env.APPLE_API_KEY_ID && env.APPLE_API_ISSUER;
  if (!hasPassword && !hasApiKey) {
    console.log('[notarize] No Apple credentials in env — skipping notarization (dev/ad-hoc build).');
    return;
  }

  const appName = packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`[notarize] Submitting ${appName}.app to Apple's notary service — this can take several minutes…`);
  await notarize(
    hasApiKey
      ? { appPath, appleApiKey: env.APPLE_API_KEY, appleApiKeyId: env.APPLE_API_KEY_ID, appleApiIssuer: env.APPLE_API_ISSUER }
      : { appPath, appleId: env.APPLE_ID, appleIdPassword: env.APPLE_APP_SPECIFIC_PASSWORD, teamId: env.APPLE_TEAM_ID }
  );

  console.log('[notarize] Stapling the notarization ticket to the app…');
  await execFileP('xcrun', ['stapler', 'staple', appPath]);
  console.log('[notarize] Notarized and stapled ✓');
};
