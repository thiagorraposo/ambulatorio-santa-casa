# Arquitetura do Backend — Fundação e incrementos clínicos sintéticos

Atualizado em: 2026-10-03

Status: fundação pronta para os módulos clínicos da Etapa 5, ainda exclusivamente
com dados sintéticos. Evidências: `docs/validacoes/VALIDACAO_ETAPA_4C.md`.

## Escopo e fluxo

O backend é um monólito modular NestJS/TypeScript com módulos `health`, `auth` e
`pacientes` e `importacoes`. A API oferece operações clínicas transacionais e
importação HTTP condicional com credencial separada; frontend é etapa posterior.

```text
HTTP -> autenticação -> autorização -> controller -> service -> repository
     -> DatabaseService -> ambulatorio_aplicacao -> PostgreSQL
```

Controllers limitam-se ao contrato HTTP; services coordenam comportamento;
repositories contêm SQL parametrizado; DTOs separam entrada/saída do modelo
físico. `common` contém somente banco e infraestrutura HTTP compartilhados. Não
há dependências circulares nem abstrações antecipatórias.

## Autenticação e autorização

`usuario_aplicacao` é independente de roles PostgreSQL e do responsável legado.
Senhas persistem somente como bcrypt. `POST /auth/login` usa resposta uniforme e
emite JWT Bearer HS256; algoritmo, expiração e secret externo são obrigatórios.
A cada requisição protegida, assinatura/expiração são validadas e usuário ativo e
perfil são relidos, dando efeito imediato à inativação e troca de perfil.

Não há revogação individual nem refresh token. A duração padrão é 900 segundos e
o máximo aceito é 24 horas. O risco residual é uso de token roubado até expirar;
revogação entra quando houver requisito de encerrar sessão específica antes disso.

Guards globais separam autenticação de autorização: somente `@Public` abre rota;
`@Perfis` concede operação a `consulta`, `edicao` ou `administracao`. Credencial
ausente, inválida ou expirada produz 401; perfil insuficiente, 403. A matriz está
em `docs/validacoes/VALIDACAO_ETAPA_4C.md`.

A negação por padrão é de autenticação, não de toda operação: `PerfisGuard`
retorna autorização quando a rota não declara `@Perfis`. Antes de cada módulo
clínico, exigir matriz explícita de operações e testes que detectem ausência de
proteção esperada; os módulos clínicos usam `ClinicalAccessService` para identidade ativa, perfil e vínculo por paciente.

No ambiente sintético, `CLINICAL_ACCESS_POLICY` declara `desabilitada` (padrão),
`vinculo_explicito` ou `todos_sinteticos`. Vínculo explícito filtra listagem e CSV
e bloqueia consulta/escrita em paciente não autorizado. Administração concede
ou revoga vínculos pela função SQL restrita. Produção aceita somente a política
desabilitada; essa configuração não constitui aprovação para dados reais.

O login limita dez tentativas por IP em 60 segundos e então retorna 429. O
contador é por processo. Coordenação distribuída e proxy/IP confiável pertencem
à implantação futura com múltiplas instâncias.

## Persistência e menor privilégio

O driver `pg` usa SQL explícito e parâmetros posicionais. Migrations ficam fora
da API; não há ORM sincronizando schema, DDL de bootstrap ou migration no startup.

Cada chamada de consulta ao `DatabaseService` abre transação, executa
`SET LOCAL ROLE ambulatorio_aplicacao` e
`SET LOCAL search_path`, e encerra com `COMMIT` ou `ROLLBACK`. Estado local não
sobrevive à transação; falha de rollback destrói a conexão. `APP_DB_ROLE` recusa
outra role. O login técnico é `NOINHERIT`, sem ownership, DDL ou capacidade de
assumir owner/importador. Perfil funcional não altera a role efetiva.

Consultas isoladas do helper não compartilham automaticamente uma transação.
`DatabaseService.transaction` oferece uma única conexão/transação para operações
compostas. Escritas clínicas iniciam contexto atribuído ao ator na role de
serviço autenticado e então assumem a role da aplicação. A concessão de vínculo
assume a role de serviço somente para chamar a função administrativa restrita.
Falhas, inclusive constraints diferidas no commit, revertem a operação inteira.

