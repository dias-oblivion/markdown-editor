# Instalar o app no desktop (Linux)

Como rodar o editor pelo **comando de terminal** (`markdown-editor`, de qualquer lugar) e pelo
**menu de aplicativos**, a partir do AppImage buildado localmente. É o mesmo AppImage que o hook de
planos usa (ver [claude-plan-hook.md](claude-plan-hook.md)).

## Replicar em outra máquina

```bash
git clone git@github.com:dias-oblivion/markdown-editor.git
cd markdown-editor
yarn install          # instala dependências (Yarn 4 / corepack)
yarn dist             # build de produção + gera release/*.AppImage
bash scripts/install-desktop.sh
```

Pronto. Abra um terminal novo (ou `hash -r`) e rode `markdown-editor`, ou procure **"Markdown Editor"**
no menu de aplicativos.

## O que o `install-desktop.sh` faz

Idempotente (pode rodar de novo quando quiser). Resolve todos os caminhos dinamicamente — nada
hardcoded, funciona em qualquer usuário/diretório:

1. **Comando de terminal** — cria `~/.local/bin/markdown-editor`, um wrapper que:
   - localiza o AppImage mais recente em `release/` em tempo de execução (sobrevive a novas versões);
   - passa `--ozone-platform=x11` (força Xwayland, necessário para o foco da janela no GNOME/Wayland —
     ver `electron/main.ts` e [claude-plan-hook.md](claude-plan-hook.md));
   - repassa argumentos extras, ex.: `markdown-editor --workspace=/caminho/das/notas`.
2. **Menu de aplicativos** — cria `~/.local/share/applications/markdown-editor.desktop` (nome, ícone
   de `assets/icon.png`, `StartupWMClass=Markdown Editor` para a janela agrupar com o ícone) e reindexa
   o menu com `update-desktop-database`.

## Requisitos e observações

- **Linux** com `~/.local/bin` no `PATH` (o script avisa e mostra a linha a adicionar ao `~/.zshrc` se
  não estiver).
- Rebuildar o app: `yarn dist`. O AppImage é sobrescrito em `release/` e o wrapper o encontra
  sozinho — **não precisa rodar o `install-desktop.sh` de novo** (só se apagar os atalhos).
- O ícone/atalho pode levar alguns segundos para aparecer no menu, ou exigir logout/login em alguns
  ambientes.
- Os atalhos ficam **fora do repositório** (em `~/.local/...`), então apontam para o clone local —
  cada máquina roda o script uma vez após o `yarn dist`.

## Desinstalar

```bash
rm -f ~/.local/bin/markdown-editor ~/.local/share/applications/markdown-editor.desktop
update-desktop-database ~/.local/share/applications 2>/dev/null || true
```
