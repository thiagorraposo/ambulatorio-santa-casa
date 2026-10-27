# Validação da Etapa 7 — fluxos clínicos

Atualização técnica: 2026-10-15. **Implementação e validação técnica sintética do recorte 7A–7D concluídas.**
M1 (revisão humana do fluxo original) foi aprovado em 2026-10-26 conforme
confirmação do responsável registrada no [roteiro da equipe](ROTEIRO_REVISAO_CLINICA_ETAPA_7.md).
Isso não representa aceite da VU1 nem autorização de dados reais; os metadados
detalhados da sessão não foram fornecidos neste repositório.

**Limite de aceite, atualizado em 2026-10-05:** a
[reauditoria](../historico/RELATORIO_ETAPA_7_2026_10_05.md) confirmou sete
lacunas funcionais sem correção e limites na cobertura integrada. Os resultados
registrados neste documento permanecem evidências históricas dos cenários executados.
A continuidade de 15/10 abaixo registra as correções e suas novas provas.

Escopo: 7A–7D do [roadmap](../PROXIMOS_PASSOS.md#etapa-7--fluxos-clínicos),
[ADR-024](../DECISOES_ARQUITETURAIS.md#adr-024) e
[matriz de integração](../historico/ANALISE_FIGMA_MAKE_2026_10_03.md).
O [recorte clínico](../arquitetura/RECORTE_CLINICO_ETAPA_7.md) registra destinos
de campos, extensões HTTP e áreas que exigem contrato posterior.

## Continuidade de 2026-10-17 — execução autônoma e ambiente sintético

Objetivo desta continuidade: tornar a execução local reproduzível, comprovar a
integração dos componentes e corrigir defeitos encontrados, preservando o banco
persistente e as alterações locais da entrega anterior. Commits estão autorizados;
push e aceite clínico não fazem parte desta execução.

Plano e critérios de aceite:

1. Revisar o estado atual e o protocolo de recuperação com revisão independente.
2. Executar integração HTTP, navegador e SQL em PostgreSQL exclusivo descartável.
3. Corrigir falhas reproduzíveis com regressões pertinentes.
4. Disponibilizar comandos de início/status/encerramento de demonstração, com
   login sintético, portas isoladas e verificação real de prontidão.
5. Atualizar as fontes de execução e registrar resultados antes dos commits.

Evidências já obtidas nesta continuidade:

- `make backend-build backend-unit-test frontend-build frontend-unit-test
  docs-check COMPACT=1` passou antes das correções adicionais;
  log `/tmp/ambulatorio-check-0k6vutu6/output.log`.
- `backend-clinical-test` passou com 65 testes HTTP em 11 suítes no servidor
  exclusivo em `127.0.0.1:55457`; a execução combinada com E2E possui log
  `/tmp/ambulatorio-check-0c55qb0k/output.log`.
- `backend-integration-test` passou com oito testes de fundação no banco
  `goal_synthetic_validacao`, porta 55457, sem usar o Compose persistente;
  log `/tmp/ambulatorio-check-ulfekvv3/output.log`.
- `project-check manifest-check` passou no banco limpo
  `goal_synthetic_sql_clean`, após migrations 02–64;
  log `/tmp/ambulatorio-check-lldi51v9/output.log`.

A primeira tentativa SQL usou nome que não identificava banco descartável e foi
recusada pelo SQL33. A repetição no mesmo banco falhou no SQL20 porque testes
anteriores possuem fixtures committed; a execução aprovada foi feita em novo
banco limpo, sem enfraquecer os testes.

A revisão estática do backend não encontrou defeitos concretos no protocolo.
A revisão frontend identificou e corrigiu aborto durante o hash que deixava o
rascunho bloqueado sem UUID e perda da UUID em falha de transporte do registro.
As duas regressões e os testes compartilhados passaram: 27 testes em três
arquivos, mais TypeScript. Falha/404 de verificação continua sem autorizar
reenvio; o usuário conserva as ações de verificar/encerrar conforme o contrato.

O supervisor foi exercitado com início, status, repetição idempotente, parada,
reinício, falha real do backend e SIGKILL do shell runner. A limpeza dos
descendentes marcados usa pidfd, sem sinalizar PID reaproveitado. A configuração
`API_HOST` possui oito testes focados aprovados e build backend aprovado
(`/tmp/ambulatorio-check-kfpzftw5/output.log`). `ss` confirmou API 6062, Vite 4177
e PostgreSQL 55458 somente em `127.0.0.1`.

O frontend passou novamente build e 138 unitários após a correção da preparação
(`/tmp/ambulatorio-check-_xb9i_jw/output.log`). A correção posterior dos rótulos
BZN foi validada em dez testes de leitura, incluindo a nova regressão de
apresentação. Login de edição, destino protegido e listagem foram verificados
no Chromium da demonstração; captura em 390 px não mostrou overflow horizontal.
As capturas locais são `/tmp/ambulatorio-goal-20261017/demo-desktop.png` e
`/tmp/ambulatorio-goal-20261017/demo-mobile.png`.

`importer-test` também passou no servidor exclusivo, incluindo transformações
e fluxo XLSX/PostgreSQL sintético; log
`/tmp/ambulatorio-check-s8pril86/output.log`.

Após o endurecimento do ciclo de vida, `make workflow-test COMPACT=1` passou
com 19 testes (`/tmp/ambulatorio-check-ejoo2al0/output.log`); os caminhos normais
de Make/help e início/status/parada foram exercitados. O build frontend final e
`docs-check` passaram (`/tmp/ambulatorio-check-airja4i6/output.log`).

Revisão adicional no Chromium cobriu login, listagem, ficha, edição cadastral,
novo atendimento e encaminhamento em 320/390 px e reflow de 640 px equivalente
a desktop de 1280 px com zoom de 200%. Não houve overflow horizontal, erro
JavaScript ou controle inacessível na tabulação examinada. Evidências locais:
`/tmp/audit-frontend-results.log` e `/tmp/audit-*.png`. A equivalência de reflow
não afirma teste de todos os comportamentos do zoom nativo do navegador nem
aceite integral da unidade 7D-U4.

A execução completa do navegador terminou com 37/38 cenários aprovados. O caso
de interrupção da identidade durante escrita falhou porque a correção adicional
de aborto trocou a mensagem de resultado clínico incerto por uma mensagem
genérica de tentativa. A apresentação foi ajustada para distinguir registro da
intenção (nenhuma clínica enviada) de escrita já enviada (salvamento incerto),
mantendo a asserção e o bloqueio contra duplicação. A regressão focada usa o log
`/tmp/ambulatorio-check-v9q_9qz3/output.log` e passou (1/1); os dois arquivos
unitários afetados passaram com 16 testes. Os outros 37 cenários aprovados não
foram repetidos após essa alteração de mensagem.

## Continuidade de 2026-10-15

O checkout recebeu as correções R7-01–07. A paginação de familiares separa
snapshots e resultados; os atalhos preservam paciente, atendimento e origem;
POST de pendência distingue desconhecido (`null`) de `nao_informado` e `aberta`.
Rascunhos e recibos permanecem em memória durante falha temporária de identidade,
com descarte na saída/401/expiração. O BZN concorrente conserva o tratamento
canônico e permite comparar/copiar/descartar o rascunho perdedor.

A [ADR-025](../DECISOES_ARQUITETURAIS.md#adr-025) e a migration incremental 64
introduzem correlação de 14 escritas clínicas por UUID, método/caminho e hash.
O servidor grava o recibo no mesmo COMMIT clínico. Consultar ou encerrar a
tentativa nunca reexecuta a escrita. Ausência em listagem não prova falha;
somente a prova de não aplicação libera revisão e nova confirmação. O contrato
detalhado está em [recuperação de operações](../arquitetura/RECUPERACAO_OPERACOES_ETAPA_7.md).
Não foram alteradas migrations antigas nem o dump do banco persistente.

Ambiente: PostgreSQL 16 descartável em `127.0.0.1:57801`, migrations 02–64,
Node 24.15.0/npm 11.16.0 e Chromium do Playwright. Os runners criam bancos/logins
próprios; a API usa `/v1`, `vinculo_explicito`, TTL 60 s e importação/revisão
desligadas. Credenciais temporárias ficam em arquivo privado fora do repositório.

| Verificação atual | Evidência |
| --- | --- |
| Backend build/unitários | 120 testes em 18 suítes, incluindo IDs textuais no limite de bigint. Log `/tmp/ambulatorio-check-kbczo8z6/output.log`. |
| Fundação backend | Oito testes HTTP/PostgreSQL aprovados, TTL configurado de 300 s. Corrigida a asserção histórica fixada em 900 s para usar a configuração real. Log `/tmp/ambulatorio-check-_xggd1sb/output.log`. |
| Integração clínica | 65 testes em 11 suítes; após o ajuste de limite dos IDs, repetidos somente os nove casos HTTP de operações (14 mutações, falhas, vínculos, concorrência). Logs `/tmp/ambulatorio-check-nc14upj6/output.log` e `/tmp/ambulatorio-check-z8iewjg7/output.log`. |
| Frontend build/unitários | TypeScript/Vite e 136 testes em 14 arquivos, repetidos na rodada `/tmp/ambulatorio-check-8mj4f0ub/output.log`. Essa rodada integrada terminou com três falhas de roteiros; build/unitários passaram e não houve mudança posterior no código de produção. |
| Novos cenários de navegador | Oito aprovados, sem retry/skip. Log `/tmp/ambulatorio-check-2vk6dno_/output.log`; evidências `/tmp/etapa6-frontend-7bvB5J`. |
| Regressão de navegador | 38 cenários aprovados, zero falha, flaky, skip ou retry: `/tmp/ambulatorio-check-m_t4068i/output.log`; artefatos `/tmp/etapa6-frontend-ugtOPs`. Os três roteiros corrigidos também passaram isoladamente em `/tmp/ambulatorio-check-qcwt7n5x/output.log`. |
| SQL/projeto | `project-check COMPACT=1` aprovado em banco novo: 35 arquivos SQL (não existe teste 32), docs, diff e status. Log `/tmp/ambulatorio-check-oe6jer_r/output.log`. SQL36 também passou isoladamente após corrigir somente o hash sintético da fixture: `/tmp/ambulatorio-check-eedn1i8r/output.log`. |
| Workflow | Nove testes aprovados em `make workflow-test COMPACT=1`. Log `/tmp/ambulatorio-check-jsb83g9c/output.log`. |

Comando final: `make -e --no-print-directory _COMPACT_RUNNING=1 -o frontend-build -o frontend-unit-test frontend-check docs-check COMPACT=1`,
executado pelo runner compacto. Build/unitários aprovados na mesma versão do
código de produção foram reaproveitados; apenas testes e documentação mudaram
depois. O alvo recompilou o backend, executou todos os 38 E2E e verificou os docs.
Não houve repetição de suíte backend aprovada sem mudança pertinente.
Os runners removeram seus bancos/logins (zero remanescentes confirmado); o
PostgreSQL temporário foi encerrado. Logs e capturas sintéticas permanecem em
`/tmp`, sem conteúdo versionado nem promessa de retenção após limpeza do sistema.

Preparação posterior da revisão humana: acrescentado roteiro preenchível e
sessão de 900 s somente no modo `test_e2e.sh --serve`; a execução automática
continua fixada em 60 s. O modo de demonstração foi aberto em banco novo e
verificado no Chromium: login devolveu `expiresIn: 900`, `/auth/me` confirmou
administração, a listagem abriu e a saída voltou ao login. A sintaxe shell,
documentação e diff passaram. As suítes clínicas anteriores não foram repetidas
porque não houve alteração de aplicação, schema ou do prazo do modo automático.
A demonstração pode permanecer ativa para a equipe; sua preparação não constitui
parecer humano nem altera o limite de aceite acima.

Os oito novos cenários comprovam: 30/50 familiares com paginação, erro, voltar e
recarregar; cadastro e atendimento composto integralmente pela interface,
BZN/reação, retorno, encaminhamento/contrarreferência, resolução de pendência e
releitura do histórico; 403 clínico real seguido de revalidação somente de
leitura, restauração do vínculo e confirmação com a mesma versão original;
contexto de atendimento e rejeição de contexto alheio; conflito BZN; recibos
após falha temporária de `/auth/me`; três estados distintos de pendência.
O percurso integrado não prepara paciente/consulta por helper HTTP ou SQL.

A primeira rodada identificou esperas do limitador de login consumindo o prazo
do cenário, seleção antes da leitura assíncrona, seletores divergentes do texto
da interface e espera por PATCH após registro da intenção já recusado. As
esperas do limitador real agora têm orçamento próprio; a suíte mantém zero
retry. Separadores decorativos do breadcrumb deixaram de compor os nomes
acessíveis. As falhas anteriores permanecem nos logs; não são apresentadas
como execução aprovada.

Na regressão completa, os roteiros passaram a aguardar a renderização da rota
de destino, além da URL; a confirmação BZN já salva fica visível e desabilitada,
e revisar projeto exige a ação explícita de nova revisão. A fixture de fundação
confere o TTL configurado. As falhas SQL de reexecução foram de isolamento:
SQL28/29/33 mantêm fixtures committed; o novo banco precisava também ter nome aceito
pela guarda de descartabilidade. O `project-check` aprovado usou uma base nova,
desde a aplicação das migrations, sem apagar fixtures nem relaxar os testes.

| Lacuna da reauditoria | Código e comprovação atual |
| --- | --- |
| R7-01 | `familyScreenings/familyResults`, paginação por snapshot na URL; testes HTTP, componente e `familiares.spec.ts` com 30/50 resultados, erro e navegação. |
| R7-02 | `MutationForm.revalidateAccess`; componentes e `stage7-access-recovery.spec.ts` comprovam 403 clínico, GET sem escrita e nova confirmação na versão original. |
| R7-03 | Ledger/recibo transacional e verificação/encerramento; nove casos HTTP cobrem 14 mutações e provas de não aplicação, concorrência, expiração e resposta perdida. Componentes exigem prova antes de nova tentativa; E2E verifica atendimento, PATCH, retorno anual e contrarreferência sem duplicar. |
| R7-04 | Normalização de POST composto/posterior conserva `null`; contratos e navegador distinguem desconhecido, não informado e aberta. PATCH null mantém destino futuro próprio. |
| R7-05 | IDs e origem nos atalhos; escolha de consulta explícita e validação no paciente. E2E comprova troca e recusa de contexto alheio. |
| R7-06 | Comparação/cópia/descarte explícito do rascunho e reações após conflito BZN; componentes e E2E conservam o tratamento canônico. |
| R7-07 | Recibos/valores no DraftStore da sessão; componentes e E2E recuperam identidade temporariamente indisponível sem POST adicional. |

Os pacotes de UX propostos em 05/10 (cadastro com escolha explícita, consulta em
cinco etapas, nova ficha/resumo e seletores) continuam sujeitos às decisões e
aceites próprios. Este percurso comprova o recorte original 7D; não conclui por
associação o pacote 7D-A1/VU1 e suas dependências. PATCH de pendência para `null`
continua uma evolução separada de contrato, distinta dos POST corrigidos.

## Evidência histórica de 2026-10-04 — ambiente e execução

Node 24.15.0/npm 11.16.0, Chromium/Playwright e PostgreSQL 16.15 exclusivamente
sintético em `127.0.0.1:55477`. A fundação usa banco descartável preparado;
SQL passou em banco novo, ambos com migrations 02–63. Runners clínico e frontend
criam seus próprios bancos e logins. A API/Vite do navegador usa portas
6061/4176, `vinculo_explicito`,
TTL 60 s e importação/revisão desligadas. O frontend consome somente `/v1`.
O ambiente persistente e seu dump não foram alterados; não houve nova migration.

As variáveis de banco/login/JWT foram carregadas de arquivo privado em `/tmp`.
`make -e` preserva esse ambiente sintético diante da configuração local existente;
as credenciais não foram impressas ou versionadas.

| Verificação | Evidência |
| --- | --- |
| Backend build e unitários | Aprovados: 92 testes em 17 suítes; os clínicos excluídos dessa entrada foram executados separadamente abaixo. |
| Fundação backend | Aprovada: oito testes HTTP/PostgreSQL. |
| Contratos clínicos | Aprovados: 51 testes em nove suítes, incluindo catálogo/capacidades, campos completos, rollback, versões e retornos. |
| Frontend build e unitários | Aprovados: TypeScript/Vite e 106 testes em 12 arquivos. |
| Navegador/API/PostgreSQL | Aprovados: 30 cenários, oito de leitura e 22 de escrita/integração; zero falha, flaky ou skip, sem retry de teste configurado. |
| SQL/projeto/workflow | Aprovados: 34 testes SQL, docs-check, diff/status e nove testes do workflow. |

A primeira chamada `make -e backend-check backend-clinical-test frontend-check
project-check workflow-test COMPACT=1` aprovou backend e build/unitários do
frontend. Parou no seed do E2E: uma fixture antiga criava resolução sem data.
A fixture passou a informar uma data sintética explícita, conforme o contrato.
Log: `/tmp/ambulatorio-check-6juvxjvd/output.log`.

A rodada seguinte confirmou os oito cenários de leitura, mas o login da primeira
escrita recebeu 429: os arquivos de teste não compartilhavam o controle da janela
de autenticação. Ela foi encerrada e o helper comum passou a respeitar os
cabeçalhos reais, inclusive ao iniciar um novo worker. O limite da API permaneceu
inalterado. Log: `/tmp/ambulatorio-check-oh1v_tkl/output.log`.

A rodada `/tmp/ambulatorio-check-ofq37kgh/output.log` aprovou 28 cenários e
identificou duas falhas: Tab saía dos botões do diálogo, corrigido com contenção
explícita de Tab/Shift+Tab e restauração de foco; o teste de vínculo restaurado
procurava um retry que a interface não oferece em 403, corrigido para retomar o
foco e acionar a reconsulta de acesso real.

`make -e frontend-check project-check workflow-test COMPACT=1` aprovou o build
com a correção de foco, mas parou em quatro casos unitários: uma asserção da
operação pendente havia sido colocada no bloco de erros já concluídos. Ela foi
movida ao teste da escrita pendente, mantendo a cobertura do diálogo com somente
um botão habilitado. Log: `/tmp/ambulatorio-check-40f2nhl7/output.log`.

A execução final usa `make -e frontend-unit-test frontend-e2e project-check
workflow-test COMPACT=1`, log `/tmp/ambulatorio-check-9owkssa_/output.log`.
Os 106 unitários e os 30 cenários de navegador passaram. Testes backend aprovados
não foram repetidos após
alterações exclusivas de frontend/fixture/helper; o build do frontend aprovado
na rodada anterior foi preservado após ajuste somente no teste e documentação.
Artefatos: `/tmp/etapa6-frontend-Hx2vZf`; screenshots cadastrais, atendimento
composto e BZN em tela estreita/zoom foram inspecionados. Fixture, banco/login e
processos desse runner foram removidos; as portas 6061/4176 ficaram livres.

Essa chamada parou no SQL20: o banco preparado já continha duas aplicações de
revisão sintéticas, incompatíveis com a asserção que exige tabela vazia. Foi
criado banco novo, preservando o anterior. A primeira preparação nova passou
os testes anteriores ao SQL33, que recusou o nome sem marcador de teste, conforme sua guarda de
segurança. Logs: `/tmp/etapa7-project-qyV3HP/output.log` e
`/tmp/ambulatorio-check-gd0ej7eu/output.log`. O banco dessa tentativa foi removido.

`make -e project-check workflow-test COMPACT=1` passou em outro banco novo
`etapa7_project_test_*`: 34 SQL e nove testes de workflow. Logs:
`/tmp/etapa7-project-B46vVx/output.log` e
`/tmp/ambulatorio-check-uf2z0jha/output.log`; bootstrap/cleanup no mesmo diretório.
Esse banco também foi removido. Nenhum script SQL foi alterado para essas
preparações. Revisão final de links locais/âncoras, diff/status e documentação
complementa os checks sem repetir suítes aprovadas sobre o mesmo código.

## Matriz de aceite

| ID | Requisito | Evidência |
| --- | --- | --- |
| F7-01 | Busca prévia, homônimos separados, nome obrigatório, nascimento/sexo opcionais, idade derivada. | `stage7.spec.ts`: cadastro/busca, verificação das entradas e leitura dos dois IDs devolvidos pela API; API compara o registro original. |
| F7-02 | Contatos/endereço, estados desconhecidos, IDs/versões textuais e datas clínicas preservados. | Edição cadastral no navegador e roundtrip HTTP; unitários de contratos/formatters; contatos antigos e snapshot do endereço preservados. |
| F7-03 | Perfil e política de cadastro, vínculos de leitura/escrita e revogação. | Capacidades em todos os perfis/políticas, 401/403/503, recusa HTTP e formulário oculto; reconsulta retardada demonstra ocultação antes do 403 real. |
| F7-04 | PATCH com versão original, concorrência, comparação explícita e nova intenção sem sobrescrita automática. | Paciente/atendimento com alterações concorrentes; 409 mantém baseline/rascunho. Comparar não escreve; descarte explícito permite edição posterior com a versão consultada. |
| F7-05 | Núcleo/filhos atômicos; avaliação, descoberta distinta, exames identificados/solicitados, familiares e pendências sem descarte. | `stage7.http.spec.ts`, `clinical.http.spec.ts`, `response-dto.http.spec.ts` e formulário composto: todos os campos, nulos e rollback tardio; objeto/array inválido e tipo inativado recusados. PATCH edita somente o núcleo. |
| F7-06 | BZN único, reações na criação, retornos BZN/anuais repetíveis com data efetiva e ano isolado sem visita. | HTTP inclui concorrência BZN, múltiplos episódios e recusa de datas futuras; navegador confere coleções reais e número de atendimentos antes/depois do fato anual. |
| F7-07 | Projetos/notificação respeitam paciente, triestados, textos independentes e registros existentes. | Pré-carga, diffs de PUT e associação além da primeira página; número/justificativas preservados mesmo com indicador negativo/desconhecido. Catálogos vêm da API. |
| F7-08 | Encaminhamentos, contrarreferências repetíveis e pendências resolvidas com data. | API e navegador verificam vínculo/histórico e múltiplos episódios; resolução inicial composta e posterior, reabertura explícita e combinações inválidas. |
| F7-09 | Navegação e rascunhos, carga/erro, sessão e confirmação por operação. | `writing*.test.tsx`, `followup-refresh.test.tsx` e navegador: navegação/voltar, reconsulta, rascunho inativo, saída/401/expiração/troca, diálogo acessível e sucesso parcial após atendimento confirmado. |
| F7-10 | Falha após commit exige verificação sem duplicar ou repetir escrita. | Perda real da resposta de atendimento, PATCH paciente, retorno anual e contrarreferência; revalidação interrompida durante escrita. Verificação usa GET na API real, rascunho incerto permanece bloqueado, uma gravação por intenção. Resposta inválida não confirma sucesso. |
| F7-11 | Teclado, foco, contraste, telas menores e zoom no navegador. | Axe WCAG 2/2.1 A/AA nos tipos de formulário; Tab/Shift+Tab/Escape no diálogo, foco de erros, screenshots desktop/390 px/zoom CSS 200% e verificação de overflow. |
| F7-12 | Documentação, recorte, regressões e ausência de dados sensíveis. | Make/SQL/workflow, links locais, diff/status e revisão dos arquivos/bundle. Nenhum contrato fora de 7A–7D, dado real, segredo, migration antiga, commit ou push. |

## Limites de aceite

As exclusões HTTP pertencem ao recorte documentado: sorologias individuais,
condições/comorbidades, dispositivos/eventos/óbito, medicamentos e resultados
detalhados não recebem campos editáveis sem destino. Edição independente de
filhos/BZN/reação/encaminhamento e upload avançado aguardam contratos próprios.
Não há fila global, importação/revisão ou dashboard acrescentados nesta etapa.

Resultado de rede incerto não pode ser provado ausente por uma página vazia.
Não há reenvio automático nem garantia de idempotência de POST entre sessões;
consultar o registro é obrigatório antes de outra operação. Homônimos não são
fundidos. Auditoria automatizada e inspeção visual não equivalem à homologação
de usabilidade com a equipe clínica, que permanece pendente, assim como CI
remota e implantação/dados reais. O zoom automatizado usa CSS, com a limitação
registrada também no aceite da Etapa 6.
