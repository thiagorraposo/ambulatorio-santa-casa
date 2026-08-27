# Workflow de Desenvolvimento

Atualizado em: 2026-08-26

O CI em `.github/workflows/validacoes.yml` usa credenciais sintéticas descartáveis,
PostgreSQL 16.15 e executa migrations em banco limpo, manifesto, importador,
testes SQL, documentação e `git diff --check`.

`make db-migrate` é bootstrap de banco limpo. Em banco existente, migrations
antigas não podem ser reaplicadas; use
`make db-migrate-one MIGRATION_FILE=sql/NN_arquivo.sql`.

O preflight pelo mesmo pipeline, sempre revertido, é executado com
`make importer-dry-run IMPORT_FILE=...`.

## Backend Etapa 4A

```bash
make backend-install
make backend-check
make backend-up
```

`backend-db-setup` provisiona somente o login técnico e concede a role sem login;
não altera schema. O backend nunca aplica migrations. No CI, o banco limpo recebe
migrations primeiro e só depois executa build, testes unitários e integração.

## Comandos Oficiais

Use os alvos do `Makefile` como interface local padrão:

| Comando | Quando usar |
| --- | --- |
| `make db-check` | Confirmar conexão, banco, usuário e schema. |
| `make db-test` | Executar todos os testes SQL versionados. |
| `make docs-check` | Conferir documentação obrigatória. |
| `make project-check` | Validação não destrutiva padrão antes e depois da tarefa. |
| `make db-schema-dump` | Atualizar a evidência estrutural após mudança física aplicada e autorizada. |
| `make docker-up` / `docker-stop` | Subir ou parar o PostgreSQL Docker sem remover o volume. |
| `make docker-status` / `docker-logs` | Inspecionar health, status e logs. |
| `make docker-migrate` | Reconstruir um banco Docker vazio pelas migrations `00`–`16`. |
| `make docker-db-check` / `docker-db-test` | Validar conexão e testes no Docker. |
| `make docker-schema-dump` | Gerar evidência Docker temporária em `/tmp`. |
| `make docker-recreate` | Recriar o container preservando o volume nomeado. |
| `make docker-backup` / `docker-backup-list` | Criar ou localizar backups lógicos locais. |
| `make docker-restore ...` | Restaurar somente no serviço Docker controlado. |
| `make docker-restore-check` / `docker-restore-test` | Validar catálogo e testes no banco restaurado. |
| `make docker-destroy DESTROY_ENV=docker` | Remover explicitamente apenas o ambiente e os volumes Docker deste projeto. |
| `make importer-fixture` | Gerar a fixture XLSX sintética versionada. |
| `make importer-test` | Executar o E2E em banco Docker temporário e descartável. |
| `make importer-run IMPORT_FILE=...` | Importar um arquivo sintético no Docker selecionado. |

O ambiente padrão é `DB_ENV=docker`, com `.env` ignorado pelo Git e porta 5433.
O ambiente local na porta 5432 permanece alternativa manual e só é selecionado
explicitamente com `DB_ENV=local`; nenhuma rotina de restore dá suporte a ele.
Nunca inclua senha no prompt, em documentação ou em arquivos versionados.
`make db-schema-dump` gera somente estrutura; `docker-schema-dump` escreve por
padrão em `/tmp/schema_ambulatorio_docker.sql` e não substitui a evidência oficial.
Enquanto a autorização institucional estiver pendente, `importer-run` deve
receber exclusivamente fixtures sintéticas.

## Escolha explícita do PostgreSQL

Docker, padrão:

```bash
make project-check
make docker-project-check
```

Local, alternativa manual:

```bash
make project-check DB_ENV=local
```

Docker:

```bash
cp .env.example .env
make docker-up
make docker-migrate  # somente em volume novo/vazio
make docker-project-check
```

Não execute `db-migrate` no PostgreSQL local já aplicado. `docker-destroy` exige
`DESTROY_ENV=docker`, apaga os volumes persistentes e só deve ser chamado quando
a destruição do ambiente Docker for intencional.

