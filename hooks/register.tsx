// SQL guard: bloqueia escrita e DDL nos MCPs de SQL Server configurados e comandos de shell que acessam banco,
// até dois "sim" do usuário, um para cada aviso. Os avisos aparecem num painel lateral (pane), com cores.
// A confirmação vem da mensagem do usuário (prompt.submit), que o modelo não consegue escrever.
import { atom, read, update, type Register } from 'claude-code'

import type { PanelState } from '../types'
import { messages, shellPanel1, shellPanel2, sqlPanel1, sqlPanel2, type Lang, type Messages } from './messages'
import { classify, normalize, type Op } from './sql'
import { checkShell } from './shell'

const DEFAULT_LOG_DIR = '.claude/logs'
const LOG_FILE = 'sql-guard.log'
const SHELL_TOOLS = ['Bash', 'PowerShell']
const PANE = 'sql-guard'

const CONFIRM = /^[\W_]*(sim|s|pode|pode executar|confirma|confirmo|vai|executa|yes|y|confirm|go|execute|run|do it|exec)\b/i
const HESITATE = /\b(não|nao|espera|mas|calma|wait|but|stop|cancela|cancel|pare|nope)\b/i

type Stage = 'aviso1' | 'aviso1-ok' | 'aviso2' | 'approved'
// Um pedido de escrita (MCP ou shell) aguardando os dois "sim". panel1 e panel2 são o que o painel mostra em cada aviso.
type Job = { key: string; server: string; ops: Op[]; panel1: PanelState; panel2: PanelState }
type Pending = Job & { stage: Stage; at: number }

let pending: Pending | null = null

// Estado lido pelo painel. Nulo quando não há pendência.
const panel = atom({ plugin: 'sql-guard', key: 'panel' } as const, null as PanelState)

// Uma linha por operação: data e hora (UTC), MCP, ação, banco, tabela e resultado. Sem dados das linhas.
function logLines(server: string, ops: Op[], outcome: string): string {
  const when = new Date().toISOString()
  return ops.map(op => `${when} | ${server} | ${op.action} | ${op.db ?? '-'} | ${op.table ?? '-'} | ${outcome}`).join('\n') + '\n'
}

// Comando de shell aparece no log como uma operação SHELL, sem banco nem tabela conhecidos.
function shellOps(command: string): Op[] {
  return [{ action: 'SHELL', db: null, table: null, kind: 'other', reversible: 'unknown', text: command }]
}

