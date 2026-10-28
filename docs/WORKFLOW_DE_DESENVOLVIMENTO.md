# Workflow de Desenvolvimento

Atualizado em: 2026-10-26

O CI em `.github/workflows/validacoes.yml` executa em PRs para `main`, pushes em
`main` e manualmente por `workflow_dispatch`. Quatro jobs estáveis usam runners
Ubuntu 24.04 independentes; falha em um componente não impede os outros de
produzir seu diagnóstico. Uma nova execução do mesmo evento/ref cancela a anterior.

| Job | Verificações | Limite |
| --- | --- | --- |
| Quality | `docs-check`, `manifest-check`, `repository-check`, `workflow-test` e actionlint | 10 minutos; não usa banco. |
| Database | Migrations 00–66, `importer-test`, `docker-db-test` e os upgrades `db-sorologia-upgrade-test`/`db-condicao-upgrade-test` | 15 minutos; instala ripgrep explicitamente; SQL, importação e upgrade sem backfill sintéticos. |
| Backend | `npm ci`, `backend-check`, `backend-clinical-test` e `backend-container-check` | 25 minutos; build, unitários, integração, contratos/autenticação/RBAC, fluxos clínicos, saúde e usuário não-root. |
| Frontend | `npm ci` em ambas as aplicações, Chromium e `frontend-check` | 25 minutos; TypeScript/Vite, componentes e navegador com API/PostgreSQL reais sintéticos. |

Cada job com SQL usa `.github/compose.ci.yaml`: PostgreSQL 16.15 em `tmpfs`,
sem volumes persistentes. O composite `synthetic-postgres` confere portas,
armazenamento e identidade antes de aplicar o bootstrap. As portas
`POSTGRES_PORT`, `APP_DB_PORT` e `SYNTHETIC_PG_PORT` são `55457`, exigidas por
D3/D8; o Compose persistente local continua em `5433`. Backend e frontend
criam bancos e logins próprios para suas suítes. O job Frontend prepara somente
a role de origem com SQL00; seu runner aplica 02–66 no banco exclusivo.
Nenhuma permissão clínica é concedida manualmente para fazer teste passar.

`db-sorologia-upgrade-test` requer `SYNTHETIC_PG_HOST`, `SYNTHETIC_PG_PORT`,
`SYNTHETIC_PG_USER` e `PGPASSWORD` de um servidor descartável confirmado.
Cria/remove banco próprio, instala 02–64, prepara legado sintético e aplica 65,
comprovando linha intacta, ausência de backfill e captura da alteração posterior.

O composite `setup-node` fixa Node 24.15.0/npm 11.16.0; instalações usam lockfiles
e `npm ci`. A imagem backend segue o Dockerfile e é validada separadamente.
`backend-container-check` exige saída numérica do `id -u`, propaga falha da
consulta e aceita somente UID não-root; a regressão cobre respostas inválidas
e falhas de `exec` sem depender de Docker.
Actions oficiais são fixadas por SHA, usam Node 24 e checkout sem persistência
de credenciais. `GITHUB_TOKEN` recebe apenas `contents: read`. Actionlint
1.7.12 é baixado com SHA-256 conferido. Não há lint/formatter de aplicação
configurado; `repository-check` valida sintaxe Python/Bash sem executar scripts
e verifica whitespace do working tree, index e diff commitado do PR/push.
Na execução manual, compara o commit anterior; histórico completo fica no Quality.

As suítes unitária, clínica e de integração do backend são separadas, com
descoberta por diretório. O mock HTTP de revisão pertence a `test/unit`;
`test/clinical` é executado com banco real, sem marcar suas suítes como ignoradas
no comando unitário. O frontend já descobre os arquivos Vitest e Playwright.
O build do backend no job Frontend fornece sua API; não repete as suítes backend.

Os checks mantêm `COMPACT=1` e preservam o status de falha do Make. Logs completos
filtrados são preservados por sete dias em artefatos `ci-<job>-logs` somente em
falha. Não são publicados `.env`, fixtures, traces nem screenshots de navegador.
Em falha, o runner frontend acrescenta caudas limitadas dos seus quatro logs
internos, redigidas no ambiente que conhece as senhas/JWT aleatórios, sem
alterar o resultado do teste nem o cleanup.
A seleção local por escopo não reduz a cobertura do CI. Evidências e limites
estão na [validação de 26/10](validacoes/VALIDACAO_CI_2026_10_26.md).

