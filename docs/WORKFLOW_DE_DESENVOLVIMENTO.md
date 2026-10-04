# Workflow de Desenvolvimento

Atualizado em: 2026-10-04

O CI em `.github/workflows/validacoes.yml` usa credenciais sintéticas descartáveis,
PostgreSQL 16.15 e executa migrations em banco limpo, manifesto, importador,
testes SQL, backend (build, unitários, integração e container), frontend (build,
unitários e Chromium/API/PostgreSQL sintéticos), documentação, workflow e
`git diff --check`. Node.js 24 e lockfiles são usados para a instalação
reproduzível. A seleção local por escopo não reduz essa cobertura do CI.

O CI também executa `backend-clinical-test COMPACT=1` com `SYNTHETIC_PG_*`
apontando ao servidor efêmero e banco próprio criado pelo runner. Esse alvo cobre
os endpoints clínicos/revisões; a fundação não substitui sua execução. O runner
usa as permissões instaladas pelas migrations, sem conceder wrappers manualmente.

Os checks de backend, recursos clínicos e frontend são combinados na mesma
chamada do Make no CI, compartilhando `backend-build`. O navegador é instalado
com Playwright/Chromium. O runner do frontend usa seu próprio banco descartável e
não aponta ao banco persistente do projeto.

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

## Frontend — fundação 6A–6B

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

## Comandos Oficiais

Use os alvos do `Makefile` como interface local padrão:

| Comando | Quando usar |
| --- | --- |
| `make db-check` | Confirmar conexão, banco, usuário e schema. |
| `make db-test` | Executar todos os testes SQL versionados. |
| `make docs-check` | Conferir presença e conteúdo não vazio dos arquivos obrigatórios. |
| `make project-check` | Executar docs-check, testes SQL, diff e status conforme a matriz abaixo. |
| `make workflow-test` | Verificar saída compacta, logs e propagação de falhas com comandos sintéticos. |
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

Docker, padrão:

```bash
make docker-project-check COMPACT=1
```

Com o PostgreSQL já disponível, `make project-check COMPACT=1` é a alternativa
sem a espera adicional; não execute ambos para validar o mesmo estado.

Local, alternativa manual:

```bash
make project-check DB_ENV=local COMPACT=1
```

Docker:

```bash
cp .env.example .env
make docker-up
make docker-migrate  # somente em volume novo/vazio
make docker-project-check COMPACT=1
```

Não execute `db-migrate` no PostgreSQL local já aplicado. `docker-destroy` exige
`DESTROY_ENV=docker`, apaga os volumes persistentes e só deve ser chamado quando
a destruição do ambiente Docker for intencional.

O procedimento de backup, teste de restauração e recuperação após perda de
container ou volume está em `docs/RECUPERACAO_POSTGRESQL_DOCKER.md`.

## Fluxo Oficial

1. Revisar `git status --short` e preservar alterações existentes.
2. Definir objetivo, escopo e critérios de aceite; consultar as fontes pertinentes.
3. Para tarefas complexas, registrar plano curto antes de editar.
4. Selecionar verificações pela matriz e executar validação inicial quando indicada.
5. Implementar uma alteração pequena e isolada.
6. Atualizar apenas a documentação afetada e o registro de alterações.
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

## Checklist para Futuro Backend

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
