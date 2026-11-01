# Avaliação de comorbidades por atendimento — 7B-E3B.2

Data: 2026-11-01. Base `82dbccf`, branch `feat/continuidade-m2-condicao`.
Implementada e validada tecnicamente; decisões adotadas por delegação explícita
do responsável, sem registrar aceite humano. [Contrato](../arquitetura/CONTRATO_COMORBIDADES_7B_E3B.md).

## Ambiente e escopo

PostgreSQL 16 exclusivo `ambulatorio-comorbidades-20261101`, tmpfs, localhost
55469; identidade `postgres|ambulatorio_ci|5432` e armazenamento confirmados antes
do SQL00. Bases descartáveis próprias dos runners; base sintética nominal para
SQL. Nenhuma migration/gravação no persistente, dado real ou deploy.

SQL68 cria tabelas de snapshot/itens, captura prospectiva, resolução e guard
contra revisão temporal. GET/POST autenticados com vínculo e contexto validado,
triestado explícito, família não avaliada distinta de desconhecida, textos
literais, nome congelado, catálogo ativo, limite de 100 e criação única 409.
Filhos, autoria e recibo UUID/hash no mesmo COMMIT, sem inferir diagnóstico.

## Validações e limites

- `make backend-clinical-test db-comorbidades-upgrade-test backend-build backend-unit-test COMPACT=1`:
  101 HTTP/16 suítes, build e 182 unitários/20 suítes aprovados. Upgrade 67→68
  preserva legado e definição/segurança da captura compartilhada, sem backfill.
  Log `/tmp/ambulatorio-check-zwce3ctc/output.log`.
- Novo teste de limite adicionado depois: runner clínico focado passou 9/9,
  incluindo leitura dos 100 itens. Total vigente 102 HTTP, validado na união da
  suíte de 101 e da rodada focada, sem alegar suíte completa repetida de 102.
  Log `/tmp/comorbidades-http-limite-20261101.log`.
- `make db-test COMPACT=1` com DB_* explícitos em 55469 passou os 38 scripts
  anteriores. SQL40 inicialmente falhou porque a fixture usava hash sintético
  incompatível com o CHECK existente. Corrigido somente o hash da fixture;
  SQL40 passou isoladamente. Total 39 scripts válidos na composição.
  Logs `/tmp/comorbidades-sql-20261101.log` e
  `/tmp/ambulatorio-check-22dmi_d_/output.log`.
- HTTP novo prova autorização/revogação, duas consultas, concorrência 201/409,
  família independente, dados inválidos e catálogo inativo, nome preservado,
  recuperação da intenção e rollback de cabeçalho/primeiro filho/auditoria se o
  segundo filho falhar. GET ausente usa JSON null explícito, como condição Chagas.

Fundação 8 e frontend 256/76 da baseline foram preservados, não repetidos nesta
camada. Nenhum frontend novo é declarado validado aqui. Importador não mudou;
upgrade confirma preservação do legado, e HTTP de importação da suíte passou.
CI remoto, aceite humano, revisão/correções e implantação persistente separados.
Logs temporários podem desaparecer; banco sintético encerrado ao final da sessão.
