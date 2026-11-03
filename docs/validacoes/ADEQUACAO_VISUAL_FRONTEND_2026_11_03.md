# Adequação visual do frontend — 03/11/2026

## Escopo e procedência

Retomada solicitada pelo responsável após o congelamento: branch
`feat/m3-janela-1-eventos`, base `f08145f`. A árvore inicial já tinha alterações
em 15 arquivos e dois arquivos novos, incluindo a organização em 12 seções;
foram preservadas, completadas e validadas nesta entrega. O antes representa
**essa árvore inicial**, não o candidato congelado nem uma reconstrução do HEAD.
O candidato `c4a3c99` e sua branch de demonstração não foram alterados.

Objetivo: aproximar estrutura informacional, hierarquia e componentes da
referência, mantendo contratos, autorização, rascunhos e confirmações existentes.
Aceite técnico: navegação livre pelas seções, revisão/POST/GET consistentes,
interfaces existentes utilizáveis em 1440×960 e 390×844, comparação renderizada
e verificações pertinentes aprovadas. Não constitui aceite clínico ou 8V1/8V2.

Fontes: [matriz FM/RQ](../frontend/MATRIZ_FIGMA_FRONTEND.md),
[visão](../frontend/VISAO_E_ESPECIFICACAO.md),
[protótipo oficial](../../referencias/frontend/figma-make-prototipo/src/components/NewAppointment.tsx)
e [capturas históricas de referência](../frontend/visuais/README.md).
O protótipo foi renderizado novamente em Chromium, em cópia local com dependências
já disponíveis, sem editar o original. O SHA256 de `NewAppointment.tsx` nas duas
cópias é `caaa200638539ce8a929061462ded9ce056aa1efab00b309ee01e0f6e9708ccb`.
Requisições externas do protótipo foram bloqueadas; fonte do sistema preservada.

## Atendimento: correspondência das 12 seções

`P` abaixo significa `/v1/pacientes/:pacienteId`; `A`, `P/atendimentos/:atendimentoId`.
Não houve mudança de contratos ou campos persistidos. Seleção direta não exige
visitar seções anteriores; Anterior/Próxima percorrem as seções preenchíveis do
formulário inicial. As demais explicam onde seu registro efetivamente acontece.

| Seção oficial | Campos e capacidade efetiva | Apresentação / fronteira preservada |
| --- | --- | --- |
| 1 Atendimento | Data, localização, dois booleanos de contexto e observações; POST `P/atendimentos` | Cartão e contexto agrupados. Booleanos conservam desconhecido; não viraram rádio com valor obrigatório/default. PATCH existente só altera núcleo versionado. |
| 2 Chagas e Sorologia | Diagnóstico, status, resultado/data, descoberta por autorrelato, critério e observações no POST inicial; métodos/resultados/datas/laboratório/observações em `A/sorologias` | Diagnóstico no formulário reutilizado; sorologias com revisão/recibo próprios após salvar. Sem atualizar diagnóstico por inferência. |
| 3 Condição Clínica | Seis campos da condição em `A/condicao-chagas`; episódios em `A/complicacoes-chagas` | Registro separado após salvar, sem campos descartáveis no POST inicial. A seção orienta ao detalhe. |
| 4 Comorbidades | Catálogo, avaliações por item, histórico/relato familiar em `A/comorbidades` | Registro separado por atendimento; triestado e revisão próprios mantidos. |
| 5 Avaliação Clínica | Altura, peso, circunferência abdominal, frequência cardíaca, saturação, PA sistólica/diastólica, NYHA e observações | Formulário existente em duas colunas no desktop e uma no mobile; POST inicial e revisão integral. |
| 6 Eventos e Dispositivos | `P/avcs`, `P/dispositivos`, `P/obito` | Links reais às áreas longitudinais; não fingem que o evento pertence ao atendimento em criação. Ressincronizador/precisão parcial e demais recortes continuam fora do suporte comprovado. |
| 7 Projetos | GET/PUT `P/projetos`, catálogo existente | Link à área da ficha; confirmação própria, sem acrescentar vínculo ao POST inicial. |
| 8 Exames | Bloco, catálogo, identificação, resultado e observações, rastreio/familiares no POST inicial; parâmetros em `P/exames/:exameId/resultados` | Coleções reutilizadas, limites/remoção/foco preservados. Datas/status de exame sem contrato não aparecem. |
| 9 Medicamentos e BZN | Leitura `A/medicamentos`; tratamento/reações/retornos em `P/tratamento-bzn`, suas reações e `P/retornos-bzn` | BZN na ficha, confirmações separadas; medicamentos por consulta salva, sem prescrição fictícia. |
| 10 Encaminhamentos | `P/encaminhamentos` e contrarreferências, atendimento verificado | Orientação para registro pelo detalhe após salvar. |
| 11 Notificação | GET/PUT `P/notificacao` | Área canônica da ficha; não integra o primeiro POST. |
| 12 Observações | Pendências: descrição/status/data de resolução no POST inicial | Identifica pendências na criação; observações gerais permanecem na seção 1, clínicas na 5, sem duplicar campos com o mesmo destino. |

