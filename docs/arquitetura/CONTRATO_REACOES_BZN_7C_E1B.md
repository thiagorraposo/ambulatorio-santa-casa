# Reação isolada no tratamento BZN — 7C-E1B, recorte E1.2

2026-11-01, Janela1, base2e426b8. Recorte implementado e VALIDADO TECNICAMENTE;
[evidências](../validacoes/VALIDACAO_7C_E1B_REACOES.md). Não altera E1.1.
Fontes: [SQL15](../../sql/15_tratamento_benzonidazol.sql),
[especificação canônica](ESPECIFICACAO_TRATAMENTO_BENZONIDAZOL.md),
[H8](CONTRATOS_CLINICOS_ETAPA_5.md#cadastro-bzn) e
[catálogo](../frontend/ENTREGAS_DO_PRODUTO.md#7c-e1b).

GET/POST `/v1/pacientes/:id/tratamento-bzn/reacoes`: leitura paginada e criação
de uma ocorrência no tratamento canônico já existente do paciente. Não aceita
tratamento/atendimento arbitrário nem cria segundo tratamento. Sem tratamento,
404; sem vínculo,403; consulta somente lê; edição exige vínculo de escrita;
administração segue a política vigente. Ordenação reacao_id DESC e IDs textuais.

Reutilizar BznReactionDto: descricao obrigatória,1–10000 caracteres, não branca;
gravidade livre até1000; dataReacao completa opcional; consequencia/observacoes
livres até10000. Omitido/null são null nos opcionais. Sem escalas, cálculo,
relação temporal inferida ou vínculo automático à consulta atual. Data não muda
prescrição/início. Adicionar ocorrência não altera teveReacaoAdversa, iniciado,
tratamentoPeloAmbulatorio ou qualquer campo canônico: indicador e relato são
fatos independentes, como na criação H8 existente.

POST retorna reacaoId. Duas intenções de mesmo conteúdo criam IDs distintos;
reenvio do mesmo UUID confirmado recebe409 sem repetir escrita; GET da operação
devolve o recibo existente, conforme protocolo vigente. Transação atribuída
a usuário e bloqueio do tratamento asseguram integridade; falha SQL reverte
ocorrência, captura e recibo. GET expõe reacaoId,tratamentoId,descricao,gravidade,
dataReacao,consequencia,observacoes; não expõe bruto/timestamps.

Captura incremental prospectiva dos cinco campos da ocorrência sobre SQL15,
sem backfill. Resolver paciente pela FK do tratamento; não reutilizar contexto
clínico atual. Bloquear revisão temporal desses campos até contrato específico;
não alterar capturador compartilhado, permissões preexistentes ou migrations
antigas. Validar upgrade71→72, legado intocado e captura tardia.

Critérios: dois IDs e tratamento único inalterado, triestados do pai preservados,
texto literal/gravidade não classificada, data/null, autorização/revogação,
paginação, UUID/replay/concorrência, rollback e erros sanitizados em PostgreSQL
real sintético; guard e regressões transversais por alteração do resolver.
E1.1 correção/versionamento continua pendente. Teste não é aceite humano.
