# Inventário da Reorganização Documental de 2026-09-03

> Documento histórico. Registra o inventário anterior e a prova de preservação
> desta reorganização. Para navegação vigente, consulte [`../README.md`](../README.md).

## Critério

Foram inventariados os 40 arquivos então versionados em `docs/`. Nenhum documento
com conteúdo foi removido ou teve seu conteúdo histórico descartado. Movimentações
foram feitas com `git mv`; referências vigentes passaram a usar os caminhos novos.

Categorias: **1** fonte de verdade vigente; **2** operacional; **3** arquitetural;
**4** segurança; **5** validação/evidência; **6** histórico; **7**
redundante/substituído; **8** incerto, preservado.

## Inventário anterior e destino

| Arquivo anterior | Cat. | Finalidade/vigência e informação única | Referências e destino preservado |
| --- | ---: | --- | --- |
| `AGENTS.md` | 2 | Regras de manutenção documental; vigente | Permanece; apontado pelo índice e pelas instruções do repositório |
| `ARQUITETURA_BACKEND.md` | 1 | Arquitetura NestJS, contratos HTTP, autenticação, persistência e logs vigentes | Permanece como fonte principal; validação em `validacoes/VALIDACAO_ETAPA_4C.md` |
| `COBERTURA_COLUNAS_PLANILHA.md` | 5 | Reconciliação corrente dos 136 rótulos com o schema | Movido integralmente para `dados/` |
| `DECISOES_ARQUITETURAIS.md` | 1 | ADRs duradouras | Permanece como fonte principal |
| `DECISOES_HUMANAS_NOVA_PLANILHA.md` | 1 | Semântica e precedência aprovadas para a planilha | Movido integralmente para `dados/` |
| `ESPECIFICACAO_ASSOCIACAO_PACIENTE_PROJETO.md` | 3 | Contrato estrutural implementado do vínculo paciente–projeto | Movido integralmente para `arquitetura/` |
| `ESPECIFICACAO_ENCAMINHAMENTO_AMPLIADO.md` | 3 | Contrato estrutural implementado de encaminhamento | Movido integralmente para `arquitetura/` |
| `ESPECIFICACAO_EVOLUCAO_EXAMES_COMPLEMENTARES.md` | 3 | Contrato estrutural implementado de exames por paciente | Movido integralmente para `arquitetura/` |
| `ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md` | 1 | Regras normativas do importador | Permanece como fonte principal |
| `ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md` | 3 | Contrato implementado do módulo clínico | Movido integralmente para `arquitetura/` |
| `ESPECIFICACAO_MODULO_IMPORTACAO_PROVENIENCIA.md` | 3 | Contrato implementado de proveniência | Movido integralmente para `arquitetura/` |
| `ESPECIFICACAO_MODULO_NOTIFICACAO.md` | 3 | Contrato implementado de notificação | Movido integralmente para `arquitetura/` |
| `ESPECIFICACAO_TRATAMENTO_BENZONIDAZOL.md` | 3 | Contrato implementado do tratamento BZN | Movido integralmente para `arquitetura/` |
| `ESTADO_ATUAL_DO_PROJETO.md` | 1 | Síntese técnica vigente | Permanece; repetições detalhadas remetem às fontes temáticas |
| `HISTORICO_DE_IMPLEMENTACAO.md` | 6 | Reconstrução do início até 2026-07-01; fotografia de 25 tabelas | Movido integralmente para `historico/` e marcado como histórico |
| `IMPACTO_NOVO_LAYOUT_PLANILHA.md` | 6 | Fotografia da análise do layout em 2026-07-20, anterior às decisões posteriores | Movido integralmente para `historico/` e marcado como histórico |
| `IMPORTADOR_SINTETICO_V1.md` | 1 | Arquitetura e comportamento implementado do importador | Permanece como fonte da implementação; regras normativas ficam na especificação |
| `MANIFESTO_FISICO_PLANILHA_V1.md` | 1 | Contrato físico e relação com o manifesto JSON | Permanece como fonte principal |
| `METADADOS_SEGUROS_LAYOUT_PLANILHA.md` | 5 | Evidência segura e limites da inspeção do XLSX | Movido integralmente para `dados/` |
| `MODELO_FISICO_ATUAL.md` | 1 | Descrição humana completa do schema aplicado | Permanece como fonte principal; dump em `evidencias/` é a prova física |
| `PADRAO_DE_COMMITS.md` | 2 | Convenção de commits | Permanece; referenciado pelo workflow |
| `PROXIMOS_PASSOS.md` | 1 | Roadmap e bloqueios vigentes | Permanece como fonte principal |
| `RECUPERACAO_POSTGRESQL_DOCKER.md` | 2 | Procedimento de backup/restauração local | Permanece; referenciado pelo workflow e segurança |
| `REGISTRO_DE_ALTERACOES.md` | 6 | Histórico cronológico completo | Permanece sem fragmentação ou perda |
| `SEGURANCA_DE_DADOS.md` | 4 | Política normativa de dados e controles | Permanece como fonte principal |
| `THREAT_MODEL.md` | 4 | Ameaças, controles atuais e riscos residuais | Permanece como fonte principal |
| `VALIDACAO_ASSOCIACAO_PACIENTE_PROJETO.md` | 5 | Aceite histórico da migration 13 | Movido integralmente para `validacoes/` |
| `VALIDACAO_DADOS_DE_TESTE.md` | 5 | Aceite histórico do teste do núcleo inicial | Movido integralmente para `validacoes/` |
| `VALIDACAO_ENCAMINHAMENTO_AMPLIADO.md` | 5 | Aceite histórico da migration 16 | Movido integralmente para `validacoes/` |
| `VALIDACAO_ETAPA_4C.md` | 5 | Matriz e aceite da fundação backend | Movido integralmente para `validacoes/` |
| `VALIDACAO_EXAMES_POR_PACIENTE.md` | 5 | Aceite histórico da migration 14 | Movido integralmente para `validacoes/` |
| `VALIDACAO_MODELO_FISICO.md` | 6 | Validação da fotografia inicial de 25 tabelas | Movido integralmente para `validacoes/` e marcado como histórico |
| `VALIDACAO_MODULO_AVALIACAO_CLINICA.md` | 5 | Aceite histórico da migration 10 | Movido integralmente para `validacoes/` |
| `VALIDACAO_MODULO_IMPORTACAO_PROVENIENCIA.md` | 5 | Aceite histórico da migration 12 | Movido integralmente para `validacoes/` |
| `VALIDACAO_MODULO_NOTIFICACAO.md` | 5 | Aceite histórico da migration 11 | Movido integralmente para `validacoes/` |
| `VALIDACAO_TRATAMENTO_BENZONIDAZOL.md` | 5 | Aceite histórico da migration 15 | Movido integralmente para `validacoes/` |
| `WORKFLOW_DE_DESENVOLVIMENTO.md` | 2 | Rotina, comandos e checklists oficiais | Permanece como fonte principal |
| `decisoes-modelagem.md` | 7 | Placeholder vazio da estrutura inicial | Movido para `historico/`; sua existência e vazio continuam rastreáveis |
| `dicionario-dados.md` | 7 | Placeholder vazio da estrutura inicial | Movido para `historico/`; sua existência e vazio continuam rastreáveis |
| `evidencias/schema_atual_ambulatorio.sql` | 5 | Dump estrutural vigente, sem dados | Permanece inalterado como principal evidência física |

## Documentos que apontavam para outros documentos

O levantamento por busca global identificou referências cruzadas sobretudo em
`ESTADO_ATUAL_DO_PROJETO.md`, `PROXIMOS_PASSOS.md`,
`DECISOES_ARQUITETURAIS.md`, `REGISTRO_DE_ALTERACOES.md`, nas especificações e
nos próprios relatórios de validação. O `Makefile` também apontava para a
validação da Etapa 4C. Esses caminhos foram atualizados; menções cronológicas
continuam preservadas no registro de alterações, agora apontando para a
localização atual do mesmo arquivo.

## Consolidação e remoção

Não houve remoção de documento nem transferência de conteúdo único. A redução de
duplicação ocorreu na síntese do estado atual: lista física detalhada, política
incremental, roadmap, comandos, arquitetura e segurança continuam em suas fontes
principais e são apenas referenciados pela síntese. O conteúdo histórico dos
documentos movidos permaneceu textual e integralmente preservado.
