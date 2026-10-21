# Estado Atual do Projeto

Atualizado em: 2026-10-21

Esta é a síntese vigente. Contratos pertencem às fontes temáticas; o histórico
cronológico está no [registro](REGISTRO_DE_ALTERACOES.md) e na
[continuidade da Etapa 5](validacoes/CONTINUIDADE_ETAPA_5.md).

**Continuidade de 2026-10-21 — U4.1:** navegação compacta em tela menor,
sidebar desktop, identidade no cabeçalho, foco ao fechar/navegar/redimensionar,
conta e recuperação de erros receberam implementação e validação técnica
(11 cenários finais de navegador aprovados). O relatório
[U4.1](validacoes/VALIDACAO_7D_U4_1.md) distingue provas reais sintéticas,
falhas simuladas e limites. U4.2, cadastro/atendimento por etapas, revisão clínica
e fidelidade visual integral permanecem sujeitos aos próprios aceites.

**Continuidade de 2026-10-20:** U3.3 implementa retorno do detalhe à ficha com
aba/seleção/páginas, histórico com contexto e exames da página agrupados em
trazidos/solicitados com expansão na URL. Links do detalhe abrem as áreas
canônicas do paciente sem atribuir seus estados atuais a consultas passadas.
Cabeçalho e último atendimento receberam composição mais compacta. Evidências e
limites estão na [validação U3.3](validacoes/VALIDACAO_7D_U3_3.md), com aceite
técnico encerrado em 21/10: build, componentes e rodada focada de 13 cenários
UI/API/PostgreSQL aprovados.
Isso não conclui os demais pacotes de experiência, a fidelidade visual integral
ou o aceite clínico da Etapa 7.

