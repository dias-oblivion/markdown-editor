#!/usr/bin/env bash
# Instala os atalhos do Markdown Editor no sistema (Linux):
#   - comando de terminal `markdown-editor` em ~/.local/bin (roda de qualquer lugar)
#   - entrada no menu de aplicativos (~/.local/share/applications/markdown-editor.desktop)
#
# Pré-requisito: o AppImage já buildado em release/ (rode `yarn dist` antes).
# Idempotente — pode rodar de novo a qualquer momento; sobrescreve os atalhos.
#
# Detalhes e replicação em outra máquina: docs/desktop-install.md
set -euo pipefail

# Raiz do repo (este script vive em scripts/), resolvida dinamicamente — funciona
# em qualquer usuário/caminho, sem nada hardcoded.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

BIN_DIR="$HOME/.local/bin"
APPS_DIR="$HOME/.local/share/applications"
WRAPPER="$BIN_DIR/markdown-editor"
DESKTOP="$APPS_DIR/markdown-editor.desktop"
ICON="$REPO_ROOT/assets/icon.png"

# Confere que existe pelo menos um AppImage buildado.
if ! ls "$REPO_ROOT"/release/markdown-editor-*.AppImage >/dev/null 2>&1; then
  echo "Nenhum AppImage em $REPO_ROOT/release." >&2
  echo "Builde primeiro com:  yarn dist" >&2
  exit 1
fi

mkdir -p "$BIN_DIR" "$APPS_DIR"

# ── Wrapper de terminal ──
# Resolve o AppImage mais recente em tempo de execução (sobrevive a novas versões)
# e força Xwayland (--ozone-platform=x11) para o foco da janela funcionar no
# GNOME/Wayland. Repassa argumentos extras, ex.: --workspace=/caminho.
cat > "$WRAPPER" <<EOF
#!/usr/bin/env bash
# Gerado por scripts/install-desktop.sh — não edite à mão (rode o script de novo).
REPO_ROOT="$REPO_ROOT"
APPIMAGE="\$(ls -t "\$REPO_ROOT"/release/markdown-editor-*.AppImage 2>/dev/null | head -1)"
if [ -z "\$APPIMAGE" ]; then
  echo "AppImage não encontrado em \$REPO_ROOT/release. Rode 'yarn dist'." >&2
  exit 1
fi
exec "\$APPIMAGE" --ozone-platform=x11 "\$@"
EOF
chmod +x "$WRAPPER"

# ── Entrada no menu de aplicativos ──
# StartupWMClass casa com o WM_CLASS que o Electron/electron-builder define, para a
# janela agrupar com este ícone. Exec aponta ao wrapper (flag x11 num lugar só).
cat > "$DESKTOP" <<EOF
[Desktop Entry]
Type=Application
Name=Markdown Editor
Comment=Editor de markdown minimalista (Electron) com preview, diagramas e IA
Exec=$WRAPPER %U
Icon=$ICON
Terminal=false
Categories=Development;
StartupWMClass=Markdown Editor
StartupNotify=true
EOF
chmod +x "$DESKTOP"

# Reindexa o menu (best-effort — alguns ambientes reindexam sozinhos).
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS_DIR" 2>/dev/null || true

echo "✓ Comando de terminal:  markdown-editor   ($WRAPPER)"
echo "✓ Menu de aplicativos:  'Markdown Editor'  ($DESKTOP)"

# Avisa se ~/.local/bin não está no PATH (comum em instalações mínimas).
case ":$PATH:" in
  *":$BIN_DIR:"*) : ;;
  *) echo "⚠ $BIN_DIR não está no seu PATH. Adicione ao ~/.zshrc (ou ~/.bashrc):"
     echo '    export PATH="$HOME/.local/bin:$PATH"' ;;
esac