export const register: Register = (on, options) => {
  const language = String(options.language ?? '').trim()
  const lang: Lang | null = language === 'pt' || language === 'en' ? language : null
  const t: Messages = messages[lang ?? 'pt']
  // Prazo entre o aviso e a resposta do usuário; padrão de 5 minutos, configurável na instalação.
  const ttl = Math.max(1, Number(options.timeoutMinutes) || 5) * 60_000

  const servers = String(options.sqlServers ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  const queryTool = String(options.queryTool ?? '').trim() || 'query'
  const tools = servers.map(server => `mcp__${server}__${queryTool}`)
  const logFile = `${String(options.logDir ?? '').trim() || DEFAULT_LOG_DIR}/${LOG_FILE}`

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'sql-guard', description: 'Show the SQL guard panel' }).catch(() => {})
    if (!lang) $.ui.toast(`${messages.pt.noLang}\n${messages.en.noLang}`)
    else if (tools.length === 0) $.ui.toast(t.noServers)
    return next(e)
  })

  // Abre o painel sob pedido: a janela pode ser mais estreita que a abertura automática exige.
  on('command.run', { command: 'sql-guard' }, async $ => {
    await $.ui.open({ id: PANE, title: 'SQL guard' })
    return { text: 'SQL guard panel opened.' }
  })

  // Desenha o painel lateral com o aviso pendente, em tela cheia da pane.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const p = await read($, panel)
    const { Box, Text } = $.ui.resolve(e)
    if (!p) return <Box><Text dimColor>{t.idle}</Text></Box>

    return (
      <Box flexDirection="column">
        <Text color="warning" bold>{p.title}</Text>
        {p.lines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
        <Text color="blue" bold>{p.command}</Text>
        <Text>
          {p.segments.map((s, i) => (
            <Text key={i} color={s.tone === 'confirm' ? 'green' : s.tone === 'cancel' ? 'red' : undefined} bold={s.tone !== undefined}>
              {s.text}
            </Text>
          ))}
        </Text>
      </Box>
    )
  })

  on('prompt.submit', async ($, e, next) => {
    if (!pending) return next(e)

    // Aprovação vale só para a rodada em que foi dada: a mensagem seguinte encerra.
    if (pending.stage === 'approved') {
      pending = null
      await update($, panel, () => null)
      await $.ui.close({ id: PANE })
      return next(e)
    }

    if (Date.now() - pending.at > ttl) {
      pending = null
      await update($, panel, () => null)
      await $.ui.close({ id: PANE })
      return next(e)
    }

    const text = e.text.trim()
    const context = [...(e.context ?? [])]
    const isConfirm = CONFIRM.test(text) && !HESITATE.test(text)

    if (!isConfirm) {
      const cancelled = pending
      pending = null
      await update($, panel, () => null)
      await $.ui.close({ id: PANE })
      context.push(t.cancelled)
      const old = await $.fs.read(logFile).catch(() => '')
      await $.fs.write(logFile, String(old) + logLines(cancelled.server, cancelled.ops, t.log.cancelled)).catch(() => $.ui.toast(t.logFailed))
      return next({ ...e, context })
    }

    pending.at = Date.now()
    const outcome = pending.stage === 'aviso1' ? t.log.confirmed1 : pending.stage === 'aviso2' ? t.log.confirmed2 : null
    if (pending.stage === 'aviso1') {
      pending.stage = 'aviso1-ok'
      context.push(t.approved1)
    } else if (pending.stage === 'aviso2') {
      pending.stage = 'approved'
      context.push(t.approved2)
    }
    if (outcome) {
      const old = await $.fs.read(logFile).catch(() => '')
      await $.fs.write(logFile, String(old) + logLines(pending.server, pending.ops, outcome)).catch(() => $.ui.toast(t.logFailed))
    }
    return next({ ...e, context })
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: [...tools, ...SHELL_TOOLS] }, async ($, e, next) => {
    if (!lang) return { deny: `${messages.pt.noLang}\n${messages.en.noLang}` }

    let job: Job
    if (e.tool === 'Bash' || e.tool === 'PowerShell') {
      const readFile = (path: string) => $.fs.read(path).then(String).catch(() => null)
      const check = await checkShell(e.command, readFile)
      if (!check) return next(e)
      job = {
        key: normalize(e.command),
        server: 'shell',
        ops: shellOps(e.command),
        panel1: shellPanel1(t, e.command, check),
        panel2: shellPanel2(t, e.command),
      }
    } else {
      const writes = classify(e.query)
      if (writes.length === 0) return next(e)

      if (writes.some(op => op.db === null)) {
        const old = await $.fs.read(logFile).catch(() => '')
        await $.fs.write(logFile, String(old) + logLines(e.tool.split('__')[1], writes, t.log.unqualified)).catch(() => $.ui.toast(t.logFailed))
        pending = null
        await update($, panel, () => null)
        await $.ui.close({ id: PANE })
        return { deny: t.unqualified }
      }

      job = {
        key: normalize(e.query),
        server: e.tool.split('__')[1],
        ops: writes,
        panel1: sqlPanel1(t, e.query, writes),
        panel2: sqlPanel2(t, e.query),
      }
    }

    const now = Date.now()
    if (pending && now - pending.at > ttl) pending = null

    if (!pending || pending.key !== job.key) {
      pending = { ...job, stage: 'aviso1', at: now }
      await update($, panel, () => job.panel1)
      void $.ui.open({ id: PANE, title: 'SQL guard' })
      const old = await $.fs.read(logFile).catch(() => '')
      await $.fs.write(logFile, String(old) + logLines(job.server, job.ops, t.log.blocked)).catch(() => $.ui.toast(t.logFailed))
      return { deny: t.panelDeny }
    }

    switch (pending.stage) {
      case 'aviso1':
        await update($, panel, () => job.panel1)
        void $.ui.open({ id: PANE, title: 'SQL guard' })
        return { deny: t.panelDeny }
      case 'aviso1-ok':
        pending.stage = 'aviso2'
        pending.at = now
        await update($, panel, () => job.panel2)
        void $.ui.open({ id: PANE, title: 'SQL guard' })
        return { deny: t.panelDeny }
      case 'aviso2':
        return { deny: t.waitAviso2 }
      case 'approved': {
        const { server, ops } = pending
        pending = null
        await update($, panel, () => null)
        await $.ui.close({ id: PANE })
        const result = await next(e)
        const old = await $.fs.read(logFile).catch(() => '')
        await $.fs.write(logFile, String(old) + logLines(server, ops, t.log.executed)).catch(() => $.ui.toast(t.logFailed))
        // Só o erro conhecido do pacote do MCP, e só depois de um comando aprovado: o resto segue como veio.
        if (result.isError === true && String(result.text ?? '').includes("reading 'length'"))
          return { ...result, isError: false, result: t.executedNote, text: t.executedNote }
        return result
      }
    }
  }).catch(() => ({ deny: t.failed }))
}
