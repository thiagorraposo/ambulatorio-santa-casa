# Reorganização documental de 23/10/2026

## Objetivo e diagnóstico

Organizar a documentação sem alterar código, configuração funcional, contratos
clínicos ou comportamento. A inspeção partiu de 85 arquivos Markdown, dos
artefatos associados e das referências em Makefile/scripts. Foram preservadas
as seis alterações documentais preexistentes de ampliação para produto completo.
Arquivos locais ignorados, planilhas reais, credenciais e bancos não foram lidos
nem modificados nesta entrega.

| Problema observado | Tratamento |
| --- | --- |
| README com setup, tabela extensa de comandos e procedimentos repetidos no workflow/guias | README reduzido a apresentação, demonstração e navegação. Setup e efeitos operacionais consolidados no workflow; detalhes de frontend e backup em suas fontes. |
| Estado atual misturava síntese, várias continuidades e contagens de rodadas diferentes | Síntese reescrita com limites e links. Conteúdo anterior integral preservado em [ESTADO_2026_10_23.md](ESTADO_2026_10_23.md). |
| Roadmap de 1.936 linhas misturava marcos e fichas de dezenas de pacotes | Sequência/marcos permanecem no roadmap; catálogo extraído para `frontend/ENTREGAS_DO_PRODUTO.md`, sem renumerar pacotes ou requisitos. |
| Respostas clínicas aprovadas ainda se chamavam “perguntas pendentes” | Perguntas e respostas originais incorporadas integralmente à fonte D1–D12, com origem e precedência explícitas. |
| Planejamento antigo na raiz propunha UUIDs, entidades e comandos de outra fase | Documentos e DER em `historico/planejamento/`, identificados como origem. Nenhuma proposta foi promovida a contrato vigente. |
| Análise Figma anterior ao frontend e reauditoria antiga apareciam junto às fontes atuais | Arquivadas e ligadas ao estado/roadmap vigentes. Conteúdo e referências preservados. |
| Três páginas sem conteúdo técnico | Existência e destino consolidados no [registro de arquivos vazios](README.md#arquivos-originalmente-vazios). |
| Status antigos “planejado” coexistiam com correções R7 posteriores | Catálogo aponta para provas do recorte original e distingue implementação, cobertura por classe e aceite humano. A matriz preserva sua fotografia, com continuidades explícitas. |
| Documentos antigos generalizavam ROLLBACK e testes de restore | Workflow/recuperação agora explicitam COMMIT, ambiente descartável, versão do backup e limites dos alvos atuais. Nenhum alvo foi alterado. |
| Modelo de ameaças refletia 22/09, embora houvesse controles posteriores | Mantida a matriz histórica com limite de cobertura e links às implementações posteriores; nenhuma nova auditoria foi declarada. |
| Índice principal misturava tarefas, histórico e lista de relatórios | Navegação por necessidade; índices adicionais apenas para validações e histórico, além do índice visual já existente. |
| Nomes com espaços, links Obsidian e um cabeçalho ADR fora da hierarquia | Rascunhos movidos receberam nomes consistentes; links disponíveis convertidos para Markdown; nomes de fontes ausentes preservados como texto; ADR-016 normalizado sem alterar a decisão. |

## Estrutura resultante

```text
README.md                         visão geral e acesso rápido
AGENTS.md                         regras de trabalho no repositório
docs/
  README.md                       entrada por tarefa e fontes principais
  ESTADO_ATUAL_DO_PROJETO.md       implementação e limites comprovados
  PROXIMOS_PASSOS.md               sequência, marcos e próximo trabalho
  WORKFLOW_DE_DESENVOLVIMENTO.md   setup, comandos e validação proporcional
  ...                             fontes principais estáveis exigidas pelo Makefile
  arquitetura/                    contratos específicos e especificações de módulos
  dados/                          decisões clínicas, cobertura e layout seguro
  frontend/                       visão, matriz e catálogo de entregas
    visuais/                      comparações e artefatos visuais
  validacoes/                     relatórios por execução/escopo e índice
  evidencias/                     dump estrutural aplicado
  historico/                      fotografias substituídas e inventário
    planejamento/                 rascunhos e DER de origem
referencias/                      protótipo original preservado
```

Fontes na raiz de `docs/` não foram movidas por estética: o Makefile e as
instruções dependem de seus caminhos. Guias junto aos testes e instruções locais
permanecem junto ao componente; o índice central aponta para eles. A pasta local
`planejamento/` pode continuar existindo para arquivos ignorados usados pelas
ferramentas; só seus documentos/diagrama versionados foram reorganizados.

## Preservação e validação

- Inventário dos 85 documentos de origem com destino abaixo; nenhum conteúdo
  técnico incerto foi descartado. Rascunhos preservados linha a linha após
  normalizar cabeçalhos, espaços e referências; três vazios viraram registro.
- Respostas clínicas originais conferidas integralmente no documento consolidado;
  linhas D1–D12, identificadores FM/RQ, 76 âncoras de pacotes e IDs das ADRs preservados.
- Fotografias de estado, análise Figma e reauditoria conferidas contra a origem,
  descontadas apenas identificação histórica e atualização de caminhos/links.
- Hashes dos 381 arquivos versionados não Markdown preservados, incluindo o DER
  movido. Código, Makefile, CI, configurações, migrations, testes, manifesto,
  dump aplicado e imagens não sofreram mudança de conteúdo.
- Links relativos, fragmentos de títulos/IDs, referências de imagens e navegação
  Markdown auditados. URLs externas e existência de logs em `/tmp` não foram
  verificados. Fontes locais ignoradas não são exigidas para a navegação versionada.
- `make docs-check COMPACT=1` e `git diff --check`; verificação de whitespace dos
  documentos novos e revisão do status. Suítes SQL/backend/importador/frontend
  não executadas: escopo exclusivamente documental, conforme o workflow.

## Pendências que a organização não resolve

1. Parecer da equipe clínica e decisões específicas P-01/P-03–P-09; a inclusão
   das famílias PC está aprovada, mas detalhes de semântica, ordem do primeiro
   uso, métricas, origem, identidade e autorização continuam exigindo definição.
   P-02 deve ser lida com ADR-025 e limites de recuperação após nova sessão.
2. D9: definir representação do planejamento/desfecho e a eventual retirada do
   campo legado; preservar o conteúdo e não fabricar comparecimentos. Anexos
   exigem decisão de formato/armazenamento/retenção e controle institucional.
3. Reavaliação de ameaças para os módulos e a implantação atuais, antes de 9D;
   a matriz antiga não constitui aprovação dos controles futuros.
4. Plano de recuperação compatível com a versão do backup: o check físico fixa
   contagens do schema persistente, enquanto a suíte genérica exige incrementos
   e banco descartável. Correção de ferramentas exige entrega técnica própria.
5. Seis CSVs referidos pelo dicionário histórico não estão versionados; nomes
   preservados sem reconstrução de conteúdo. Logs/artefatos temporários citados
   nos relatórios também podem não estar disponíveis.

## Inventário de origem e destino

Caminhos de origem são registro histórico, não links de navegação. Os destinos
são clicáveis e indicam a fonte mantida ou o registro que absorveu o conteúdo.
“Referências” significa atualização de caminhos sem mudança de contrato.

| Origem em 23/10 | Destino | Tratamento |
| --- | --- | --- |
| `AGENTS.md` | [AGENTS.md](../../AGENTS.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `README.md` | [README.md](../../README.md) | Apresentação e navegação; procedimentos no workflow/guias. |
| `docs/AGENTS.md` | [docs/AGENTS.md](../AGENTS.md) | Regras de organização e fontes acrescentadas. |
| `docs/ARQUITETURA_BACKEND.md` | [docs/ARQUITETURA_BACKEND.md](../ARQUITETURA_BACKEND.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/DECISOES_ARQUITETURAIS.md` | [docs/DECISOES_ARQUITETURAIS.md](../DECISOES_ARQUITETURAIS.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md` | [docs/ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md](../ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/ESTADO_ATUAL_DO_PROJETO.md` | [docs/ESTADO_ATUAL_DO_PROJETO.md](../ESTADO_ATUAL_DO_PROJETO.md) | Síntese; versão anterior preservada em ESTADO_2026_10_23.md. |
| `docs/FRONTEND.md` | [docs/FRONTEND.md](../FRONTEND.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/IMPORTADOR_SINTETICO_V1.md` | [docs/IMPORTADOR_SINTETICO_V1.md](../IMPORTADOR_SINTETICO_V1.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/MANIFESTO_FISICO_PLANILHA_V1.md` | [docs/MANIFESTO_FISICO_PLANILHA_V1.md](../MANIFESTO_FISICO_PLANILHA_V1.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/MODELO_FISICO_ATUAL.md` | [docs/MODELO_FISICO_ATUAL.md](../MODELO_FISICO_ATUAL.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/PADRAO_DE_COMMITS.md` | [docs/PADRAO_DE_COMMITS.md](../PADRAO_DE_COMMITS.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/PROXIMOS_PASSOS.md` | [docs/PROXIMOS_PASSOS.md](../PROXIMOS_PASSOS.md) | Sequência/marcos; fichas transferidas ao catálogo. |
| `docs/Perguntas pendentes sobre campos e regras clínicas.md` | [docs/dados/DECISOES_HUMANAS_NOVA_PLANILHA.md](../dados/DECISOES_HUMANAS_NOVA_PLANILHA.md) | Consolidação integral no apêndice de respostas originais. |
| `docs/README.md` | [docs/README.md](../README.md) | Índice por tarefa e fontes principais. |
| `docs/RECUPERACAO_POSTGRESQL_DOCKER.md` | [docs/RECUPERACAO_POSTGRESQL_DOCKER.md](../RECUPERACAO_POSTGRESQL_DOCKER.md) | Limites de vigência/compatibilidade explicitados; avaliação de origem preservada. |
| `docs/REGISTRO_DE_ALTERACOES.md` | [docs/REGISTRO_DE_ALTERACOES.md](../REGISTRO_DE_ALTERACOES.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/RELATORIO_DESDE_ULTIMO_COMMIT_2026_10_05.md` | [docs/historico/RELATORIO_ETAPA_7_2026_10_05.md](RELATORIO_ETAPA_7_2026_10_05.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `docs/SEGURANCA_DE_DADOS.md` | [docs/SEGURANCA_DE_DADOS.md](../SEGURANCA_DE_DADOS.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/THREAT_MODEL.md` | [docs/THREAT_MODEL.md](../THREAT_MODEL.md) | Limites de vigência/compatibilidade explicitados; avaliação de origem preservada. |
| `docs/WORKFLOW_DE_DESENVOLVIMENTO.md` | [docs/WORKFLOW_DE_DESENVOLVIMENTO.md](../WORKFLOW_DE_DESENVOLVIMENTO.md) | Setup/comandos consolidados e isolamento dos testes explicitado. |
| `docs/arquitetura/ANALISE_INTEGRACAO_FIGMA_MAKE.md` | [docs/historico/ANALISE_FIGMA_MAKE_2026_10_03.md](ANALISE_FIGMA_MAKE_2026_10_03.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `docs/arquitetura/CONTRATOS_CATALOGOS_ETAPA_7.md` | [docs/arquitetura/CONTRATOS_CATALOGOS_ETAPA_7.md](../arquitetura/CONTRATOS_CATALOGOS_ETAPA_7.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/arquitetura/CONTRATOS_CLINICOS_ETAPA_5.md` | [docs/arquitetura/CONTRATOS_CLINICOS_ETAPA_5.md](../arquitetura/CONTRATOS_CLINICOS_ETAPA_5.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/arquitetura/CONTRATO_FAMILIARES_ETAPA_7.md` | [docs/arquitetura/CONTRATO_FAMILIARES_ETAPA_7.md](../arquitetura/CONTRATO_FAMILIARES_ETAPA_7.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/arquitetura/ESPECIFICACAO_ASSOCIACAO_PACIENTE_PROJETO.md` | [docs/arquitetura/ESPECIFICACAO_ASSOCIACAO_PACIENTE_PROJETO.md](../arquitetura/ESPECIFICACAO_ASSOCIACAO_PACIENTE_PROJETO.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/arquitetura/ESPECIFICACAO_ENCAMINHAMENTO_AMPLIADO.md` | [docs/arquitetura/ESPECIFICACAO_ENCAMINHAMENTO_AMPLIADO.md](../arquitetura/ESPECIFICACAO_ENCAMINHAMENTO_AMPLIADO.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/arquitetura/ESPECIFICACAO_EVOLUCAO_EXAMES_COMPLEMENTARES.md` | [docs/arquitetura/ESPECIFICACAO_EVOLUCAO_EXAMES_COMPLEMENTARES.md](../arquitetura/ESPECIFICACAO_EVOLUCAO_EXAMES_COMPLEMENTARES.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/arquitetura/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md` | [docs/arquitetura/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md](../arquitetura/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/arquitetura/ESPECIFICACAO_MODULO_IMPORTACAO_PROVENIENCIA.md` | [docs/arquitetura/ESPECIFICACAO_MODULO_IMPORTACAO_PROVENIENCIA.md](../arquitetura/ESPECIFICACAO_MODULO_IMPORTACAO_PROVENIENCIA.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/arquitetura/ESPECIFICACAO_MODULO_NOTIFICACAO.md` | [docs/arquitetura/ESPECIFICACAO_MODULO_NOTIFICACAO.md](../arquitetura/ESPECIFICACAO_MODULO_NOTIFICACAO.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md` | [docs/arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md](../arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/arquitetura/ESPECIFICACAO_TRATAMENTO_BENZONIDAZOL.md` | [docs/arquitetura/ESPECIFICACAO_TRATAMENTO_BENZONIDAZOL.md](../arquitetura/ESPECIFICACAO_TRATAMENTO_BENZONIDAZOL.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/arquitetura/RECORTE_CLINICO_ETAPA_7.md` | [docs/arquitetura/RECORTE_CLINICO_ETAPA_7.md](../arquitetura/RECORTE_CLINICO_ETAPA_7.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/arquitetura/RECUPERACAO_OPERACOES_ETAPA_7.md` | [docs/arquitetura/RECUPERACAO_OPERACOES_ETAPA_7.md](../arquitetura/RECUPERACAO_OPERACOES_ETAPA_7.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/dados/COBERTURA_COLUNAS_PLANILHA.md` | [docs/dados/COBERTURA_COLUNAS_PLANILHA.md](../dados/COBERTURA_COLUNAS_PLANILHA.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/dados/DECISOES_HUMANAS_NOVA_PLANILHA.md` | [docs/dados/DECISOES_HUMANAS_NOVA_PLANILHA.md](../dados/DECISOES_HUMANAS_NOVA_PLANILHA.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/dados/METADADOS_SEGUROS_LAYOUT_PLANILHA.md` | [docs/dados/METADADOS_SEGUROS_LAYOUT_PLANILHA.md](../dados/METADADOS_SEGUROS_LAYOUT_PLANILHA.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/frontend/MATRIZ_FIGMA_FRONTEND.md` | [docs/frontend/MATRIZ_FIGMA_FRONTEND.md](../frontend/MATRIZ_FIGMA_FRONTEND.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/frontend/VISAO_E_ESPECIFICACAO.md` | [docs/frontend/VISAO_E_ESPECIFICACAO.md](../frontend/VISAO_E_ESPECIFICACAO.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/frontend/visuais/README.md` | [docs/frontend/visuais/README.md](../frontend/visuais/README.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/historico/HISTORICO_DE_IMPLEMENTACAO.md` | [docs/historico/HISTORICO_DE_IMPLEMENTACAO.md](HISTORICO_DE_IMPLEMENTACAO.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/historico/IMPACTO_NOVO_LAYOUT_PLANILHA.md` | [docs/historico/IMPACTO_NOVO_LAYOUT_PLANILHA.md](IMPACTO_NOVO_LAYOUT_PLANILHA.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/historico/INVENTARIO_REORGANIZACAO_2026-09-03.md` | [docs/historico/INVENTARIO_REORGANIZACAO_2026-09-03.md](INVENTARIO_REORGANIZACAO_2026-09-03.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/historico/decisoes-modelagem.md` | [docs/historico/README.md](README.md) | Arquivo sem conteúdo técnico; existência registrada no índice histórico. |
| `docs/historico/dicionario-dados.md` | [docs/historico/README.md](README.md) | Arquivo sem conteúdo técnico; existência registrada no índice histórico. |
| `docs/validacoes/ACEITE_INTEGRADO_ETAPA_5.md` | [docs/validacoes/ACEITE_INTEGRADO_ETAPA_5.md](../validacoes/ACEITE_INTEGRADO_ETAPA_5.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/CONTINUIDADE_ETAPA_5.md` | [docs/validacoes/CONTINUIDADE_ETAPA_5.md](../validacoes/CONTINUIDADE_ETAPA_5.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/ROTEIRO_REVISAO_CLINICA_ETAPA_7.md` | [docs/validacoes/ROTEIRO_REVISAO_CLINICA_ETAPA_7.md](../validacoes/ROTEIRO_REVISAO_CLINICA_ETAPA_7.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_7D_U3_1.md` | [docs/validacoes/VALIDACAO_7D_U3_1.md](../validacoes/VALIDACAO_7D_U3_1.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_7D_U3_2.md` | [docs/validacoes/VALIDACAO_7D_U3_2.md](../validacoes/VALIDACAO_7D_U3_2.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_7D_U3_3.md` | [docs/validacoes/VALIDACAO_7D_U3_3.md](../validacoes/VALIDACAO_7D_U3_3.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_7D_U4_1.md` | [docs/validacoes/VALIDACAO_7D_U4_1.md](../validacoes/VALIDACAO_7D_U4_1.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_ASSOCIACAO_PACIENTE_PROJETO.md` | [docs/validacoes/VALIDACAO_ASSOCIACAO_PACIENTE_PROJETO.md](../validacoes/VALIDACAO_ASSOCIACAO_PACIENTE_PROJETO.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_DADOS_DE_TESTE.md` | [docs/validacoes/VALIDACAO_DADOS_DE_TESTE.md](../validacoes/VALIDACAO_DADOS_DE_TESTE.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_ENCAMINHAMENTO_AMPLIADO.md` | [docs/validacoes/VALIDACAO_ENCAMINHAMENTO_AMPLIADO.md](../validacoes/VALIDACAO_ENCAMINHAMENTO_AMPLIADO.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_ETAPA_4C.md` | [docs/validacoes/VALIDACAO_ETAPA_4C.md](../validacoes/VALIDACAO_ETAPA_4C.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_ETAPA_6.md` | [docs/validacoes/VALIDACAO_ETAPA_6.md](../validacoes/VALIDACAO_ETAPA_6.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_ETAPA_7.md` | [docs/validacoes/VALIDACAO_ETAPA_7.md](../validacoes/VALIDACAO_ETAPA_7.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_EXAMES_POR_PACIENTE.md` | [docs/validacoes/VALIDACAO_EXAMES_POR_PACIENTE.md](../validacoes/VALIDACAO_EXAMES_POR_PACIENTE.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_MODELO_FISICO.md` | [docs/validacoes/VALIDACAO_MODELO_FISICO.md](../validacoes/VALIDACAO_MODELO_FISICO.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_MODULO_AVALIACAO_CLINICA.md` | [docs/validacoes/VALIDACAO_MODULO_AVALIACAO_CLINICA.md](../validacoes/VALIDACAO_MODULO_AVALIACAO_CLINICA.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_MODULO_IMPORTACAO_PROVENIENCIA.md` | [docs/validacoes/VALIDACAO_MODULO_IMPORTACAO_PROVENIENCIA.md](../validacoes/VALIDACAO_MODULO_IMPORTACAO_PROVENIENCIA.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_MODULO_NOTIFICACAO.md` | [docs/validacoes/VALIDACAO_MODULO_NOTIFICACAO.md](../validacoes/VALIDACAO_MODULO_NOTIFICACAO.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_ORDENACAO_IDENTIFICADORES.md` | [docs/validacoes/VALIDACAO_ORDENACAO_IDENTIFICADORES.md](../validacoes/VALIDACAO_ORDENACAO_IDENTIFICADORES.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `docs/validacoes/VALIDACAO_TRATAMENTO_BENZONIDAZOL.md` | [docs/validacoes/VALIDACAO_TRATAMENTO_BENZONIDAZOL.md](../validacoes/VALIDACAO_TRATAMENTO_BENZONIDAZOL.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `planejamento/DER Definitivo.md` | [docs/historico/planejamento/DESCRICAO_DO_DER.md](planejamento/DESCRICAO_DO_DER.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `planejamento/Dicionário de Dados Técnico.md` | [docs/historico/planejamento/DICIONARIO_TECNICO.md](planejamento/DICIONARIO_TECNICO.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `planejamento/Dicionário de dados - Planilhas.md` | [docs/historico/planejamento/DICIONARIO_PLANILHAS.md](planejamento/DICIONARIO_PLANILHAS.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `planejamento/Estrutura Esperada do Dicionário de Dados.md` | [docs/historico/planejamento/ESTRUTURA_DO_DICIONARIO.md](planejamento/ESTRUTURA_DO_DICIONARIO.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `planejamento/Projeto Planilha Ambulatório.md` | [docs/historico/planejamento/PLANO_INICIAL.md](planejamento/PLANO_INICIAL.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `planejamento/RELATORIO_AUTOMATICO.md` | [docs/historico/planejamento/RELATORIO_AUTOMATICO.md](planejamento/RELATORIO_AUTOMATICO.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `planejamento/Rotina curta para voltar ao projeto no futuro.md` | [docs/historico/planejamento/ROTINA_LOCAL_ANTIGA.md](planejamento/ROTINA_LOCAL_ANTIGA.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `planejamento/Untitled 1.md` | [docs/historico/README.md](README.md) | Arquivo sem conteúdo técnico; existência registrada no índice histórico. |
| `planejamento/Visão Geral das Tabelas.md` | [docs/historico/planejamento/VISAO_DAS_TABELAS.md](planejamento/VISAO_DAS_TABELAS.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `planejamento/relação de cada tabela com cada coluna da planilha.md` | [docs/historico/planejamento/MAPEAMENTO_TABELAS_COLUNAS.md](planejamento/MAPEAMENTO_TABELAS_COLUNAS.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `planejamento/tabelas e atributos.md` | [docs/historico/planejamento/TABELAS_E_ATRIBUTOS.md](planejamento/TABELAS_E_ATRIBUTOS.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `planejamento/tabelas.md` | [docs/historico/planejamento/LISTA_DE_TABELAS.md](planejamento/LISTA_DE_TABELAS.md) | Movido e identificado como histórico; conteúdo e referências preservados. |
| `referencias/README.md` | [referencias/README.md](../../referencias/README.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `referencias/frontend/figma-make-prototipo/AGENTS.md` | [referencias/frontend/figma-make-prototipo/AGENTS.md](../../referencias/frontend/figma-make-prototipo/AGENTS.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `referencias/frontend/figma-make-prototipo/CLAUDE.md` | [referencias/frontend/figma-make-prototipo/CLAUDE.md](../../referencias/frontend/figma-make-prototipo/CLAUDE.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `referencias/frontend/figma-make-prototipo/src/imports/pasted_text/ambulatorio-santa-casa-prototy.md` | [referencias/frontend/figma-make-prototipo/src/imports/pasted_text/ambulatorio-santa-casa-prototy.md](../../referencias/frontend/figma-make-prototipo/src/imports/pasted_text/ambulatorio-santa-casa-prototy.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `sql/AGENTS.md` | [sql/AGENTS.md](../../sql/AGENTS.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `tests/AGENTS.md` | [tests/AGENTS.md](../../tests/AGENTS.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `tests/frontend/README.md` | [tests/frontend/README.md](../../tests/frontend/README.md) | Mantido; referências/identificação de vigência revisadas quando necessário. |
| `planejamento/DER_organizado_paineis.svg` | [DER preservado](planejamento/DER_ORGANIZADO_PAINEIS.svg) | Movido sem alteração de bytes. |
