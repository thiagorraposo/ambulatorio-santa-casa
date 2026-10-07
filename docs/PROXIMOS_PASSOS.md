# Roadmap do Projeto

Atualizado em: 2026-10-05

**Reauditoria de 2026-10-05:** o aceite da Etapa 7 continua pendente, com sete
lacunas funcionais sem correção. A prioridade é concluir a recuperação de
escrita, a preservação de contexto/estados/confirmações e a paginação de
familiares, além do percurso integrado pela interface e da revisão com a equipe.
Evidências e limites estão no
[relatório do trabalho local](RELATORIO_DESDE_ULTIMO_COMMIT_2026_10_05.md).
As menções à validação de 2026-10-04 abaixo registram os cenários executados.

Este é o roadmap oficial do projeto. A estrutura original possui dez etapas;
as etapas 1–6 estão concluídas no ambiente sintético. Os fluxos 7A–7D possuem
implementação e validação
parcial no ambiente sintético; sete lacunas e o percurso integrado impedem
conclusão com aceite. A revisão com a equipe também permanece pendente.
As etapas 5, 6, 7, 9 e 10 possuem subetapas porque
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
a fotografia histórica e os detalhes técnicos de integração. O inventário atual
está na [matriz ponto a ponto](frontend/MATRIZ_FIGMA_FRONTEND.md) e a experiência
pretendida na [visão de produto](frontend/VISAO_E_ESPECIFICACAO.md).
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

**Estado:** 7A–7D têm implementação e validação parcial sintética de 2026-10-04.
O [relatório da Etapa 7](validacoes/VALIDACAO_ETAPA_7.md) reúne provas dos cenários
executados. As sete lacunas reavaliadas, o percurso integrado e a revisão com a
equipe continuam pendentes; os pacotes abaixo definem o caminho até o aceite.

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
- **Validação:** fluxo UI/API/PostgreSQL sintético, revisão com a equipe e
  `make frontend-check docs-check COMPACT=1`; combinar backend/SQL somente se
  alterados, conforme a matriz do workflow e os pacotes abaixo.

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

## Pacotes verificáveis do produto frontend

Esta decomposição de 2026-10-05 preserva as dez etapas e as subetapas 7A–7D.
Sufixos `R` corrigem a reauditoria, `U` explicitam a experiência e `E` estendem
recursos clínicos. `8A`–`8D` organizam complementos da Etapa 8, sem criar etapas
principais novas. `B` é contrato/persistência, `U` é interface e `D` é decisão/
desenho. As [linhas da matriz](frontend/MATRIZ_FIGMA_FRONTEND.md) ligam elemento
FM e requisito RQ aos pacotes abaixo; a [visão](frontend/VISAO_E_ESPECIFICACAO.md)
define VU1/MVP/VP/EX e decisões P-01–09. Destino posterior não é exclusão.

**Estado:** código correspondente presente é implementação, relatórios antigos
são validação parcial dos seus cenários, contrato/decisão ausente é dependência
identificada, e conclusão exige aceite do pacote. Nenhum pacote novo de código
foi implementado/aceito por esta análise. `DOC-EX` registra disposição documental.
7A–7D mantêm sete lacunas abertas; revisão de usabilidade e prova integrada também
faltam. Não avançar para dashboard como se esse aceite já estivesse dado.

**Unidade de entrega:** onde um ID agrega unidades `.1`, `.2` etc., abrir trabalho,
revisar, validar e aceitar cada unidade separadamente. Os critérios nomeiam a
unidade; a âncora do conjunto só conclui quando todas as unidades do destino
aprovado concluírem. Uma unidade posterior pode permanecer planejada/VP, sem
impedir o aceite de outra; isso deve constar do registro de aceite e do destino
individual na matriz. Usar o ID completo da unidade (por exemplo, `7D-U3.2`)
nos trabalhos e evidências, sem renumerar o conjunto. Nenhum conjunto deve virar PR monolítica ou tarefa
“finalizar frontend”. Reutilizar componentes/infraestrutura não dispensa prova
do recurso que grava.

**Condição de conclusão de cada entrega:** escopo delimitado implementado (ou
decisão/documento aprovado nos pacotes D), todos os critérios da unidade abaixo
comprovados, documentação/contrato atualizado, evidência identificando RQ,
ambiente, cenário, IDs sintéticos e resultado, limitações residuais explícitas e
aceite registrado. Falha pertinente não resolvida ou decisão obrigatória aberta
impede conclusão. Build/rota/formulário/suíte geral não substituem esse aceite.
Para unidades de código, preservar alterações preexistentes e revisar diff/status;
commit/push apenas quando autorizados em sua própria tarefa.

### Validação proporcional dos pacotes futuros

Os códigos abaixo são planos de validação, **não comandos executados nesta
entrega documental**. Usar a [matriz do workflow](WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional),
`COMPACT=1` e combinar camadas alteradas sem repetir suíte aprovada no mesmo
estado. Preparar banco descartável exclusivamente sintético quando requerido.

| Código | Verificação e limite |
| --- | --- |
| VD | `make docs-check COMPACT=1`, links/diagramas/diff e revisão da decisão/semântica. Não aplica migrations. |
| VF | `make frontend-check docs-check COMPACT=1`; cenário UI/API/PostgreSQL sintético do requisito, mais revisão visual/teclado quando afetados. Build/unitários ou browser interceptado sozinhos não comprovam escrita. |
| VB | `make backend-check backend-clinical-test docs-check COMPACT=1`; integração de contrato/guard/persistência. Se houver mudança física futura autorizada, testes SQL próprios e `project-check` no ambiente adequado; nenhuma migration antiga editada. |
| VI | VF/VB conforme camadas alteradas, e `importer-test` quando o pipeline/semântica do importador mudar. Dry-run/rollback, proveniência, autorização e ausência de duplicação precisam de evidência real sintética. |

Toda entrega de UI inclui carga/vazio/erro/sucesso do recurso, perfil consulta em
leitura e ação de escrita condicionada à autorização real. Toda entrega de
escrita se vincula ao protocolo de recuperação da sua classe: não adicionar
retry automático, não chamar resposta perdida de “não salvo” e não esconder
recibo anterior. Falhas podem ser cobertas por cenários focados que referenciem
a infraestrutura já aceita; não é necessário reexecutar o percurso inteiro em
cada pacote. Conferir os RQ efetivamente exercitados, sem afirmar cobertura de
todos os campos por associação a um teste.

### Sequência recomendada e marcos

1. Corrigir lacunas independentes: 7D-R1/R2/R4/R5 e 7B-R1B→R1U/R2.
2. Decidir 7D-R6D; entregar recuperação core 7D-R6B→R6U e acompanhamentos
   7D-R6B-A→R6U-A, uma classe por vez. Correção PATCH para null é 7C-R2B→R2U,
   explicitamente posterior salvo promoção P-01.
3. Entregar 7A-U1, 7D-U1→U2, U3.1→U3.2→U3.3 e U4.1/U4.2; as dependências
   reais prevalecem sobre a ordem de uma lista. Fazer revisão humana das etapas.
4. Executar 7D-A1 e registrar aceite/limites. Este é o marco da **VU1 sintética
   proposta**, condicionado a P-01/P-03, à recuperação de todas as operações
   usadas e à revisão da equipe. Nenhum desses pacotes libera dados reais.
5. Etapa 8 começa por 8A1 e 8C1, que usam contratos presentes; depois
   8C2U.1/U.2 e decisões 8A2D/8B1D, seguidas de contratos e UI correspondentes.
   Fila/nota, KPIs e séries são entregas distintas. Expandir lista por fatia.
6. Módulos 7B-E/7C-E, upload, revisão/reprocessamento e gestão de usuários têm
   destino MVP/VP/decisão individual na matriz. Se forem essenciais ao primeiro
   uso, P-01/P-07/P-08/P-09 os promovem antes de aceitar esse marco; API ausente
   é trabalho B/dados necessário, nunca justificativa para excluir o produto.
7. Produção/homologação permanecem Etapas 9 e 10, com liberação 9D e validação
   operacional. VU1 sintética não é promessa de substituição integral da planilha.

### Recuperação e experiência da Etapa 7

<a id="7a-u1"></a>

#### 7A-U1 — Cadastro precedido por busca e escolha consciente

**Estado e cobertura:** Planejado; não aceito. RQ-HOM-07; RQ-LIS-07; RQ-CAD-01–02, 04–08, 10–18, 23, 25–30 (telas/elementos na matriz).

**Escopo:** Busca por nome → correspondências autorizadas → declaração de nenhuma correspondente → cadastro; edição existente fica fora deste fluxo. Não impedir criação por homônimo nem fundir pessoas.

**Dependências/decisões:** 6B/7A presentes; P-01. Usar H2/H3 sem prometer busca por nascimento/código.

**Trabalho por camada:** Frontend: separar estados/etapas, URL de retorno, capacidade atual e rascunho do cadastro. Backend/dados: nenhum incremento para o recorte nome/sexo.

**Aceite — cenário principal e falhas:** Pessoa existente abre ficha sem POST; pessoa nova só envia após escolha explícita. Nome obrigatório, nascimento/sexo opcionais; 403/capacidade recusada, homônimos, vazio, falha na busca e cancelar não produzem duplicação.

**Validação/evidência e conclusão:** VF. Roteiro com os dois caminhos, contagem de POST e releitura do cadastro com contatos/endereço. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-r1b"></a>

#### 7B-R1B — Todos os familiares tornam-se consultáveis por página

**Estado e cobertura:** Planejado; não aceito. RQ-HIS-16; RQ-ACO-01–04 (telas/elementos na matriz).

**Escopo:** Contrato de paginação independente entre snapshots e seus resultados; escolher extensão mínima compatível, sem substituir fatos clínicos.

**Dependências/decisões:** R7-01; H5. Definir DTO/cursor ou recurso de resultados por snapshot antes da UI.

**Trabalho por camada:** Backend: consulta autorizada, paginação e DTO explícitos. Dados: reutilizar modelo existente; justificar eventual incremento, sem reescrever migrations antigas.

**Aceite — cenário principal e falhas:** Um snapshot com 30 e outro com 50 resultados: páginas sucessivas retornam todos, sem repetição/perda. Dois snapshots não misturam filhos; offset fora de faixa é vazio; vínculo recusado não expõe familiares.

**Validação/evidência e conclusão:** VB. Integração HTTP/PostgreSQL com IDs conhecidos e união das páginas, inclusive autorização. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-r1u"></a>

#### 7B-R1U — Paginar familiares mantendo a consulta e o snapshot

**Estado e cobertura:** Planejado; não aceito. RQ-HIS-16; RQ-ACO-01–04 (telas/elementos na matriz).

**Escopo:** Controles separados para snapshots e familiares; consulta específica preservada em URL/voltar. Não corrigir a perda apenas elevando o limite.

**Dependências/decisões:** 7B-R1B aceito.

**Trabalho por camada:** Frontend: adaptar DTO, carregar páginas por snapshot, estados vazio/erro, retorno e foco. Sem nova escrita.

