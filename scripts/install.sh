#!/bin/bash
# Markdown Editor installer — https://github.com/dias-oblivion/markdown-editor
set -e

REPO="https://raw.githubusercontent.com/dias-oblivion/markdown-editor/main"
CONFIG_DIR="$HOME/.config/markdown-editor"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing Markdown Editor..."

# Create config directory
mkdir -p "$CONFIG_DIR"

# Copy from local repo if available, otherwise download from GitHub
if [[ -f "$SCRIPT_DIR/md.sh" ]]; then
    cp "$SCRIPT_DIR/md.sh" "$CONFIG_DIR/md.sh"
    echo "  Copied md.sh from local repo to $CONFIG_DIR"
else
    curl -sL "$REPO/scripts/md.sh" -o "$CONFIG_DIR/md.sh"
    echo "  Downloaded md.sh to $CONFIG_DIR"
fi

echo ""
echo "Done! Add this line to your ~/.bashrc or ~/.zshrc:"
echo ""
echo "  source $CONFIG_DIR/md.sh"
echo ""
echo "Then reload your shell and run:"
echo ""
echo "  md ~/my-notes"
echo ""
echo "Commands:"
echo "  md [path]    - Open notes directory in the editor"
echo "  md-update    - Update Docker image to latest version"
echo "  md-stop      - Stop running container"
