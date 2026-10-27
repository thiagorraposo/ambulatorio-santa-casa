# Validação técnica de 7D-U1/U2 — etapas e revisão do atendimento

Data: 2026-10-26. Resultado: **validação técnica aprovada nos cenários
registrados**. Aceite de produto/equipe permanece pendente.

## Alteração

O formulário de criação foi dividido nas cinco etapas aprovadas: Atendimento,
Avaliação e Chagas, Exames e familiares, Pendências e Revisão. A navegação
preserva o rascunho; validações de campo e do payload composto retornam à etapa
correspondente. A revisão resume os dados e filhos e só então exibe a
confirmação única. Cancelar oferece decisão explícita e não grava. O recibo
confirmado continua separado de acompanhamentos posteriores.

Não houve mudança de schema, API, regra clínica ou semântica de concorrência dos
PUT de projeto/notificação ou de revisão de pendências.

## Evidências executadas

- `cd frontend && npm run build` — passou (TypeScript e build Vite).
- `cd frontend && npm run test:unit` — 22 arquivos e 205 testes passaram.
- `make backend-build COMPACT=1` — passou para o runner integrado.
- Playwright em PostgreSQL descartável: jornada integrada pela interface
  cadastro → atendimento → acompanhamento → histórico e cenário composto com
  revisão/validação passaram (2 cenários selecionados).
- Playwright em PostgreSQL descartável: cancelamento sem escrita, resposta
  perdida após commit sem reenvio, conflito no acompanhamento preservando o
  atendimento confirmado e resposta antiga após troca de identidade passaram
  (4 cenários selecionados).
- `make docs-check COMPACT=1`, `make repository-check COMPACT=1` e
  `git diff --check` — passaram após atualizar a documentação nesta branch.

Os E2E criaram apenas bancos e usuários sintéticos aleatórios pelo runner
`tests/frontend/test_e2e.sh`; migrations 02–64 foram aplicadas apenas no banco
efêmero. Antes da suíte de regressão, o destino foi confirmado com
`SELECT current_database(), current_user, inet_server_port()` como
`postgres|ambulatorio_ci|5432`, no container recém-criado e porta publicada
55459. O diretório do runner não guarda a fixture após finalizar. O container
dedicado foi parado ao fim da execução. Nenhuma base persistente foi utilizada.

## Limites

Esta validação não conclui 7D-U4.2, não repete a auditoria completa de U3/U4.1 e
não demonstra todos os critérios da validação integrada 7D-A1. Os testes
selecionados verificam cenários positivos e de recuperação, mas não equivalem
ao aceite da equipe clínica/produto nem à homologação operacional.
