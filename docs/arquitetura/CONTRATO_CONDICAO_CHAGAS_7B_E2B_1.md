# Condição de Chagas por atendimento — 7B-E2B.1

Data: 2026-10-28. Recorte técnico de RQ-CON-01–06 sobre SQL06; não conclui o
pacote 7B-E2B, não cria regras clínicas e não concede aceite humano.

## Recurso

Autenticação JWT, prefixo `/v1`, vínculo e política clínica existentes.

| Método/caminho sob `/v1` | Resposta |
| --- | --- |
| `GET /pacientes/:id/atendimentos/:atendimentoId/condicao-chagas` | Registro com IDs textuais e seis campos, ou JSON `null` explícito (200). |
| `POST /pacientes/:id/atendimentos/:atendimentoId/condicao-chagas` | `{ condicaoChagasId: string }` (201). |

Leitura exige autorização ao paciente; criação exige edição autorizada ou
administração conforme política vigente. Consulta não escreve. Contexto de
atendimento é verificado na mesma transação: 401 sem sessão, 403 sem acesso,
404 para atendimento ausente/de outro paciente após autorizar o paciente da rota.
GET ausente não grava nada. A unicidade física por atendimento é preservada:
POST posterior responde 409, inclusive para registro importado, sem upsert ou
sobrescrita. Concorrência é serializada pelo atendimento e pela constraint.

## Campos independentes

Todos opcionais e anuláveis. Corpo vazio é recusado; um campo explicitamente
null é permitido. Texto literal, inclusive vazio, não é normalizado.

| Campo | Domínio existente / limite técnico da API |
| --- | --- |
| `formaClinica` | indeterminada, cardiaca, digestiva, cardiodigestiva, aguda, cronica, nao_informado ou null. |
| `faseDoenca` | aguda, cronica, nao_informado ou null. |
| `classificacaoClinica` | Texto livre até 80 caracteres; nenhuma escala inventada. |
| `possuiSintomas` | Booleano ou null; false e ausência são preservados como estados distintos. |
| `descricaoSintomas`, `observacoes` | Texto até 10000 caracteres ou null. |

Descrição não é apagada quando o indicador é false/null. Não se deriva fase,
forma, classificação ou diagnóstico a partir de outro campo. GET retorna ainda
`condicaoChagasId` e `atendimentoId`, sem `valor_original_*` ou metadados brutos.
A criação não exige diagnóstico positivo nem cria diagnóstico/âncora.

## Auditoria e recuperação

A migration incremental 66 ativa captura prospectiva dos seis campos, autoria
de aplicação e proveniência de importação. Não altera legado nem faz backfill.
Aplicação recebe SELECT/INSERT e USAGE da sequência, sem edição/remoção. Revisão
temporal permanece explicitamente bloqueada; o guard de sorologia é preservado.

SQL38 revelou alias ambíguo no ramo TRUNCATE de `auditoria_capturar()`. A SQL66
obtém a definição vigente (incluindo evoluções SQL39/42), exige o fragmento
original único e altera somente o alias da consulta. Verifica owner/ACL e
configuração preservados, recusando TRUNCATE de alvo com histórico pelo erro
contratual, sem editar migrations históricas ou enfraquecer proteção.

POST usa o [protocolo de operações](RECUPERACAO_OPERACOES_ETAPA_7.md): intenção
com método/caminho canônico `/v1/...` e hash do JSON, header `X-Operacao-Id` e
recibo `{ condicaoChagasId }` no mesmo COMMIT. Consultar UUID após resposta
incerta; nunca reenviar automaticamente. Reaplicar intenção confirmada recebe
409. Falha SQL desfaz registro/auditoria e registra não aplicação conclusiva.

## Limites

Complicações repetíveis (CON-07–10), edição, exclusão e revisão temporal
são unidades distintas. A interface dos seis campos tem evidência própria
[7B-E2U.1](../validacoes/VALIDACAO_7B_E2U_1.md). Os sintomas específicos citados no catálogo (dispneia,
disfagia, constipação, regurgitação e dor) não têm campos/domínios aprovados nas
fontes examinadas: não serão convertidos silenciosamente em flags ou texto.
P-03 dos PUT e pendências permanece inalterado. Este recorte não aceita M2/M3.

Fontes: [SQL06](../../sql/06_tabelas_condicoes_comorbidades.sql),
[catálogo](../frontend/ENTREGAS_DO_PRODUTO.md#7b-e2b),
[matriz CON](../frontend/MATRIZ_FIGMA_FRONTEND.md#con--condição-clínica-e-complicações).

## Interface dos seis campos — 7B-E2U.1 (31/10/2026)

A ficha na aba Chagas e o detalhe do histórico oferecem acesso à condição do
atendimento selecionado. As rotas `/condicao-chagas` e `/condicao-chagas/nova`,
sob o mesmo paciente/atendimento, permitem leitura e criação com revisão dos
seis campos. A confirmação continua sendo operação separada do núcleo do
atendimento; não se declara atomicidade entre as duas gravações.

Select vazio e texto vazio de um novo formulário enviam null; `nao_informado`
é escolha explícita distinta. Espaços e quebras de linha são preservados.
A leitura distingue texto vazio legado de null. Alterar o indicador de sintomas
não limpa a descrição nem deriva diagnóstico/forma/fase. O formulário não edita
registros existentes nem permite segundo registro após o próprio recibo; uma
criação concorrente recebe 409 sem sobrescrever o recurso ou apagar o rascunho.
Rascunhos e recibos usam o escopo de sessão já existente; uma intenção incerta
permanece bloqueada até verificação por UUID. Retornos se limitam ao mesmo
recurso e conservam os parâmetros da consulta de origem.

CON-07–10 têm colunas na SQL06 (tipo livre, presença anulável, descrição e
gravidade do domínio físico), mas não têm contrato HTTP/auditoria/recuperação
aprovado nesta entrega. D1–D12 não acrescentam resposta sobre essa publicação.
O planejamento do contrato continua obrigatório antes da implementação; não se
infere ligação obrigatória à condição nem novos tipos a partir de sintomas.
