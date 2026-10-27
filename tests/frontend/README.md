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
sintéticos. A sessão de `--serve` dura 900 segundos para a revisão humana;
os testes automáticos continuam fixados em 60 segundos. O
[roteiro clínico](../../docs/validacoes/ROTEIRO_REVISAO_CLINICA_ETAPA_7.md)
orienta a execução e o registro do parecer da equipe.

Migrations 02–64 são aplicadas explicitamente no banco `etapa6_frontend_*`;
00/01 são substituídas pela criação do banco/schema exclusivos. O login técnico
dedicado usa `scripts/configurar_login_aplicacao.sql` e `vinculo_explicito`.
Importação HTTP sintética usa worker real com outro login, limitado à role
`ambulatorio_importador` e ao banco aleatório configurado pelo runner. A fixture
XLSX é gerada em seu diretório temporário; arquivo e login são removidos no final.
Revisão temporal permanece desligada. Senhas do servidor, logins e JWT são
recebidas/geradas no ambiente, sem entrar no bundle ou nos argumentos de comandos.

`importacao-simulacao.spec.ts` verifica multipart/dry-run, perfis, confirmação
única, cancelamento, resposta perdida sem reenvio e integridade de todas as
tabelas após a simulação. O H14 mínimo faz rollback de registros, mas consome
sequências; a garantia ampliada de não consumir IDs pertence a C2B.1 e está
pendente. Não usar este runner com planilhas reais.

Fixtures usam IDs retornados pelo banco/API: três perfis, pacientes com escopos
distintos, ID acima do limite seguro de JavaScript e coleções com mais de uma
página. Cadastro clínico é feito pela API ou pela interface no percurso
integrado. SQL prepara identidades, consulta catálogos, avança a sequência no
banco descartável e inativa/restaura uma identidade para provocar 401 real.
Em `familiares.spec.ts`, SQL cria também um segundo snapshot estritamente
sintético de 50 resultados na consulta que já tem 30 criados pela API. Isso
exercita a leitura do histórico com vários snapshots sem inventar uma nova
operação HTTP de escrita. Não faz parte do percurso cadastral pela interface.

Cobertura: login/`auth/me`, Minha conta, filtros/página na URL, ausência de
consultas individuais na listagem, ficha e todos os recursos publicados,
paginação simples/embutida/contrarreferências, links diretos, recarregar/voltar,
três perfis, saída/troca de identidade, expiração e respostas tardias, 401,
revogação de vínculo ao retomar foco, teclado/foco, Axe WCAG A/AA, tela estreita,
zoom de 200% e ausência de persistência em storage/cookies/IndexedDB/CacheStorage.

`stage7.spec.ts` usa pacientes adicionais criados pela API nos próprios cenários,
sem alterar a fixture de leitura. Cobre cadastro/homônimos, preservação de
contatos/endereço, PATCH com a versão original, 409 com comparação e descarte
explícito do rascunho antes de nova edição, recusa por perfil/vínculo e política
de cadastro consultada pela capacidade pública,
atendimento composto com rollback e pendência resolvida com data na mesma
transação, BZN/reações, retornos e contrarreferências
repetíveis, ano informado separado de visita, projetos/notificação, resolução
de pendências, rascunhos, perda de resposta após commit de atendimento, PATCH de
paciente, retorno anual e contrarreferência, confirmação parcial, reconsulta de
vínculo revogado com ocultação antes da resposta e revalidação da identidade
interrompida durante a resposta de escrita já commitada.
IDs dos catálogos vêm das consultas públicas; não são constantes de teste.

Os novos cenários separam as provas de recuperação:

- `familiares.spec.ts`: paginação independente de snapshots e filhos, 30/50
  resultados, falha da segunda página, voltar/recarregar e ausência de escrita.
- `stage7-acceptance.spec.ts`: busca/cadastro, atendimento com filhos,
  BZN/reação, retorno, encaminhamento/contrarreferência, resolução e histórico
  pela interface; releitura da API confere os IDs e valores gravados.
- `stage7-access-recovery.spec.ts`: registro real da operação, revogação antes
  da escrita, 403 clínico, revalidação somente de leitura e nova confirmação
  após restaurar vínculo, mantendo corpo e versão originais.
- `stage7-followup-recovery.spec.ts`: contexto do atendimento, contexto de outro
  paciente recusado, conflito BZN com rascunho completo, recibo após falha
  temporária de identidade e estados distintos de criação da pendência.

As escritas da interface registram UUID/método/caminho/hash antes da mutação e
usam `X-Operacao-Id`. Verificação/encerramento consultam o protocolo de operação
sem repetir a mutação. A infraestrutura cobre 14 rotas; cada cenário comprova
somente as classes que exercita. Suporte e estados estão no
[contrato de recuperação](../../docs/arquitetura/RECUPERACAO_OPERACOES_ETAPA_7.md).

Esses quatro arquivos tiveram oito cenários aprovados na rodada focada,
log `/tmp/ambulatorio-check-2vk6dno_/output.log`, artefatos
`/tmp/etapa6-frontend-7bvB5J`. Isso não substitui a regressão anterior de leitura/
escrita nem antecipa o aceite integral, a VU1 ou a revisão clínica humana.
O [relatório da Etapa 7](../../docs/validacoes/VALIDACAO_ETAPA_7.md) reúne o
estado final das verificações e suas limitações.

Intercepções de leitura atrasam respostas obtidas da API real por `route.fetch()`,
sem substituir conteúdo/status; o cenário de revalidação interrompe a conexão
de `/auth/me` e recupera depois a consulta real. Na Etapa 7, os cenários de perda
de resposta executam a escrita real e interrompem sua entrega após commit;
400/403/409/401 são provocados na própria API. O cenário 403 atrasa a entrega do
registro real para revogar a escrita antes do PATCH clínico; a leitura permanece
autorizada. Não há persistência clínica simulada. A expiração local usa
o relógio do navegador, mantendo o servidor real: o 401 do servidor é verificado
separadamente por inativação da identidade. 429/503 também são cobertos pelos
testes de componentes/cliente, sem provocar indisponibilidade artificial do
PostgreSQL. Axe cobre todos os tipos de formulário clínico, incluindo comparação
de conflito e diálogo de rascunho; teclado, tela estreita, zoom e screenshots
complementam a revisão manual de acessibilidade.

Os testes executam serialmente para compartilhar fixtures e respeitar o limite
real de login. O helper comum respeita os cabeçalhos reais de limite por IP e
aguarda a janela indicada. Somente esse tempo de espera é acrescentado ao
timeout do cenário; ações mantêm limite de 10 segundos e asserções de 8 segundos.
Não há retry automático do teste, mudança do limiter ou espera fixa para encobrir
ações lentas. Breadcrumbs usam separadores gráficos em CSS que não alteram o
nome acessível dos links localizados pelos testes.

Logs, screenshots, resultados e traces ficam apenas em um
diretório `/tmp/etapa6-frontend-*`; o arquivo de fixture é removido ao finalizar.
O cleanup encerra somente os dois processos e remove somente o banco/login
criados pelo runner, inclusive quando um teste falha.
