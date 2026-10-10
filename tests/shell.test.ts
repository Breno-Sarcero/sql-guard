import { expect, test } from 'claude-code/testing'

import { checkShell } from '../hooks/shell'

const noFile = async () => null

test('comando comum de shell não gera aviso', async () => {
  expect(await checkShell('ls -la', noFile)).toBe(null)
  expect(await checkShell('git status', noFile)).toBe(null)
})

test('cliente SQL direto gera aviso', async () => {
  expect((await checkShell('sqlcmd -S SRVDEV01 -Q "select 1"', noFile))?.reason).toEqual({ code: 'client' })
  expect((await checkShell('Invoke-Sqlcmd -Query "select 1"', noFile))?.reason).toEqual({ code: 'client' })
})

test('driver de banco no próprio comando gera aviso', async () => {
  expect((await checkShell('python -c "import pyodbc"', noFile))?.reason).toEqual({ code: 'driver' })
})

test('nome de pacote com mssql no caminho (mcp-node-mssql) não gera aviso', async () => {
  expect(await checkShell('ls "C:/npm/node_modules/mcp-node-mssql"', noFile)).toBe(null)
  expect(await checkShell('cat node_modules/mcp-node-mssql/index.js', noFile)).toBe(null)
  expect((await checkShell('node -e "require(\'mssql\')"', noFile))?.reason).toEqual({ code: 'driver' })
})

test('manage.py que altera o banco gera aviso, runserver não', async () => {
  expect((await checkShell('python manage.py migrate', noFile))?.reason).toEqual({ code: 'django' })
  const manage = async () => 'import os\nos.environ.setdefault("DJANGO_SETTINGS_MODULE", "x")'
  expect(await checkShell('python manage.py runserver', manage)).toBe(null)
})

test('script Python com pyodbc gera aviso depois de ler o arquivo', async () => {
  const read = async (path: string) => (path === 'job.py' ? 'import pyodbc\nconn = pyodbc.connect("x")' : null)
  expect((await checkShell('python job.py', read))?.reason).toEqual({ code: 'script', file: 'job.py' })
})

test('script Python sem driver de banco passa', async () => {
  const read = async () => 'print("oi")'
  expect(await checkShell('python hello.py', read)).toBe(null)
})

test('script que importa módulo local com pyodbc gera aviso com o caminho do módulo', async () => {
  const files: Record<string, string> = {
    'job.py': 'from helpers.db import run\nrun()',
    'helpers/db.py': 'import pyodbc',
  }
  const read = async (path: string) => files[path] ?? null
  expect((await checkShell('python job.py', read))?.reason).toEqual({ code: 'import', file: 'helpers/db.py' })
})

test('import que não existe localmente (biblioteca) é ignorado', async () => {
  const read = async (path: string) => (path === 'job.py' ? 'import json\nimport requests' : null)
  expect(await checkShell('python job.py', read)).toBe(null)
})

test('node com require de módulo local que usa mssql gera aviso', async () => {
  const files: Record<string, string> = {
    'app.js': "const db = require('./db')",
    './db.js': "const sql = require('mssql')",
  }
  const read = async (path: string) => files[path] ?? null
  expect((await checkShell('node app.js', read))?.reason).toEqual({ code: 'import', file: './db.js' })
})

test('mostra os SQL de escrita encontrados, com arquivo e linha', async () => {
  const files: Record<string, string> = {
    'job.py': 'import pyodbc\ncur.execute("UPDATE dbo.clientes SET ativo = 0")\ncur.execute("SELECT 1")',
  }
  const read = async (path: string) => files[path] ?? null
  const check = await checkShell('python job.py', read)
  expect(check?.findings).toEqual(['job.py:2  cur.execute("UPDATE dbo.clientes SET ativo = 0")'])
})

test('script que não pode ser lido gera aviso', async () => {
  expect((await checkShell('python sumido.py', noFile))?.reason).toEqual({ code: 'unreadable', file: 'sumido.py' })
})
