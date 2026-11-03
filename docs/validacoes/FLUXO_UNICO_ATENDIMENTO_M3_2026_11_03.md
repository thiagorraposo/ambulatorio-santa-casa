# P0 funcional de M3 — fluxo único do atendimento

## Escopo e estado

Base de entrada: `082d174bffba7ce953a75294fa8e7be0d6045e7a`, branch
`feat/m3-janela-1-eventos`, árvore inicialmente limpa. Implementação desta unidade
na árvore e no index, ainda sem commit novo; não confundir a base com um SHA que
já contenha a mudança. **Implementado com validação integrada pendente.**
Na execução anterior, o responsável solicitou finalizar a menor unidade segura,
testar e registrar commit/checkpoint. A retomada atual autoriza continuar8D
após o fechamento técnico do P0; revisão humana permanece adiada.

P0 funcional passa a ser preencher, revisar e confirmar as12 seções na mesma
interface. A prioridade substitui a ordem operacional anterior, preservando os
requisitos e aceites anteriores. A falha humana HUM-M3-03 continua sem causa
reproduzida; este trabalho não a declara resolvida. Revisão humana permanece
adiada; não há homologação ou conclusão integral8V1/8V2.

## Capacidades oferecidas

| Seção | Operações no rascunho único | Limite preservado |
| --- | --- | --- |
|1 Atendimento|Data, localização, contexto triestado e observações|PATCH anterior continua restrito ao núcleo versionado|
|2 Chagas e Sorologia|Diagnóstico e novas sorologias com método, datas, resultado, laboratório e observações|Sem diagnóstico inferido da sorologia|
|3 Condição Clínica|Nova condição e novas complicações|Campos independentes; sem classificação inferida|
|4 Comorbidades|Itens do catálogo, presença explícita e histórico familiar|Ausência de avaliação não vira negativo|
|5 Avaliação Clínica|Medidas, NYHA e observações existentes|Precisão decimal e limites do contrato preservados|
|6 Eventos e Dispositivos|Consultar histórico; novos AVC, marcapasso/CDI e óbito|Sem vínculo artificial ao atendimento; registros únicos não são recriados|
|7 Projetos|Consultar vínculos e criar vínculo novo com estado explícito|Alteração de vínculo existente continua na área específica|
|8 Exames|Coleções de exames trazidos/solicitados, resultado textual e familiares|Resultados estruturados por parâmetro continuam na área específica|
|9 Medicamentos e BZN|Consultar tratamento existente; criar tratamento novo com campos comprovados|Sem prescrição fictícia. Medicamentos por consulta salva; reações/retornos nas áreas próprias|
|10 Encaminhamentos|Criar encaminhamentos ligados ao novo atendimento|Contrarreferências de encaminhamentos existentes continuam na área própria|
|11 Notificação|Consultar existente e criar quando ausente|Alteração de notificação existente continua na área própria|
|12 Observações|Pendências e sua resolução explícita no contrato inicial|Observações gerais/clínicas mantêm seus destinos próprios|

A navegação livre e Anterior/Próxima percorrem todas as seções; navegar não grava.
O rascunho compartilhado reutiliza DraftStore em memória e proteção de navegação.
Recarregar ou sair da sessão continua apagando dados conforme aviso existente;
não foi introduzido armazenamento clínico persistente no navegador. Campo vazio
é omitido; booleano negativo é `false`; desconhecido explícito é `null` nos campos
novos. O resumo apresenta essas diferenças. Adicionar registro exige intenção
explícita; linha vazia precisa ser preenchida ou removida antes da revisão.

## Contrato e persistência

Novo `POST /v1/pacientes/:id/atendimentos/confirmacao`, restrito a Edição e
Administração com acesso de escrita ao paciente, exige `X-Operacao-Id` registrado
pelo mecanismo `/operacoes` existente. O endpoint original permanece disponível
e é usado pelo formulário quando não existem complementos novos.

O corpo estende o contrato original com opcionais `condicaoChagas`, `sorologias[]`,
`complicacoesChagas[]`, `comorbidades`, `avcs[]`, `dispositivos[]`, `obito`,
`projetos[]`, `tratamentoBzn`, `encaminhamentos[]` e `notificacao`. Reutiliza DTOs e
serviços de domínio. Encaminhamentos recebem o ID criado; BZN histórico não recebe
`atendimentoId`. Não houve migration nem alteração de evidência estrutural.

