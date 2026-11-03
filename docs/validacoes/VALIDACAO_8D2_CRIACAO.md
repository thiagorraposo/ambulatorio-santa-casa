# Validação integrada — criação e primeiro acesso 8D2B.3/U.3

03/11/2026, branch `feat/m3-janela-1-eventos`, base `d17a78d` + diff desta unidade.
Commit do código identificável pelo checkpoint e histórico local. Escopo técnico
sintético, revisão humana adiada; M3/8V1/8V2 permanecem abertos.
[Contrato normativo](../arquitetura/CONTRATO_CRIACAO_USUARIO_8D2.md).

## Funcionalidade e segurança

Criação administrativa, revisão/cancelamento/confirmar uma vez, identidade/perfil
iniciais, releitura real e credencial temporária de exibição única. Primeiro login
consome credencial atomicamente; sessão inicial só consulta identidade/troca senha.
Troca verificada e CAS de hash/geração revogam JWT, exigindo login normal novo.
Recuperação de contas não administrativas troca credencial com justificativa,
versão e recibo. Resposta perdida consulta resultado por UUID sem reenvio/segredo.
Não concede vínculo ou capacidade específica. Perfil/estado anteriores preservados.

Migration77 em PostgreSQL16 exclusivo loopback55464,
`/tmp/ambulatorio-users-pg-HyPRtj/data`, destino conferido por SQL antes de escrever.
Nenhum banco persistente, credencial real, push, merge ou deploy. Novo dono
NOLOGIN de credenciais mantém o dono da captura sem leitura de hashes.
Estrutura física incremental descrita na migration77; dump aplicado persistente
preservado. Retenção institucional e recuperação excepcional de administradores
pela infraestrutura não são implementadas por este fluxo.

## Provas e reexecução

- `make backend-build backend-unit-test COMPACT=1`:233/233 em25 suítes,
  `/tmp/ambulatorio-check-6z22gde9/output.log`. Composição inclui225 unidades
  existentes +8 da preparação independente do dashboard, sem tratá-las como
  testes novos da criação.
- `test_clinical_integration.sh test/clinical/usuario-criacao.spec.ts`:9 HTTP/PG,
  RBAC, DTO, duplicidade/consumo/troca concorrentes, expiração, recibos, recuperação,
  revogação e auditoria. 9/9 aprovados após separação de owner; `/tmp/usuarios-criacao-http-final.log`.
- SQL49: rollback integral, replay, namespace UUID cruzado, CAS, ausência de
  vínculos, privilégios/owner e segredo fora de recibos. `make project-check
  COMPACT=1 DB_ENV=local DB_HOST=127.0.0.1 DB_PORT=55464
  DB_USER=ambulatorio_user DB_NAME=test_m3_users_final_20261103`:50 SQL aprovados
  na composição77+78 e documentação, `/tmp/ambulatorio-check-wntkj_9o/output.log`.
  A primeira execução falhou no SQL12 por grant ao dono da captura; separação
  do owner corrigiu a implementação e nova execução limpa passou.
- Frontend build e343 testes distintos aprovados por composição: integral342/343,
  correção de suporte duplicado e shell+novos10/10. Não é uma integral final única.
  `/tmp/m3-criacao-frontend-unidades.log`.
- E2E: criação/primeiro login/troca/login normal, recuperação, perda de resposta
  após novo login, RBAC, cancelamento/foco e regressão de perfil/estado. A primeira
  tentativa foi recusada pelo limite antigo de migrations do runner; limite
  atualizado. A primeira execução funcional falhou somente no logout oculto pelo
  menu móvel; teste passou a usar viewport desktop antes dessa ação.
  Logs `/tmp/m3-users-e2e.log` e `/tmp/m3-users-e2e-final.log`; composição e capturas
  finais:12/13 na primeira rodada funcional +1/1 corrigido =13/13 distintos
  por composição, sem uma integral final única. Capturas finais GHyr05 versionadas.

## Comparação visual técnica

Criação e primeiro acesso são extensões ausentes no protótipo oficial. Comparadas
às capturas oficiais já versionadas de Usuários/diálogos em
`docs/evidencias/estado_usuario_2026_11_03`: navegação azul, tipografia, superfícies,
bordas, revisão modal e ações confirmadas conservam o padrão da interface real.
Modal de criação é mais largo para identidade/perfil/efeitos; troca obrigatória
usa cartão sem navegação. Diferenças deliberadas: justificativa, prazo, recibo,
recuperação e fluxo inicial reais, sem confirmação por timer. Não constitui
homologação nem comparação de toda a família8D. E2E verifica Axe, foco e ausência
de overflow em1440/390/320. Capturas sem campos secretos preenchidos em
[artefatos](../evidencias/criacao_usuario_2026_11_03/README.md).

SQL49 com asserts finais de owner e documentação: `/tmp/ambulatorio-check-xppyv4ak/output.log`, aprovado.
