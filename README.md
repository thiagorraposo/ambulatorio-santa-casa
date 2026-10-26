# Ambulatório Santa Casa

Base PostgreSQL construída incrementalmente para organizar dados do ambulatório.
O schema persistente possui 38 tabelas. Importador e backend NestJS evoluíram até
a Etapa 5 no ambiente sintético; a fundação do frontend React/TypeScript
(6A–6B) está concluída; os fluxos clínicos 7A–7D têm implementação e validação
sintética aprovadas no recorte original. As correções da reauditoria e o percurso integrado
foram implementados; o aceite clínico com a equipe permanece pendente. Consulte o
[estado vigente](docs/ESTADO_ATUAL_DO_PROJETO.md) para os limites de cada ambiente.

O schema aplicado é `ambulatorio`. A principal evidência física versionada é `docs/evidencias/schema_atual_ambulatorio.sql`.

## Frontend e referência visual

A aplicação própria fica em [`frontend/`](frontend/), consome a API `/v1` e
inclui sessão, navegação, busca, ficha e formulários clínicos. Setup, comandos e contratos
estão em [`docs/FRONTEND.md`](docs/FRONTEND.md); os resultados de validação ficam
nos relatórios da [Etapa 6](docs/validacoes/VALIDACAO_ETAPA_6.md) e da
[Etapa 7](docs/validacoes/VALIDACAO_ETAPA_7.md).

O código do protótipo Figma Make fica em
[`referencias/frontend/figma-make-prototipo/`](referencias/frontend/figma-make-prototipo/),
como material de apoio visual e funcional, separado do build da aplicação.
Consulte a
[organização das referências](referencias/README.md) e a
[análise de integração](docs/arquitetura/ANALISE_INTEGRACAO_FIGMA_MAKE.md).

A [visão proposta do produto](docs/frontend/VISAO_E_ESPECIFICACAO.md), a
[matriz ponto a ponto](docs/frontend/MATRIZ_FIGMA_FRONTEND.md) e os
[pacotes do roadmap](docs/PROXIMOS_PASSOS.md#pacotes-verificáveis-do-produto-frontend)
explicitam a experiência pretendida, diferenças, dependências e aceite;
[capturas e wireframes](docs/frontend/visuais/README.md) distinguem observação
da interface e proposta.

## Demonstração local com dados sintéticos

Com Docker, Python 3, Node.js 24 e os clientes PostgreSQL instalados:

```bash
make backend-install frontend-install backend-build
make dev-sintetico-start
make dev-sintetico-status
```

Abra `http://127.0.0.1:4177`. Para escrita, use
`frontend-edicao@example.invalid` com a senha exclusivamente sintética
`Etapa6-sintetica!`. O comando também informa os outros perfis e o caminho dos logs.
O ambiente possui PostgreSQL próprio e descartável; não usa o `.env` nem os bancos
persistentes. Para encerrar e descartar somente essa demonstração:

```bash
make dev-sintetico-stop
```

Detalhes, portas e limites estão em [FRONTEND.md](docs/FRONTEND.md#demonstração-sintética-isolada).

## Pré-requisitos

- PostgreSQL com `psql` e `pg_dump`; o servidor pode ser local ou Docker.
- Docker Engine com Docker Compose, ambiente padrão de desenvolvimento.
- GNU Make.
- Git.
- Node.js 24 e npm para execução local do backend e frontend.
- Chromium do Playwright para os testes de navegador do frontend.
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
| `make docker-migrate` | Aplica as migrations versionadas em `sql/` em ordem no banco Docker vazio. | Sim, somente no banco Docker. |
| `make docker-db-check` | Executa `db-check` contra `5433`. | Não |
| `make docker-db-test` | Executa os testes SQL versionados no Docker. | Não persiste dados sintéticos. |
| `make docker-schema-dump` | Gera dump estrutural Docker em `/tmp`. | Não altera o banco nem a evidência oficial. |
| `make docker-project-check` | Executa o check completo contra o Docker. | Não persiste dados sintéticos. |
| `make docker-backup` | Cria e valida backup lógico custom do Docker. | Lê o banco e grava arquivo local ignorado. |
| `make docker-backup-list` | Lista os backups lógicos locais. | Não. |
| `make docker-restore BACKUP_FILE=... RESTORE_ENV=docker-restore` | Restaura no serviço Docker controlado. | **Substitui somente o schema do banco de recuperação.** |
| `make docker-restore-check` | Confirma estrutura e catálogos restaurados. | Não. |
| `make docker-restore-test` | Executa os testes SQL versionados no banco restaurado. | Não persiste dados sintéticos. |
| `make docker-destroy DESTROY_ENV=docker` | Remove containers, rede e volumes deste Compose. | **Destrutivo somente para o ambiente Docker.** |
| `make importer-fixture` | Regera a planilha XLSX exclusivamente sintética. | Não altera banco. |
| `make importer-test` | Testa o importador em banco Docker temporário. | Cria e remove somente o banco isolado. |
| `make importer-run IMPORT_FILE=... IMPORT_PURPOSE=...` | Exige finalidade explícita (`carga_inicial` ou `mesmo_conteudo`); somente arquivo sintético; `revisao` bloqueada. | Sim. |
| `make backend-install` | Instala dependências exatamente pelo `package-lock`. | Não. |
| `make backend-check` | Compila e testa integração, autenticação e autorização. | Insere e remove paciente e usuários sintéticos. |
| `make backend-up` | Provisiona o login técnico e sobe o backend no Compose. | Altera somente a role de login; não altera schema. |
| `make frontend-install` | Instala dependências exatamente pelo lockfile. | Não. |
| `make frontend-dev` | Serve Vite e encaminha `/v1` à API sintética configurada. | Formulários podem escrever conforme perfil, vínculo e política da API. |
| `make frontend-check COMPACT=1` | Compila, testa sessão/componentes e executa navegador/API reais. | Cria e remove banco/roles exclusivamente sintéticos e descartáveis. |

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

1. Seguir `AGENTS.md` e consultar as fontes necessárias ao escopo pelo índice `docs/README.md`.
2. Revisar `git status --short` e preservar mudanças existentes.
3. Selecionar as verificações pela [matriz de validação](docs/WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional), incluindo validação inicial quando indicada.
4. Para tarefa complexa, registrar um plano e o modo de validação.
5. Implementar somente o escopo autorizado; evolução física usa nova migration incremental.
6. Executar as verificações aplicáveis; preferir `COMPACT=1` para obter resumo e log temporário, sem repetir suítes aprovadas sobre o mesmo estado.
7. Se o schema tiver sido alterado e aplicado de forma controlada, executar `make db-schema-dump` e revisar o diff da evidência.
8. Atualizar apenas a documentação afetada e `docs/REGISTRO_DE_ALTERACOES.md`.
9. Revisar o diff e o status. Commit e push somente quando forem explicitamente solicitados.

## Segurança

- Não versionar planilhas reais, dados clínicos, dumps com dados, backups ou credenciais.
- Usar somente dados sintéticos nos testes.
- Não alterar migrations antigas aplicadas nem reaplicar `sql/00` a `sql/09` no banco atual.
- `make db-schema-dump` usa `--schema-only --no-owner --no-privileges`; ele não exporta linhas das tabelas.

O fluxo detalhado está em `docs/WORKFLOW_DE_DESENVOLVIMENTO.md`.