`ambulatorio_aplicacao` não acessa `importacao_lote`, `importacao_linha` ou
`importacao_registro`, inclusive `dados_brutos`. O bloqueio está no PostgreSQL.
O importador não acessa `usuario_aplicacao`.

As funções temporais das migrations 29–30 são separadas do backend clínico:
`ambulatorio_revisao_gestor` recebe somente EXECUTE para registrar fonte e
conceder/revogar autorizações. A camada autenticadora deve estabelecer o contexto
do ator na mesma transação; a função lê o ledger do XID real. Nenhum papel
operacional herda gestão temporal e nenhum perfil clínico recebe autorização
automática. Rotas de revisão existem somente para o ambiente sintético configurado.
O serviço de revisão permanece sem EXECUTE do executor privado; a validação
diferida tem dono técnico restrito.
O serviço recebe EXECUTE da publicação de metadados (31–34), sem acesso direto
a tabelas ou à função interna. O wrapper fecha/normaliza a entrada, e o servidor
observa valores e tokens e calcula o hash. A função verifica autorização, versão,
âncoras e metadados. As migrations 35–39 vinculam o plano a arquivos técnicos
imutáveis recuperáveis por bytes/hash, verificam todos os campos alterados e
transformações fechadas, e permitem aprovação de correção apenas com prova
atribuível desde a importação da linha-base. Não expõem bruto ou arquivos por
HTTP; recuperação restrita exige autorização da mesma fonte. Migrations 40–42 fornecem avaliação de decisão existente em READ ONLY e executor
privado de alvos existentes, sem rota HTTP ou EXECUTE para operadores. A identidade
do dry-run entra exclusivamente pela camada autenticadora confiável, com papel
separado e autorização da fonte, evitando escrita no ledger; a aplicação usa o
ledger e revalida sob locks. Correções/proveniência/eventos/avanço da fonte têm
transação única. Migrations 43–49 acrescentam criação/fechamento, continuidade
histórica e diagnóstico restrito; 50–51 simulam arquivos antes do staging e
protegem identidade de ocorrência; 56 recebe o XLSX e faz staging/preparação
atômicos; 57 cria wrappers de aplicação, finalização e diagnóstico. Os wrappers
não recebem EXECUTE para papéis operacionais nas migrations. Apenas o runner de
homologação concede esses direitos no banco descartável. A execução HTTP também
exige `NODE_ENV=test` e staging ativado. Isso não substitui o aceite integral dos
planos clínicos nem habilita revisão fora desse ambiente.

## Contratos HTTP

O contrato vigente é `/v1`; as rotas sem prefixo permanecem aliases compatíveis
dos mesmos controllers, DTOs e guards. Nenhuma versão `/v2` foi publicada. As
URLs sem prefixo abaixo também estão disponíveis em `/v1`.

- `GET /health`: público; retorna `{ "status": "ok", "database": "up" }` após
  consulta real; banco indisponível retorna 503 sanitizado.
- `POST /auth/login`: público; aceita somente `{ "login", "senha" }`; sucesso
  201 retorna `{ "accessToken", "tokenType": "Bearer", "expiresIn" }`.
- `GET /auth/me`: Bearer obrigatório; retorna somente `usuarioId`, `nome` e `perfil`.
- `GET /pacientes?limit=20&offset=0`: limites validados, busca por nome/sexo e
  escopo por vínculo; retorna DTO com `pacienteId` e `nome`.
- `GET /pacientes/:id`: ficha e idade derivada com `dataReferenciaIdade`.
  `telefones` e `atendimentos` são paginados pelo mesmo `limit`/`offset` da
  consulta; a resposta informa `paginacaoColecoes`.
- `POST /pacientes` e `PATCH /pacientes/:id`: cadastro e alteração versionada.
  A edição inclui comunidade, endereço e `telefonesAdicionar`; preserva contatos
  existentes e endereços anteriores. Campos omitidos permanecem inalterados.
