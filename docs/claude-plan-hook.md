# Claude Plans — abrir o plano no editor ao finalizar o plan mode

Integração opcional com o [Claude Code](https://claude.com/claude-code). Quando você finaliza o
**plan mode** (o menu "aceitar / aceitar + auto-accept / não" aparece no terminal), o markdown-editor
**pula pra frente já com o plano aberto**, pronto pra leitura — eliminando o ritual manual de
alt-tab → refresh → trocar pra aba **Claude Plans** → clicar no plano.

Funciona porque o Claude Code grava o plano num `.md` em `~/.claude/plans/` logo antes de finalizar,
e o editor já carrega essa pasta na aba **Claude Plans** (`loadPlansRoot` em
`src/hooks/useFileSystem.ts`).

## Como funciona

Sinalização por arquivos de sinal dentro de `~/.claude/plans/` (funciona igual em dev e no AppImage,
sem depender de single-instance ou nome de processo):

| Arquivo | Escrito por | Papel |
| --- | --- | --- |
| `.editor-alive` | editor (main process) | heartbeat: mtime reescrito a cada ~3s enquanto o app vive |
| `.open-request` | hook | marcador: 1ª linha = caminho do plano a abrir |

Ambos são dotfiles, então ficam fora da árvore de arquivos (`readDirectoryRecursive` ignora ocultos).

Fluxo:

1. `ExitPlanMode` dispara o hook `PreToolUse` → `scripts/open-plan.sh`.
2. O hook acha o `.md` mais novo em `~/.claude/plans/` e escreve o caminho no marcador `.open-request`.
3. Se o heartbeat estiver fresco (editor aberto), o main process observa o marcador
   (`fs.watchFile`), foca a janela e manda o renderer abrir o plano (IPC `plan:open` →
   `openPlanByPath`, que troca pra aba Plans, dá refresh e abre o arquivo).
4. Se o editor estiver fechado, o hook lança o AppImage (fallback Linux), que na inicialização lê o
   marcador recente e abre o plano.

Peças no código: `electron/main.ts` (heartbeat + watcher + `focusWindow`), `electron/preload.ts` +
`src/vite-env.d.ts` (canal `plan:open`), `src/hooks/useFileSystem.ts` (`openPlanByPath`),
`src/components/App.tsx` (listener).

## Instalação

Pré-requisitos: Claude Code instalado e usando a config padrão em `~/.claude`.

### 1. (Opcional, recomendado) Buildar o AppImage — fallback para "editor fechado"

```bash
yarn electron:build   # gera release/markdown-editor-<versão>-<arch>.AppImage
```

Sem isso, a integração ainda funciona quando o editor **já está aberto**; só não há fallback pra
abri-lo automaticamente quando estiver fechado.

### 2. Registrar o hook no Claude Code

Edite `~/.claude/settings.json` e adicione a entrada `ExitPlanMode` em `hooks.PreToolUse` (preserve o
que já existir), apontando para o script **deste repositório** (use o caminho absoluto da sua cópia):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "/CAMINHO/ABSOLUTO/PARA/markdown-editor/scripts/open-plan.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

Garanta que o script é executável:

```bash
chmod +x scripts/open-plan.sh
```

### 3. Rodar o editor com este código

As mudanças de main process e preload **não** têm hot-reload. Se você usa `yarn dev`, reinicie-o
depois de atualizar o código; ou use o AppImage buildado no passo 1 como visualizador de planos.

## Testando

Com o editor aberto, simule o sinal apontando pra um plano existente:

```bash
printf '%s\n%s\n' "$HOME/.claude/plans/<algum-plano>.md" "$(date +%s)-$RANDOM" \
  > ~/.claude/plans/.open-request
```

Esperado: a janela vem pra frente, troca pra aba **Claude Plans**, atualiza a árvore e abre o plano.
Para o teste de ponta a ponta, entre em plan mode numa tarefa qualquer e finalize o plano.

## Notas e limitações

- **Pasta fixa `~/.claude/plans`** — é o default do Claude Code e o que o editor carrega. Se você usa
  `CLAUDE_CONFIG_DIR` apontando pra outro lugar, ajuste `PLANS_DIR` no script **e** `loadPlansRoot` em
  `src/hooks/useFileSystem.ts` para casarem.
- **Fallback só no Linux** — o lançamento automático usa o AppImage. Em macOS/Windows, mantenha o
  editor aberto (o caminho "editor aberto" é multiplataforma).
- **Foco no Wayland/X11** — no Linux o app força **Xwayland** via o flag `--ozone-platform=x11` no
  argv do launch (script `electron:start` no `package.json` e no lançamento do AppImage em
  `scripts/open-plan.sh`). Isso é necessário porque no GNOME/Wayland a janela nativa não consegue se
  auto-focar (o Mutter bloqueia o focus-steal e só emite a notificação "… is ready"). **Só o flag no
  argv funciona** — a env var `ELECTRON_OZONE_PLATFORM_HINT=x11` e o `appendSwitch('ozone-platform',
  'x11')` em `electron/main.ts` são lidos tarde demais pelo Chromium (Electron 40) e foram ignorados
  nos testes; o `appendSwitch` fica só como reforço documental. Como janela X11, o `focusWindow()`
  (`maximize` + `show` + `focus` + `moveTop` + `setAlwaysOnTop` mantido por ~400ms) traz a janela pra
  frente **maximizada** de forma confiável. Trade-off: backend X11, escala fracionária/HiDPI um pouco
  pior.
- **Plano = `.md` mais novo** — robusto no instante do `ExitPlanMode`, já que o Claude grava o arquivo
  imediatamente antes de chamar a tool.
