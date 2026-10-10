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

test('normalize ignora caixa e espaços', () => {
  expect(normalize('  UPDATE   x.dbo.t  SET a=1 ')).toBe('update x.dbo.t set a=1')
})
