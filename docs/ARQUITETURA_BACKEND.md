# Arquitetura do Backend — Fundação e incrementos clínicos sintéticos

Atualizado em: 2026-09-29

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
operacional herda gestão temporal, nenhum perfil clínico recebe autorização
automática e não há rota HTTP de revisão habilitada. O serviço de revisão
permanece sem EXECUTE do executor privado; a validação diferida tem dono técnico restrito.
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
transação única. Criação/fechamento, cobertura através de revisões aplicadas,
simulação de arquivo sem staging e aceite integrado continuam pendentes.

## Contratos HTTP

- `GET /health`: público; retorna `{ "status": "ok", "database": "up" }` após
  consulta real; banco indisponível retorna 503 sanitizado.
- `POST /auth/login`: público; aceita somente `{ "login", "senha" }`; sucesso
  201 retorna `{ "accessToken", "tokenType": "Bearer", "expiresIn" }`.
- `GET /auth/me`: Bearer obrigatório; retorna somente `usuarioId`, `nome` e `perfil`.
- `GET /pacientes?limit=20&offset=0`: limites validados, busca por nome/sexo e
  escopo por vínculo; retorna DTO com `pacienteId` e `nome`.
- `GET /pacientes/:id`: ficha e idade derivada com `dataReferenciaIdade`.
- `POST /pacientes` e `PATCH /pacientes/:id`: cadastro e alteração versionada.
  A edição inclui comunidade, endereço e `telefonesAdicionar`; preserva contatos
  existentes e endereços anteriores. Campos omitidos permanecem inalterados.
- `POST /pacientes/:id/atendimentos`: grava atendimento, diagnóstico, dados
  clínicos, exames, rastreio e pendências numa transação; consulta por ID pertence
  obrigatoriamente ao mesmo paciente.
- `PATCH /pacientes/:id/atendimentos/:atendimentoId`: edita dados do atendimento
  com `versao` obrigatória e vínculo ao paciente; conflito de versão retorna 409.
- `GET /pacientes/:id/atendimentos`, `/exames`, `/projetos`, `/retornos-bzn` e
  `/pendencias`: arrays paginados por `limit` (1–100, padrão 20) e `offset`
  (0–100000, padrão 0), com ordenação estável. Pendências aceita filtro `status`.
- `POST /pacientes/:id/retornos-bzn`: exige tratamento do paciente e data real.
- `POST /pacientes/:id/tratamento-bzn`: registra tratamento canônico e reações;
  vínculo de atendimento é conferido e duplicação retorna 409 sem sobrescrita.
- `PUT /pacientes/:id/acesso/:usuarioId`: administração com contexto do ator.
- `GET /pacientes/export.csv`: exportação paginada sob o mesmo escopo de vínculo.
- `GET /importacoes/lotes` e `GET /importacoes/lotes/:id`: views sanitizadas;
  `limit`/`offset` do detalhe paginam linhas e retornam `paginacaoLinhas`.
- `POST /importacoes`: worker sintético condicional, desabilitado por padrão.
  Retorna lote efetivo também em reenvio idempotente com outro código solicitado;
  diferencia `codigoLote` e `codigoLoteSolicitado`. `dryRun` aceita booleano ou
  os textos multipart `true`/`false`; outros valores retornam 400.
  O subprocesso recebe ambiente restrito às variáveis de execução e à senha do
  importador, sem credenciais da aplicação/identidade nem segredo JWT.
- `GET /auth/authorization-check`: prova técnica para `edicao` e `administracao`.

Entrada inválida retorna 400. O filtro padroniza `statusCode`, `error` e
`message`, sem stack, SQL, credenciais ou detalhes do schema. DTOs e seleções
explícitas limitam os campos retornados. A consolidação da tipagem dos demais
recursos clínicos permanece no aceite de 5E.
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

`make backend-clinical-test COMPACT=1` prova os novos contratos HTTP em banco
isolado, incluindo os três perfis, rollback e concorrência de versão. Essas
provas complementam os testes da fundação e não demonstram os endpoints ainda
não implementados. Paginação de outras coleções, DTOs de saída, mutações de
recursos restantes e integração de importação ainda precisam de aceite.
