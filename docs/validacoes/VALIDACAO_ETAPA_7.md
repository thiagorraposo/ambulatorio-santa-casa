# Validação da Etapa 7 — fluxos clínicos

Data: 2026-10-04. Status: **VALIDAÇÃO TÉCNICA SINTÉTICA APROVADA**.
Revisão de usabilidade com a equipe clínica pendente.

**Limite de aceite, atualizado em 2026-10-05:** a
[reauditoria](../RELATORIO_DESDE_ULTIMO_COMMIT_2026_10_05.md) confirmou sete
lacunas funcionais sem correção e limites na cobertura integrada. Os resultados
registrados neste documento permanecem evidências dos cenários executados;
o aceite integral da Etapa 7 continua pendente.

Escopo: 7A–7D do [roadmap](../PROXIMOS_PASSOS.md#etapa-7--fluxos-clínicos),
[ADR-024](../DECISOES_ARQUITETURAIS.md#adr-024) e
[matriz de integração](../arquitetura/ANALISE_INTEGRACAO_FIGMA_MAKE.md).
O [recorte clínico](../arquitetura/RECORTE_CLINICO_ETAPA_7.md) registra destinos
de campos, extensões HTTP e áreas que exigem contrato posterior.

## Ambiente e execução

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
