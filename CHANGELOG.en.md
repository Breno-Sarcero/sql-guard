[Português](CHANGELOG.md) | **English**

# Changelog

## 0.2.9

- **Fix:** `sp_helptext`, `sp_describe_first_result_set` and other `sp_help*` and `sp_describe*` variants with arguments pass without a warning again, as the README says. The 0.2.4 fix had left only `sp_help <object>`. The arguments must now be a parameter list (object name, string or `@param = value`); anything else counts as a write. So `exec sp_help x DELETE FROM y` and `exec sp_help x SELECT * INTO t FROM y` are still blocked.
- **Server commands:** `BACKUP`, `RESTORE`, `DBCC`, `SHUTDOWN`, `KILL` and `RECONFIGURE` now count as writes (before, they passed without a warning). `BACKUP DATABASE` and `RESTORE DATABASE` go through both warnings, with the database shown. The others have no database to show and are denied.

## 0.2.8

- README: macOS and Linux path example for the zip install.

## 0.2.7

- **MIT license:** `LICENSE` file, `license` field in `plugin.json`, and a README section.

## 0.2.6

- **Animated demo in the README:** a GIF of the full flow (warning 1, confirmation, warning 2, execution and log), in `docs/demo-pt.gif` and `docs/demo-en.gif`.

## 0.2.5

- **One-command install:** the repository is now a marketplace (`.claude-plugin/marketplace.json`). Install with `/plugin install sql-guard --marketplace Breno-Sarcero/sql-guard`.
- README with the new install, the release-zip alternative, and the correct list of confirmation words.
- Configuration examples use generic names.

## 0.2.4

- **Security fix in the SQL classifier (commit review):**
  - `--` and `/* */` comments are only removed outside literals (`'...'`, `"..."` and `[...]`, with doubled quote and bracket escapes). Before, a `--` inside a string hid the rest of the line, including a `DELETE`.
  - The `sp_help` / `sp_describe` shortcut only applies to a bare object name. Before, a write on the next line got through.
  - Fail-closed layer: if comment removal hides any write keyword from the original text (comparing counts), the statement is treated as a write. Effect: a write that only appears inside a comment also asks for a warning.
- Five new tests covering the cases above.

## 0.2.3

- **Shell false positive fixed:** the name `mssql` inside another package (e.g. `mcp-node-mssql`, in any command with that path) triggered the database warning. Now the driver must appear as a whole word.
- New test for this case.

## 0.2.2

- Removed the local marketplace. The mod loads from its folder; the configuration goes in `pluginConfigs` as `sql-guard@inline`.
- The `.claude/logs` folder is kept out of the repository, via `.gitignore`.

## 0.2.1

- Author in `plugin.json`, so the validation warning goes away.

## 0.2.0

- **Shell (Bash and PowerShell):** commands that reach a database go through the same two-step confirmation.
  - Direct SQL clients (`sqlcmd`, `osql`, `bcp`, `Invoke-Sqlcmd`) and database drivers in the command itself (`pyodbc`, `pymssql`, `mssql`).
  - Scripts run by the command (`python`, `node`, `tsx`, `powershell -File`) are read, along with the local modules they import. If any of them uses a database driver, the warning shows the path and the write SQL lines it found.
  - Django commands that change the database (`migrate`, `flush`, `loaddata`, `dbshell`).
  - Asks for confirmation in both warnings before running. It shows what it found, and the decision is the user's.
- **Side panel:** warnings appear in a panel (`$.ui.open`), with the title in yellow, the command in bold blue, "confirma/confirm" in green and "nega/deny" in red. The panel opens by itself at 144 columns or more, and with the `/sql-guard` command from 110 columns.
- **Confirmation in the chat only:** the user answers in the chat. In Portuguese: `confirma` to run, `nega` to cancel. In English: `confirm` and `deny`. The panel does not take clicks or confirmations.
- **Messages to the model:** the model gets a short instruction to ask in the chat, and it no longer refers to the panel as a place to confirm.
- **`reading 'length'` error:** it comes from the `mcp-node-mssql` package (0.1.1) when a command returns no rows. The mod replaces this specific error with an "executed" note, only after a command approved by both warnings. See "Pending".
- **Language:** required at install (pt or en), with no default.
- **Time to confirm:** configurable at install, default 5 minutes.
- **Log:** one line per operation, with UTC date, MCP or `shell`, action, database, table and result. It does not record row data or the full SQL.

## 0.1.0

- Blocks writes and DDL on SQL Server MCPs, with two warnings and confirmation by the user.
- Install settings: language, SQL Server MCP names, query tool name and log folder.

## Pending

- **Shell false positives:** the mod reads the script from the path written in the command, relative to the folder where Claude was opened. If the command runs `cd` before a script with a relative path, or uses a variable in the path (`$DIR/x.py`), the mod cannot find the file and asks for confirmation to be safe. Workaround: use the full path, without variables.
- **Confirmation words:** today only `sim`, `confirma`, `pode`, and a few others from the list count as approval. Any other word (e.g. `positivo`) cancels the pending action, and the user has to start over. Improvement: accept any approval word and any refusal word to cancel.

- **`reading 'length'` at the source:** the definitive fix belongs in the `mcp-node-mssql` package, an npm package. We applied a local fix to the global install (with a backup), which is lost on `npm update -g`. Once the package is fixed, the mod's "executed" note can be removed.
- **Other databases** (PostgreSQL, Oracle and others). Each one needs its own profile: full-name rule, write commands and how to identify the database.
- **Clicking in the panel:** left out for now. A click does not send a chat message, so it would need a way to send "confirma" or "nega" automatically.
