# Validação integrada — 8D2B.1/U.1 perfil administrativo

03/11/2026, branch `feat/m3-janela-1-eventos`, base `ff245a3` mais o diff da
entrega. [Contrato principal](../arquitetura/CONTRATO_PERFIL_USUARIO_8D2.md),
[decisões 3–10](../dados/DECISOES_PRODUTO_M3_2026_11_02.md).
Recorte tecnicamente integrado; aceite humano M3/8V permanece pendente.
A revisão comparativa humana foi adiada, sem aprovação implícita; M1/M2 preservados.

## Resultado e limites

Administração altera perfil de outra conta com versão, justificativa e revisão
anterior→novo. API/PostgreSQL, releitura, recibo histórico e revogação JWT reais.
Recuperação usa UUID na URL, inclusive após recarga/novo login, sem repetir POST.
409 preserva rascunho e exige comparar/revisar novamente. Autoação vedada na UI e
no banco; último administrador protegido também em UPDATEs concorrentes de
infraestrutura. Retorno ao perfil anterior/reativação não revive JWT antigo.
Recibos não expõem senha/hash/token e só são lidos pela Administração vigente.

Migration75 aplicada somente em bancos descartáveis exclusivos no servidor
tmpfs `ambulatorio-m3-perfil-20261103`, porta55459. Não aplicada no persistente;
dump estrutural preservado. Acréscimo de versão nos GETs atualiza consumidores e
projeções exatas na mesma entrega. APIs clínicas preservadas, inclusive cadastro
por Edição/vínculos e revogação da migration74. Estado/criação/credenciais e
histórico geral de contas continuam escopos separados; família8D parcial.

## Verificações

- `make backend-check frontend-build COMPACT=1` com banco/role sintéticos:
  backend build,213 unidades e8 integração/fundação passaram; o frontend build
  nessa chamada detectou opções inválidas nos testes, corrigidas antes do build
  posterior aprovado. Log `/tmp/ambulatorio-check-hues4jcz/output.log`.
- `test_clinical_integration.sh test/clinical/usuario-perfil.http.spec.ts test/clinical/usuarios.http.spec.ts`:
  27/27 HTTP após correção de concorrência e de privilégios; log
  `/tmp/m3-perfil-http-final.log`. A ampliação posterior do teste de infraestrutura
  passou8/8 no arquivo próprio (`/tmp/m3-perfil-concorrencia-final.log`): total
  distinto28 HTTP por composição, sem somar reexecuções.
- Regressão HTTP de `stage7`, `catalogos` e `clinical`:41/41, log
  `/tmp/m3-perfil-http-regressao.log`. Reativação passa a exigir sessão nova;
  prova adicional mantém vínculo revogado na sessão renovada.
- Frontend:321 unidades passaram numa execução integral com2workers, log
  `/tmp/m3-perfil-unidades-ui-integral.log`. Depois houve ajustes locais de labels,
  fechamento e espaçamento do diálogo;10/10 focadas passaram no estado final,
  log `/tmp/m3-perfil-unidades-ui-final.log`. Não é nova integral no SHA final.
- Build frontend final aprovado (`/tmp/ambulatorio-check-qxjtfllg/output.log`).
- `make project-check workflow-test COMPACT=1` em base recém-criada
  `test_m3_perfil_suite`:46 scripts SQL e31 testes de workflow aprovados;
  log `/tmp/ambulatorio-check-7hehvoeb/output.log`. Sem dump ou teste de escrita
  em serviço persistente. Migrations02–75 aplicadas pelo setup descartável.
- E2E: rodada ampla13/14; falha do cenário histórico que tentava inativar o único
  administrador foi corrigida preparando outro administrador sintético no helper,
  sem enfraquecer a proteção. Rodada final focalizada de5 cenários (perfil +
  inativação) passou5/5, log `/tmp/m3-perfil-e2e-focado-final.log`. Refinamento
  visual posterior tem uma nova prova própria de diálogo. Evidência por composição;
  nenhuma nova execução integral de todos os E2E do produto no SHA final.

Falhas intermediárias ficaram explícitas: conexão antes de iniciar o servidor;
deadlock corrigido com FOR NO KEY UPDATE; permissão ampla de hash detectada pelo
SQL12 e reduzida; fixtures antigas de SQL18/30 passaram a ter reserva administrativa;
base de suíte com nome não permitido/fixtures confirmadas foi substituída por
base limpa; teto de migrations do runner E2E atualizado para75; label do select
corrigida antes da rodada final. Sem alteração de migrations antigas.

## Validação visual técnica

Comparação com referência oficial de Usuários e modal de perfil renderizados
localmente a partir de `referencias/frontend/figma-make-prototipo`, sem editar a
fonte. Capturas de referência1440/390/320 e implementação nos mesmos tamanhos.
Mantidos identidade/login, opções de perfil, anterior→novo, fechar/cancelar/
confirmar, cores de ação e foco modal. Adaptações deliberadas: escolha e
justificativa na página antes da revisão, ID/versão/recibo reais, aviso de sessão,
sem rótulo fictício de acesso completo ou atualização simulada. Seleção usa select
nativo, com labels explícitas; diálogo reutiliza draft-dialog e form-actions.
Axe/reflow e foco/teclado/Escape, X e cancelamento sem escrita nos E2E finais.
Comparação técnica não é homologação8V ou revisão humana comparativa.

Refinamento final de cabeçalho/espaçamento, X e fundo:1/1 E2E passou, log
`/tmp/m3-perfil-visual-definitivo2.log`. A repetição anterior sofreu
ERR_NETWORK_CHANGED ao carregar módulos, antes do login inicial (trace preservado
em `/tmp/etapa6-frontend-pnA7XR`); nova execução sem mudança funcional passou.

- Referência: [1440](../evidencias/perfil_usuario_2026_11_03/referencia-perfil-1440.png), [390](../evidencias/perfil_usuario_2026_11_03/referencia-perfil-390.png), [320](../evidencias/perfil_usuario_2026_11_03/referencia-perfil-320.png).
- Revisão: [1440](../evidencias/perfil_usuario_2026_11_03/perfil-revisao-1440.png), [390](../evidencias/perfil_usuario_2026_11_03/perfil-revisao-390.png), [320](../evidencias/perfil_usuario_2026_11_03/perfil-revisao-320.png).
- Confirmação: [1440](../evidencias/perfil_usuario_2026_11_03/perfil-confirmado-1440.png), [390](../evidencias/perfil_usuario_2026_11_03/perfil-confirmado-390.png), [320](../evidencias/perfil_usuario_2026_11_03/perfil-confirmado-320.png).
 Provas históricas306/118 e relatórios
anteriores permanecem por composição e nos estados que efetivamente testaram.
