# Roadmap — Markdown Editor

Direção do produto para as próximas fases. Prioridades definidas em entrevista:
uso **misto** (planos + notas + docs), com foco maior em **workflows com Claude** e
**export/publicação**. Slides e autosave-em-disco entram como itens desejáveis, não urgentes.

Legenda de esforço: 🟢 pequeno · 🟡 médio · 🔴 grande.

---

## ✅ Entregue nesta rodada

- Identidade visual **Obsidian** (grafite + accent roxo `#7c6cf7`) em todos os temas.
- Correção da troca de pasta / "voltava pro Claude Plans" (corrida do refresh-no-foco).
- Explorer estilo VS Code: abas **Arquivos / Claude Plans**, recolher dentro da sidebar,
  barra de ações repensada.
- **Claude Plans** ordenados por criação, com selo "novo" até serem abertos.
- **Checkbox de tarefas** refeito (alinhamento à 1ª linha, multi-linha e subtarefas).
- **Modo foco (F11)**: leitura imersiva em coluna centralizada.
- **Hot-exit tipo Sublime**: rascunhos nunca se perdem, sem gravar no arquivo.

---

## 🚀 Fase 1 — Curto prazo (workflows Claude + segurança do texto)

Prioridade máxima segundo a entrevista.

- 🟡 **Autosave em disco opcional (Settings)** — toggle "Salvar automaticamente" (por
  inatividade e/ao trocar de aba), somando-se ao hot-exit já existente. Ganchos:
  `SettingsDialog` (aba Editor), `useFileSystem.handleSaveFile`, novo campo em `AISettings`/prefs.
- 🟡 **Ações de IA aplicadas no documento** — hoje o `claude:assist` gera um arquivo `-action.md`
  separado; permitir **aplicar a edição no próprio texto** (diff/preview antes de aceitar).
- 🟡 **Chat inline / seleção → Claude** — enviar a seleção do editor para o chat com uma ação
  rápida (reescrever, resumir, gerar tarefas) e inserir o resultado no ponto do cursor.
- 🟢 **Comandos slash no editor** (`/tabela`, `/código`, `/data`, `/ia …`) reutilizando o
  pipeline de inserção do `Editor` e os diálogos existentes.
- 🟢 **Polish de fluidez** — micro-interações e estados de foco consistentes nos componentes
  restantes (CommandPalette, ContextMenu, diálogos), já alinhados à paleta Obsidian.

## 📤 Fase 2 — Médio prazo (export & publicação)

Segunda prioridade da entrevista.

- 🟡 **Export para HTML** estilizado (reaproveitando `.markdown-preview` + tema atual, com CSS inline).
- 🔴 **Export para PDF** — via `webContents.printToPDF` no processo Electron (`electron/main.ts`),
  com opção de tema claro para impressão.
- 🟡 **Modo apresentação por slides** — dividir o markdown por `---` ou por `H1/H2` e navegar com
  as setas, evoluindo o modo foco atual (F11). *(Desejável, sem urgência.)*
- 🟢 **Copiar como HTML/Markdown renderizado** para colar em e-mail/Notion.

## 🧠 Fase 3 — Longo prazo (pegada Obsidian completa)

Evolução natural para "segundo cérebro"; não foi top de prioridade, mas fecha a identidade.

- 🔴 **Wikilinks `[[nota]]`** com autocomplete ao digitar `[[`, navegação por clique e criação
  de nota inexistente.
- 🔴 **Backlinks** — painel "referenciado por" no arquivo aberto.
- 🔴 **Visão de grafo** das conexões entre notas.
- 🟡 **Busca global full-text** (Ctrl+Shift+F) em toda a árvore, com preview de resultados.
- 🟡 **Tags `#tag` e YAML frontmatter** com filtros/índice.

## 🧩 Backlog / ideias soltas

- 🟢 Ícone/lançador do app e empacotamento final (`electron-builder`) revisados.
- 🟢 Atalhos configuráveis e uma folha de atalhos (Ctrl+/).
- 🟡 Histórico de versões local por arquivo (snapshots).
- 🟢 Pin de abas e reordenação por arrastar.
- 🟡 Suporte a imagens coladas (salvar em `assets/` e inserir o link).

---

> Este roadmap é vivo — reordene conforme a necessidade. As Fases 1 e 2 refletem
> a direção escolhida (workflows Claude → export/publicação); a Fase 3 completa a
> experiência Obsidian quando o uso como base de conhecimento crescer.
