# AGENTS.md

Regras permanentes para agentes trabalhando neste repositório.

## Objetivo

O projeto `ambulatorio-santa-casa` organiza dados do ambulatório em PostgreSQL, com importador e backend em evolução incremental.

## Estrutura Relevante

- `sql/`: scripts SQL e futuras migrations incrementais.
- `tests/sql/`: testes SQL reutilizáveis, com dados sintéticos.
- `docs/`: documentação técnica, decisões, validações e workflow.
- `docs/README.md`: índice das fontes principais por assunto.
- Consulte documentos e código conforme o escopo; histórico, dump e arquivos extensos devem ser lidos por trechos relevantes, ampliando a leitura quando necessário.

## Banco

- O banco é PostgreSQL.
- O schema principal é `ambulatorio`.
- Migrations antigas aplicadas nunca devem ser alteradas.
- Toda alteração estrutural futura deve usar nova migration incremental.
- `docs/evidencias/schema_atual_ambulatorio.sql` é a principal evidência do schema físico aplicado.

## Dados

- Dados clínicos reais, planilhas reais, backups e credenciais não podem ser versionados.
- Dados de teste devem ser sintéticos.
- Testes SQL devem usar `BEGIN` e `ROLLBACK` sempre que adequado.

## Documentação e Commits

- Mudanças relevantes exigem atualização da documentação correspondente.
- Mudanças cronológicas devem ser registradas em `docs/REGISTRO_DE_ALTERACOES.md`.
- Use o padrão de commits definido em `docs/PADRAO_DE_COMMITS.md`.

## Trabalho com Codex

- Tarefas complexas devem começar por plano antes de alteração.
- Defina objetivo, critérios de aceite e validação; preserve alterações preexistentes.
- Não execute comandos destrutivos sem autorização explícita.
- Priorize os alvos do `Makefile` com `COMPACT=1` nas validações compatíveis; consulte logs por trechos quando necessário.
- Selecione as verificações pela [matriz de validação](docs/WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional). `project-check` cobre documentação, SQL, diff e status; não substitui os testes do importador ou backend.
- Combine verificações para mudanças mistas, sem repetir suítes aprovadas sobre o mesmo estado. Repita quando houver falha, mudança relevante posterior ou dúvida concreta; registre limitações.
- Use `make db-schema-dump` somente quando houver motivo explícito para atualizar a evidência estrutural; o alvo não aplica migrations.
- Mantenha a conversa durante a mesma entrega e finalize com resultado, validações e pendências de forma breve. Commit e push somente quando solicitados.

## Definição de Pronto

Uma alteração está pronta quando:

- escopo implementado;
- validação executada ou limitação registrada;
- documentação relevante atualizada;
- nenhum dado sensível adicionado;
- `git status --short` revisado e limpo após commit.
