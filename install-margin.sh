#!/usr/bin/env bash
# Install Margin (macOS, Apple Silicon) from the latest GitHub release.
# Builds are signed and notarized, so no Gatekeeper workaround is needed.
set -euo pipefail

APP="Margin.app"
DMG="Margin-macOS-aarch64.dmg"
URL="https://github.com/rahult/margin/releases/latest/download/${DMG}"
DEST="${MARGIN_INSTALL_DIR:-/Applications}"
TMP="$(mktemp -d)"
MNT="${TMP}/mnt"
trap 'hdiutil detach -quiet "${MNT}" 2>/dev/null || true; rm -rf "${TMP}"' EXIT

echo "↓ Downloading ${DMG}…"
curl -fSL --progress-bar "${URL}" -o "${TMP}/${DMG}"

echo "↳ Mounting and copying to ${DEST}…"
hdiutil attach -nobrowse -readonly -mountpoint "${MNT}" "${TMP}/${DMG}" >/dev/null
mkdir -p "${DEST}"
rm -rf "${DEST}/${APP}"
cp -R "${MNT}/${APP}" "${DEST}/${APP}"
hdiutil detach -quiet "${MNT}" || true

echo "✓ Margin installed at ${DEST}/${APP} — open it from Launchpad or Spotlight."
