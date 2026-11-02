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


## Planejamento após avaliação humana M3

Base inspecionada `44b106a`,02/11/2026. Fonte dos achados e decisões:
[avaliação humana](../validacoes/AVALIACAO_HUMANA_EQUIPE_SANTA_CASA_M3.md).
Esta seção é planejamento do próximo incremento; não modifica o contrato HTTP
implementado descrito acima. [DoD/prontidão](../WORKFLOW_DE_DESENVOLVIMENTO.md#entrega-integrada-de-funcionalidades-humanas)
passam a exigir todas as camadas da experiência humana.

### P0 — confirmação de atendimento e contrato de erros

HUM-M3-03 é P0 do percurso novo paciente→atendimento, com causa/HTTP/campos ainda
não comprovados. A leitura de `backend/src/bootstrap.ts` e
[HttpErrorFilter](../../backend/src/common/http/http-error.filter.ts) confirma
validação DTO e resposta `statusCode/error/message`, sem contrato estável de
caminho/código por campo. O [cliente](../../frontend/src/api/client.ts) descarta
esse corpo ao gerar `ApiError` por status. `CoreFields.tsx` e `MutationForm` ainda
não associam erros estruturados a controles; o formulário de atendimento combina
validade HTML com mensagens locais/seleção de etapa. Isso confirma lacuna de
feedback, não a causa do envio humano. A versão atual H4 grava núcleo/filhos em
transação e possui recuperação; preservar essas garantias.

Próxima execução funcional obrigatória:

1. Isolar ambiente sintético novo, identificar SHA/host/porta/base e perfil;
   preservar candidato e não aproveitar banco ou dados da reunião.
2. Buscar/cadastrar paciente pela UI, criar e confirmar atendimento; registrar
   valores artificiais discriminantes, etapa, intenção e contexto. O P0 pode
   ser investigado com perfil já autorizado sem esperar a ampliação de Edição.
3. Inspecionar payload sintético, HTTP, resposta e validações backend/SQL seguras;
   confrontar o caso com paciente existente. Se não reproduzir, registrar limite
   e pedir somente os dados de cenário não sensíveis que faltarem; não declarar
   corrigido nem adotar a hipótese antiga de400 como causa.
4. Identificar causa/campos reais, corrigir o defeito e integrar mensagens por
   campo no backend/cliente/controles, etapas e revisão. Não só trocar o texto.
5. Comprovar criação e releitura dos IDs/filhos, atomicidade e ausência de
   duplicação; testar validação, permissão/revogação,409 e resposta perdida com
   recibo, em paciente novo/existente e perfis pertinentes. Registrar evidências
   navegador/API/PostgreSQL sintético e encaminhar cenários para nova avaliação.

Contrato de erros a especificar antes de implementar: manter distinção entre
validação conhecida400, autenticação401, autorização403, conflito409 e erro
inesperado sanitizado (atualmente503), sem atribuir esses status ao relato humano.
Para rejeições conhecidas, projetar coleção de campos/caminhos permitidos,
códigos estáveis e descrições sanitizadas; definir representação para erro geral,
etapas e índices de filhos. Uma possível coleção `errors` é apenas desenho a
revisar, não DTO já publicado. Não repassar indiscriminadamente mensagens de
validadores/SQL. Não ecoar valores clínicos ou detalhes de controle de acesso.
Falhas inesperadas podem permanecer genéricas com correlação quando disponível;
hoje o envelope não comprova identificador de correlação.

O cliente deverá mapear os caminhos reconhecidos aos rótulos/controles corretos,
com resumo acessível, links/teclado/foco, destaque e formato esperado quando
relevante. Caminho desconhecido não pode destacar outro campo. Dados válidos e
rascunho permanecem na tentativa inválida; 401/troca de identidade mantêm limpeza
de segurança. Recuperação e incerteza não autorizam repetir POST automaticamente.
Asserções negativas incluem ausência de SQL/stack/token/dados não autorizados.

### P1 — cadastro e edição cadastral por Edição

A decisão de produto exige cadastro por Edição e alteração cadastral no escopo
autorizado, ainda não implementados/validados sob a nova política. O fato de a
edição cadastral já existir não comprova o percurso ampliado. Inspeção atual:

| Camada | Contrato existente e consequência para o incremento |
| --- | --- |
| Capacidade | `ClinicalAccessService.canCreate` só permite Edição em todos_sinteticos; `GET /pacientes/capacidades`, POST e operações revalidam. Alterar somente visibilidade da UI ou só esse booleano é insuficiente |
| Escopo após criar | `PacientesService.create` insere paciente/endereço/contatos sem acesso_paciente. GET/PATCH/atendimento exigem vínculo para Edição em vinculo_explicito. **Falta contrato de autorização inicial para criar→consultar→editar sem autoconcessão de vínculos**; não resolver habilitando acesso global ou criando vínculo silencioso |
| Alteração existente | `PATCH /pacientes/:id`, Edição/Administração, exige vínculo ativo+pode_editar e versão;409 preserva original/rascunho. Não é edição de registros clínicos históricos |
| Campos permitidos | `PatientUpdateDto`: nome, dataNascimento, sexo, raca, pertenceComunidadeTradicional, tipoComunidadeTradicional, endereço/cidade e telefonesAdicionar; versão obrigatória. Endereço gera snapshot; telefones são adicionados/deduplicados, sem remoção implícita. Não ampliar whitelist sem contrato |
| Integridade | Transação/contexto do ator, captura e recibos já existem. Preservar versão original, auditoria, intenção e recuperação. P-03 de projeto/notificação não bloqueia esse PATCH cadastral já contratado |
| Interface | PatientCreateGate/PatientCreateLink, PatientFormPage, busca prévia, ficha e atalhos; `/capacidades` representa decisão backend. Preservar dados, feedback de campo, revisão/conflito e leitura autorizada; não mostrar paciente recém-criado sem autorização de leitura |

A política desejada está na visão; campo/aceite no catálogo7A-U1 e
7D-R6B.1/U.1. Gate exato pendente: **como o paciente criado entra no escopo de
leitura/edição de quem o cadastrou, sem conceder vínculo automaticamente?**
A autorização de cadastrar está decidida como produto; o mecanismo de escopo
não foi fornecido. Documentar/resolver o contrato antes do incremento dependente,
sem bloquear investigação P0 ou outras unidades independentes.

Saída exigida: Edição autorizado vê Novo paciente, busca/cadastra pessoa fictícia,
consulta o criado e edita somente os campos permitidos; backend valida/audita e
releitura preserva versão/contatos/endereço. Consulta não cadastra nem altera;
Edição sem vínculo ativo ou `pode_editar` não altera cadastro alheio e não administra usuários,
não concede acesso a terceiros nem obtém gestão temporal. Oito comportamentos
pedidos pelo responsável devem ser exercitados com prova por perfil e cenário;
novo contrato incompleto continua pendente, não se fabrica operação insegura.