O procedimento de backup, teste de restauração e recuperação após perda de
container ou volume está em `docs/RECUPERACAO_POSTGRESQL_DOCKER.md`.

## Fluxo Oficial

1. Atualizar a branch local.
2. Criar uma branch de tarefa.
3. Pedir plano ao Codex para tarefas complexas.
4. Definir objetivo, escopo, arquivos afetados, restrições e critérios de aceite.
5. Implementar uma alteração pequena e isolada.
6. Executar validação real, normalmente com `make project-check`.
7. Revisar o diff.
8. Atualizar a documentação necessária.
9. Validar `git status`, já exibido por `make project-check`.
10. Criar commit no padrão adotado.
11. Enviar para o repositório remoto.
12. Usar pull request quando API, frontend ou trabalho colaborativo começarem.

## Checklist para Banco

- A mudança exige nova migration incremental?
- Migrations antigas permanecem intactas?
- O script usa `SET search_path TO ambulatorio, public;`?
- Há estratégia de rollback ou reversão?
- Há teste SQL correspondente?
- A documentação física foi atualizada?
- `docs/REGISTRO_DE_ALTERACOES.md` foi atualizado?
- Nenhum dado clínico real foi incluído?

## Checklist para Testes

- Os dados são sintéticos?
- O teste usa `BEGIN` e `ROLLBACK` quando adequado?
- A execução usa `ON_ERROR_STOP=1`?
- Há cenários positivos e negativos?
- O teste não assume IDs fixos?
- Limitações de cobertura estão documentadas?

## Checklist para Documentação

- O documento certo foi atualizado?
- A fonte de verdade está clara?
- Incertezas foram registradas como pendências?
- Não há dados sensíveis?
- Mudança relevante foi registrada no registro de alterações?

## Checklist para Futuro Backend

- A API respeita constraints do banco?
- Validações de entrada refletem o modelo físico?
- Erros de integridade são tratados?
- Autenticação e autorização foram consideradas?
- Testes cobrem fluxos principais?

## Checklist para Futuro Frontend

- A interface usa dados da API, não acesso direto ao banco?
- Estados de erro e carregamento foram tratados?
- Campos seguem domínios e valores permitidos?
- Não há dados reais embutidos no código?
- Testes ou validações manuais foram registrados?

## Modelos de Prompt para Codex

Prefira prompts curtos que referenciem as regras e os comandos oficiais, acrescentando detalhes apenas quando alterarem o escopo.

### Prompt Mínimo Recomendado

```text
Leia AGENTS.md e a documentação relacionada. Execute <objetivo>. Preserve mudanças existentes, não altere migrations antigas e valide com make project-check. Não faça commit nem push.
```

### Planejamento de Mudança

```text
Analise o projeto e proponha um plano antes de editar.
Objetivo:
Contexto:
Arquivos relevantes:
Restrições:
Critérios de aceite:
Validação esperada:
Use os alvos aplicáveis do Makefile e finalize com make project-check.
```

### Migration Incremental

```text
Crie uma migration incremental sem alterar migrations antigas.
Objetivo da mudança:
Schema/tabelas envolvidos:
Regras de integridade:
Rollback ou reversão:
Documentação a atualizar:
Teste SQL esperado; execute com make db-test:
```

### Revisão de Diff

```text
Revise o diff atual com foco em bugs, riscos e documentação.
Contexto da mudança:
Critérios de aceite:
Pontos de atenção:
Comandos de validação já executados; prefira make project-check:
```

### Criação de Teste

```text
Crie ou ajuste teste para a mudança abaixo.
Objetivo:
Schema/tabelas:
Cenários positivos:
Cenários negativos:
Dados devem ser sintéticos:
Validação esperada:
```

### Atualização Documental

```text
Atualize a documentação afetada pela mudança.
Mudança realizada:
Arquivos alterados:
Decisões duradouras:
Pendências:
Registro de alterações necessário:
```
