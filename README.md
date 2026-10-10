**Português** | [English](README.en.md)

# sql-guard

Protege contra escrita e DDL acidentais feitas pelo Claude Code: comandos nos MCPs de SQL Server e comandos de shell que acessam banco. Não resolve todos os casos, mas elimina muitos riscos de execução errada, quando a IA entende algo diferente do que a pessoa pediu.

![sql-guard: o Claude tenta um DELETE, o mod bloqueia com o aviso 1, o usuário confirma, vem o aviso 2, confirma de novo, o comando executa e o log registra as quatro etapas](docs/demo-pt.gif)

## O que é verificado

- **MCP de SQL Server** (`query` nos servidores configurados): escrita e DDL são bloqueadas até confirmação. `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, `DENY`, `SELECT ... INTO`, `EXEC`. Comandos sem `banco.schema.objeto` completo são negados, e `USE` também.
- **Shell (Bash e PowerShell):** `sqlcmd`, `osql`, `bcp`, `Invoke-Sqlcmd`, drivers de banco no próprio comando (`pyodbc`, `pymssql`, `mssql`), `manage.py migrate/flush/loaddata/dbshell` e scripts (Python, Node, PowerShell) que usam driver de banco, inclusive módulos locais que eles importam. Mostra o que encontrou e a decisão é sua.
- **Liberados sem aviso:** `SELECT`, `WITH` de leitura, `sys.*`, `INFORMATION_SCHEMA.*`, `sp_help*`, `sp_describe*`, e `manage.py runserver`.

## Instalação

No terminal do Claude Code, digite:

```
/plugin install sql-guard --marketplace Breno-Sarcero/sql-guard
```

Responda `y` para adicionar o marketplace e escolha o escopo (o de usuário vale para todas as sessões). Em seguida, o Claude Code pede:

1. **Idioma** (`pt` ou `en`): obrigatório, sem padrão. Sem escolha, o mod bloqueia todas as escritas.
2. **Nomes dos MCPs de SQL Server**: um ou mais, separados por vírgula. Por exemplo `sqlserver,sqlserver-dev`. Veja com `claude mcp list`.
3. **Nome da ferramenta de consulta**: `query` por padrão.
4. **Pasta do log**: vazio grava em `.claude/logs`, na pasta de onde o Claude foi aberto.
5. **Prazo para confirmar (minutos)**: padrão 5. É o tempo entre o aviso e a sua resposta. Se passar desse tempo, o pedido expira e o Claude precisa pedir de novo. Aumente se você costuma responder com calma.

### Alternativa: pelo zip da release

Baixe o zip em [Releases](https://github.com/Breno-Sarcero/sql-guard/releases), extraia e aponte a variável `CLAUDE_CODE_PLUGIN_DIRS` do seu `settings.json` para a pasta extraída. As cinco opções acima ficam em `pluginConfigs`, na chave `sql-guard@inline`:

```json
{
  "env": { "CLAUDE_CODE_PLUGIN_DIRS": "C:\\caminho\\para\\sql-guard" },
  "pluginConfigs": {
    "sql-guard@inline": {
      "options": { "language": "pt", "sqlServers": "sqlserver", "queryTool": "query" }
    }
  }
}
```

## Como confirmar uma escrita

1. O Claude tenta o comando. O mod bloqueia, e o painel lateral "SQL guard" mostra o aviso 1: operação, banco, tabela, se é reversível e o comando.
2. Você responde no chat: `confirma` (ou `confirm`, em inglês) para seguir, ou `nega` (ou `deny`) para cancelar.
3. O Claude tenta de novo, e o mod mostra o aviso 2, com o comando.
4. Você responde de novo, no chat. O comando roda.

A resposta precisa começar com uma palavra de confirmação: `confirma`, `sim`, `pode`, `executa`, ou em inglês `confirm`, `yes`, `go`, `run`. Qualquer outra resposta cancela o pedido. Se a mensagem tiver `mas`, `espera`, `wait` ou `but` em qualquer parte, também cancela. O pedido expira depois do prazo configurado (5 minutos por padrão) sem avançar. Esse prazo pode ser alterado na instalação.

O painel só mostra os detalhes. Não recebe clique nem confirmação.

## Log

O log é **por projeto**: `.claude/logs/sql-guard.log`, na pasta onde o Claude foi aberto. Cada linha tem: data e hora (UTC), MCP ou `shell`, ação, banco, tabela e resultado (`WARNING 1 shown`, `confirmed WARNING 1`, `confirmed WARNING 2`, `executed`, `cancelled`, `denied: no explicit database`). O log não grava dados das linhas nem o SQL completo.

Se o projeto estiver no Git, adicione `.claude/logs/` ao `.gitignore`, porque o log tem nomes de bancos e tabelas.

## Limitações

- É uma heurística. Um script que monta o SQL só em tempo de execução pode passar sem aviso. A proteção real continua sendo a confirmação da pessoa, no chat.
- Só SQL Server. PostgreSQL e Oracle estão pendentes (ver `CHANGELOG.md`).
- O erro `reading 'length'` do pacote `mcp-node-mssql` é tratado pelo mod depois de comando aprovado. A correção definitiva é no pacote (ver `CHANGELOG.md`).

## Licença

MIT. Veja [LICENSE](LICENSE).
