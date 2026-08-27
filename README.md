# Ambulatório Santa Casa

Base PostgreSQL construída incrementalmente para organizar dados do ambulatório.
O schema físico possui 37 tabelas e a Etapa 4A adiciona a fundação NestJS da API,
sem autenticação, autorização, escrita clínica, frontend ou dados reais.

O schema aplicado é `ambulatorio`. A principal evidência física versionada é `docs/evidencias/schema_atual_ambulatorio.sql`.

## Pré-requisitos

- PostgreSQL com `psql` e `pg_dump`; o servidor pode ser local ou Docker.
- Docker Engine com Docker Compose, ambiente padrão de desenvolvimento.
- GNU Make.
- Git.
- Node.js 24 e npm para execução local do backend.
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

## PostgreSQL Docker padrão

O PostgreSQL Docker isolado em `127.0.0.1:5433` é o ambiente padrão para
desenvolvimento estrutural e testes. Copie `.env.example` para `.env`, substitua a senha
fictícia por uma senha exclusiva de desenvolvimento e mantenha o arquivo local:

```bash
cp .env.example .env
make docker-up
make docker-migrate
make docker-db-check
make docker-db-test
```

O Compose executa `postgres:16.15`, persiste dados no volume nomeado
`ambulatorio_santa_casa_postgres_data` e publica a porta somente no loopback. O
`.env` é ignorado pelo Git e não deve reutilizar credenciais reais.
O PostgreSQL local permanece intacto como alternativa manual, sempre selecionado
explicitamente com `DB_ENV=local`.

Escolha explicitamente o ambiente ao usar os alvos genéricos:

```bash
make db-check DB_ENV=local
make db-check DB_ENV=docker
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
| `make docker-up` | Sobe o PostgreSQL Docker e preserva o volume existente. | Pode criar container, rede e volume Docker. |
| `make docker-status` | Mostra status e healthcheck. | Não |
| `make docker-stop` | Para o container sem remover o volume. | Para somente o ambiente Docker. |
| `make docker-recreate` | Recria o container preservando o volume. | Substitui somente o container Docker. |
| `make docker-logs` | Acompanha logs do PostgreSQL Docker. | Não |
| `make docker-migrate` | Aplica `sql/00`–`sql/17` em ordem no Docker vazio. | Sim, somente no banco Docker. |
| `make docker-db-check` | Executa `db-check` contra `5433`. | Não |
| `make docker-db-test` | Executa os nove testes SQL no Docker. | Não persiste dados sintéticos. |
| `make docker-schema-dump` | Gera dump estrutural Docker em `/tmp`. | Não altera o banco nem a evidência oficial. |
| `make docker-project-check` | Executa o check completo contra o Docker. | Não persiste dados sintéticos. |
| `make docker-backup` | Cria e valida backup lógico custom do Docker. | Lê o banco e grava arquivo local ignorado. |
| `make docker-backup-list` | Lista os backups lógicos locais. | Não. |
| `make docker-restore BACKUP_FILE=... RESTORE_ENV=docker-restore` | Restaura no serviço Docker controlado. | **Substitui somente o schema do banco de recuperação.** |
| `make docker-restore-check` | Confirma estrutura e catálogos restaurados. | Não. |
| `make docker-restore-test` | Executa os nove testes transacionais no restore. | Não persiste dados sintéticos. |
| `make docker-destroy DESTROY_ENV=docker` | Remove containers, rede e volumes deste Compose. | **Destrutivo somente para o ambiente Docker.** |
| `make importer-fixture` | Regera a planilha XLSX exclusivamente sintética. | Não altera banco. |
| `make importer-test` | Testa o importador em banco Docker temporário. | Cria e remove somente o banco isolado. |
| `make importer-run IMPORT_FILE=...` | Executa o importador v1; nesta fase, somente com arquivo sintético. | Sim. |
| `make backend-install` | Instala dependências exatamente pelo `package-lock`. | Não. |
| `make backend-check` | Compila e executa testes unitários e integração PostgreSQL. | Insere e remove somente um paciente sintético identificado. |
| `make backend-up` | Provisiona o login técnico e sobe o backend no Compose. | Altera somente a role de login; não altera schema. |

Os alvos genéricos não aplicam migrations. `docker-migrate` aplica as migrations
somente quando selecionado explicitamente, e `docker-destroy` exige a confirmação
`DESTROY_ENV=docker` para remover volumes Docker. Nenhum alvo Docker altera o
PostgreSQL local.

## Backup e recuperação

```bash
make docker-backup
make docker-backup-list
make docker-restore BACKUP_FILE=backups_postgres/ambulatorio_AAAAMMDDTHHMMSSZ.dump RESTORE_ENV=docker-restore
make docker-restore-check
make docker-restore-test
```

Os backups usam o formato custom do `pg_dump` e ficam em `backups_postgres/`,
diretório ignorado pelo Git. O restore usa `postgres-restore`, sem porta publicada
e com o volume separado `ambulatorio_santa_casa_postgres_restore_data`. O alvo
exige a confirmação literal `RESTORE_ENV=docker-restore` e não possui rota para o
PostgreSQL local. Veja `docs/RECUPERACAO_POSTGRESQL_DOCKER.md`.

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
