# Interface de reação isolada BZN — 7C-E1U, recorteE1.2

2026-11-01, Janela1, backend631ebc4. Recorte VALIDADO TECNICAMENTE;
E1.1 correção canônica, agregadoE1U e aceite humano separados.
[Contrato](../arquitetura/CONTRATO_REACOES_BZN_7C_E1B.md).

Lista paginada e formulário de cinco campos, revisão, rascunho/descarte, recibos
de múltiplas intenções, contexto do tratamento existente e retorno exato à ficha,
inclusive paginação. Gravidade/consequência literais; indicador do tratamento
não é alterado. Consulta não oferece criação, rota direta bloqueada, ausência de
tratamento informa requisito e não cria pai. Novo tipo de resposta preserva o
contrato antigo das reações embutidas em H8, sem confundir seus formatos.

Build final aprovado: /tmp/ambulatorio-check-_0xnt4fe/output.log.
Unitários:264/265 passaram na rodada /tmp/ambulatorio-check-w7dwc6e4/output.log;
teste existente de cancelamento de hash falhou por timeout de finishHash.
Arquivo isolado operation.test.tsx:9/9 em /tmp/m3-reacoes-ui-operacao-reteste.log.
Após ajuste do retorno exato,42/42 nos três arquivos afetados de ficha,
acompanhamento e modelo em /tmp/m3-reacoes-ui-integracao-unit.log. Cobertura
composta dos265 casos; não afirmar rodada integral265/265. Falhas iniciais de
build (colisão de nome DTO/import Link) corrigidas antes das provas finais.

Dois E2E reais passaram em /tmp/m3-reacoes-ui-e2e.log: descrição obrigatória/foco,
cinco campos, rascunho, Axe/fit320/390/1440, revisão com foco, COMMIT perdido
recuperado sem repetir POST, dois recibos/IDs, canônico integral intocado,
21 ocorrências pela API paginadas20/1, consulta e ausência de pai. Ajuste posterior
preservou URL completa de origem; primeiro cenário repetido e aprovado em
/tmp/m3-reacoes-ui-e2e-retorno.log, artefatos /tmp/etapa6-frontend-8D86lq.
92 E2E cadastrados; sem repetir a baseline integral. PostgreSQL16.15 tmpfs,
localhost55457, runner02–72 e dados exclusivamente sintéticos. Backend/SQL
inalterados desde631ebc4, sem acesso persistente. Logs /tmp voláteis.

Referência original realmente renderizada: login sintético → paciente sintético
→ novo atendimento → preencher data → seção9 Medicamentos e BZN. Fonte
NewAppointment.tsx, SHA256caaa200638539ce8a929061462ded9ce056aa1efab00b309ee01e0f6e9708ccb.
A seção mostra uso/indicação/tempo/prescrição, mas não contém formulário de reação,
nem mesmo no ramo positivo do código. Captura prova o módulo acessível, não uma
comparação campo a campo da extensão inexistente na referência.

| Viewport | Referência do módulo | Formulário implementado |
| --- | --- | --- |
|1440×960|[Original](../frontend/visuais/reacao-bzn-referencia-1440.png)|[Atual](../frontend/visuais/reacao-bzn-formulario-1440.png)|
|390×844|[Original](../frontend/visuais/reacao-bzn-referencia-390.png)|[Atual](../frontend/visuais/reacao-bzn-formulario-390.png)|
|320×844|[Original](../frontend/visuais/reacao-bzn-referencia-320.png)|[Atual](../frontend/visuais/reacao-bzn-formulario-320.png)|

Extensão segue componentes acessíveis existentes, recurso longitudinal e contrato
SQL15. Cartões/densidade e navegação diferem do wizard; não foi declarada fidelidade
integral8V1, referência específica de reação ou aprovação humana.
Reprodução: runner reacoes-bzn.spec.ts e roteiro da referência acima.
