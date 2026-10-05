# Roadmap do Projeto

Atualizado em: 2026-10-04

**Reauditoria de 2026-10-05:** o aceite da Etapa 7 continua pendente, com sete
lacunas funcionais sem correção. A prioridade é concluir a recuperação de
escrita, a preservação de contexto/estados/confirmações e a paginação de
familiares, além do percurso integrado pela interface e da revisão com a equipe.
Evidências e limites estão no
[relatório do trabalho local](RELATORIO_DESDE_ULTIMO_COMMIT_2026_10_05.md).
As menções à validação de 2026-10-04 abaixo registram os cenários executados.

Este é o roadmap oficial do projeto. A estrutura original possui dez etapas;
as etapas 1–6 estão concluídas no ambiente sintético. Os fluxos 7A–7D estão
implementados e validados tecnicamente no ambiente sintético, com revisão de
usabilidade com a equipe pendente. As etapas 5, 6, 7, 9 e 10 possuem subetapas porque
contêm entregas independentes e dependências próprias. As letras identificam
subetapas de execução e não criam uma nova numeração principal.

As decisões de negócio vigentes estão em
[`dados/DECISOES_HUMANAS_NOVA_PLANILHA.md`](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md),
as lacunas por camada em
[`dados/COBERTURA_COLUNAS_PLANILHA.md`](dados/COBERTURA_COLUNAS_PLANILHA.md) e o
estado técnico em [`ESTADO_ATUAL_DO_PROJETO.md`](ESTADO_ATUAL_DO_PROJETO.md).
Prioridades P0–P3 são recomendações técnicas: P0 bloqueia o fluxo afetado, P1 é
necessária ao MVP, P2 é importante sem bloquear e P3 é pós-MVP.

## Etapa 1 — Fechar a camada de dados — concluída

**Objetivo:** chegar ao ponto em que a planilha possa ser interpretada
deterministicamente.

**Entrega realizada:** contrato físico `planilha → banco`, manifesto das duas
abas clínicas, 136 chaves semânticas, aliases, blocos, posições, identificação
de paciente, precedência entre abas, conflitos, idempotência, reprocessamento,
regras de transformação e exclusão funcional de `Localizado`.

**Evidências:** manifesto executável, especificação normativa e decisões humanas.

## Etapa 2 — Importador — concluída no contrato v1 sintético

**Objetivo:** produzir registros estruturados a partir de uma planilha sintética.

**Entrega realizada:** fixture sintética, leitura das duas abas, validação de
layout, lote/linha/proveniência, identificação de pacientes, atendimentos,
transformações, erros, revisão, idempotência e reprocessamento encadeado.

**Evolução posterior:** a homologação original não cobria integralmente as novas
respostas D1–D12. A Etapa 5 acrescentou reconciliação BZN, promoções controladas,
contratos aprovados e revisão temporal. A política não crítica continua restrita
ao catálogo explicitamente permitido; outros erros permanecem críticos por
padrão. Isso não reabre a Etapa 2 concluída nem autoriza inferir valores ambíguos.

## Etapa 3 — Fundação do backend — concluída

**Objetivo:** deixar de manipular o banco diretamente.

**Entrega realizada:** projeto NestJS, Docker, configuração por ambiente,
camada SQL parametrizada, migrations fora da API, autenticação, usuários,
perfis, erros padronizados, logging sem dados clínicos sensíveis e healthcheck.

**Limite da entrega original:** escrita clínica HTTP, importação e autorização
por paciente/atendimento foram acrescentadas na Etapa 5. A fundação não foi refeita.

## Etapa 4 — CRUD clínico — concluída na camada física, não na API

**Objetivo original:** refletir os fluxos clínicos necessários, sem criar um
endpoint por tabela.

**Entrega realizada:** núcleo físico e migrations até `sql/20`, incluindo
pacientes, atendimentos, dados clínicos, projetos, exames, BZN, reações,
encaminhamentos e notificações.

**Esclarecimento de escopo:** a entrega original concluía a camada física.
A implementação HTTP desses fluxos foi concluída na Etapa 5, sem atribuí-la
retroativamente à Etapa 4.

