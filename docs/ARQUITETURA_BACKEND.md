# Arquitetura do Backend — Etapa 4A

Atualizado em: 2026-08-26

Status: fundação técnica implementada e autorizada somente para dados sintéticos.
Identidade, autenticação e autorização pertencem à Etapa 4B.

## Escopo

O backend é um monólito modular NestJS/TypeScript. Nesta etapa existem apenas os
módulos `health` e `pacientes`, infraestrutura compartilhada de configuração,
banco, erro e logging, e dois endpoints `GET`. Não há escrita clínica, usuário,
login HTTP, token, guard, importação via API ou frontend.

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
`APP_DB_NAME`, `APP_DB_USER`, `APP_DB_PASSWORD` e `APP_DB_ROLE`. Segredos ficam
somente no ambiente. Ausência, porta inválida, ambiente desconhecido ou role
diferente de `ambulatorio_aplicacao` impedem a inicialização.

## Erros, validação e logs

`ValidationPipe` transforma e valida DTOs, usa allowlist e rejeita propriedades
desconhecidas. O filtro global retorna `statusCode`, `error` e `message`; erros
internos viram 503 genérico e nunca retornam SQL, stack ou credenciais.

O middleware registra JSON com evento, método, caminho sem query, status e tempo.
Erros registram somente tipo sanitizado. Bodies, nomes, telefones, endereços,
conteúdo clínico, JSONB, senha e connection string não são registrados.

## Docker e operação

O serviço `backend` depende apenas do health do PostgreSQL. Antes de subi-lo, o
operador executa `make backend-db-setup`; migrations continuam responsabilidade
explícita do workflow do banco. `make backend-up` provisiona o login técnico e
constrói/sobe a imagem. O container final roda como usuário `node` não-root.

## Testes

Testes unitários cobrem configuração, DTO, service, início da aplicação, health e
sanitização. A integração cria um paciente exclusivamente sintético, inicia Nest
contra o PostgreSQL real, verifica a resposta reduzida, comprova a role efetiva e
confirma bloqueio de DDL e de `importacao_linha`; o registro sintético é removido
ao final pelo owner de teste.
