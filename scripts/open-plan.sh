#!/usr/bin/env bash
# PreToolUse hook (matcher: ExitPlanMode) para o markdown-editor.
#
# Ao finalizar o plan mode do Claude Code, revela o plano recém-gravado no editor:
#   - editor aberto  (heartbeat recente) -> sinaliza via marcador; a janela foca e abre o plano
#   - editor fechado                     -> lança o AppImage (fallback, Linux) que abre o plano ao iniciar
#
# Instalação e detalhes: docs/claude-plan-hook.md
set -euo pipefail

# Pasta de planos observada pelo editor (electron/main.ts; mesma de loadPlansRoot em useFileSystem.ts).
PLANS_DIR="$HOME/.claude/plans"
MARKER="$PLANS_DIR/.open-request"
HEARTBEAT="$PLANS_DIR/.editor-alive"

# O AppImage é procurado em release/ na raiz do repo (este script vive em scripts/).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
APPIMAGE_GLOB="$REPO_ROOT/release/markdown-editor-*.AppImage"

# mtime em epoch (GNU coreutils no Linux; fallback BSD/macOS).
mtime_of() { stat -c %Y "$1" 2>/dev/null || stat -f %m "$1" 2>/dev/null; }

cat >/dev/null 2>&1 || true   # consome o stdin (JSON) do hook, sem depender de jq

# O plano recém-gravado pelo Claude é o .md mais novo da pasta de planos.
plan=$(ls -t "$PLANS_DIR"/*.md 2>/dev/null | head -n1 || true)
[ -z "${plan:-}" ] && exit 0

# Escreve o marcador: 1ª linha = caminho do plano; 2ª linha = nonce (garante mudança de mtime).
printf '%s\n%s\n' "$plan" "$(date +%s)-${RANDOM}" > "$MARKER"

# Editor aberto? heartbeat com menos de 8s.
alive=0
if [ -f "$HEARTBEAT" ]; then
  age=$(( $(date +%s) - $(mtime_of "$HEARTBEAT") ))
  [ "$age" -lt 8 ] && alive=1
fi

# Fechado: lança o AppImage (se existir). Se estiver aberto, o marcador acima já basta.
if [ "$alive" -eq 0 ]; then
  appimage=$(ls -t $APPIMAGE_GLOB 2>/dev/null | head -n1 || true)
  [ -n "${appimage:-}" ] && setsid "$appimage" --appimage-extract-and-run >/dev/null 2>&1 &
fi

exit 0