- `POST /pacientes/:id/atendimentos`: grava atendimento, diagnóstico, dados
  clínicos, exames, rastreio e pendências numa transação; consulta por ID pertence
  obrigatoriamente ao mesmo paciente.
- `PATCH /pacientes/:id/atendimentos/:atendimentoId`: edita dados do atendimento
  com `versao` obrigatória e vínculo ao paciente; conflito de versão retorna 409.
- `GET /pacientes/:id/atendimentos/:atendimentoId`: consulta exames, pendências e
  rastreios familiares aninhados com `limit`/`offset` e
  `paginacaoColecoes`. O atendimento pertence ao paciente da rota.
- `GET /pacientes/:id/atendimentos`, `/exames`, `/projetos`, `/retornos-bzn` e
  `/pendencias`: arrays paginados por `limit` (1–100, padrão 20) e `offset`
  (0–100000, padrão 0), com ordenação estável. Pendências aceita filtro `status`.
- `PUT /pacientes/:id/projetos`: cria ou atualiza a associação pelo `projetoId`
  ativo. Exige pelo menos um campo de estado; campos omitidos não são alterados.
- `GET/PUT /pacientes/:id/notificacao`: consulta o registro único ou `null` e
  cria/atualiza seus campos informados. O `PUT` exige pelo menos um campo de
  estado e não altera campos omitidos.
- `GET/POST /pacientes/:id/encaminhamentos`: lista paginada, com filtro opcional
  `status`, e criação vinculada a `atendimentoId` do paciente. Projeto e tipo de
  encaminhamento informados devem estar ativos.
- `GET/POST /pacientes/:id/encaminhamentos/:encaminhamentoId/contrarreferencias`:
  lista paginada e criação de episódios vinculados ao encaminhamento do
  paciente. Cada episódio é `acompanhamento_cuidado` do tipo
  `contrarreferencia`; o contrato não inclui upload.
- `GET/POST /pacientes/:id/ocorrencias-anuais`: consulta paginada e registro de
  `ultimo_comparecimento_ano_informado` em `evento_clinico.ano_evento`. Entrada
  `{ "ano": 2025 }` registra precisão anual, sem fabricar dia/mês ou visita.
  Ano futuro é recusado. A resposta informa `precisao: "ano"`.
- `GET/POST /pacientes/:id/retornos-anuais`: consulta paginada e criação de
  `acompanhamento_cuidado` do tipo `retorno_anual` com `atendimentoId` do paciente
  e `dataRealizada` efetiva obrigatória.
- `POST /pacientes/:id/pendencias` e
  `PATCH /pacientes/:id/pendencias/:pendenciaId`: criam pendência textual de um
  atendimento do paciente e atualizam seu status. `resolvida` exige
  `dataResolucao`; a data não é aceita em outro status.
- `POST /pacientes/:id/retornos-bzn`: exige tratamento do paciente e data real.
- `POST /pacientes/:id/tratamento-bzn`: registra tratamento canônico e reações;
  vínculo de atendimento é conferido e duplicação retorna 409 sem sobrescrita.
- `PUT /pacientes/:id/acesso/:usuarioId`: administração com contexto do ator.
- `GET /pacientes/export.csv`: exportação paginada sob o mesmo escopo de vínculo.
- `GET /importacoes/lotes` e `GET /importacoes/lotes/:id`: views sanitizadas;
  `limit`/`offset` do detalhe paginam linhas e retornam `paginacaoLinhas`.
  `apenasComErro=true` filtra linhas com ocorrência; DTOs retornam somente códigos
  fechados (`codigoErro`) derivados do status e de categorias aprovadas pelo
  importador. Mensagens livres, dados brutos, valores clínicos e stack não são
  consultáveis pela API. A migration 53 corrige também a indicação de ocorrência
  para não marcar como erro a mensagem informativa `linha importada`.
