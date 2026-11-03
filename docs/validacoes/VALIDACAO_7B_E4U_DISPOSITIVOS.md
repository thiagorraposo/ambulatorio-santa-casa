# Interface de marcapasso/CDI — recorte E4U

2026-11-01, Janela1, base8aeeace. Implementada e validada tecnicamente no
recorte de leitura/criação inicial; agregado E4U e aceite humano separados.
[Contrato](../arquitetura/CONTRATO_EVENTOS_7B_E4B.md).

Lista dos dois tipos suportados por paciente, sem afirmar implante/consulta.
Formulário de tipo obrigatório, presença triestado e observações independentes;
revisão, rascunho/recibos, retorno exato, perfil consulta e criação inicial sem
substituir legado. Após ambos registrados, lista não oferece nova criação.
Nenhuma escrita de ressincronizador ou correção de estado foi publicada.

Build/262 unidades passaram em /tmp/ambulatorio-check-gxbrod9i/output.log.
Dois E2E reais passaram em /tmp/m3-dispositivos-ui-e2e.log, artefatos
/tmp/etapa6-frontend-Wf9Pww: tipo obrigatório/foco, rascunho ao retornar, três
campos revisados, negativa/texto literal, dois tipos/null sem sobrescrita,
dois recibos, COMMIT perdido recuperado sem POST repetido e consulta só lê,
inclusive rota direta de criação. Axe sem violações e fit em320/390/1440.
86 E2E cadastrados; baseline anterior não repetida integralmente.
Backend/SQL reutilizados de8aeeace sem mudança. Ambiente: PostgreSQL16.15 tmpfs
exclusivo localhost55457, runner próprio02–70; nenhuma conexão ao persistente.

Referência original renderizada na mesma cópia/hash de NewAppointment.tsx
registrada na comparação AVC: login sintético → pessoa sintética → novo
atendimento → preencher data → seção6 → Marcapasso Não. Clicar em desktop e
redimensionar, sem forçar controles sobrepostos em mobile. Produto usa pessoa
sintética distinta e estado Marcapasso Não; comparar controles/layout, não IDs.

| Viewport | Referência | Produto |
| --- | --- | --- |
| 1440×960 | [Original](../frontend/visuais/dispositivo-referencia-1440.png) | [Atual](../frontend/visuais/dispositivo-formulario-1440.png) |
| 390×844 | [Original](../frontend/visuais/dispositivo-referencia-390.png) | [Atual](../frontend/visuais/dispositivo-formulario-390.png) |
| 320×844 | [Original](../frontend/visuais/dispositivo-referencia-320.png) | [Atual](../frontend/visuais/dispositivo-formulario-320.png) |

Diferenças: referência reúne rádios e todos os estados num wizard por consulta;
produto tem seletor de tipo/indicador e recurso consolidado por paciente, conforme
contrato. Observações/revisão/recibos acrescentam campos e estados persistentes
reais. Layout móvel evita sobreposição da referência. Densidade/tipografia/
cartões/botões diferem moderadamente e aguardam homologação visual integral8V1;
não há aceite visual humano nem fidelidade integral presumidos. A comparação
não inclui os demais EVT, nem prova de armazenamento pelo protótipo.
Reprodução: runner com dispositivos.spec.ts; referência conforme roteiro acima.
Capturas sintéticas versionadas; demais logs /tmp são temporários.
