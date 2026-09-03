# Validação dos Exames por Paciente

Atualizado em: 2026-08-06

## Escopo

`tests/sql/06_validar_exames_por_paciente.sql` valida, com dados exclusivamente
sintéticos, a tabela `ambulatorio.paciente_exame_complementar` e a consistência
composta criada por `sql/14_exames_por_paciente.sql`.

## Cobertura

O teste cobre os 22 cenários aprovados em
`docs/arquitetura/ESPECIFICACAO_EVOLUCAO_EXAMES_COMPLEMENTARES.md`: paciente obrigatório,
atendimento opcional e consistente, multiplicidade, blocos independentes, tipos
catalogados e livres, textos originais, nulabilidade, FKs, regras `ON DELETE`,
timestamps, catálogo físico, convivência legada, proveniência, ausência de
unicidade indevida, ausência de backfill e auditoria posterior ao `ROLLBACK`.

## Resultado local

Em 2026-08-06, a migration foi aplicada com `ON_ERROR_STOP=1` sobre o schema
local de 34 tabelas, elevando-o para 35. O teste isolado e a suíte completa
passaram. A auditoria posterior confirmou ausência de pacientes, exames, lotes,
linhas e resultados sintéticos persistidos.

As assinaturas estruturais das tabelas legadas
`atendimento_exame_complementar` e `exame_complementar_resultado` permaneceram
idênticas. A tabela `atendimento` recebeu somente a constraint
`uq_atendimento_id_paciente`, prevista para suportar a FK composta.

## Limites

O teste não implementa nem valida importador, manifesto, aliases automáticos,
resultados numéricos, unidades clínicas, datas sem fonte ou migração de dados
legados.