**Aceite — cenário principal e falhas:** Chegar ao familiar 30/50 por navegação; voltar restaura consulta/snapshot/página. Falha da segunda página permite nova leitura e não chama ausência de família.

**Validação/evidência e conclusão:** VF. Captura/roteiro de duas páginas e IDs comparados ao contrato; cenário com falha de leitura. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-r2"></a>

#### 7B-R2 — Criar pendência com estado desconhecido preservado

**Estado e cobertura:** Planejado; não aceito. RQ-FIC-19; RQ-ACO-05–07, 40–44 (telas/elementos na matriz).

**Escopo:** Criação composta e POST posterior permitem distinguir null, nao_informado, aberta e resolvida; omissão e null seguem o contrato de cada campo. Não ampliar PATCH nesta entrega.

**Dependências/decisões:** R7-04; POST atuais H4/H12 aceitam null.

**Trabalho por camada:** Frontend: normalização, opção/rotulagem de desconhecido e revisão dos dois formulários. Backend/dados: sem evolução para criação.

**Aceite — cenário principal e falhas:** Criar ambos os tipos com null e reler null; nao_informado permanece string distinta. Resolvida exige data; estado não resolvido recusa data incompatível; outros dados do atendimento preservados.

**Validação/evidência e conclusão:** VF. Payload, recurso relido e duas intenções de UI, sem converter desconhecido em pendente. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-r2b"></a>

#### 7C-R2B — Correção de pendência pode retornar a desconhecido

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-45–46 (telas/elementos na matriz).

**Escopo:** Evolução explícita de PendingUpdateDto e semântica PATCH para null; não afirmar que já existe. Histórico/auditoria e concorrência seguem desenho de 8A3B quando promovidos.

**Dependências/decisões:** P-01/P-03 para prioridade; H12 atualmente exige string. Regra D11 preservada.

**Trabalho por camada:** Backend: DTO, validação status/data e persistência parcial. Dados: avaliar estrutura de auditoria existente antes de incremento.

**Aceite — cenário principal e falhas:** PATCH de estado conhecido para null, com data de resolução limpa explicitamente, retorna/rele null. Estado inválido, data incompatível e 403 recusados; descrição e vínculo não são apagados.

**Validação/evidência e conclusão:** VB. Matriz de casos null/omissão/string e contrato documentado com rollback/guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-r2u"></a>

#### 7C-R2U — Revisar pendência distinguindo desconhecido de não informado

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-45–46 (telas/elementos na matriz).

**Escopo:** Editar status/data de pendência existente com null; nota/responsável ficam para 8A3. Controle informa que descrição está em leitura.

**Dependências/decisões:** 7C-R2B; recuperação 7D-R2/R4/R6.

**Trabalho por camada:** Frontend: carregar estado atual, opções distintas, resumo da alteração e confirmação.

**Aceite — cenário principal e falhas:** Pendência resolvida retorna a desconhecido sem data e é relida corretamente. Cancelar não altera; 403 preserva intenção; falha não apresenta sucesso.

**Validação/evidência e conclusão:** VF. Cenário de correção pela UI, valores antes/depois e leitura sem escrita adicional. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r1"></a>

#### 7D-R1 — Atalhos de acompanhamento mantêm paciente e atendimento

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-03, 12; RQ-LIS-01, 06, 08, 11; RQ-FIC-11, 17, 20; RQ-HIS-12, 15; RQ-ENC-07; RQ-BZN-21; RQ-ECR-01–14; RQ-ACO-08–11, 28–33; RQ-EST-08 (telas/elementos na matriz).

**Escopo:** Atalho principal do detalhe, BZN ↔ retorno e contrarreferência; preservar rotas ClinicalActions que já incluem contexto. Aba/página/filtros de retorno fazem parte do percurso.

**Dependências/decisões:** R7-05; H5/H9/H10; rascunhos atuais.

**Trabalho por camada:** Frontend: parâmetros, breadcrumbs e seletores; verificar que atendimento pertence ao paciente antes de preencher. Sem incremento de API.

**Aceite — cenário principal e falhas:** Todos os caminhos iniciados na consulta X enviam/mostram X; trocar para Y é explícito. Link direto inválido ou de outro paciente não escreve; voltar/avançar preservam seleção e histórico.

**Validação/evidência e conclusão:** VF. Tabela de links percorridos e IDs do payload; ao menos duas consultas da mesma pessoa. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r2"></a>

#### 7D-R2 — Retomar uma intenção recusada por 403

**Estado e cobertura:** Planejado; não aceito. RQ-ERR-02; RQ-EST-11 (telas/elementos na matriz).

**Escopo:** Saída de denied por verificação somente de leitura e nova confirmação; manter rascunho no mesmo escopo. GET autorizado não é prova de permissão de escrita.

**Dependências/decisões:** R7-02; H1/guards atuais. Não depende do protocolo de resultado incerto para um 403 comprovadamente recebido.

**Trabalho por camada:** Frontend: transição explícita, mensagem, ocultação quando acesso falta e revalidação. Servidor continua revalidando cada escrita.

**Aceite — cenário principal e falhas:** 403 → leitura ainda recusada mantém bloqueio/ocultação → vínculo restabelecido permite revisar e confirmar. Revalidar/foco não envia; nova confirmação faz um envio, que pode receber outro 403.

**Validação/evidência e conclusão:** VF. UI/API real com revogação/restauração sintética, rascunho comparado e contagem de escritas. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r4"></a>

#### 7D-R4 — Confirmação e valores sobrevivem a falha temporária de identidade

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-12–39; RQ-ERR-06; RQ-EST-06, 15 (telas/elementos na matriz).

**Escopo:** Guardar recibo e valores confirmados no escopo de sessão/operação após salvar; conservar também ao navegar e voltar. Nova intenção repetível é uma ação separada.

**Dependências/decisões:** R7-07; SessionManager/DraftProvider e estado de escrita presentes.

**Trabalho por camada:** Frontend: store de confirmação e renderização após remount, sem guardar clínica no armazenamento persistente do navegador.

**Aceite — cenário principal e falhas:** Salvar retorno → me indisponível oculta → mesma identidade recuperada mostra mesmo ID/data e nenhum POST novo. Logout/401/identidade diferente limpa tudo; resposta tardia não contamina outra sessão.

**Validação/evidência e conclusão:** VF. Recibo/valores antes e depois da falha e saída, contagem de POST e teste de identidade diferente. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r5"></a>

#### 7D-R5 — Conflito de BZN conserva o tratamento atual e o rascunho

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-12–27; RQ-EST-13 (telas/elementos na matriz).

**Escopo:** POST concorrente recebe 409 e consulta canônico; painel de comparação/cópia/descarte sem transformar criação em correção.

**Dependências/decisões:** R7-06; H8; 7D-R4 para recibos compartilhados.

**Trabalho por camada:** Frontend: expor rascunho mesmo quando GET encontra tratamento; controle explícito de descarte e link para consulta. Sem PATCH BZN nesta entrega.

**Aceite — cenário principal e falhas:** Duas intenções concorrem: apenas um tratamento, perdedora mantém todos os campos/reações. Consulta/cópia não escrevem; descartar apenas rascunho afetado; falha no GET mantém bloqueio recuperável.

**Validação/evidência e conclusão:** VF. Dois contextos concorrentes, contagem de tratamentos e comparação do rascunho após GET. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r6d"></a>

#### 7D-R6D — Decidir como provar o resultado de uma operação incerta

**Estado e cobertura:** Planejado; não aceito. RQ-ERR-04; RQ-EST-14 (telas/elementos na matriz).

**Escopo:** Desenho de correlação autorizada: confirmado, não aplicado com prova, em curso e indeterminável; separar core e acompanhamentos. Recuperação após nova sessão, retenção e privacidade entram na decisão.

**Dependências/decisões:** P-02. Não é nova aprovação de contrato nesta análise.

**Trabalho por camada:** Documentação/arquitetura: comparar recibo/registro de operação/idempotência, atomicidade, chave de intenção, autorização e expiração; inventariar todas as operações atuais. Sem implementação neste pacote.

**Aceite — cenário principal e falhas:** Para cada operação, desenho identifica como consultar sem reaplicar e como provar não aplicação. Janela commit/resposta, queda de processo e revogação têm estados definidos; página vazia nunca é prova.

**Validação/evidência e conclusão:** VD. Decisão revisada com diagramas de falha, contrato proposto e tabela das operações, aprovada antes de 7D-R6B. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r6b"></a>

#### 7D-R6B — Servidor comprova operações de cadastro/atendimento sem reaplicar

**Estado e cobertura:** Planejado; não aceito. RQ-ERR-04; RQ-EST-14 (telas/elementos na matriz).

**Escopo:** Duas unidades separadas abaixo: B.1 cadastro/PATCH paciente; B.2 criação/PATCH atendimento composto. A âncora agrega dependências, não autoriza uma entrega monolítica.

**Dependências/decisões:** 7D-R6D aprovado; política/DTO da correlação definidos.

**Trabalho por camada:** Backend/dados: implementar consulta autorizada do resultado e vínculo atômico à operação por unidade; migration nova somente se o desenho exigir.

**Aceite — cenário principal e falhas:** Cada unidade prova sucesso com resposta perdida, falha antes do commit, rollback de filhos, intenção em curso/expirada e 403. Verificação faz zero escrita clínica/reexecução; nenhuma chave permite consultar outro usuário/recurso.

**Validação/evidência e conclusão:** VB. Aceitar B.1 e B.2 separadamente com HTTP/SQL e falhas injetadas; agregado só termina quando ambas aceitas. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r6u"></a>

#### 7D-R6U — Interface encerra incerteza de cadastro/atendimento por verificação

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-28–39; RQ-ERR-04, 06; RQ-EST-14 (telas/elementos na matriz).

**Escopo:** U.1 cadastro/edição paciente e U.2 atendimento novo/edição, aceitos separadamente; revisar a intenção e consultar resultado. Nunca desbloquear por ausência em busca.

**Dependências/decisões:** 7D-R6B unidade correspondente, 7D-R4; desenho de 7D-R6D.

**Trabalho por camada:** Frontend: ação Verificar resultado, recibo reconciliado, bloqueio de estado indeterminável e nova confirmação apenas com prova de não aplicação.

**Aceite — cenário principal e falhas:** Resposta perdida → verificação mostra recurso correto e mantém um registro; rollback comprovado permite nova intenção consciente. GET falha/revogado/em curso mantém bloqueio; recarga/nova sessão seguem o desenho aprovado.

**Validação/evidência e conclusão:** VF. Cada unidade tem roteiro de commit perdido e não aplicação, contagem de escritas antes/depois da verificação. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r6b-a"></a>

#### 7D-R6B-A — Servidor comprova acompanhamentos sem duplicar episódios

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-28–39; RQ-ERR-04, 06; RQ-EST-14 (telas/elementos na matriz).

**Escopo:** A.1 BZN/retornos; A.2 encaminhamento/contrarreferência/anuais; A.3 PUT projeto/notificação e pendências. Três unidades de aceite, reutilizando infraestrutura sem presumir idempotência em episódios repetíveis.

