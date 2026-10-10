// Textos do mod em português e inglês. A língua vem da configuração da instalação.
// Os avisos são o conteúdo do painel acima do prompt; no chat, o modelo recebe só a instrução.
import type { Op, Reversible } from './sql'
import type { ShellCheck, ShellReason } from './shell'
import type { PanelState, Segment } from '../types'

export type Lang = 'pt' | 'en'

export type Messages = {
  aviso1Title: string
  aviso2Title: string
  operation: string
  database: string
  table: string
  procedure: string
  reversible: string
  command: string
  aviso2Intro: string
  sure: string
  runWord: string
  confirmWord: string
  midWord: string
  cancelWord: string
  endWord: string
  reversibleLabel: Record<Reversible, string>
  shellOperation: string
  shellReason: string
  shellUnverified: string
  shellReversible: string
  shellFound: string
  shellNoSql: string
  shellReasonText: Record<ShellReason['code'], string>
  idle: string
  executedNote: string
  panelDeny: string
  unqualified: string
  waitAviso2: string
  failed: string
  cancelled: string
  approved1: string
  approved2: string
  noLang: string
  noServers: string
  logFailed: string
  log: {
    blocked: string
    confirmed1: string
    confirmed2: string
    executed: string
    cancelled: string
    unqualified: string
  }
}

const pt: Messages = {
  aviso1Title: '⚠️ AVISO 1: operação de escrita bloqueada',
  aviso2Title: '⚠️ AVISO 2: confirmação final',
  operation: 'Operação',
  database: 'Banco',
  table: 'Tabela',
  procedure: 'Procedure',
  reversible: 'Reversível',
  command: 'Comando',
  aviso2Intro: 'Vou executar agora:',
  sure: 'Tem certeza? ',
  runWord: 'Para executar, responda ',
  confirmWord: 'confirma',
  midWord: '. Para cancelar, responda ',
  cancelWord: 'nega',
  endWord: '.',
  reversibleLabel: {
    'in-transaction': 'sim, só dentro de transação; fora dela, não',
    no: 'não',
    unknown: 'não verificado (depende do que a procedure faz)',
  },
  shellOperation: 'Operação',
  shellReason: 'Motivo',
  shellUnverified: 'O SQL dentro do comando não foi verificado.',
  shellReversible: 'não verificado',
  shellFound: 'SQL de escrita encontrado nos scripts',
  shellNoSql: 'nenhum SQL de escrita encontrado nos scripts; o SQL pode ser montado em tempo de execução',
  shellReasonText: {
    client: 'cliente SQL direto no comando',
    driver: 'driver de banco no próprio comando',
    django: 'comando do Django que pode alterar o banco',
    unreadable: 'não consegui ler o script para verificar',
    script: 'o script usa driver de banco',
    import: 'o script importa um módulo que usa driver de banco',
  },
  idle: 'Nenhuma confirmação pendente.',
  executedNote: 'Executado. O MCP devolveu um erro conhecido depois da execução ("reading length"); o comando rodou. Confira com SELECT se precisar.',
  panelDeny: 'SQL guard: o mod detectou um comando de escrita ou de estrutura que precisa de confirmação. Não execute. Diga ao usuário, no chat, qual é o comando e pergunte: responda "confirma" para prosseguir ou "nega" para cancelar. A confirmação é feita só pelo chat, nunca pelo painel.',
  unqualified: 'SQL guard: escreva o nome completo banco.schema.objeto em todo comando de escrita. USE e nomes sem banco não são executados.',
  waitAviso2: 'SQL guard: ainda falta a confirmação final do usuário. Não execute. Pergunte no chat: "confirma" para prosseguir ou "nega" para cancelar.',
  failed: 'SQL guard: falhou ao verificar o comando; nada foi executado.',
  cancelled: 'SQL guard: pendência cancelada, o comando não foi executado.',
  approved1: 'SQL guard: o usuário confirmou o primeiro aviso. Não execute ainda. Chame a ferramenta de novo com o mesmo comando para o mod apresentar a confirmação final, e pergunte ao usuário no chat: "confirma" para prosseguir ou "nega" para cancelar.',
  approved2: 'SQL guard: o usuário confirmou a execução. Chame a ferramenta de novo com o mesmo comando agora.',
  noLang: 'SQL guard: idioma não configurado. Escolha pt ou en nas configurações do mod.',
  noServers: 'SQL guard: nenhum MCP de SQL Server configurado; comandos de escrita não estão protegidos.',
  logFailed: 'SQL guard: não consegui gravar no log.',
  log: {
    blocked: 'AVISO 1 mostrado',
    confirmed1: 'confirmou AVISO 1',
    confirmed2: 'confirmou AVISO 2',
    executed: 'executado',
    cancelled: 'cancelado',
    unqualified: 'negado: sem banco explícito',
  },
}

