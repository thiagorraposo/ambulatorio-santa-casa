# Interface de leitura de medicamentos — recorte7B-E5U

2026-11-01, Janela1; backendcfcdf60, recorte VALIDADO TECNICAMENTE.
[Contrato](../arquitetura/CONTRATO_MEDICAMENTOS_7B_E5B.md).
Não conclui E5U de cadastro/prescrição nem seus critérios integrais.

Link na consulta de origem, coleção paginada,18 propriedades literais mais
identificadores do registro/atendimento; identificação de catálogo e nome livre
separados. Data sem fuso, negativa distinta de desconhecido, sem calcular doses.
Sem formulário de escrita. Vazio/erro/carga não reutilizam itens anteriores;
retorno preserva query da origem e autorização continua no backend.

Build/264 unidades passaram em /tmp/ambulatorio-check-sew4mal1/output.log.
Dois E2E reais em /tmp/m3-medicamentos-ui-e2e-final.log (2/2,11.7s), artefatos
/tmp/etapa6-frontend-KLlZDu:21 itens legados sintéticos criados pelo owner,
paginação20/1,18 campos visíveis, valores discriminantes/null/negativa/datas,
separação de consultas, nenhuma escrita HTTP, três viewports/Axe sem violações,
reautenticação preservando URL da página, consulta só lê, vazio,503 sanitizado,
recuperação e revogação de vínculo. Falha inicial dos dois testes era reload sem
reautenticação: sessão apenas em memória exibiu login corretamente; corrigido
o roteiro do teste, sem alterar a segurança da aplicação.
90 E2E cadastrados; baseline anterior preservada, não executada integralmente.
PostgreSQL16.15 tmpfs localhost55457; runner próprio02–71, sem acesso persistente.
Backend/SQL/importador inalterados desde cfcdf60; evidência HTTP reutilizada.

Capturas da interface (não constituem comparação nem aceite visual8V1):
[1440](../frontend/visuais/medicamentos-leitura-1440.png),
[390](../frontend/visuais/medicamentos-leitura-390.png),
[320](../frontend/visuais/medicamentos-leitura-320.png).
Rerodar tests/frontend/test_e2e.sh medicamentos.spec.ts apenas em ambiente
sintético confirmado. Logs /tmp voláteis; resultados resumidos aqui.