**Continuidade de 2026-10-17:** adicionada demonstração sintética isolada por
`make dev-sintetico-start/status/stop`, com instruções no
[frontend](FRONTEND.md#demonstração-sintética-isolada). Corrigidos dois casos de
interrupção na preparação de salvamentos. A integração clínica, fundação e SQL
foram novamente validadas em servidor descartável; os resultados e limites estão
na [continuidade técnica](validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-17--execução-autônoma-e-ambiente-sintético).

A [unidade U3.1](validacoes/VALIDACAO_7D_U3_1.md) recebeu implementação e
validação técnica: cabeçalho e último atendimento independentes da paginação,
tipos de data desconhecida e desempate numérico. A
[auditoria de ordenação](validacoes/VALIDACAO_ORDENACAO_IDENTIFICADORES.md)
corrigiu também pendências, reações e lotes; 70 testes clínicos passaram.
Uma seleção incorreta de ambiente durante validação SQL atingiu o Docker padrão
com transações revertidas e possível avanço de sequências; a ocorrência está
registrada no relatório U3.1. Não houve aplicação de migrations nesse ambiente.

A [unidade U3.2](validacoes/VALIDACAO_7D_U3_2.md) também passou na validação
técnica: abas de diagnóstico/avaliação por consulta escolhida explicitamente,
com seleção na URL, paginação própria e dados ausentes sem herança entre visitas.
O frontend possui 163 unitários aprovados; os novos percursos passaram com API
real, incluindo revogação de vínculo durante paginação.

**Continuidade de 2026-10-15:** o aceite integral da Etapa 7 permanece pendente.
As sete lacunas da reauditoria receberam correções; o percurso clínico original
passou integralmente pela interface. A regressão técnica foi concluída; a revisão
de usabilidade com a equipe ainda é necessária. O
[relatório vigente](validacoes/VALIDACAO_ETAPA_7.md) reúne as evidências novas;
o [relatório de 05/10](RELATORIO_DESDE_ULTIMO_COMMIT_2026_10_05.md) é histórico.
Os [pacotes do roadmap](PROXIMOS_PASSOS.md#pacotes-verificáveis-do-produto-frontend)
definem decisões e aceites próprios para a evolução de UX/VU1.

## Escopo e estágio

Etapas 1–4 concluídas. **Etapa 5 (5A–5E) concluída no ambiente sintético em
2026-10-03**, incluindo o aceite integrado e a ativação controlada.
Implementação, importador, recursos clínicos e provas F01–F16/T01–T18 são
relacionados na [matriz de aceite](validacoes/ACEITE_INTEGRADO_ETAPA_5.md).
**Etapa 6 (6A–6B) concluída no ambiente sintético em 2026-10-04**: aplicação
própria em `frontend/`, sessão em memória, navegação e leitura pela API `/v1`.
Setup e contratos estão em [FRONTEND.md](FRONTEND.md); a matriz de evidências
está em [VALIDACAO_ETAPA_6.md](validacoes/VALIDACAO_ETAPA_6.md). **Etapa 7
(7A–7D) com implementação e validação técnica sintética concluídas no recorte original em 2026-10-15**,
com evidências em [VALIDACAO_ETAPA_7.md](validacoes/VALIDACAO_ETAPA_7.md).
O aceite clínico com a equipe permanece pendente. Etapas 8–10 permanecem futuras.

A [avaliação do protótipo Figma Make](arquitetura/ANALISE_INTEGRACAO_FIGMA_MAKE.md)
foi concluída em 2026-10-03, com inventário, compatibilidade HTTP e plano das
Etapas 6–8. A fundação implementada usa React/TypeScript e apresentação revisada,
preservando arquitetura e regras existentes. A análise mantém a fotografia do
planejamento original; o [roadmap](PROXIMOS_PASSOS.md#etapa-6--fundação-do-frontend)
continua definindo sequência e critérios de aceite. Os formulários seguem o
[recorte clínico da Etapa 7](arquitetura/RECORTE_CLINICO_ETAPA_7.md), com suporte
HTTP explícito para cada campo editável. A
[visão de produto](frontend/VISAO_E_ESPECIFICACAO.md) e a
[matriz Figma/frontend](frontend/MATRIZ_FIGMA_FRONTEND.md), de 05/10, sucedem a
fotografia anterior para experiência pretendida, inventário e diferenças atuais.
O próximo marco é concluir a revisão clínica da Etapa 7.
Os novos pacotes de UX e complementos operacionais mantêm priorização própria.

As respostas de [campos e regras clínicas](Perguntas%20pendentes%20sobre%20campos%20e%20regras%20cl%C3%ADnicas.md)
são autoritativas: idade derivada do nascimento, descoberta de Chagas distinta da
sorologia, familiares identificados com resultado, exames identificados e retorno
BZN ligado ao comparecimento real. Não há decisão humana pendente no escopo
sintético já aprovado da 5A. A nova proposta de produto possui decisões P-01–09
explicitamente pendentes, sem reabrir respostas clínicas aprovadas. A governança
delegada da 5A exige entitlement nominal para gestão,
independente do perfil administrativo e da autorização clínica por fonte.
Designar pessoas e operar com dados reais pertencem à implantação posterior.

## Componentes vigentes

- PostgreSQL, schema `ambulatorio`. O ambiente persistente continua representado
  pelas migrations 00–20 e pelo [dump aplicado](evidencias/schema_atual_ambulatorio.sql),
  com 38 tabelas. Ele não foi alterado nesta execução.
- As migrations incrementais da Etapa 5 foram desenvolvidas e validadas apenas
  em bancos descartáveis. O [modelo físico](MODELO_FISICO_ATUAL.md) distingue
  explicitamente essa implementação do ambiente persistente.
- Importador Python v1.7.0 e manifesto semântico v1.4: reconciliação BZN,
  promoção seletiva, criticidade conservadora, idempotência, dois elos de
  reprocessamento, captura/proveniência e relatórios sanitizados.
- Backend NestJS/TypeScript com autenticação JWT, DTOs explícitos, operações de
  negócio, SQL parametrizado, transações e controle de versão. O contrato é
  `/v1`, com aliases compatíveis sem prefixo e recusa de versões inexistentes.
- Frontend React/TypeScript com Vite, React Router e TanStack Query. Sessão e
  cache clínico separados; token em memória, identidade por `/auth/me`, busca
  nome/sexo, ficha/histórico e formulários clínicos 7A–7D. Rascunhos separados do
  cache, versões originais, conflitos com comparação explícita e confirmação por
  operação, com recuperação e preservação de recibos ainda parciais conforme R7.
  A referência Figma Make não integra o build; gestão administrativa
  permanece em etapa posterior.
- A configuração de CI contempla manifesto, importador, SQL, backend, runner
  clínico e frontend (build, unitários e Chromium/API/PostgreSQL descartável).
  Há alvos Make com `COMPACT=1`; a CI remota ainda não foi executada nesta entrega.

## Recursos clínicos e autorização

A API cadastra, consulta e edita o paciente completo; calcula idade com referência;
cria, consulta e edita atendimentos; registra diagnóstico/descoberta, familiares,
exames identificados, BZN/reações e retornos reais, projetos, notificação,
encaminhamentos, contrarreferências múltiplas, fatos/retornos anuais e pendências.
Busca, filtros, coleções aninhadas e CSV seguem a mesma autorização por vínculo;
CSV neutraliza fórmulas. Consultas de lotes/linhas retornam DTOs paginados e códigos
técnicos, sem JSONB bruto ou mensagens clínicas de processamento.

Os formulários consultam catálogos ativos paginados de exames, projetos e tipos
de encaminhamento. A capacidade de cadastro respeita a política clínica e os
perfis sem revelar pacientes/vínculos. Resolução de pendência exige data explícita;
retorno exige comparecimento efetivo e não aceita data futura. Contratos e áreas
sem HTTP estão no recorte da Etapa 7. A migration 64 acrescenta o ledger de
correlação somente nos bancos descartáveis desta entrega; banco persistente e
evidência física versionada permanecem preservados.

Perfis `consulta`, `edicao` e `administracao` têm operações explícitas. Autenticação
não concede vínculo ao paciente; administração também não concede entitlement
ou autorização temporal automaticamente. A política clínica é desabilitada por
padrão. Escritas compostas usam a mesma transação e contexto confiável do ator.
Pools/credenciais de identidade, aplicação, importador, revisão e gestão têm
capacidades separadas. O importador não lê identidade nem snapshots de auditoria.

## Importação e revisão temporal

A CLI exige finalidade explícita e mantém a recusa de revisão entre hashes;
a revisão tem fluxo HTTP separado de fonte, autorização, simulação, recebimento
XLSX, aprovação seletiva, aplicação e encerramento. Manifesto/transformações são
artefatos imutáveis registrados pelo mantenedor. Hash novo não equivale a visita
nova; identidade de ocorrência é explícita. Dry-run não grava tabelas/sequências.
O POST ordinário permite importação/reenvio idempotente, sem expor a opção
`--reprocessar` da CLI para criar novo elo encadeado.

A captura mínima ativa abrange ano D8, data/observação do atendimento e descoberta
D2. Todos esses escritores geram histórico ou são recusados. Correções exigem
cobertura comprovada desde a base; igualdade, marco atual e NULL legado não a
fornecem. Promoção D2 bloqueia o diagnóstico antes da prova: só preenche NULL
importado da linha-base sem evento posterior. Edição concorrente A→B→A permanece
intacta. A ausência de coluna de observação nos dois arquivos é representada
explicitamente no plano de criação, com catálogo e transformação fechados.

A aplicação revalida fonte, decisão, autorização e tokens sob locks. Falha tardia
reverte clínica, histórico, proveniência e sucesso; diagnóstico técnico é gravado
em transação posterior. Repetição/retomada reutiliza IDs e a origem antiga não
restaura correções. Visitas distintas na mesma data não são fundidas; ano isolado
não fabrica dia, visita ou quantidade de comparecimentos.

As portas HTTP de importação/revisão ficam desligadas por padrão e recusam
produção. A ativação sintética de execução foi validada em `development`/`test`,
com opt-in, staging, Git válido e permissões dedicadas da migration 63. Não há
aplicação das novas migrations nem ativação no banco persistente.

A [preparação da migração real](PROXIMOS_PASSOS.md#preparação-da-migração-da-planilha-real)
pode avançar com mapeamento e ensaios sintéticos em paralelo ao frontend. Execução
real depende da liberação 9D, do ambiente compatível e dos controles institucionais;
campos importados sem HTTP continuam sem consulta/edição pela interface.

## Validação e limites

A análise documental de 05/10 partiu de `29b3186` e status limpo, preservando o
código. Houve inspeção estática e Chromium do protótipo/aplicação com respostas
HTTP interceptadas e dados sintéticos; as [capturas e observações](frontend/visuais/README.md)
comprovam apenas composição/transições e defeitos indicados, sem API/banco reais.
Não houve nova execução de suítes clínicas, migrations ou atualização do dump.
Documentação, rastreabilidade, links, diagramas e diff foram conferidos.

A Etapa 6 passou instalação limpa pelo lockfile, build TypeScript/Vite,
47 testes de sessão/componentes, oito E2E Chromium/API/PostgreSQL e nove testes
de workflow. A revisão incluiu teclado/foco, contraste automatizado, zoom/reflow
e telas de 390/320 px. Comandos, evidências e limites estão no
[relatório próprio](validacoes/VALIDACAO_ETAPA_6.md). Na rodada histórica de
04/10, a Etapa 7 passou build do
frontend/backend,
106 testes de componentes, 92 unitários/de contrato do backend, oito de fundação
e 51 clínicos HTTP, 30 cenários Chromium/API/PostgreSQL, 34 testes SQL e nove
testes do workflow. O
[relatório da Etapa 7](validacoes/VALIDACAO_ETAPA_7.md) concentra as evidências,
incluindo os resultados atuais de 15/10 e suas falhas intermediárias.

Evidências anteriores da Etapa 5: instalação limpa 02–63 e atualizações
incrementais 60→61→62→63 aprovadas.
A rodada final passou 34 testes SQL, manifesto, 34 unitários e E2E do importador,
build, 53 unitários/de contrato do backend, oito de fundação e 38 clínicos HTTP.
As provas de concessão, recusa e reversão operacional estão incluídas; os testes
da fundação não substituem as provas HTTP dos recursos clínicos. Logs e falhas
intermediárias estão na continuidade. O CI foi atualizado, mas não executado
remotamente nesta entrega.

Nove rótulos parciais preservam conteúdo sem interpretação inequívoca. NULL
legado sem cobertura, ocorrência sem identidade e texto ambíguo seguem preservados
ou bloqueados, como exige o contrato. Essa recusa não autoriza reconstrução de
histórico. `Localizado` continua excluído do estruturado, separado da localização
do prontuário. Planejamento D9 não produz comparecimento; upload avançado de
contrarreferência permanece no backlog aprovado. Não há nova regra clínica inferida.

Dados reais, implantação, TLS/segredos/backup/retenção e homologação institucional
não fazem parte desta execução. A revisão de usabilidade com a equipe clínica
permanece pendente. Os formulários 7A–7D e a recuperação estão implementados;
isso não declara aceite clínico ou dos novos pacotes de UX/VU1. O backlog e as próximas etapas
estão em [PROXIMOS_PASSOS.md](PROXIMOS_PASSOS.md); regras e workflow estão no
[índice da documentação](README.md).
