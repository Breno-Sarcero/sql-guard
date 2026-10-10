// Classifica comandos SQL: quais são de escrita, em que banco e tabela mexem, e se são reversíveis.
// Sem efeito colateral: é a parte testável do mod.

export type Reversible = 'in-transaction' | 'no' | 'unknown'

export type Op = {
  action: string
  db: string | null
  table: string | null
  kind: 'table' | 'procedure' | 'database' | 'server' | 'other'
  reversible: Reversible
  text: string
}

const WRITE = /\b(insert|update|delete|merge|drop|alter|truncate|create|grant|revoke|deny|exec|execute|bulk|openrowset|openquery|use|sp_executesql|xp_\w+|backup|restore|dbcc|shutdown|kill|reconfigure)\b/i
const SELECT_INTO = /\bselect\b[\s\S]*?\binto\s+([\w\[\]\.]+)/i
const TARGET = /\b(insert\s+into|update|delete\s+from|merge\s+into|truncate\s+table|(?:alter|create|drop)\s+(?:table|view|procedure|proc|function|trigger|index)|(?:alter|create|drop|backup|restore)\s+database|exec(?:ute)?)\s+(?:if\s+(?:not\s+)?exists\s+)?([\w\[\]\.]+)/i
// sp_help* e sp_describe* são leitura. Os argumentos só podem ser uma lista de parâmetros (nome de objeto, string
// ou @param = valor, separados por vírgula): "exec sp_help x DELETE FROM y" é T-SQL válido sem ";" e não pode passar.
const SP_ARG = String.raw`(?:@\w+\s*=\s*)?(?:N?'(?:[^']|'')*'|[\w.\[\]]+)`
const SP_HELP = new RegExp(String.raw`^(?:exec(?:ute)?\s+)?sp_(?:help|describe)\w*(?:\s+${SP_ARG}(?:\s*,\s*${SP_ARG})*)?\s*$`, 'i')
const isSpHelp = (text: string): boolean => SP_HELP.test(text)
const DML = ['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'SELECT INTO']
// Comandos que afetam o servidor inteiro, sem banco a mostrar: o mod nega com mensagem própria.
const SERVER = ['SHUTDOWN', 'KILL', 'DBCC', 'RECONFIGURE']
const IN_TRANSACTION: Reversible = 'in-transaction'
const NO: Reversible = 'no'
const UNKNOWN: Reversible = 'unknown'

export function normalize(query: string): string {
  return query.replace(/\s+/g, ' ').trim().toLowerCase()
}

// Só comandos de escrita viram ops. Lista vazia = leitura, libera sem aviso.
function countWrites(text: string): number {
  return (text.match(new RegExp(WRITE.source, 'gi')) ?? []).length
}

// Tira comentários só fora de literais: '--' dentro de uma string não pode esconder o resto da linha.
function stripComments(query: string): string {
  let out = ''
  let i = 0
  while (i < query.length) {
    const c = query[i]
    // Literal ('...'), identificador entre aspas ("...") ou entre colchetes ([...]). Escape: a aspa ou ] dobrada.
    if (c === "'" || c === '"' || c === '[') {
      const close = c === '[' ? ']' : c
      let j = i + 1
      while (j < query.length && !(query[j] === close && query[j + 1] !== close)) j += query[j] === close ? 2 : 1
      out += query.slice(i, j + 1)
      i = j + 1
    } else if (c === '-' && query[i + 1] === '-') {
      const nl = query.indexOf('\n', i)
      i = nl < 0 ? query.length : nl
      out += ' '
    } else if (c === '/' && query[i + 1] === '*') {
      const end = query.indexOf('*/', i + 2)
      i = end < 0 ? query.length : end + 2
      out += ' '
    } else {
      out += c
      i++
    }
  }
  return out
}

export function classify(query: string): Op[] {
  const clean = stripComments(query)
  const ops: Op[] = []

  for (const stmt of clean.split(/;|^\s*go\s*$/im)) {
    const text = stmt.trim()
    if (!text) continue
    // sp_help e sp_describe são leitura, liberadas pelo CLAUDE.md
    if (isSpHelp(text)) continue

    const word = WRITE.exec(text)
    const into = SELECT_INTO.exec(text)
    if (!word && !into) continue

    const action = word ? word[1].toUpperCase() : 'SELECT INTO'
    const target = TARGET.exec(text)
    const isDatabase = target ? /database/i.test(target[1]) : false
    const isProcedure = target ? /exec/i.test(target[1]) || /proc/i.test(target[1]) : false
    const name = target ? target[2] : into ? into[1] : null
    const parts = name ? name.replace(/[\[\]]/g, '').split('.') : []

    let db: string | null = null
    let table: string | null = null
    if (isDatabase) {
      db = parts[0] ?? null
    } else if (parts.length === 3) {
      db = parts[0]
      table = parts[2]
    } else if (parts.length > 0) {
      table = parts[parts.length - 1]
    }

    const kind: Op['kind'] = SERVER.includes(action)
      ? 'server'
      : isDatabase
        ? 'database'
        : isProcedure
          ? 'procedure'
          : table
            ? 'table'
            : 'other'
    const reversible = DML.includes(action)
      ? IN_TRANSACTION
      : ['EXEC', 'EXECUTE', 'SP_EXECUTESQL'].includes(action) || action.startsWith('XP_')
        ? UNKNOWN
        : NO

    ops.push({ action, db, table, kind, reversible, text })
  }

  // Camada fail-closed: se a limpeza escondeu alguma palavra de escrita do texto original, a statement vira escrita.
  const hidden = countWrites(query) > countWrites(clean)
  if (hidden && !isSpHelp(query.trim())) {
    const word = WRITE.exec(query)
    if (word) ops.push({ action: word[1].toUpperCase(), db: null, table: null, kind: 'other', reversible: 'unknown', text: query })
  }

  return ops
}