**Dependências/decisões:** 7D-R6D e infraestrutura 7D-R6B; contratos atuais H7–H12.

**Trabalho por camada:** Backend/dados: correlacionar cada operação, seu contexto/identidade e recurso confirmado; consulta e autorização; nenhuma reaplicação por leitura.

**Aceite — cenário principal e falhas:** Cada classe prova resposta perdida, rollback, revogação e dois episódios intencionais iguais com IDs distintos. PUT não confunde valor coincidente com resultado da intenção; leitura não cria ocorrência.

**Validação/evidência e conclusão:** VB. Matriz de operações das três unidades, falhas após commit e contagem/IDs de recursos. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r6u-a"></a>

#### 7D-R6U-A — Interface recupera acompanhamentos e conserva confirmações anteriores

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-28–39; RQ-ERR-04, 06; RQ-EST-14 (telas/elementos na matriz).

**Escopo:** A.1 BZN/retornos; A.2 encaminhamento/contrarreferência/anuais; A.3 projeto/notificação/pendência. O atendimento confirmado permanece visível ao recuperar operação posterior.

**Dependências/decisões:** 7D-R6B-A unidade correspondente; 7D-R4/R5.

**Trabalho por camada:** Frontend: aplicar fluxo comum por operação, comparar contexto e recibo; Novo registro inicia outra intenção após concluir a anterior.

**Aceite — cenário principal e falhas:** Em cada unidade a resposta perdida é reconciliada com um registro; confirmação anterior não some. Estado desconhecido bloqueia, 403 não expõe clínica, nova ocorrência só por ação explícita; zero retry automático.

**Validação/evidência e conclusão:** VF. Um cenário positivo e falhas pertinentes por unidade, rastreado aos recursos e POST/PUT/PATCH. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-u1"></a>

#### 7D-U1 — Preencher atendimento em cinco etapas sem perder dados

**Estado e cobertura:** Planejado; não aceito. RQ-ATD-01–04, 16–19; RQ-DIA-01–07, 22; RQ-MED-01–09; RQ-EXN-01–09; RQ-OBS-01–02; RQ-EST-10 (telas/elementos na matriz).

**Escopo:** Atendimento, Avaliação/Chagas, Exames/familiares, Pendências e Revisão; somente campos hoje aceitos. Prévia de resumo não confirma ainda; etapa de revisão completa pertence a U2.

**Dependências/decisões:** P-03; H4; 7B-R2; 7D-R1.

**Trabalho por camada:** Frontend: agrupar formulário existente, anterior/próxima, resumo de etapa, validação/foco, cancelar com decisão de rascunho e uma coluna em mobile.

**Aceite — cenário principal e falhas:** Ida/volta entre cinco etapas mantém todos os valores/filhos; erro direciona etapa/campo; data obrigatória; cancelar não escreve e permite preservar/descartar conscientemente.

**Validação/evidência e conclusão:** VF. Roteiro com filhos repetidos, vazio/desconhecido, navegação e teclado/390 px, sem perda. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-u2"></a>

#### 7D-U2 — Revisar atendimento e reconhecer cada confirmação separada

**Estado e cobertura:** Planejado; não aceito. RQ-ATD-05–10, 12–14; RQ-DIA-01–07; RQ-MED-01–09; RQ-PRJ-01; RQ-EXN-01–09; RQ-NTF-01–03; RQ-OBS-01–03 (telas/elementos na matriz).

**Escopo:** Revisão de todos os valores/filhos aceitos, links Voltar e editar, confirmação única do atendimento e ação Continuar acompanhamento. Acompanhamento não integra o POST composto.

**Dependências/decisões:** 7D-U1; 7D-R4; P-03; H4/H7–H12.

**Trabalho por camada:** Frontend: representação de resumo, campos ausentes relevantes, recibo e ação seguinte com contexto; não exibir status Completo sem critério.

**Aceite — cenário principal e falhas:** Alterar um campo na revisão atualiza só ele; confirmar grava uma vez; falha de acompanhamento não desfaz/oculta consulta salva. Duplo clique e Enter não duplicam; resposta incerta segue R6.

**Validação/evidência e conclusão:** VF. Comparação resumo/payload/releitura com valores discriminantes; captura do recibo e falha posterior. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-u3"></a>

#### 7D-U3 — Ficha e detalhe mostram a origem temporal de cada dado

**Estado e cobertura:** Planejado; não aceito. RQ-HOM-06, 08; RQ-CAD-19; RQ-FIC-01–04, 06, 10, 12, 14, 16; RQ-RES-01–28, 30–31; RQ-HIS-01–11, 14; RQ-CHA-01–06, 15; RQ-EXA-01–06, 14; RQ-AVL-01–08 (telas/elementos na matriz).

**Escopo:** U3.1 cabeçalho/resumo/última consulta; U3.2 diagnóstico/avaliação por consulta selecionada; U3.3 histórico/detalhe/exames e links às áreas canônicas. Cada unidade pode ser revisada/aceita separadamente.

**Dependências/decisões:** H3/H5–H12; 7B-R1U, 7D-R1. Código de negócio/origem e timeline integrada ficam para 8B3/8B2.

**Trabalho por camada:** Frontend: reordenar painéis usando leituras existentes, abas/seleção em URL e recursos paginados; sem varrer todas as páginas para calcular resumo.

**Aceite — cenário principal e falhas:** U3.1 identifica última consulta, ID secundário e referência de idade; U3.2 alterna duas consultas inclusive null sem carregar último não nulo; U3.3 abre recurso correto e restaura página. Carga/403/vazio não exibem dado antigo nem inventam completude.

**Validação/evidência e conclusão:** VF. Capturas/roteiros de cada unidade com duas consultas e recursos canônicos; checar IDs/fontes/limite de página. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-u4"></a>

#### 7D-U4 — Layout, controles e mensagens são operáveis em telas menores e teclado

**Estado e cobertura:** Planejado; não aceito. RQ-LOG-01–03, 05–06; RQ-NAV-01–02, 08–10, 13; RQ-LIS-12; RQ-ATD-15; RQ-CTA-01–02, 05–06; RQ-ERR-03, 05, 07; RQ-EST-01–07, 09–10 (telas/elementos na matriz).

**Escopo:** U4.1 shell/login/conta/erros: navegação, foco e layout 320/390; U4.2 controles compartilhados de formulário/tabela/diálogo: rótulo, erro, status, Escape, foco. Aplicar a telas atuais sem copiar modais inseguros do Figma.

**Dependências/decisões:** P-03 para novos diálogos; 6A/7 atuais; conteúdo U1/U2/U3 quando afetado.

**Trabalho por camada:** Frontend: CSS/componentes compartilhados; tabelas com rolagem própria, formulários em uma coluna, contraste/status por texto e anúncio de erro/sucesso.

**Aceite — cenário principal e falhas:** Cada unidade: navegação só teclado, zoom 200%, 320/390 px, foco visível e ações alcançáveis sem rolagem horizontal da página. Diálogo restaura foco; nenhuma linha exige clique sem alternativa; erro sanitizado possui retorno útil.

**Validação/evidência e conclusão:** VF. Capturas comparáveis, Axe e revisão humana de teclado/foco nas duas unidades; Axe não substitui revisão. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-a1"></a>

#### 7D-A1 — Comprovar cadastro → atendimento → acompanhamento → histórico pela interface

**Estado e cobertura:** Planejado; não aceito. RQ-LOG-04, 07; RQ-NAV-11; RQ-CAD-21–22, 24; RQ-FIC-07–09, 13, 15, 18–19; RQ-HIS-13; RQ-PRO-01–09; RQ-TRA-01–11; RQ-ENC-01–06, 08; RQ-NOT-01–05; RQ-ATD-14; RQ-MED-10; RQ-PRJ-01; RQ-BZN-01–08, 21; RQ-ECR-01–15; RQ-NTF-01–03; RQ-ACO-12–44; RQ-CTA-05–06; RQ-ERR-01; RQ-EST-12, 16–17 (telas/elementos na matriz).

**Escopo:** Um cenário integrado positivo: buscar/criar paciente, atendimento com avaliação/diagnóstico/exames/família/pendência, BZN/reação, retorno efetivo, encaminhamento/contrarreferência, resolver pendência, reler ficha/histórico. Não preparar paciente/consulta com helpers de API.

**Dependências/decisões:** Correções R7-01–07 aceitas nas classes utilizadas, 7A-U1, 7D-U1/U2/U3/U4; P-01/P-03. 7C-R2 só obrigatório se retorno a null promovido à VU1.

**Trabalho por camada:** Validação/frontend: roteiro e E2E UI/API/PostgreSQL real sintético. Preparação por helper limitada a identidade, vínculo, catálogos e fixture de falha; sem implementar recurso novo nesta prova.

**Aceite — cenário principal e falhas:** Todo recurso tem ID e consulta de origem corretos; usuário completa sem SQL. Falhas 403, 409 de versão/BZN e resposta perdida recuperam só intenção afetada; confirmação anterior permanece. Duas intenções iguais são distinguíveis; zero reenvio automático/duplicação.

**Validação/evidência e conclusão:** VF. IDs por passo, contagem/releitura em API/SQL, capturas dos pontos de decisão e revisão com equipe; cobrir falhas por casos focados, sem repetir toda a suíte após o mesmo estado aprovado. Concluir somente pela condição comum acima e pelos critérios desta unidade.

### Extensões clínicas vinculadas a 7B e 7C

Sem HTTP atual permanecem dependências planejadas. Confirmar prioridade P-01;
cada contrato antecede sua UI, preservando as decisões clínicas vigentes.

<a id="7b-e1b"></a>

#### 7B-E1B — Publicar contrato de sorologias por episódio

**Estado e cobertura:** Planejado; não aceito. RQ-FIC-12; RQ-CHA-07–14; RQ-DIA-08–18 (telas/elementos na matriz).

**Escopo:** Método, solicitação/coleta/resultado com datas próprias, laboratório/observação; solicitação geral separada quando aprovada. Não reinterpretar resultados.

**Dependências/decisões:** P-01 para prioridade; campos/modelo físico e fontes clínicas examinados antes do DTO; D2–D5 quando pertinentes.

**Trabalho por camada:** Backend: contrato de consulta/criação específico, autorização por paciente/atendimento e transação. Dados: reutilização ou nova migration incremental justificada; nenhuma inferência para preencher legado.

**Aceite — cenário principal e falhas:** Duas sorologias permanecem distintas, data de descoberta não muda; método genérico tem identificação; desconhecido/ausente preservados. GET/POST sem vínculo recebe recusa; falha de filho reverte a operação correspondente.

**Validação/evidência e conclusão:** VB. DTO/semântica aprovados e integração HTTP/SQL com dois episódios/consultas, null, inválido, rollback e guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e1u"></a>

#### 7B-E1U — Registrar e consultar sorologias por episódio

**Estado e cobertura:** Planejado; não aceito. RQ-FIC-12; RQ-CHA-07–14; RQ-DIA-08–21 (telas/elementos na matriz).

**Escopo:** Método, solicitação/coleta/resultado com datas próprias, laboratório/observação; solicitação geral separada quando aprovada. Não reinterpretar resultados. Uma seção/formulário por módulo; revisão lista todos os campos.

