# P0 atendimento — execução de 02/11/2026

Estado: **IMPLEMENTADA SEM VALIDAÇÃO COMPLETA** no recorte de feedback.
HUM-M3-03 permanece **ABERTO**; causa humana não confirmada. Base `e968c40`,
branch `feat/m3-janela-1-eventos`, árvore inicialmente limpa. O worktree antigo
`/tmp/ambulatorio-contexto-fix-20261031` foi consultado e preservado, sem copiar
sua árvore ou apresentá-lo como prova integrada.

## Objetivo e resultado

Investigar cadastro novo → confirmação, eliminar rejeições genéricas conhecidas
e dar acesso ao campo/etapa mantendo rascunho, autorização, transação e recibos.
Aceite integral exige navegador/API/PostgreSQL, persistência/releitura em paciente
novo/existente, permissão/revogação, conflito e perda de resposta sem duplicação.

Implementado [contrato de erros](../arquitetura/CONTRATO_ERROS_ATENDIMENTO_M3.md):
validação DTO com caminhos/códigos seguros; ApiClient sem texto arbitrário;
controles do atendimento com associação acessível; resumo com foco e links que
revelam etapa; recusa local de contexto simultâneo, sem escolher valor pelo usuário.
A constraint SQL03, já presente na evidência física, ganha tradução específica.
Isso comprova a lacuna de feedback por inspeção/testes de componente, **não**
reproduz a entrada da avaliação humana. Não houve migration, escrita em banco
persistente, push, merge ou deploy. Dados exclusivamente sintéticos.

## Evidências e comandos

- `make backend-build frontend-build COMPACT=1`: aprovado antes da inclusão dos
  testes novos; log `/tmp/ambulatorio-check-kgmdxndy/output.log`.
- `cd backend && npm run test:unit -- --runTestsByPath test/unit/field-validation.spec.ts test/unit/http-error.filter.spec.ts test/unit/pacientes.service.spec.ts`:
  **3 arquivos / 12 testes aprovados**; `/tmp/m3-p0-backend-unit.log`. Exercita o
  ValidationPipe real sem socket, nested DTO, omissão/null/false, versão,
  whitelist, descarte de valores/SQL e tradução da constraint conhecida.
- `make frontend-unit-test COMPACT=1`: **36 arquivos / 289 testes aprovados**;
  `/tmp/ambulatorio-check-n4lsjtvt/output.log`. Cinco testes novos, incluindo
  rascunho, foco/links/aria, contexto, HTTP aninhado e Consulta.
- Build subsequente encontrou opção `exact` inválida em teste Testing Library;
  corrigida para regex equivalente. `make frontend-build COMPACT=1` aprovado;
  `/tmp/ambulatorio-check-9_abq4a3/output.log`.
- Após restringir o feedback a formulários integrados e ajustar a cor existente:
  `cd frontend && npm run test:unit -- src/features/clinical/attendance-validation.test.tsx src/shared/writing.test.tsx src/shared/operation.test.tsx src/api/client.test.ts src/features/clinical/core-contracts.test.ts`:
  **5 arquivos / 54 testes aprovados**; `/tmp/m3-p0-frontend-focused.log`.
  Não somar aos 289 como testes distintos. Preservados testes de 403/409/rede e
  recuperação por recibo no conjunto focado; são testes de componente, não prova DB.

## Bloqueio real de integração

Cluster PostgreSQL exclusivamente novo em `/tmp/m3-p0-pg`, inicializado com
identidade sintética, não iniciou: `could not create IPv4 socket … Operation not
permitted`; `/tmp/m3-p0-pg.log`. Nenhum banco anterior foi usado/modificado.
O runner `tests/frontend/test_e2e.sh attendance-validation.spec.ts`, com variáveis
sintéticas para esse cluster, falhou **antes de criar banco/login**, em
`listen EPERM 127.0.0.1:6061`; `/tmp/m3-p0-e2e.log` e
`/tmp/etapa6-frontend-ZPU8U4`. O sandbox desta sessão não permite abrir sockets;
a política não permite solicitar execução com privilégio ampliado.

