# Validação da Associação Paciente–Projeto

Atualizado em: 2026-08-06

## Escopo

`tests/sql/05_validar_associacao_paciente_projeto.sql` valida, com dados
exclusivamente sintéticos, a tabela `ambulatorio.paciente_projeto_estudo` criada
por `sql/13_associacao_paciente_projeto.sql`.

## Cobertura

O teste cobre os 17 cenários aprovados na especificação: cardinalidades N:N,
coexistência de BenBrasil e EPOCA, variantes de falha nos projetos principais,
preservação de estados, descrições e valores originais, booleanos triestados,
combinações contraditórias, `UNIQUE`, `NOT NULL`, FKs, regras `ON DELETE`,
timestamps, convivência com `atendimento_projeto_estudo`, proveniência N:N
reutilizando a associação consolidada e catálogo de constraints e índice.

O script inicia com `BEGIN`, termina com `ROLLBACK` e executa uma verificação
independente posterior para confirmar que pacientes, lote e vínculo antigo
sintéticos não persistiram.

## Resultado local

Em 2026-08-06, a migration foi aplicada com `ON_ERROR_STOP=1` sobre o schema
local de 33 tabelas, elevando-o para 34. O teste isolado e a suíte completa
passaram. A consulta posterior ao `ROLLBACK` confirmou ausência de dados
sintéticos persistidos.

`atendimento_projeto_estudo` permaneceu estruturalmente intacta. Não houve
backfill, migração de vínculos antigos, criação de projetos de falha ou
implementação de regras do importador.

## Limites

O teste não valida mapeamento de aliases, precedência, reconciliação de conflitos
ou importação real. Essas regras permanecem fora desta migration.