**Dependências/decisões:** 7B-E1B aceito; infraestrutura 7D-R1/R4/R6; P-01.

**Trabalho por camada:** Frontend: formulário, revisão, lista/detalhe paginados e estados; não adicionar campo editável antes de destino HTTP.

**Aceite — cenário principal e falhas:** Duas sorologias permanecem distintas, data de descoberta não muda; método genérico tem identificação; desconhecido/ausente preservados. Confirmar uma vez, reler; cancelar/falha preservam rascunho e consulta de origem; perfil consulta só lê.

**Validação/evidência e conclusão:** VF. Valores discriminantes na revisão/payload/releitura, captura e caso de falha pertinente; todos os RQ do módulo exercitados ou pendência individual registrada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e2b"></a>

#### 7B-E2B — Publicar contrato de condição e complicações

**Estado e cobertura:** Planejado; não aceito. RQ-CON-01–10 (telas/elementos na matriz).

**Escopo:** Forma clínica/cardíaca/digestiva, classificação e sintomas/regurgitação/constipação/disfagia/dor/dispneia; sem classificação automática.

**Dependências/decisões:** P-01 para prioridade; campos/modelo físico e fontes clínicas examinados antes do DTO; D2–D5 quando pertinentes.

**Trabalho por camada:** Backend: contrato de consulta/criação específico, autorização por paciente/atendimento e transação. Dados: reutilização ou nova migration incremental justificada; nenhuma inferência para preencher legado.

**Aceite — cenário principal e falhas:** Condição/sintomas preenchidos deixam de ser descartados; alternância de opção não apaga silenciosamente dado anterior; sem inferência a partir de sintoma. GET/POST sem vínculo recebe recusa; falha de filho reverte a operação correspondente.

**Validação/evidência e conclusão:** VB. DTO/semântica aprovados e integração HTTP/SQL com dois episódios/consultas, null, inválido, rollback e guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e2u"></a>

#### 7B-E2U — Registrar e consultar condição e complicações

**Estado e cobertura:** Planejado; não aceito. RQ-CON-01–11 (telas/elementos na matriz).

**Escopo:** Forma clínica/cardíaca/digestiva, classificação e sintomas/regurgitação/constipação/disfagia/dor/dispneia; sem classificação automática. Uma seção/formulário por módulo; revisão lista todos os campos.

**Dependências/decisões:** 7B-E2B aceito; infraestrutura 7D-R1/R4/R6; P-01.

**Trabalho por camada:** Frontend: formulário, revisão, lista/detalhe paginados e estados; não adicionar campo editável antes de destino HTTP.

**Aceite — cenário principal e falhas:** Condição/sintomas preenchidos deixam de ser descartados; alternância de opção não apaga silenciosamente dado anterior; sem inferência a partir de sintoma. Confirmar uma vez, reler; cancelar/falha preservam rascunho e consulta de origem; perfil consulta só lê.

**Validação/evidência e conclusão:** VF. Valores discriminantes na revisão/payload/releitura, captura e caso de falha pertinente; todos os RQ do módulo exercitados ou pendência individual registrada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e3b"></a>

#### 7B-E3B — Publicar contrato de comorbidades

**Estado e cobertura:** Planejado; não aceito. RQ-ATD-11; RQ-COM-01–02 (telas/elementos na matriz).

**Escopo:** Hipertensão/diabetes e histórico de doença familiar separados do rastreio de exames; representação triestado e observações.

**Dependências/decisões:** P-01 para prioridade; campos/modelo físico e fontes clínicas examinados antes do DTO; D2–D5 quando pertinentes.

**Trabalho por camada:** Backend: contrato de consulta/criação específico, autorização por paciente/atendimento e transação. Dados: reutilização ou nova migration incremental justificada; nenhuma inferência para preencher legado.

**Aceite — cenário principal e falhas:** Negativo, desconhecido e ausente não se confundem; resultado de familiar não vira histórico de doença; duas consultas mantêm snapshots distintos. GET/POST sem vínculo recebe recusa; falha de filho reverte a operação correspondente.

**Validação/evidência e conclusão:** VB. DTO/semântica aprovados e integração HTTP/SQL com dois episódios/consultas, null, inválido, rollback e guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e3u"></a>

#### 7B-E3U — Registrar e consultar comorbidades

**Estado e cobertura:** Planejado; não aceito. RQ-ATD-11; RQ-COM-01–02 (telas/elementos na matriz).

**Escopo:** Hipertensão/diabetes e histórico de doença familiar separados do rastreio de exames; representação triestado e observações. Uma seção/formulário por módulo; revisão lista todos os campos.

**Dependências/decisões:** 7B-E3B aceito; infraestrutura 7D-R1/R4/R6; P-01.

**Trabalho por camada:** Frontend: formulário, revisão, lista/detalhe paginados e estados; não adicionar campo editável antes de destino HTTP.

**Aceite — cenário principal e falhas:** Negativo, desconhecido e ausente não se confundem; resultado de familiar não vira histórico de doença; duas consultas mantêm snapshots distintos. Confirmar uma vez, reler; cancelar/falha preservam rascunho e consulta de origem; perfil consulta só lê.

**Validação/evidência e conclusão:** VF. Valores discriminantes na revisão/payload/releitura, captura e caso de falha pertinente; todos os RQ do módulo exercitados ou pendência individual registrada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e4b"></a>

#### 7B-E4B — Publicar contrato de eventos, dispositivos e óbito

**Estado e cobertura:** Planejado; não aceito. RQ-EVT-01–08 (telas/elementos na matriz).

**Escopo:** AVC prévio, marcapasso/CDI/resincronizador e óbito/causa/data/precisão; escolher contrato clínico antes de campo inferido.

**Dependências/decisões:** P-01 para prioridade; campos/modelo físico e fontes clínicas examinados antes do DTO; D2–D5 quando pertinentes.

**Trabalho por camada:** Backend: contrato de consulta/criação específico, autorização por paciente/atendimento e transação. Dados: reutilização ou nova migration incremental justificada; nenhuma inferência para preencher legado.

**Aceite — cenário principal e falhas:** Fato/data parcial preservados sem fabricar dia ou diagnóstico; controles preenchidos persistem e aparecem na consulta de origem; negativo não apaga histórico. GET/POST sem vínculo recebe recusa; falha de filho reverte a operação correspondente.

**Validação/evidência e conclusão:** VB. DTO/semântica aprovados e integração HTTP/SQL com dois episódios/consultas, null, inválido, rollback e guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e4u"></a>

#### 7B-E4U — Registrar e consultar eventos, dispositivos e óbito

**Estado e cobertura:** Planejado; não aceito. RQ-EVT-01–08 (telas/elementos na matriz).

**Escopo:** AVC prévio, marcapasso/CDI/resincronizador e óbito/causa/data/precisão; escolher contrato clínico antes de campo inferido. Uma seção/formulário por módulo; revisão lista todos os campos.

**Dependências/decisões:** 7B-E4B aceito; infraestrutura 7D-R1/R4/R6; P-01.

**Trabalho por camada:** Frontend: formulário, revisão, lista/detalhe paginados e estados; não adicionar campo editável antes de destino HTTP.

**Aceite — cenário principal e falhas:** Fato/data parcial preservados sem fabricar dia ou diagnóstico; controles preenchidos persistem e aparecem na consulta de origem; negativo não apaga histórico. Confirmar uma vez, reler; cancelar/falha preservam rascunho e consulta de origem; perfil consulta só lê.

**Validação/evidência e conclusão:** VF. Valores discriminantes na revisão/payload/releitura, captura e caso de falha pertinente; todos os RQ do módulo exercitados ou pendência individual registrada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e5b"></a>

#### 7B-E5B — Publicar contrato de medicamentos por atendimento

**Estado e cobertura:** Planejado; não aceito. RQ-FIC-15; RQ-TRA-14–21; RQ-BZN-09–20 (telas/elementos na matriz).

**Escopo:** Princípio ativo/identificação, apresentação/dose/unidade/frequência/via, início/fim/status/origem e observações, sem sugerir prescrição.

**Dependências/decisões:** P-01 para prioridade; campos/modelo físico e fontes clínicas examinados antes do DTO; D2–D5 quando pertinentes.

**Trabalho por camada:** Backend: contrato de consulta/criação específico, autorização por paciente/atendimento e transação. Dados: reutilização ou nova migration incremental justificada; nenhuma inferência para preencher legado.

**Aceite — cenário principal e falhas:** Dois itens identificados e todas as propriedades preenchidas reaparecem no atendimento; datas incompatíveis são recusadas por regra aprovada; nenhum cálculo de dose. GET/POST sem vínculo recebe recusa; falha de filho reverte a operação correspondente.

**Validação/evidência e conclusão:** VB. DTO/semântica aprovados e integração HTTP/SQL com dois episódios/consultas, null, inválido, rollback e guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e5u"></a>

#### 7B-E5U — Registrar e consultar medicamentos por atendimento

**Estado e cobertura:** Planejado; não aceito. RQ-FIC-15; RQ-TRA-14–21; RQ-BZN-09–20 (telas/elementos na matriz).

**Escopo:** Princípio ativo/identificação, apresentação/dose/unidade/frequência/via, início/fim/status/origem e observações, sem sugerir prescrição. Uma seção/formulário por módulo; revisão lista todos os campos.

**Dependências/decisões:** 7B-E5B aceito; infraestrutura 7D-R1/R4/R6; P-01.

**Trabalho por camada:** Frontend: formulário, revisão, lista/detalhe paginados e estados; não adicionar campo editável antes de destino HTTP.

**Aceite — cenário principal e falhas:** Dois itens identificados e todas as propriedades preenchidas reaparecem no atendimento; datas incompatíveis são recusadas por regra aprovada; nenhum cálculo de dose. Confirmar uma vez, reler; cancelar/falha preservam rascunho e consulta de origem; perfil consulta só lê.

**Validação/evidência e conclusão:** VF. Valores discriminantes na revisão/payload/releitura, captura e caso de falha pertinente; todos os RQ do módulo exercitados ou pendência individual registrada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e6b"></a>

#### 7B-E6B — Publicar contrato de resultados de exames identificados

**Estado e cobertura:** Planejado; não aceito. RQ-EXA-07–13, 16 (telas/elementos na matriz).

**Escopo:** Status/datas do exame e parâmetros valor/unidade/referência/interpretação textual humana; complementar H6 sem calcular diagnóstico.

**Dependências/decisões:** P-01 para prioridade; campos/modelo físico e fontes clínicas examinados antes do DTO; D2–D5 quando pertinentes.

**Trabalho por camada:** Backend: contrato de consulta/criação específico, autorização por paciente/atendimento e transação. Dados: reutilização ou nova migration incremental justificada; nenhuma inferência para preencher legado.

**Aceite — cenário principal e falhas:** Solicitado sem resultado/data é válido; genérico precisa de identificação; resultado não é inferido; dois parâmetros mantêm valor/unidade/referência separados. GET/POST sem vínculo recebe recusa; falha de filho reverte a operação correspondente.