`DatabaseService.coordinate` compõe explicitamente os serviços na mesma conexão,
ator e transação PostgreSQL, com exatamente um COMMIT e um recibo atômico. A
transação externa adquire o paciente antes dos INSERTs para evitar upgrade
concorrente dos locks de FK. Falha de qualquer etapa reverte toda a unidade;
não há compensação destrutiva nem confirmação parcial neste endpoint.

O recibo plano contém `atendimentoId`, os IDs opcionais singulares e IDs por
índice zero (`sorologia0Id`, `complicacao0Id`, `avc0Id`, `dispositivo0Id`,
`projeto0Id`, `encaminhamento0Id`). Núcleo, medidas, diagnóstico, exames,
rastreio e pendências mantêm a identificação pelo atendimento e releitura
existente. O recibo é consultável em `/operacoes/:id`; a recuperação não reenvia
clínica. A interface verifica os IDs esperados antes de reconhecer sucesso e
apresenta o resultado de cada complemento confirmado.

Resposta perdida ou incompleta bloqueia reenvio até consulta autoritativa.
HTTP409 também permite essa consulta: só `nao_aplicada` libera revisão e outra
intenção. `confirmada` recupera o recibo; `em_curso`/indeterminado mantêm o bloqueio.
O estado do envio mantém chave estável mesmo ao adicionar/remover complementos.
Novo atendimento após recibo inicia campos vazios e uma nova chave de rascunho.

Projetos/notificação usam criação somente se ausentes, com conflito concorrente
em lugar de sobrescrita. Óbito, dispositivos e BZN mantêm as restrições de
unicidade. AVC indistinguível do existente é recusado no coordenador sob lock do
paciente. Isso não introduz deduplicação clínica por inferência; conflitos exigem
consulta ao registro existente. Endpoints antigos continuam com sua semântica.

## Validação anterior desta árvore sob restrição de ambiente

Resultados desta árvore (código + testes ainda não commitados na execução). As evidências
históricas do [relatório visual anterior](ADEQUACAO_VISUAL_FRONTEND_2026_11_03.md)
e dos recortes clínicos não foram reexecutadas neste SHA e não comprovam o novo
endpoint. O layout/CSS existentes foram preservados, mas isso não equivale a uma
nova comparação renderizada.

Ambiente: o sandbox proíbe sockets TCP e Unix (`Operation not permitted`), acesso
a `/var/run/docker.sock` e inicialização do Chromium. PostgreSQL16 descartável foi
inicializado apenas em `/tmp/ambulatorio-p0-pg-OyFaM3`, mas não conseguiu iniciar
servidor (logs `server.log`/`unix.log`); nenhum banco persistente foi acessado.
Não houve ampliação do sandbox, push, merge ou deploy.

- Build backend aprovado: `/tmp/ambulatorio-check-sbprrokk/output.log`.
- Backend sem sockets:18 suítes/179 testes aprovados em
  `/tmp/m3-attendance-backend-unit.log`, incluindo coordenação/ator/rollback,
  composição/recibo, DTOs/erros e criação sem sobrescrita. Comando:
  `cd backend && npm run test:unit -- --testPathIgnorePatterns '\.http\.spec\.ts$|application\.spec\.ts$'`.
- Integral backend tentada:178 testes passaram e43 falharam em6 suítes HTTP
  por `listen EPERM`; não é aprovação integral. Log
  `/tmp/ambulatorio-check-_087l0ih/output.log`.
- Integral frontend intermediária:334/337 aprovados; dois mocks não traziam
  todos os IDs esperados pelo novo controle de recibo e um teste de interrupção
  de hash excedeu timeout sob concorrência. Mocks corrigidos e rodada final
  com dois workers abaixo; não apresentar a rodada intermediária como aprovada.
- Build frontend final aprovado: `make frontend-build COMPACT=1`, log
  `/tmp/ambulatorio-check-oi99lcms/output.log`.
- Frontend integral final: **39 arquivos/337 testes aprovados**, dois workers,
  uma execução em `/tmp/ambulatorio-check-xz_xiq2p/output.log`. Comando:
  `cd frontend && npm run test:unit -- --maxWorkers=2`. Inclui7 testes de
  interface integrada e5 testes adicionais do contrato/recibo; jsdom/HTTP mockado.
  A rodada anterior com2 workers retornou336/337 antes da correção do último
  mock (`/tmp/ambulatorio-check-i_b35gxn/output.log`); foi substituída pela integral
  final, sem esconder a falha. A execução final contém também a checagem de
  recibo antes de alterar o estado do envio para salvo.
