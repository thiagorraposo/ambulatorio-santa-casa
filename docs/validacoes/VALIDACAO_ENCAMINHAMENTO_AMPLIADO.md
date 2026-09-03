# Validação do Encaminhamento Ampliado

Atualizado em: 2026-08-13

## Escopo

`tests/sql/08_validar_encaminhamento_ampliado.sql` valida, com dados
exclusivamente sintéticos, a alteração incremental de `encaminhamento` criada por
`sql/16_encaminhamento_ampliado.sql`.

## Procedimento

1. confirmar banco, usuário e schema com `make db-check`;
2. registrar contagem de tabelas, linhas legadas e assinatura das migrations
   anteriores;
3. aplicar a migration com `psql -X ... -v ON_ERROR_STOP=1`;
4. executar isoladamente o teste com `ON_ERROR_STOP=1`;
5. confirmar o `ROLLBACK` e a ausência de dados sintéticos;
6. atualizar a evidência com `make db-schema-dump`;
7. executar `make project-check` e `git diff --check`.

## Cobertura dos 23 cenários

O teste cobre `TRUE`, `FALSE` e `NULL` para documento apresentado; valores
originais; projeto opcional; BenBrasil e EPOCA distintos; vários encaminhamentos
por atendimento e por projeto; FKs inválidas; `ON DELETE RESTRICT` do projeto;
`ON DELETE CASCADE` do atendimento; paciente determinado sem coluna redundante;
coexistência com associações de projeto; registro legado sem preenchimento dos
campos novos; timestamps; catálogo de colunas, FK e índice parcial; ausência de
nova `UNIQUE`; proveniência em `importacao_registro`; ausência de alteração de
contrarreferência; `ROLLBACK` e auditoria final.

## Resultado local

Em 2026-08-13, a primeira execução de `make db-check` falhou porque o sandbox
bloqueou a conexão local (`Operation not permitted`). Sem criar ou alterar banco,
usuário ou schema, a execução autorizada fora do sandbox confirmou
`localhost:5432`, banco `ambulatorio_santa_casa`, usuário `ambulatorio_user` e
schema `ambulatorio`.

A migration foi aplicada com `ON_ERROR_STOP=1`. O teste isolado aprovou os 23
cenários, alcançou o `ROLLBACK` e confirmou que nenhum paciente, projeto, lote ou
registro sintético permaneceu. Auditoria independente confirmou zero pacientes
de validação e zero encaminhamentos no ambiente, mesma contagem anterior à
migration.

O schema permaneceu com 37 tabelas. As quatro colunas estão anuláveis e sem
default; `encaminhamento_pkey` foi preservada; `fk_encaminhamento_atendimento`
continua com `ON DELETE CASCADE`; `fk_encaminhamento_projeto` usa
`ON DELETE RESTRICT`; o índice parcial foi encontrado; e não existe constraint
`UNIQUE` em `encaminhamento`.

Os hashes SHA-256 dos arquivos `sql/00_criar_banco.sql` a
`sql/15_tratamento_benzonidazol.sql` permaneceram iguais aos registrados antes da
implementação. A tabela estava sem linhas antes da migration; portanto não havia
conteúdo legado real a transformar, e o teste comprovou que uma linha criada sem
os campos novos permanece com todos eles nulos.

`make db-schema-dump`, `make project-check` e `git diff --check` passaram. O
`project-check` executou os oito testes SQL e todos alcançaram seus respectivos
`ROLLBACK`s.

## Limites

O teste não implementa importador, aliases, dedução ou criação de projeto,
backfill, escrita dupla, tabela paralela, contrarreferência ou regras clínicas.
