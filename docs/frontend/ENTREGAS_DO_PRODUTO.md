# Catálogo de entregas do produto

Atualizado em: 2026-10-23. Fonte dos escopos e critérios por unidade; sequência
e marcos pertencem ao [roadmap](../PROXIMOS_PASSOS.md). Estados históricos não
equivalem a aceite atual: consultar as continuidades e relatórios citados.

## Pacotes verificáveis do produto frontend

Esta decomposição de 2026-10-05 preserva as dez etapas e as subetapas 7A–7D.
Sufixos `R` corrigem a reauditoria, `U` explicitam a experiência e `E` estendem
recursos clínicos. `8A`–`8D` organizam complementos da Etapa 8, sem criar etapas
principais novas. `B` é contrato/persistência, `U` é interface e `D` é decisão/
desenho. As [linhas da matriz](MATRIZ_FIGMA_FRONTEND.md) ligam elemento
FM e requisito RQ aos pacotes abaixo; a [visão](VISAO_E_ESPECIFICACAO.md)
define VU1/MVP/PC/EX e decisões P-01–09. Todos os destinos não EX integram o produto completo.

**Estado:** código correspondente presente é implementação, relatórios antigos
são validação parcial dos seus cenários, contrato/decisão ausente é dependência
identificada, e conclusão exige aceite do pacote. Nenhum pacote novo de código
foi implementado/aceito por esta análise. `DOC-EX` registra disposição documental.
Essa era a fotografia de 05/10. As correções e a prova integrada de 15/10 estão
no relatório vigente; a revisão de usabilidade e o aceite dos pacotes propostos
continuam separados. Não avançar para dashboard como se esse aceite já estivesse dado.

**Unidade de entrega:** onde um ID agrega unidades `.1`, `.2` etc., abrir trabalho,
revisar, validar e aceitar cada unidade separadamente. Os critérios nomeiam a
unidade; a âncora do conjunto só conclui quando todas as unidades do destino
aprovado concluírem. Uma unidade posterior pode permanecer planejada/PC, sem
impedir o aceite de outra. Isso não encerra o produto completo; registre o
aceite e o destino individual na matriz. Usar o ID completo da unidade (por exemplo, `7D-U3.2`)
nos trabalhos e evidências, sem renumerar o conjunto. Nenhum conjunto deve virar PR monolítica ou tarefa
“finalizar frontend”. Reutilizar componentes/infraestrutura não dispensa prova
do recurso que grava.

**Condição de conclusão de cada entrega:** escopo delimitado implementado (ou
decisão/documento aprovado nos pacotes D), todos os critérios da unidade abaixo
comprovados, documentação/contrato atualizado, evidência identificando RQ,
ambiente, cenário, IDs sintéticos e resultado, limitações residuais explícitas e
aceite registrado. Falha pertinente não resolvida ou decisão obrigatória aberta
impede conclusão. Build/rota/formulário/suíte geral não substituem esse aceite.
Para unidades de código, preservar alterações preexistentes e revisar diff/status;
commit/push apenas quando autorizados em sua própria tarefa.

### Validação proporcional dos pacotes futuros

Os códigos abaixo são planos de validação, **não comandos executados nesta
entrega documental**. Usar a [matriz do workflow](../WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional),
`COMPACT=1` e combinar camadas alteradas sem repetir suíte aprovada no mesmo
estado. Preparar banco descartável exclusivamente sintético quando requerido.

| Código | Verificação e limite |
| --- | --- |
| VD | `make docs-check COMPACT=1`, links/diagramas/diff e revisão da decisão/semântica. Não aplica migrations. |
| VF | `make frontend-check docs-check COMPACT=1`; cenário UI/API/PostgreSQL sintético do requisito, mais revisão visual/teclado quando afetados. Build/unitários ou browser interceptado sozinhos não comprovam escrita. |
| VB | `make backend-check backend-clinical-test docs-check COMPACT=1`; integração de contrato/guard/persistência. Se houver mudança física futura autorizada, testes SQL próprios e `project-check` no ambiente adequado; nenhuma migration antiga editada. |
| VI | VF/VB conforme camadas alteradas, e `importer-test` quando o pipeline/semântica do importador mudar. Dry-run/rollback, proveniência, autorização e ausência de duplicação precisam de evidência real sintética. |

Toda entrega de UI inclui carga/vazio/erro/sucesso do recurso, perfil consulta em
leitura e ação de escrita condicionada à autorização real. Toda entrega de
escrita se vincula ao protocolo de recuperação da sua classe: não adicionar
retry automático, não chamar resposta perdida de “não salvo” e não esconder
recibo anterior. Falhas podem ser cobertas por cenários focados que referenciem
a infraestrutura já aceita; não é necessário reexecutar o percurso inteiro em
cada pacote. Conferir os RQ efetivamente exercitados, sem afirmar cobertura de
todos os campos por associação a um teste.

### Sequência recomendada e marcos