- `make docs-check repository-check COMPACT=1` aprovado, log
  `/tmp/ambulatorio-check-bnduwsyq/output.log`; `git diff --check` e staged diff
  revisados. Nenhum dado real ou credencial acrescentados.
- Cinco cenários reais preparados em `tests/frontend/attendance-unified.spec.ts`:
  percurso12 seções/API/SQL, resposta perdida/duplo clique, rollback/replay,
  histórico sem duplicação e RBAC/campos inválidos. Descoberta Playwright e
  TypeScript standalone verificados; **execução real pendente**. Runner tentado:
  `SYNTHETIC_PG_HOST=127.0.0.1 SYNTHETIC_PG_PORT=55463 SYNTHETIC_PG_USER=p0_sintetico PGPASSWORD=<senha-sintetica> bash tests/frontend/test_e2e.sh attendance-unified.spec.ts`.
  Parou no preflight com `listen EPERM 127.0.0.1:6061`, antes de criar banco/roles;
  diretório `/tmp/etapa6-frontend-bwpiPX`.

Não foi possível executar frontend-check/backend-check/project-check completos,
HTTP/PostgreSQL, concorrência real, Axe, teclado e comparação visual1440/390 nesta
restrição. Os testes jsdom e mocks não substituem essas provas obrigatórias.

## Tentativa anterior de commit local e preservação

Commit solicitado e tentado em03/11/2026 às10:37 America/Sao_Paulo, mensagem
`feat: integrar rascunho e confirmação coordenada do atendimento`. A tentativa de
atualizar o index documental e de criar commit falhou com
`Unable to create .git/index.lock: Read-only file system`. Nenhuma permissão foi
ampliada. HEAD permanece `082d174bffba7ce953a75294fa8e7be0d6045e7a`;31 arquivos
próprios estão staged e os ajustes finais deste relatório/checkpoint também
estão unstaged. Não declarar working tree limpa ou commit realizado.

## Próxima ação registrada na execução anterior

Quando o Git estiver gravável, incluir os dois documentos finais com
`git add docs/execucao/PLANO_M3_2026_11_03.md docs/validacoes/FLUXO_UNICO_ATENDIMENTO_M3_2026_11_03.md`
e executar `git commit -m 'feat: integrar rascunho e confirmação coordenada do atendimento'`.
Registrar SHA final e revisar status. A implementação testada permanece preservada.

Em ambiente sintético que permita os serviços, executar o runner existente com
`make frontend-e2e COMPACT=1` e servidor `SYNTHETIC_PG_*` descartável, incluindo
`attendance-unified.spec.ts` e a regressão completa. Executar backend-check,
backend-clinical-test e project-check na mesma base exclusivamente sintética.
Comprovar cadastro→12 seções→revisão→recibo→releitura→histórico→novo vazio,
403/400/409, concorrência/replay e resposta perdida; comparar1440/390 com a
referência e guardar capturas. Só então declarar o recorte tecnicamente validado
e retomar8D2B.3/U.3, mantendo o aceite humano pendente.


## Retomada com serviços acessíveis — 03/11/2026

Entrada confirmada: HEAD `082d174bffba7ce953a75294fa8e7be0d6045e7a`,
31 arquivos com alterações preexistentes (index e dois documentos com ajustes
unstaged). Preservadas; cópias adicionais do diff integral/index em
`/tmp/m3-p0-entry.patch` e `/tmp/m3-p0-entry-index.patch` (voláteis).

### Ambiente e diagnóstico dos dois bloqueios

`stat` confirmou proprietário `raposo:raposo`, `.git` com modo775 e index664;
`findmnt -T .git` apontou ext4 `rw`. Nenhum `index.lock` existia. Criação exclusiva
e remoção de um arquivo de prova próprio em `.git` passaram. Não houve chmod,
sudo, mudança de montagem/configuração ou remoção de lock. O erro anterior de
filesystem somente leitura não foi reproduzido nesta sessão; não se atribui sua
resolução a uma alteração de permissões que não ocorreu.

Separadamente, bind TCP em loopback e Unix em `/tmp` passaram. As portas foram
inspecionadas antes das escritas. Criado PostgreSQL16 exclusivamente desta
sessão em `/tmp/ambulatorio-m3-pg-Fogkc8/data`, loopback55463; consulta a
`current_database/current_user/data_directory/inet_server_port` confirmou o alvo.
API6061 e frontend4176 foram criados pelos runners; repetições focadas usaram
6065/4178. Chromium headless iniciou e executou os cenários reais. Nenhum serviço
preexistente ou banco persistente foi reutilizado. Sem ampliação do sandbox.

