# Eventos, dispositivos e óbito — 7B-E4B

Data: 2026-11-01. Janela 1/6, base 7842d82.
Recorte implementado e validado tecnicamente: AVC longitudinal (RQ-EVT-01–02); não encerra E4B.

## Fonte e fronteira clínica

A [especificação vigente](ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md#decisão-sobre-vínculo-com-atendimento)
define evento/dispositivo/óbito por paciente, sem atendimento_id na primeira
versão. SQL10 e `Importer.events_devices` já representam AVC como `avc` e
permitem eventos repetidos. Não criar snapshots, consultas artificiais, novo
cálculo clínico ou domínio de tempo. Consulta de origem na navegação não é
proveniência persistida do fato. Esse limite prevalece sobre menção genérica do
catálogo à consulta de origem; a interface precisa explicitá-lo, sem alegar
releitura histórica por atendimento.

## AVC — contrato de leitura/criação

`GET|POST /v1/pacientes/:id/avcs`. JWT, usuário ativo e política clínica vigente;
GET nos três perfis com acesso ao paciente, POST edição autorizada/administração.
Sem sessão 401; perfil/vínculo 403; paciente ausente 404 após autorização. ID
textual decimal positivo na faixa bigint. Não há parâmetro de atendimento.

GET aceita PageQuery (limit 20, 1–100; offset 0, 0–100000), lista somente tipo
`avc`, ID decrescente (ordem de registro, não cronologia clínica), página vazia
`[]`. Não retorna outros eventos ou dados brutos. Cada item contém
`eventoId`, `pacienteId`, `tipo: 'avc'`, `ocorreu`, `anoEvento`, `descricao`,
`observacoes`. Sem inferir “último AVC” pelo maior ano ou negativo mais recente.

POST recebe quatro campos opcionais, anuláveis e independentes:

| Campo | Contrato existente aplicado à entrada |
| --- | --- |
| ocorreu | boolean ou null; ausência, false e desconhecido explícito distintos |
| anoEvento | inteiro normalizado 0–9999, representação numérica dos quatro dígitos aceitos por `year_value` no importador; sem dia/mês, sem faixa clínica ou corte pelo ano atual |
| descricao | texto até 10000 caracteres ou null, literal inclusive vazio/espaços |
| observacoes | texto até 10000 caracteres ou null, literal inclusive vazio/espaços |

O corpo vazio é 400; um campo null explícito é válido. Omitidos ficam null na
nova afirmação; isso não altera registros anteriores. Ano sozinho não infere
ocorreu=true. Ano futuro/zero dentro do formato técnico não é convertido em fato
confirmado nem usado como recomendação; regra clínica de faixa exigiria decisão
posterior. Tipo fixado no servidor, sem campo livre para reação adversa ou D8.

POST 201 `{ eventoId: string }`. Cada intenção cria registro distinto, inclusive
com conteúdo idêntico; não apagar/corrigir/consolidar após uma negativa. Transação
inclui captura atribuível e recibo `eventoId` pelo protocolo UUID/hash vigente.
GET do recibo verifica resultado sem repetir POST; replay responde 409. Falha SQL
reverte registro/auditoria/recibo; erros sanitizados. Sem PATCH/PUT/DELETE novo.

## Auditoria e compatibilidade

SQL69 ativa prospectivamente tipo/ocorreu/descrição/observações sobre a tabela
existente; `ano_evento` mantém seu marco de captura anterior da SQL52. Sem backfill
ou alteração de gatilhos/funções compartilhados. A nova captura também alcança
D8/importador, devendo ser validada com regressões SQL/HTTP/importador.
Revisão temporal dos quatro campos novos fica bloqueada; a revisão anual já
contratada de ano_evento não pode ser bloqueada por associação à tabela inteira.

## Demais recortes e decisões

- Marcapasso/CDI: estados consolidados por paciente/tipo na SQL10, não implante
  ou snapshot por consulta. Conferir criação inicial/409 e leitura sem mudar
  semântica de correção do legado.
- Resincronizador: citado no catálogo, mas sem tipo aprovado na especificação/
  importador. Pergunta encaminhada ao responsável; nenhuma resposta presumida.
- Óbito: consolidado por paciente, indicador/data/causa independentes; precisão
  parcial além de DATE depende de contrato/modelo aprovado. Não exigir data/causa
  automaticamente nem tratar “não” como remoção de histórico.
- Reação adversa genérica: transformação explicitamente suspensa pela ambiguidade
  terapêutica; não publicar via esta API. Tratamento canônico tem contrato próprio.

Aceite humano permanece separado. Recorte de AVC só será tecnicamente validado
com persistência real, múltiplos registros/tipos, RBAC/vínculo, rollback,
recuperação, autorização e regressões dos efeitos da captura.

[Evidência do backend AVC](../validacoes/VALIDACAO_7B_E4B_AVC.md). Interface E4U implementada, com [provas funcionais](../validacoes/VALIDACAO_7B_E4U_AVC.md); comparação visual e aceite próprios pendentes.
