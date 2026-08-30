# Arquitetura do Backend — Etapas 4A e 4B

Atualizado em: 2026-08-30

Status: fundação e identidade mínima implementadas somente para dados sintéticos.
A consolidação integrada pertence à Etapa 4C.

## Escopo

O backend é um monólito modular NestJS/TypeScript com módulos `health`,
`pacientes` e `auth`. Não há escrita clínica, gestão de usuários, importação via
API ou frontend.

## Identidade, autenticação e autorização — Etapa 4B

`usuario_aplicacao` é independente de roles PostgreSQL e do responsável legado
da planilha. Possui nome, login normalizado, hash bcrypt, perfil, estado ativo e
timestamps. Não existe cadastro público nem provisionamento de produção.

`POST /auth/login` não enumera contas e emite JWT Bearer HS256 com expiração entre
60 segundos e 24 horas. O secret sem padrão vem de `AUTH_JWT_SECRET`. O token não
é persistido. A cada requisição protegida, o guard valida assinatura/expiração e
relê usuário ativo e perfil; inativação e troca de perfil têm efeito imediato.
Revogação individual antes da expiração será reavaliada na Etapa 4C.

Guards globais implementam negação por padrão. Somente `@Public` abre uma rota e
`@Perfis` concede acesso funcional explícito. Perfis: `consulta`, `edicao` e
`administracao`. Falha de autenticação retorna 401; perfil insuficiente, 403.

Públicos: `GET /health` e `POST /auth/login`. Protegidos: `GET /auth/me`,
`GET /pacientes` e `GET /auth/authorization-check`, a prova mínima restrita a
edição/administração. `/auth/me` retorna somente `usuarioId`, `nome` e `perfil`.

O login é limitado em memória a dez tentativas por minuto e IP. O controle é por
instância; coordenação distribuída e configuração de proxy pertencem ao futuro.

## Fluxo

```text
HTTP -> controller -> service -> repository -> DatabaseService -> PostgreSQL
```

Controllers tratam o contrato HTTP; services fazem orquestração; repositories
contêm SQL; DTOs limitam entrada e saída; `common` contém somente infraestrutura
já compartilhada. Não foram criadas abstrações antecipatórias vazias.

## Persistência

Foi escolhido o driver `pg` com SQL explícito e parâmetros posicionais. O schema
já possui migrations SQL como fonte de verdade; um ORM com sincronização ou
geração paralela de schema adicionaria uma segunda autoridade sem benefício nesta
fundação. O repository mantém o SQL isolado, tipado e testável. A API não contém
executor de migrations, `synchronize`, DDL de bootstrap nem ferramenta de schema.

Cada operação adquire uma conexão do pool, executa `SET ROLE
ambulatorio_aplicacao`, fixa `search_path` e só então consulta. A configuração
recusa qualquer outro `APP_DB_ROLE`. O login técnico é `NOINHERIT`, sem ownership,
e recebe apenas associação à role sem login por
`scripts/configurar_login_aplicacao.sql`. Esse script é uma operação local de
provisionamento de role, não uma migration do schema.

## Contratos HTTP

- `GET /health`: retorna `{ "status": "ok", "database": "up" }` somente após
  consulta real ao PostgreSQL; indisponibilidade retorna HTTP 503 sanitizado.
- `GET /pacientes?limit=20`: aceita limite inteiro entre 1 e 100 e retorna array
  de `{ "pacienteId": "...", "nome": "..." }`. Não expõe código de planilha,
  nascimento, contato, endereço, campos clínicos ou proveniência.

O endpoint de pacientes é uma prova read-only e não define o futuro CRUD.

## Configuração

Variáveis obrigatórias: `NODE_ENV`, `API_PORT`, `APP_DB_HOST`, `APP_DB_PORT`,
`APP_DB_NAME`, `APP_DB_USER`, `APP_DB_PASSWORD`, `APP_DB_ROLE`,
`AUTH_JWT_SECRET` e `AUTH_JWT_EXPIRES_IN_SECONDS`. Segredos ficam
somente no ambiente. Ausência, porta inválida, ambiente desconhecido ou role
diferente de `ambulatorio_aplicacao` impedem a inicialização.

## Erros, validação e logs

`ValidationPipe` transforma e valida DTOs, usa allowlist e rejeita propriedades
desconhecidas. O filtro global retorna `statusCode`, `error` e `message`; erros
internos viram 503 genérico e nunca retornam SQL, stack ou credenciais.

O middleware registra JSON com evento, método, caminho sem query, status, tempo
e, se autenticado, ID técnico e perfil. Login registra falha agregada ou sucesso
com ID técnico. Senha, hash, token, Authorization e body não são registrados.
Erros registram somente tipo sanitizado. Bodies, nomes, telefones, endereços,
conteúdo clínico, JSONB, senha e connection string não são registrados.

## Docker e operação

O serviço `backend` depende apenas do health do PostgreSQL. Antes de subi-lo, o
operador executa `make backend-db-setup`; migrations continuam responsabilidade
explícita do workflow do banco. `make backend-up` provisiona o login técnico e
constrói/sobe a imagem. O container final roda como usuário `node` não-root.

## Testes

Testes unitários cobrem configuração, inicialização, autenticação, respostas
uniformes, logging e sanitização. A integração cria paciente e usuários somente
sintéticos, valida login, expiração, inativação, `/auth/me`, 401/403, perfis e
rate limit contra PostgreSQL real. Também comprova a role efetiva e os bloqueios
de DDL/proveniência; fixtures são removidas ao final pelo owner de teste.
