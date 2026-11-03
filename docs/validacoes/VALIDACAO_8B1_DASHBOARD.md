# Validação integrada — dashboard básico8B1

03/11/2026, branch `feat/m3-janela-1-eventos`, base `e40fdeb` + diff desta unidade.
[Contrato e definições](../arquitetura/CONTRATO_DASHBOARD_8B1.md), decisões17/26
aprovadas somente para o protótipo sintético.8B1 validada tecnicamente nos quatro
indicadores; aceite humano/M3/8V1/8V2 pendentes. Gráficos e recentes pertencem8B2.

## Resultado verificável

Início e `/dashboard` consultam os quatro agregados PostgreSQL, com filtro de
datas inclusivas na URL. Pacientes distintos e pendências atuais não mudam pelo
período; consultas efetivas e lotes concluídos usam fontes temporais explícitas.
Ausência de capacidade de importações é null/“Sem permissão”, nunca zero.
Migration78 acrescenta capacidade nominal, sem concessão por perfil, com histórico
imutável/revogável e autorização adicional de cada lote. Não modifica permissões
ou endpoints legados. Schema incremental documentado no contrato/migration;
dump persistente preservado. Não há mocks de métricas, scores ou CSV inventado.

## Validação e limites

- Backend:8/8 unidades;7/7 HTTP/PG com fixture A/B/D autorizados e C oculto,
  contagens3pacientes/3consultas/2pendências; lotes2 somente com capacidade.
  Revogação, filtro, limites, vazio, parâmetros e SQL50 aprovados.
  `/tmp/ambulatorio-dashboard-http.log`.
- SQL completo:50 scripts na composição77+78 em banco limpo próprio,
  `/tmp/ambulatorio-check-wntkj_9o/output.log`. SQL49 fortalecido posteriormente
  aprovado separadamente em `/tmp/ambulatorio-check-xppyv4ak/output.log`.
- Backend build aprovado após registro de DashboardModule:
  `/tmp/ambulatorio-check-zf0ksqq2/output.log`.233 unidades backend já aprovadas
  na composição de preparação8D+8B1; não se afirma nova integral por unidade.
- Frontend build e25 unidades focadas aprovados (dashboard, navegação, App, shell).
  Reutilizados343 anteriores por composição8D; não integral nova8B1.
- E2E2/2 Chromium/API/PG em `/tmp/m3-dashboard-e2e-final.log`, dqyk9p. Fixture
  acrescenta2pacientes/2consultas/2pendências/1lote, comprova deltas conhecidos nos
  quatro indicadores, filtro, rota/menu, carga, zero autorizado, falta de capacidade
  e falha de transporte sem valor antigo. Falha de transporte simulada; métricas
  sempre consultam PostgreSQL. Primeiro runner usou dist desatualizado e recebeu404;
  recompilar o backend e repetir os dois cenários resolveu a preparação.

Comparação visual efetiva das capturas1440/390/320 com imagens oficiais versionadas
Início/Dashboard: mesma grade de quatro cards, ordem, cores azul/verde/âmbar/azul,
superfícies claras, bordas e sidebar. Adaptações explícitas: rótulos aprovados,
intervalo real por datas, definições expansíveis e fonte/atualização; cards mais
altos para contexto verificável. Menu recolhe e cards ficam em uma coluna no móvel.
Não copia gráficos fictícios nem score ou classificação de origem do protótipo.
Axe e ausência de overflow passaram. [Capturas](../evidencias/dashboard_8b1_2026_11_03/README.md).

Validação adicional8D no SHAe40fdeb:34 HTTP de usuários/perfil/estado em3 suítes
(`/tmp/m3-users-regressao-http.log`) e8 fundação (`/tmp/m3-fundacao-final.log`).
Runner de fundação direto para evitar dependência Docker do alvo Make; destino
exclusivo127.0.0.1:55464, banco `test_m3_users_final_20261103` verificado.
Nenhum banco persistente, serviço preexistente, push, merge ou deploy alterado.

Próxima unidade:8B2.1 recentes autorizados, depois8B2.2 série mensal com tabela.