### Achados corrigidos e prova integrada

- A primeira rodada retornou4/5: o teste consultava `evento_clinico.atendimento_id`,
  inexistente na evidência física e no PostgreSQL. Corrigido para conferir
  `paciente_id` e ano, mantendo a natureza longitudinal do evento. Log
  `/tmp/m3-p0-integrated.log`, artefatos `/tmp/etapa6-frontend-eLqYZY`.
- Acrescentados concorrência real entre duas confirmações do mesmo AVC,
  comparação integral dos históricos antes/depois e asserts SQL de origem
  `aplicacao`, ator Edição e ausência de proveniência de importação/revisão nos
  registros novos de atendimento, sorologia e AVC.
- Rodada focada7/7 em `/tmp/etapa6-frontend-DQzduD`: seis cenários do fluxo
  único e percurso12 seções com rascunho/saída/retorno, foco, validação,
  único POST e releitura. Inclui400/403/409, revogação do vínculo entre preparo e
  confirmação, recibo confirmado/não aplicado, resposta perdida, duplo clique,
  rollback tardio e replay. Concorrência produziu201/409, um atendimento/AVC.
- Asserts HTTP/SQL comprovaram peso65.25, negativo `false`, desconhecido `null`,
  recibos de todos os complementos, vínculo dos filhos ao novo atendimento,
  evento/BZN longitudinais e novo rascunho vazio. Os seis recursos longitudinais
  existentes permaneceram integralmente iguais após novo atendimento e conflito.
- A comparação renderizada detectou seletor esticado junto da paginação de
  catálogo em1440. Correção localizada: `align-items: start` na grade do
  atendimento. A primeira checagem de altura incluiu controles escondidos e
  retornou6/7 (`/tmp/etapa6-frontend-Zaa45H`); restringida a seletores visíveis.
  Percurso preenchido com12 seções, Axe/reflow e capturas1440/390 aprovado em
  `/tmp/etapa6-frontend-PP4LDr` (1/1); projetos também verificado em320.
- Prova final do percurso com auditoria/proveniência e contrato `/auth/me`:
  2/2 em `/tmp/etapa6-frontend-QV6mJZ`, log
  `/tmp/m3-p0-audit-clinical-final.log`. Expectativa de `/auth/me` atualizada para
  os campos login/ativo já implementados; contrato mantido, sem afrouxar o assert.

[26 capturas sintéticas e comparação com a referência](../evidencias/fluxo_unico_m3_2026_11_03/README.md),
com manifestoSHA256. Índice, ordem, títulos/contador, paleta e painel preservados;
mobile mantém seleção e conteúdo visíveis em coluna única. Triestado, adição
explícita e revisão central refletem o contrato real. Não é comparação pixel a
pixel nem aceite visual humano; revisão/homologação8V continuam pendentes.

### Regressão proporcional da retomada

- Build backend aprovado, `/tmp/ambulatorio-check-6irlyjmy/output.log`.
- 46 testes HTTP de unidade antes bloqueados passaram em6 suítes:
  `/tmp/m3-p0-backend-http-unit.log`. O alvo compacto backend-check executou
  novamente também as unidades/build:24 suítes/225 testes e8 testes de fundação
  aprovados, `/tmp/ambulatorio-check-uyq9xomt/output.log`. São testes distintos
  dos179 sem sockets anteriormente registrados, sem soma como integração.
- 25 suítes/173 testes clínicos HTTP/PostgreSQL aprovados por
  `make backend-clinical-test COMPACT=1`; log
  `/tmp/ambulatorio-check-ehkxb35t/output.log`.
- 47 testes SQL, docs e diff aprovados por `make project-check COMPACT=1`, com
  `DB_ENV=local`, host127.0.0.1, porta55463, usuário sintético e banco
  `m3_synthetic_project_clean`; `/tmp/ambulatorio-check-wpp1j7gp/output.log`.
  Tentativas anteriores: banco `m3_validation` recusado pelo guard de nome do
  SQL33; após renomear, repetição SQL20 recusada por resíduos committed da
  primeira rodada. Resolvido com banco novo e migrations02–76; sem alterar
  testes/schema para contornar o guard.
- Build frontend aprovado, `/tmp/ambulatorio-check-i8tvvopt/output.log`.
 337 unidades frontend anteriores reutilizadas: TS/TSX de produto permanece
  igual ao estado aprovado; única correção posterior de produto é CSS verificado
  no build e navegador. As unidades não são apresentadas como integração.

Regressão ampla de navegador e fechamento do checkpoint/commit em andamento.