A sequência M1–M5 e a cobertura obrigatória estão no
[roadmap](../PROXIMOS_PASSOS.md#marcos-e-dependências-de-entrega).
Este catálogo define as unidades, sem manter uma segunda lista de prioridades.

### Recuperação e experiência da Etapa 7

<a id="7a-u1"></a>

#### 7A-U1 — Cadastro precedido por busca e escolha consciente

**Estado e cobertura:** Implementado e validado tecnicamente em 2026-10-26; aceite de produto/equipe não declarado. RQ-HOM-07; RQ-LIS-07; RQ-CAD-01–02, 04–08, 10–18, 23, 25–30 (telas/elementos na matriz).

**Escopo:** Busca por nome → correspondências autorizadas → declaração de nenhuma correspondente → cadastro; edição existente fica fora deste fluxo. Não impedir criação por homônimo nem fundir pessoas.

**Dependências/decisões:** 6B/7A presentes; P-01. Usar H2/H3 sem prometer busca por nascimento/código.

**Trabalho por camada:** Frontend: separar estados/etapas, URL de retorno, capacidade atual e rascunho do cadastro. Backend/dados: nenhum incremento para o recorte nome/sexo.

**Aceite — cenário principal e falhas:** Pessoa existente abre ficha sem POST; pessoa nova só envia após escolha explícita. Nome obrigatório, nascimento/sexo opcionais; 403/capacidade recusada, homônimos, vazio, falha na busca e cancelar não produzem duplicação.

**Validação/evidência e conclusão:** VF. Roteiro com os dois caminhos, contagem de POST e releitura do cadastro com contatos/endereço. Concluir somente pela condição comum acima e pelos critérios desta unidade.

**Evidência técnica:** [VALIDACAO_7A_U1](../validacoes/VALIDACAO_7A_U1.md). Busca concluída com confirmação explícita, sem formulário antes da escolha; cadastro autorizado e abertura de correspondência sem POST; homônimos mantidos; busca vazia/403 e cancelamento sem escrita.

<a id="7b-r1b"></a>

#### 7B-R1B — Todos os familiares tornam-se consultáveis por página

**Estado e cobertura:** Correção implementada e validada no recorte original em 15/10; isso não declara aceite humano deste pacote. Ver [evidências R7](../validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-15). RQ-HIS-16; RQ-ACO-01–04 (telas/elementos na matriz).

**Escopo:** Contrato de paginação independente entre snapshots e seus resultados; escolher extensão mínima compatível, sem substituir fatos clínicos.

**Dependências/decisões:** R7-01; H5. Definir DTO/cursor ou recurso de resultados por snapshot antes da UI.

**Trabalho por camada:** Backend: consulta autorizada, paginação e DTO explícitos. Dados: reutilizar modelo existente; justificar eventual incremento, sem reescrever migrations antigas.

**Aceite — cenário principal e falhas:** Um snapshot com 30 e outro com 50 resultados: páginas sucessivas retornam todos, sem repetição/perda. Dois snapshots não misturam filhos; offset fora de faixa é vazio; vínculo recusado não expõe familiares.

**Validação/evidência e conclusão:** VB. Integração HTTP/PostgreSQL com IDs conhecidos e união das páginas, inclusive autorização. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-r1u"></a>

#### 7B-R1U — Paginar familiares mantendo a consulta e o snapshot

**Estado e cobertura:** Correção implementada e validada no recorte original em 15/10; isso não declara aceite humano deste pacote. Ver [evidências R7](../validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-15). RQ-HIS-16; RQ-ACO-01–04 (telas/elementos na matriz).

**Escopo:** Controles separados para snapshots e familiares; consulta específica preservada em URL/voltar. Não corrigir a perda apenas elevando o limite.

**Dependências/decisões:** 7B-R1B aceito.

**Trabalho por camada:** Frontend: adaptar DTO, carregar páginas por snapshot, estados vazio/erro, retorno e foco. Sem nova escrita.

**Aceite — cenário principal e falhas:** Chegar ao familiar 30/50 por navegação; voltar restaura consulta/snapshot/página. Falha da segunda página permite nova leitura e não chama ausência de família.

**Validação/evidência e conclusão:** VF. Captura/roteiro de duas páginas e IDs comparados ao contrato; cenário com falha de leitura. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-r2"></a>

#### 7B-R2 — Criar pendência com estado desconhecido preservado

**Estado e cobertura:** Correção implementada e validada no recorte original em 15/10; isso não declara aceite humano deste pacote. Ver [evidências R7](../validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-15). RQ-FIC-19; RQ-ACO-05–07, 40–44 (telas/elementos na matriz).

**Escopo:** Criação composta e POST posterior permitem distinguir null, nao_informado, aberta e resolvida; omissão e null seguem o contrato de cada campo. Não ampliar PATCH nesta entrega.

**Dependências/decisões:** R7-04; POST atuais H4/H12 aceitam null.

**Trabalho por camada:** Frontend: normalização, opção/rotulagem de desconhecido e revisão dos dois formulários. Backend/dados: sem evolução para criação.

**Aceite — cenário principal e falhas:** Criar ambos os tipos com null e reler null; nao_informado permanece string distinta. Resolvida exige data; estado não resolvido recusa data incompatível; outros dados do atendimento preservados.

**Validação/evidência e conclusão:** VF. Payload, recurso relido e duas intenções de UI, sem converter desconhecido em pendente. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-r2b"></a>

#### 7C-R2B — Correção de pendência pode retornar a desconhecido

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-45–46 (telas/elementos na matriz).

**Escopo:** Evolução explícita de PendingUpdateDto e semântica PATCH para null; não afirmar que já existe. Histórico/auditoria e concorrência seguem desenho de 8A3B; entrega obrigatória em M3.

**Dependências/decisões:** P-01/P-03 para prioridade; H12 atualmente exige string. Regra D11 preservada.

**Trabalho por camada:** Backend: DTO, validação status/data e persistência parcial. Dados: avaliar estrutura de auditoria existente antes de incremento.

**Aceite — cenário principal e falhas:** PATCH de estado conhecido para null, com data de resolução limpa explicitamente, retorna/rele null. Estado inválido, data incompatível e 403 recusados; descrição e vínculo não são apagados.

**Validação/evidência e conclusão:** VB. Matriz de casos null/omissão/string e contrato documentado com rollback/guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-r2u"></a>

#### 7C-R2U — Revisar pendência distinguindo desconhecido de não informado

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-45–46 (telas/elementos na matriz).

**Escopo:** Editar status/data de pendência existente com null; nota/responsável ficam para 8A3. Controle informa que descrição está em leitura.

**Dependências/decisões:** 7C-R2B; recuperação 7D-R2/R4/R6.

**Trabalho por camada:** Frontend: carregar estado atual, opções distintas, resumo da alteração e confirmação.

**Aceite — cenário principal e falhas:** Pendência resolvida retorna a desconhecido sem data e é relida corretamente. Cancelar não altera; 403 preserva intenção; falha não apresenta sucesso.

**Validação/evidência e conclusão:** VF. Cenário de correção pela UI, valores antes/depois e leitura sem escrita adicional. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r1"></a>

#### 7D-R1 — Atalhos de acompanhamento mantêm paciente e atendimento

**Estado e cobertura:** Correção implementada e validada no recorte original em 15/10; isso não declara aceite humano deste pacote. Ver [evidências R7](../validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-15). RQ-NAV-03, 12; RQ-LIS-01, 06, 08, 11; RQ-FIC-11, 17, 20; RQ-HIS-12, 15; RQ-ENC-07; RQ-BZN-21; RQ-ECR-01–14; RQ-ACO-08–11, 28–33; RQ-EST-08 (telas/elementos na matriz).

**Escopo:** Atalho principal do detalhe, BZN ↔ retorno e contrarreferência; preservar rotas ClinicalActions que já incluem contexto. Aba/página/filtros de retorno fazem parte do percurso.

**Dependências/decisões:** R7-05; H5/H9/H10; rascunhos atuais.

**Trabalho por camada:** Frontend: parâmetros, breadcrumbs e seletores; verificar que atendimento pertence ao paciente antes de preencher. Sem incremento de API.

**Aceite — cenário principal e falhas:** Todos os caminhos iniciados na consulta X enviam/mostram X; trocar para Y é explícito. Link direto inválido ou de outro paciente não escreve; voltar/avançar preservam seleção e histórico.

**Validação/evidência e conclusão:** VF. Tabela de links percorridos e IDs do payload; ao menos duas consultas da mesma pessoa. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r2"></a>

#### 7D-R2 — Retomar uma intenção recusada por 403

**Estado e cobertura:** Correção implementada e validada no recorte original em 15/10; isso não declara aceite humano deste pacote. Ver [evidências R7](../validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-15). RQ-ERR-02; RQ-EST-11 (telas/elementos na matriz).

**Escopo:** Saída de denied por verificação somente de leitura e nova confirmação; manter rascunho no mesmo escopo. GET autorizado não é prova de permissão de escrita.

**Dependências/decisões:** R7-02; H1/guards atuais. Não depende do protocolo de resultado incerto para um 403 comprovadamente recebido.

**Trabalho por camada:** Frontend: transição explícita, mensagem, ocultação quando acesso falta e revalidação. Servidor continua revalidando cada escrita.

**Aceite — cenário principal e falhas:** 403 → leitura ainda recusada mantém bloqueio/ocultação → vínculo restabelecido permite revisar e confirmar. Revalidar/foco não envia; nova confirmação faz um envio, que pode receber outro 403.

**Validação/evidência e conclusão:** VF. UI/API real com revogação/restauração sintética, rascunho comparado e contagem de escritas. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r4"></a>

#### 7D-R4 — Confirmação e valores sobrevivem a falha temporária de identidade

**Estado e cobertura:** Correção implementada e validada no recorte original em 15/10; isso não declara aceite humano deste pacote. Ver [evidências R7](../validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-15). RQ-ACO-12–39; RQ-ERR-06; RQ-EST-06, 15 (telas/elementos na matriz).

**Escopo:** Guardar recibo e valores confirmados no escopo de sessão/operação após salvar; conservar também ao navegar e voltar. Nova intenção repetível é uma ação separada.

**Dependências/decisões:** R7-07; SessionManager/DraftProvider e estado de escrita presentes.

**Trabalho por camada:** Frontend: store de confirmação e renderização após remount, sem guardar clínica no armazenamento persistente do navegador.

**Aceite — cenário principal e falhas:** Salvar retorno → me indisponível oculta → mesma identidade recuperada mostra mesmo ID/data e nenhum POST novo. Logout/401/identidade diferente limpa tudo; resposta tardia não contamina outra sessão.

**Validação/evidência e conclusão:** VF. Recibo/valores antes e depois da falha e saída, contagem de POST e teste de identidade diferente. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r5"></a>

#### 7D-R5 — Conflito de BZN conserva o tratamento atual e o rascunho

**Estado e cobertura:** Correção implementada e validada no recorte original em 15/10; isso não declara aceite humano deste pacote. Ver [evidências R7](../validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-15). RQ-ACO-12–27; RQ-EST-13 (telas/elementos na matriz).

**Escopo:** POST concorrente recebe 409 e consulta canônico; painel de comparação/cópia/descarte sem transformar criação em correção.

**Dependências/decisões:** R7-06; H8; 7D-R4 para recibos compartilhados.

**Trabalho por camada:** Frontend: expor rascunho mesmo quando GET encontra tratamento; controle explícito de descarte e link para consulta. Sem PATCH BZN nesta entrega.

**Aceite — cenário principal e falhas:** Duas intenções concorrem: apenas um tratamento, perdedora mantém todos os campos/reações. Consulta/cópia não escrevem; descartar apenas rascunho afetado; falha no GET mantém bloqueio recuperável.

**Validação/evidência e conclusão:** VF. Dois contextos concorrentes, contagem de tratamentos e comparação do rascunho após GET. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r6d"></a>

#### 7D-R6D — Decidir como provar o resultado de uma operação incerta

**Estado e cobertura:** Desenho/infraestrutura implementados no recorte original; a evidência de cada classe e os limites estão no [relatório R7](../validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-15). Não declara cobertura integral ou recuperação entre sessões aceita. RQ-ERR-04; RQ-EST-14 (telas/elementos na matriz).

**Escopo:** Desenho de correlação autorizada: confirmado, não aplicado com prova, em curso e indeterminável; separar core e acompanhamentos. Recuperação após nova sessão, retenção e privacidade entram na decisão.

**Dependências/decisões:** P-02. Não é nova aprovação de contrato nesta análise.

**Trabalho por camada:** Documentação/arquitetura: comparar recibo/registro de operação/idempotência, atomicidade, chave de intenção, autorização e expiração; inventariar todas as operações atuais. Sem implementação neste pacote.

**Aceite — cenário principal e falhas:** Para cada operação, desenho identifica como consultar sem reaplicar e como provar não aplicação. Janela commit/resposta, queda de processo e revogação têm estados definidos; página vazia nunca é prova.

**Validação/evidência e conclusão:** VD. Decisão revisada com diagramas de falha, contrato proposto e tabela das operações, aprovada antes de 7D-R6B. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r6b"></a>

#### 7D-R6B — Servidor comprova operações de cadastro/atendimento sem reaplicar

**Estado e cobertura:** Desenho/infraestrutura implementados no recorte original; a evidência de cada classe e os limites estão no [relatório R7](../validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-15). Não declara cobertura integral ou recuperação entre sessões aceita. RQ-ERR-04; RQ-EST-14 (telas/elementos na matriz).

**Escopo:** Duas unidades separadas abaixo: B.1 cadastro/PATCH paciente; B.2 criação/PATCH atendimento composto. A âncora agrega dependências, não autoriza uma entrega monolítica.

**Dependências/decisões:** 7D-R6D aprovado; política/DTO da correlação definidos.

**Trabalho por camada:** Backend/dados: implementar consulta autorizada do resultado e vínculo atômico à operação por unidade; migration nova somente se o desenho exigir.

**Aceite — cenário principal e falhas:** Cada unidade prova sucesso com resposta perdida, falha antes do commit, rollback de filhos, intenção em curso/expirada e 403. Verificação faz zero escrita clínica/reexecução; nenhuma chave permite consultar outro usuário/recurso.

**Validação/evidência e conclusão:** VB. Aceitar B.1 e B.2 separadamente com HTTP/SQL e falhas injetadas; agregado só termina quando ambas aceitas. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r6u"></a>

#### 7D-R6U — Interface encerra incerteza de cadastro/atendimento por verificação

**Estado e cobertura:** Desenho/infraestrutura implementados no recorte original; a evidência de cada classe e os limites estão no [relatório R7](../validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-15). Não declara cobertura integral ou recuperação entre sessões aceita. RQ-ACO-28–39; RQ-ERR-04, 06; RQ-EST-14 (telas/elementos na matriz).

**Escopo:** U.1 cadastro/edição paciente e U.2 atendimento novo/edição, aceitos separadamente; revisar a intenção e consultar resultado. Nunca desbloquear por ausência em busca.

**Dependências/decisões:** 7D-R6B unidade correspondente, 7D-R4; desenho de 7D-R6D.

**Trabalho por camada:** Frontend: ação Verificar resultado, recibo reconciliado, bloqueio de estado indeterminável e nova confirmação apenas com prova de não aplicação.

**Aceite — cenário principal e falhas:** Resposta perdida → verificação mostra recurso correto e mantém um registro; rollback comprovado permite nova intenção consciente. GET falha/revogado/em curso mantém bloqueio; recarga/nova sessão seguem o desenho aprovado.

**Validação/evidência e conclusão:** VF. Cada unidade tem roteiro de commit perdido e não aplicação, contagem de escritas antes/depois da verificação. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r6b-a"></a>

#### 7D-R6B-A — Servidor comprova acompanhamentos sem duplicar episódios

**Estado e cobertura:** Desenho/infraestrutura implementados no recorte original; a evidência de cada classe e os limites estão no [relatório R7](../validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-15). Não declara cobertura integral ou recuperação entre sessões aceita. RQ-ACO-28–39; RQ-ERR-04, 06; RQ-EST-14 (telas/elementos na matriz).

**Escopo:** A.1 BZN/retornos; A.2 encaminhamento/contrarreferência/anuais; A.3 PUT projeto/notificação e pendências. Três unidades de aceite, reutilizando infraestrutura sem presumir idempotência em episódios repetíveis.

**Dependências/decisões:** 7D-R6D e infraestrutura 7D-R6B; contratos atuais H7–H12.

**Trabalho por camada:** Backend/dados: correlacionar cada operação, seu contexto/identidade e recurso confirmado; consulta e autorização; nenhuma reaplicação por leitura.

**Aceite — cenário principal e falhas:** Cada classe prova resposta perdida, rollback, revogação e dois episódios intencionais iguais com IDs distintos. PUT não confunde valor coincidente com resultado da intenção; leitura não cria ocorrência.

**Validação/evidência e conclusão:** VB. Matriz de operações das três unidades, falhas após commit e contagem/IDs de recursos. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-r6u-a"></a>

#### 7D-R6U-A — Interface recupera acompanhamentos e conserva confirmações anteriores

**Estado e cobertura:** Desenho/infraestrutura implementados no recorte original; a evidência de cada classe e os limites estão no [relatório R7](../validacoes/VALIDACAO_ETAPA_7.md#continuidade-de-2026-10-15). Não declara cobertura integral ou recuperação entre sessões aceita. RQ-ACO-28–39; RQ-ERR-04, 06; RQ-EST-14 (telas/elementos na matriz).

**Escopo:** A.1 BZN/retornos; A.2 encaminhamento/contrarreferência/anuais; A.3 projeto/notificação/pendência. O atendimento confirmado permanece visível ao recuperar operação posterior.

**Dependências/decisões:** 7D-R6B-A unidade correspondente; 7D-R4/R5.

**Trabalho por camada:** Frontend: aplicar fluxo comum por operação, comparar contexto e recibo; Novo registro inicia outra intenção após concluir a anterior.

**Aceite — cenário principal e falhas:** Em cada unidade a resposta perdida é reconciliada com um registro; confirmação anterior não some. Estado desconhecido bloqueia, 403 não expõe clínica, nova ocorrência só por ação explícita; zero retry automático.

**Validação/evidência e conclusão:** VF. Um cenário positivo e falhas pertinentes por unidade, rastreado aos recursos e POST/PUT/PATCH. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-u1"></a>

#### 7D-U1 — Preencher atendimento em cinco etapas sem perder dados

**Estado e cobertura:** Planejado; não aceito. RQ-ATD-01–04, 16–19; RQ-DIA-01–07, 22; RQ-MED-01–09; RQ-EXN-01–09; RQ-OBS-01–02; RQ-EST-10 (telas/elementos na matriz).

**Escopo:** Atendimento, Avaliação/Chagas, Exames/familiares, Pendências e Revisão; somente campos hoje aceitos. Prévia de resumo não confirma ainda; etapa de revisão completa pertence a U2.

**Dependências/decisões:** P-03; H4; 7B-R2; 7D-R1.

**Trabalho por camada:** Frontend: agrupar formulário existente, anterior/próxima, resumo de etapa, validação/foco, cancelar com decisão de rascunho e uma coluna em mobile.

**Aceite — cenário principal e falhas:** Ida/volta entre cinco etapas mantém todos os valores/filhos; erro direciona etapa/campo; data obrigatória; cancelar não escreve e permite preservar/descartar conscientemente.

**Validação/evidência e conclusão:** VF. Roteiro com filhos repetidos, vazio/desconhecido, navegação e teclado/390 px, sem perda. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-u2"></a>

#### 7D-U2 — Revisar atendimento e reconhecer cada confirmação separada

**Estado e cobertura:** Planejado; não aceito. RQ-ATD-05–10, 12–14; RQ-DIA-01–07; RQ-MED-01–09; RQ-PRJ-01; RQ-EXN-01–09; RQ-NTF-01–03; RQ-OBS-01–03 (telas/elementos na matriz).

**Escopo:** Revisão de todos os valores/filhos aceitos, links Voltar e editar, confirmação única do atendimento e ação Continuar acompanhamento. Acompanhamento não integra o POST composto.

**Dependências/decisões:** 7D-U1; 7D-R4; P-03; H4/H7–H12.

**Trabalho por camada:** Frontend: representação de resumo, campos ausentes relevantes, recibo e ação seguinte com contexto; não exibir status Completo sem critério.

**Aceite — cenário principal e falhas:** Alterar um campo na revisão atualiza só ele; confirmar grava uma vez; falha de acompanhamento não desfaz/oculta consulta salva. Duplo clique e Enter não duplicam; resposta incerta segue R6.

**Validação/evidência e conclusão:** VF. Comparação resumo/payload/releitura com valores discriminantes; captura do recibo e falha posterior. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-u3"></a>

#### 7D-U3 — Ficha e detalhe mostram a origem temporal de cada dado

**Estado e cobertura:** Planejado; não aceito. RQ-HOM-06, 08; RQ-CAD-19; RQ-FIC-01–04, 06, 10, 12, 14, 16; RQ-RES-01–28, 30–31; RQ-HIS-01–11, 14; RQ-CHA-01–06, 15; RQ-EXA-01–06, 14; RQ-AVL-01–08 (telas/elementos na matriz).

**Escopo:** U3.1 cabeçalho/resumo/última consulta; U3.2 diagnóstico/avaliação por consulta selecionada; U3.3 histórico/detalhe/exames e links às áreas canônicas. Cada unidade pode ser revisada/aceita separadamente.

**Continuidade técnica de 17/10:** U3.1 implementada, com
[evidências próprias](../validacoes/VALIDACAO_7D_U3_1.md) e validação técnica aprovada.
U3.2 também recebeu implementação e
[validação técnica](../validacoes/VALIDACAO_7D_U3_2.md), com seleção explícita e
sem consolidação entre consultas. Em 20/10, U3.3 recebeu implementação de
histórico/detalhe com retorno à ficha, exames agrupados e expansíveis e links às
áreas canônicas; [validação própria](../validacoes/VALIDACAO_7D_U3_3.md) registra
resultados e limites, com validação técnica encerrada em 21/10. O aceite clínico e a fidelidade visual integral continuam
pendentes.
O estado agregado acima não declara U3 integral, VU1 ou aceite clínico concluídos.

**Dependências/decisões:** H3/H5–H12; 7B-R1U, 7D-R1. Código de negócio/origem e timeline integrada ficam para 8B3/8B2.

**Trabalho por camada:** Frontend: reordenar painéis usando leituras existentes, abas/seleção em URL e recursos paginados; sem varrer todas as páginas para calcular resumo.

**Aceite — cenário principal e falhas:** U3.1 identifica última consulta, ID secundário e referência de idade; U3.2 alterna duas consultas inclusive null sem carregar último não nulo; U3.3 abre recurso correto e restaura página. Carga/403/vazio não exibem dado antigo nem inventam completude.

**Validação/evidência e conclusão:** VF. Capturas/roteiros de cada unidade com duas consultas e recursos canônicos; checar IDs/fontes/limite de página. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-u4"></a>

#### 7D-U4 — Layout, controles e mensagens são operáveis em telas menores e teclado

**Estado e cobertura:** Planejado; não aceito. RQ-LOG-01–03, 05–06; RQ-NAV-01–02, 08–10, 13; RQ-LIS-12; RQ-ATD-15; RQ-CTA-01–02, 05–06; RQ-ERR-03, 05, 07; RQ-EST-01–07, 09–10 (telas/elementos na matriz).

**Escopo:** U4.1 shell/login/conta/erros: navegação, foco e layout 320/390; U4.2 controles compartilhados de formulário/tabela/diálogo: rótulo, erro, status, Escape, foco. Aplicar a telas atuais sem copiar modais inseguros do Figma.

**Continuidade técnica de 21/10:** U4.1 recebeu implementação de menu compacto,
sidebar desktop, foco de navegação/breakpoint, conta e erros; a
[validação própria](../validacoes/VALIDACAO_7D_U4_1.md) registra o aceite técnico,
11 cenários finais de navegador aprovados e os limites.
Não introduz diálogo nem resolve P-01/P-03; U4.2 permanece pendente. O estado
agregado não declara U4 integral, VU1 ou aceite clínico concluídos.

**Dependências/decisões:** P-03 para novos diálogos; 6A/7 atuais; conteúdo U1/U2/U3 quando afetado.

**Trabalho por camada:** Frontend: CSS/componentes compartilhados; tabelas com rolagem própria, formulários em uma coluna, contraste/status por texto e anúncio de erro/sucesso.

**Aceite — cenário principal e falhas:** Cada unidade: navegação só teclado, zoom 200%, 320/390 px, foco visível e ações alcançáveis sem rolagem horizontal da página. Diálogo restaura foco; nenhuma linha exige clique sem alternativa; erro sanitizado possui retorno útil.

**Validação/evidência e conclusão:** VF. Capturas comparáveis, Axe e revisão humana de teclado/foco nas duas unidades; Axe não substitui revisão. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7d-a1"></a>

#### 7D-A1 — Comprovar cadastro → atendimento → acompanhamento → histórico pela interface

**Estado e cobertura:** Planejado; não aceito. RQ-LOG-04, 07; RQ-NAV-11; RQ-CAD-21–22, 24; RQ-FIC-07–09, 13, 15, 18–19; RQ-HIS-13; RQ-PRO-01–09; RQ-TRA-01–11; RQ-ENC-01–06, 08; RQ-NOT-01–05; RQ-ATD-14; RQ-MED-10; RQ-PRJ-01; RQ-BZN-01–08, 21; RQ-ECR-01–15; RQ-NTF-01–03; RQ-ACO-12–44; RQ-CTA-05–06; RQ-ERR-01; RQ-EST-12, 16–17 (telas/elementos na matriz).

**Escopo:** Um cenário integrado positivo: buscar/criar paciente, atendimento com avaliação/diagnóstico/exames/família/pendência, BZN/reação, retorno efetivo, encaminhamento/contrarreferência, resolver pendência, reler ficha/histórico. Não preparar paciente/consulta com helpers de API.

**Dependências/decisões:** Correções R7-01–07 aceitas nas classes utilizadas, 7A-U1, 7D-U1/U2/U3/U4; P-01/P-03. 7C-R2 pode ocorrer depois de M2, mas é obrigatório em M3.

**Trabalho por camada:** Validação/frontend: roteiro e E2E UI/API/PostgreSQL real sintético. Preparação por helper limitada a identidade, vínculo, catálogos e fixture de falha; sem implementar recurso novo nesta prova.

**Aceite — cenário principal e falhas:** Todo recurso tem ID e consulta de origem corretos; usuário completa sem SQL. Falhas 403, 409 de versão/BZN e resposta perdida recuperam só intenção afetada; confirmação anterior permanece. Duas intenções iguais são distinguíveis; zero reenvio automático/duplicação.

**Validação/evidência e conclusão:** VF. IDs por passo, contagem/releitura em API/SQL, capturas dos pontos de decisão e revisão com equipe; cobrir falhas por casos focados, sem repetir toda a suíte após o mesmo estado aprovado. Concluir somente pela condição comum acima e pelos critérios desta unidade.

### Extensões clínicas vinculadas a 7B e 7C

Sem HTTP atual permanecem dependências planejadas. Confirmar prioridade P-01;
cada contrato antecede sua UI, preservando as decisões clínicas vigentes.

<a id="7b-e1b"></a>

#### 7B-E1B — Publicar contrato de sorologias por episódio

**Estado e cobertura:** Planejado; não aceito. RQ-FIC-12; RQ-CHA-07–14; RQ-DIA-08–18 (telas/elementos na matriz).

**Escopo:** Método, solicitação/coleta/resultado com datas próprias, laboratório/observação; solicitação geral separada quando aprovada. Não reinterpretar resultados.

**Dependências/decisões:** P-01 para prioridade; campos/modelo físico e fontes clínicas examinados antes do DTO; D2–D5 quando pertinentes.

**Trabalho por camada:** Backend: contrato de consulta/criação específico, autorização por paciente/atendimento e transação. Dados: reutilização ou nova migration incremental justificada; nenhuma inferência para preencher legado.

**Aceite — cenário principal e falhas:** Duas sorologias permanecem distintas, data de descoberta não muda; método genérico tem identificação; desconhecido/ausente preservados. GET/POST sem vínculo recebe recusa; falha de filho reverte a operação correspondente.

**Validação/evidência e conclusão:** VB. DTO/semântica aprovados e integração HTTP/SQL com dois episódios/consultas, null, inválido, rollback e guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e1u"></a>

#### 7B-E1U — Registrar e consultar sorologias por episódio

**Estado e cobertura:** Planejado; não aceito. RQ-FIC-12; RQ-CHA-07–14; RQ-DIA-08–21 (telas/elementos na matriz).

**Escopo:** Método, solicitação/coleta/resultado com datas próprias, laboratório/observação; solicitação geral separada quando aprovada. Não reinterpretar resultados. Uma seção/formulário por módulo; revisão lista todos os campos.

**Dependências/decisões:** 7B-E1B aceito; infraestrutura 7D-R1/R4/R6; P-01.

**Trabalho por camada:** Frontend: formulário, revisão, lista/detalhe paginados e estados; não adicionar campo editável antes de destino HTTP.

**Aceite — cenário principal e falhas:** Duas sorologias permanecem distintas, data de descoberta não muda; método genérico tem identificação; desconhecido/ausente preservados. Confirmar uma vez, reler; cancelar/falha preservam rascunho e consulta de origem; perfil consulta só lê.

**Validação/evidência e conclusão:** VF. Valores discriminantes na revisão/payload/releitura, captura e caso de falha pertinente; todos os RQ do módulo exercitados ou pendência individual registrada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e2b"></a>

#### 7B-E2B — Publicar contrato de condição e complicações

**Estado e cobertura:** Planejado; não aceito. RQ-CON-01–10 (telas/elementos na matriz).

**Escopo:** Forma clínica/cardíaca/digestiva, classificação e sintomas/regurgitação/constipação/disfagia/dor/dispneia; sem classificação automática.

**Dependências/decisões:** P-01 para prioridade; campos/modelo físico e fontes clínicas examinados antes do DTO; D2–D5 quando pertinentes.

**Trabalho por camada:** Backend: contrato de consulta/criação específico, autorização por paciente/atendimento e transação. Dados: reutilização ou nova migration incremental justificada; nenhuma inferência para preencher legado.

**Aceite — cenário principal e falhas:** Condição/sintomas preenchidos deixam de ser descartados; alternância de opção não apaga silenciosamente dado anterior; sem inferência a partir de sintoma. GET/POST sem vínculo recebe recusa; falha de filho reverte a operação correspondente.

**Validação/evidência e conclusão:** VB. DTO/semântica aprovados e integração HTTP/SQL com dois episódios/consultas, null, inválido, rollback e guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e2u"></a>

#### 7B-E2U — Registrar e consultar condição e complicações

**Estado e cobertura:** Planejado; não aceito. RQ-CON-01–11 (telas/elementos na matriz).

**Escopo:** Forma clínica/cardíaca/digestiva, classificação e sintomas/regurgitação/constipação/disfagia/dor/dispneia; sem classificação automática. Uma seção/formulário por módulo; revisão lista todos os campos.

**Dependências/decisões:** 7B-E2B aceito; infraestrutura 7D-R1/R4/R6; P-01.

**Trabalho por camada:** Frontend: formulário, revisão, lista/detalhe paginados e estados; não adicionar campo editável antes de destino HTTP.

**Aceite — cenário principal e falhas:** Condição/sintomas preenchidos deixam de ser descartados; alternância de opção não apaga silenciosamente dado anterior; sem inferência a partir de sintoma. Confirmar uma vez, reler; cancelar/falha preservam rascunho e consulta de origem; perfil consulta só lê.

**Validação/evidência e conclusão:** VF. Valores discriminantes na revisão/payload/releitura, captura e caso de falha pertinente; todos os RQ do módulo exercitados ou pendência individual registrada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e3b"></a>

#### 7B-E3B — Publicar contrato de comorbidades

**Estado e cobertura:** Planejado; não aceito. RQ-ATD-11; RQ-COM-01–02 (telas/elementos na matriz).

**Escopo:** Hipertensão/diabetes e histórico de doença familiar separados do rastreio de exames; representação triestado e observações.

**Dependências/decisões:** P-01 para prioridade; campos/modelo físico e fontes clínicas examinados antes do DTO; D2–D5 quando pertinentes.

**Trabalho por camada:** Backend: contrato de consulta/criação específico, autorização por paciente/atendimento e transação. Dados: reutilização ou nova migration incremental justificada; nenhuma inferência para preencher legado.

**Aceite — cenário principal e falhas:** Negativo, desconhecido e ausente não se confundem; resultado de familiar não vira histórico de doença; duas consultas mantêm snapshots distintos. GET/POST sem vínculo recebe recusa; falha de filho reverte a operação correspondente.

**Validação/evidência e conclusão:** VB. DTO/semântica aprovados e integração HTTP/SQL com dois episódios/consultas, null, inválido, rollback e guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e3u"></a>

#### 7B-E3U — Registrar e consultar comorbidades

**Estado e cobertura:** Planejado; não aceito. RQ-ATD-11; RQ-COM-01–02 (telas/elementos na matriz).

**Escopo:** Hipertensão/diabetes e histórico de doença familiar separados do rastreio de exames; representação triestado e observações. Uma seção/formulário por módulo; revisão lista todos os campos.

**Dependências/decisões:** 7B-E3B aceito; infraestrutura 7D-R1/R4/R6; P-01.

**Trabalho por camada:** Frontend: formulário, revisão, lista/detalhe paginados e estados; não adicionar campo editável antes de destino HTTP.

**Aceite — cenário principal e falhas:** Negativo, desconhecido e ausente não se confundem; resultado de familiar não vira histórico de doença; duas consultas mantêm snapshots distintos. Confirmar uma vez, reler; cancelar/falha preservam rascunho e consulta de origem; perfil consulta só lê.

**Validação/evidência e conclusão:** VF. Valores discriminantes na revisão/payload/releitura, captura e caso de falha pertinente; todos os RQ do módulo exercitados ou pendência individual registrada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e4b"></a>

#### 7B-E4B — Publicar contrato de eventos, dispositivos e óbito

**Estado e cobertura:** Planejado; não aceito. RQ-EVT-01–08 (telas/elementos na matriz).

**Escopo:** AVC prévio, marcapasso/CDI/resincronizador e óbito/causa/data/precisão; escolher contrato clínico antes de campo inferido.

**Dependências/decisões:** P-01 para prioridade; campos/modelo físico e fontes clínicas examinados antes do DTO; D2–D5 quando pertinentes.

**Trabalho por camada:** Backend: contrato de consulta/criação específico, autorização por paciente/atendimento e transação. Dados: reutilização ou nova migration incremental justificada; nenhuma inferência para preencher legado.

**Aceite — cenário principal e falhas:** Fato/data parcial preservados sem fabricar dia ou diagnóstico; controles preenchidos persistem e aparecem na consulta de origem; negativo não apaga histórico. GET/POST sem vínculo recebe recusa; falha de filho reverte a operação correspondente.

**Validação/evidência e conclusão:** VB. DTO/semântica aprovados e integração HTTP/SQL com dois episódios/consultas, null, inválido, rollback e guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e4u"></a>

#### 7B-E4U — Registrar e consultar eventos, dispositivos e óbito

**Estado e cobertura:** Planejado; não aceito. RQ-EVT-01–08 (telas/elementos na matriz).

**Escopo:** AVC prévio, marcapasso/CDI/resincronizador e óbito/causa/data/precisão; escolher contrato clínico antes de campo inferido. Uma seção/formulário por módulo; revisão lista todos os campos.

**Dependências/decisões:** 7B-E4B aceito; infraestrutura 7D-R1/R4/R6; P-01.

**Trabalho por camada:** Frontend: formulário, revisão, lista/detalhe paginados e estados; não adicionar campo editável antes de destino HTTP.

**Aceite — cenário principal e falhas:** Fato/data parcial preservados sem fabricar dia ou diagnóstico; controles preenchidos persistem e aparecem na consulta de origem; negativo não apaga histórico. Confirmar uma vez, reler; cancelar/falha preservam rascunho e consulta de origem; perfil consulta só lê.

**Validação/evidência e conclusão:** VF. Valores discriminantes na revisão/payload/releitura, captura e caso de falha pertinente; todos os RQ do módulo exercitados ou pendência individual registrada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e5b"></a>

#### 7B-E5B — Publicar contrato de medicamentos por atendimento

**Estado e cobertura:** Planejado; não aceito. RQ-FIC-15; RQ-TRA-14–21; RQ-BZN-09–20 (telas/elementos na matriz).

**Escopo:** Princípio ativo/identificação, apresentação/dose/unidade/frequência/via, início/fim/status/origem e observações, sem sugerir prescrição.

**Dependências/decisões:** P-01 para prioridade; campos/modelo físico e fontes clínicas examinados antes do DTO; D2–D5 quando pertinentes.

**Trabalho por camada:** Backend: contrato de consulta/criação específico, autorização por paciente/atendimento e transação. Dados: reutilização ou nova migration incremental justificada; nenhuma inferência para preencher legado.

**Aceite — cenário principal e falhas:** Dois itens identificados e todas as propriedades preenchidas reaparecem no atendimento; datas incompatíveis são recusadas por regra aprovada; nenhum cálculo de dose. GET/POST sem vínculo recebe recusa; falha de filho reverte a operação correspondente.

**Validação/evidência e conclusão:** VB. DTO/semântica aprovados e integração HTTP/SQL com dois episódios/consultas, null, inválido, rollback e guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e5u"></a>

#### 7B-E5U — Registrar e consultar medicamentos por atendimento

**Estado e cobertura:** Planejado; não aceito. RQ-FIC-15; RQ-TRA-14–21; RQ-BZN-09–20 (telas/elementos na matriz).

**Escopo:** Princípio ativo/identificação, apresentação/dose/unidade/frequência/via, início/fim/status/origem e observações, sem sugerir prescrição. Uma seção/formulário por módulo; revisão lista todos os campos.

**Dependências/decisões:** 7B-E5B aceito; infraestrutura 7D-R1/R4/R6; P-01.

**Trabalho por camada:** Frontend: formulário, revisão, lista/detalhe paginados e estados; não adicionar campo editável antes de destino HTTP.

**Aceite — cenário principal e falhas:** Dois itens identificados e todas as propriedades preenchidas reaparecem no atendimento; datas incompatíveis são recusadas por regra aprovada; nenhum cálculo de dose. Confirmar uma vez, reler; cancelar/falha preservam rascunho e consulta de origem; perfil consulta só lê.

**Validação/evidência e conclusão:** VF. Valores discriminantes na revisão/payload/releitura, captura e caso de falha pertinente; todos os RQ do módulo exercitados ou pendência individual registrada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e6b"></a>

#### 7B-E6B — Publicar contrato de resultados de exames identificados

**Estado e cobertura:** Planejado; não aceito. RQ-EXA-07–13, 16 (telas/elementos na matriz).

**Escopo:** Status/datas do exame e parâmetros valor/unidade/referência/interpretação textual humana; complementar H6 sem calcular diagnóstico.

**Dependências/decisões:** P-01 para prioridade; campos/modelo físico e fontes clínicas examinados antes do DTO; D2–D5 quando pertinentes.

**Trabalho por camada:** Backend: contrato de consulta/criação específico, autorização por paciente/atendimento e transação. Dados: reutilização ou nova migration incremental justificada; nenhuma inferência para preencher legado.

**Aceite — cenário principal e falhas:** Solicitado sem resultado/data é válido; genérico precisa de identificação; resultado não é inferido; dois parâmetros mantêm valor/unidade/referência separados. GET/POST sem vínculo recebe recusa; falha de filho reverte a operação correspondente.

**Validação/evidência e conclusão:** VB. DTO/semântica aprovados e integração HTTP/SQL com dois episódios/consultas, null, inválido, rollback e guard. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e6u"></a>

#### 7B-E6U — Registrar e consultar resultados de exames identificados

**Estado e cobertura:** Planejado; não aceito. RQ-EXA-07–13, 16 (telas/elementos na matriz).

**Escopo:** Status/datas do exame e parâmetros valor/unidade/referência/interpretação textual humana; complementar H6 sem calcular diagnóstico. Uma seção/formulário por módulo; revisão lista todos os campos.

**Dependências/decisões:** 7B-E6B aceito; infraestrutura 7D-R1/R4/R6; P-01.

**Trabalho por camada:** Frontend: formulário, revisão, lista/detalhe paginados e estados; não adicionar campo editável antes de destino HTTP.

**Aceite — cenário principal e falhas:** Solicitado sem resultado/data é válido; genérico precisa de identificação; resultado não é inferido; dois parâmetros mantêm valor/unidade/referência separados. Confirmar uma vez, reler; cancelar/falha preservam rascunho e consulta de origem; perfil consulta só lê.

**Validação/evidência e conclusão:** VF. Valores discriminantes na revisão/payload/releitura, captura e caso de falha pertinente; todos os RQ do módulo exercitados ou pendência individual registrada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e7b"></a>

#### 7B-E7B — Publicar correções independentes de filhos do atendimento

**Estado e cobertura:** Planejado; não aceito. RQ-EXA-15; RQ-ACO-48 (telas/elementos na matriz).

**Escopo:** E7B.1 avaliação, E7B.2 diagnóstico, E7B.3 exame independente e E7B.4 rastreio/resultados. Quatro contratos/unidades separados; criação de exame independente é E7B.3. Não alterar PATCH de núcleo implicitamente.

**Dependências/decisões:** P-01/P-03; H4–H6; 7B-R1B para familiares. Definir versionamento/auditoria de cada recurso.

**Trabalho por camada:** Backend/dados por unidade: consulta/criação quando necessária e correção versionada no recurso existente, guard/atomicidade e história preservada.

**Aceite — cenário principal e falhas:** Cada unidade altera só o recurso selecionado; versão obsoleta retorna 409 sem sobrescrever, vínculo recusado não grava. Correção não cria atendimento duplicado nem perde filhos; criar exame novo é intenção distinta.

**Validação/evidência e conclusão:** VB. Quatro unidades aceitas individualmente com concorrência/rollback e IDs antes/depois; agregado depende das quatro. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7b-e7u"></a>

#### 7B-E7U — Editar o filho correto mantendo a consulta original

**Estado e cobertura:** Planejado; não aceito. RQ-EXA-15; RQ-ACO-48 (telas/elementos na matriz).

**Escopo:** E7U.1 avaliação, E7U.2 diagnóstico, E7U.3 exame e E7U.4 familiares, separadamente; original/rascunho/atual comparáveis.

**Dependências/decisões:** 7B-E7B unidade correspondente; 7D-R1/R4/R6.

**Trabalho por camada:** Frontend: ações na área/detalhe correto, formulário específico e comparação de conflito; não chamar PATCH núcleo de edição integral.

**Aceite — cenário principal e falhas:** Em cada unidade correção relida no mesmo atendimento; 409 permite comparar/descarte sem reaplicar; formulário anterior não contamina outro filho; cancelar não escreve.

**Validação/evidência e conclusão:** VF. Cenário de correção e conflito por unidade; snapshots e IDs de recurso/atendimento. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e1b"></a>

#### 7C-E1B — Corrigir BZN e acrescentar reação ao canônico — contrato

**Estado e cobertura:** Planejado; não aceito. RQ-TRA-12–13 (telas/elementos na matriz).

**Escopo:** E1.1 correção versionada de tratamento; E1.2 criação de reação isolada. Duas unidades separadas, nunca segundo tratamento.

**Dependências/decisões:** H8; P-01/P-03; D6/D7; 7D-R5.

**Trabalho por camada:** Backend/dados: DTO/versão, guard, conflito e persistência específica; avaliar auditoria existente e migration incremental mínima se necessária.

**Aceite — cenário principal e falhas:** E1.1 versão obsoleta não sobrescreve; E1.2 duas reações intencionais têm IDs distintos e tratamento único; evento adverso permanece texto sem escala inferida. Sem vínculo não grava e rollback preserva recurso.

**Validação/evidência e conclusão:** VB. Integração por unidade, duas sessões/versões, ID e campos não alterados; aceite separado por unidade. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e1u"></a>

#### 7C-E1U — Corrigir BZN e acrescentar reação ao canônico — interface

**Estado e cobertura:** Planejado; não aceito. RQ-TRA-12–13 (telas/elementos na matriz).

**Escopo:** E1.1 correção versionada de tratamento; E1.2 criação de reação isolada. Duas unidades separadas, nunca segundo tratamento.

**Dependências/decisões:** 7C-E1B unidade correspondente; recuperação 7D-R1/R4/R6.

**Trabalho por camada:** Frontend: carregamento do recurso, edição/revisão, comparação e recibo; nenhuma criação duplicada como correção.

**Aceite — cenário principal e falhas:** E1.1 versão obsoleta não sobrescreve; E1.2 duas reações intencionais têm IDs distintos e tratamento único; evento adverso permanece texto sem escala inferida. Cancelar/comparar só lê; confirmação é explícita e uma falha mantém intenção.

**Validação/evidência e conclusão:** VF. Cenário positivo e conflito por unidade, releitura do ID original e revisão visual. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e2b"></a>

#### 7C-E2B — Corrigir encaminhamento existente — contrato

**Estado e cobertura:** Planejado; não aceito. RQ-ECR-16 (telas/elementos na matriz).

**Escopo:** Campos/documento/datas/status do encaminhamento selecionado, versão e preservação de contrarreferências; upload fora desta unidade.

**Dependências/decisões:** H10; P-01/P-03.

**Trabalho por camada:** Backend/dados: DTO/versão, guard, conflito e persistência específica; avaliar auditoria existente e migration incremental mínima se necessária.

**Aceite — cenário principal e falhas:** Correção mantém ID e episódios filhos; 409 não sobrescreve; tipo/projeto inativo recusado na nova seleção, legado permanece consultável. Sem vínculo não grava e rollback preserva recurso.

**Validação/evidência e conclusão:** VB. Integração por unidade, duas sessões/versões, ID e campos não alterados; aceite separado por unidade. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e2u"></a>

#### 7C-E2U — Corrigir encaminhamento existente — interface

**Estado e cobertura:** Planejado; não aceito. RQ-ECR-16 (telas/elementos na matriz).

**Escopo:** Campos/documento/datas/status do encaminhamento selecionado, versão e preservação de contrarreferências; upload fora desta unidade.

**Dependências/decisões:** 7C-E2B unidade correspondente; recuperação 7D-R1/R4/R6.

**Trabalho por camada:** Frontend: carregamento do recurso, edição/revisão, comparação e recibo; nenhuma criação duplicada como correção.

**Aceite — cenário principal e falhas:** Correção mantém ID e episódios filhos; 409 não sobrescreve; tipo/projeto inativo recusado na nova seleção, legado permanece consultável. Cancelar/comparar só lê; confirmação é explícita e uma falha mantém intenção.

**Validação/evidência e conclusão:** VF. Cenário positivo e conflito por unidade, releitura do ID original e revisão visual. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e4b"></a>

#### 7C-E4B — Detectar concorrência em projeto e notificação — contrato

**Estado e cobertura:** Planejado; não aceito. RQ-PRO-10; RQ-NOT-05 (telas/elementos na matriz).

**Escopo:** E4.1 upsert projeto; E4.2 notificação canônica. Duas unidades de versionamento/baseline e comparação; manter atualização parcial.

**Dependências/decisões:** H7/H11; P-03; avaliar compatibilidade dos PUT existentes.

**Trabalho por camada:** Backend/dados: DTO/versão, guard, conflito e persistência específica; avaliar auditoria existente e migration incremental mínima se necessária.

**Aceite — cenário principal e falhas:** Dois escritores: versão obsoleta recusada, campos não enviados preservados; indicador nulo não vira não; alteração de texto não limpa outros campos. Sem vínculo não grava e rollback preserva recurso.

**Validação/evidência e conclusão:** VB. Integração por unidade, duas sessões/versões, ID e campos não alterados; aceite separado por unidade. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e4u"></a>

#### 7C-E4U — Detectar concorrência em projeto e notificação — interface

**Estado e cobertura:** Planejado; não aceito. RQ-PRO-10; RQ-NOT-05 (telas/elementos na matriz).

**Escopo:** E4.1 upsert projeto; E4.2 notificação canônica. Duas unidades de versionamento/baseline e comparação; manter atualização parcial.

**Dependências/decisões:** 7C-E4B unidade correspondente; recuperação 7D-R1/R4/R6.

**Trabalho por camada:** Frontend: carregamento do recurso, edição/revisão, comparação e recibo; nenhuma criação duplicada como correção.

**Aceite — cenário principal e falhas:** Dois escritores: versão obsoleta recusada, campos não enviados preservados; indicador nulo não vira não; alteração de texto não limpa outros campos. Cancelar/comparar só lê; confirmação é explícita e uma falha mantém intenção.

**Validação/evidência e conclusão:** VF. Cenário positivo e conflito por unidade, releitura do ID original e revisão visual. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e5d"></a>

#### 7C-E5D — Decidir destino de planejamento/desfecho D9

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-47, 50–57 (telas/elementos na matriz).

**Escopo:** Distinguir data/tipo/status de retorno futuro do comparecimento efetivo; decidir preservação/exibição e eventual retirada funcional do legado.

**Dependências/decisões:** P-06/D9 pendente; fontes clínicas vigentes. Não remover campo por opinião do protótipo.

**Trabalho por camada:** Documentação: escolha clínica e modelo/contrato propostos, incluindo precisão e migração/preservação de legado.

**Aceite — cenário principal e falhas:** Decisão humana registrada com exemplos de futuro, visita realizada e ano informado; nenhuma regra implícita de 30/60 dias; legado tem destino explícito.

**Validação/evidência e conclusão:** VD. Resposta/decisão e impacto na matriz/contrato, antes de B/U. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e5b"></a>

#### 7C-E5B — Publicar planejamento de retorno conforme decisão D9

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-47, 50–57 (telas/elementos na matriz).

**Escopo:** Operação de planejamento distinta do retorno efetivamente realizado; recurso/precisão/correção somente conforme E5D.

**Dependências/decisões:** 7C-E5D aprovado; P-01 para prioridade.

**Trabalho por camada:** Backend/dados: reutilizar modelo aprovado ou novo incremento, DTO/guard/versão; sem migrar fatos como visitas fictícias.

**Aceite — cenário principal e falhas:** Plano futuro permanece separado da visita e do ano; legado não é perdido; recusa/rollback não altera retorno real; GET distingue plano e fato.

**Validação/evidência e conclusão:** VB. Casos definidos pela decisão, autorização, concorrência e preservação do legado. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="7c-e5u"></a>

#### 7C-E5U — Consultar e registrar planejamento separado de visitas

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-47, 50–57 (telas/elementos na matriz).

**Escopo:** Formulário e lista de planos com status e resumo aprovados; acesso a retornos reais por seção distinta.

**Dependências/decisões:** 7C-E5B aceito; 7D-R1/R4/R6.

**Trabalho por camada:** Frontend: rotular Planejado/Realizado/ano informado pela semântica, revisão e ações próprias.

**Aceite — cenário principal e falhas:** Usuário identifica plano futuro e retorno efetivo sem confusão; cancelar não gera visita; falha preserva rascunho; histórico identifica precisão.

**Validação/evidência e conclusão:** VF. Roteiro de plano e visita real, fontes/IDs e captura revisada com equipe. Concluir somente pela condição comum acima e pelos critérios desta unidade.

### Complementos vinculados à Etapa 8

<a id="8a1"></a>

#### 8A1 — Baixar CSV real da página de pacientes

**Estado e cobertura:** Planejado; não aceito. RQ-DAS-12–17; RQ-EST-17 (telas/elementos na matriz).

**Escopo:** ID/nome com filtros/página atuais e aviso de escopo; sem relatório do dashboard/exportação completa.

**Dependências/decisões:** H16 publicado; Etapa 7 aceita; P-05 para manter política dos três perfis.

**Trabalho por camada:** Frontend: ação de download, nome de arquivo, carga/erro/sucesso só após arquivo recebido; backend existente preservado.

**Aceite — cenário principal e falhas:** Arquivo tem exatamente a página/filtros autorizados, acentos corretos e fórmulas neutralizadas. Consulta/edição/admin seguem H16; 403/rede não dão toast de download concluído nem arquivo indevido.

**Validação/evidência e conclusão:** VF. Arquivo sintético comparado à página e caso de fórmula/403; nenhum dado real no Git. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8a2d"></a>

#### 8A2D — Definir fila operacional e responsabilidade de revisão

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-04; RQ-HOM-21; RQ-PEN-01–03, 05–06, 09–18 (telas/elementos na matriz).

**Escopo:** Separar pendências assistenciais de inconsistências de importação, ou agrupá-las com distinção; definir filtros/status/origem/período, revisão e responsabilidade.

**Dependências/decisões:** P-04; D11; H12/H14 e autorização por fonte/paciente.

**Trabalho por camada:** Documentação: vocabulário e decisão de produto, permissões, população dos contadores e retenção da revisão.

**Aceite — cenário principal e falhas:** Toda pendência/inconsistência possui destino e regra de acesso/decisão; texto livre não é classificado automaticamente; nenhum responsável presumido de dado legado.

**Validação/evidência e conclusão:** VD. Decisão/fluxo com exemplos e casos de visibilidade, antes de B/U. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8a2b"></a>

#### 8A2B — Consultar fila global autorizada sem varrer pacientes

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-04; RQ-HOM-10, 12, 21; RQ-PEN-01–06 (telas/elementos na matriz).

**Escopo:** Consulta agregada paginada, filtros aprovados e contadores por estado/escopo; projeção sanitizada e autorização antes da paginação.

**Dependências/decisões:** 8A2D; P-04; H12/H14 não fornecem fila global hoje.

**Trabalho por camada:** Backend: DTO/projeção e queries parametrizadas; dados/índices somente com evidência de necessidade, sem interpretar texto.

**Aceite — cenário principal e falhas:** Conjunto conhecido com dois pacientes/vínculos: linhas e contadores só do escopo autorizado; filtros/período coerentes, estado desconhecido distinto; sem N+1 de toda população e sem JSONB bruto.

**Validação/evidência e conclusão:** VB. HTTP/SQL com população conhecida, paginação/contadores e perfis sem visibilidade cruzada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8a2u"></a>

#### 8A2U — Encontrar e abrir pendência da fila preservando filtros

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-04; RQ-HOM-10, 12, 21; RQ-PEN-01–07 (telas/elementos na matriz).

**Escopo:** Lista/contadores/filtros da fila e Abrir contexto; registro de decisão fica para 8A3U.

**Dependências/decisões:** 8A2B aceito; 7D-R1; P-04.

**Trabalho por camada:** Frontend: rota, menu conforme capacidade, URL filtros/página, tabela acessível, estado vazio/erro.

**Aceite — cenário principal e falhas:** Filtro leva ao item certo; abrir pessoa/consulta e voltar conserva fila. Falha de contador não vira zero; sem autorização não aparece conteúdo antigo.

**Validação/evidência e conclusão:** VF. Roteiro de filtros/detalhe/voltar, contagem conhecida, 403 e teclado/390 px. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8a3b"></a>

#### 8A3B — Registrar revisão auditável de pendência

**Estado e cobertura:** Planejado; não aceito. RQ-PEN-08, 10–23 (telas/elementos na matriz).

**Escopo:** Nota de revisão separada de observação original, ator/data/status e controle de concorrência; sem classificar texto ou editar origem.

**Dependências/decisões:** 8A2D/P-04; P-03 para concorrência; avaliar H12 e 7C-R2B.

**Trabalho por camada:** Backend/dados: DTO/versionamento e registro de decisão autorizada; reaproveitar auditoria ou migration nova justificada.

**Aceite — cenário principal e falhas:** Duas revisões concorrentes não apagam decisão; nota não sobrescreve fato/observação original; ator vem da sessão, resolvida exige data, null conforme contrato aprovado; recusas não gravam.

**Validação/evidência e conclusão:** VB. Histórico antes/depois, dois escritores, autoria/versão e autorização. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8a3u"></a>

#### 8A3U — Revisar pendência com fato original e decisão visíveis

**Estado e cobertura:** Planejado; não aceito. RQ-PEN-08–23; RQ-EST-17 (telas/elementos na matriz).

**Escopo:** Modal/página com contexto, descrição atual, nota/responsável/data somente aprovados, status e confirmar/cancelar; retorno à fila ou pessoa.

**Dependências/decisões:** 8A3B; 8A2U quando vindo da fila; recuperação 7D.

**Trabalho por camada:** Frontend: leitura da decisão anterior, formulário e comparação; diálogo acessível e recibo.

**Aceite — cenário principal e falhas:** Revisor distingue fato de nota e conhece paciente/consulta; cancelamento/fechar não grava; sucesso relido; 409/403/resposta perdida recuperáveis sem duplicar decisão.

**Validação/evidência e conclusão:** VF. Revisão pela UI com histórico/recibo, foco do diálogo e caso de concorrência. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b1d"></a>

#### 8B1D — Aprovar métricas e semântica de período

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-06; RQ-HOM-01–05, 13–20; RQ-RES-29; RQ-DAS-01–11 (telas/elementos na matriz).

**Escopo:** Definir pacientes cadastrados, atendimentos, pendências abertas e lotes, população/perfil/período; definir origem/projeto/completude ou manter sem exibição.

**Dependências/decisões:** P-05; Etapa 7 aceita; não criar score clínico.

**Trabalho por camada:** Documentação: fórmula/tempo/denominador, casos conhecidos e regras de sobreposição. KPI não deriva de páginas parciais.

**Aceite — cenário principal e falhas:** Exemplo numérico reproduz cada métrica e efeito do filtro; zero/falha distintos; projetos sobrepostos não somam população; completude só se houver regra aprovada.

**Validação/evidência e conclusão:** VD. Tabela de definições e fixture com resultados esperados, aprovada antes de B/U. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b1b"></a>

#### 8B1B — Publicar os quatro indicadores operacionais aprovados

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-06; RQ-HOM-02–05; RQ-DAS-01–11 (telas/elementos na matriz).

**Escopo:** Agregado de quatro KPIs, definição/período e população autorizada; série/gráficos e atividade recente em 8B2.

**Dependências/decisões:** 8B1D; P-05.

**Trabalho por camada:** Backend: consulta agregada com autorização antes do cálculo, DTO explícito; sem endpoint genérico de banco.

**Aceite — cenário principal e falhas:** Resultados iguais à fixture aprovada nos períodos e três perfis; nenhuma soma de páginas; falta de acesso/serviço é erro e não zero; dado bruto não aparece.

**Validação/evidência e conclusão:** VB. Contrato e integração com contagens esperadas, período e dois escopos de acesso. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b1u"></a>

#### 8B1U — Exibir KPIs com período, definição e estados honestos

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-06; RQ-HOM-01–05; RQ-DAS-01–11 (telas/elementos na matriz).

**Escopo:** Quatro cards e filtro aprovado no Início/dashboard, legenda de definição; nenhum gráfico ainda.

**Dependências/decisões:** 8B1B; 8B1D; P-05.

**Trabalho por camada:** Frontend: leitura de agregado, período na URL, vazio/falha/carga e tabela/descrição acessível.

**Aceite — cenário principal e falhas:** Mudança de período só afeta KPIs definidos; erro não aparece como zero; estado sem dados é identificável; foco/teclado e 390 px operáveis.

**Validação/evidência e conclusão:** VF. Captura com resultados da fixture, troca de período e falha; comparação com API agregada. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b2b"></a>

#### 8B2B — Publicar atividade recente e séries autorizadas em unidades separadas

**Estado e cobertura:** Planejado; não aceito. RQ-HOM-11, 13–20; RQ-RES-29–30; RQ-HIS-03–04, 11; RQ-DAS-01–11 (telas/elementos na matriz).

**Escopo:** B2.1 últimas consultas/pendências com links/fontes; B2.2 série mensal de atendimentos; B2.3 origem/projetos e timeline integrada apenas se semântica aprovada. Cada projeção é uma unidade, não uma query clínica universal.

**Dependências/decisões:** 8B1D/P-05; 8B1B para período; P-04 para fila. B2.3 pode suceder B2.1/B2.2, mas é obrigatório no produto completo após definição semântica.

**Trabalho por camada:** Backend: DTO/queries paginadas ou agregadas específicos, autorização e precisão/proveniência; sem classificar consulta completa automaticamente.

**Aceite — cenário principal e falhas:** Cada unidade bate com fixture/IDs conhecidos; ordenação/limite explícitos; sobreposição de projeto não duplica população; origem não confunde diagnóstico/proveniência; sem acesso cruzado.

**Validação/evidência e conclusão:** VB. Aceite individual B2.1/B2.2/B2.3 com dados/contagens esperados e guard; B2.3 bloqueada até definição. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b2u"></a>

#### 8B2U — Abrir atividade recente e interpretar séries com tabela equivalente

**Estado e cobertura:** Planejado; não aceito. RQ-HOM-11, 13–20; RQ-RES-29–30; RQ-HIS-03–04, 11; RQ-DAS-01–11 (telas/elementos na matriz).

**Escopo:** U2.1 recentes no Início; U2.2 gráfico mensal+tabela; U2.3 gráficos origem/projeto e timeline integrada após contrato. Mesmo particionamento de B2.

**Dependências/decisões:** 8B2B unidade correspondente; 7D-R1; P-05.

**Trabalho por camada:** Frontend: gráfico sem score, tooltip/legenda acessíveis, link para consulta/pendência exatos e tabela de valores; cada unidade aceita sozinha.

**Aceite — cenário principal e falhas:** Recentes abrem contexto exato; série equivale à tabela e filtro; falha não renderiza dado antigo/zero; vazio e itens fora do escopo explícitos; teclado permite ler sem tooltip de mouse.

**Validação/evidência e conclusão:** VF. Captura e valores/links por unidade, caso vazio/erro e revisão humana de interpretação. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b3d"></a>

#### 8B3D — Decidir busca, colunas e origem de negócio

**Estado e cobertura:** Planejado; não aceito. RQ-LIS-02–05, 13–21; RQ-CAD-03, 20, 25–30; RQ-FIC-02, 05; RQ-RES-02; RQ-ATD-20 (telas/elementos na matriz).

**Escopo:** Código de pessoa, nascimento, origem, projeto/período, última consulta e procedência; definir o que é filtro, dado clínico e proveniência.

**Dependências/decisões:** P-05; fontes clínicas e H2/H3/H5. Não derivar origem de hasChagas.

**Trabalho por camada:** Documentação: dicionário/projeção e busca prévia ampliada, precisão de nascimento e política do código.

**Aceite — cenário principal e falhas:** Cada coluna/filtro tem fonte/regra e exemplo de desconhecido; código do protótipo não é gerado ficticiamente; decisão distingue proveniência de condição clínica.

**Validação/evidência e conclusão:** VD. Dicionário e seleção de primeira expansão, sem exigir todos os filtros de uma vez. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b3b"></a>

#### 8B3B — Ampliar projeção de pacientes por fatias aprovadas

**Estado e cobertura:** Planejado; não aceito. RQ-LIS-02–05, 13–21; RQ-CAD-03, 09, 20, 25–30; RQ-FIC-02, 05; RQ-RES-02; RQ-ATD-20 (telas/elementos na matriz).

**Escopo:** B3.1 código/nascimento/idade e busca; B3.2 origem/proveniência; B3.3 projeto/período/última consulta. Três contratos/unidades de expansão, compatíveis com busca atual.

**Dependências/decisões:** 8B3D; P-05; idade D1 calculada com referência.

**Trabalho por camada:** Backend/dados: DTO e queries de lista autorizadas, sem buscar cada ficha na UI; novo índice/modelo só justificado.

**Aceite — cenário principal e falhas:** Cada unidade: filtro antes da paginação, campos corretos e null/precisão preservados; idade usa referência declarada, procedência sanitizada; três perfis só veem seu conjunto.

**Validação/evidência e conclusão:** VB. Aceite separado B3.1/B3.2/B3.3 com paginação, fonte dos campos e casos de homônimo/autorização. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8b3u"></a>

#### 8B3U — Usar tabela ampliada e atalhos por pessoa

**Estado e cobertura:** Planejado; não aceito. RQ-LIS-02–05, 09–10, 13–21; RQ-CAD-03, 09, 20, 25–30; RQ-FIC-02, 05; RQ-RES-02; RQ-ATD-20 (telas/elementos na matriz).

**Escopo:** U3.1 tabela/busca código/nascimento; U3.2 origem/proveniência; U3.3 projeto/período/última consulta; U3.4 Editar/Novo atendimento diretos com nome/ID e capacidade. Quatro unidades separadas.

**Dependências/decisões:** 8B3B unidade correspondente; U3.4 pode usar H3/rotas atuais sem depender das novas colunas; P-05.

**Trabalho por camada:** Frontend: filtros em URL, colunas/tabela responsiva, estados e ações reais por perfil, preservando busca ao voltar.

**Aceite — cenário principal e falhas:** Cada filtro/coluna coincide com contrato; não simula total de páginas; Editar abre edição e Novo atendimento abre a pessoa correta. Vazio/falha não afirmam inexistência; teclado/320 px alcançam ações.

**Validação/evidência e conclusão:** VF. Roteiro/captura por unidade e ID de destino/payload, sem N+1 de fichas. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c1"></a>

#### 8C1 — Consultar lotes e linhas sanitizados pela interface

**Estado e cobertura:** Implementação técnica validada em ambiente sintético; pacote não aceito. RQ-NAV-05; RQ-IMP-01–11, 19–24 (telas/elementos na matriz). A revisão clínica humana da Etapa 7 continua pendente.

**Escopo:** Lista → detalhe → linhas/erros paginados e voltar; somente metadados já publicados. Não publicar arquivo/hash/candidatos/motivo bruto ausentes no DTO.

**Dependências/decisões:** H14/ADR-023; Etapa 7 aceita; ambiente sintético para provas. Sem necessidade de upload para este pacote.

**Trabalho por camada:** Frontend: rotas/menu conforme capacidades efetivas, paginação e códigos de erro compreensíveis. Backend existente reutilizado.

**Aceite — cenário principal e falhas:** Admin vê lotes ordinários; consulta/edição só com vínculo de todos os pacientes/proveniência íntegra. Segundo lote/página funciona; revised lot permanece fora da porta ordinária; 403 não deixa dados do lote anterior.

**Validação/evidência e conclusão:** VF. Lista/detalhe em três perfis com fixtures reais do runner e caso de proveniência/vínculo recusados. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c2b"></a>

#### 8C2B — Evoluir relatório de simulação e metadados por unidades

**Estado e cobertura:** Planejado; não aceito. RQ-IMP-01–24, 32, 36, 39, 42–51 (telas/elementos na matriz).

**Escopo:** C2B.1 contagens/códigos do dry-run e totais reais; C2B.2 arquivo/hash/versões sanitizados; C2B.3 candidatos de conflito com autorização. Três unidades; C2B.3 incluída no produto completo; decidir exposição mínima antes de implementar.

**Dependências/decisões:** H14; P-05 para metadados e P-04 para conflito. Dry-run atual mínimo permanece válido até incremento.

**Trabalho por camada:** Backend/importador: DTOs sanitizados do resultado do pipeline e projeção de lote; nunca devolver linha bruta/dados de pessoa não autorizada. Sem inferir sucesso pelo timer.

**Aceite — cenário principal e falhas:** C2B.1 contagens batem com fixture e simulação não grava nem consome sequência; C2B.2 valores reais e escopo; C2B.3 candidato só autorizado, ausência explicada sem vazamento. Reenvio informa lote efetivo.

**Validação/evidência e conclusão:** VI. Aceites separados com pipeline/HTTP/SQL, comparação de contagens/metadados e guard; nenhum XLSX real versionado. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c2u"></a>

#### 8C2U — Selecionar, simular e confirmar XLSX em unidades concluíveis

**Estado e cobertura:** Planejado; não aceito. RQ-HOM-09; RQ-IMP-01–51; RQ-EST-17 (telas/elementos na matriz).

**Escopo:** C2U.1 seleção real/finalidade/código/cancelar/dry-run mínimo; C2U.2 confirmação e lote efetivo; C2U.3 relatório rico/metadados; C2U.4 conflito autorizado. Quatro unidades; não bloquear U.1/U.2 pelo relatório ainda ausente.

**Dependências/decisões:** H14 para U.1/U.2; 8C1; C2B correspondente para U.3/U.4; P-04/P-05; recuperação de operação não reenvia importação cegamente.

**Trabalho por camada:** Frontend: File real multipart, estados por resposta, revisão/finalidade e confirmação única; sem porcentagem/count/log fictício.

**Aceite — cenário principal e falhas:** U.1 arquivo inválido/recusa não grava e troca/cancelar preserva escolha consciente; U.2 simular zero escrita, confirmar/reenvio mostra lote efetivo e recusa de arquivo alterado explica revisão; U.3 contagens/metadados reais; U.4 links sem exposição indevida. Resposta perdida mantém incerto e verifica lote/operação autorizados.

**Validação/evidência e conclusão:** VI. Roteiro separado por unidade com XLSX sintético/POST contados, lote relido e falhas; período/etapa não avançam por timer. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c3d"></a>

#### 8C3D — Decidir upload de contrarreferência

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-49 (telas/elementos na matriz).

**Escopo:** Documento versus estado, formatos/tamanho, armazenamento, retenção, metadados e autorização/download; inclusão aprovada no produto completo; representação e controles ainda precisam de decisão.

**Dependências/decisões:** P-07/D10; upload incluído em M3, mas formatos, retenção e autorização ainda precisam de definição.

**Trabalho por camada:** Documentação/arquitetura: representação e política de arquivos com ciclo de acesso/remoção.

**Aceite — cenário principal e falhas:** Decisão define anexado/recebido/pendente, erro de upload, retenção e escopo; upload não vira prova de cuidado realizado nem coluna improvisada.

**Validação/evidência e conclusão:** VD. Decisão aprovada e fluxo/contrato propostos; sem arquivos reais neste pacote. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c3b"></a>

#### 8C3B — Anexar e ler documento autorizado de contrarreferência

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-49 (telas/elementos na matriz).

**Escopo:** C3B.1 upload/metadados/associação; C3B.2 download/retirada conforme retenção aprovada. Duas unidades separadas; arquivo fora do Git.

**Dependências/decisões:** 8C3D/P-07; H10 e arquitetura de armazenamento.

**Trabalho por camada:** Backend/dados: validar formato/tamanho, storage e recurso/guard; migration incremental se necessária, sem substituir resumo clínico.

**Aceite — cenário principal e falhas:** Arquivo sintético ligado ao episódio correto; falha não apresenta anexo íntegro; download só autorizado; dois episódios não compartilham por engano; retirada mantém auditoria conforme decisão.

**Validação/evidência e conclusão:** VB. Integração de storage/HTTP e associação/guard por unidade, falha parcial e conteúdo sintético. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c3u"></a>

#### 8C3U — Associar e consultar anexo sem perder episódio

**Estado e cobertura:** Planejado; não aceito. RQ-ACO-49 (telas/elementos na matriz).

**Escopo:** C3U.1 selecionar/enviar/cancelar e status; C3U.2 download/retirada explícita. Duas unidades, resumo/conduta continuam próprios.

**Dependências/decisões:** 8C3B unidade correspondente; P-07; contexto 7D-R1.

**Trabalho por camada:** Frontend: upload real, progresso apenas verificável, erro/estado e links autorizados.

**Aceite — cenário principal e falhas:** Episódio correto mantém texto e anexo; cancelar não envia; falha permite verificar estado sem duplicar; arquivo disponível só após confirmação; acesso revogado não baixa.

**Validação/evidência e conclusão:** VF. Roteiro/capturas por unidade e ID de contrarreferência/anexo, cancelamento e falha de autorização. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c4d"></a>

#### 8C4D — Definir reprocessamento como novo elo explícito

**Estado e cobertura:** Planejado; não aceito. RQ-IMP-52–57 (telas/elementos na matriz).

**Escopo:** Separar reenvio idempotente, novo elo --reprocessar e revisão de hash diferente; decidir quem pode comandar/retomar e metadados necessários.

**Dependências/decisões:** P-09; semântica existente CLI/ADR-022/023.

**Trabalho por camada:** Documentação: desenho HTTP proposto compatível com proveniência/locks, confirmação e correlação da operação.

**Aceite — cenário principal e falhas:** Exemplos de três ações têm resultado e autorização distintos; clique não vira novo hash/novo elo automático; concorrência e resposta perdida têm prova de resultado.

**Validação/evidência e conclusão:** VD. Decisão/contrato e diagrama aprovados antes de B/U. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c4b"></a>

#### 8C4B — Publicar comando de novo elo com vínculo de proveniência

**Estado e cobertura:** Planejado; não aceito. RQ-IMP-52–57 (telas/elementos na matriz).

**Escopo:** Operação explícita de reprocessamento, consulta do elo/resultado e conflito; reutilizar invariantes CLI sem acrescentar flag tácita ao POST ordinário.

**Dependências/decisões:** 8C4D/P-09; 5B/5D aceitos; correlação/guard definidos.

**Trabalho por camada:** Backend/importador: DTO/worker, lock/idempotência da intenção e projeção encadeada; dados existentes preservados.

**Aceite — cenário principal e falhas:** Mesmo conteúdo produz um novo elo quando solicitado uma vez; reenvio ordinário não produz elo. Concorrência/resposta perdida não duplicam; sem autorização nada grava; proveniência permanece ligada.

**Validação/evidência e conclusão:** VI. HTTP/SQL com cadeia de dois elos e concorrência; comparação com invariantes CLI já validadas. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c4u"></a>

#### 8C4U — Confirmar novo elo e consultar cadeia de reprocessamento

**Estado e cobertura:** Planejado; não aceito. RQ-IMP-52–57; RQ-EST-17 (telas/elementos na matriz).

**Escopo:** Aviso do efeito/lote anterior, confirmar/cancelar, resultado/consulta da cadeia e retorno ao detalhe; outra ação para reenvio.

**Dependências/decisões:** 8C4B; 8C1; P-09.

**Trabalho por camada:** Frontend: ação por capacidade, revisão do efeito e consulta da operação, sem contadores simulados.

**Aceite — cenário principal e falhas:** Cancelar não envia; confirmar uma vez abre elo correto; resposta perdida só consulta resultado; outro hash direciona revisão temporal; usuário distingue lote anterior e efetivo.

**Validação/evidência e conclusão:** VI. Roteiro sintético com cadeia/contagem de comandos e resultado incerto, 403/409. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c5b"></a>

#### 8C5B — Permitir consulta e retomada de revisão temporal

**Estado e cobertura:** Planejado; não aceito. RQ-IMP-58 (telas/elementos na matriz).

**Escopo:** C5B.1 fonte/capacidades; C5B.2 proposta/decisão; C5B.3 aplicação/encerramento e resultado. Três unidades de leitura autorizada; POST existentes permanecem portas próprias.

**Dependências/decisões:** P-09/P-04; H15/ADR-022; entitlement de gestão separado de perfil e autorização de fonte.

**Trabalho por camada:** Backend: DTOs GET/capacidades e consulta de estado/correlação, sanitização e regras de acesso sem abrir artefato bruto.

**Aceite — cenário principal e falhas:** Cada unidade retoma processo no estado real; gestor sem autorização da fonte não lê conteúdo; não gestor não publica/aplica. Consulta nunca aplica decisão nem altera hash; estado incerto é verificável ou mantém bloqueio.

**Validação/evidência e conclusão:** VB. Aceites separados de leitura/guard e estados da revisão, usando invariantes F/T existentes onde correspondem. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8c5u"></a>

#### 8C5U — Percorrer revisão temporal em cinco unidades de interface

**Estado e cobertura:** Planejado; não aceito. RQ-IMP-58 (telas/elementos na matriz).

**Escopo:** C5U.1 fonte/autorização; C5U.2 arquivo e simulação; C5U.3 comparação/decisão seletiva; C5U.4 publicação/aplicação única; C5U.5 encerramento/retomada. Cinco unidades separadas, sem inventar nova visita por hash.

**Dependências/decisões:** 8C5B unidade de leitura correspondente e H15; P-09; não pressupor entitlement de administração.

**Trabalho por camada:** Frontend: telas por estado, ações/capacidades, confirmações e recibos; distinguir corrigir/nova visita/consolidado segundo contrato.

**Aceite — cenário principal e falhas:** U.1 escopo válido; U.2 dry-run sem escrita; U.3 decisão seletiva explícita; U.4 aplica uma vez; U.5 retoma/encerra estado correto. Em cada unidade revogação/conflito/resposta perdida não reaplicam nem perdem decisão confirmada.

**Validação/evidência e conclusão:** VI. Roteiro/evidência por unidade e fonte/hash/proposta/decisão/aplicação, todos sintéticos; cadeia e autorização reconciliadas. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8d1d"></a>

#### 8D1D — Decidir gestão de identidade e limites de administração

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-07; RQ-USR-01–10 (telas/elementos na matriz).

**Escopo:** Usuários e Minha conta, perfis, ativação/inativação, último administrador, autoalteração, suporte, auditabilidade e política institucional de vínculo.

**Dependências/decisões:** P-08; H1 e política sintética não equivalem a liberação real 9D.

**Trabalho por camada:** Documentação: regra de gestão e escopo de dados de identidade; gestão não concede entitlement temporal nem vínculo clínico por efeito lateral.

**Aceite — cenário principal e falhas:** Cada ação tem responsável/capacidade, regra de sessão e caso de bloqueio; não propor exclusão definitiva ou ligação automática a digitador legado.

**Validação/evidência e conclusão:** VD. Decisão com cenários de último admin/autoalteração/revogação, antes dos endpoints novos. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8d1b"></a>

#### 8D1B — Consultar usuários e identidade ampliada com escopo explícito

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-07; RQ-USR-01–10; RQ-CTA-03–04 (telas/elementos na matriz).

**Escopo:** D1B.1 listagem paginada admin de nome/login/perfil/status; D1B.2 me com campos aprovados. Duas unidades separadas, sem senha/hash.

**Dependências/decisões:** 8D1D/P-08; H1.

**Trabalho por camada:** Backend: DTO/queries/guard específicos; usar usuários existentes, sem alterar gestão de vínculo clínico.

**Aceite — cenário principal e falhas:** D1B.1 consulta/edição não listam usuários, paginação funciona; D1B.2 só própria identidade e fields aprovados. Nenhuma senha/hash/login de terceiros em mensagem pública de erro.

**Validação/evidência e conclusão:** VB. Aceites separados de listagem/me com três perfis e paginação/negação. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8d1u"></a>

#### 8D1U — Ler usuários e Minha conta sem afirmar estado fictício

**Estado e cobertura:** Planejado; não aceito. RQ-NAV-07; RQ-USR-01–10; RQ-CTA-03–04 (telas/elementos na matriz).

**Escopo:** D1U.1 tabela/admin e autoações indisponíveis conforme regra; D1U.2 dados de conta/suporte/sair. Duas unidades; ações de alteração em D2U.

**Dependências/decisões:** 8D1B unidade correspondente; P-08; 7D-U4.

**Trabalho por camada:** Frontend: rotas/menus por capacidade, tabela responsiva, conta com fields reais e logout local atual.

**Aceite — cenário principal e falhas:** Listagem só para autorizado; conta só mostra login/status quando publicados; erro não usa mock. Sair limpa sessão/rascunhos; retorno/390 px/teclado funcionam.

**Validação/evidência e conclusão:** VF. Capturas/roteiros por unidade, três perfis e erro de identidade. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8d2b"></a>

#### 8D2B — Alterar perfil e estado do usuário com concorrência e auditoria

**Estado e cobertura:** Planejado; não aceito. RQ-USR-11–18 (telas/elementos na matriz).

**Escopo:** D2B.1 perfil; D2B.2 ativação/inativação. Duas unidades versionadas, sem excluir usuário ou conceder gestão temporal automaticamente.

**Dependências/decisões:** 8D1D/P-08; 8D1B.

**Trabalho por camada:** Backend/dados: comandos explícitos, guard/auditoria, revogação/revalidação de sessão e regras de autoalteração/último administrador.

**Aceite — cenário principal e falhas:** Cada unidade: operação válida relida; autoalteração/último admin/versão obsoleta recusados conforme política aprovada; sessão afetada revalidada; sem edição por consulta/edição.

**Validação/evidência e conclusão:** VB. Dois administradores/versões, log de decisão, sessão afetada e três perfis; aceite separado por comando. Concluir somente pela condição comum acima e pelos critérios desta unidade.

<a id="8d2u"></a>

#### 8D2U — Confirmar alteração de perfil ou ativação com efeitos compreensíveis

**Estado e cobertura:** Planejado; não aceito. RQ-USR-11–18; RQ-EST-17 (telas/elementos na matriz).

**Escopo:** D2U.1 modal/página perfil com anterior→novo; D2U.2 ativar/inativar com consequência. Duas unidades separadas, foco/fechar/cancelar acessíveis.

**Dependências/decisões:** 8D2B unidade correspondente; P-08; padrão de recuperação de operação definido.

**Trabalho por camada:** Frontend: leitura atual, seleção, revisão e confirmação, recibo e conflito; nenhum toggle puramente local.

**Aceite — cenário principal e falhas:** Cancelar/X/Escape não escreve; confirmar um comando real; 409 preserva escolha e compara estado; 403/resposta perdida verificam sem repetir; conta/sessão afetadas refletem revalidação.

**Validação/evidência e conclusão:** VF. Roteiro por comando com payload/estado relido, foco do diálogo e caso de conflito. Concluir somente pela condição comum acima e pelos critérios desta unidade.

### Fidelidade visual e aceite do produto completo

<a id="8v1"></a>

#### 8V1 — Comparar e concluir cada tela e estado da referência

**Estado e cobertura:** Planejado; não aceito. Abrange todas as famílias FM/RQ
não EX da matriz; evidências anteriores valem somente para seus recortes.

**Escopo:** Uma unidade por tela/fluxo: login, navegação, início, busca/lista,
cadastro, ficha e suas abas, atendimento/etapas/revisão/detalhe, acompanhamento,
pendências, importação/revisão, dashboard, usuários, conta e erros. Comparar
hierarquia, tipografia, espaçamento, cores, componentes, conteúdo, ações e
navegação com a referência em desktop e telas estreitas. Incluir carga, vazio,
erro, sucesso, conflito, acesso recusado e diálogos quando aplicáveis.

**Dependências/decisões:** Funcionalidade e contratos da unidade implementados;
regras clínicas vigentes e decisões de identidade visual. Não copiar dados,
estados ou inferências fictícios do protótipo como comportamento real.

**Aceite:** Capturas comparáveis com viewport/dados/estado registrados, revisão
humana funcional/visual, teclado/foco, zoom 200% e 320/390 px. Toda diferença
relevante tem correção ou justificativa aprovada ligada a FM/RQ. Ausência de
contrato não é justificativa de exclusão. Sem tolerância visual numérica
inventada: registrar aprovação por tela e divergências remanescentes.

**Validação:** VF; evidências sintéticas em `docs/frontend/visuais/` e relatório
por unidade. Capturas sozinhas não comprovam persistência nem autorização.

<a id="8v2"></a>

#### 8V2 — Aceitar cobertura funcional integral do produto

**Estado e cobertura:** Planejado; não aceito. Todos os FM/RQ não EX, incluindo
unidades antes classificadas VP, agora PC.

**Dependências:** M2, todas as famílias de M3 e 8V1 aceitas; decisões específicas
resolvidas. Aceite parcial de uma tela não encerra o conjunto.

**Aceite:** Matriz reconciliada com código/contrato/evidência atual por requisito;
nenhum destino VU1/MVP/PC sem entrega e nenhum EX sem justificativa vigente.
Executar percursos clínicos e operacionais completos pela interface com API e
PostgreSQL sintéticos: cadastro, todos os módulos clínicos, correção/histórico,
fila, importação/revisão/reprocessamento, anexos, indicadores/CSV e usuários.
Conferir persistência, proveniência, três perfis e autorizações dedicadas,
paginação, conflitos, falhas de rede e recuperação sem duplicar operações.
Equipe clínica e responsáveis operacionais registram parecer e limitações;
impedimentos de uso permanecem abertos até correção e nova prova.

**Validação:** VI nas camadas afetadas, provas de leitura/escrita/autorização,
comparação da matriz e revisão humana. Selecionar e combinar as suítes pelo
workflow; não repetir suítes aprovadas sem mudança relevante. M3 não autoriza
dados reais; a Etapa 10 homologa novamente no ambiente institucional liberado.

### Disposição documental

<a id="doc-ex"></a>

#### DOC-EX — Registrar exclusões sem apagar legado

**Estado e cobertura:** Disposição documentada; não é alteração funcional. RQ-LOG-08; RQ-PRJ-02; RQ-USR-19; RQ-EST-18–23 (telas/elementos na matriz).

**Escopo:** Credenciais de demo, timers/count/hash fictícios, Localizado funcional, origem que inventa Chagas, escores/inferências e data fixa do protótipo ficam fora do produto. Legado/bruto permanecem conforme fontes.

**Dependências/decisões:** D1/D12/ADR-017–024; destinos EX da matriz.

**Trabalho por camada:** Documentação nesta entrega: disposição e justificativa individual; implementação futura não deve reincorporar esses comportamentos.

**Aceite — cenário principal e falhas:** Cada item EX tem motivo, distinção do dado legítimo (ex.: localização de prontuário) e fonte; nenhum dado legado é removido nesta análise.

**Validação/evidência e conclusão:** VD. Linhas EX conferidas com fontes e diff exclusivamente documental. Concluir somente pela condição comum acima e pelos critérios desta unidade.
