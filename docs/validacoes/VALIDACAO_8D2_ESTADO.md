# Validação integrada — 8D2B.2/U.2 ativação e inativação

03/11/2026, branch `feat/m3-janela-1-eventos`, base `18e209b` mais o diff desta
unidade. [Contrato compartilhado](../arquitetura/CONTRATO_PERFIL_USUARIO_8D2.md#extensão-integrada--estado-8d2b2u2).
Recorte validado tecnicamente, sem aceite humano. M1/M2 e seis janelas preservados;
revisão comparativa humana temporariamente adiada e M3/8V ainda pendentes.

## Escopo integrado e compatibilidade

POST estado e detalhe real permitem inativar/reativar outra conta com versão,
justificativa, revisão anterior→novo, confirmação e recibo. Autoação proibida;
último administrador ativo protegido mesmo em concorrência com despromoção.
Inativação encerra sessões e revoga vínculos atomicamente; reativação exige novo
login e não restaura vínculos ou JWT. Operações já confirmadas são preservadas.

Migration76 compartilha recibos/versão entre perfil e estado, preserva bytes do
recibo anterior, wrapper SQL e view de perfil para leitores75. Getter de recibos
conserva URL/campos/autorização e passa a ler ambos os comandos. UI reutiliza
AlterarConta, rascunhos por conta/ação, diálogo acessível e recuperação por UUID
após novo login. Recibo confirmado permite nova intenção explícita com releitura;
reenvio incerto continua bloqueado. Perfil mantém seus contratos e regressões.

Somente bancos descartáveis no container tmpfs próprio55459. Migration76 não foi
aplicada no persistente; dump não atualizado. Criação, credenciais e histórico
geral de criação/contas continuam próprios. Família8D e M3 não estão concluídos.

## Validações e resultados

| Camada | Comando/resultado e evidência |
| --- | --- |
| HTTP/SQL real | `test_clinical_integration.sh test/clinical/usuario-estado.http.spec.ts test/clinical/usuario-perfil.http.spec.ts`:14/14 (6 estado +8 perfil), `/tmp/m3-estado-http.log` |
| Banco limpo + backend + workflow | `make project-check backend-check workflow-test COMPACT=1`, base `test_m3_estado_suite`:47 scripts SQL,213 unidades backend,8 integração/fundação,31 workflow; build aprovado. `/tmp/ambulatorio-check-yw4__0wq/output.log` |
| Upgrade75→76 | `test_estado_usuario_upgrade.sh`: recibo anterior idêntico, view/replay de perfil e novo comando de estado aprovados; banco exclusivo criado/removido, `/tmp/m3-estado-upgrade.log` |
| Frontend focado | 14/14 unidades perfil/estado, dois workers; `/tmp/m3-estado-unit-ui.log`. Build aprovado em `/tmp/ambulatorio-check-1zge4__5/output.log` |
| Navegador/API/PostgreSQL | `test_e2e.sh usuario-estado.spec.ts usuario-perfil.spec.ts`:7/7, sem retries/skips; `/tmp/m3-estado-e2e.log`, artefatos `/tmp/etapa6-frontend-KvM20p` |

Frontend integral com dois workers:325/325 testes em37 arquivos, uma execução,
log `/tmp/m3-estado-unidades-ui-integral.log`. Não afirmar uma integral E2E: os7
percursos são uma rodada focalizada e a prova histórica306/118 continua por
composição. A rodada anterior do perfil tem seus próprios limites registrados.

HTTP cobre três perfis, anônimo, entrada estrita, autoação, estado igual, versão
obsoleta, ausente, replay, UUID divergente entre comandos, recibo por outro admin,
concorrência perfil×estado e inativação×despromoção cruzadas. Cadastro por Edição
cria vínculo real; inativar o revoga com autoria; reativar autentica, mas a leitura
do paciente segue403. JWT emitido antes ou durante a inativação continua401.
SQL48 prova rollback conjunto de conta/recibo/vínculo, helper interno privado e
compatibilidade da view. SQL12 continua negando leitura de hashes à role de captura.

E2E cobre seleção/revisão/Escape/foco, dois comandos reais em sequência, releitura,
sessão afetada, vínculo não restaurado, resposta perdida recuperada por novo login
sem repetir POST, conflito entre perfil e estado e cancelamento sem escrita.
Helper de teste restaura vínculos explicitamente somente depois da prova negativa;
isso é higiene da fixture sintética, não comportamento da reativação de produto.

## Comparação visual técnica

Referência oficial de Usuários renderizada localmente, modais de inativação e
ativação, confrontada com os dois estados reais em1440/390/320. Mantidos
identificação, aviso de efeito, cancelamento/fechar, confirmação modal e foco.
Adaptações: formulário com justificativa/versão e confirmação compartilhada azul,
rótulo "Confirmar alteração", recibo e recuperação reais; aviso adicional de
vínculo/sessões não restaurados. A referência usa vermelho e confirmação nomeada
na inativação; diferença visual explícita, sem declarar fidelidade ou aceite8V.
Axe/reflow e teclado passaram nos três tamanhos, incluindo os dois diálogos.

- Inativação: [1440](../evidencias/estado_usuario_2026_11_03/estado-inativacao-1440.png), [390](../evidencias/estado_usuario_2026_11_03/estado-inativacao-390.png), [320](../evidencias/estado_usuario_2026_11_03/estado-inativacao-320.png).
- Reativação: [1440](../evidencias/estado_usuario_2026_11_03/estado-reativacao-1440.png), [390](../evidencias/estado_usuario_2026_11_03/estado-reativacao-390.png), [320](../evidencias/estado_usuario_2026_11_03/estado-reativacao-320.png).
- Referência de inativação: [1440](../evidencias/estado_usuario_2026_11_03/referencia-inativacao-1440.png), [390](../evidencias/estado_usuario_2026_11_03/referencia-inativacao-390.png), [320](../evidencias/estado_usuario_2026_11_03/referencia-inativacao-320.png).
- Referência de reativação: [1440](../evidencias/estado_usuario_2026_11_03/referencia-reativacao-1440.png), [390](../evidencias/estado_usuario_2026_11_03/referencia-reativacao-390.png), [320](../evidencias/estado_usuario_2026_11_03/referencia-reativacao-320.png).

Próxima unidade nominal:8D2B.3/U.3, criação com credencial temporária forte,
exibição única, expiração/troca obrigatória e recuperação/auditoria próprias.
Não entregar criação só de backend nem provisionar senha padrão insegura.
