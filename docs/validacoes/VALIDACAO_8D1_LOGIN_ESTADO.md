# Leitura administrativa de login/estado — 8D1B.1/U.1

03/11/2026, base64ed8b6, branch feat/m3-janela-1-eventos. Commit local identificado
pelo histórico deste arquivo. [Contrato vigente](../arquitetura/CONTRATO_LEITURA_USUARIOS_8D1B.md#ampliação-integrada-de0311--login-e-estado),
decisão8. Recorte integrado validado tecnicamente; agregado8D e aceite pendentes.

Lista/detalhe agora exibem login e situação real da conta. GETs administrativos
conservam campos anteriores, ID textual, guard, ordenação, paginação e status.
Sem rota nova, migration ou escrita. Consumidores frontend/testes coordenados;
projeção explícita de cinco propriedades, sem hash/credencial. Conta alvo inativa
consultável por administrador ativo; Consulta/Edição recusados antes de revelar
existência, ID ou dados. /auth/me e comandos8D2 preservam seus contratos próprios.

| Verificação | Resultado / log volátil |
| --- | --- |
| make backend-build frontend-build COMPACT=1 | TypeScript e bundles aprovados; /tmp/ambulatorio-check-wsbz33hy/output.log |
| test_clinical_integration.sh test/clinical/usuarios.http.spec.ts, via check_compact.py | 19/19 HTTP com PostgreSQL descartável; projeção SQL exata ativa/inativa, homônimos/ID grande, paginação,403/401/404/query e perda de perfil; /tmp/ambulatorio-check-2glzjnya/output.log |
| npm run test:unit -- --maxWorkers=2 src/api/client.test.ts src/shared/ui.test.tsx src/app/AppNavigation.test.tsx | 27/27 unidades frontend focadas; /tmp/ambulatorio-check-lnpczx06/output.log |
| test_e2e.sh usuarios.spec.ts, via check_compact.py | 10/10 E2E Chromium/API/PostgreSQL, sem retries/skips; /tmp/ambulatorio-check-yben1phn/output.log |

E2E comprova dados reais, conta inativa, recarga/reautenticação, URL e retorno,
teclado/rolagem, carga, vazio, erro/repetição,404, troca de conta e inativação do
requisitante. Runners aplicaram02–74 em bancos exclusivos no tmpfs55459 e removeram
bancos/roles próprios. Testes SQL e suítes gerais já aprovados não foram repetidos:
este recorte altera somente projeção administrativa e sua interface.

Comparação visual com [referência oficial](../frontend/visuais/figma-usuarios.png):
tabela e campos de identificação/login/perfil/situação consistentes, componentes
estabilizados preservados. ID e paginação real são adaptações do contrato; não
há contagem total, comandos simulados ou indicação de histórico inexistente.
Tabela com região rolável por teclado em telas menores; detalhe em coluna única.
Axe/reflow1440/390/320 aprovados. Capturas sintéticas:

- Lista: [1440](../evidencias/usuarios_login_estado_2026_11_03/usuarios-1440.png), [390](../evidencias/usuarios_login_estado_2026_11_03/usuarios-390.png), [320](../evidencias/usuarios_login_estado_2026_11_03/usuarios-320.png).
- Detalhe: [1440](../evidencias/usuarios_login_estado_2026_11_03/usuario-detalhe-1440.png), [390](../evidencias/usuarios_login_estado_2026_11_03/usuario-detalhe-390.png), [320](../evidencias/usuarios_login_estado_2026_11_03/usuario-detalhe-320.png).

Comparação técnica delimitada; revisão humana comparativa temporariamente adiada,
aceites M3/8V pendentes. Próximo recorte elegível: identificação ampliada de Minha
conta (8D1B.2/U.2), conforme decisão8, sem antecipar troca de senha/histórico8D2.
As306 unidades/118 E2E históricos seguem por composição; esta rodada de10 E2E
não é execução integral do produto no último SHA.
