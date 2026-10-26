# Recorte dos formulários clínicos da Etapa 7

Data inicial: 2026-10-04. Atualização: 2026-10-15. Fonte de escopo e aceite:
[Etapa 7 do roadmap](../PROXIMOS_PASSOS.md#etapa-7--fluxos-clínicos).
Esta decisão aplica a [ADR-024](../DECISOES_ARQUITETURAIS.md#adr-024): campos
editáveis precisam ter destino público, autorização e persistência comprovados.
Não amplia o escopo para reproduzir todas as telas do protótipo.

Este documento descreve a implementação atual. A reavaliação de 2026-10-05
registrou sete lacunas; paginação de familiares, contexto, estados desconhecidos,
rascunhos/recibos e recuperação receberam alterações posteriores, descritas
abaixo. A [especificação proposta](../frontend/VISAO_E_ESPECIFICACAO.md) e a
[matriz individual](../frontend/MATRIZ_FIGMA_FRONTEND.md) mantêm os destinos das
áreas sem HTTP. Evidências e limitações pertencem ao
[relatório de validação](../validacoes/VALIDACAO_ETAPA_7.md); esta atualização não
declara aceite global da Etapa 7 ou revisão de usabilidade com a equipe.

## Cobertura implementada

| Área | Formulário e contrato público | Preservação e limites |
| --- | --- | --- |
| Cadastro | Busca prévia, `GET /v1/pacientes/capacidades`, `POST /v1/pacientes`, `PATCH /v1/pacientes/:id`. | Cadastro só é oferecido após confirmar `podeCadastrar`. Nome obrigatório; nascimento/sexo opcionais; idade calculada pelo serviço. PATCH envia a versão original e somente campos alterados. Endereço gera snapshot; telefones são adicionados, sem remover anteriores. Homônimos continuam separados. |
| Atendimento | Criação composta e PATCH versionado do núcleo. | Data, localização, indicadores e observações; filhos aceitos são criados na mesma requisição/transação. PATCH não promete editar os filhos. |
| Avaliação clínica | `dadosClinicos` na criação. | Medidas com unidades, NYHA em texto e observações. Ausências não viram zero; observações não substituem entidades sem contrato. |
| Chagas | `diagnosticoChagas` na criação. | Indicador, status, resultado/data finais, descoberta por autorrelato, critério e observações. Descoberta não vira data de sorologia. |
| Exames | `exames` na criação e leitura pela ficha. | Tipos ativos do catálogo; origem trazido/solicitado, identificação, resultado textual e observações. Categoria genérica exige identificação; solicitado permite ausência de resultado. |
| Familiares | `rastreioFamiliar` na criação; leitura de snapshots e resultados em rotas paginadas independentes. | Snapshot de familiares examinados, identificação e resultado, com IDs textuais de snapshot/filho. Offset do snapshot não desloca sua prévia de filhos; cada snapshot tem paginação própria na URL. Indicador incompatível com filhos é recusado, sem descartar dados. Não representa histórico de doença familiar. |
| BZN | Criação de tratamento único e reações na mesma transação; consulta existente. | Indicação, início, uso pelo ambulatório e reação são independentes. Não oferece edição do tratamento existente nem reação isolada. |
| Retornos | Criação repetível de retornos BZN 30 dias/final e anuais. | Atendimento escolhido e data efetiva completa; a interface recusa comparecimento futuro. Não calcula 30/60 dias nem substitui histórico. |
| Ano informado | `POST /ocorrencias-anuais`. | Apenas ano com precisão anual; não fabrica atendimento, visita, previsão ou dia/mês. |
| Projetos/notificação | PUT por paciente, com pré-carga do registro existente. | Envia somente alterações em campos existentes; triestados, número, justificativas e textos são independentes. Ausência de associação não é inferida da primeira página. |
| Encaminhamento | Criação com atendimento e catálogos ativos. | Tipo/projeto opcionais, destino, datas, estados e textos públicos. Não substitui edição por criação. |
| Contrarreferência | Episódios simples e repetíveis vinculados ao encaminhamento escolhido. | Preserva histórico; não inclui upload ou representação documental avançada. |
| Pendências | Criação textual junto ao atendimento ou POST posterior, e PATCH de status/data. | Resolução exige `dataResolucao` explícita também na criação; outro status recusa data preenchida. Reabertura remove a data explicitamente. Criação composta e POST posterior oferecem desconhecido e enviam `status: null`; omissão HTTP continua criando `aberta`. PATCH atual exige status string: voltar a desconhecido depende de extensão futura, explicitada no formulário. GET inclui a data, inclusive no detalhe do atendimento. Não há revisão de observação/responsável. |

Os catálogos usam estruturas existentes, sem migration. Consulta, paginação e
autorização estão em
[CONTRATOS_CATALOGOS_ETAPA_7.md](CONTRATOS_CATALOGOS_ETAPA_7.md).

## Extensões HTTP necessárias

`GET /v1/pacientes/capacidades` retorna somente `{ "podeCadastrar": boolean }`.
Exige autenticação e identidade ativa, revalidada na transação, para os três
perfis. `consulta` retorna falso; `edicao` retorna verdadeiro somente em
`todos_sinteticos`; `administracao` retorna verdadeiro nas políticas clínicas
habilitadas. Política desabilitada retorna 503, identidade inválida/inativa 401.
Essa resposta não concede vínculo, leitura clínica, edição ou gestão temporal.
POST continua revalidando a mesma política no servidor; o frontend oculta o
cadastro durante carga/falha dessa consulta.

As criações de pendência aceitam `dataResolucao` civil opcional, sem nova coluna;
o serviço valida a relação status/data em todos os caminhos. Objetos únicos
(`endereco`, avaliação, diagnóstico e rastreio) recusam arrays, e cada filho das
coleções precisa ser objeto válido: nenhum preenchimento aceito é perdido por
um formato ambíguo. Retornos BZN e anuais recusam comparecimentos posteriores
ao `CURRENT_DATE` do banco, dentro da mesma transação autorizada. Nenhuma
coluna clínica foi necessária para esses contratos.

A leitura de familiares separa a página de snapshots da página de resultados de
cada snapshot, sem alteração estrutural. Rotas, DTOs, autorização e parâmetros de
URL estão no [contrato de familiares](CONTRATO_FAMILIARES_ETAPA_7.md).

A [ADR-025](../DECISOES_ARQUITETURAIS.md#adr-025) acrescenta a migration
`64_correlacao_operacoes_clinicas.sql`: ledger técnico de intenções e recibos,
sem corpo clínico ou token. As 14 mutações usadas pelos formulários registram
UUID/método/caminho/hash antes do envio e gravam o recibo permitido na mesma
transação da clínica. Registro, consulta autorizada e encerramento explícito
estão no [protocolo de recuperação](RECUPERACAO_OPERACOES_ETAPA_7.md). Essa
migration incremental não modifica migrations anteriores nem a evidência física
de outro banco.

## Áreas que exigem evolução HTTP posterior

Sorologias individuais, condições/complicações, comorbidades,
dispositivos/eventos/óbito, medicamentos e resultados estruturados detalhados
possuem modelo físico, mas não têm os contratos clínicos necessários nesta API.
Ficam como pendências de cobertura posterior; o recorte atual usa resultado final
do diagnóstico e resultado textual dos exames já publicados. Nenhuma dessas
áreas recebe controles editáveis cujo conteúdo seria descartado ou redirecionado
para observações por conveniência.

Edição independente de avaliação/diagnóstico/rastreio/exame existente, BZN,
reação isolada e encaminhamento existente exige contrato próprio, com
autorização e concorrência definidas. PATCH de pendência com `status: null`
também aguarda extensão própria; a criação já preserva esse estado.
Upload/contrarreferência avançada, fila
global, gestão de usuários, importação/revisão e dashboard pertencem a outros
escopos do roadmap. Não representam funcionalidades implementadas nesta entrega.

## Confirmação, rascunhos e falhas

O atendimento composto tem confirmação única. Operações posteriores têm
confirmação e identificação próprias; uma falha posterior não desfaz nem
apresenta como não salvo o atendimento já confirmado. Cada novo episódio após
sucesso confirmado exige uma ação explícita para outro registro/comparecimento e
ganha uma nova intenção. Contexto de paciente, atendimento de origem e recurso
escolhido permanece nos links; encaminhamento/pendência selecionados são
validados antes de oferecer a operação.

Rascunhos e estados de envio ficam somente em memória, separados do cache de
consultas e associados à sessão/identidade. Navegação exige confirmação e mantém
o rascunho; recarregamento protege também rascunhos de módulos/seleções inativos
e informa sua perda. O diálogo de navegação permanece acessível quando uma
reconsulta oculta o formulário. Saída, 401, expiração e troca de
identidade/perfil apagam esses dados. Falha temporária de `/auth/me` oculta os
formulários e conserva rascunhos, valores confirmados e recibos da mesma
identidade. Na remontagem, a interface mantém a distinção entre registro salvo e
rascunho. Escrita cuja resposta foi interrompida permanece incerta até verificação.

409 conserva os valores e a versão original, sem rebase ou sobrescrita
automáticos. Paciente e atendimento oferecem GET para comparar os valores
originais, rascunho e registro atual. Somente a ação explícita de descartar este
rascunho carrega a versão consultada para uma nova edição, sem afetar outros
rascunhos nem efetuar escrita. BZN concorrente conserva o rascunho acessível para
comparar/copiar seus valores e descartá-lo explicitamente, respeitando tratamento
único. Após 403, a interface oferece revalidação do acesso; revisão e nova
confirmação são obrigatórias e o servidor revalida a autorização na escrita.

Falha de rede/resposta inválida/5xx em escrita conserva o rascunho e a UUID,
oferece consulta do recibo e bloqueia reenvio da mesma intenção. Consulta
`confirmada` identifica o registro salvo; `nao_aplicada` permite revisar e
preparar outra intenção, sempre mediante nova confirmação. Estado em curso ou
indeterminável mantém o bloqueio. Encerrar é ação explícita que compete pelo
mesmo lock da clínica e não reexecuta a escrita.
Não há retry de escrita, persistência local ou promessa de idempotência de POST
entre sessões. A verificação não presume que uma página vazia significa ausência
global. A interface só confirma sucesso após resposta HTTP válida com o ID textual
canônico do recurso esperado, recebida na escrita ou no recibo autorizado;
PATCH versionado de paciente/atendimento confere também o ID original. Uma UUID
ausente/desconhecida, uma falha de verificação ou a coincidência com valores
atuais não prova não aplicação. Recarregar ou encerrar a sessão perde a intenção
local; o ledger não oferece enumeração para reconstruí-la. O
[roadmap](../frontend/ENTREGAS_DO_PRODUTO.md#pacotes-verificáveis-do-produto-frontend) e o
relatório mantêm o aceite individual e as extensões posteriores.