**Validação/evidência e conclusão:** VB. DTO/semântica aprovados e integração HTTP/SQL com dois episódios/consultas, null, inválido, rollback e guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e6u"></a>

#### 7B-E6U — Registrar e consultar resultados de exames identificados

**Estado e cobertura:** Planejado; não aceito. RQ-EXA-07–13, 16 (telas/elementos na matriz).

**Escopo:** Status/datas do exame e parâmetros valor/unidade/referência/interpretação textual humana; complementar H6 sem calcular diagnóstico. Uma seção/formulário por módulo; revisão lista todos os campos.

**Dependências/decisões:** 7B-E6B aceito; infraestrutura 7D-R1/R4/R6; P-01.

**Trabalho por camada:** Frontend: formulário, revisão, lista/detalhe paginados e estados; não adicionar campo editável antes de destino HTTP.

**Aceite — cenário principal e falhas:** Solicitado sem resultado/data é válido; genérico precisa de identificação; resultado não é inferido; dois parâmetros mantêm valor/unidade/referência separados. Confirmar uma vez, reler; cancelar/falha preservam rascunho e consulta de origem; perfil consulta só lê.

**Validação/evidência e conclusão:** VF. Valores discriminantes na revisão/payload/releitura, captura e caso de falha pertinente; todos os RQ do módulo exercitados ou pendência individual registrada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e7b"></a>

#### 7B-E7B — Publicar correções independentes de filhos do atendimento

**Estado e cobertura:** Planejado; não aceito. RQ-EXA-15; RQ-ACO-48 (telas/elementos na matriz).

**Escopo:** E7B.1 avaliação, E7B.2 diagnóstico, E7B.3 exame independente e E7B.4 rastreio/resultados. Quatro contratos/unidades separados; criação de exame independente é E7B.3. Não alterar PATCH de núcleo implicitamente.

**Dependências/decisões:** P-01/P-03; H4–H6; 7B-R1B para familiares. Definir versionamento/auditoria de cada recurso.

**Trabalho por camada:** Backend/dados por unidade: consulta/criação quando necessária e correção versionada no recurso existente, guard/atomicidade e história preservada.

**Aceite — cenário principal e falhas:** Cada unidade altera só o recurso selecionado; versão obsoleta retorna 409 sem sobrescrever, vínculo recusado não grava. Correção não cria atendimento duplicado nem perde filhos; criar exame novo é intenção distinta.

**Validação/evidência e conclusão:** VB. Quatro unidades aceitas individualmente com concorrência/rollback e IDs antes/depois; agregado depende das quatro. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e7u"></a>

#### 7B-E7U — Editar o filho correto mantendo a consulta original

**Estado e cobertura:** Planejado; não aceito. RQ-EXA-15; RQ-ACO-48 (telas/elementos na matriz).

**Escopo:** E7U.1 avaliação, E7U.2 diagnóstico, E7U.3 exame e E7U.4 familiares, separadamente; original/rascunho/atual comparáveis.

**Dependências/decisões:** 7B-E7B unidade correspondente; 7D-R1/R4/R6.

**Trabalho por camada:** Frontend: ações na área/detalhe correto, formulário específico e comparação de conflito; não chamar PATCH núcleo de edição integral.

**Aceite — cenário principal e falhas:** Em cada unidade correção relida no mesmo atendimento; 409 permite comparar/descarte sem reaplicar; formulário anterior não contamina outro filho; cancelar não escreve.

**Validação/evidência e conclusão:** VF. Cenário de correção e conflito por unidade; snapshots e IDs de recurso/atendimento. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e1b"></a>

#### 7C-E1B — Corrigir BZN e acrescentar reação ao canônico — contrato

**Estado e cobertura:** Planejado; não aceito. RQ-TRA-12–13 (telas/elementos na matriz).

**Escopo:** E1.1 correção versionada de tratamento; E1.2 criação de reação isolada. Duas unidades separadas, nunca segundo tratamento.

**Dependências/decisões:** H8; P-01/P-03; D6/D7; 7D-R5.

**Trabalho por camada:** Backend/dados: DTO/versão, guard, conflito e persistência específica; avaliar auditoria existente e migration incremental mínima se necessária.

**Aceite — cenário principal e falhas:** E1.1 versão obsoleta não sobrescreve; E1.2 duas reações intencionais têm IDs distintos e tratamento único; evento adverso permanece texto sem escala inferida. Sem vínculo não grava e rollback preserva recurso.

**Validação/evidência e conclusão:** VB. Integração por unidade, duas sessões/versões, ID e campos não alterados; aceite separado por unidade. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e1u"></a>

#### 7C-E1U — Corrigir BZN e acrescentar reação ao canônico — interface

**Estado e cobertura:** Planejado; não aceito. RQ-TRA-12–13 (telas/elementos na matriz).

**Escopo:** E1.1 correção versionada de tratamento; E1.2 criação de reação isolada. Duas unidades separadas, nunca segundo tratamento.

**Dependências/decisões:** 7C-E1B unidade correspondente; recuperação 7D-R1/R4/R6.

**Trabalho por camada:** Frontend: carregamento do recurso, edição/revisão, comparação e recibo; nenhuma criação duplicada como correção.

**Aceite — cenário principal e falhas:** E1.1 versão obsoleta não sobrescreve; E1.2 duas reações intencionais têm IDs distintos e tratamento único; evento adverso permanece texto sem escala inferida. Cancelar/comparar só lê; confirmação é explícita e uma falha mantém intenção.

**Validação/evidência e conclusão:** VF. Cenário positivo e conflito por unidade, releitura do ID original e revisão visual. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e2b"></a>

#### 7C-E2B — Corrigir encaminhamento existente — contrato

**Estado e cobertura:** Planejado; não aceito. RQ-ECR-16 (telas/elementos na matriz).

**Escopo:** Campos/documento/datas/status do encaminhamento selecionado, versão e preservação de contrarreferências; upload fora desta unidade.

**Dependências/decisões:** H10; P-01/P-03.

**Trabalho por camada:** Backend/dados: DTO/versão, guard, conflito e persistência específica; avaliar auditoria existente e migration incremental mínima se necessária.

**Aceite — cenário principal e falhas:** Correção mantém ID e episódios filhos; 409 não sobrescreve; tipo/projeto inativo recusado na nova seleção, legado permanece consultável. Sem vínculo não grava e rollback preserva recurso.

**Validação/evidência e conclusão:** VB. Integração por unidade, duas sessões/versões, ID e campos não alterados; aceite separado por unidade. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e2u"></a>

#### 7C-E2U — Corrigir encaminhamento existente — interface

**Estado e cobertura:** Planejado; não aceito. RQ-ECR-16 (telas/elementos na matriz).

**Escopo:** Campos/documento/datas/status do encaminhamento selecionado, versão e preservação de contrarreferências; upload fora desta unidade.

**Dependências/decisões:** 7C-E2B unidade correspondente; recuperação 7D-R1/R4/R6.

**Trabalho por camada:** Frontend: carregamento do recurso, edição/revisão, comparação e recibo; nenhuma criação duplicada como correção.

**Aceite — cenário principal e falhas:** Correção mantém ID e episódios filhos; 409 não sobrescreve; tipo/projeto inativo recusado na nova seleção, legado permanece consultável. Cancelar/comparar só lê; confirmação é explícita e uma falha mantém intenção.

**Validação/evidência e conclusão:** VF. Cenário positivo e conflito por unidade, releitura do ID original e revisão visual. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e4b"></a>

#### 7C-E4B — Detectar concorrência em projeto e notificação — contrato

**Estado e cobertura:** Planejado; não aceito. RQ-PRO-10; RQ-NOT-05 (telas/elementos na matriz).

**Escopo:** E4.1 upsert projeto; E4.2 notificação canônica. Duas unidades de versionamento/baseline e comparação; manter atualização parcial.

**Dependências/decisões:** H7/H11; P-03; avaliar compatibilidade dos PUT existentes.

**Trabalho por camada:** Backend/dados: DTO/versão, guard, conflito e persistência específica; avaliar auditoria existente e migration incremental mínima se necessária.

**Aceite — cenário principal e falhas:** Dois escritores: versão obsoleta recusada, campos não enviados preservados; indicador nulo não vira não; alteração de texto não limpa outros campos. Sem vínculo não grava e rollback preserva recurso.

**Validação/evidência e conclusão:** VB. Integração por unidade, duas sessões/versões, ID e campos não alterados; aceite separado por unidade. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e4u"></a>

#### 7C-E4U — Detectar concorrência em projeto e notificação — interface

**Estado e cobertura:** Planejado; não aceito. RQ-PRO-10; RQ-NOT-05 (telas/elementos na matriz).

**Escopo:** E4.1 upsert projeto; E4.2 notificação canônica. Duas unidades de versionamento/baseline e comparação; manter atualização parcial.

**Dependências/decisões:** 7C-E4B unidade correspondente; recuperação 7D-R1/R4/R6.

**Trabalho por camada:** Frontend: carregamento do recurso, edição/revisão, comparação e recibo; nenhuma criação duplicada como correção.

**Aceite — cenário principal e falhas:** Dois escritores: versão obsoleta recusada, campos não enviados preservados; indicador nulo não vira não; alteração de texto não limpa outros campos. Cancelar/comparar só lê; confirmação é explícita e uma falha mantém intenção.

**Validação/evidência e conclusão:** VF. Cenário positivo e conflito por unidade, releitura do ID original e revisão visual. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e5d"></a>

#### 7C-E5D — Decidir destino de planejamento/desfecho D9

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-47, 50–57 (telas/elementos na matriz).

**Escopo:** Distinguir data/tipo/status de retorno futuro do comparecimento efetivo; decidir preservação/exibição e eventual retirada funcional do legado.

**Dependências/decisões:** P-06/D9 pendente; fontes clínicas vigentes. Não remover campo por opinião do protótipo.

**Trabalho por camada:** Documentação: escolha clínica e modelo/contrato propostos, incluindo precisão e migração/preservação de legado.

**Aceite — cenário principal e falhas:** Decisão humana registrada com exemplos de futuro, visita realizada e ano informado; nenhuma regra implícita de 30/60 dias; legado tem destino explícito.

**Validação/evidência e conclusão:** VD. Resposta/decisão e impacto na matriz/contrato, antes de B/U. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e5b"></a>

#### 7C-E5B — Publicar planejamento de retorno conforme decisão D9

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-47, 50–57 (telas/elementos na matriz).

**Escopo:** Operação de planejamento distinta do retorno efetivamente realizado; recurso/precisão/correção somente conforme E5D.

**Dependências/decisões:** 7C-E5D aprovado; P-01 para prioridade.

**Trabalho por camada:** Backend/dados: reutilizar modelo aprovado ou novo incremento, DTO/guard/versão; sem migrar fatos como visitas fictícias.

**Aceite — cenário principal e falhas:** Plano futuro permanece separado da visita e do ano; legado não é perdido; recusa/rollback não altera retorno real; GET distingue plano e fato.

**Validação/evidência e conclusão:** VB. Casos definidos pela decisão, autorização, concorrência e preservação do legado. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e5u"></a>

