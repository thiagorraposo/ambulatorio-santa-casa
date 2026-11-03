# Interface longitudinal AVC — recorte E4U

2026-11-01, base3788696, Janela1, branch feat/m3-janela-1-eventos.
Implementada; fluxo funcional validado tecnicamente. Comparação renderizada e interações complementares executadas na continuidade
abaixo; homologação de estilo/aceite humano pendentes; não conclui o agregado E4U.

Lista paginada por paciente, quatro campos/revisão, múltiplos registros, recibos,
rascunho/descarte e retorno seguro à consulta. Rótulo longitudinal explícito,
sem snapshot por atendimento. Ano não é apagado após negativa nem infere evento.
Acesso pelo detalhe do atendimento; rotas /pacientes/:id/avcs e /nova.

Build e261 unidades passaram em /tmp/ambulatorio-check-67dad92k/output.log,
com dois testes novos de corpo/retorno. Primeiro build falhou por importação
referindo arquivo anterior; corrigida antes da rodada aprovada.
E2E real passou em /tmp/m3-avc-ui-e2e.log (/tmp/etapa6-frontend-Rs9six):
revisão dos quatro campos, negativa/ano/texto literal, persistência real,
COMMIT perdido recuperado por GET da intenção sem repetir POST, retorno exato.
Segundo E2E passou focado em /tmp/m3-avc-ui-leitura.log
(/tmp/etapa6-frontend-GDdbaA): perfil consulta, paginação20/1 e falha de leitura
sem mostrar conteúdo anterior. Total82 cenários cadastrados; baseline80 não
repetida integralmente. Axe sem violações e larguras320/390 nos estados exercitados.

PostgreSQL16.15 tmpfs exclusivo localhost55457, identidade e armazenamento
conferidos antes SQL00; runner aplica02–69 em base própria e encerra API/Vite.
Backend reutilizado de61a91be, sem repetir suas suítes sobre código inalterado.
Nenhum dado real, acesso ao persistente, push ou deploy.

Referência fonte NewAppointment.tsx SectionEventos foi consultada: usa rádio
AVC e ano condicional a sim, enquanto o contrato mantém ano independente e
triestado com informação explícita. Não foi executada a referência renderizada
nesta rodada: fidelidade visual permanece pendente em8V1/E4U, sem comparação
visual fictícia. Revisão integral de teclado/zoom/rascunho também não é declarada
por associação aos dois cenários novos. Logs /tmp são temporários.

## Continuidade — comparação renderizada e interações, 01/11

Referência executada em cópia isolada /tmp/ambulatorio-m2-reference-HqCa0h,
Vite8445. SHA256 NewAppointment.tsx tanto no versionado quanto na cópia:
`caaa200638539ce8a929061462ded9ce056aa1efab00b309ee01e0f6e9708ccb`.
Chromium pt-BR/America-Sao_Paulo, fontes HTTPS bloqueadas/fallback local;
fixture do protótipo exclusivamente sintética. Login de demonstração → Pacientes
→ Paciente Sintético001 → Novo atendimento → data2026-04-12 → seção6.
Selecionar Sim e ano2020; depois Não em desktop e capturar os mesmos viewports.
Em320, tentativa normal de clicar Não foi interceptada pela navegação da própria
referência; nenhum force-click foi usado para simular operabilidade.

Produto: pessoa sintética criada pela API → detalhe da consulta → AVC longitudinal,
ano2020/negativa/descrição sintética, rascunho retomado. Valores e IDs de fixture
não são idênticos; comparação de organização/controles, sem equivalência clínica
entre wizard do protótipo e recurso longitudinal. Capturas inspecionadas:

| Viewport/estado | Referência | Produto |
| --- | --- | --- |
| 1440×960 negativa | [Original](../frontend/visuais/avc-referencia-negativa-1440.png) | [Atual](../frontend/visuais/avc-formulario-1440.png) |
| 390×844 negativa | [Original](../frontend/visuais/avc-referencia-negativa-390.png) | [Atual](../frontend/visuais/avc-formulario-390.png) |
| 320×844 negativa | [Original](../frontend/visuais/avc-referencia-negativa-320.png) | [Atual](../frontend/visuais/avc-formulario-320.png) |
| Revisão em zoom200% | Estado sem equivalência direta | [Atual](../frontend/visuais/avc-revisao-zoom200.png) |

| Diferença objetiva | Severidade/decisão |
| --- | --- |
| Referência320 sobrepõe navegação aos controles e impede clique normal | Alta na referência; produto conserva layout móvel aprovado/acessível e sem overflow nos cenários; não reproduzir defeito |
| Rádio Sim/Não/Não informado versus select rotulado com desconhecido explícito | Adaptação acessível dos componentes existentes; sem novo significado clínico. Homologação visual integral permanece aberta em8V1 |
| Ano some após Não no protótipo; produto mantém ano/descrição | Adaptação obrigatória ao contrato longitudinal independente, RQ-EVT-01/02; não apagar informação nem inferir ocorrência |
| Wizard por consulta versus recurso longitudinal com contexto/voltar/revisão | Contrato aprovado do módulo SQL10 prevalece; não inventar vínculo persistido de atendimento |
| Tipografia, densidade, cartões aninhados e disposição dos botões diferem | Diferença visual moderada; composição reutiliza componentes do produto. Fechamento visual humano/8V1 pendente; sem alegar fidelidade integral |

Novo E2E passou em /tmp/m3-avc-interacoes.log, artefatos
/tmp/etapa6-frontend-eFu8E9. Prova teclado do seletor, ano preservado com Não,
rascunho ao sair/retornar, Escape/foco no descarte, foco da revisão, Axe sem
violações em1440/390/320 e zoom CSS200%, duas intenções com UUIDs distintos,
dois recibos preservados e releitura real false/2020 versus null/2021.
Total84 E2E cadastrados; só o novo cenário foi executado nesta continuidade.
Testes anteriores permanecem válidos sobre código inalterado. Não houve mudança
na implementação, aceite humano ou encerramento dos demais EVT.

Reprodução produto: executar o runner sintético com avcs-interacoes.spec.ts;
referência: usar cópia da fonte com lockfile, Vite local, navegação/estados acima.
Os passos usam exclusivamente fixtures sintéticas; capturas não provam por si
só persistência, que tem os testes HTTP/E2E já vinculados.
