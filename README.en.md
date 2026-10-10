[Português](README.md) | **English**

# sql-guard

Protects against accidental writes and DDL made by Claude Code: commands on SQL Server MCPs and shell commands that reach a database. It does not catch every case, but it removes many risks of running the wrong thing when the AI understands something other than what the person meant.

![sql-guard: Claude tries a DELETE, the mod blocks it with warning 1, the user confirms, warning 2 follows, the user confirms again, the command runs and the log records all four steps](docs/demo-en.gif)

## What it checks

- **SQL Server MCP** (`query` on the configured servers): writes and DDL are blocked until confirmed. `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, `DENY`, `SELECT ... INTO`, `EXEC`. Commands without a full `database.schema.object` name are denied, and so is `USE`.
- **Shell (Bash and PowerShell):** `sqlcmd`, `osql`, `bcp`, `Invoke-Sqlcmd`, database drivers in the command itself (`pyodbc`, `pymssql`, `mssql`), `manage.py migrate/flush/loaddata/dbshell`, and scripts (Python, Node, PowerShell) that use a database driver, including the local modules they import. It shows what it found, and the decision is yours.
- **Allowed without a warning:** `SELECT`, read-only `WITH`, `sys.*`, `INFORMATION_SCHEMA.*`, `sp_help*`, `sp_describe*`, and `manage.py runserver`.

## Installation

In a Claude Code terminal session, type:

```
/plugin install sql-guard --marketplace Breno-Sarcero/sql-guard
```

Answer `y` to add the marketplace and pick a scope (user scope applies to every session). Claude Code then asks for:

1. **Language** (`pt` or `en`): required, with no default. Without a choice, the mod blocks all writes.
2. **SQL Server MCP names**: one or more, separated by commas. For example `sqlserver,sqlserver-dev`. Check them with `claude mcp list`.
3. **Query tool name**: `query` by default.
4. **Log folder**: empty writes to `.claude/logs`, in the folder where Claude was opened.
5. **Time to confirm (minutes)**: default 5. This is the time between the warning and your answer. If it passes, the request expires and Claude has to ask again. Increase it if you usually answer slowly.

### Alternative: from the release zip

Download the zip from [Releases](https://github.com/Breno-Sarcero/sql-guard/releases), extract it, and point the `CLAUDE_CODE_PLUGIN_DIRS` variable in your `settings.json` to the extracted folder. The five options above go in `pluginConfigs`, under the `sql-guard@inline` key:

```json
{
  "env": { "CLAUDE_CODE_PLUGIN_DIRS": "C:\\path\\to\\sql-guard" },
  "pluginConfigs": {
    "sql-guard@inline": {
      "options": { "language": "en", "sqlServers": "sqlserver", "queryTool": "query" }
    }
  }
}
```

## How to confirm a write

1. Claude tries the command. The mod blocks it, and the "SQL guard" side panel shows warning 1: operation, database, table, whether it is reversible, and the command.
2. You answer in the chat: `confirm` to proceed, or `deny` to cancel. (In Portuguese: `confirma` or `nega`.)
3. Claude tries again, and the mod shows warning 2, with the command.
4. You answer again, in the chat. The command runs.

The reply must start with a confirmation word: `confirm`, `yes`, `go`, `run`, or in Portuguese `confirma`, `sim`, `pode`, `executa`. Any other reply cancels the request. If the message contains `but`, `wait`, `espera` or `mas` anywhere, it also cancels. The request expires after the configured time (5 minutes by default) without progress. This time can be changed at install.

The panel only shows the details. It does not take clicks or confirmations.

## Log

The log is **per project**: `.claude/logs/sql-guard.log`, in the folder where Claude was opened. Each line has: date and time (UTC), MCP or `shell`, action, database, table and result (`WARNING 1 shown`, `confirmed WARNING 1`, `confirmed WARNING 2`, `executed`, `cancelled`, `denied: no explicit database`). The log does not record row data or the full SQL.

If the project is in Git, add `.claude/logs/` to `.gitignore`, because the log contains database and table names.

## Limitations

- It is a heuristic. A script that builds its SQL only at run time can pass without a warning. The real protection is still the person's confirmation in the chat.
- SQL Server only. PostgreSQL and Oracle are pending (see `CHANGELOG.en.md`).
- The `reading 'length'` error from the `mcp-node-mssql` package is handled by the mod after an approved command. The definitive fix is in the package (see `CHANGELOG.en.md`).