- `POST /importacoes`: worker sintético condicional, desabilitado por padrão.
  Retorna lote efetivo também em reenvio idempotente com outro código solicitado;
  diferencia `codigoLote` e `codigoLoteSolicitado`. `dryRun` aceita booleano ou
  os textos multipart `true`/`false`; outros valores retornam 400.
  O subprocesso recebe ambiente restrito às variáveis de execução e à senha do
  importador, sem credenciais da aplicação/identidade nem segredo JWT.
- `GET /auth/authorization-check`: prova técnica para `edicao` e `administracao`.

Os novos recursos aceitam e retornam nomes de campos `camelCase`, IDs decimais
como texto e datas ISO (`AAAA-MM-DD`). Todas as coleções novas acima usam a mesma
paginação 1–100/0–100000, sem contagem total. `consulta` lê; `edicao` e
`administracao` leem e escrevem; operações sobre paciente, atendimento ou
encaminhamento exigem o vínculo correspondente e a política clínica configurada.
Cada escrita usa uma transação com contexto do ator, inclusive verificações de
vínculo e catálogo. Nenhuma dessas rotas expõe `dados_brutos`.

Entrada inválida retorna 400. O filtro padroniza `statusCode`, `error` e
`message`, sem stack, SQL, credenciais ou detalhes do schema. DTOs e seleções
explícitas limitam os campos retornados. A uniformização dos DTOs dos recursos
clínicos preexistentes permanece no aceite de 5E.
Rotas privadas sem política `@Perfis` são recusadas com 403. Somente `@Public`
permite acesso público; políticas da operação prevalecem sobre as da classe.

## Logs e configuração

`NODE_ENV`, `API_PORT`, `APP_DB_*`, `APP_DB_ROLE`, `AUTH_JWT_SECRET` e
`AUTH_JWT_EXPIRES_IN_SECONDS` são obrigatórios; valor ausente/inseguro impede o
startup. Segredos existem somente no ambiente.

Logs usam allowlist técnica. Não registram body, login completo, senha, hash,
JWT, Authorization, secret, connection string, SQL/valores, nome de paciente,
telefone, endereço, conteúdo clínico ou JSONB bruto. Erros internos registram
somente tipo sanitizado.

## Docker, healthcheck e futuro React

O backend depende somente do health do PostgreSQL, não executa migrations nem
interfere no importador. A imagem roda como `node`, portas ficam em loopback e
segredos são externos. `/health` funciona como prontidão de processo+banco; uma
liveness separada só será criada se um orquestrador exigir outra semântica.

O futuro React deverá enviar `Authorization: Bearer <JWT>`, obter token no login
e reler identidade em `/auth/me`. O backend não decide armazenamento do token,
navegação ou estado da interface. CORS está desabilitado; uma origem distinta
exigirá allowlist explícita por ambiente.

## Testes

`make backend-foundation-e2e` cria/remove fixtures sintéticas e comprova fluxo
HTTP–PostgreSQL, autenticação/RBAC, rate limit e menor privilégio. Unitários
cobrem contratos, configuração, logs, erros e limpeza segura do pool. Testes SQL
preservam as garantias das Etapas 1–4B.

## Contratos clínicos seguintes

Os [contratos clínicos](arquitetura/CONTRATOS_CLINICOS_ETAPA_5.md), as
[respostas autoritativas](Perguntas%20pendentes%20sobre%20campos%20e%20regras%20cl%C3%ADnicas.md)
e a [matriz de impacto](dados/COBERTURA_COLUNAS_PLANILHA.md) separam a semântica
confirmada da implementação restante. D2 e D3 possuem migrations 28 e 25,
validadas somente em bancos descartáveis. O roadmap e o registro de continuidade
mantêm as lacunas obrigatórias do backend completo e da ADR-022.

`make backend-clinical-test COMPACT=1` prova contratos HTTP em banco isolado,
incluindo os três perfis, rollback e concorrência de versão. Essas provas
complementam os testes da fundação. O aceite de 5D/5E e a revisão temporal da
ADR-022 permanecem acompanhados no roadmap e no registro de continuidade.

## Revisão temporal — fluxo sintético sob homologação

