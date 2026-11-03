# Cadastro e edição por Edição — M3

03/11/2026; base documental794d024, branch feat/m3-janela-1-eventos.
O commit desta entrega é local e identificado pelo histórico deste arquivo.
Contrato: [cadastro integrado](../arquitetura/CONTRATO_CADASTRO_EDICAO_M3.md),
7A-U1/7D-R6B.1/U.1, HUM-M3-01/02. Dados exclusivamente sintéticos.

## Resultado e limites

Edição cadastra após busca prévia, recebe vínculo específico/auditável na mesma
transação e consulta/edita o cadastro pelo PATCH existente, com versão, conflito,
contatos e endereço preservados. Confirma atendimento sem intervenção administrativa.
Consulta não escreve nem lê o novo cadastro sem vínculo; Edição continua recusado
em pacientes alheios e não concede vínculos. Administração revoga pelo endpoint
existente. Inativação revoga vínculos; reativação não os restaura.

Migration74 apenas nos bancos descartáveis. Nenhuma alteração de migrations
anteriores, rota ou payload existente, nem dump da evidência física persistente.
Cadastro administrativo e importação não recebem vínculo automático. P0 humano
continua aberto: os cenários sintéticos não identificam as entradas originais.
Gestão8D, fila administrativa de atribuição e aceite humano seguem pendentes.
A revisão humana comparativa está temporariamente adiada; não há homologação.

## Validação reproduzível e composição

Servidor exclusivo postgres:16-alpine em tmpfs, porta55459; banco de projeto
m3_test_concorrencia e bancos/roles aleatórios exclusivos de cada runner. Sem .env
ou acesso de escrita aos bancos persistentes. Variáveis SYNTHETIC_PG_* apontam
para esse servidor; senhas sintéticas não fazem parte deste relatório.

| Verificação | Resultado / log volátil |
| --- | --- |
| make backend-build backend-unit-test COMPACT=1 | 211 unidades aprovadas após a correção de concorrência; /tmp/ambulatorio-check-4y0nxijv/output.log |
| make backend-check COMPACT=1, DB_ENV=local e banco exclusivo | 211 unidades +8 integração/fundação aprovadas antes do ajuste final de concorrência; /tmp/ambulatorio-check-jkze5gm3/output.log |
| make frontend-build COMPACT=1 | TypeScript e bundle aprovados; /tmp/ambulatorio-check-913s2v8q/output.log |
| npm run test:unit -- --maxWorkers=2, via check_compact.py | 306 unidades aprovadas numa execução, /tmp/ambulatorio-check-njtlhh_z/output.log |
| make backend-clinical-test COMPACT=1 + correção focada | Ampla:146/157, com11 falhas em cascata por expectativa antiga de403 para Edição. Corrigida essa expectativa,23/23 da suíte central passaram; /tmp/ambulatorio-check-who0s12o/output.log e /tmp/ambulatorio-check-lzm61yns/output.log |
| test_clinical_integration.sh test/clinical/stage7.http.spec.ts | 7/7 após ajuste final, incluindo disputa real criação/inativação e concessão/inativação; /tmp/ambulatorio-check-qawm8jw0/output.log |
| make project-check COMPACT=1 no banco descartável | 45 scripts SQL, documentação, diff e status aprovados; migrations02–74 em banco limpo; /tmp/ambulatorio-check-etssjbye/output.log |

As provas HTTP clínicas somam158 casos distintos por composição, sem afirmar
nova execução integral no último SHA. A execução frontend com paralelismo padrão
foi interrompida por saturação/timeouts; substituída pela execução completa com
dois workers. O primeiro SQL amplo parou na proteção de nome de banco da SQL33;
a execução aprovada usou nome explicitamente descartável. As primeiras tentativas
do novo E2E exigiram corrigir a reautenticação após reload/goto, pois a sessão
é mantida apenas em memória; o teste não altera essa política.

Teste SQL46 comprova vínculo específico/evento, ausência de concessão sem contexto,
restrição de função administrativa/mutação direta, rollback após falha de contato
e ausência de restauração após inativação. O HTTP força bloqueios reais usando
duas conexões e pg_blocking_pids; rejeita concessão posterior e desfaz cadastro
quando a identidade perde autorização, com401 sanitizado para o erro conhecido.

## Comparação visual delimitada

Formulário existente preservado: cartões, rótulos, agrupamentos, controles e cores
compartilhados. Comparação técnica com [referência oficial do cadastro](../frontend/visuais/figma-cadastro.png)
e [formulário estabilizado](../evidencias/frontend_referencia_2026_11_03/depois-cadastro-390.png).
A diferença funcional nova é o aviso de vínculo específico para Edição. Busca
somente por nome e escopo autorizado continua sendo adaptação explícita do contrato;
não adicionamos filtro por nascimento ou telas sem API. Capturas1440/390/320,
Axe e reflow no novo E2E; sem extrapolar para aceite8V1/8V2.

## Navegador, evidências e identificação do código

Rodada dirigida: `test_e2e.sh cadastro-edicao.spec.ts stage7.spec.ts
stage7-access-recovery.spec.ts attendance-validation.spec.ts clinical.spec.ts
usuarios.spec.ts`:47/48 aprovados; novo teste falhou ao esperar sessão após reload.
Depois de corrigir somente o teste, a focada passou. Nova focada após a correção
final de segurança também passou (sem skips/retries):48 cenários distintos por
composição, não execução integral de todos os E2E do produto no último SHA.
Logs: /tmp/ambulatorio-check-78wj2lvc/output.log e
/tmp/ambulatorio-check-bvunj55i/output.log. Nenhuma suíte aprovada foi repetida
sem alteração ou falha que justificasse a execução.

Capturas sintéticas da focada final:
[1440](../evidencias/cadastro_edicao_m3_2026_11_03/cadastro-edicao-1440.png),
[390](../evidencias/cadastro_edicao_m3_2026_11_03/cadastro-edicao-390.png),
[320](../evidencias/cadastro_edicao_m3_2026_11_03/cadastro-edicao-320.png).
Aviso legível, reflow sem overflow de página e controles preservados; comparação
técnica delimitada, sem aceite humano. As306 unidades/118 E2E históricos de
c2129b3 continuam provas por composição; não são convertidos em execução nova.

SHA256 do código final exercitado:

```text
b79f49a4098d0fe17694da1ca1a232e8b9a27a2c3523562a3702d73cc7fc9b0c sql/74_vinculo_cadastro_edicao.sql
9891fe081cb86b2c93624f33ddce70301a47dff74e782fc551b09f0e61ddaa1e backend/src/common/security/clinical-access.service.ts
7b9c2eb77d5739989d351d6c8eecf6fdf634ab35627c8aec95aa25df3511be76 backend/src/pacientes/pacientes.service.ts
87eb192e122024380066dd606a60953e2e237d21ca3f9347b2ac3ae692bb8401 frontend/src/features/clinical/PatientFormPage.tsx
```

Revisão independente de código: corrida de concessão/inativação e tradução do
erro conhecido corrigidas e verificadas; sem novos achados nesses pontos.
