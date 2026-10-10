// Classifica comandos SQL: quais são de escrita, em que banco e tabela mexem, e se são reversíveis.
// Sem efeito colateral: é a parte testável do mod.

export type Reversible = 'in-transaction' | 'no' | 'unknown'

export type Op = {
  action: string
  db: string | null
  table: string | null
  kind: 'table' | 'procedure' | 'database' | 'other'
  reversible: Reversible
  text: string
}

const WRITE = /\b(insert|update|delete|merge|drop|alter|truncate|create|grant|revoke|deny|exec|execute|bulk|openrowset|openquery|use|sp_executesql|xp_\w+)\b/i
const SELECT_INTO = /\bselect\b[\s\S]*?\binto\s+([\w\[\]\.]+)/i
const TARGET = /\b(insert\s+into|update|delete\s+from|merge\s+into|truncate\s+table|(?:alter|create|drop)\s+(?:table|view|procedure|proc|function|trigger|index)|(?:alter|create|drop)\s+database|exec(?:ute)?)\s+(?:if\s+(?:not\s+)?exists\s+)?([\w\[\]\.]+)/i
const DML = ['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'SELECT INTO']
const IN_TRANSACTION: Reversible = 'in-transaction'
const NO: Reversible = 'no'
const UNKNOWN: Reversible = 'unknown'

export function normalize(query: string): string {
  return query.replace(/\s+/g, ' ').trim().toLowerCase()
}

// Só comandos de escrita viram ops. Lista vazia = leitura, libera sem aviso.
export function classify(query: string): Op[] {
  const clean = query
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
  const ops: Op[] = []

  for (const stmt of clean.split(/;|^\s*go\s*$/im)) {
    const text = stmt.trim()
    if (!text) continue
    // sp_help e sp_describe são leitura, liberadas pelo CLAUDE.md
    if (/^(exec(ute)?\s+)?sp_(help|describe)/i.test(text)) continue

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

    const kind: Op['kind'] = isDatabase ? 'database' : isProcedure ? 'procedure' : table ? 'table' : 'other'
    const reversible = DML.includes(action)
      ? IN_TRANSACTION
      : ['EXEC', 'EXECUTE', 'SP_EXECUTESQL'].includes(action) || action.startsWith('XP_')
        ? UNKNOWN
        : NO

    ops.push({ action, db, table, kind, reversible, text })
  }

  return ops
}