## Etapa 5 — Recursos funcionais e backend clínico do MVP

**Status:** 5A–5E concluídas no ambiente sintético em 2026-10-03. Provas,
limites e ativação controlada estão na [matriz de aceite](validacoes/ACEITE_INTEGRADO_ETAPA_5.md).

**Objetivo:** fechar o backend utilizável, incorporando as regras confirmadas e
os recursos necessários para a interface.

### 5A — Fechar contratos funcionais e invariantes (P0/P1)

**Avanço em 2026-09-22:** definido o
[contrato temporal de revisão entre hashes](arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md)
(ADR-022), distinguindo correção, nova visita e atualização consolidada. Em
2026-09-28, as respostas de [`Perguntas pendentes sobre campos e regras clínicas.md`](Perguntas%20pendentes%20sobre%20campos%20e%20regras%20cl%C3%ADnicas.md)
foram incorporadas como referência autoritativa para idade, Chagas, familiares,
exames e retorno de 30 dias. A implementação técnica desses contratos continua
separada da decisão clínica.

**Situação de aceite:** concluída para o ambiente sintético em 2026-10-03.
Respostas clínicas D1–D6, invariantes da ADR-022 e impactos foram conferidos
contra as fontes autoritativas e documentados. Por delegação expressa do
responsável, a competência de gestão foi definida como entitlement explícito por
usuário, provisionado externamente e independente do perfil `administração`;
gerir não concede autorização clínica por fonte. Migration 55, rotas e testes
sintéticos implementam e comprovam essa regra. Não resta decisão humana para
desbloquear a implementação sintética. Designar pessoas em ambiente real pertence
ao processo institucional de implantação e não habilita a revisão nesta etapa.

- **Objetivo:** congelar o escopo e resolver somente as ambiguidades que afetam implementação.
- **Principais alterações:** consolidar as respostas de idade, descoberta de Chagas, familiares, exames e retorno BZN; implementar as invariantes sem inferir fatos ausentes; manter ADR-022 e o backlog de contrarreferência nos limites aprovados.
- **Dependências:** schema/código existentes, implementação física restante e aceite técnico da ADR-022.
- **Critérios de aceite:** contratos decididos ou explicitamente adiados; nenhuma data inventada; nenhuma regra clínica inferida; modelo existente avaliado antes de propor migration.
- **Validação:** revisão com a equipe, matriz de impacto atualizada e `make docs-check`.

### 5B — Corrigir importador e reprocessamento (P0/P1)

**Status:** concluída no ambiente sintético; aceite integrado aprovado.
BZN consolidado é reconciliado sem duplicação, promoções aprovadas têm âncoras
explícitas e rollback, e dois elos de reprocessamento preservam proveniência.
D2 só preenche NULL capturado desde a base sem edição posterior, sob lock do
alvo; legado desconhecido/divergência/A→B→A são preservados. D3/D8 e retornos BZN
mantêm conversão seletiva e precisão correta. Manifesto, gerador, validador e
fixtures permanecem coerentes; valores ambíguos ficam no bruto.

A revisão entre hashes tem fluxo HTTP separado: fonte/autorização, dry-run sem
persistência, XLSX inteiro, aprovação seletiva, aplicação única e encerramento.
Não transforma hash novo em consulta. Migrations 21–62 completam armazenamento,
integridade, captura/proteção, criação de alvos e consistência do simulador.
A 63 concede somente três wrappers à role dedicada após o aceite integrado.
Código, casos F01–F16/T01–T18, logs e limites constam da
[matriz de aceite](validacoes/ACEITE_INTEGRADO_ETAPA_5.md).

- **Objetivo:** eliminar duplicação e perda de promoção nos fluxos já suportados.
- **Principais alterações:** reconciliar BZN consolidado por paciente; promover pendências resolvidas sem recriar alvos; separar erros críticos de não críticos; aplicar a política aprovada a arquivos revisados; atualizar metadados semânticos do gerador/manifesto/validador em conjunto.
- **Dependências:** a reconciliação BZN usa a unicidade existente; os demais itens dependem de 5A.
- **Critérios de aceite:** duas linhas compatíveis não violam unicidade nem duplicam tratamento; conflitos não sobrescrevem fatos; proveniência permanece íntegra; novo hash não é tratado automaticamente como nova consulta.
- **Validação:** testes unitários, fixture e E2E sintéticos com BZN repetido, conflito, pendência promovida e dois elos de reprocessamento.