Para diagnosticar, use `gh pr checks --watch`, `gh run view ID --log-failed` e,
se necessário, `gh run download ID --name ci-NOME_DO_JOB-logs`. Para executar
manualmente, `gh workflow run validacoes.yml --ref main`; confira todos os quatro
jobs, sem tratar cancelado/ignorado como aprovado. Ao atualizar actions, Node/npm,
PostgreSQL ou actionlint, confira versões oficiais e checksums, teste a alteração
no PR e confirme novamente o workflow da `main` após merge. Não introduza
`continue-on-error` nem contorne regras de aprovação humana.

## Preparar o ambiente

Pré-requisitos gerais: GNU Make, Git, Docker Engine com Compose, Python 3,
Node.js 24.15.0/npm 11.16.0 e clientes PostgreSQL (`psql` e `pg_dump`). Instale as
dependências pelos lockfiles. Chromium do Playwright é necessário para os testes
automatizados de navegador, não para abrir a aplicação manualmente.

Para experimentar sem configurar o PostgreSQL persistente, use a
[demonstração sintética isolada](FRONTEND.md#demonstração-sintética-isolada),
que requer Python 3.9+ em Linux com pidfd. Setup, portas, perfis, duração da
sessão, logs e descarte pertencem a esse guia. Para desenvolver contra um banco
selecionado, siga [a escolha de ambiente](#escolha-explícita-do-postgresql).

A configuração local manual exige banco `ambulatorio_santa_casa`, usuário
`ambulatorio_user` e schema `ambulatorio` já existentes. Configure uma entrada
local em `~/.pgpass`, com permissão `0600`, equivalente a:

```text
localhost:5432:ambulatorio_santa_casa:ambulatorio_user:SENHA_LOCAL
```

Substitua o marcador apenas no arquivo privado. O Makefile não abre nem imprime
esse arquivo. Não coloque senhas em comandos, no Makefile ou em arquivos
versionados. Depois verifique somente a conexão:

```bash
make db-check DB_ENV=local
```

Host, porta, banco, usuário e schema podem ser selecionados com `DB_HOST`,
`DB_PORT`, `DB_NAME`, `DB_USER` e `DB_SCHEMA`, sem editar o Makefile.

## Contexto por tarefa

Use [o índice da documentação](README.md) para localizar a fonte principal do
assunto afetado. Leia as regras aplicáveis e os trechos necessários do código e
da documentação; amplie a leitura quando houver dependências ou dúvidas.
Histórico, dump estrutural e documentos extensos são fontes de consulta por
seção, tabela ou símbolo, sem exigir leitura integral a cada tarefa.

Defina uma entrega com objetivo e critérios de aceite observáveis. Mantenha a
mesma conversa durante essa entrega; ao mudar de assunto, um resumo curto de
decisões, arquivos, validações e pendências permite retomar o trabalho. A resposta
final deve informar resultado, verificações e limitações de forma breve.

## Operações de importação e migrations

`make manifest-check` depende somente do manifesto e schema versionados. A
comparação com a planilha local ignorada é deliberadamente separada em
`make manifest-source-check`, pois essa fonte não existe no runner do CI.

`make db-migrate` é bootstrap de banco limpo. Em banco existente, migrations
antigas não podem ser reaplicadas; use
`make db-migrate-one MIGRATION_FILE=sql/NN_arquivo.sql`.

O preflight pelo mesmo pipeline, sempre revertido, é executado com
`make importer-dry-run IMPORT_FILE=... IMPORT_PURPOSE=carga_inicial`.
`IMPORT_PURPOSE` não possui padrão: use `carga_inicial` para carga declarada e
`mesmo_conteudo` para conteúdo/layout já existente. `revisao` é recusada na
v1.4.0, inclusive em dry-run. Na CLI, reprocessamento exige
`--finalidade mesmo_conteudo --reprocessar`. Detalhes e limites estão no
[importador sintético](IMPORTADOR_SINTETICO_V1.md#barreira-de-finalidade--v140).

## Backend — fundação consolidada na Etapa 4C

```bash
make backend-install
make backend-check COMPACT=1
make backend-container-check COMPACT=1
```

Instale dependências ao preparar o ambiente ou quando o lockfile mudar.
`backend-check` já inclui `backend-foundation-e2e`; `backend-container-check`
inclui `backend-up` e é necessário quando a imagem ou infraestrutura for afetada.

`backend-db-setup` provisiona somente o login técnico e concede a role sem login;
não altera schema. O backend nunca aplica migrations. No CI, o banco limpo recebe
migrations primeiro e só depois executa build, testes unitários e integração.

Na Etapa 4B, `AUTH_JWT_SECRET` e `AUTH_JWT_EXPIRES_IN_SECONDS` são obrigatórios.
Os testes criam e removem identidades exclusivamente sintéticas pelo owner; isso
não é provisionamento de produção. `make backend-check` cobre build, unitários,
autenticação, autorização, isolamento do pool e integração. A matriz e as
pendências deliberadas estão em `docs/validacoes/VALIDACAO_ETAPA_4C.md`.

## Frontend — fundação 6A–6B e fluxos clínicos 7A–7D

```bash
make frontend-install
cd frontend && npx playwright install chromium
make frontend-check COMPACT=1
```

Use Node.js 24. `frontend-check` inclui build TypeScript/Vite, unitários e E2E no
navegador. `frontend-e2e` depende de `backend-build` e recebe as variáveis
`SYNTHETIC_PG_*` de um servidor exclusivamente sintético; o runner cria e remove
seu banco/roles e serve API/Vite. Ele não lê `.env` para selecionar o banco.
No CI, Chromium é instalado com `--with-deps`.

`frontend-dev` mantém o servidor Vite ativo e não aceita `COMPACT=1`.
`FRONTEND_API_TARGET` seleciona a API para o proxy local, com padrão
`http://127.0.0.1:3000`; `/v1` é preservado. Consulte
[FRONTEND.md](FRONTEND.md) para sessão, navegação, paginação e limites de contrato.
Os resultados de aceite estão em
[VALIDACAO_ETAPA_6.md](validacoes/VALIDACAO_ETAPA_6.md).
Os formulários usam o mesmo check e CI. Playwright descobre os arquivos
`tests/frontend/*.spec.ts`, incluindo regressão de leitura/escrita, familiares,
percurso integrado, recuperação de 403 e dos acompanhamentos. O helper comum
contabiliza a espera exigida pelo limiter real separadamente no timeout do
cenário; ações continuam limitadas a 10 segundos, sem retry automático de teste.
O [recorte clínico](arquitetura/RECORTE_CLINICO_ETAPA_7.md) delimita contratos e
pendências; o [aceite da Etapa 7](validacoes/VALIDACAO_ETAPA_7.md) registra suas
evidências. Escrita deve ser comprovada na API/banco reais do runner, incluindo
versão original, rollback, episódios repetíveis e falha de resposta após commit.
Famílias exigem evidência de páginas independentes de snapshots e filhos;
recuperação usa UUID/método/caminho/hash, registro, uma escrita e verificação ou
encerramento sem reaplicar clínica. O
[protocolo](arquitetura/RECUPERACAO_OPERACOES_ETAPA_7.md) enumera as 14 mutações;
infraestrutura comum não dispensa comprovação das classes utilizadas. Recibos,
rascunhos e contexto precisam sobreviver às navegações/reconsultas previstas,
preservando a limpeza de sessão e a distinção de `null` na criação de pendências.
Evidência técnica sintética não substitui revisão com a equipe nem aceita
antecipadamente os pacotes propostos de UX ou a VU1.

## Comandos Oficiais

Os testes SQL28, SQL29 e
[SQL33](../tests/sql/33_validar_ciclo_conteudo_a_b_a.sql) preservam
fixtures com COMMIT para provar efeitos entre transações. Cada rodada completa
de SQL exige banco descartável novo e identificado como teste; não reutilize
esse banco em outra rodada, mesmo após limpeza das fixtures HTTP. A guarda
do SQL33 aceita nomes com `test`, `e2e`, `discard`, `descart`, `etapa5` ou
`synthetic` (ou a identidade do CI efêmero). Não remova dados para contornar
essa premissa de isolamento.

Use os alvos do `Makefile` como interface local padrão:

| Comando | Quando usar |
| --- | --- |
| `make db-check` | Confirmar conexão, banco, usuário e schema. |
| `make db-test` | Executar todos os testes SQL versionados. |
| `make docs-check` | Conferir presença e conteúdo não vazio dos arquivos obrigatórios. |
| `make project-check` | Executar docs-check, testes SQL, diff e status conforme a matriz abaixo. |
| `make help` | Consultar os alvos disponíveis; o Makefile define a interface executável. |
| `make git-status` | Revisar status e histórico recente. |
| `make backend-install` | Instalar dependências pelo lockfile. |
| `make backend-check` | Combinar build, unitários e integração da fundação; não substitui testes clínicos. |
| `make backend-clinical-test` | Validar recursos clínicos/contratos em banco exclusivamente sintético. |
| `make backend-up` | Provisionar o login técnico e subir o backend no Compose; não aplica migrations. |
| `make dev-sintetico-start` / `dev-sintetico-status` / `dev-sintetico-stop` | Criar, consultar ou descartar a demonstração isolada; dados temporários são perdidos no stop. |
| `make workflow-test` | Verificar saída compacta, logs e propagação de falhas com comandos sintéticos. |
| `make repository-check` | Verificar sintaxe dos scripts versionados e whitespace local/commitado, sem executar aplicação ou SQL. |
| `make db-schema-dump` | Atualizar a evidência estrutural após mudança física aplicada e autorizada. |
| `make docker-up` / `docker-stop` | Subir ou parar o PostgreSQL Docker sem remover o volume. |
| `make docker-status` / `docker-logs` | Inspecionar health, status e logs. |
| `make docker-migrate` | Reconstruir um banco Docker vazio pelas migrations versionadas. |
| `make docker-db-check` / `docker-db-test` | Validar conexão e testes no Docker. |
| `make docker-schema-dump` | Gerar evidência Docker temporária em `/tmp`. |
| `make docker-recreate` | Recriar o container preservando o volume nomeado. |
| `make docker-backup` / `docker-backup-list` | Criar ou localizar backups lógicos locais. |
| `make docker-restore ...` | Restaurar somente no serviço Docker controlado. |
| `make docker-restore-check` / `docker-restore-test` | Validar catálogo e testes no banco restaurado. |
| `make docker-destroy DESTROY_ENV=docker` | Remover explicitamente apenas o ambiente e os volumes Docker deste projeto. |
| `make importer-fixture` | Gerar a fixture XLSX sintética versionada. |
| `make importer-test` | Executar o E2E em banco Docker temporário e descartável. |
| `make backend-foundation-e2e` | Executar o cenário integrado da fundação NestJS/PostgreSQL. |
| `make backend-container-check` | Construir e validar health e usuário não-root da imagem backend. |
| `make frontend-install` | Instalar dependências pelo lockfile. |
| `make frontend-dev` | Servir Vite e proxy `/v1` para a API sintética. |
| `make frontend-build` / `frontend-unit-test` | Compilar ou verificar sessão/contratos/apresentação. |
| `make frontend-e2e` | Testar navegador/API em banco próprio descartável. |
| `make frontend-check` | Combinar build, unitários e E2E do frontend. |
| `make importer-run IMPORT_FILE=... IMPORT_PURPOSE=...` | Importar um arquivo sintético com finalidade explícita no Docker selecionado. |
| `make importer-dry-run IMPORT_FILE=... IMPORT_PURPOSE=...` | Validar a mesma finalidade e simular o pipeline sem persistir registros. |

Os comandos têm efeitos distintos: instalação/build não gravam clínica;
formulários e importação podem gravar conforme autorização; migrations alteram
estrutura; backup escreve arquivo local; restore substitui somente o schema do
serviço de recuperação; `docker-destroy` remove volumes. A suíte SQL completa
não é uma operação apenas de leitura nem integralmente revertida: respeite o
isolamento descrito acima. `project-check` inclui essa suíte.

O ambiente padrão é `DB_ENV=docker`, com `.env` ignorado pelo Git e porta 5433.
O ambiente local na porta 5432 permanece alternativa manual e só é selecionado
explicitamente com `DB_ENV=local`; nenhuma rotina de restore dá suporte a ele.
Nunca inclua senha no prompt, em documentação ou em arquivos versionados.
`make db-schema-dump` gera somente estrutura; `docker-schema-dump` escreve por
padrão em `/tmp/schema_ambulatorio_docker.sql` e não substitui a evidência oficial.
Enquanto a autorização institucional estiver pendente, `importer-run` deve
receber exclusivamente fixtures sintéticas.

## Validação proporcional

| Escopo da mudança | Validação local |
| --- | --- |
| Exclusivamente textual | `make docs-check`, revisão do conteúdo e `git diff --check`. |
| Importador ou manifesto | `make manifest-check importer-test project-check` ao finalizar. |
| Backend | `make backend-check project-check` ao finalizar. |
| Frontend | `make frontend-check docs-check`, revisão de teclado/foco/contraste/zoom/telas menores, conteúdo/links, `git diff --check` e status ao finalizar. O runner exige servidor sintético e Chromium. |
| Schema ou migration | `make project-check` inicial; aplicar migrations em banco limpo descartável e executar testes SQL; verificar diff, documentação e estado final com `project-check`, reaproveitando a execução final da suíte no ambiente validado. |
| Docker ou infraestrutura | Verificações dos componentes afetados: configuração, conexão, imagem/container ou recuperação, conforme a mudança. Para o mecanismo de validação, `make workflow-test` e execuções representativas nos modos normal e compacto. |

Acrescente `COMPACT=1` aos alvos compatíveis para reduzir a saída. Mudanças mistas
combinam as verificações necessárias. Falhas, mudanças posteriores relevantes ou
dúvidas concretas justificam novas execuções; não repita suítes já aprovadas sobre
o mesmo estado e ambiente. Registre comandos, resultados e limitações reais.

`docs-check` verifica somente arquivos obrigatórios presentes e não vazios: não
valida a correção do conteúdo nem dos links. `project-check` inclui `docs-check`,
`db-test` (que inclui `db-check`), `git diff --check` e status Git; não executa
manifesto, importador, backend ou frontend. `docker-project-check` chama essa mesma suíte
com `DB_ENV=docker`, acrescentando a espera pelo healthcheck. Escolha uma das
duas entradas para a mesma validação. Não execute `backend-foundation-e2e`
novamente após `backend-check` sem um motivo concreto.

Mudança só no frontend não exige testes SQL ou do importador. Se também afetar o
backend, combine `backend-check project-check frontend-check` numa chamada para
compartilhar dependências. Se afetar recursos clínicos/contratos que a fundação
não cobre, acrescente `backend-clinical-test`; Makefile/CI exigem também
`workflow-test` e execuções representativas nos modos normal e compacto.

## Saída compacta

No trabalho com Codex, prefira, por exemplo:

```bash
make docs-check COMPACT=1
make manifest-check importer-test project-check COMPACT=1
make backend-check project-check COMPACT=1
make frontend-check docs-check COMPACT=1
```

Cada exemplo corresponde a um escopo; não é uma sequência obrigatória.
Sem `COMPACT=1`, os alvos mantêm a saída habitual. `make help` lista os alvos
compatíveis, incluindo verificações SQL, importador, backend, frontend e Docker. Operações
como migration, importação, backup, restore e destruição continuam sendo chamadas
explicitamente pela interface habitual.

O modo compacto executa todos os alvos solicitados em uma única chamada interna
ao Make, mantendo o compartilhamento de dependências. Mostra comando, resultado,
código de saída e caminho do log em `/tmp/ambulatorio-check-*/output.log`.
Em falha, mostra também as últimas 30 linhas, limitadas a 6000 caracteres.
`project-check`, `docker-project-check` e `git-status` exibem `git status --short`
sem histórico de commits.

O diretório do log tem permissão 0700 e o arquivo 0600. A saída completa de stdout
e stderr é registrada com filtragem dos valores de variáveis de ambiente de
senha, segredo, token, chave e credencial, além de senhas em URLs. Os segredos
PostgreSQL/backend/JWT lidos pelo Make do `.env` também são disponibilizados ao
filtro. Os logs ficam fora do repositório; consulte somente os trechos necessários.
Essa filtragem não substitui a regra de nunca imprimir dados clínicos ou segredos
arbitrários nos comandos de validação.

O auxiliar preserva o código do processo executado; comandos terminados por sinal
usam a convenção 128 + sinal. O Make mantém sua própria convenção: falha de receita
resulta em código 2, tanto no modo normal quanto no compacto.

## Escolha explícita do PostgreSQL

O Docker padrão publica PostgreSQL 16.15 somente em `127.0.0.1:5433` e usa o
volume `ambulatorio_santa_casa_postgres_data`. Prepare a configuração privada:

```bash
cp .env.example .env
```

Substitua a senha fictícia do `.env` por uma exclusiva de desenvolvimento.
O arquivo é ignorado pelo Git. Depois execute:

```bash
make docker-up
make docker-db-check
```

Em banco novo/vazio,
`make docker-migrate` aplica o bootstrap versionado; em banco existente, use
somente a migration incremental selecionada. Nenhum alvo genérico aplica
migrations automaticamente.

Selecione `DB_ENV=docker` ou `DB_ENV=local` explicitamente quando necessário.
O PostgreSQL local em `127.0.0.1:5432` é alternativa manual e não é usado pela
demonstração isolada. Os alvos Docker não alteram esse PostgreSQL local.

**Validação SQL completa:** `project-check`, `docker-project-check`, `db-test`
e seus wrappers exigem banco de teste novo e descartável com schema compatível.
Os SQL28/29/33 fazem COMMIT para provar efeitos entre transações. O nome padrão
do banco persistente não satisfaz necessariamente as guardas dos testes. Não
execute a suíte no persistente nem remova as guardas para fazê-la passar.

Em um ambiente descartável já selecionado, escolha apenas uma entrada:
`make project-check COMPACT=1`, ou `make docker-project-check COMPACT=1` se
precisar também da espera de prontidão do Docker. `DB_ENV=local` só deve ser usado
para testes quando apontar explicitamente para um servidor/banco descartável;
não implica que o banco local aplicado seja ambiente de teste.

`docker-stop` para o container preservando o volume; `docker-recreate` substitui
o container e preserva o volume. `docker-destroy DESTROY_ENV=docker` destrói os
volumes e requer autorização explícita. Backup, restauração e limites do check
de catálogo estão no [procedimento de recuperação](RECUPERACAO_POSTGRESQL_DOCKER.md).

## Fluxo Oficial

1. Revisar `git status --short` e preservar alterações existentes.
2. Definir objetivo, escopo e critérios de aceite; consultar as fontes pertinentes.
3. Para tarefas complexas, registrar plano curto antes de editar.
4. Selecionar verificações pela matriz e executar validação inicial quando indicada.
5. Implementar uma alteração pequena e isolada.
6. Atualizar apenas a documentação afetada e o registro de alterações. Atualizar
   o dump estrutural somente após mudança aplicada e motivo explícito, conforme
   as regras do repositório.
7. Executar as verificações aplicáveis e corrigir falhas introduzidas pela mudança.
8. Revisar diff e status; informar resultados e limitações de forma breve.
9. Quando solicitado, criar commit no padrão adotado e enviar ao remoto; usar
   branch de tarefa e pull request conforme a organização do trabalho.

## Checklist para Banco

- A mudança exige nova migration incremental?
- Migrations antigas permanecem intactas?
- O script usa `SET search_path TO ambulatorio, public;`?
- Há estratégia de rollback ou reversão?
- Há teste SQL correspondente?
- A documentação física foi atualizada?
- `docs/REGISTRO_DE_ALTERACOES.md` foi atualizado?
- Nenhum dado clínico real foi incluído?

## Checklist para Testes

- Os dados são sintéticos?
- O teste usa `BEGIN` e `ROLLBACK` quando adequado?
- A execução usa `ON_ERROR_STOP=1`?
- Há cenários positivos e negativos?
- O teste não assume IDs fixos?
- Limitações de cobertura estão documentadas?

## Checklist para Documentação

- O documento certo foi atualizado?
- A fonte de verdade está clara?
- Incertezas foram registradas como pendências?
- Não há dados sensíveis?
- Mudança relevante foi registrada no registro de alterações?

## Checklist para Backend

- A API respeita constraints do banco?
- Validações de entrada refletem o modelo físico?
- Erros de integridade são tratados?
- Autenticação e autorização foram consideradas?
- Testes cobrem fluxos principais?

## Checklist para Frontend

- A interface usa dados da API, não acesso direto ao banco?
- Estados de erro e carregamento foram tratados?
- Saída/401/expiração limpam sessão/cache e impedem respostas antigas?
- Links diretos, voltar/recarregar e filtros/página na URL funcionam?
- A paginação respeita os contratos sem inferir total ou completude global?
- Teclado, foco, contraste, zoom e telas menores foram revisados?
- Campos seguem domínios e valores permitidos?
- Não há dados reais embutidos no código?
- Testes ou validações manuais foram registrados?

## Modelos de Prompt para Codex

Prefira prompts curtos que referenciem as regras e os comandos oficiais, acrescentando detalhes apenas quando alterarem o escopo.

### Prompt Mínimo Recomendado

```text
Implemente <objetivo>. Comece por <arquivo/módulo> e amplie a leitura conforme necessário.
Aceite: <comportamento observável>.
Siga AGENTS.md, preserve alterações existentes e valide conforme o escopo, preferindo COMPACT=1.
Conclua implementação e validação; informe resultado, testes e pendências brevemente. Sem commit/push.
```

### Planejamento de Mudança

```text
Analise o escopo abaixo, registre um plano curto antes de editar e prossiga até concluir.
Objetivo:
Contexto:
Arquivos relevantes:
Restrições:
Critérios de aceite:
Validação esperada:
Use a matriz de validação do workflow e os alvos aplicáveis com COMPACT=1.
```

### Migration Incremental

```text
Crie uma migration incremental sem alterar migrations antigas.
Objetivo da mudança:
Schema/tabelas envolvidos:
Regras de integridade:
Rollback ou reversão:
Documentação a atualizar:
Teste SQL esperado:
Valide antes da mudança e em banco limpo descartável, conforme a matriz do workflow.
```

### Revisão de Diff

```text
Revise o diff atual com foco em bugs, riscos e documentação.
Contexto da mudança:
Critérios de aceite:
Pontos de atenção:
Comandos de validação já executados, estado/ambiente e resultados:
Leia o diff e as dependências relevantes; execute novas verificações quando houver motivo concreto.
```

### Criação de Teste

```text
Crie ou ajuste teste para a mudança abaixo.
Objetivo:
Schema/tabelas:
Cenários positivos:
Cenários negativos:
Dados devem ser sintéticos:
Validação esperada:
```

### Atualização Documental

```text
Atualize a documentação afetada pela mudança.
Mudança realizada:
Arquivos alterados:
Decisões duradouras:
Pendências:
Registro de alterações necessário:
Valide com docs-check, revisão do conteúdo e git diff --check se a mudança for exclusivamente textual.
```

## Integração clínica descartável da Etapa 5

`make backend-clinical-test COMPACT=1` cria um banco de nome exclusivo no servidor
sintético indicado por `SYNTHETIC_PG_HOST`, `SYNTHETIC_PG_PORT` e
`SYNTHETIC_PG_USER`, com senha via `PGPASSWORD`. O padrão local é porta 55457,
reservada ao container descartável da tarefa. O alvo instala migrations em banco
limpo e remove exclusivamente o banco/login que criou. Não use o servidor
persistente para esse alvo. Nenhuma evidência física persistente é regenerada.

Esse alvo cobre os novos fluxos clínicos HTTP; `backend-foundation-e2e` continua
sendo uma prova da fundação. Rode os dois quando o escopo afetar ambos. A política
`todos_sinteticos` do teste da fundação e `vinculo_explicito` dos testes clínicos
são configurações exclusivas de teste, sem alterar a ativação padrão da API.

O runner clínico também cria um login exclusivo de importador e uma fixture
mínima em `/tmp`, executando upload HTTP e worker Python real. Usa somente
dados sintéticos e remove seu banco, logins e arquivo ao terminar. O subprocesso
não recebe credenciais da aplicação nem segredo JWT. Os alvos `importer-test` e
`backend-integration-test` respeitam `PGPASSWORD` fornecida, permitindo direcionar
as verificações ao servidor descartável com `DB_HOST`/`DB_PORT` explícitos.

O alvo `db-condicao-upgrade-test` usa o mesmo contrato `SYNTHETIC_PG_*` e
`PGPASSWORD` do upgrade de sorologia: cria banco próprio, valida65→66 com
registro legado e remove somente seu banco. Não realiza backfill.
