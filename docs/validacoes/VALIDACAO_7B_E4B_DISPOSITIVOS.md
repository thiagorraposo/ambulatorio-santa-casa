# Marcapasso/CDI — recorte inicial E4B

2026-11-01, Janela1, base6e089ae, branch feat/m3-janela-1-eventos.
[Contrato](../arquitetura/CONTRATO_EVENTOS_7B_E4B.md). Backend implementado e validado tecnicamente. Fundação8/8 e suíte HTTP completa
115/115 (18 suítes) aprovadas em /tmp/ambulatorio-check-vtk6aptt/output.log,
com DB_*/APP_DB_* explícitos em127.0.0.1:55457 e base m3_dispositivos_validacao.
Alvos backend-foundation-e2e/backend-clinical-test COMPACT=1, Docker-wait marcado
como atendido somente após identificação manual do destino próprio.
Interface/aceite humano e agregado E4B permanecem separados.

PostgreSQL16.15 tmpfs exclusivo ambulatorio-avc-interacoes-20261101 em
localhost55457, identidade/armazenamento previamente confirmados, base nova
m3_dispositivos_validacao com SQL02–70. Runners HTTP/upgrade usam bases próprias.
Nenhum dado real, acesso/migration no persistente, push ou deploy.

Build e184 unidades passaram em /tmp/ambulatorio-check-taxx2ux0/output.log.
Cinco HTTP focados passaram em /tmp/m3-dispositivos-http-focado.log: triestado,
texto literal/autoria3campos, 409 sem sobrescrita, tipos não aprovados recusados,
isolamento/RBAC/paginação, concorrência com dois UUIDs e estados confirmada/
nao_aplicada, recibo/replay e falha SQL revertendo registro/captura/recibo.

41 scripts SQL completos, upgrade69→70, importador completo e31 workflow
passaram em /tmp/ambulatorio-check-d1gyq_y2/output.log. Upgrade compara legado
integral, ACL tabela/sequência e definição/segurança da captura; zero backfill,
primeira mudança posterior preserva marco_atual. SQL42 comprova os três campos
ativos e guard temporal específico. Nenhum teste existente foi enfraquecido.

SQL70 não concede nem revoga privilégios anteriores e não reescreve gatilhos,
resolver ou captura. Criação é apenas inicial; atualização de estado consolidado
continua fora da API publicada. Resincronizador não foi incluído por suposição.
Não houve falha nesta rodada focada/SQL. Logs /tmp podem desaparecer.