Dois cenários [E2E novos](../../tests/frontend/attendance-validation.spec.ts)
preparados para cadastro pela UI/Administração e paciente existente/Edição:
400 contextual/atomicidade, correção, um POST, releitura, 320px/axe. **Não
executados**. Rodar em ambiente autorizado com sockets e servidor sintético:
`bash tests/frontend/test_e2e.sh attendance-validation.spec.ts`, seguido da
validação proporcional pendente (`frontend-check`, `backend-check` e
`project-check` em destino explicitamente sintético). Não usar defaults de banco
persistente nem repetir suítes já aprovadas no mesmo estado sem motivo.

## DoD e próximos passos

Contrato/backend e UI implementados parcialmente; builds e testes sem rede
aprovados. Integração/persistência, comparação visual real, validações de domínio
residuais e reavaliação humana pendentes. Capacidade M3 e aceite não recalculados.
P1 Edição depende do acesso inicial ao recém-criado sem autovínculo/global.
P1 8D depende das decisões específicas de campos/capacidades, credenciais,
autoações/sessão/auditoria/recuperação, conforme proposta vigente. Perguntas
objetivas apresentadas ao responsável; nenhuma regra foi presumida.

## Retomada contínua — integração liberada

Base `21cb495`, descendente de `e968c40`, mesma branch e árvore inicial limpa.
Worktrees externos preservados. O ambiente atual abriu socket; cluster novo e
exclusivamente sintético em diretório registrado no arquivo volátil `/tmp/m3-continuo-pg-path`, host `127.0.0.1`, porta `55483`.
Nenhum banco persistente foi consultado ou alterado. Uma tentativa inicial de
initdb falhou por log dentro do diretório alvo; corrigida usando subdiretório
`data`, sem remover arquivos existentes.

Primeiro executados os dois E2E preparados sobre a base: **2 aprovados**, log
`/tmp/m3-continuo-p0-e2e.log`. Cadastro UI/Administração e existente/Edição
confirmaram e releram o atendimento. Portanto a falha humana não foi reproduzida.
Foi solicitada apenas descrição de cenário fictício/perfil, sem dados clínicos.

Incremento: regras existentes de exames e pendências agora publicam caminhos/
códigos por filho e feedback navegável local. Nenhuma mudança de schema,
permissão, recibo, regra clínica ou auditoria. Novos testes exercitam tipo ausente,
identificação em branco, descrição em branco e ambas as incompatibilidades de
resolução com 400 sanitizado e lista de atendimentos vazia após cada rejeição,
inclusive quando dados clínicos foram inseridos antes da falha.

Validação do incremento (não somar provas anteriores às contagens):

- `make backend-build frontend-build COMPACT=1`: aprovado;
  `/tmp/ambulatorio-check-p38bnck_/output.log`.
- `make frontend-unit-test backend-unit-test COMPACT=1`: **290 frontend / 203 backend**;
  `/tmp/ambulatorio-check-qvtg5icj/output.log`. Dois testes antigos que esperavam
  texto livre foram atualizados para verificar caminho/código estruturado.
- `SYNTHETIC_PG_HOST=127.0.0.1 SYNTHETIC_PG_PORT=55483 SYNTHETIC_PG_USER=m3_sintetico PGPASSWORD=sintetico bash tests/frontend/test_e2e.sh attendance-validation.spec.ts stage7.spec.ts --grep 'P0:|atendimento composto|409 do atendimento|consulta não escreve|revogação da permissão|cliques repetidos|resposta perdida após commit'`:
  **8 aprovados**; `/tmp/m3-continuo-p0-regression.log`, artefatos sintéticos
  `/tmp/etapa6-frontend-hNxxjw`. Comprova novo/existente, rollback, releitura,
  campos, 320px/axe, 403/409, duplo clique e recuperação após commit sem novo POST.
- `make backend-clinical-test COMPACT=1`, mesmas variáveis sintéticas:
  **22 suítes / 137 testes**, `/tmp/ambulatorio-check-jwc4t4u4/output.log`.