### 5C — Completar modelagem indispensável (P1)

**Status:** concluída no ambiente sintético; aceite integrado aprovado.
Migrations 25/28 representam rastreio familiar triestado com resultados
identificados e data própria de descoberta de Chagas. A 61 habilita somente
captura prospectiva da descoberta, sem preencher legado ou inventar história.
Retornos, pendências e contrarreferências reutilizam estruturas existentes;
nenhuma tabela foi criada apenas pela palavra usada na pergunta. FKs,
permissões e integridade são comprovadas pelas suites SQL e instalação
limpa/incremental descritas na matriz de aceite.

- **Objetivo:** estruturar apenas fatos que o modelo atual não consegue representar.
- **Principais alterações:** migration incremental mínima para data de descoberta de Chagas e rastreio familiar, após 5A; não criar tabelas próprias para retornos, pendências ou contrarreferências apenas pela existência dessas palavras.
- **Dependências:** contratos de 5A; migrations antigas permanecem imutáveis.
- **Critérios de aceite:** ausência, negativo e desconhecido distinguíveis; resultado de familiar não vira histórico de doença; FKs, permissões e histórico preservados; nenhuma alteração física sem justificativa documentada.
- **Validação:** testes SQL sintéticos com `BEGIN`/`ROLLBACK`, `make db-test`, `make project-check` e dump somente se o schema mudar.

### 5D — Implementar recursos de consulta e importação (P1)

**Status:** concluída no ambiente sintético; aceite integrado aprovado.
Cadastro/consulta/edição de paciente completo e atendimentos, diagnóstico,
familiares, exames, BZN/reações/retornos, projetos, notificação, encaminhamentos,
contrarreferências múltiplas, fatos anuais e pendências têm fluxos de negócio.
Busca/filtros, coleções aninhadas e CSV seguem autorização por recurso e vínculo.
Importação multipart com worker separado e acompanhamento sanitizado de
lotes/erros estão implementados. Revisão XLSX passa por simulação, recebimento,
aprovação, aplicação e encerramento, sem acesso direto do usuário ao banco.
Artefatos técnicos são previamente registrados pelo mantenedor.
DTOs explícitos, SQL parametrizado, paginação e transações foram validados por
HTTP/SQL com os três perfis. A matriz de aceite relaciona os cenários e logs.

- **Objetivo:** entregar o backend funcional previsto na etapa original.
- **Principais alterações:** busca e filtros de pacientes; histórico de atendimentos; consultas de exames, projetos, tratamento, notificações e pendências; endpoint de importação; acompanhamento de lote e erros; exportação CSV; DTOs clínicos; autorização explícita por operação e recurso; transações compostas quando uma operação fizer várias gravações.
- **Dependências:** 5A–5C e fundação da Etapa 3. Não expor JSONB bruto nem criar API genérica de todas as tabelas.
- **Critérios de aceite:** cadastrar/consultar paciente completo por fluxo de negócio; filtros respeitam autorização; erros não vazam dados clínicos; importação e API preservam proveniência e histórico.
- **Validação:** testes unitários, contratos HTTP e integração API/SQL sintética, incluindo os três perfis existentes.

### 5E — Encerrar o backend do MVP (P1)

**Status:** concluída no ambiente sintético; aceite integrado aprovado.
Contratos HTTP `/v1`, DTOs de entrada/saída, paginação, erros sanitizados,
observabilidade técnica, controle de versão e autorização explícita por
operação/recurso estão consolidados. Operações compostas compartilham transação;
identidade, aplicação, importador e revisão mantêm capacidades separadas.
A 63 concede apenas os wrappers aprovados à role de revisão. Execução exige
opt-in sintético, staging e Git válido em development/test; padrão desligado e
produção recusada. O runner valida as permissões da migration, sem GRANT manual.
As provas incluem 401/403, revogação, rollback, duplicações, proveniência,
concorrência e paciente completo importado/consultável.