Revisão é uma ação final, **não a 13ª seção clínica**. Mostra todos os valores e
filhos que serão enviados; só Confirmar grava. Índice distingue Com dados,
Sem preenchimento, Revisar campos e Registro separado. Com dados não representa
completude clínica. Confirmação usa os recibos e a recuperação já existentes;
registro separado não é apresentado como preenchimento concluído.

## Comparação renderizada e diferenças

Artefatos selecionados no [caderno comparativo](../evidencias/frontend_referencia_2026_11_03/README.md).
Prefixos `antes-`, `depois-` e `referencia-` distinguem a procedência; todos os
pacientes são sintéticos. Capturas não substituem os asserts API/SQL dos testes.

| Tela / estados observados | Diferenças tratadas e resultado / limite |
| --- | --- |
| Atendimento, 12 seções, revisão e erros | Índice oficial, painel branco com título/contador, estados de preenchimento, seleção direta, agrupamento de contexto e grade de avaliação. Comparação das 12 seções com o protótipo. Mobile usa índice horizontal com seleção trazida à vista, pois o protótipo corta conteúdo nessa largura. Seções com confirmação própria conservam orientação em lugar de campos sem persistência. |
| Pacientes, sucesso/vazio/carga/erro/CSV | Cabeçalho com ação, busca e filtros separados do resultado; nome antes do ID, ações explícitas, linhas compactas e cartões no mobile. CSV da página com escopo/confirmar/erro preservados. Não há total de pacientes nem colunas fictícias. |
| Busca prévia, cadastro e edição | Largura de 720 px, cabeçalho/aviso da busca próximos da referência; identificação, endereço e contatos com agrupamentos uniformes; nome em largura inteira. Busca prévia e gate de capacidade permanecem. |
| Login, início, navegação e conta | Identidade textual oficial, paleta azul, topbar/sidebar e cartões consistentes. Menu compacto e foco preservados; sem contas/senhas de demonstração na interface. Início mantém somente capacidades disponíveis, sem indicadores fictícios. |
| Ficha, histórico, detalhe e exames | Identidade e ações reunidas; lista cadastral de consultas mais compacta; abas e cabeçalhos padronizados. Atalhos do detalhe agrupados em registros daquele atendimento e histórico do paciente. Contexto temporal, paginação e links de retorno mantidos. |
| Sorologias, condição/complicações, comorbidades | Listas e formulários reais renderizados nos dois tamanhos; herdam campos, cartões e estados compartilhados. Comparação estrutural com seções 2–4 da referência; as páginas separadas não têm réplica exata no protótipo, pois a confirmação efetiva é independente. |
| AVC, dispositivos, óbito, medicamentos e BZN | Áreas reais e formulários elegíveis renderizados; organização relacionada às seções 6/9, conservando vínculo longitudinal e somente leitura de medicamentos. Provas funcionais próprias preservadas. |
| Importações e usuários | Listas reais com tabela/cartão, cabeçalho, carga/vazio/erro e paginação compartilhados. Referência visual disponível; sem inventar upload operacional ampliado, indicadores, campos ou comandos administrativos ainda ausentes. |

Tipografia usa fontes locais; marca gráfica não é homologação institucional.
Não há reprodução pixel a pixel nem comparação aprovada de toda combinação de
campos, permissões, diálogos e erros da aplicação. Para páginas complementares
sem equivalente próprio, a comparação é com sua seção informacional no protótipo.

## Validação e reexecução

Fechamento em03/11/2026 às04:15 America/Sao_Paulo. Código consolidado nos commits locais `e894581` (seções do atendimento) e
`a922fd6` (apresentação compartilhada e formulários). A documentação/evidências
seguem em commit próprio, identificável por `git log` deste relatório. As verificações foram compostas por recorte, sem
repetir as suítes aprovadas após mudanças sem impacto correspondente.


- Build frontend aprovado; 306/306 unitários aprovados com `--maxWorkers=2`.
- Rodada focada inicial: 10/10 E2E em `/tmp/etapa6-frontend-ddzIMS`, incluindo
  leitura por perfil, 12 seções e inspeção visual real.
- Após ajustes compartilhados: 6/6 em `/tmp/etapa6-frontend-EicJte`;
  após o último ajuste da grade/largura e expectativas de apresentação, 10/10
  em `/tmp/etapa6-frontend-RB1KNB`, incluindo quatro cenários de comorbidades,
  cinco de atalhos/perfis/retorno/teclado e a navegação visual completa.
- Índice móvel selecionado inteiramente visível ao navegar/redimensionar:
  1/1 E2E em `/tmp/etapa6-frontend-Q6vTJ0`; 9/9 unidades do atendimento e
  3/3 de comorbidades reaprovadas após seus últimos ajustes.
