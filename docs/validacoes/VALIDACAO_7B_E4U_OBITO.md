# Interface de óbito — recorte E4U

2026-11-01, Janela 1, backend fa2329d. Recorte inicial consolidado VALIDADO
TECNICAMENTE; agregado E4U e aceite humano permanecem separados.
[Contrato](../arquitetura/CONTRATO_EVENTOS_7B_E4B.md).

Leitura/criação única por paciente, indicador triestado, data completa opcional,
causa e observações independentes. Positivo não obriga data/causa; negativo não
apaga texto/data. Não infere causa, vínculo a atendimento ou bloqueio de cuidados.
Revisão dos quatro campos, rascunho, recibo e retorno à consulta de origem.
Estado existente não oferece nova criação; perfil consulta somente lê.

Build e 263 testes unitários passaram: /tmp/ambulatorio-check-lrb58of6/output.log.
Dois E2E reais passaram: /tmp/m3-obito-ui-e2e.log, artefatos
/tmp/etapa6-frontend-q8g3NE. Cenários: positivo sem data/causa, revisão,
COMMIT perdido recuperado sem novo POST, releitura do JSON, negativo com data
2026-02-01 e causa literal, rascunho, retorno exato e consulta/rota direta sem
escrita. Axe sem violações e sem overflow horizontal em 320/390/1440.
88 E2E cadastrados; executados estes dois, preservando evidência anterior sem
repetir toda a suíte. Backend/SQL inalterados desde fa2329d.
Ambiente PostgreSQL16.15 tmpfs localhost55457; runner próprio com02–71, dados
sintéticos. Nenhum acesso ao banco persistente. Logs /tmp são temporários.

Referência original renderizada em cópia local: login sintético → paciente
sintético → novo atendimento → preencher data → seção6 → Óbito Sim em desktop
→ redimensionar. NewAppointment.tsx SHA256
caaa200638539ce8a929061462ded9ce056aa1efab00b309ee01e0f6e9708ccb,
mesma origem da comparação AVC. Capturas não representam armazenamento no protótipo.

| Viewport | Referência | Produto |
| --- | --- | --- |
| 1440×960 | [Original](../frontend/visuais/obito-referencia-1440.png) | [Atual](../frontend/visuais/obito-formulario-1440.png) |
| 390×844 | [Original](../frontend/visuais/obito-referencia-390.png) | [Atual](../frontend/visuais/obito-formulario-390.png) |
| 320×844 | [Original](../frontend/visuais/obito-referencia-320.png) | [Atual](../frontend/visuais/obito-formulario-320.png) |

Comparação dirigida: referência agrupa eventos num wizard por atendimento;
produto preserva contrato longitudinal por paciente. Seletor triestado substitui
rádios; data/causa independentes, observações, revisão e recibo acrescentam os
estados persistentes. A referência móvel sobrepõe navegação e conteúdo; o produto
mantém controles acessíveis. Densidade, tipografia e cartões diferem e aguardam
homologação8V1. Não declarar fidelidade integral, aceite humano ou suporte a
precisão parcial: data sem dia/mês continua bloqueada por contrato específico.
Reproduzir com tests/frontend/test_e2e.sh obito.spec.ts em PostgreSQL descartável;
referência conforme roteiro acima. Capturas versionadas exclusivamente sintéticas.

Revisão final preservou os dois links de dispositivos/óbito no atendimento.
Build final aprovado em /tmp/ambulatorio-check-ibr75va9/output.log; regressão
proporcional de integração obito.spec.ts + dispositivos.spec.ts:4/4 E2E em
/tmp/m3-obito-ui-integracao.log, artefatos /tmp/etapa6-frontend-hEr9g0.