const en: Messages = {
  aviso1Title: '⚠️ WARNING 1: write operation blocked',
  aviso2Title: '⚠️ WARNING 2: final confirmation',
  operation: 'Operation',
  database: 'Database',
  table: 'Table',
  procedure: 'Procedure',
  reversible: 'Reversible',
  command: 'Command',
  aviso2Intro: 'I am going to run this now:',
  sure: 'Are you sure? ',
  runWord: 'To run it, reply ',
  confirmWord: 'confirm',
  midWord: '. To cancel, reply ',
  cancelWord: 'deny',
  endWord: '.',
  reversibleLabel: {
    'in-transaction': 'yes, only inside a transaction; otherwise no',
    no: 'no',
    unknown: 'not verified (depends on what the procedure does)',
  },
  shellOperation: 'Operation',
  shellReason: 'Reason',
  shellUnverified: 'The SQL inside this command was not verified.',
  shellReversible: 'not verified',
  shellFound: 'Write SQL found in the scripts',
  shellNoSql: 'no write SQL found in the scripts; the SQL may be built at run time',
  shellReasonText: {
    client: 'direct SQL client in the command',
    driver: 'database driver in the command itself',
    django: 'Django command that can change the database',
    unreadable: 'could not read the script to check it',
    script: 'the script uses a database driver',
    import: 'the script imports a module that uses a database driver',
  },
  idle: 'No pending confirmation.',
  executedNote: 'Executed. The MCP returned a known error after running the command ("reading length"); the command did run. Check with SELECT if needed.',
  panelDeny: 'SQL guard: the mod detected a write or structure command that needs confirmation. Do not run it. Tell the user in the chat which command it is and ask: reply "confirm" to proceed or "deny" to cancel. Confirmation happens only in the chat, never in the panel.',
  unqualified: 'SQL guard: write `database.schema.object` in full in every write command. USE and names without the database are not run.',
  waitAviso2: 'SQL guard: the final confirmation from the user is still missing. Do not run it. Ask in the chat: "confirm" to proceed or "deny" to cancel.',
  failed: 'SQL guard: the check failed; nothing was run.',
  cancelled: 'SQL guard: pending command cancelled; it was not run.',
  approved1: 'SQL guard: the user confirmed the first warning. Do not run it yet. Call the tool again with the same command so the mod shows the final confirmation, and ask the user in the chat: "confirm" to proceed or "deny" to cancel.',
  approved2: 'SQL guard: the user confirmed the execution. Call the tool again with the same command now.',
  noLang: 'SQL guard: language not set. Choose pt or en in the mod settings.',
  noServers: 'SQL guard: no SQL Server MCP configured; write commands are not protected.',
  logFailed: 'SQL guard: could not write to the log.',
  log: {
    blocked: 'WARNING 1 shown',
    confirmed1: 'confirmed WARNING 1',
    confirmed2: 'confirmed WARNING 2',
    executed: 'executed',
    cancelled: 'cancelled',
    unqualified: 'denied: no explicit database',
  },
}

export const messages: Record<Lang, Messages> = { pt, en }

// A instrução do fim do painel: "confirme" em verde, a palavra de negação em vermelho.
function segments(t: Messages, sure: boolean): Segment[] {
  return [
    ...(sure ? [{ text: t.sure }] : []),
    { text: t.runWord },
    { text: t.confirmWord, tone: 'confirm' as const },
    { text: t.midWord },
    { text: t.cancelWord, tone: 'cancel' as const },
    { text: t.endWord },
  ]
}

// Uma linha por operação, para o painel caber sem rolagem: ação · banco · tabela · reversível.
function opLine(t: Messages, op: Op): string {
  const target = op.table ? ` · ${op.kind === 'procedure' ? t.procedure : t.table}: ${op.table}` : ''
  return `${op.action} · ${t.database}: ${op.db}${target} · ${t.reversible}: ${t.reversibleLabel[op.reversible]}`
}

// Mostra no máximo duas linhas de SQL encontrado, e diz quantas ficaram de fora.
const MAX_SHOWN = 2
function found(t: Messages, check: ShellCheck): string[] {
  if (check.findings.length === 0) return [t.shellNoSql]
  const shown = check.findings.slice(0, MAX_SHOWN)
  const rest = check.findings.length - shown.length
  return rest > 0 ? [...shown, `… +${rest}`] : shown
}

export function sqlPanel1(t: Messages, query: string, ops: Op[]): PanelState {
  return {
    title: t.aviso1Title,
    lines: [...ops.map(op => opLine(t, op)), `${t.command}:`],
    command: query,
    segments: segments(t, false),
  }
}

export function sqlPanel2(t: Messages, query: string): PanelState {
  return { title: t.aviso2Title, lines: [t.aviso2Intro], command: query, segments: segments(t, true) }
}

export function shellPanel1(t: Messages, command: string, check: ShellCheck): PanelState {
  const { reason } = check
  const file = 'file' in reason ? reason.file : undefined
  const why = file ? `${t.shellReasonText[reason.code]} (${file})` : t.shellReasonText[reason.code]
  return {
    title: t.aviso1Title,
    lines: [
      `${t.shellOperation}: SHELL · ${t.shellReason}: ${why}`,
      `${t.reversible}: ${t.shellReversible}`,
      `${t.shellFound}:`,
      ...found(t, check),
      `${t.command}:`,
    ],
    command,
    segments: segments(t, false),
  }
}

export function shellPanel2(t: Messages, command: string): PanelState {
  return { title: t.aviso2Title, lines: [t.aviso2Intro], command, segments: segments(t, true) }
}
