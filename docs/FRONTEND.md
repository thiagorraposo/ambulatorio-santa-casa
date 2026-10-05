# Frontend — fundação de leitura

Atualizado em: 2026-10-04. Etapa 6A–6B concluída e validada no ambiente sintético.

A aplicação própria está em [`frontend/`](../frontend/). Consome os contratos
públicos `/v1` do backend, com React/TypeScript, Vite, roteamento e consultas por
recurso. O [roadmap](PROXIMOS_PASSOS.md#etapa-6--fundação-do-frontend) define o
escopo e os critérios de aceite; o
[relatório da Etapa 6](validacoes/VALIDACAO_ETAPA_6.md) registra a evidência de
execução. O estágio vigente está em
[ESTADO_ATUAL_DO_PROJETO.md](ESTADO_ATUAL_DO_PROJETO.md).

## Preparação e comandos

Use Node.js 24 e npm. As dependências são fixadas por `frontend/package-lock.json`.
Instale novamente quando esse lockfile mudar. Nenhum segredo de banco, JWT ou
importação deve entrar no bundle ou em variáveis públicas do navegador.

```bash
make backend-install frontend-install
cd frontend && npx playwright install chromium
```

O Chromium é necessário para E2E. No CI, `--with-deps` instala também as
bibliotecas do sistema. Para desenvolvimento, prepare uma API com schema
compatível e dados exclusivamente sintéticos, em ambiente descartável, e então:

```bash
FRONTEND_API_TARGET=http://127.0.0.1:3000 make frontend-dev
```

`FRONTEND_API_TARGET` é configuração do servidor Vite, com padrão
`http://127.0.0.1:3000`; o cliente continua usando `/v1` na mesma origem.
O proxy preserva o prefixo e encaminha as requisições à API. O frontend e o
backend não aplicam migrations no startup. O ambiente persistente com migrations
00–20 é distinto dos incrementos da Etapa 5 e não deve ser usado implicitamente
para esta validação.

| Comando | Finalidade |
| --- | --- |
| `make frontend-install` | Instalar pelo lockfile com `npm ci`. |
| `make frontend-dev` | Servir a aplicação e encaminhar `/v1` pelo proxy. |
| `make frontend-build COMPACT=1` | Verificar TypeScript e gerar `frontend/dist/`. |
| `make frontend-unit-test COMPACT=1` | Executar testes de sessão, contratos e apresentação. |
| `make frontend-e2e COMPACT=1` | Compilar backend e testar navegador/API/PostgreSQL sintéticos. |
| `make frontend-check COMPACT=1` | Combinar build, unitários e E2E do frontend. |

O runner [`tests/frontend/test_e2e.sh`](../tests/frontend/test_e2e.sh) recebe
`SYNTHETIC_PG_HOST`, `SYNTHETIC_PG_PORT`, `SYNTHETIC_PG_USER` e `PGPASSWORD` pelo
ambiente, todos obrigatórios. O usuário deve poder criar banco e login de teste.
Ele cria seu banco e roles de teste, aplica as
migrations apenas nesse banco, inicia API/Vite e encerra os recursos que criou.
Não lê `.env` para selecionar o banco de teste. Não exige build do frontend para
servir Vite; o build de produção é verificado separadamente por `frontend-check`.
Logs e artefatos de navegador ficam em `/tmp`, fora do repositório.

As portas padrão do E2E são 6061 (API) e 4176 (Vite); podem ser escolhidas com
`FRONTEND_E2E_API_PORT` e `FRONTEND_E2E_WEB_PORT`. O runner recusa portas ocupadas,
sem reaproveitar outro serviço. Para revisar manualmente a interface com a mesma
fixture, depois de instalar dependências e executar `make backend-build`, use
`bash tests/frontend/test_e2e.sh --serve` com as variáveis sintéticas configuradas.
O runner mantém os serviços ativos até a interrupção e informa os acessos
exclusivamente sintéticos; o encerramento remove seu banco e login de teste.

Em mudanças mistas, combine os alvos numa chamada para compartilhar dependências:

```bash
make backend-check backend-clinical-test frontend-check COMPACT=1
```

Essa combinação exige o ambiente das verificações do backend além das variáveis
do runner sintético. Consulte a
[matriz de validação](WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional).
`project-check` cobre documentação, SQL, diff e status; não substitui testes do
frontend.

## Organização

| Área | Responsabilidade |
| --- | --- |
| `src/app/` | Composição de rotas, layout e sessão em memória. |
| `src/api/` | Cliente HTTP, tipos públicos e consultas canceláveis por recurso. |
| `src/features/pacientes/` | Busca, ficha e detalhe/histórico dos atendimentos. |
| `src/shared/` | Componentes e formatação de apresentação, sem regras clínicas. |

React monta a interface; React Router representa a navegação na URL; TanStack
Query mantém consultas do servidor por recurso; Vite serve o proxy e compila o
bundle; Vitest testa os contratos e a sessão; Playwright testa a interface no
Chromium. As versões efetivamente instaladas pertencem ao manifesto/lockfile.
CSS próprio incorpora a apresentação revisada; não há necessidade de adotar
todas as dependências do protótipo para a fundação de leitura.

Referências técnicas: [Vite](https://vite.dev/guide/),
[React Router](https://reactrouter.com/start/declarative/installation),
[cancelamento de consultas](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)
e [Playwright](https://playwright.dev/docs/intro). `npm run preview` serve o build
estático; o proxy `/v1` desta fundação pertence ao servidor de desenvolvimento.
A implantação posterior precisa servir assets e API pela mesma origem.

## Sessão e navegação

A sessão usa o token retornado pelo login somente em memória. A identidade e o
perfil são obtidos de `/v1/auth/me`; nenhum dado de paciente fica em armazenamento
persistente do navegador. Recarregar exige novo login e preserva o destino da
navegação, incluindo paciente, aba, filtros e página. Início oferece atalhos, e
Minha conta mostra a identidade retornada pela API.

| Rota | Uso |
| --- | --- |
| `/login` | Autenticação e retorno ao destino protegido. |
| `/` | Início com atalhos. |
| `/pacientes` | Busca; nome, sexo, limit e offset na query string. |
| `/pacientes/:pacienteId?aba=...` | Ficha com aba representada na URL. |
| `/pacientes/:pacienteId/atendimentos/:atendimentoId` | Detalhe de atendimento e coleções paginadas por limit/offset. |
| `/minha-conta` | Identidade e perfil obtidos da API. |

Sessão, cache de consultas e estado local de filtros têm responsabilidades
separadas. Saída, expiração, 401 e troca de identidade invalidam a sessão,
cancelam leituras pendentes e limpam o cache clínico. Respostas iniciadas sob uma
identidade antiga não podem repovoar os dados da sessão seguinte. Na retomada por
foco/visibilidade, o frontend revalida a identidade e os recursos clínicos ativos,
inclusive quando a identidade não mudou: o vínculo pode ter sido revogado.

O perfil influencia a apresentação; autorização de paciente/recurso permanece
na API. Os perfis `consulta`, `edicao` e `administracao` usam a mesma interface de
leitura e recebem somente os dados autorizados pelo servidor. Não existe CRUD
administrativo de usuários ou descoberta pública de vínculos nesta etapa.

## Busca e ficha

A busca usa os filtros nome/sexo e `limit`/`offset` na URL. A listagem apresenta
ID e nome disponíveis no contrato, sem consultas individuais para completar
colunas de cada paciente. Ficha, histórico de atendimentos e recursos aninhados
são carregados por aba/recurso, sem varredura de todos os dados clínicos.

Coleções ordinárias aceitam `limit` de 1 a 100 e `offset` de 0 a 100000. A API não
retorna total: a interface informa os itens da página, anterior/próxima e estado
vazio. Uma página vazia não comprova inexistência de resultados em outras páginas.
Filtros de uma busca nova reiniciam o offset; voltar e avançar no navegador
restauram a consulta representada pela URL.
Parâmetros de paginação fornecidos fora das faixas válidas são normalizados na
URL com substituição da entrada de histórico, preservando filtros e páginas
válidas de outros recursos. Parâmetros ausentes usam os defaults 20/0.

Paginação aninhada segue `paginacaoColecoes` e os parâmetros do contrato de cada
recurso. No detalhe de atendimento, um único offset pode paginar simultaneamente
coleções externas e filhos de snapshots. Ainda não há cursor independente dos
familiares de cada snapshot: avançar o offset pode retirar o snapshot da página
antes de alcançar todos os seus filhos. A interface preserva a paginação
retornada e seus limites, sem afirmar completude global ou reconstruir dados
ausentes. Evoluir esse contrato pertence a uma entrega própria do backend.

IDs PostgreSQL permanecem texto, inclusive acima de `Number.MAX_SAFE_INTEGER`.
Datas clínicas são apresentadas como datas civis, sem conversão que desloque o
dia pelo fuso. Idade usa o valor e a referência retornados pela API. Valores
desconhecidos e nulos não recebem interpretação clínica inventada; a apresentação
mantém a distinção definida pelos contratos.

## Apresentação e erros

A identidade visual, a organização do layout e as abas da ficha foram
revisadas a partir do
[protótipo Figma Make](../referencias/frontend/figma-make-prototipo/). Os componentes
e CSS da aplicação ficam em `frontend/`, sem importar a referência no build.
O protótipo não fornece persistência, autorização, identidade ou regras clínicas.

Carregamento, vazio e erro são estados distintos. 401 leva à reautenticação; 403
explica a recusa de acesso, 429 informa limite temporário, 503 informa serviço
indisponível, e falha de rede permite tentar novamente. Conteúdo clínico de uma
resposta anterior não deve permanecer visível enquanto uma nova consulta falha.
Navegação deve funcionar por links diretos, teclado, foco visível e telas menores.

Esta etapa não inclui formulários de escrita, importação/revisão, métricas, fila
global ou gestão de usuários. Etapas 7–8 seguem os contratos e dependências do
roadmap; produção e uso de dados reais dependem das Etapas 9–10.
