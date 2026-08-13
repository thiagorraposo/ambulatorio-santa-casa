# Workflow de Desenvolvimento

Atualizado em: 2026-08-13

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
| `make docker-destroy` | Remover explicitamente apenas o ambiente e o volume Docker deste projeto. |

O ambiente padrão é `DB_ENV=local`, autenticado por `~/.pgpass` na porta 5432.
O ambiente alternativo usa `DB_ENV=docker`, `.env` ignorado pelo Git e porta
5433. Nunca inclua senha no prompt, em documentação ou em arquivos versionados.
`make db-schema-dump` gera somente estrutura; `docker-schema-dump` escreve por
padrão em `/tmp/schema_ambulatorio_docker.sql` e não substitui a evidência oficial.

## Escolha explícita do PostgreSQL

Local:

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

Não execute `db-migrate` no PostgreSQL local já aplicado. `docker-destroy` apaga
o volume persistente e só deve ser chamado quando a destruição do ambiente Docker
for intencional.

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
