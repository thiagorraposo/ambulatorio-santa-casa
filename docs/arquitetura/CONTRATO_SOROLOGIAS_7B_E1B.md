# Sorologias individuais por atendimento — 7B-E1B

Data: 2026-10-27. Extensão técnica do modelo existente, com prioridade de
continuidade indicada pelo responsável do projeto. Não representa aceite
clínico, liberação de dados reais ou entrega da interface 7B-E1U.

## Recurso e autorização

Prefixo `/v1`, autenticação JWT e política clínica vigente no servidor:

| Método e caminho | Resultado |
| --- | --- |
| `GET /pacientes/:id/atendimentos/:atendimentoId/sorologias` | Lista paginada de episódios daquele atendimento. |
| `POST /pacientes/:id/atendimentos/:atendimentoId/sorologias` | Criação independente, com resposta `{ sorologiaId: string }`. |

Os três perfis leem quando autorizados ao paciente. Criação exige edição com
vínculo ativo/permissão de editar, ou administração conforme a política sintética.
Sem autenticação: 401; perfil/vínculo recusado: 403; atendimento ausente ou de
outro paciente: 404 após autorizar o paciente da rota. Política desabilitada
continua recusando o fluxo. Nenhuma busca global de sorologias foi acrescentada.

GET aceita `limit` de 1 a 100 (padrão 20), `offset` de 0 a 100000 (padrão zero).
Ordena pelo ID **numérico** decrescente, sem supor cronologia clínica a partir
das datas. Atendimento sem diagnóstico/sorologia retorna `[]` sem criar âncora.
IDs são strings decimais bigint, sem conversão para Number.

## Campos do episódio

POST aceita somente estes campos; todos admitem `null` e são opcionais:

| Campo | Contrato |
| --- | --- |
| `metodoSorologico` | Texto livre, até 120 caracteres. Não se inventa catálogo de métodos. |
| `dataSolicitacao`, `dataColeta`, `dataResultado` | Datas ISO `YYYY-MM-DD`, independentes, sem preenchimento/ordenação automática. |
| `resultado` | `reagente`, `nao_reagente`, `inconclusivo`, `indeterminado`, `nao_informado` ou null. |
| `laboratorio` | Texto até 120 caracteres. |
| `observacoes` | Texto até 10000 caracteres. |

O corpo vazio `{}` é recusado; ao menos um campo reconhecido deve ser enviado.
Um campo explicitamente null é uma escolha válida de informação desconhecida.
Textos são preservados, inclusive vazio literal, seguindo o tipo físico e os
DTOs opcionais existentes; não há normalização clínica silenciosa. Campos
omitidos ficam null na nova ocorrência. `resultado: null` e `nao_informado`
mantêm representações e evidências diferentes.

GET retorna os sete campos, `sorologiaId`, `diagnosticoChagasId` e `atendimentoId`.
Não publica nem permite escrever `valor_original_*` ou `numero_metodo_planilha`.
Este último identifica posição na fonte, não identidade do episódio: novos
registros usam null, permitindo métodos iguais em várias ocorrências.

## Transação, âncora e auditoria

A tabela `sorologia_chagas` da migration 05 continua sendo a persistência. O
atendimento é bloqueado antes da escrita; seu diagnóstico existente é reutilizado.
Se não houver diagnóstico, cria-se atomicamente uma âncora somente com o ID do
atendimento. Campos clínicos da âncora permanecem null, como no precedente do
importador. Sorologia não exige diagnóstico positivo e não altera descoberta,
flag, status ou resultado final; resultado reagente não se converte em diagnóstico.

Cada POST intencional cria um episódio. Métodos/conteúdos iguais não são fundidos.
A transação inclui âncora, episódio, auditoria e eventual recibo de operação;
falha SQL desfaz o conjunto. Concorrência não cria duas âncoras para a consulta.

A migration incremental 65 ativa os sete campos no mecanismo existente de
auditoria, com autoria de aplicação ou proveniência de importação. Não altera
linhas antigas nem fabrica eventos anteriores à captura. Alteração técnica
posterior de legado inicia marco do valor então conhecido, conforme o protocolo
existente. A aplicação recebe somente SELECT/INSERT no episódio; o importador
mantém seus privilégios próprios. Nenhuma migration histórica foi alterada.

O catálogo de captura é compartilhado com revisão: um guard explícito bloqueia
planos temporais de sorologia. Captura auditável não homologa correção/revisão.

## Recuperação e limites

O POST participa do [protocolo de operações](RECUPERACAO_OPERACOES_ETAPA_7.md):
registrar intenção com método, caminho **canônico `/v1/...`** e hash do JSON;
confirmar com `X-Operacao-Id`; consultar a UUID para obter o recibo
`{ sorologiaId }`. O recibo é confirmado no mesmo COMMIT. Reaplicar a mesma
intenção recebe 409; não se reenvia automaticamente após resposta incerta.
Clientes sem header mantêm a compatibilidade geral existente, sem ganhar
garantia de recuperação por UUID.

Solicitação geral (`sorologia_solicitacao`, RQ-DIA-15–18), edição/remoção de
episódios persistidos e revisão temporal permanecem nas unidades/decisões
próprias. Todos continuam no produto completo; esta entrega não os exclui.
As datas do episódio não substituem autorrelato ou resultado final da consulta.

Fontes: [schema original](../../sql/05_tabelas_diagnostico_sorologia.sql),
[decisões D2–D5](../dados/DECISOES_HUMANAS_NOVA_PLANILHA.md),
[catálogo de entregas](../frontend/ENTREGAS_DO_PRODUTO.md#7b-e1b),
[evidência técnica](../validacoes/VALIDACAO_7B_E1B.md).
