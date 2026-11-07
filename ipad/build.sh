#!/usr/bin/env bash
# Build Tenji for a connected iPad, sign it with your own Apple developer team and install it.
#
#   ./ipad/build.sh                  full build and install
#   SKIP_DEPS=1 ./ipad/build.sh      reuse the existing node_modules
#   NO_INSTALL=1 ./ipad/build.sh     build only
#
# Overrides: TEAM_ID, BUNDLE_ID, DEVICE (UDID; defaults to the first paired iPad).
set -euo pipefail
cd "$(dirname "$0")/.."

TEAM_ID="${TEAM_ID:-3HMWHH2JH9}"
BUNDLE_ID="${BUNDLE_ID:-app.seanime.tenji.$TEAM_ID}"
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8   # CocoaPods fails without a UTF-8 locale

step() { printf '\n==> %s\n' "$1"; }

if [ "${SKIP_DEPS:-0}" != 1 ]; then
  # package-lock.json pins the versions Tenji v0.4.0 was released with; newer Expo
  # packages expect a newer React Native and crash the app at launch.
  step "Installing JS dependencies from package-lock.json"
  npm ci
fi

step "Applying patches/"
for p in patches/*.patch; do
  if patch -p1 --forward --dry-run --silent < "$p" > /dev/null 2>&1; then
    patch -p1 --forward --silent < "$p"
    echo "applied $p"
  elif patch -p1 --reverse --dry-run --silent < "$p" > /dev/null 2>&1; then
    echo "already applied $p"
  else
    echo "cannot apply $p" >&2
    exit 1
  fi
done

step "Generating the native iOS project"
EXPO_IOS_BUNDLE_ID="$BUNDLE_ID" EXPO_APPLE_TEAM_ID="$TEAM_ID" CI=1 \
  npx expo prebuild --platform ios --clean

step "Building (Release)"
xcodebuild -quiet \
  -workspace ios/Seanime.xcworkspace -scheme Seanime -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath ios/build/dd \
  -allowProvisioningUpdates CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM="$TEAM_ID" \
  build
APP="$(ls -d ios/build/dd/Build/Products/Release-iphoneos/*.app)"
echo "built $APP"

[ "${NO_INSTALL:-0}" = 1 ] && exit 0

if [ -z "${DEVICE:-}" ]; then
  devices_json="$(mktemp)"
  xcrun devicectl list devices --json-output "$devices_json" > /dev/null
  DEVICE="$(node -e '
    const { result } = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))
    const ipad = result.devices.find(d =>
      d.hardwareProperties?.deviceType === "iPad" && d.connectionProperties?.pairingState === "paired")
    if (ipad) console.log(ipad.hardwareProperties.udid)
  ' "$devices_json")"
  rm -f "$devices_json"
fi
if [ -z "$DEVICE" ]; then
  echo "no paired iPad found; connect it or set DEVICE=<udid>" >&2
  exit 1
fi

step "Installing on $DEVICE"
xcrun devicectl device install app --device "$DEVICE" "$APP"
xcrun devicectl device process launch --device "$DEVICE" --terminate-existing "$BUNDLE_ID"