#### 7C-E5U — Consultar e registrar planejamento separado de visitas

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-47, 50–57 (telas/elementos na matriz).

**Escopo:** Formulário e lista de planos com status e resumo aprovados; acesso a retornos reais por seção distinta.

**Dependências/decisões:** 7C-E5B aceito; 7D-R1/R4/R6.

**Trabalho por camada:** Frontend: rotular Planejado/Realizado/ano informado pela semântica, revisão e ações próprias.

**Aceite — cenário principal e falhas:** Usuário identifica plano futuro e retorno efetivo sem confusão; cancelar não gera visita; falha preserva rascunho; histórico identifica precisão.

**Validação/evidência e conclusão:** VF. Roteiro de plano e visita real, fontes/IDs e captura revisada com equipe. Concluir somente pela condição comum acima e pelos critérios desta unidade.

### Complementos vinculados à Etapa 8

<a id="8a1"></a>

#### 8A1 — Baixar CSV real da página de pacientes

**Estado e cobertura:** Planejado; não aceito. RQ-DAS-12–17; RQ-EST-17 (telas/elementos na matriz).

**Escopo:** ID/nome com filtros/página atuais e aviso de escopo; sem relatório do dashboard/exportação completa.

**Dependências/decisões:** H16 publicado; Etapa 7 aceita; P-05 para manter política dos três perfis.

**Trabalho por camada:** Frontend: ação de download, nome de arquivo, carga/erro/sucesso só após arquivo recebido; backend existente preservado.

**Aceite — cenário principal e falhas:** Arquivo tem exatamente a página/filtros autorizados, acentos corretos e fórmulas neutralizadas. Consulta/edição/admin seguem H16; 403/rede não dão toast de download concluído nem arquivo indevido.

**Validação/evidência e conclusão:** VF. Arquivo sintético comparado à página e caso de fórmula/403; nenhum dado real no Git. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8a2d"></a>

#### 8A2D — Definir fila operacional e responsabilidade de revisão

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-04; RQ-HOM-21; RQ-PEN-01–03, 05–06, 09–18 (telas/elementos na matriz).

**Escopo:** Separar pendências assistenciais de inconsistências de importação, ou agrupá-las com distinção; definir filtros/status/origem/período, revisão e responsabilidade.

**Dependências/decisões:** P-04; D11; H12/H14 e autorização por fonte/paciente.

**Trabalho por camada:** Documentação: vocabulário e decisão de produto, permissões, população dos contadores e retenção da revisão.

**Aceite — cenário principal e falhas:** Toda pendência/inconsistência possui destino e regra de acesso/decisão; texto livre não é classificado automaticamente; nenhum responsável presumido de dado legado.

**Validação/evidência e conclusão:** VD. Decisão/fluxo com exemplos e casos de visibilidade, antes de B/U. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8a2b"></a>

#### 8A2B — Consultar fila global autorizada sem varrer pacientes

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-04; RQ-HOM-10, 12, 21; RQ-PEN-01–06 (telas/elementos na matriz).

**Escopo:** Consulta agregada paginada, filtros aprovados e contadores por estado/escopo; projeção sanitizada e autorização antes da paginação.

**Dependências/decisões:** 8A2D; P-04; H12/H14 não fornecem fila global hoje.

**Trabalho por camada:** Backend: DTO/projeção e queries parametrizadas; dados/índices somente com evidência de necessidade, sem interpretar texto.

**Aceite — cenário principal e falhas:** Conjunto conhecido com dois pacientes/vínculos: linhas e contadores só do escopo autorizado; filtros/período coerentes, estado desconhecido distinto; sem N+1 de toda população e sem JSONB bruto.

**Validação/evidência e conclusão:** VB. HTTP/SQL com população conhecida, paginação/contadores e perfis sem visibilidade cruzada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8a2u"></a>

#### 8A2U — Encontrar e abrir pendência da fila preservando filtros

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-04; RQ-HOM-10, 12, 21; RQ-PEN-01–07 (telas/elementos na matriz).

**Escopo:** Lista/contadores/filtros da fila e Abrir contexto; registro de decisão fica para 8A3U.

**Dependências/decisões:** 8A2B aceito; 7D-R1; P-04.

**Trabalho por camada:** Frontend: rota, menu conforme capacidade, URL filtros/página, tabela acessível, estado vazio/erro.

**Aceite — cenário principal e falhas:** Filtro leva ao item certo; abrir pessoa/consulta e voltar conserva fila. Falha de contador não vira zero; sem autorização não aparece conteúdo antigo.

**Validação/evidência e conclusão:** VF. Roteiro de filtros/detalhe/voltar, contagem conhecida, 403 e teclado/390 px. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8a3b"></a>

#### 8A3B — Registrar revisão auditável de pendência

**Estado e cobertura:** Planejado; não aceito. RQ-PEN-08, 10–23 (telas/elementos na matriz).

**Escopo:** Nota de revisão separada de observação original, ator/data/status e controle de concorrência; sem classificar texto ou editar origem.

**Dependências/decisões:** 8A2D/P-04; P-03 para concorrência; avaliar H12 e 7C-R2B.

**Trabalho por camada:** Backend/dados: DTO/versionamento e registro de decisão autorizada; reaproveitar auditoria ou migration nova justificada.

**Aceite — cenário principal e falhas:** Duas revisões concorrentes não apagam decisão; nota não sobrescreve fato/observação original; ator vem da sessão, resolvida exige data, null conforme contrato aprovado; recusas não gravam.

**Validação/evidência e conclusão:** VB. Histórico antes/depois, dois escritores, autoria/versão e autorização. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8a3u"></a>

#### 8A3U — Revisar pendência com fato original e decisão visíveis

**Estado e cobertura:** Planejado; não aceito. RQ-PEN-08–23; RQ-EST-17 (telas/elementos na matriz).

**Escopo:** Modal/página com contexto, descrição atual, nota/responsável/data somente aprovados, status e confirmar/cancelar; retorno à fila ou pessoa.

**Dependências/decisões:** 8A3B; 8A2U quando vindo da fila; recuperação 7D.

**Trabalho por camada:** Frontend: leitura da decisão anterior, formulário e comparação; diálogo acessível e recibo.

**Aceite — cenário principal e falhas:** Revisor distingue fato de nota e conhece paciente/consulta; cancelamento/fechar não grava; sucesso relido; 409/403/resposta perdida recuperáveis sem duplicar decisão.

**Validação/evidência e conclusão:** VF. Revisão pela UI com histórico/recibo, foco do diálogo e caso de concorrência. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b1d"></a>

#### 8B1D — Aprovar métricas e semântica de período

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-06; RQ-HOM-01–05, 13–20; RQ-RES-29; RQ-DAS-01–11 (telas/elementos na matriz).

**Escopo:** Definir pacientes cadastrados, atendimentos, pendências abertas e lotes, população/perfil/período; definir origem/projeto/completude ou manter sem exibição.

**Dependências/decisões:** P-05; Etapa 7 aceita; não criar score clínico.

**Trabalho por camada:** Documentação: fórmula/tempo/denominador, casos conhecidos e regras de sobreposição. KPI não deriva de páginas parciais.

**Aceite — cenário principal e falhas:** Exemplo numérico reproduz cada métrica e efeito do filtro; zero/falha distintos; projetos sobrepostos não somam população; completude só se houver regra aprovada.

**Validação/evidência e conclusão:** VD. Tabela de definições e fixture com resultados esperados, aprovada antes de B/U. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b1b"></a>

#### 8B1B — Publicar os quatro indicadores operacionais aprovados

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-06; RQ-HOM-02–05; RQ-DAS-01–11 (telas/elementos na matriz).

**Escopo:** Agregado de quatro KPIs, definição/período e população autorizada; série/gráficos e atividade recente em 8B2.

**Dependências/decisões:** 8B1D; P-05.

**Trabalho por camada:** Backend: consulta agregada com autorização antes do cálculo, DTO explícito; sem endpoint genérico de banco.

**Aceite — cenário principal e falhas:** Resultados iguais à fixture aprovada nos períodos e três perfis; nenhuma soma de páginas; falta de acesso/serviço é erro e não zero; dado bruto não aparece.

**Validação/evidência e conclusão:** VB. Contrato e integração com contagens esperadas, período e dois escopos de acesso. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b1u"></a>

#### 8B1U — Exibir KPIs com período, definição e estados honestos

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-06; RQ-HOM-01–05; RQ-DAS-01–11 (telas/elementos na matriz).

**Escopo:** Quatro cards e filtro aprovado no Início/dashboard, legenda de definição; nenhum gráfico ainda.

**Dependências/decisões:** 8B1B; 8B1D; P-05.

**Trabalho por camada:** Frontend: leitura de agregado, período na URL, vazio/falha/carga e tabela/descrição acessível.

**Aceite — cenário principal e falhas:** Mudança de período só afeta KPIs definidos; erro não aparece como zero; estado sem dados é identificável; foco/teclado e 390 px operáveis.

**Validação/evidência e conclusão:** VF. Captura com resultados da fixture, troca de período e falha; comparação com API agregada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b2b"></a>

#### 8B2B — Publicar atividade recente e séries autorizadas em unidades separadas

**Estado e cobertura:** Planejado; não aceito. RQ-HOM-11, 13–20; RQ-RES-29–30; RQ-HIS-03–04, 11; RQ-DAS-01–11 (telas/elementos na matriz).

**Escopo:** B2.1 últimas consultas/pendências com links/fontes; B2.2 série mensal de atendimentos; B2.3 origem/projetos e timeline integrada apenas se semântica aprovada. Cada projeção é uma unidade, não uma query clínica universal.

**Dependências/decisões:** 8B1D/P-05; 8B1B para período; P-04 para fila. B2.3 pode ser adiado à VP.

**Trabalho por camada:** Backend: DTO/queries paginadas ou agregadas específicos, autorização e precisão/proveniência; sem classificar consulta completa automaticamente.

**Aceite — cenário principal e falhas:** Cada unidade bate com fixture/IDs conhecidos; ordenação/limite explícitos; sobreposição de projeto não duplica população; origem não confunde diagnóstico/proveniência; sem acesso cruzado.

**Validação/evidência e conclusão:** VB. Aceite individual B2.1/B2.2/B2.3 com dados/contagens esperados e guard; B2.3 bloqueada até definição. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b2u"></a>

#### 8B2U — Abrir atividade recente e interpretar séries com tabela equivalente

**Estado e cobertura:** Planejado; não aceito. RQ-HOM-11, 13–20; RQ-RES-29–30; RQ-HIS-03–04, 11; RQ-DAS-01–11 (telas/elementos na matriz).

**Escopo:** U2.1 recentes no Início; U2.2 gráfico mensal+tabela; U2.3 gráficos origem/projeto e timeline integrada após contrato. Mesmo particionamento de B2.

**Dependências/decisões:** 8B2B unidade correspondente; 7D-R1; P-05.

**Trabalho por camada:** Frontend: gráfico sem score, tooltip/legenda acessíveis, link para consulta/pendência exatos e tabela de valores; cada unidade aceita sozinha.

