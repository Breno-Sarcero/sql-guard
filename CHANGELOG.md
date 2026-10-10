**Português** | [English](CHANGELOG.en.md)

# Changelog

## 0.2.11

- README com badges: licença, versão da release, plugin do Claude Code e idiomas.

## 0.2.10

- **Melhoria:** mensagem própria para `SHUTDOWN`, `KILL`, `DBCC` e `RECONFIGURE`. Antes caíam na negação genérica ("escreva o nome completo banco.schema.objeto"), que não fazia sentido para comandos de servidor. Agora o mod explica que esses comandos afetam o servidor inteiro e devem ser rodados direto no SQL Server, e o log registra `negado: comando de servidor`.

## 0.2.9

- **Correção:** `sp_helptext`, `sp_describe_first_result_set` e outras variações de `sp_help*` e `sp_describe*` com argumentos voltaram a passar sem aviso, como diz o README. A correção da 0.2.4 tinha deixado só `sp_help <objeto>`. Os argumentos agora precisam ser uma lista de parâmetros (nome de objeto, string ou `@param = valor`); qualquer outra coisa conta como escrita. Assim, `exec sp_help x DELETE FROM y` e `exec sp_help x SELECT * INTO t FROM y` continuam bloqueados.
- **Comandos de servidor:** `BACKUP`, `RESTORE`, `DBCC`, `SHUTDOWN`, `KILL` e `RECONFIGURE` passam a contar como escrita (antes passavam sem aviso). `BACKUP DATABASE` e `RESTORE DATABASE` seguem os dois avisos, com o banco identificado. Os demais não têm banco para mostrar e são negados.

## 0.2.8

- README: exemplo de caminho no macOS e no Linux para a instalação pelo zip.

## 0.2.7

- **Licença MIT:** arquivo `LICENSE`, campo `license` no `plugin.json` e seção no README.

## 0.2.6

- **Demo animada no README:** GIF do fluxo completo (aviso 1, confirmação, aviso 2, execução e log), em `docs/demo-pt.gif` e `docs/demo-en.gif`.

## 0.2.5

- **Instalação em um comando:** o repositório agora é um marketplace (`.claude-plugin/marketplace.json`). Instale com `/plugin install sql-guard --marketplace Breno-Sarcero/sql-guard`.
- README com a instalação nova, a alternativa pelo zip da release e a lista correta de palavras de confirmação.
- Exemplos de configuração com nomes genéricos.

## 0.2.4

- **Correção de segurança no classificador SQL (revisão do commit):**
  - Comentários `--` e `/* */` só são removidos fora de literais (`'...'`, `"..."` e `[...]`, com escape de aspa e colchete dobrados). Antes, um `--` dentro de uma string escondia o resto da linha, incluindo um `DELETE`.
  - O atalho de `sp_help` / `sp_describe` só vale para um nome de objeto sozinho. Antes, uma escrita na linha seguinte passava.
  - Camada fail-closed: se a limpeza esconder alguma palavra de escrita do texto original (comparando contagens), a statement é tratada como escrita. Efeito: uma escrita que só aparece dentro de comentário também pede aviso.
- Cinco testes novos cobrindo os casos acima.

## 0.2.3

- **Falso positivo no shell corrigido:** o nome `mssql` dentro de outro pacote (ex.: `mcp-node-mssql`, em qualquer comando com esse caminho) disparava o aviso de banco. Agora o driver precisa aparecer como palavra inteira.
- Teste novo para esse caso.

## 0.2.2

- Removido o marketplace local. O mod é carregado pela pasta; a configuração vai em `pluginConfigs` como `sql-guard@inline`.
- Pasta `.claude/logs` fora do repositório, via `.gitignore`.

## 0.2.1

- Autor no `plugin.json`, para o aviso de validação sumir.

## 0.2.0

- **Shell (Bash e PowerShell):** comandos que acessam banco passam pela mesma confirmação em dois passos.
  - Clientes SQL diretos (`sqlcmd`, `osql`, `bcp`, `Invoke-Sqlcmd`) e drivers no próprio comando (`pyodbc`, `pymssql`, `mssql`).
  - Scripts chamados pelo comando (`python`, `node`, `tsx`, `powershell -File`) são lidos, e também os módulos locais que eles importam. Se algum usar driver de banco, o aviso mostra o caminho e as linhas de SQL de escrita encontradas.
  - Comandos do Django que alteram o banco (`migrate`, `flush`, `loaddata`, `dbshell`).
  - Pede confirmação nos dois avisos antes de executar. Mostra o que encontrou, e a decisão é do usuário.
- **Painel lateral:** os avisos aparecem num painel (`$.ui.open`), com título em amarelo, comando em azul e negrito, "confirma/confirm" em verde e "nega/deny" em vermelho. O painel abre sozinho com 144 colunas ou mais, e pelo comando `/sql-guard` a partir de 110.
- **Confirmação só pelo chat:** o usuário responde no chat. Pelo texto em português: `confirma` para executar, `nega` para cancelar. Em inglês: `confirm` e `deny`. O painel não recebe clique nem confirmação.
- **Mensagens ao modelo:** o modelo recebe uma instrução curta, que diz para perguntar no chat, sem citar o painel como lugar de confirmação.
- **Erro `reading 'length'`:** vem do pacote `mcp-node-mssql` (0.1.1) quando um comando não devolve linhas. O mod troca esse erro específico por uma nota de "executado", só depois de comando aprovado pelos dois avisos. Ver "Pendente".
- **Idioma:** configuração obrigatória na instalação (pt ou en), sem padrão.
- **Prazo para confirmar:** configurável na instalação, com padrão de 5 minutos.
- **Log:** uma linha por operação, com data UTC, MCP, ação, banco, tabela e resultado. Não grava dados das linhas nem o SQL completo.

## 0.1.0

- Bloqueio de escrita e DDL nos MCPs de SQL Server, com dois avisos e confirmação pelo usuário.
- Configuração na instalação: idioma, nomes dos MCPs de SQL Server, nome da ferramenta de consulta e pasta do log.

## Pendente

- **Falsos positivos no shell:** o mod lê o script pelo caminho escrito no comando, a partir da pasta onde o Claude foi aberto. Se o comando fizer `cd` antes de rodar um script com caminho relativo, ou usar variável no caminho (`$PASTA/x.py`), o mod não acha o arquivo e pede confirmação por segurança. Contorno: usar o caminho completo, sem variável.
- **Palavras de confirmação:** hoje só `sim`, `confirma`, `pode`, entre outras da lista, valem como aprovação. Qualquer outra palavra (ex.: `positivo`) cancela a pendência, e o usuário precisa começar de novo. Melhoria: aceitar qualquer palavra de aprovação e qualquer palavra de recusa para cancelar.

- **Erro `reading 'length'` na origem:** a correção definitiva é no pacote `mcp-node-mssql`, que é um pacote npm. Aplicamos um ajuste local na instalação global (com backup), que se perde com `npm update -g`. Quando o pacote for tratado, a nota de "executado" do mod pode ser removida.
- **Outros bancos de dados** (PostgreSQL, Oracle e outros). Cada banco precisa de um perfil próprio: regra de nome completo, comandos de escrita e como identificar o banco.
- **Clique no painel:** deixado de fora por enquanto. Um clique não envia mensagem para o chat, então precisaria de uma forma de enviar "confirma" ou "nega" automaticamente.
