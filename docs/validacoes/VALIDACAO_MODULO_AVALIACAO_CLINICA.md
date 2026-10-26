# Validação do Módulo de Avaliação Clínica

> Evidência histórica do módulo e da execução identificados abaixo. As menções
> a estado “atual”, tabelas e quantidades pertencem à data do relatório.
> Para executar verificações hoje, consulte o [workflow](../WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional)
> e o [índice de validações](README.md); este registro não é nova homologação.

Atualizado em: 2026-07-18

## Objetivo

`tests/sql/02_validar_modulo_avaliacao_clinica.sql` valida com dados exclusivamente sintéticos as tabelas `dados_clinicos_atendimento`, `evento_clinico`, `dispositivo_implantado` e `obito` criadas por `sql/10_modulo_avaliacao_clinica.sql`.

## Cobertura

- Inserções válidas nas quatro tabelas e relacionamentos com `atendimento` e `paciente`.
- Preenchimento dos defaults de `criado_em` e `atualizado_em`.
- Preservação de valores originais em texto.
- Aceitação de dois eventos com o mesmo paciente, tipo e ano, conforme cardinalidade especificada.
- Rejeição de duplicidade por `UNIQUE` em dados clínicos, dispositivo e óbito.
- Rejeição das quatro FKs quando a referência não existe.
- Rejeição de `NULL` em `evento_clinico.tipo_evento` e `dispositivo_implantado.tipo_dispositivo`.
- `ON DELETE CASCADE` a partir de atendimento e paciente.
- Consulta independente após o `ROLLBACK` para confirmar ausência do paciente sintético.

Não são testadas regras clínicas, faixas físicas, domínio de NYHA, importação, triggers, performance ou permissões.

## Execução

Pré-requisito: `sql/10_modulo_avaliacao_clinica.sql` aplicado no banco de teste.

```bash
make project-check
```

O `Makefile` executa todos os arquivos de `tests/sql/` com `ON_ERROR_STOP=1`. O resultado esperado inclui os `NOTICE` de sucesso, a saída `ROLLBACK` e o aviso final `OK: ROLLBACK confirmado; nenhum paciente sintetico persistiu`.

## Resultado da validação de 2026-07-18

A migration foi aplicada de forma controlada no PostgreSQL local sobre o schema previamente confirmado com 25 tabelas e sem nenhuma das quatro tabelas novas. Após a aplicação, o catálogo confirmou 29 tabelas e as PKs, quatro FKs com `ON DELETE CASCADE`, três constraints `UNIQUE` e obrigatoriedades declaradas pelo módulo.

- Os dois testes SQL foram executados com `ON_ERROR_STOP=1`.
- Todos os cenários positivos e negativos descritos neste documento foram aprovados.
- O novo teste alcançou o `ROLLBACK`.
- A consulta executada depois do `ROLLBACK` confirmou que nenhum paciente sintético persistiu.
- `git diff --check` foi aprovado.
- Uma consulta independente após os testes retornou zero pacientes com os identificadores ou nomes sintéticos usados pelas validações.
- `make db-schema-dump` atualizou `docs/evidencias/schema_atual_ambulatorio.sql` com as quatro novas tabelas e respectivas estruturas.