- **Objetivo:** consolidar a API antes do frontend.
- **Principais alterações:** revisão de DTOs, paginação, erros, autorização por paciente/atendimento, observabilidade técnica e documentação de contratos; endpoint de importação e CSV estabilizados.
- **Dependências:** 5D e decisões institucionais aplicáveis ao ambiente sintético.
- **Critérios de aceite:** backend cobre os fluxos do MVP sem acesso direto ao banco; operações indevidas retornam 401/403; contratos versionados e testes passam em banco descartável.
- **Validação:** `make backend-check`, integração HTTP/SQL, `make project-check` e revisão de diff.

**Marco da Etapa 5:** backend do MVP concluído no ambiente sintético, com planilha
processada sem duplicações indevidas, paciente completo consultável e aceite
integrado F01–F16/T01–T18 comprovado. Não equivale a implantação ou homologação real.

## Etapa 6 — Fundação do frontend

A [análise do Figma Make e plano de integração](arquitetura/ANALISE_INTEGRACAO_FIGMA_MAKE.md)
foi concluída em 2026-10-03. A fundação foi implementada e validada em
2026-10-04: aplicação própria em `frontend/`, com React/TypeScript, usando o
protótipo como referência visual e funcional. Sessão, rotas e consultas seguem
os contratos `/v1`. Bibliotecas e toolchain adotados estão em
[FRONTEND.md](FRONTEND.md) e no lockfile; a
[ADR-024](DECISOES_ARQUITETURAIS.md#adr-024) registra as fronteiras.

Este roadmap é a fonte da sequência e dos critérios de aceite. A análise mantém
o inventário, a matriz de compatibilidade e os detalhes técnicos de integração.
A evidência da execução está no
[relatório da Etapa 6](validacoes/VALIDACAO_ETAPA_6.md).

### 6A — Base técnica, sessão e navegação

**Status:** concluída no ambiente sintético em 2026-10-04; aceite documentado.

- **Objetivo:** criar a fundação do frontend consumindo somente a API existente.
- **Principais alterações:** diretório próprio, toolchain/lockfile, layout e
  componentes revisados, rotas reais, cliente HTTP `/v1`, login, `/auth/me`, saída
  e estados de erro. Separar sessão, consultas do servidor e rascunhos locais;
  preferir proxy de desenvolvimento e mesma origem na implantação.
- **Dependências:** Etapa 5E; ambiente sintético com schema compatível e política
  de acesso explícita. Não aplicar migrations no startup do frontend/backend.
- **Critérios de aceite:** login e identidade vêm do servidor; saída/401 limpam
  sessão e cache clínico; 403/429/503 têm tratamento compreensível; links diretos,
  voltar e recarregar funcionam. A interface não simula persistência ou autorização.
- **Validação:** acrescentar alvos de build/check do frontend ao Makefile e CI;
  executar build, testes dos fluxos de sessão e revisão manual de teclado/foco.
  Combinar verificações de outras camadas somente se forem alteradas.

### 6B — Busca e ficha em leitura

**Status:** concluída no ambiente sintético em 2026-10-04; aceite documentado.

- **Objetivo:** localizar pacientes e consultar os recursos já publicados.
- **Principais alterações:** busca por nome/sexo, paginação `limit`/`offset`,
  listagem com ID/nome, ficha carregada por recurso/aba, histórico de atendimento,
  Minha conta básica e início com atalhos. Reduzir a tabela ampla do protótipo aos
  campos disponíveis, sem consultas individuais para preencher cada linha.
- **Dependências:** 6A e contratos de leitura da Etapa 5E.
- **Critérios de aceite:** os três perfis consultam somente seu escopo; vazio,
  carregamento e erro são distintos; filtros/página ficam na URL; não inventar
  totais nem interpretar ausência na página como inexistência global.
- **Validação:** testes de componentes e integração sintética de busca/ficha,
  paginação, expiração e recusa por vínculo; revisão manual da navegação.

## Etapa 7 — Fluxos clínicos

**Estado:** 7A–7D implementadas e validadas tecnicamente no ambiente sintético em
2026-10-04. O [relatório da Etapa 7](validacoes/VALIDACAO_ETAPA_7.md) reúne as
provas, o recorte HTTP e as limitações. A revisão de usabilidade com a equipe
permanece pendente.

**Objetivo:** tornar utilizáveis as telas efetivamente usadas pela equipe.

Antes de cada formulário, conferir a matriz da análise: existir no schema ou no
importador não significa possuir contrato HTTP de consulta/escrita. Campos sem
suporte permanecem pendências explícitas; nenhuma entrada preenchida pode ser
silenciosamente descartada. Catálogos e extensões estritamente necessárias devem
ter contrato, autorização e validação próprios antes de integrar o fluxo afetado.

### 7A — Cadastro e atendimentos

- **Objetivo:** permitir localizar pacientes e registrar atendimentos básicos.
- **Principais alterações:** busca prévia, cadastro/edição de paciente,
  criação/edição versionada de atendimento, dados demográficos, contatos/endereço,
  idade calculada com referência visível e histórico básico.
- **Dependências:** 6A–6B, Etapa 5E e contratos de 5A.
- **Critérios de aceite:** paciente pode ser consultado e editado conforme perfil;
  cadastro também respeita a política clínica do ambiente. Nome é obrigatório;
  nascimento/sexo seguem a opcionalidade da API. Idade não é digitada como fato
  independente; contatos/endereço anteriores são preservados; PATCH usa a versão
  original e 409 não provoca sobrescrita automática. Não fundir possíveis duplicados.
- **Validação:** testes de componentes e integração sintética de paciente/atendimento,
  incluindo validação, recusa por vínculo e edição concorrente.

### 7B — Dados clínicos e exames

- **Objetivo:** registrar os dados clínicos e exames necessários ao atendimento.
- **Principais alterações:** avaliação clínica, diagnóstico/descoberta de Chagas,
  exames trazidos e solicitados, familiares identificados e resultados, pendências
  da criação e preservação de ausências/estados desconhecidos. Criar núcleo e
  filhos aceitos do atendimento na mesma requisição transacional.
- **Dependências:** 7A; contratos e migrations da Etapa 5C já validados, aplicados
  no ambiente sintético apropriado; consulta de catálogos ativos antes dos selects.
  Definir o recorte de sorologias, condições/comorbidades, dispositivos/eventos/óbito,
  medicamentos e resultados detalhados ainda sem HTTP; não prometer cobertura total
  do protótipo antes dessa avaliação.
- **Critérios de aceite:** descoberta não vira data de sorologia; exame solicitado
  não exige resultado; exame genérico é identificado; familiar examinado não vira
  histórico de doença; nenhum campo preenchido se perde. Edição do núcleo não é
  apresentada como edição de filhos que o PATCH atual não suporta.
- **Validação:** testes de formulário/API com casos positivos, negativos, vazios e
  ambíguos, usando somente dados sintéticos.

### 7C — Tratamento, retornos e encaminhamentos

- **Objetivo:** implementar os fluxos clínicos de BZN e comunicação assistencial.
- **Principais alterações:** BZN/reações na criação do tratamento, retornos de
  30 dias/final efetivamente realizados, retornos anuais, ano informado separado
  de visita, projetos, notificação, encaminhamento, contrarreferências repetíveis
  e pendências por paciente. Operações posteriores ao atendimento têm confirmação
  própria, com indicação do que já foi salvo e do que permanece em rascunho.
- **Dependências:** 7A–7B, contrato temporal de D6–D11, APIs da Etapa 5 e catálogos
  ativos de projetos/tipos de encaminhamento. Edição de BZN existente, reação
  isolada, exame/encaminhamento existente e observação/responsável de revisão de
  pendência exigem contratos específicos; não improvisar com criação duplicada.
  Contrarreferência avançada e upload permanecem fora do escopo atual.
- **Critérios de aceite:** datas são comparecimentos efetivos; 30/60 dias não são
  calculados automaticamente; ano isolado não fabrica visita; histórico não é
  substituído; BZN permanece único; projetos/notificação respeitam o contexto do
  paciente e os estados desconhecidos. Pendência resolvida exige data;
  `Localizado` não aparece funcionalmente.
- **Validação:** testes de componentes e integração com múltiplos retornos,
  contrarreferências e conflitos de autorização.

### 7D — Integração do fluxo clínico

- **Objetivo:** comprovar que os módulos formam um atendimento utilizável.
- **Principais alterações:** navegação entre ficha, atendimento, exames, BZN,
  encaminhamento, notificação e histórico; mensagens de erro, estados de carga,
  proteção de rascunhos e recuperação após falha entre operações.
- **Dependências:** 7A–7C e contratos HTTP estabilizados.
- **Critérios de aceite:** fluxo principal completo sem acesso direto ao banco;
  dados permanecem rastreáveis e o usuário não perde alterações válidas.
  Consulta não escreve; 401/403/409 não produzem sucesso fictício; falha de rede
  após escrita exige verificação, sem retry automático nem duplicação do atendimento.
- **Validação:** fluxo end-to-end sintético, revisão de usabilidade com a equipe e
  `make project-check`.

## Etapa 8 — Dashboard e funcionalidades complementares

- **Objetivo:** oferecer visão operacional pequena e útil.
- **Principais alterações:** CSV de pacientes, acompanhamento sanitizado de lotes,
  upload/simulação e reenvio idempotente sintéticos, inconsistências efetivamente
  expostas e ajustes de UX. Indicadores e filtros adicionais entram somente após
  definição e contrato agregado; até lá, o início da 6B pode oferecer atalhos.
- **Dependências:** Etapas 5–7; métricas e população autorizada aprovadas; habilitação
  sintética explícita das portas operacionais. Fila global de pendências, gestão
  de usuários e relatório rico de simulação não possuem contrato atual e exigem
  priorização própria. Criar novo elo de reprocessamento usa `--reprocessar` na CLI;
  `POST /importacoes` não expõe essa opção. Um botão para esse fluxo exigiria
  evolução HTTP justificada; revisão entre arquivos alterados continua separada.
- **Critérios de aceite:** indicadores têm definição verificável e não são
  calculados de páginas parciais; CSV explicita filtros/página e respeita os três
  perfis autorizados; lotes respeitam seu escopo e não expõem JSONB bruto.
  Simulação não grava; confirmação revalida; reenvio mostra o lote efetivo;
  progresso/contagens não são inventados.
- **Validação:** testes de interface/API, revisão com dados sintéticos e análise
  de permissões, exportação, simulação e idempotência.

## Etapa 9 — Produção

**Objetivo:** executar a aplicação fora do notebook com controles institucionais.

### 9A — Ambiente e implantação

- **Objetivo:** disponibilizar instalação reproduzível de produção.
- **Principais alterações:** servidor, Docker Compose/configuração equivalente,
  configuração por ambiente, roles PostgreSQL, permissões e healthchecks.
- **Dependências:** Etapa 8 e arquitetura de implantação escolhida.
- **Critérios de aceite:** aplicação sobe em ambiente controlado sem comandos
  privados do autor; migrations seguem o procedimento incremental correto,
  distinguindo evidência persistente 00–20 dos incrementos validados em descartáveis.
- **Validação:** `make docker-project-check` e teste de reinício/recuperação.

### 9B — Segurança de transporte e segredos

- **Objetivo:** proteger comunicação, credenciais e dados estruturados/brutos.
- **Principais alterações:** HTTPS, gestão/rotação de segredos, roles mínimas,
  permissões, proteção do JSONB e revisão da exposição da API/frontend. Planejar
  evolução explícita e testada dos bloqueios atuais de produção para acesso
  clínico/importação/revisão; não contorná-los alterando `NODE_ENV`.
- **Dependências:** 9A e decisões institucionais de identidade e acesso.
- **Critérios de aceite:** nenhum segredo versionado; transporte seguro; JSONB
  não acessível por rotas genéricas; acesso indevido retorna 401/403.
- **Validação:** checklist de segurança e testes de autorização isolados.

### 9C — Continuidade e observabilidade

- **Objetivo:** permitir recuperação e investigação de falhas.
- **Principais alterações:** backup, restore, logs técnicos, auditoria mínima,
  retenção, tratamento de falhas e alertas operacionais.
- **Dependências:** 9A–9B e política institucional de retenção/auditoria.
- **Critérios de aceite:** backup restaura em ambiente isolado; logs não contêm
  dados clínicos sensíveis; falhas são rastreáveis.
- **Validação:** backup/restore repetido, inspeção de logs e simulação de falha.

### 9D — Liberação controlada

- **Objetivo:** verificar que a operação está autorizada antes de dados reais.
- **Principais alterações:** responsáveis por lotes, revisão de incidentes,
  E2E sintético, plano de migração e decisão formal de liberação.
- **Dependências:** 9A–9C e governança institucional aprovada.
- **Critérios de aceite:** controles verificados, autorização explícita registrada
  e nenhum dado real processado prematuramente, inclusive em simulação.
  Arquivos, backups e credenciais permanecem fora do Git; acesso, retenção,
  recuperação e responsáveis estão definidos antes do piloto autorizado.
- **Validação:** `make docker-project-check`, E2E, restore e revisão operacional.

## Etapa 10 — Homologação e estabilização

**Objetivo:** fechar o MVP sem adicionar funcionalidades grandes.

### 10A — Homologação funcional

- **Objetivo:** testar com usuários os fluxos definidos nas Etapas 5–8.
- **Principais alterações:** roteiro de uso, piloto e importação completa autorizados,
  pacientes, atendimentos, exames, BZN, retornos, encaminhamentos, dashboard e CSV.
- **Dependências:** Etapas 5–9 e dados sintéticos ou autorizados conforme 9D.
- **Critérios de aceite:** usuários completam o fluxo principal e registram
  evidências sem acessar o banco diretamente. Reconciliar contagens, amostras,
  campos promovidos, conteúdo preservado e pendências antes de ampliar o piloto;
  dados importados não são declarados consultáveis/editáveis sem suporte HTTP.
- **Validação:** sessões de homologação, E2E e registro de casos aceitos/rejeitados.

### 10B — Correções e regressão

- **Objetivo:** corrigir bugs sem ampliar o escopo congelado.
- **Principais alterações:** duplicações, permissões, validações, backup/restore,
  dashboard, CSV, mensagens e problemas encontrados em 10A.
- **Dependências:** evidências da homologação e triagem de severidade.
- **Critérios de aceite:** defeitos críticos resolvidos; nenhuma correção remove
  histórico, enfraquece autorização ou inventa regra clínica.
- **Validação:** regressão completa, testes focados e revisão do diff.

### 10C — Entrega reproduzível

- **Objetivo:** permitir que outra pessoa instale e opere o sistema.
- **Principais alterações:** instalação reproduzível, configuração, backup/restore,
  documentação operacional, roteiro de suporte e material de entrega.
- **Dependências:** 10B, ambiente da Etapa 9 e documentação atualizada.
- **Critérios de aceite:** instalação limpa e restauração executáveis por outra
  pessoa sem comandos privados do autor.
- **Validação:** execução por operador diferente, `make project-check` e revisão
  documental.

### 10D — Release do MVP

- **Objetivo:** formalizar a versão entregue e seu estado conhecido.
- **Principais alterações:** revisão final de segurança, changelog, tag/release,
  lista de limitações e aceite formal da equipe.
- **Dependências:** 10A–10C e aprovação institucional.
- **Critérios de aceite:** versão identificada, documentação e limitações publicadas,
  aceite registrado e nenhum trabalho fora do escopo apresentado como concluído.
- **Validação:** regressão final, `make project-check`, checklist de release e
  conferência de `git status` antes do commit/tag.

## Congelamento de escopo do MVP

Ficam fora das dez etapas do MVP: `Localizado` como funcionalidade, abas AIM3,
aba operacional, migração das estruturas legadas, funcionalidades avançadas de
contrarreferência, dashboards sofisticados, regras clínicas adicionais,
otimizações prematuras, aplicativo mobile e refinamentos estéticos não essenciais.

Upload de contrarreferência é P2 proposto e depende de decisão sobre representação,
estado, armazenamento, retenção e momento de entrega. Se for indispensável ao
primeiro uso, deve ser promovido explicitamente antes da Etapa 8, com revisão de
segurança; não se presume essa promoção.

Para compromisso de dez semanas, 24 horas semanais é a referência recomendada;
20 horas é piso arriscado. O marco de risco é concluir a Etapa 5 com banco,
importador e backend funcionais antes de iniciar as Etapas 6–8.

## Próximo trabalho

A Etapa 5 está concluída no ambiente sintético, com evidências na
[matriz de aceite](validacoes/ACEITE_INTEGRADO_ETAPA_5.md). **6A–6B estão
concluídas no ambiente sintético**, com evidências no
[relatório da Etapa 6](validacoes/VALIDACAO_ETAPA_6.md): base própria, sessão e
leitura pelas APIs atuais. **7A–7D estão implementadas e validadas tecnicamente**,
com evidência sintética registrada no
[relatório da Etapa 7](validacoes/VALIDACAO_ETAPA_7.md). A revisão de
usabilidade com a equipe ainda precisa ocorrer antes do aceite institucional.

O próximo desenvolvimento previsto é a Etapa 8, com definição dos indicadores e
contratos necessários antes do dashboard. Métricas, fila global e gestão de
usuários não entram automaticamente por aparecerem no protótipo. A Etapa 7
acrescenta catálogos ativos, capacidade de cadastro e validações estritamente
necessárias aos formulários, sem alterar banco persistente, migrations ou
protótipo. O [recorte clínico](arquitetura/RECORTE_CLINICO_ETAPA_7.md) explicita
os campos e as operações ainda sem HTTP. Etapas 8–10 exigem execução futura;
upload avançado e planejamento D9 não foram antecipados. Dados reais seguem a
liberação 9D, sem confundir viabilidade do importador com autorização de uso.

### Preparação da migração da planilha real

A preparação pode ocorrer em paralelo à construção do frontend, sem exigir a
reprodução completa do protótipo. A importação utiliza o importador existente;
o frontend consulta as projeções publicadas pela API. Executar a carga real
continua condicionado a 9D e à homologação controlada de 10A.

- **Mapeamento:** produzir uma matriz `campo da planilha → manifesto/importador →
  destino estruturado ou proveniência → API → tela`, partindo da
  [cobertura de colunas](dados/COBERTURA_COLUNAS_PLANILHA.md). Distinguir campos
  promovidos, preservados sem interpretação, excluídos funcionalmente e sem HTTP;
  não alterar regra clínica ou schema apenas para preencher uma tela do protótipo.
- **Ensaio sintético:** validar layout, formatos, ambiguidades, identidade,
  duplicações, idempotência, proveniência e conciliação em ambiente descartável
  compatível. Definir resultados esperados e roteiro de recuperação antes do piloto.
- **Prontidão operacional:** definir ambiente e plano incremental de migrations,
  responsáveis, acessos, segredos, localização dos arquivos fora do Git,
  retenção/auditoria e backup/restore conforme a
  [política de dados](SEGURANCA_DE_DADOS.md). Registrar a liberação explícita.
- **Execução posterior:** após 9D, simular e executar piloto autorizado, verificar
  resultados e ampliar somente após aceite. Não usar portas HTTP sintéticas ou
  flags de desenvolvimento como atalho para dados reais.

Entregas esperadas desta preparação: matriz de cobertura, roteiro sintético de
migração/conciliação, plano operacional e lista de lacunas HTTP priorizadas.
Nenhuma planilha real é lida ou importada nesta revisão documental.

## Validação da revisão documental de 2026-09-14

Esta atualização altera somente documentação. Foram lidos os AGENTS.md relevantes,
o workflow de desenvolvimento, as respostas integrais do DOCX e o estado executável
do repositório. Validar com `make docs-check`, `make manifest-check` e
`git diff --check`; `make project-check` não foi executado naquela revisão por
incluir testes SQL com escrita transacional. No incremento BZN de 2026-09-15,
`make project-check` foi executado antes e depois da implementação, além de
`make importer-test` e `make manifest-check`.
