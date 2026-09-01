# Arquitetura do Backend — Fundação consolidada na Etapa 4C

Atualizado em: 2026-08-31

Status: fundação pronta para os módulos clínicos da Etapa 5, ainda exclusivamente
com dados sintéticos. Evidências: `docs/VALIDACAO_ETAPA_4C.md`.

## Escopo e fluxo

O backend é um monólito modular NestJS/TypeScript com módulos `health`, `auth` e
`pacientes`. Não há escrita clínica, gestão de usuários, importação via API ou frontend.

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
em `docs/VALIDACAO_ETAPA_4C.md`.

RBAC controla operações, não registros individuais. Sem regra institucional, a
autorização por paciente/atendimento volta na Etapa 5 antes de endpoints clínicos
e obrigatoriamente antes de dados reais.

O login limita dez tentativas por IP em 60 segundos e então retorna 429. O
contador é por processo. Coordenação distribuída e proxy/IP confiável pertencem
à implantação futura com múltiplas instâncias.

## Persistência e menor privilégio

O driver `pg` usa SQL explícito e parâmetros posicionais. Migrations ficam fora
da API; não há ORM sincronizando schema, DDL de bootstrap ou migration no startup.

Cada operação abre transação, executa `SET LOCAL ROLE ambulatorio_aplicacao` e
`SET LOCAL search_path`, e encerra com `COMMIT` ou `ROLLBACK`. Estado local não
sobrevive à transação; falha de rollback destrói a conexão. `APP_DB_ROLE` recusa
outra role. O login técnico é `NOINHERIT`, sem ownership, DDL ou capacidade de
assumir owner/importador. Perfil funcional não altera a role efetiva.

`ambulatorio_aplicacao` não acessa `importacao_lote`, `importacao_linha` ou
`importacao_registro`, inclusive `dados_brutos`. O bloqueio está no PostgreSQL.
O importador não acessa `usuario_aplicacao`.

## Contratos HTTP

- `GET /health`: público; retorna `{ "status": "ok", "database": "up" }` após
  consulta real; banco indisponível retorna 503 sanitizado.
- `POST /auth/login`: público; aceita somente `{ "login", "senha" }`; sucesso
  201 retorna `{ "accessToken", "tokenType": "Bearer", "expiresIn" }`.
- `GET /auth/me`: Bearer obrigatório; retorna somente `usuarioId`, `nome` e `perfil`.
- `GET /pacientes?limit=20`: limite inteiro 1–100; retorna somente `pacienteId` e
  `nome`. É prova read-only, não futuro CRUD.
- `GET /auth/authorization-check`: prova técnica para `edicao` e `administracao`.

Entrada inválida retorna 400. O filtro padroniza `statusCode`, `error` e
`message`, sem stack, SQL, credenciais ou detalhes do schema. DTOs de saída
impedem exposição automática de novas colunas físicas.

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
