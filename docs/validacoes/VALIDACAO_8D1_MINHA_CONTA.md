# Identificação própria de Minha conta — 8D1B.2/U.2

03/11/2026; base4af8d5a, branch feat/m3-janela-1-eventos. Commit local identificado
pelo histórico deste arquivo. [Contrato](../arquitetura/CONTRATO_LEITURA_USUARIOS_8D1B.md#identificação-própria-integrada--8d1b2u2),
decisões8/10. Recorte de identificação/suporte validado tecnicamente, sem aceite humano.

GET /auth/me e alias legado acrescentam login/ativo aos campos ID/nome/perfil.
Guard resolve somente o sub do token e consulta identidade ativa; projeção SQL
não busca hash. Frontend reaproveita a identidade já lida em memória, sem novo
endpoint, requisição duplicada, storage ou UI demonstrativa. Exibe login/situação
somente quando publicados e usa suporte aprovado. Projeção antiga continua aceita
pelo cliente; dados adicionais inconsistentes recusam sessão, sem status inferido.

| Verificação | Resultado / log volátil |
| --- | --- |
| make backend-build backend-unit-test frontend-build COMPACT=1 | Builds B/U e211 unidades backend aprovados; /tmp/ambulatorio-check-58mdgrmk/output.log |
| make backend-foundation-e2e COMPACT=1 com DB_ENV=local/banco exclusivo | 8/8 integração/fundação, incluindo projeção /auth/me e identidade inativa; /tmp/ambulatorio-check-mxy2iatl/output.log |
| test_clinical_integration.sh test/clinical/usuarios.http.spec.ts test/clinical/versioning.http.spec.ts | 22/22 HTTP, três perfis/projeção exata, inativo/anônimo, ID grande e alias legado; /tmp/ambulatorio-check-z0h03rdq/output.log |
| npm run test:unit -- --maxWorkers=2 em sessão/shell/App/navegação | 32/32 focados, incluindo cinco novos casos de allowlist/projeção inconsistente; /tmp/ambulatorio-check-6_gf4pit/output.log |
| npm run test:unit -- --maxWorkers=2 | 311/311 frontend numa execução completa, ampliada porque o componente compartilhado de sessão mudou; /tmp/ambulatorio-check-ctjau7d3/output.log |
| test_e2e.sh minha-conta.spec.ts | 4/4 Chromium/API/PostgreSQL, três perfis, saída, erro/repetição de identidade e inativação real; /tmp/ambulatorio-check-0rbfo7ho/output.log |
| test_e2e.sh cadastro-edicao.spec.ts stage7-acceptance.spec.ts | 2/2 regressões clínicas após a mudança da identidade compartilhada; /tmp/ambulatorio-check-o2nbtqtc/output.log |

Sem falhas, skips ou retries nessas execuções. Banco/roles exclusivos dos runners
no servidor tmpfs55459 removidos. Fundação usou m3_test_concorrencia, criado somente
nesta execução. Nenhuma migration nova, banco persistente ou dump alterado;
a suíte SQL45 já aprovada em64ed8b6 permanece como prova daquele estado estrutural.

Comparação delimitada com [captura anterior da conta](../frontend/visuais/u41-conta-desktop.png)
e [componente oficial](../../referencias/frontend/figma-make-prototipo/src/components/MyAccount.tsx):
identificação/login/perfil/situação/suporte/saída correspondentes. Mantido o cartão
estabilizado, sem reabrir layout, avatar ou comandos do protótipo.1440/390/320,
Axe e reflow aprovados; campos em coluna única no mobile, sem overflow de página.
Capturas sintéticas [1440](../evidencias/minha_conta_2026_11_03/minha-conta-1440.png),
[390](../evidencias/minha_conta_2026_11_03/minha-conta-390.png),
[320](../evidencias/minha_conta_2026_11_03/minha-conta-320.png).

Revisão humana comparativa temporariamente adiada; aceites M3/8V pendentes.
As306 unidades/118 E2E históricos continuam por composição. A nova execução
integral311 é apenas unitária frontend; os E2E deste incremento são4+2 focados,
sem afirmar execução integral do produto no SHA final. Família8D continua parcial:
histórico, criação, alteração de perfil/estado, credenciais e senha pendentes.
