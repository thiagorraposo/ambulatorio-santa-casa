# Validação técnica de 7D-A1 — percurso integrado pela interface

Data: 2026-10-27. Resultado: **cenário integrado positivo e confirmação única
validados tecnicamente em ambiente sintético**. Aceite da equipe clínica/produto
permanece pendente.

## Percurso exercitado

O Playwright percorreu pela interface a busca por nome, escolha explícita de
nenhuma correspondência, cadastro do paciente, atendimento nas cinco etapas e
revisão/confirmar, tratamento BZN com reação, retorno efetivo, encaminhamento,
contrarreferência, resolução de pendência, releitura do histórico e criação de
notificação para o mesmo paciente. Paciente e atendimento foram criados pela
interface; helpers foram usados para autenticação, catálogos e releituras.

Antes da confirmação do atendimento não houve POST. Após confirmar houve um
POST, com releitura de um atendimento e dos acompanhamentos ligados ao mesmo
ID. O teste também verificou oito intenções distintas, incluindo a notificação.
Um E2E separado acionou dois cliques sincronamente na confirmação e verificou
um único POST e uma única consulta persistida.

IDs sintéticos emitidos pela API neste percurso: paciente `9007199254760726`,
atendimento `22`, notificação `2`.

## Evidências executadas

- `cd frontend && npm run build` — passou.
- `cd frontend && npm run test:unit` — 204/205 passaram; um teste de
  `operation.test.tsx` não observou a função de hash sob concorrência. A
  reexecução isolada do arquivo passou 9/9, sem mudança de expectativa/código.
- `tests/frontend/test_e2e.sh --grep '7D-U2: cliques repetidos|cadastro → atendimento composto'`
  — 2 cenários passaram, zero retries/skip, um worker; relatório local
  `/tmp/etapa6-frontend-xvPtud/results.json`.
- `make docs-check COMPACT=1`, `make repository-check COMPACT=1` e
  `git diff --check` — passaram após atualizar os documentos desta entrega.
- CI remoto do PR #15: Quality, Database, Backend e Frontend aprovados no run
  [`40442560575`](https://github.com/thiagorraposo/ambulatorio-santa-casa/actions/runs/40442560575).
- As regressões de 403, 409 e perda de resposta já existentes foram exercitadas
  pela suíte completa do PR #13 e pela execução pós-merge na `main`; ambas
  passaram nos quatro jobs. Entre elas: revogação antes da escrita, resposta
  perdida após commit do atendimento, conflito de acompanhamento e troca de
  identidade durante escrita. O conteúdo final do PR #15 passou nos quatro jobs
  no run `40443651122` e foi integrado em `c496615`. O pós-merge
  `40444653135` revelou falha de limpeza de processos em Quality, tratada
  separadamente no [relatório do CI](VALIDACAO_CI_2026_10_26.md).

O SQL-alvo foi confirmado com
`SELECT current_database(), current_user, inet_server_port()` como
`postgres|ambulatorio_ci|5432` em container PostgreSQL recém-criado, publicado
em 55459 e com armazenamento `tmpfs`. O runner aplicou migrations somente ao
banco aleatório próprio e removeu banco/login/fixture ao terminar. Nenhum banco
persistente ou dado real foi usado.

Na primeira execução, o cenário terminou em `ReferenceError: visitByLink is not
defined`; a importação faltante do helper de navegação foi corrigida. Os dois
cenários foram então repetidos e passaram.

## Limites e decisões abertas

Este resultado técnico não é aceite clínico nem conclusão de M2. Os casos de
403/409/resposta perdida são provas focadas separadas, não injetadas na mesma
jornada positiva. A jornada não altera semântica de PUT, versão/concorrência ou
revisão de pendências; essas decisões P-03 permanecem abertas. Projetos e seus
PUT têm regressão 7C própria, não são criados novamente nesta jornada. Comparação
visual final e revisão com a equipe continuam necessárias.
