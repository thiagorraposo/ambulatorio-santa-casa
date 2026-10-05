# Integração do frontend em navegador

`test_e2e.sh` sobe uma API NestJS real e Vite com proxy `/v1` sobre um
banco PostgreSQL novo. O servidor deve ser explicitamente sintético e permitir
criação de banco e login. O runner não lê `.env`, não aplica migrations no startup
da aplicação nem reaproveita bancos ou processos existentes.

Pré-requisitos: PostgreSQL/`psql`, Node 24/npm 11, dependências fixadas de
`backend/` e `frontend/`, build do backend e Chromium do Playwright
(`cd frontend && npx playwright install chromium`; no CI, `--with-deps`).

Prefira `make frontend-e2e COMPACT=1`, com estas variáveis no ambiente:

- `SYNTHETIC_PG_HOST`, `SYNTHETIC_PG_PORT`, `SYNTHETIC_PG_USER`, `PGPASSWORD`.
- Opcionais: `FRONTEND_E2E_API_PORT` (6061) e `FRONTEND_E2E_WEB_PORT` (4176).

Execução direta: `bash tests/frontend/test_e2e.sh`. Argumentos adicionais são
encaminhados ao Playwright, por exemplo `--grep revogação`. `--serve` mantém o
ambiente disponível para inspeção manual até SIGINT/SIGTERM; o runner informa
URL, PID e arquivo de fixture. Usuários e senha mostrados são exclusivamente
sintéticos.

Migrations 02–63 são aplicadas explicitamente no banco `etapa6_frontend_*`;
00/01 são substituídas pela criação do banco/schema exclusivos. O login técnico
dedicado usa `scripts/configurar_login_aplicacao.sql`, `vinculo_explicito` e
importação/revisão desligadas. Senhas do servidor, login técnico e JWT são
recebidas/geradas no ambiente, sem entrar no bundle ou nos argumentos de comandos.

Fixtures usam IDs retornados pelo banco/API: três perfis, pacientes com escopos
distintos, ID acima do limite seguro de JavaScript e coleções com mais de uma
página. Cadastro clínico é feito pela API. SQL é usado somente para criar
identidades, consultar catálogos, avançar a sequência no banco descartável e
inativar/restaurar uma identidade para provocar 401 real.

Cobertura: login/`auth/me`, Minha conta, filtros/página na URL, ausência de
consultas individuais na listagem, ficha e todos os recursos publicados,
paginação simples/embutida/contrarreferências, links diretos, recarregar/voltar,
três perfis, saída/troca de identidade, expiração e respostas tardias, 401,
revogação de vínculo ao retomar foco, teclado/foco, Axe WCAG A/AA, tela estreita,
zoom de 200% e ausência de persistência em storage/cookies/IndexedDB/CacheStorage.

Intercepções nos testes apenas atrasam respostas obtidas da API real por
`route.fetch()`; não substituem seu conteúdo nem status. A expiração local usa
o relógio do navegador, mantendo o servidor real: o 401 do servidor é verificado
separadamente por inativação da identidade. 429/503/falhas de rede são cobertos
pelos testes de componentes/cliente, sem provocar indisponibilidade artificial
do PostgreSQL. Axe e screenshots complementam a revisão manual de acessibilidade.

Os testes executam serialmente para compartilhar fixtures e respeitar o limite
real de login. Logs, screenshots, resultados e traces ficam apenas em um
diretório `/tmp/etapa6-frontend-*`; o arquivo de fixture é removido ao finalizar.
O cleanup encerra somente os dois processos e remove somente o banco/login
criados pelo runner, inclusive quando um teste falha.
