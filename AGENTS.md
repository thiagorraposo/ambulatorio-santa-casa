# AGENTS.md

Regras permanentes para agentes trabalhando neste repositório.

## Objetivo

O projeto `ambulatorio-santa-casa` implementa, por fases, a base PostgreSQL para organizar dados do ambulatório, com foco inicial no núcleo físico validado antes de importação completa, API e frontend.

## Estrutura Relevante

- `sql/`: scripts SQL e futuras migrations incrementais.
- `tests/sql/`: testes SQL reutilizáveis, com dados sintéticos.
- `docs/`: documentação técnica, decisões, validações e workflow.
- `docs/evidencias/schema_atual_ambulatorio.sql`: principal evidência do schema físico aplicado.

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
- Toda mudança deve definir como será validada.
- Não execute comandos destrutivos sem autorização explícita.

## Definição de Pronto

Uma alteração está pronta quando:

- escopo implementado;
- validação executada ou limitação registrada;
- documentação relevante atualizada;
- nenhum dado sensível adicionado;
- `git status --short` revisado e limpo após commit.
