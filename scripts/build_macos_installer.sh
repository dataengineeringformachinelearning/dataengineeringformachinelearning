#!/usr/bin/env bash
set -euo pipefail
export COPYFILE_DISABLE=1

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${ROOT_DIR}/native/macos-app"
APP_NAME="DEML Security Workbench"
BUNDLE_ID="app.deml.security-workbench"
VERSION="$(sed -n 's/^version = "\([^"]*\)"/\1/p' "${APP_DIR}/Cargo.toml" | head -1)"
SOURCE_APP_PATH="${APP_DIR}/target/release/bundle/osx/${APP_NAME}.app"
DIST_DIR="${ROOT_DIR}/dist/macos"
STAGING_DIR="$(mktemp -d /tmp/deml-macos-installer.XXXXXX)"
APP_PATH="${STAGING_DIR}/${APP_NAME}.app"
DMG_PATH="${DIST_DIR}/${APP_NAME}-${VERSION}.dmg"
PKG_PATH="${DIST_DIR}/${APP_NAME}-${VERSION}.pkg"

command -v cargo >/dev/null || { echo "Rust/Cargo is required" >&2; exit 1; }
command -v codesign >/dev/null || { echo "Xcode Command Line Tools are required" >&2; exit 1; }
command -v hdiutil >/dev/null || { echo "hdiutil is required" >&2; exit 1; }
command -v pkgbuild >/dev/null || { echo "pkgbuild is required" >&2; exit 1; }
command -v dot_clean >/dev/null || { echo "dot_clean is required" >&2; exit 1; }

if ! cargo bundle --version >/dev/null 2>&1; then
  cargo install cargo-bundle --locked
fi

trap 'rm -rf "${STAGING_DIR}"' EXIT
rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}" "${STAGING_DIR}/dmg"

(
  cd "${APP_DIR}"
  cargo test
  cargo clippy --all-targets -- -D warnings
  cargo bundle --release
)

ditto --norsrc "${SOURCE_APP_PATH}" "${APP_PATH}"
dot_clean -m "${APP_PATH}"
xattr -cr "${APP_PATH}"
if [[ -n "${DEVELOPER_ID_APPLICATION:-}" ]]; then
  codesign --force --deep --options runtime --timestamp \
    --sign "${DEVELOPER_ID_APPLICATION}" "${APP_PATH}"
else
  echo "DEVELOPER_ID_APPLICATION is unset; creating an ad-hoc development signature."
  codesign --force --deep --sign - "${APP_PATH}"
fi
codesign --verify --deep --strict --verbose=2 "${APP_PATH}"

ditto --norsrc "${APP_PATH}" "${STAGING_DIR}/dmg/${APP_NAME}.app"
ln -s /Applications "${STAGING_DIR}/dmg/Applications"
hdiutil create -volname "${APP_NAME}" -srcfolder "${STAGING_DIR}/dmg" \
  -ov -format UDZO "${DMG_PATH}"

xattr -cr "${APP_PATH}"
codesign --verify --deep --strict --verbose=2 "${APP_PATH}"
PKG_ARGS=(--component "${APP_PATH}" --install-location /Applications \
  --identifier "${BUNDLE_ID}" --version "${VERSION}")
if [[ -n "${DEVELOPER_ID_INSTALLER:-}" ]]; then
  PKG_ARGS+=(--sign "${DEVELOPER_ID_INSTALLER}")
else
  echo "DEVELOPER_ID_INSTALLER is unset; creating an unsigned development package."
fi
pkgbuild "${PKG_ARGS[@]}" "${PKG_PATH}"
xattr -cr "${APP_PATH}"
codesign --verify --deep --strict --verbose=2 "${APP_PATH}"

if [[ -n "${DEVELOPER_ID_APPLICATION:-}" ]]; then
  codesign --force --timestamp --sign "${DEVELOPER_ID_APPLICATION}" "${DMG_PATH}"
fi

if [[ -n "${APPLE_NOTARY_PROFILE:-}" ]]; then
  for artifact in "${DMG_PATH}" "${PKG_PATH}"; do
    xcrun notarytool submit "${artifact}" --keychain-profile "${APPLE_NOTARY_PROFILE}" --wait
    xcrun stapler staple "${artifact}"
    xcrun stapler validate "${artifact}"
  done
else
  echo "APPLE_NOTARY_PROFILE is unset; skipping notarization."
fi

echo "Built installers:"
echo "  ${DMG_PATH}"
echo "  ${PKG_PATH}"
