# Relatório do trabalho desde o último commit

Data: 2026-10-05. Comparação: árvore de trabalho local contra `HEAD`.

Nota de continuidade: esta fotografia compara o trabalho então local com
`adf2fd5`. Os 13 commits posteriores até `29b3186` incorporaram esse conteúdo;
as contagens abaixo não descrevem a árvore da nova entrega documental. A
[reavaliação atual](frontend/VISAO_E_ESPECIFICACAO.md#reavaliação-das-sete-lacunas-e-cobertura-de-validação)
e a [matriz individual](frontend/MATRIZ_FIGMA_FRONTEND.md) confirmam os limites
e vinculam cada lacuna aos [pacotes do roadmap](frontend/ENTREGAS_DO_PRODUTO.md#pacotes-verificáveis-do-produto-frontend).

Foi acrescentada uma implementação substancial dos fluxos clínicos 7A–7D,
com formulários, integração HTTP, proteção de rascunhos, catálogos e testes.
**A Etapa 7 completa não está comprovada:** a reauditoria identificou sete
lacunas funcionais ainda sem correção. As suítes aprovadas comprovam os cenários
que executaram; não comprovam todos os requisitos nem o aceite integral.

## Base e método

- Commit base: `adf2fd58e390886e64c60f6e9333986bae2283da` (`adf2fd5`).
- Data do commit: 2026-10-04, 18:46:33, America/Sao_Paulo.
- Mensagem: `docs: registrar uso e conclusão da etapa 6 do frontend`.
- Fontes: `git diff HEAD`, `git status --short`, arquivos novos não rastreados,
  código executável, roadmap/matriz anteriores às mudanças e logs locais.
- Fotografia anterior à criação deste relatório: **42 arquivos modificados e
  34 novos, total de 76**. Não havia alterações staged, exclusões ou renomeações.

Esse conjunto inclui alterações que já estavam presentes no início do trabalho
de implementação e foram preservadas. Git permite comparar com o commit, mas
não atribuir a autoria ou o momento de cada edição não commitada. O inventário
abaixo descreve o delta local efetivo, sem atribuir todo ele a uma única execução.
Este relatório e seus registros no índice/histórico são acréscimos posteriores
à fotografia; não estão incluídos nas contagens abaixo.

| Área | Arquivos modificados | Arquivos novos | Total |
| --- | ---: | ---: | ---: |
| Backend, incluindo testes | 15 | 11 | 26 |
| Frontend, incluindo testes de componentes | 12 | 18 | 30 |
| Runners/testes em `tests/` | 4 | 2 | 6 |
| Documentação em `docs/` | 10 | 3 | 13 |
| README da raiz | 1 | 0 | 1 |
| Total | 42 | 34 | 76 |

Nos arquivos já rastreados, o diff contém 491 linhas adicionadas e 116 removidas.
Os 34 arquivos novos contêm 4.406 linhas. Esses números medem conteúdo local,
não requisitos atendidos ou qualidade da implementação.

## O que já existia no commit base

A fundação 6A–6B já incluía frontend React/TypeScript, sessão JWT em memória,
login, navegação, busca e ficha/histórico em leitura. Vite, React Router,
TanStack Query, Vitest, Playwright, Makefile e CI já estavam configurados.

As APIs clínicas da Etapa 5 já cadastravam/editavam pacientes e atendimentos,
criavam o atendimento com filhos na mesma transação e ofereciam BZN, retornos,
projetos, notificação, encaminhamentos, contrarreferências e pendências.
**Essas operações de negócio não foram criadas do zero neste delta.** O trabalho
novo concentra a interface de escrita e adaptações pontuais da API existente.

## Implementação efetivamente acrescentada

### Frontend e fluxos clínicos

| Área | Comportamento presente no código atual | Limite relevante |
| --- | --- | --- |
| Busca/cadastro | Busca prévia por nome, links para possíveis cadastros e novo paciente com nome, nascimento, sexo, raça, comunidade, endereço/cidade e telefones. Cadastro condicionado à capacidade devolvida pela API. | A busca é autorizada e paginada; não verifica unicidade global nem funde homônimos. |
| Edição cadastral | PATCH com versão original, somente alterações, snapshot de endereço e adição de telefones; idade/referência obtidas da API. | Não edita/remove telefones antigos por uma operação sem contrato. |
| Atendimento | Formulário de criação com núcleo, avaliação clínica, diagnóstico/descoberta de Chagas, exames, familiares e pendências. Uma requisição usa a transação existente. PATCH do núcleo com versão original. | Edição do núcleo não edita avaliação, diagnóstico, exames ou familiares existentes. |
| Exames/familiares | Tipos ativos consultados na API; trazido/solicitado, identificação, resultado e observações. Familiares identificados com resultado e indicador independente de história familiar. | Há defeito de paginação de familiares, descrito adiante. |
| BZN | Registro do tratamento único com indicadores, textos e reações na criação; consulta ao tratamento existente. | Não há edição de BZN existente nem reação isolada. Há lacuna de acesso ao rascunho após conflito. |
| Retornos | Retornos BZN 30 dias/final e anuais repetíveis, com atendimento e data efetiva; fato anual separado de visita. | Não calcula 30/60 dias nem fabrica comparecimento a partir de ano. Alguns atalhos perdem o atendimento selecionado. |
| Projetos/notificação | Seleção por catálogo, pré-carga e PUT dos campos alterados; triestados e textos independentes. | São operações posteriores com confirmação própria. |
| Encaminhamentos | Criação com atendimento, catálogo/tipo/projeto e campos de destino, datas, estados e textos. Contrarreferências simples repetíveis. | Não há edição de encaminhamento existente ou upload avançado. |
| Pendências | Criação junto ao atendimento ou posteriormente; alteração de status/data, resolução com data explícita e leitura da data de resolução. | Backend aceita estado `null`, mas os formulários não permitem representá-lo corretamente. |

Arquivos centrais: [PatientFormPage.tsx](../frontend/src/features/clinical/PatientFormPage.tsx),
[AttendanceFormPage.tsx](../frontend/src/features/clinical/AttendanceFormPage.tsx),
[FollowupPage.tsx](../frontend/src/features/clinical/FollowupPage.tsx) e
[ClinicalActions.tsx](../frontend/src/features/clinical/ClinicalActions.tsx).

### Rascunhos, sessão e salvamento

Foi criado [writing.tsx](../frontend/src/shared/writing.tsx) com store de
rascunhos em memória separado do cache de consultas, estado de envio e
confirmação por operação. Há bloqueio de navegação/recarregamento, inclusive
para rascunhos inativos, e diálogo com Tab/Shift+Tab/Escape e restauração de foco.

Saída, 401, expiração e troca de identidade/perfil limpam os rascunhos.
Reconsulta temporariamente indisponível oculta formulários sem limpar o store.
O cliente passou a aceitar PATCH/PUT; as rotas de escrita foram adicionadas e
o router foi adaptado para suportar bloqueio de navegação.

Conflitos de paciente/núcleo do atendimento oferecem comparação por GET entre
baseline, rascunho e registro atual, seguida de descarte explícito antes de nova
edição. A confirmação verifica ID textual canônico e, no PATCH versionado,
o ID do registro original. Escritas não têm retry automático.

Após falha de rede, o código conserva o rascunho, oferece consulta e impede
reenvio da intenção. Isso previne uma classe de duplicação, mas **não entrega
recuperação completa**, conforme as lacunas abaixo. Também não foi implementado
um protocolo de idempotência de POST ou comprovante consultável da operação.

### Extensões e correções no backend

| Extensão | Resultado efetivo |
| --- | --- |
| `GET /v1/catalogos/exames` | Lista tipos ativos com ID textual, código/nome e paginação. |
| `GET /v1/catalogos/projetos` | Lista projetos ativos no mesmo formato. |
| `GET /v1/catalogos/tipos-encaminhamento` | Lista tipos ativos no mesmo formato. |
| `GET /v1/pacientes/capacidades` | Retorna somente `podeCadastrar`, conforme perfil/política e identidade ativa; compartilha a regra do POST. |
| Recursos canônicos ausentes | Tratamento BZN e notificação passam a devolver JSON `null` explícito. |
| Pendências | `dataResolucao` entra nos DTOs de criação e nas leituras. Resolução exige data; outro status recusa data preenchida. Omissão e `null` passam a ser distintos na criação. |
| Retornos efetivos | BZN/anual recusam data futura contra `CURRENT_DATE` dentro da transação. |
| Formato do payload | Objetos únicos recusam arrays; elementos de coleções precisam ser objetos válidos. |

O módulo novo está em [backend/src/catalogos/](../backend/src/catalogos/).
Não foram alterados schema, migrations aplicadas, dump ou dependências.

### Testes, fixtures e documentação

Foram acrescentados sete arquivos de testes backend, testes de contratos e
formulários frontend, testes de rascunhos/reconsultas e 22 cenários de escrita
em `stage7.spec.ts`, mantendo os oito E2E de leitura anteriores. O runner
clínico passou a incluir catálogo e Etapa 7. O helper de login respeita o limite
real de tentativas; a fixture de pendência resolvida passou a informar data.

Foram criados o [recorte clínico](arquitetura/RECORTE_CLINICO_ETAPA_7.md), o
[contrato de catálogos](arquitetura/CONTRATOS_CATALOGOS_ETAPA_7.md) e o
[relatório de validação](validacoes/VALIDACAO_ETAPA_7.md). README, arquitetura,
ADR-024, frontend, workflow, estado, roadmap, índice e registro foram atualizados.

Os textos anteriores afirmaram implementação/validação técnica de 7A–7D. Essa
afirmação deve ser lida com a ressalva desta reauditoria: **o aceite integral
foi antecipado e não é sustentado pelas lacunas confirmadas**. Os resultados de
execução continuam válidos para os testes que foram efetivamente executados.

## Validações efetivamente executadas

Ambiente exclusivamente sintético: Node 24, PostgreSQL 16.15 e Chromium.
As contagens incluem regressões já existentes; não significam que todos os
testes foram criados desde o commit base.

| Verificação | Resultado registrado |
| --- | --- |
| Backend build | Aprovado. |
| Backend unitários/contrato | 92 aprovados em 17 suítes. Os 51 clínicos omitidos dessa entrada foram executados separadamente. |
| Backend fundação HTTP/PostgreSQL | 8 aprovados. |
| Backend clínicos HTTP/PostgreSQL | 51 aprovados em 9 suítes. |
| Frontend build TypeScript/Vite | Aprovado após correção de foco do diálogo. |
| Frontend unitários/componentes | 106 aprovados em 12 arquivos. |
| E2E Chromium/API/PostgreSQL | 30 aprovados: 8 de leitura e 22 de escrita; zero falha, skip ou flaky na rodada final. |
| SQL/projeto | 34 testes SQL, documentação e diff/status aprovados em banco novo. |
| Workflow | 9 aprovados. |
| Revisão de interface | Axe nos tipos de formulário, teclado/foco, telas estreitas, zoom CSS 200% e inspeção de screenshots. |

Logs principais: `/tmp/ambulatorio-check-6juvxjvd/output.log` (backend),
`/tmp/ambulatorio-check-40f2nhl7/output.log` (build frontend),
`/tmp/ambulatorio-check-9owkssa_/output.log` (106 unitários e 30 E2E),
`/tmp/ambulatorio-check-uf2z0jha/output.log` (SQL/workflow) e
`/tmp/ambulatorio-check-al16_gsu/output.log` (documentação). São artefatos locais
temporários, sem garantia de retenção; não foram versionados.

A chamada com E2E parou posteriormente no SQL20 devido a aplicações de revisão
sintéticas preexistentes no banco preparado. A tentativa seguinte passou até
a guarda do SQL33, que exigia nome explícito de teste. A chamada final passou
em outro banco limpo `etapa7_project_test_*`, removido depois. Não foram
alterados testes SQL para contornar essas verificações.

Também foram corrigidos durante a validação: fixture resolvida sem data,
controle do limite de login entre arquivos, contenção de foco do diálogo e
asserções de teste incompatíveis com o estado/política de reconsulta. A
[validação da Etapa 7](validacoes/VALIDACAO_ETAPA_7.md) detalha as rodadas.

## Lacunas confirmadas e ainda não corrigidas

| ID | Lacuna | Evidência e impacto | Origem |
| --- | --- | --- | --- |
| R7-01 | Familiares desaparecem após a primeira página. | [pacientes.service.ts](../backend/src/pacientes/pacientes.service.ts), linhas 293–317: o mesmo offset pagina snapshots e seus resultados; resultados de snapshots fora da página são descartados. Com 1 rastreio e 30 familiares, a página inicial mostra 20 e a próxima fica vazia. | Defeito já presente em `HEAD`, mantido na entrega que permite criar até 50 familiares. |
| R7-02 | Escrita negada com 403 não pode ser retomada após restaurar acesso. | [writing.tsx](../frontend/src/shared/writing.tsx), linhas 106/164/178: `denied` fica bloqueado e não tem ação de retomada. GET autorizado posterior não libera uma nova confirmação consciente do rascunho. | Fluxo novo de escrita. |
| R7-03 | Verificação após falha de rede não conclui a recuperação. | [writing.tsx](../frontend/src/shared/writing.tsx), linhas 106/161/175, e [FollowupPage.tsx](../frontend/src/features/clinical/FollowupPage.tsx), linhas 141–158: consultar e voltar conserva bloqueio indefinido. [stage7.spec.ts](../tests/frontend/stage7.spec.ts), a partir da linha 613, testa bloqueio/consulta, mas não retomada concluída. | Fluxo novo de escrita. |
| R7-04 | Estado desconhecido `null` da pendência não é representável nos formulários. | [AttendanceFormPage.tsx](../frontend/src/features/clinical/AttendanceFormPage.tsx), linhas 128/137, [FollowupPage.tsx](../frontend/src/features/clinical/FollowupPage.tsx), linha 83, e [followup-contracts.ts](../frontend/src/features/clinical/followup-contracts.ts), linha 190: status obrigatório/default e rejeição de vazio impedem o `null` aceito pela API. `nao_informado` é outro valor, não preservação de `null`. | Incompatibilidade entre formulários novos e o contrato. |
| R7-05 | Atalhos perdem o contexto do atendimento. | [AttendancePage.tsx](../frontend/src/features/pacientes/AttendancePage.tsx), linha 55, e [FollowupPage.tsx](../frontend/src/features/clinical/FollowupPage.tsx), linhas 226/229: links omitem `atendimentoId`, abrindo o formulário com atendimento vazio. | Integração nova entre módulos. |
| R7-06 | Rascunho BZN fica inacessível após tratamento concorrente. | [FollowupPage.tsx](../frontend/src/features/clinical/FollowupPage.tsx), a partir da linha 222: após 409/consulta, o tratamento existente substitui o formulário. Os valores não podem ser vistos/copiados/descartados pelo fluxo, embora continuem protegendo recarga. | Recuperação incompleta do fluxo novo. |
| R7-07 | Comprovante e valores de escrita confirmada somem após falha temporária da identidade. | [App.tsx](../frontend/src/app/App.tsx), `ProtectedLayout`, desmonta o conteúdo; [FollowupPage.tsx](../frontend/src/features/clinical/FollowupPage.tsx), linhas 145–157, guarda confirmação/valores em `useState` local e limpa draft/operação. Recuperar a mesma identidade abre intenção vazia sem a confirmação anterior. Não há POST automático, mas a indicação do que já foi salvo se perde. | Persistência incompleta do estado de confirmação novo. |

Métodos de confirmação desta reauditoria: leitura do código/diff; reprodução
do serviço de familiares com consultas simuladas em memória; casos de
rede/contexto/BZN no Chromium com a API integralmente interceptada por dados
sintéticos; caso de comprovante em JSDOM com App/SessionManager reais e fetch
em memória. **Essas reproduções não são novos E2E contra PostgreSQL real** e
não modificaram dados da prévia. Não foram transformadas em regressões
versionadas nem corrigidas antes do pedido deste relatório.

Permanecem pendentes a revisão de usabilidade com a equipe e a execução da CI
remota. A ausência dessa revisão já constava do aceite anterior.

Os E2E de BZN e comunicação preparam paciente/atendimento por helpers/API.
Há cobertura das partes, mas falta uma sequência positiva completa pela
interface, do cadastro ao acompanhamento. Essa lacuna de validação é adicional
às sete falhas funcionais; a aprovação das partes não comprova esse percurso.

## Funcionalidades que não foram entregues

Sorologias individuais, condições/comorbidades, dispositivos/eventos/óbito,
medicamentos e resultados estruturados detalhados continuam sem as operações
HTTP necessárias na interface. Também não foram entregues edição independente
dos filhos do atendimento, BZN/reação isolada/exame/encaminhamento existente,
upload avançado, fila global, gestão de usuários, importação/revisão pela
interface ou dashboard.

Essas exclusões estão previstas/condicionadas no roadmap e na matriz original;
não são todas requisitos obrigatórios desta entrega. Permanecem distintas das
sete falhas concretas acima. Não se deve apresentar a interface como cobertura
integral do protótipo ou de todas as entidades físicas.

## Banco, ambiente e estado de entrega

Não há diff em `sql/`, dump estrutural, importador/manifestos, protótipo,
Makefile, CI ou manifests/lockfiles de dependências. Não houve nova migration,
aplicação de migrations no banco persistente, commit ou push nesta entrega.
Os testes usaram bancos/logins descartáveis; os runners os removeram ao terminar.

Para acesso manual, foi iniciado o runner existente em `--serve`: frontend
`http://127.0.0.1:4176`, API sintética `http://127.0.0.1:6061`, com banco próprio
e três perfis de teste. Prévia e login foram verificados. Na geração deste
relatório, os dois serviços permaneciam ativos; esse ambiente ainda não foi
encerrado e não é implantação de produção. Credenciais não são reproduzidas
neste documento.

Depois da contestação do usuário, houve somente reauditoria, sem correção de
runtime. O pedido seguinte direcionou o trabalho para este relatório. As
alterações continuam locais, sem staging/commit/push. Nenhuma das sete lacunas
deve ser marcada como resolvida.

## Inventário da fotografia anterior ao relatório

`Modificado` significa arquivo já presente no commit; `Novo` significa não
rastreado. Arquivos novos também fazem parte da entrega pendente, embora não
apareçam no `git diff --stat` convencional.

### Backend e seus testes (26 arquivos)

| Arquivo | Situação |
| --- | --- |
| [backend/src/app.module.ts](../backend/src/app.module.ts) | Modificado |
| [backend/src/catalogos/catalogos.controller.ts](../backend/src/catalogos/catalogos.controller.ts) | Novo |
| [backend/src/catalogos/catalogos.module.ts](../backend/src/catalogos/catalogos.module.ts) | Novo |
| [backend/src/catalogos/catalogos.service.ts](../backend/src/catalogos/catalogos.service.ts) | Novo |
| [backend/src/catalogos/dto/catalogo.response.ts](../backend/src/catalogos/dto/catalogo.response.ts) | Novo |
| [backend/src/clinico/clinical-validation.ts](../backend/src/clinico/clinical-validation.ts) | Modificado |
| [backend/src/clinico/dto/clinico.dto.ts](../backend/src/clinico/dto/clinico.dto.ts) | Modificado |
| [backend/src/clinico/dto/clinico.response.ts](../backend/src/clinico/dto/clinico.response.ts) | Modificado |
| [backend/src/clinico/dto/pendencia.response.ts](../backend/src/clinico/dto/pendencia.response.ts) | Modificado |
| [backend/src/clinico/dto/recursos.dto.ts](../backend/src/clinico/dto/recursos.dto.ts) | Modificado |
| [backend/src/common/security/clinical-access.service.ts](../backend/src/common/security/clinical-access.service.ts) | Modificado |
| [backend/src/pacientes/pacientes.controller.ts](../backend/src/pacientes/pacientes.controller.ts) | Modificado |
| [backend/src/pacientes/pacientes.service.ts](../backend/src/pacientes/pacientes.service.ts) | Modificado |
| [backend/src/pacientes/recursos-clinicos.controller.ts](../backend/src/pacientes/recursos-clinicos.controller.ts) | Modificado |
| [backend/src/pacientes/recursos-clinicos.service.ts](../backend/src/pacientes/recursos-clinicos.service.ts) | Modificado |
| [backend/test/clinical/catalogos.http.spec.ts](../backend/test/clinical/catalogos.http.spec.ts) | Novo |
| [backend/test/clinical/clinical.http.spec.ts](../backend/test/clinical/clinical.http.spec.ts) | Modificado |
| [backend/test/clinical/recursos.http.spec.ts](../backend/test/clinical/recursos.http.spec.ts) | Modificado |
| [backend/test/clinical/response-dto.http.spec.ts](../backend/test/clinical/response-dto.http.spec.ts) | Modificado |
| [backend/test/clinical/stage7.http.spec.ts](../backend/test/clinical/stage7.http.spec.ts) | Novo |
| [backend/test/unit/catalogos.http.spec.ts](../backend/test/unit/catalogos.http.spec.ts) | Novo |
| [backend/test/unit/catalogos.service.spec.ts](../backend/test/unit/catalogos.service.spec.ts) | Novo |
| [backend/test/unit/clinical-input.http.spec.ts](../backend/test/unit/clinical-input.http.spec.ts) | Novo |
| [backend/test/unit/nullable-resources.http.spec.ts](../backend/test/unit/nullable-resources.http.spec.ts) | Novo |
| [backend/test/unit/pacientes.service.spec.ts](../backend/test/unit/pacientes.service.spec.ts) | Modificado |
| [backend/test/unit/patient-capabilities.http.spec.ts](../backend/test/unit/patient-capabilities.http.spec.ts) | Novo |

### Frontend e seus testes (30 arquivos)

| Arquivo | Situação |
| --- | --- |
| [frontend/src/api/client.ts](../frontend/src/api/client.ts) | Modificado |
| [frontend/src/api/contracts.ts](../frontend/src/api/contracts.ts) | Modificado |
| [frontend/src/api/useApiQuery.ts](../frontend/src/api/useApiQuery.ts) | Modificado |
| [frontend/src/app/App.tsx](../frontend/src/app/App.tsx) | Modificado |
| [frontend/src/app/SessionManager.ts](../frontend/src/app/SessionManager.ts) | Modificado |
| [frontend/src/features/clinical/AttendanceFormPage.tsx](../frontend/src/features/clinical/AttendanceFormPage.tsx) | Novo |
| [frontend/src/features/clinical/ClinicalActions.tsx](../frontend/src/features/clinical/ClinicalActions.tsx) | Novo |
| [frontend/src/features/clinical/core-contracts.test.ts](../frontend/src/features/clinical/core-contracts.test.ts) | Novo |
| [frontend/src/features/clinical/core-contracts.ts](../frontend/src/features/clinical/core-contracts.ts) | Novo |
| [frontend/src/features/clinical/CoreFields.tsx](../frontend/src/features/clinical/CoreFields.tsx) | Novo |
| [frontend/src/features/clinical/followup-contracts.test.tsx](../frontend/src/features/clinical/followup-contracts.test.tsx) | Novo |
| [frontend/src/features/clinical/followup-contracts.ts](../frontend/src/features/clinical/followup-contracts.ts) | Novo |
| [frontend/src/features/clinical/followup-refresh.test.tsx](../frontend/src/features/clinical/followup-refresh.test.tsx) | Novo |
| [frontend/src/features/clinical/followup.test.tsx](../frontend/src/features/clinical/followup.test.tsx) | Novo |
| [frontend/src/features/clinical/FollowupChoices.tsx](../frontend/src/features/clinical/FollowupChoices.tsx) | Novo |
| [frontend/src/features/clinical/FollowupFields.tsx](../frontend/src/features/clinical/FollowupFields.tsx) | Novo |
| [frontend/src/features/clinical/FollowupPage.tsx](../frontend/src/features/clinical/FollowupPage.tsx) | Novo |
| [frontend/src/features/clinical/PatientCreateGate.tsx](../frontend/src/features/clinical/PatientCreateGate.tsx) | Novo |
| [frontend/src/features/clinical/PatientFormPage.tsx](../frontend/src/features/clinical/PatientFormPage.tsx) | Novo |
| [frontend/src/features/clinical/VersionComparison.tsx](../frontend/src/features/clinical/VersionComparison.tsx) | Novo |
| [frontend/src/features/pacientes/AttendancePage.tsx](../frontend/src/features/pacientes/AttendancePage.tsx) | Modificado |
| [frontend/src/features/pacientes/PatientPage.tsx](../frontend/src/features/pacientes/PatientPage.tsx) | Modificado |
| [frontend/src/features/pacientes/PatientResources.tsx](../frontend/src/features/pacientes/PatientResources.tsx) | Modificado |
| [frontend/src/features/pacientes/PatientsPage.tsx](../frontend/src/features/pacientes/PatientsPage.tsx) | Modificado |
| [frontend/src/features/pacientes/reading.test.tsx](../frontend/src/features/pacientes/reading.test.tsx) | Modificado |
| [frontend/src/main.tsx](../frontend/src/main.tsx) | Modificado |
| [frontend/src/shared/writing-refresh.test.tsx](../frontend/src/shared/writing-refresh.test.tsx) | Novo |
| [frontend/src/shared/writing.test.tsx](../frontend/src/shared/writing.test.tsx) | Novo |
| [frontend/src/shared/writing.tsx](../frontend/src/shared/writing.tsx) | Novo |
| [frontend/src/styles.css](../frontend/src/styles.css) | Modificado |

### Runners e testes de integração (6 arquivos)

| Arquivo | Situação |
| --- | --- |
| [tests/backend/test_clinical_integration.sh](../tests/backend/test_clinical_integration.sh) | Modificado |
| [tests/frontend/fixtures.ts](../tests/frontend/fixtures.ts) | Modificado |
| [tests/frontend/README.md](../tests/frontend/README.md) | Modificado |
| [tests/frontend/seed.mjs](../tests/frontend/seed.mjs) | Modificado |
| [tests/frontend/stage7-helpers.ts](../tests/frontend/stage7-helpers.ts) | Novo |
| [tests/frontend/stage7.spec.ts](../tests/frontend/stage7.spec.ts) | Novo |

### Documentação (13 arquivos)

| Arquivo | Situação |
| --- | --- |
| [docs/ARQUITETURA_BACKEND.md](ARQUITETURA_BACKEND.md) | Modificado |
| [docs/arquitetura/ANALISE_INTEGRACAO_FIGMA_MAKE.md](arquitetura/ANALISE_INTEGRACAO_FIGMA_MAKE.md) | Modificado |
| [docs/arquitetura/CONTRATOS_CATALOGOS_ETAPA_7.md](arquitetura/CONTRATOS_CATALOGOS_ETAPA_7.md) | Novo |
| [docs/arquitetura/CONTRATOS_CLINICOS_ETAPA_5.md](arquitetura/CONTRATOS_CLINICOS_ETAPA_5.md) | Modificado |
| [docs/arquitetura/RECORTE_CLINICO_ETAPA_7.md](arquitetura/RECORTE_CLINICO_ETAPA_7.md) | Novo |
| [docs/DECISOES_ARQUITETURAIS.md](DECISOES_ARQUITETURAIS.md) | Modificado |
| [docs/ESTADO_ATUAL_DO_PROJETO.md](ESTADO_ATUAL_DO_PROJETO.md) | Modificado |
| [docs/FRONTEND.md](FRONTEND.md) | Modificado |
| [docs/PROXIMOS_PASSOS.md](PROXIMOS_PASSOS.md) | Modificado |
| [docs/README.md](README.md) | Modificado |
| [docs/REGISTRO_DE_ALTERACOES.md](REGISTRO_DE_ALTERACOES.md) | Modificado |
| [docs/validacoes/VALIDACAO_ETAPA_7.md](validacoes/VALIDACAO_ETAPA_7.md) | Novo |
| [docs/WORKFLOW_DE_DESENVOLVIMENTO.md](WORKFLOW_DE_DESENVOLVIMENTO.md) | Modificado |

### Raiz (1 arquivos)

| Arquivo | Situação |
| --- | --- |
| [README.md](../README.md) | Modificado |
