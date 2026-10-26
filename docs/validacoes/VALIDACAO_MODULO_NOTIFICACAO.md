# Validação do Módulo de Notificação

> Evidência histórica do módulo e da execução identificados abaixo. As menções
> a estado “atual”, tabelas e quantidades pertencem à data do relatório.
> Para executar verificações hoje, consulte o [workflow](../WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional)
> e o [índice de validações](README.md); este registro não é nova homologação.

Atualizado em: 2026-07-19

## Objetivo

`tests/sql/03_validar_modulo_notificacao.sql` valida com dados exclusivamente sintéticos a tabela `notificacao`, criada por `sql/11_modulo_notificacao.sql`.

## Cobertura

- Inserção das cinco combinações permissivas previstas na especificação.
- Aceitação de campos opcionais nulos e preservação dos valores originais.
- Preenchimento dos defaults de `criado_em` e `atualizado_em`.
- Aceitação do mesmo `numero_notificacao` para pacientes diferentes.
- Existência do índice não único `idx_notificacao_numero_notificacao`.
- Rejeição de segundo registro do mesmo paciente por `UNIQUE(paciente_id)`.
- Rejeição de paciente inexistente pela FK.
- `ON DELETE CASCADE` a partir de `paciente`.
- Consulta independente após o `ROLLBACK` para confirmar ausência de dados sintéticos persistidos.

Não são testadas regras sanitárias, normalização de dados reais, importação, histórico de transmissões, performance, permissões ou regras condicionais não especificadas.

## Execução e resultado

Pré-requisito: `sql/11_modulo_notificacao.sql` aplicado no banco de teste.

```bash
make project-check
```

Em 2026-07-19, a migration foi aplicada sobre o schema local com 29 tabelas, elevando o total para 30. O teste isolado e a suíte completa passaram com `ON_ERROR_STOP=1`; o novo teste alcançou o `ROLLBACK` e a verificação posterior confirmou ausência de pacientes e notificações sintéticos persistidos.
