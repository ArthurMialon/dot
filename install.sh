#!/bin/sh
set -e

REPO="arthurmialon/dot"
BINARY_NAME="dot"

# Determine OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
    x86_64) ARCH="x64" ;;
    amd64) ARCH="x64" ;;
    arm64) ARCH="arm64" ;;
    aarch64) ARCH="arm64" ;;
    *) echo "Architecture not supported: $ARCH"; exit 1 ;;
esac

case "$OS" in
    linux|darwin) ;;
    *) echo "Operating system not supported: $OS"; exit 1 ;;
esac

# Download URL from Github
DOWNLOAD_URL="https://github.com/$REPO/releases/latest/download/${BINARY_NAME}-${OS}-${ARCH}"

INSTALL_DIR="${HOME}/.dot"
BIN_DIR="${HOME}/.local/bin"

mkdir -p "$INSTALL_DIR"

echo "Downloading $BINARY_NAME for ${OS}-${ARCH}"

rm -f "$INSTALL_DIR/$BINARY_NAME"

# -f so an HTTP error is not written to disk as if it were the binary
curl -fL "$DOWNLOAD_URL" -o "$INSTALL_DIR/$BINARY_NAME"

# Make it executable
chmod +x "$INSTALL_DIR/$BINARY_NAME"

# Older installers created a *directory* here, which shadowed the symlink and
# made every re-install fail. -rf clears either shape.
mkdir -p "$BIN_DIR"
rm -rf "$BIN_DIR/$BINARY_NAME"
ln -sf "$INSTALL_DIR/$BINARY_NAME" "$BIN_DIR/$BINARY_NAME"

# Add to path
if ! echo "$PATH" | grep -q "$BIN_DIR"; then
    echo "Add $BIN_DIR to PATH"
    for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
        [ -f "$rc" ] || continue
        grep -q "$BIN_DIR" "$rc" || echo "export PATH=\$PATH:$BIN_DIR" >> "$rc"
    done
fi

export PATH="$PATH:$BIN_DIR"

echo "Dot CLI successfully installed in $INSTALL_DIR"
echo "Linked to $BIN_DIR/$BINARY_NAME"
