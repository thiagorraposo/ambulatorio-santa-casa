# Ambulatório Santa Casa

Base PostgreSQL construída incrementalmente para organizar dados do ambulatório. A fase atual mantém um schema físico validado de 35 tabelas, incluindo associações canônicas de projetos e exames por paciente, antes da importação completa, API e frontend.

O schema aplicado é `ambulatorio`. A principal evidência física versionada é `docs/evidencias/schema_atual_ambulatorio.sql`.

## Pré-requisitos

- PostgreSQL com `psql`, `pg_dump` e servidor local acessível.
- GNU Make.
- Git.
- Banco `ambulatorio_santa_casa`, usuário `ambulatorio_user` e schema `ambulatorio` já existentes.
- Autenticação local configurada em `~/.pgpass` com permissão `0600`.

Não coloque senhas em comandos, no `Makefile`, em arquivos `.env` versionados ou na documentação. O cliente PostgreSQL usa `~/.pgpass` automaticamente; o `Makefile` não abre nem imprime esse arquivo.

## Configuração local mínima

Com os nomes padrão, configure localmente uma entrada equivalente a esta em `~/.pgpass`, substituindo apenas o último campo pela senha local:

```text
localhost:5432:ambulatorio_santa_casa:ambulatorio_user:SENHA_LOCAL
```

Depois aplique:

```bash
chmod 600 ~/.pgpass
make db-check
```

Os parâmetros podem ser sobrescritos sem editar arquivos:

```bash
make db-check DB_HOST=localhost DB_PORT=5432 DB_NAME=ambulatorio_santa_casa DB_USER=ambulatorio_user DB_SCHEMA=ambulatorio
```

## Comandos principais

| Comando | Finalidade | Altera o banco? |
| --- | --- | --- |
| `make help` | Lista os alvos disponíveis. | Não |
| `make db-check` | Valida conexão, banco, usuário autenticado e existência do schema. | Não |
| `make db-test` | Executa todos os arquivos `tests/sql/*.sql` com `ON_ERROR_STOP=1`. | Não de forma persistente; os testes atuais usam `ROLLBACK`. |
| `make docs-check` | Confirma que a documentação obrigatória existe e não está vazia. | Não |
| `make project-check` | Executa documentação, banco, testes SQL, `git diff --check` e status Git. | Não de forma persistente. |
| `make db-schema-dump` | Atualiza atomicamente o dump somente estrutural do schema. | Não altera o banco; altera o arquivo de evidência. |
| `make git-status` | Exibe status e últimos commits. | Não |

Nenhum alvo reaplica `sql/00` a `sql/13`, cria ou remove banco, executa `DROP`, faz commit ou push.

## Ordem segura para retomar o trabalho

1. Ler `AGENTS.md`, `docs/ESTADO_ATUAL_DO_PROJETO.md` e `docs/PROXIMOS_PASSOS.md`.
2. Executar `make project-check` e revisar qualquer falha antes de editar.
3. Revisar `git status --short` e preservar mudanças existentes.
4. Para tarefa complexa, registrar um plano e o modo de validação.
5. Implementar somente o escopo autorizado; evolução física usa nova migration incremental.
6. Executar novamente `make project-check`.
7. Se o schema tiver sido alterado e aplicado de forma controlada, executar `make db-schema-dump` e revisar o diff da evidência.
8. Atualizar apenas a documentação afetada e `docs/REGISTRO_DE_ALTERACOES.md`.
9. Revisar o diff e o status. Commit e push somente quando forem explicitamente solicitados.

## Segurança

- Não versionar planilhas reais, dados clínicos, dumps com dados, backups ou credenciais.
- Usar somente dados sintéticos nos testes.
- Não alterar migrations antigas aplicadas nem reaplicar `sql/00` a `sql/09` no banco atual.
- `make db-schema-dump` usa `--schema-only --no-owner --no-privileges`; ele não exporta linhas das tabelas.

O fluxo detalhado está em `docs/WORKFLOW_DE_DESENVOLVIMENTO.md`.
