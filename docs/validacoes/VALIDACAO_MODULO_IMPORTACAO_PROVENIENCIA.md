# Validação do Módulo de Importação e Proveniência

> Evidência histórica do módulo e da execução identificados abaixo. As menções
> a estado “atual”, tabelas e quantidades pertencem à data do relatório.
> Para executar verificações hoje, consulte o [workflow](../WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional)
> e o [índice de validações](README.md); este registro não é nova homologação.

Atualizado em: 2026-07-19

## Objetivo

`tests/sql/04_validar_modulo_importacao_proveniencia.sql` valida com dados exclusivamente sintéticos `importacao_lote`, `importacao_linha` e `importacao_registro`, criadas por `sql/12_modulo_importacao_proveniencia.sql`.

## Cobertura

- Lote inicial, defaults e todos os status permitidos.
- Reprocessamento do mesmo SHA-256 e layout por FK composta.
- Bloqueio de segundo lote inicial, predecessor incompatível e autorreferência.
- Formato SHA-256 e coerência dos timestamps.
- Todos os status de linha e posições positivas.
- Array JSONB ordenado com dois cabeçalhos sintéticos repetidos.
- Preservação do responsável legado como texto.
- `UNIQUE` de linha por lote, aba e posição.
- Associação genérica N:N e ações `criado`, `atualizado` e `associado`.
- Domínios de schema, tabela, registro e ação.
- Presença dos quatro índices explícitos e ausência de índice GIN.
- FKs, `ON DELETE RESTRICT` e referências inexistentes.
- Verificação independente após `ROLLBACK`.

Não são testados importador, manifesto físico, dados reais, auditoria operacional, roles, política de retenção, transições operacionais, idempotência clínica ou existência do alvo heterogêneo.

## Execução e resultado

Pré-requisito: `sql/12_modulo_importacao_proveniencia.sql` aplicado no banco de teste.

```bash
make project-check
```

Em 2026-07-19, a migration foi aplicada sobre o schema local com 30 tabelas, elevando o total para 33. O teste isolado e a suíte completa passaram com `ON_ERROR_STOP=1`. O novo teste alcançou o `ROLLBACK`; a consulta posterior confirmou ausência de lotes, linhas e pacientes sintéticos persistidos.