**Aceite — cenário principal e falhas:** Recentes abrem contexto exato; série equivale à tabela e filtro; falha não renderiza dado antigo/zero; vazio e itens fora do escopo explícitos; teclado permite ler sem tooltip de mouse.

**Validação/evidência e conclusão:** VF. Captura e valores/links por unidade, caso vazio/erro e revisão humana de interpretação. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b3d"></a>

#### 8B3D — Decidir busca, colunas e origem de negócio

**Estado e cobertura:** Planejado; não aceito. RQ-LIS-02–05, 13–21; RQ-CAD-03, 20, 25–30; RQ-FIC-02, 05; RQ-RES-02; RQ-ATD-20 (telas/elementos na matriz).

**Escopo:** Código de pessoa, nascimento, origem, projeto/período, última consulta e procedência; definir o que é filtro, dado clínico e proveniência.

**Dependências/decisões:** P-05; fontes clínicas e H2/H3/H5. Não derivar origem de hasChagas.

**Trabalho por camada:** Documentação: dicionário/projeção e busca prévia ampliada, precisão de nascimento e política do código.

**Aceite — cenário principal e falhas:** Cada coluna/filtro tem fonte/regra e exemplo de desconhecido; código do protótipo não é gerado ficticiamente; decisão distingue proveniência de condição clínica.

**Validação/evidência e conclusão:** VD. Dicionário e seleção de primeira expansão, sem exigir todos os filtros de uma vez. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b3b"></a>

#### 8B3B — Ampliar projeção de pacientes por fatias aprovadas

**Estado e cobertura:** Planejado; não aceito. RQ-LIS-02–05, 13–21; RQ-CAD-03, 09, 20, 25–30; RQ-FIC-02, 05; RQ-RES-02; RQ-ATD-20 (telas/elementos na matriz).

**Escopo:** B3.1 código/nascimento/idade e busca; B3.2 origem/proveniência; B3.3 projeto/período/última consulta. Três contratos/unidades de expansão, compatíveis com busca atual.

**Dependências/decisões:** 8B3D; P-05; idade D1 calculada com referência.

**Trabalho por camada:** Backend/dados: DTO e queries de lista autorizadas, sem buscar cada ficha na UI; novo índice/modelo só justificado.

**Aceite — cenário principal e falhas:** Cada unidade: filtro antes da paginação, campos corretos e null/precisão preservados; idade usa referência declarada, procedência sanitizada; três perfis só veem seu conjunto.

**Validação/evidência e conclusão:** VB. Aceite separado B3.1/B3.2/B3.3 com paginação, fonte dos campos e casos de homônimo/autorização. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b3u"></a>

#### 8B3U — Usar tabela ampliada e atalhos por pessoa

**Estado e cobertura:** Planejado; não aceito. RQ-LIS-02–05, 09–10, 13–21; RQ-CAD-03, 09, 20, 25–30; RQ-FIC-02, 05; RQ-RES-02; RQ-ATD-20 (telas/elementos na matriz).

**Escopo:** U3.1 tabela/busca código/nascimento; U3.2 origem/proveniência; U3.3 projeto/período/última consulta; U3.4 Editar/Novo atendimento diretos com nome/ID e capacidade. Quatro unidades separadas.

**Dependências/decisões:** 8B3B unidade correspondente; U3.4 pode usar H3/rotas atuais sem depender das novas colunas; P-05.

**Trabalho por camada:** Frontend: filtros em URL, colunas/tabela responsiva, estados e ações reais por perfil, preservando busca ao voltar.

**Aceite — cenário principal e falhas:** Cada filtro/coluna coincide com contrato; não simula total de páginas; Editar abre edição e Novo atendimento abre a pessoa correta. Vazio/falha não afirmam inexistência; teclado/320 px alcançam ações.

**Validação/evidência e conclusão:** VF. Roteiro/captura por unidade e ID de destino/payload, sem N+1 de fichas. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c1"></a>

#### 8C1 — Consultar lotes e linhas sanitizados pela interface

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-05; RQ-IMP-01–11, 19–24 (telas/elementos na matriz).

**Escopo:** Lista → detalhe → linhas/erros paginados e voltar; somente metadados já publicados. Não publicar arquivo/hash/candidatos/motivo bruto ausentes no DTO.

**Dependências/decisões:** H14/ADR-023; Etapa 7 aceita; ambiente sintético para provas. Sem necessidade de upload para este pacote.

**Trabalho por camada:** Frontend: rotas/menu conforme capacidades efetivas, paginação e códigos de erro compreensíveis. Backend existente reutilizado.

**Aceite — cenário principal e falhas:** Admin vê lotes ordinários; consulta/edição só com vínculo de todos os pacientes/proveniência íntegra. Segundo lote/página funciona; revised lot permanece fora da porta ordinária; 403 não deixa dados do lote anterior.

**Validação/evidência e conclusão:** VF. Lista/detalhe em três perfis com fixtures reais do runner e caso de proveniência/vínculo recusados. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c2b"></a>

#### 8C2B — Evoluir relatório de simulação e metadados por unidades

**Estado e cobertura:** Planejado; não aceito. RQ-IMP-01–24, 32, 36, 39, 42–51 (telas/elementos na matriz).

**Escopo:** C2B.1 contagens/códigos do dry-run e totais reais; C2B.2 arquivo/hash/versões sanitizados; C2B.3 candidatos de conflito com autorização. Três unidades; C2B.3 posterior/VP até decidir exposição mínima.

**Dependências/decisões:** H14; P-05 para metadados e P-04 para conflito. Dry-run atual mínimo permanece válido até incremento.

**Trabalho por camada:** Backend/importador: DTOs sanitizados do resultado do pipeline e projeção de lote; nunca devolver linha bruta/dados de pessoa não autorizada. Sem inferir sucesso pelo timer.

**Aceite — cenário principal e falhas:** C2B.1 contagens batem com fixture e simulação não grava nem consome sequência; C2B.2 valores reais e escopo; C2B.3 candidato só autorizado, ausência explicada sem vazamento. Reenvio informa lote efetivo.

**Validação/evidência e conclusão:** VI. Aceites separados com pipeline/HTTP/SQL, comparação de contagens/metadados e guard; nenhum XLSX real versionado. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c2u"></a>

#### 8C2U — Selecionar, simular e confirmar XLSX em unidades concluíveis

**Estado e cobertura:** Planejado; não aceito. RQ-HOM-09; RQ-IMP-01–51; RQ-EST-17 (telas/elementos na matriz).

**Escopo:** C2U.1 seleção real/finalidade/código/cancelar/dry-run mínimo; C2U.2 confirmação e lote efetivo; C2U.3 relatório rico/metadados; C2U.4 conflito autorizado. Quatro unidades; não bloquear U.1/U.2 pelo relatório ainda ausente.

**Dependências/decisões:** H14 para U.1/U.2; 8C1; C2B correspondente para U.3/U.4; P-04/P-05; recuperação de operação não reenvia importação cegamente.

**Trabalho por camada:** Frontend: File real multipart, estados por resposta, revisão/finalidade e confirmação única; sem porcentagem/count/log fictício.

**Aceite — cenário principal e falhas:** U.1 arquivo inválido/recusa não grava e troca/cancelar preserva escolha consciente; U.2 simular zero escrita, confirmar/reenvio mostra lote efetivo e recusa de arquivo alterado explica revisão; U.3 contagens/metadados reais; U.4 links sem exposição indevida. Resposta perdida mantém incerto e verifica lote/operação autorizados.

**Validação/evidência e conclusão:** VI. Roteiro separado por unidade com XLSX sintético/POST contados, lote relido e falhas; período/etapa não avançam por timer. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c3d"></a>

#### 8C3D — Decidir upload de contrarreferência

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-49 (telas/elementos na matriz).

**Escopo:** Documento versus estado, formatos/tamanho, armazenamento, retenção, metadados e autorização/download; prioridade posterior ou promoção.

**Dependências/decisões:** P-07/D10; múltiplas contrarreferências já aprovadas não implicam upload aprovado.

**Trabalho por camada:** Documentação/arquitetura: representação e política de arquivos com ciclo de acesso/remoção.

**Aceite — cenário principal e falhas:** Decisão define anexado/recebido/pendente, erro de upload, retenção e escopo; upload não vira prova de cuidado realizado nem coluna improvisada.

**Validação/evidência e conclusão:** VD. Decisão aprovada e fluxo/contrato propostos; sem arquivos reais neste pacote. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c3b"></a>

#### 8C3B — Anexar e ler documento autorizado de contrarreferência

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-49 (telas/elementos na matriz).

**Escopo:** C3B.1 upload/metadados/associação; C3B.2 download/retirada conforme retenção aprovada. Duas unidades separadas; arquivo fora do Git.

**Dependências/decisões:** 8C3D/P-07; H10 e arquitetura de armazenamento.

**Trabalho por camada:** Backend/dados: validar formato/tamanho, storage e recurso/guard; migration incremental se necessária, sem substituir resumo clínico.

**Aceite — cenário principal e falhas:** Arquivo sintético ligado ao episódio correto; falha não apresenta anexo íntegro; download só autorizado; dois episódios não compartilham por engano; retirada mantém auditoria conforme decisão.

**Validação/evidência e conclusão:** VB. Integração de storage/HTTP e associação/guard por unidade, falha parcial e conteúdo sintético. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c3u"></a>

#### 8C3U — Associar e consultar anexo sem perder episódio

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-49 (telas/elementos na matriz).

**Escopo:** C3U.1 selecionar/enviar/cancelar e status; C3U.2 download/retirada explícita. Duas unidades, resumo/conduta continuam próprios.

**Dependências/decisões:** 8C3B unidade correspondente; P-07; contexto 7D-R1.

**Trabalho por camada:** Frontend: upload real, progresso apenas verificável, erro/estado e links autorizados.

**Aceite — cenário principal e falhas:** Episódio correto mantém texto e anexo; cancelar não envia; falha permite verificar estado sem duplicar; arquivo disponível só após confirmação; acesso revogado não baixa.

**Validação/evidência e conclusão:** VF. Roteiro/capturas por unidade e ID de contrarreferência/anexo, cancelamento e falha de autorização. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c4d"></a>

#### 8C4D — Definir reprocessamento como novo elo explícito

**Estado e cobertura:** Planejado; não aceito. RQ-IMP-52–57 (telas/elementos na matriz).

**Escopo:** Separar reenvio idempotente, novo elo --reprocessar e revisão de hash diferente; decidir quem pode comandar/retomar e metadados necessários.

**Dependências/decisões:** P-09; semântica existente CLI/ADR-022/023.

**Trabalho por camada:** Documentação: desenho HTTP proposto compatível com proveniência/locks, confirmação e correlação da operação.

**Aceite — cenário principal e falhas:** Exemplos de três ações têm resultado e autorização distintos; clique não vira novo hash/novo elo automático; concorrência e resposta perdida têm prova de resultado.

**Validação/evidência e conclusão:** VD. Decisão/contrato e diagrama aprovados antes de B/U. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c4b"></a>

#### 8C4B — Publicar comando de novo elo com vínculo de proveniência

