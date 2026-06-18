#!/usr/bin/env sh
set -eu

REPO="${ORANGE_HYPER_REPO:-KoreanCode/orange-hyper}"
VERSION="${ORANGE_HYPER_VERSION:-1.1.0-alpha.7}"
INSTALL_DIR="${ORANGE_HYPER_INSTALL_DIR:-"$HOME/.local/bin"}"
TMP_DIR="${TMPDIR:-/tmp}/orange-hyper-install-$$"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

mkdir -p "$TMP_DIR"

platform="$(uname -s)"
arch="$(uname -m)"

case "$platform" in
  Darwin) orange_platform="macos" ;;
  Linux) orange_platform="linux" ;;
  *) echo "Unsupported platform: $platform" >&2; exit 1 ;;
esac

case "$arch" in
  x86_64|amd64) orange_arch="x64" ;;
  arm64|aarch64) orange_arch="arm64" ;;
  *) echo "Unsupported architecture: $arch" >&2; exit 1 ;;
esac

filename="orange-${orange_platform}-${orange_arch}"
if [ "$orange_platform" = "linux" ] && [ "$orange_arch" != "x64" ]; then
  echo "Unsupported Linux architecture: $orange_arch" >&2
  exit 1
fi

if [ -n "${ORANGE_HYPER_BASE_URL:-}" ]; then
  base_url="${ORANGE_HYPER_BASE_URL%/}"
elif [ "$VERSION" = "latest" ]; then
  base_url="https://github.com/$REPO/releases/latest/download"
else
  case "$VERSION" in
    v*) tag="$VERSION" ;;
    *) tag="v$VERSION" ;;
  esac
  base_url="https://github.com/$REPO/releases/download/$tag"
fi

download() {
  url="$1"
  output="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$output"
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$url" -O "$output"
  else
    echo "curl or wget is required to download Orange Hyper." >&2
    exit 1
  fi
}

sha256_file() {
  file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    echo "sha256sum or shasum is required to verify Orange Hyper." >&2
    exit 1
  fi
}

binary_tmp="$TMP_DIR/$filename"
checksums_tmp="$TMP_DIR/checksums.txt"

download "$base_url/checksums.txt" "$checksums_tmp"
download "$base_url/$filename" "$binary_tmp"

expected="$(grep "  $filename\$" "$checksums_tmp" | awk '{print $1}')"
if [ -z "$expected" ]; then
  echo "Checksum entry not found for $filename." >&2
  exit 1
fi

actual="$(sha256_file "$binary_tmp")"
if [ "$actual" != "$expected" ]; then
  echo "Checksum mismatch for $filename." >&2
  echo "expected: $expected" >&2
  echo "actual:   $actual" >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR"
chmod 755 "$binary_tmp"
cp "$binary_tmp" "$INSTALL_DIR/orange"
chmod 755 "$INSTALL_DIR/orange"

echo "Installed Orange Hyper to $INSTALL_DIR/orange"
if ! command -v orange >/dev/null 2>&1; then
  echo "Add this directory to PATH if needed:"
  echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
fi
