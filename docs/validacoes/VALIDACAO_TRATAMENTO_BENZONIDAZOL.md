# Validação do Tratamento com Benzonidazol

> Evidência histórica do módulo e da execução identificados abaixo. As menções
> a estado “atual”, tabelas e quantidades pertencem à data do relatório.
> Para executar verificações hoje, consulte o [workflow](../WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional)
> e o [índice de validações](README.md); este registro não é nova homologação.

Atualizado em: 2026-08-13

## Escopo

`tests/sql/07_validar_tratamento_benzonidazol.sql` valida, com dados
exclusivamente sintéticos, as tabelas criadas por
`sql/15_tratamento_benzonidazol.sql` e sua convivência com
`tratamento_chagas`.

## Resultado local

Em 2026-08-13, `make db-check` confirmou conexão em `localhost:5432`, banco
`ambulatorio_santa_casa`, usuário `ambulatorio_user` e schema `ambulatorio`. A
migration foi aplicada com `ON_ERROR_STOP=1`, elevando o schema de 35 para 37
tabelas.

O teste isolado passou nos 27 cenários especificados. O `ROLLBACK` foi executado,
e uma auditoria posterior dentro do próprio teste confirmou ausência final de
pacientes, tratamentos legados e canônicos, reações, lotes, linhas e vínculos
sintéticos persistidos.

A assinatura estrutural de `tratamento_chagas` foi
`6b8918985183806dac0b677723ba41aa` antes e depois da migration, e sua contagem de
linhas permaneceu zero. Isso confirma ausência de alteração estrutural, backfill
ou escrita automática no legado no ambiente validado.

## Cobertura dos 27 cenários

O teste cobre tratamento com e sem atendimento, consistência entre paciente e
atendimento, unicidade por paciente, booleanos triestados, motivos separados,
contradições auditáveis, duração e ano positivos, prescrição independente,
nulabilidade, FKs, `CASCADE`, `SET NULL`, reações repetíveis e parciais, textos
livres de gravidade e consequência, convivência legada, proveniência N:N,
timestamps, catálogo de constraints e índices, `ROLLBACK` e auditoria final.

## Limites

O teste não implementa importador, manifesto, reconciliação entre linhas reais,
domínios clínicos, backfill, escrita dupla, visão unificada ou migração do legado.
