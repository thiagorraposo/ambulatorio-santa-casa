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

## Continuidade técnica de 31/10/2026 e roteiro de aceite M2

Base `ff5be94`, branch `feat/continuidade-m2-condicao`. O percurso integrado
existente passou novamente (7,4 s), assim como confirmação única com dois cliques
(1,6 s), remoção de coleções (5,8 s) e percurso de histórico U3.3. Artefatos
`/tmp/etapa6-frontend-gwaZ0L`, log `/tmp/ambulatorio-m2-validation.log`.
Anotação de IDs da jornada: paciente `9007199254831389`, atendimento `23`,
notificação `2`; o teste releu os acompanhamentos ligados ao mesmo atendimento.
PostgreSQL 16 exclusivo com tmpfs em localhost 55459, API 6063 e web 4178;
bancos/logins aleatórios removidos pelo runner. As falhas de outro teste nessa
rodada e suas correções estão no [relatório U4.2](VALIDACAO_7D_U4_2.md#comparação-executada-em-31102026).
As provas válidas de 401/403/409/resposta perdida citadas acima são reutilizadas;
não foram reinjetadas na jornada positiva nesta rodada.

**Estado: percurso validado tecnicamente e preparado para aceite humano; nenhum
aceite humano de M2 registrado nesta sessão.** A comparação executada de
controles U4.2 registra adaptações acessíveis e diferenças de baixa severidade;
não conclui fidelidade integral 8V1/8V2.

Usar a preparação sintética do [roteiro original](ROTEIRO_REVISAO_CLINICA_ETAPA_7.md#preparação),
mantendo o parecer de M1 separado. Uma pessoa da equipe opera e outra registra.
Não é necessário SQL para executar as tarefas abaixo. Escolher nome que contenha
“Sintético”; registrar somente IDs e observações sintéticos. Ao recarregar, novo
login é esperado; o rascunho não sobrevive à nova sessão.

| Passo de M2 | Tarefa e resultado esperado | Resultado humano / observação |
| --- | --- | --- |
| 1 — Busca/cadastro | Buscar pessoa, examinar possíveis homônimos, escolher conscientemente continuar; informar nascimento/telefone/endereço e salvar. Reconhecer nome, ID e confirmação, sem fusão automática. | Não executado pela equipe nesta sessão |
| 2 — Etapas | Abrir Novo atendimento; preencher data/observação, medida e descoberta por autorrelato, exame/familiar e pendência desconhecida. Ir e voltar sem perder valores; nenhum atendimento é salvo antes da revisão. | Não executado pela equipe nesta sessão |
| 3 — Revisão | Conferir todos os valores e desconhecidos; voltar/corrigir se necessário; confirmar uma vez. Atendimento e filhos pertencem ao mesmo contexto; mensagem distingue acompanhamento como operação separada. | Não executado pela equipe nesta sessão |
| 4 — Acompanhamentos | A partir da consulta salva, registrar BZN/reação, retorno com data efetiva, encaminhamento e contrarreferência. Cada operação tem confirmação própria; paciente e atendimento de origem permanecem corretos. | Não executado pela equipe nesta sessão |
| 5 — Pendência/notificação | Resolver pendência com data e registrar notificação. Não alterar fatos clínicos ao revisar o estado; reler os recursos confirmados. | Não executado pela equipe nesta sessão |
| 6 — Histórico | Abrir histórico, atendimento e áreas canônicas. Reconhecer IDs, datas e origem temporal; dados ausentes não são copiados de outra consulta. | Não executado pela equipe nesta sessão |
| 7 — Interação | Repetir controles por teclado em 320/390 px e zoom nativo 200%; abrir cancelamento, Escape e voltar ao campo. Verificar tabela rolável, foco visível, mensagens e reconhecimento do rascunho. | Não executado pela equipe nesta sessão |
| 8 — Falhas apresentadas | Rever com facilitador os cenários técnicos 403, 409 e resposta perdida. Usuário distingue recusa, conflito e resultado incerto; confirmação anterior permanece e não há reenvio automático. | Não executado pela equipe nesta sessão |

| Registro da sessão humana M2 | Preencher |
| --- | --- |
| Data, revisores/funções, ambiente/URL e commit | Pendente |
| Perfil e IDs de paciente/atendimento/acompanhamentos | Pendente |
| Passos aprovados, rejeitados ou não executados | Pendente |
| Problema: passo, resultado observado/esperado, severidade | Pendente |
| Parecer M2: aprovado, aprovado com pendências ou rejeitado | Pendente |
| Responsável e data do parecer | Pendente |

O facilitador deve registrar reprodução e impacto antes de devolver um defeito
para correção. Ausência de resposta/observação não equivale a aprovação.

## Aceite humano oficial de M2 — 31/10/2026

**Parecer: APROVADO.** O responsável pelo projeto confirmou expressamente nesta
conversa: “a M2 passou em todos os testes de aceite humano”. Este registro
oficializa o aceite de M2/VU1 no recorte definido no roadmap, incluindo U4.2 e
o percurso A1. Não foram informadas ressalvas nessa confirmação.

| Registro oficial | Informação disponível |
| --- | --- |
| Data do registro/parecer | 31/10/2026, confirmação nesta conversa |
| Responsável | Responsável pelo projeto; nomes/funções dos demais revisores não informados |
| Resultado dos testes | Todos aprovados, conforme declaração expressa; detalhamento por passo não fornecido |
| Ambiente disponibilizado | Demonstração sintética em `http://127.0.0.1:4182`, código `fc51390`, branch `feat/continuidade-m2-condicao`; encerrada após o parecer |
| Perfis e IDs usados pela equipe | Não informados no parecer; não se reutilizam IDs das provas automáticas como se fossem da revisão humana |
| Parecer final | M2 aprovado; M1 mantém seu aceite anterior |

A tabela de roteiro anterior preserva a fotografia da preparação, anterior a
esta confirmação. Este parecer a sucede quanto ao estado do marco, sem inventar
resultados individuais, revisores ou passos de interação não detalhados.
A aprovação de M2 não aceita as extensões de M3, 8V1/8V2, M4/M5 nem libera dados
reais. P-03 e os demais contratos ainda abertos mantêm seus limites.

O erro 400 relatado antes do parecer iniciou investigação em worktree separado
`/tmp/ambulatorio-contexto-fix-20261031`, branch
`fix/validacao-contexto-atendimento`. A hipótese de dois contextos afirmativos
foi reproduzida, mas a causa do envio específico da equipe não foi confirmada.
O patch experimental ficou preservado sem commit ou integração e não participou
do ambiente aceito. A investigação foi interrompida a pedido do responsável;
este aceite não apresenta a hipótese como causa resolvida ou correção entregue.
