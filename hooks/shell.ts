// Comandos de shell (Bash e PowerShell) que acessam banco. Não bloqueia: sinaliza, mostra o que encontrou
// nos scripts e deixa a decisão para o usuário pelos dois avisos. Heurística: vê o texto do comando,
// os scripts que ele roda e os módulos locais que esses scripts importam.

export type ShellReason =
  | { code: 'client' }
  | { code: 'driver' }
  | { code: 'django' }
  | { code: 'unreadable'; file: string }
  | { code: 'script'; file: string }
  | { code: 'import'; file: string }

export type ShellCheck = { reason: ShellReason; findings: string[] }

const DB_CLIENT = /\b(sqlcmd|osql|bcp|invoke-sqlcmd)\b/i
// Sem \b: em \b, o "-" do nome do pacote (ex.: mcp-node-mssql) contaria como fronteira de palavra.
const DB_DRIVER = /(?<![\w.\-\/\\])(pyodbc|pymssql|mssql-django|mssql|SqlConnection|Microsoft\.Data\.SqlClient)(?![\w\-])/i
const DJANGO_DB = /\bmanage\.py\s+(migrate|flush|loaddata|dbshell)\b/i
// Instruções SQL que alteram dados ou estrutura, para mostrar no aviso.
const SQL_WRITE = /\b(INSERT\s+INTO|UPDATE\s+[\w.\[\]]+\s+SET|DELETE\s+FROM|DROP\s+(?:TABLE|DATABASE|VIEW|PROCEDURE|INDEX)|ALTER\s+(?:TABLE|DATABASE|PROCEDURE|VIEW)|TRUNCATE\s+TABLE|CREATE\s+(?:TABLE|DATABASE|PROCEDURE|VIEW)|EXEC(?:UTE)?\s+[\w.\[\]]+)/i
// Interpretador seguido de um arquivo de script: python x.py, node x.js, powershell -File x.ps1, tsx x.ts
const RUN = /\b(?:python3?(?:\.exe)?|node|tsx|ts-node|pwsh|powershell(?:\.exe)?)\b[^\n;&|]*?\s["']?([^\s"';&|]+\.(?:py|js|mjs|cjs|ts|ps1))["']?/gi
const MAX_FILES = 20
const MAX_FINDINGS = 5

type Context = { seen: Set<string>; findings: string[] }

// Devolve o motivo e o SQL encontrado, ou null se o comando não acessa banco.
export async function checkShell(
  command: string,
  readFile: (path: string) => Promise<string | null>,
): Promise<ShellCheck | null> {
  if (DB_CLIENT.test(command)) return { reason: { code: 'client' }, findings: [] }
  if (DB_DRIVER.test(command)) return { reason: { code: 'driver' }, findings: [] }
  if (DJANGO_DB.test(command)) return { reason: { code: 'django' }, findings: [] }

  const ctx: Context = { seen: new Set(), findings: [] }
  for (const match of command.matchAll(RUN)) {
    const reason = await scan(match[1], readFile, ctx, true)
    if (reason) return { reason, findings: ctx.findings }
  }
  return null
}

// Lê um script e, se ele importar módulos locais, segue os imports (com limite de arquivos).
// Guarda os SQL de escrita encontrados em qualquer arquivo lido.
async function scan(
  file: string,
  readFile: (path: string) => Promise<string | null>,
  ctx: Context,
  isEntry: boolean,
): Promise<ShellReason | null> {
  if (ctx.seen.has(file) || ctx.seen.size >= MAX_FILES) return null
  ctx.seen.add(file)

  const text = await readFile(file)
  if (text === null) return isEntry ? { code: 'unreadable', file } : null

  collectSql(file, text, ctx)

  if (DB_CLIENT.test(text) || DB_DRIVER.test(text)) return isEntry ? { code: 'script', file } : { code: 'import', file }

  for (const dep of localImports(file, text)) {
    const reason = await scan(dep, readFile, ctx, false)
    if (reason) return reason
  }
  return null
}

function collectSql(file: string, text: string, ctx: Context): void {
  text.split('\n').forEach((line, index) => {
    if (ctx.findings.length >= MAX_FINDINGS || !SQL_WRITE.test(line)) return
    ctx.findings.push(`${file}:${index + 1}  ${line.trim().slice(0, 120)}`)
  })
}

// Candidatos a módulo local: import do Python (x.y -> x/y.py) e require/import relativo do JS/TS.
function localImports(file: string, text: string): string[] {
  const dir = file.replace(/[^\\/]*$/, '')
  const found = new Set<string>()

  for (const m of text.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm)) {
    const name = m[1] ?? m[2]
    if (!name || name.startsWith('.')) continue
    const path = name.replace(/\./g, '/')
    found.add(`${dir}${path}.py`)
    found.add(`${path}.py`)
  }

  for (const m of text.matchAll(/(?:require\(|from\s+|import\s*\(?)\s*["'](\.{1,2}\/[^"']+)["']/g)) {
    const rel = m[1]
    found.add(`${dir}${rel}.ts`)
    found.add(`${dir}${rel}.js`)
    found.add(`${dir}${rel}`)
  }

  return [...found]
}
