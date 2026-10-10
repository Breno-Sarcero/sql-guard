import { expect, test } from 'claude-code/testing'

import { classify, normalize } from '../hooks/sql'

test('leitura não gera aviso', () => {
  expect(classify('select * from CRM_BD.dbo.clientes where ativo = 1')).toEqual([])
  expect(classify('with x as (select 1 as a) select * from x')).toEqual([])
  expect(classify('select updated_at from CRM_BD.dbo.clientes')).toEqual([])
  expect(classify('exec sp_help CRM_BD.dbo.clientes')).toEqual([])
  expect(classify('exec CRM_BD.dbo.minha_proc')).not.toEqual([])
})

test('update com banco explícito indica banco e tabela', () => {
  const [op] = classify('update ESTOQUE_BD.dbo.produtos set ativo = 0 where id = 5')
  expect(op.action).toBe('UPDATE')
  expect(op.db).toBe('ESTOQUE_BD')
  expect(op.table).toBe('produtos')
  expect(op.kind).toBe('table')
})

test('comando sem banco explícito vem com db nulo', () => {
  const [op] = classify('delete from clientes where id = 1')
  expect(op.db).toBe(null)
})

test('drop database indica só o banco', () => {
  const [op] = classify('drop database BANCO_TESTE')
  expect(op.kind).toBe('database')
  expect(op.db).toBe('BANCO_TESTE')
  expect(op.table).toBe(null)
  expect(op.reversible).toBe('no')
})

test('DDL não é reversível; DML é reversível só em transação', () => {
  const [ddl] = classify('truncate table CRM_BD.dbo.logs')
  expect(ddl.reversible).toBe('no')
  const [dml] = classify('insert into CRM_BD.dbo.logs (a) values (1)')
  expect(dml.reversible).toBe('in-transaction')
})

test('comentários não escondem escrita', () => {
  const ops = classify('/* leitura */ select 1; -- nada\n DELETE FROM CRM_BD.dbo.logs')
  expect(ops.length).toBe(1)
  expect(ops[0].action).toBe('DELETE')
})

test('select into conta como escrita', () => {
  const [op] = classify('select * into CRM_BD.dbo.copia from CRM_BD.dbo.clientes')
  expect(op.action).toBe('SELECT INTO')
  expect(op.table).toBe('copia')
})

test('-- dentro de literal não esconde escrita na mesma linha', () => {
  const ops = classify("select '--' ; delete from CRM_BD.dbo.clientes")
  expect(ops.length).toBe(1)
  expect(ops[0].action).toBe('DELETE')
})

test('-- dentro de identificador entre aspas duplas não esconde escrita', () => {
  const ops = classify('select "--" ; delete from CRM_BD.dbo.clientes')
  expect(ops.length).toBe(1)
  expect(ops[0].action).toBe('DELETE')
})

test('colchete com ]] escapado não esconde escrita', () => {
  const ops = classify('select [x]]--] ; delete from CRM_BD.dbo.clientes')
  expect(ops.length).toBe(1)
  expect(ops[0].action).toBe('DELETE')
})

test('variações de sp_help e sp_describe com argumentos continuam liberadas', () => {
  expect(classify('exec sp_helptext CRM_BD.dbo.minha_proc')).toEqual([])
  expect(classify("exec sp_describe_first_result_set N'select * from CRM_BD.dbo.clientes'")).toEqual([])
  expect(classify("exec sp_help @objname = N'CRM_BD.dbo.clientes'")).toEqual([])
})

test('sp_help seguido de escrita na mesma linha não passa', () => {
  expect(classify('exec sp_help CRM_BD.dbo.clientes DELETE FROM CRM_BD.dbo.logs').length).toBe(1)
  expect(classify('exec sp_help x select * into CRM_BD.dbo.t from CRM_BD.dbo.y').length).toBe(1)
})

test('comandos de servidor que alteram estado contam como escrita', () => {
  for (const q of ['shutdown', 'kill 52', "restore database CRM_BD from disk = 'x.bak'", "backup database CRM_BD to disk = 'x.bak'", 'dbcc checkdb', 'reconfigure'])
    expect(classify(q).length).toBe(1)
  for (const q of ['shutdown', 'kill 52', 'dbcc checkdb', 'reconfigure'])
    expect(classify(q)[0].kind).toBe('server')
  const [restore] = classify("restore database CRM_BD from disk = 'x.bak'")
  expect(restore.db).toBe('CRM_BD')
  expect(restore.kind).toBe('database')
})

test('sp_help não serve de atalho para escrita na linha seguinte', () => {
  const ops = classify('exec sp_help CRM_BD.dbo.clientes\nDELETE FROM CRM_BD.dbo.logs')
  expect(ops.length).toBe(1)
})

test('escrita só dentro de comentário é tratada como escrita (fail-closed)', () => {
  const ops = classify('select 1 /* delete from CRM_BD.dbo.x */')
  expect(ops.length).toBe(1)
  expect(ops[0].action).toBe('DELETE')
})

test('normalize ignora caixa e espaços', () => {
  expect(normalize('  UPDATE   x.dbo.t  SET a=1 ')).toBe('update x.dbo.t set a=1')
})