**Estado e cobertura:** Planejado; não aceito. RQ-IMP-52–57 (telas/elementos na matriz).

**Escopo:** Operação explícita de reprocessamento, consulta do elo/resultado e conflito; reutilizar invariantes CLI sem acrescentar flag tácita ao POST ordinário.

**Dependências/decisões:** 8C4D/P-09; 5B/5D aceitos; correlação/guard definidos.

**Trabalho por camada:** Backend/importador: DTO/worker, lock/idempotência da intenção e projeção encadeada; dados existentes preservados.

**Aceite — cenário principal e falhas:** Mesmo conteúdo produz um novo elo quando solicitado uma vez; reenvio ordinário não produz elo. Concorrência/resposta perdida não duplicam; sem autorização nada grava; proveniência permanece ligada.

**Validação/evidência e conclusão:** VI. HTTP/SQL com cadeia de dois elos e concorrência; comparação com invariantes CLI já validadas. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c4u"></a>

#### 8C4U — Confirmar novo elo e consultar cadeia de reprocessamento

**Estado e cobertura:** Planejado; não aceito. RQ-IMP-52–57; RQ-EST-17 (telas/elementos na matriz).

**Escopo:** Aviso do efeito/lote anterior, confirmar/cancelar, resultado/consulta da cadeia e retorno ao detalhe; outra ação para reenvio.

**Dependências/decisões:** 8C4B; 8C1; P-09.

**Trabalho por camada:** Frontend: ação por capacidade, revisão do efeito e consulta da operação, sem contadores simulados.

**Aceite — cenário principal e falhas:** Cancelar não envia; confirmar uma vez abre elo correto; resposta perdida só consulta resultado; outro hash direciona revisão temporal; usuário distingue lote anterior e efetivo.

**Validação/evidência e conclusão:** VI. Roteiro sintético com cadeia/contagem de comandos e resultado incerto, 403/409. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c5b"></a>

#### 8C5B — Permitir consulta e retomada de revisão temporal

**Estado e cobertura:** Planejado; não aceito. RQ-IMP-58 (telas/elementos na matriz).

**Escopo:** C5B.1 fonte/capacidades; C5B.2 proposta/decisão; C5B.3 aplicação/encerramento e resultado. Três unidades de leitura autorizada; POST existentes permanecem portas próprias.

**Dependências/decisões:** P-09/P-04; H15/ADR-022; entitlement de gestão separado de perfil e autorização de fonte.

**Trabalho por camada:** Backend: DTOs GET/capacidades e consulta de estado/correlação, sanitização e regras de acesso sem abrir artefato bruto.

**Aceite — cenário principal e falhas:** Cada unidade retoma processo no estado real; gestor sem autorização da fonte não lê conteúdo; não gestor não publica/aplica. Consulta nunca aplica decisão nem altera hash; estado incerto é verificável ou mantém bloqueio.

**Validação/evidência e conclusão:** VB. Aceites separados de leitura/guard e estados da revisão, usando invariantes F/T existentes onde correspondem. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c5u"></a>

#### 8C5U — Percorrer revisão temporal em cinco unidades de interface

**Estado e cobertura:** Planejado; não aceito. RQ-IMP-58 (telas/elementos na matriz).

**Escopo:** C5U.1 fonte/autorização; C5U.2 arquivo e simulação; C5U.3 comparação/decisão seletiva; C5U.4 publicação/aplicação única; C5U.5 encerramento/retomada. Cinco unidades separadas, sem inventar nova visita por hash.

**Dependências/decisões:** 8C5B unidade de leitura correspondente e H15; P-09; não pressupor entitlement de administração.

**Trabalho por camada:** Frontend: telas por estado, ações/capacidades, confirmações e recibos; distinguir corrigir/nova visita/consolidado segundo contrato.

**Aceite — cenário principal e falhas:** U.1 escopo válido; U.2 dry-run sem escrita; U.3 decisão seletiva explícita; U.4 aplica uma vez; U.5 retoma/encerra estado correto. Em cada unidade revogação/conflito/resposta perdida não reaplicam nem perdem decisão confirmada.

**Validação/evidência e conclusão:** VI. Roteiro/evidência por unidade e fonte/hash/proposta/decisão/aplicação, todos sintéticos; cadeia e autorização reconciliadas. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8d1d"></a>

#### 8D1D — Decidir gestão de identidade e limites de administração

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-07; RQ-USR-01–10 (telas/elementos na matriz).

**Escopo:** Usuários e Minha conta, perfis, ativação/inativação, último administrador, autoalteração, suporte, auditabilidade e política institucional de vínculo.

**Dependências/decisões:** P-08; H1 e política sintética não equivalem a liberação real 9D.

**Trabalho por camada:** Documentação: regra de gestão e escopo de dados de identidade; gestão não concede entitlement temporal nem vínculo clínico por efeito lateral.

**Aceite — cenário principal e falhas:** Cada ação tem responsável/capacidade, regra de sessão e caso de bloqueio; não propor exclusão definitiva ou ligação automática a digitador legado.

**Validação/evidência e conclusão:** VD. Decisão com cenários de último admin/autoalteração/revogação, antes dos endpoints novos. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8d1b"></a>

#### 8D1B — Consultar usuários e identidade ampliada com escopo explícito

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-07; RQ-USR-01–10; RQ-CTA-03–04 (telas/elementos na matriz).

**Escopo:** D1B.1 listagem paginada admin de nome/login/perfil/status; D1B.2 me com campos aprovados. Duas unidades separadas, sem senha/hash.

**Dependências/decisões:** 8D1D/P-08; H1.

**Trabalho por camada:** Backend: DTO/queries/guard específicos; usar usuários existentes, sem alterar gestão de vínculo clínico.

**Aceite — cenário principal e falhas:** D1B.1 consulta/edição não listam usuários, paginação funciona; D1B.2 só própria identidade e fields aprovados. Nenhuma senha/hash/login de terceiros em mensagem pública de erro.

**Validação/evidência e conclusão:** VB. Aceites separados de listagem/me com três perfis e paginação/negação. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8d1u"></a>

#### 8D1U — Ler usuários e Minha conta sem afirmar estado fictício

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-07; RQ-USR-01–10; RQ-CTA-03–04 (telas/elementos na matriz).

**Escopo:** D1U.1 tabela/admin e autoações indisponíveis conforme regra; D1U.2 dados de conta/suporte/sair. Duas unidades; ações de alteração em D2U.

**Dependências/decisões:** 8D1B unidade correspondente; P-08; 7D-U4.

**Trabalho por camada:** Frontend: rotas/menus por capacidade, tabela responsiva, conta com fields reais e logout local atual.

**Aceite — cenário principal e falhas:** Listagem só para autorizado; conta só mostra login/status quando publicados; erro não usa mock. Sair limpa sessão/rascunhos; retorno/390 px/teclado funcionam.

**Validação/evidência e conclusão:** VF. Capturas/roteiros por unidade, três perfis e erro de identidade. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8d2b"></a>

#### 8D2B — Alterar perfil e estado do usuário com concorrência e auditoria

**Estado e cobertura:** Planejado; não aceito. RQ-USR-11–18 (telas/elementos na matriz).

**Escopo:** D2B.1 perfil; D2B.2 ativação/inativação. Duas unidades versionadas, sem excluir usuário ou conceder gestão temporal automaticamente.

**Dependências/decisões:** 8D1D/P-08; 8D1B.

**Trabalho por camada:** Backend/dados: comandos explícitos, guard/auditoria, revogação/revalidação de sessão e regras de autoalteração/último administrador.

**Aceite — cenário principal e falhas:** Cada unidade: operação válida relida; autoalteração/último admin/versão obsoleta recusados conforme política aprovada; sessão afetada revalidada; sem edição por consulta/edição.

**Validação/evidência e conclusão:** VB. Dois administradores/versões, log de decisão, sessão afetada e três perfis; aceite separado por comando. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8d2u"></a>

#### 8D2U — Confirmar alteração de perfil ou ativação com efeitos compreensíveis

**Estado e cobertura:** Planejado; não aceito. RQ-USR-11–18; RQ-EST-17 (telas/elementos na matriz).

**Escopo:** D2U.1 modal/página perfil com anterior→novo; D2U.2 ativar/inativar com consequência. Duas unidades separadas, foco/fechar/cancelar acessíveis.

**Dependências/decisões:** 8D2B unidade correspondente; P-08; padrão de recuperação de operação definido.

**Trabalho por camada:** Frontend: leitura atual, seleção, revisão e confirmação, recibo e conflito; nenhum toggle puramente local.

**Aceite — cenário principal e falhas:** Cancelar/X/Escape não escreve; confirmar um comando real; 409 preserva escolha e compara estado; 403/resposta perdida verificam sem repetir; conta/sessão afetadas refletem revalidação.

**Validação/evidência e conclusão:** VF. Roteiro por comando com payload/estado relido, foco do diálogo e caso de conflito. Concluir somente pela condição comum acima e pelos critérios desta unidade.

### Disposição documental

<a id="doc-ex"></a>

#### DOC-EX — Registrar exclusões sem apagar legado

**Estado e cobertura:** Disposição documentada; não é alteração funcional. RQ-LOG-08; RQ-PRJ-02; RQ-USR-19; RQ-EST-18–23 (telas/elementos na matriz).

**Escopo:** Credenciais de demo, timers/count/hash fictícios, Localizado funcional, origem que inventa Chagas, escores/inferências e data fixa do protótipo ficam fora do produto. Legado/bruto permanecem conforme fontes.

**Dependências/decisões:** D1/D12/ADR-017–024; destinos EX da matriz.

**Trabalho por camada:** Documentação nesta entrega: disposição e justificativa individual; implementação futura não deve reincorporar esses comportamentos.

**Aceite — cenário principal e falhas:** Cada item EX tem motivo, distinção do dado legítimo (ex.: localização de prontuário) e fonte; nenhum dado legado é removido nesta análise.

**Validação/evidência e conclusão:** VD. Linhas EX conferidas com fontes e diff exclusivamente documental. Concluir somente pela condição comum acima e pelos critérios desta unidade.

## Próximo trabalho

Concluir as correções e a recuperação da Etapa 7, seguindo a sequência acima,
antes do aceite da VU1 e da ampliação operacional. Etapas 5 e 6 mantêm seus
aceites sintéticos; Etapa 7 mantém implementação e evidências parciais, sem
aceite completo. O [relatório histórico](validacoes/VALIDACAO_ETAPA_7.md) não
elimina a [reauditoria](frontend/VISAO_E_ESPECIFICACAO.md#reavaliação-das-sete-lacunas-e-cobertura-de-validação).

O próximo pacote pode ser 7D-R1 (contexto de atendimento), seguido de R4/R2/R5;
7B-R1B e o desenho R6D são frentes independentes. Confirmar as decisões P-01–09
quando necessárias ao pacote; esta documentação apresenta propostas, sem
aprovação implícita. Até essa escolha, trabalhar no que não depende dela.
Upload/D9/gestão e módulos sem HTTP têm destinos e dependências explícitos;
não se tornam escopo implementado por constarem do protótipo.

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
