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
    *) echo "Architecture not supported"; exit 1 ;;
esac

# Download URL from Github
DOWNLOAD_URL="https://github.com/$REPO/releases/latest/download/${BINARY_NAME}-${OS}-${ARCH}"

INSTALL_DIR="${HOME}/.dot"
mkdir -p "$INSTALL_DIR"

echo "Downloading $BINARY_NAME for ${OS}-${ARCH} $"

rm -f $INSTALL_DIR/$BINARY_NAME
rm -f "$HOME/.local/bin/dot"

curl -L "$DOWNLOAD_URL" -o "$INSTALL_DIR/$BINARY_NAME"

# Make it exectuable
chmod +x "$INSTALL_DIR/$BINARY_NAME"

mkdir -R $HOME/.local/bin/dot

sudo ln -s "$INSTALL_DIR/$BINARY_NAME" "$HOME/.local/bin/dot"

# Add to path
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
    echo "Add $INSTALL_DIR to PATH"
    echo "export PATH=\$PATH:$INSTALL_DIR" >> "$HOME/.bashrc"
    echo "export PATH=\$PATH:$INSTALL_DIR" >> "$HOME/.zshrc"
fi

export PATH=$PATH:$INSTALL_DIR

echo "Dot CLI successfully installed in $INSTALL_DIR"
