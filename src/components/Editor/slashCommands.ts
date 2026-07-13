// Registro de comandos slash do editor (`/tabela`, `/código`, `/data`, `/ia …`).
// Mantém tudo em dados puros + helpers testáveis; a orquestração (detecção no
// CodeMirror, menu, execução) vive no Editor.

export type SlashKind =
  | 'table'
  | 'code'
  | 'date-short'
  | 'date-long'
  | 'datetime'
  | 'ai';

export interface SlashCommand {
  id: string;
  label: string;
  hint: string;
  icon: string;
  /** Palavras que casam com a query (o próprio comando + sinônimos). */
  aliases: string[];
  kind: SlashKind;
  /** Comandos que consomem o texto após o primeiro espaço (ex.: `/ia pergunta`). */
  acceptsArg?: boolean;
}

// Minúsculas + remove acentos, para casar "codigo" com "código".
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'tabela',
    label: 'Tabela',
    hint: 'Inserir tabela',
    icon: 'codicon:table',
    aliases: ['tabela', 'table'],
    kind: 'table',
  },
  {
    id: 'codigo',
    label: 'Código',
    hint: 'Bloco de código',
    icon: 'codicon:code',
    aliases: ['codigo', 'code', 'bloco'],
    kind: 'code',
  },
  {
    id: 'data',
    label: 'Data',
    hint: 'Data de hoje',
    icon: 'codicon:calendar',
    aliases: ['data', 'date', 'hoje'],
    kind: 'date-short',
  },
  {
    id: 'data-extenso',
    label: 'Data por extenso',
    hint: 'ex.: 13 de julho de 2026',
    icon: 'codicon:calendar',
    aliases: ['dataextenso', 'extenso', 'datelong'],
    kind: 'date-long',
  },
  {
    id: 'datahora',
    label: 'Data e hora',
    hint: 'ex.: 13/07/2026 14:30',
    icon: 'codicon:watch',
    aliases: ['datahora', 'hora', 'agora', 'datetime'],
    kind: 'datetime',
  },
  {
    id: 'ia',
    label: 'Perguntar à IA',
    hint: '/ia sua pergunta',
    icon: 'codicon:sparkle',
    aliases: ['ia', 'ai'],
    kind: 'ai',
    acceptsArg: true,
  },
];

// Filtra por prefixo de alias (ou substring do rótulo). Query vazia → todos.
export function filterCommands(query: string): SlashCommand[] {
  const q = normalize(query.trim());
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.aliases.some((a) => normalize(a).startsWith(q)) ||
      normalize(cmd.label).includes(q),
  );
}

// Casa a primeira palavra (modo argumento) com um comando exato.
export function findCommandByWord(word: string): SlashCommand | undefined {
  const w = normalize(word.trim());
  if (!w) return undefined;
  return SLASH_COMMANDS.find((cmd) => cmd.aliases.some((a) => normalize(a) === w));
}

export function formatDate(
  kind: 'date-short' | 'date-long' | 'datetime',
  now: Date = new Date(),
): string {
  switch (kind) {
    case 'date-short':
      return now.toLocaleDateString('pt-BR'); // 13/07/2026
    case 'date-long':
      return now.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }); // 13 de julho de 2026
    case 'datetime':
      return `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`; // 13/07/2026 14:30
  }
}
