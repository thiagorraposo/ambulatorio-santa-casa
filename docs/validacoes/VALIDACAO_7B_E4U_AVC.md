# Interface longitudinal AVC — recorte E4U

2026-11-01, base3788696, Janela1, branch feat/m3-janela-1-eventos.
Implementada; fluxo funcional validado tecnicamente. Comparação visual renderizada
com a referência e aceite humano pendentes; não conclui o agregado E4U.

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