- Fundação executada por `bash tests/backend/test_integration.sh` com destino
  explícito `m3_validacao_descartavel`, login de aplicação exclusivo e política
  `todos_sinteticos`: **8 testes**; `/tmp/m3-continuo-foundation.log`.
  Executada diretamente porque o alvo Make depende de `docker-wait`; servidor
  desta prova é cluster local descartável. Build/unidades anteriores compõem
  a validação equivalente a `backend-check`, sem repeti-los.
- `make project-check DB_ENV=local DB_HOST=127.0.0.1 DB_PORT=55483 DB_USER=m3_sintetico DB_NAME=m3_validacao_descartavel COMPACT=1`:
  aprovado; `/tmp/ambulatorio-check-_ml2r_f9/output.log`.

DoD: integração técnica dos cenários descritos comprovada; E2E focado não é
suíte frontend integral nem homologação visual. HUM-M3-03 continua aberto;
mensagens melhoradas e sucesso sintético não identificam a causa humana.
P1 Edição permanece dependente do escopo inicial; P1 8D permanece dependente
dos contratos específicos registrados. Sem recálculo de métricas de M3/8V.

## Limites físicos, familiares e foco entre etapas

Incremento seguinte sobre `258c472`. Sete casos reproduziram aceitação indevida
no DTO de números que não cabem nas colunas físicas: teste inicial **7 falhas /
6 aprovados**, `/tmp/m3-continuo-limits-before.log`. Schema aplicado define
numeric(5,2) para altura/peso/circunferência/saturação e integer para frequência/
pressões. DTO e cliente passam a recusar esses mesmos limites com caminho/código;
null, zero, negativos e extremos físicos continuam permitidos. Não se definem
faixas fisiológicas, não há migration, arredondamento ou correção automática.
Familiares incompatíveis/sem texto útil passam a apontar controles existentes;
a exigência de incluir ao menos um familiar continua geral quando ainda não
existe um controle de detalhe a focar.

O novo E2E revelou foco perdido ao sair da revisão para a etapa inválida: efeito
do título da etapa sobrepunha o foco do resumo. Reproduzido também em componente
(`/tmp/m3-continuo-focus-before.log`), corrigido condicionando esse efeito à
navegação sem erros. `24` testes focados aprovados após correção, incluindo
regressão de foco/rascunho/links (`/tmp/m3-continuo-focus-after.log`).

- Build backend/frontend aprovado: `/tmp/ambulatorio-check-bz4b42s0/output.log`;
  build frontend após ajuste de foco: `/tmp/ambulatorio-check-zmll4lne/output.log`.
- Unidades backend: **211 aprovadas**, `/tmp/ambulatorio-check-1ze357v6/output.log`.
- Unidades frontend: rodada de297 casos teve296 aprovados e uma falha de timing
  no teste de interrupção do hash; arquivo afetado passou isolado9/9 sem mudança
  de produto (`/tmp/m3-continuo-operation-retry.log`). Após novo teste/fix de foco,
  os24 focados passaram. Não afirmar execução integral298/298 nem somar repetidos.
- Clínicos: **137 aprovados**, `/tmp/ambulatorio-check-5xmrxv7l/output.log`.
- E2E novo limites/familiares/API/320px/axe/releitura: **1 aprovado**,
  `/tmp/m3-continuo-limits-e2e.log`, runner `/tmp/etapa6-frontend-MRycmj`.
- Rodada ampla104: **55 aprovados, 2 falhos, 1 interrompido, 46 não executados**,
  `/tmp/ambulatorio-check-czw1w6as/output.log`, `/tmp/etapa6-frontend-pKcqnq`.
  Interrompida pelo agente após reproduzir o defeito para corrigir e selecionar
  os casos restantes. Primeiro falho era foco descrito acima, já validado.
  Segundo era roteiro de relogin que ignorava429 real (alerta de excesso de
  tentativas registrado): passou a reutilizar o mesmo helper de login com
  espera de Retry-After, sem mudar/burlar limiter. Login na página atual preserva
  next/query; teste focado passou1/1 (`/tmp/m3-continuo-login-reload.log`).

Próxima rodada seleciona casos restantes/falhos e recortes impactados; preserva
provas dos casos aprovados sem alteração. SQL/fundação do incremento anterior
permanecem aplicáveis aos seus componentes inalterados. P0 humano ainda aberto.
