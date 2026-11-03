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


## Comparação técnica renderizada — 02/11/2026

Durante a regressão M3 em `55f82b5` mais ensaio/isolamento de testes, os dois
cenários de medicamentos passaram novamente (itens42/43 da rodada integral),
com capturas reais em `/tmp/etapa6-frontend-0gp2Pn`, API/PostgreSQL sintético e
migrations02–73. Nenhum código de medicamentos mudou entre as duas provas.
Referência renderizada em localhost8445: login sintético → Pacientes →
Paciente Sintético001 → Tratamentos. `PatientRecord.tsx`, SHA256
`37b7943c03203a382a9a27c0cb9b5ae76a14e67961799f35eb857578bd9a4ac1`.
O log `/tmp/m3-medicamentos-referencia.log` confirma cabeçalhos reais.

A referência agrega medicamentos das consultas em tabela de sete colunas:
medicamento/dose/via/frequência/início/uso atual/status, junto do BZN. A aplicação
mantém o escopo por atendimento e dezoito propriedades identificadas em cartões
paginados, com nome livre e catálogo separados. Não inventa consolidação,
status calculado, unidade ou prescrição para copiar a tabela da referência.
Adicionar medicamento da referência não é oferecido enquanto faltar contrato
de escrita. Densidade e estrutura diferem; a grade reverte para uma coluna em
320px, sem overflow de página e com nome/ID/contexto visíveis.

| Viewport | Referência renderizada | Leitura real da aplicação |
| --- | --- | --- |
| 1440 | [Original](../frontend/visuais/medicamentos-referencia-m3-1440.png) | [Atual](../frontend/visuais/medicamentos-leitura-m3-1440.png) |
| 390 | [Original](../frontend/visuais/medicamentos-referencia-m3-390.png) | [Atual](../frontend/visuais/medicamentos-leitura-m3-390.png) |
| 320 | [Original](../frontend/visuais/medicamentos-referencia-m3-320.png) | [Atual](../frontend/visuais/medicamentos-leitura-m3-320.png) |

As capturas da aplicação mostram o viewport inicial, não todos os cartões ou
estados em uma imagem. Os dezoito campos, paginação, vazio/erro/perfil e acesso
continuam comprovados pelos testes. Este confronto acrescenta evidência parcial
8V1 do recorte de leitura; não homologa escrita, toda a fidelidade visual ou M3.