O endpoint administrativo `POST /importacoes/revisoes/propostas/arquivo/simular`
aceita XLSX sintético, manifesto e proposta, verifica cabeçalhos/posições contra
o próprio arquivo e encaminha a simulação read-only ao SQL50 por uma conexão
técnica dedicada. A conexão assume os papéis de aplicação autenticada e serviço
de revisão em transação; a identidade vem do JWT e a autorização da fonte é
revalidada no banco. `REVISION_HTTP_ENABLED` só pode ser usado com
`REVISION_SYNTHETIC_MODE=true` fora de produção e permanece desligado por padrão.
Rotas separadas permitem registrar fonte e conceder/revogar autorização. Elas
usam conexão própria de gestão, em papel técnico separado, e exigem que a
identidade JWT tenha entitlement ativo provisionado fora da API; perfil
`administração` sozinho não basta. A migração 55 protege a checagem também no
banco. Esse incremento foi validado em teste HTTP sintético. O endpoint de
simulação não cria lote nem staging. `POST /importacoes/revisoes/arquivos/receber`
aceita o XLSX inteiro, associa as células lidas pelo parser ao manifesto/proposta,
confere que todas as linhas preenchidas estão representadas e, na mesma transação,
consulta o recebimento histórico autorizado (SQL59). Um reenvio idêntico retorna
os IDs originais mesmo após encerramento/avanço; revogação continua recusada.
Para um novo recebimento, repete a simulação antes de registrar hash dos bytes, bruto, lote/linhas e
preparação. Manifesto e transformações devem ter sido cadastrados previamente
por mantenedor; o endpoint de revisão não grava artefatos técnicos aprovados. O
recebimento é idempotente para a mesma fonte/base/arquivo/manifesto/transformações
e recusa bruto divergente sob a mesma identidade.

Rotas separadas publicam decisões, simulam decisão existente, aplicam decisão e
encerram/cancelam revisão. Aplicação e finalização usam wrappers específicos da
migration 57 e executam cada operação numa transação autenticada pelo JWT. Falha
de aplicação reverte a transação clínica e o diagnóstico sanitizado é tentado em
transação posterior. A migration não concede `EXECUTE` desses wrappers ao papel
do serviço: somente o runner de testes o concede no banco descartável. A
configuração exige `NODE_ENV=test` e staging habilitado para expor aplicação e
finalização; recursos de revisão permanecem desabilitados por padrão e em
produção.

O teste HTTP dedicado de staging passou com 2/2 cenários: três perfis, recusa por
autorização revogada, recebimentos concorrentes idempotentes, dois executores,
rollback tardio/diagnóstico posterior, fechamento com pendências e repetição
histórica após edição manual. Isso comprova o cenário integrado exercitado, não
todos os destinos, escritores ou casos F01–F16/T01–T18. A rodada ampla até a
migration 60 passou com sete suítes/36 testes, incluindo reenvio após fechamento
e correção aplicada de data/texto do mesmo atendimento. Os testes usam apenas banco, identidade, autorização e XLSX
sintéticos.

### Escopo do acompanhamento de lotes

A migration 58 reutiliza os vínculos clínicos existentes. Administração consulta
metadados sanitizados dos lotes ordinários; consulta/edição exigem lote não vazio,
proveniência resolvida a um único paciente por linha e vínculo ativo com todos os
pacientes do lote. Destino órfão, desconhecido, ambíguo ou sem vínculo impede a
consulta do lote inteiro. O filtro precede a paginação; recurso existente fora do
escopo retorna 403 e recurso inexistente retorna 404.

O ator é obtido do ledger autenticado do XID, e o login da aplicação continua
sem leitura direta da proveniência. Lotes revisados são excluídos deste
acompanhamento para todos os perfis. A política de paciente `todos_sinteticos`
não amplia a visibilidade dos lotes; `desabilitada` também desabilita estas
consultas. Cabeçalho, contagens e linhas paginadas são projetados explicitamente
em uma consulta SQL, com o mesmo snapshot, sem expor bruto ou mensagens livres.