- Suíte ampla: 117 cenários, 115 aprovados e duas expectativas de apresentação
  antigas, já corrigidas e reaprovadas nas rodadas focadas. Sem skips/retries.
  `/tmp/etapa6-frontend-2EN7jr/results.json` e
  `/tmp/ambulatorio-check-ls_xf98w/output.log` preservam a execução que retornou
  falha pelas duas expectativas; não se declara que esse comando passou.
- Composição conferida pelos títulos/arquivos dos cinco relatórios JSON acima:
  **118/118 cenários distintos com resultado aprovado, nenhum pendente**,
  incluindo o novo cenário visual. A suíte ampla começou antes do fechamento
  dos estilos; mudanças posteriores foram revalidadas pelos recortes focados.
  Não foi repetida a suíte inteira no último SHA. As 306 unidades também são
  composição da rodada integral com as 9/3 unidades pertinentes reaprovadas.
- `make docs-check COMPACT=1`, `git diff --check`, 1.864 destinos locais nos
  documentos afetados e manifesto SHA256 das 63 PNGs selecionadas conferidos.
  Aviso de chunk do Vite acima de 500 kB permanece não bloqueante; sem nova biblioteca.
- `attendance-sections.spec.ts`: todas as 12 seções em 1440/390, Axe/reflow,
  navegação livre antes da data obrigatória, saída/retorno com rascunho,
  erro de peso com foco, revisão e único POST seguido de GET persistido.
- `visual-reference.spec.ts`: navegação real entre ficha, edição, abas, detalhe,
  leituras/formulários clínicos, pacientes/importações/usuários/conta/início;
  duas larguras, Axe/reflow, nenhuma escrita clínica durante a inspeção.
- Suítes existentes preservam cadastro, autorização por perfil/vínculo,
  versionamento/conflito, recibos, resposta perdida e recuperação, CSV e
  módulos clínicos; não se atribui a um teste a cobertura de todos os RQ.

Ambiente: PostgreSQL exclusivamente sintético tmpfs em 55458; cada runner cria
seu próprio banco/roles e aplica migrations 02–73 somente no descartável.
API Nest e Vite locais, Chromium headless; dados da fixture/API reais, sem
resposta de sucesso simulada. Falhas/atrasos de transporte dos testes anteriores
continuam explicitamente limitados a esses cenários.

Comandos: `make frontend-build COMPACT=1`;
`cd frontend && npm run test:unit -- --maxWorkers=2`;
`make frontend-e2e COMPACT=1` com `SYNTHETIC_PG_*` e `PGPASSWORD` do servidor
sintético confirmado; runner focado com
`bash tests/frontend/test_e2e.sh attendance-sections.spec.ts visual-reference.spec.ts clinical.spec.ts`;
`make docs-check COMPACT=1`; `git diff --check`.
Credenciais não são registradas neste documento.

Execução inicial concorrente sofreu timeouts de unitários e readiness da API;
limitada a concorrência e corrigida a guarda de `matchMedia` para o jsdom, os unitários passaram. A primeira execução E2E detectou
expectativa antiga de cabeçalhos `ID/Nome/Ações`; foi atualizada para
`Paciente/ID do sistema/Ações`. O teste de atalhos foi adaptado do scroll horizontal obrigatório ao reflow em cartões e ao cabeçalho pessoa/ID, mantendo identidade, teclado, filtros, ausência de N+1/escrita e autorização. A nova prova visual passou a aguardar a tabela após mudar de aba, evitando capturar o link com o retorno da aba anterior.

A inspeção intermediária detectou checkboxes com largura/altura de input textual
e formulários distribuídos em até quatro colunas. Corrigidos globalmente: largura
clínica limitada, duas colunas no desktop/uma no mobile, cabeçalho sem duplicação,
controles checkbox/radio nativos e espaçamento das ações. As capturas
`intermediario-*` documentam o achado; `depois-ui-*` vêm da reexecução aprovada
após a correção e fechamento da grade (rodadas focadas de6 e10 cenários).

## Pendências preservadas

A API da listagem não publica código institucional, nascimento/idade, origem,
última consulta/status, projetos nem total. Não se fez N+1 para simular projeção.
Prescrição de medicamentos, metadados residuais de exames, demais eventos e
correções históricas dependem dos respectivos contratos/backend. Concorrência de
projetos/notificação e gestão ampliada de contas continuam em seus recortes.
Não foram alterados migrations, permissões, backend, dados persistentes ou
políticas clínicas. HUM-M3-03 permanece aberto sem causa humana reproduzida.
Próxima ação: revisão humana comparativa dos recortes apresentados; pendências
funcionais seguem a fila vigente, sem novo roadmap nem aceite de M3 por associação.

Serviços de inspeção4180/API6065 e protótipo4182 encerrados; todos os runners
concluíram a limpeza de seus bancos/roles. PostgreSQL sintético preexistente
e serviços alheios preservados. Sem push, merge ou deploy.
