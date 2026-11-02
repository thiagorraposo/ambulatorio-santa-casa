# Relatório sanitizado de importação — 8C2B.1, recorte de contagens

2026-11-02. Complementa H14 sem concluir o requisito de ausência de efeitos do
`dry-run`. Fonte de escopo: [catálogo](../frontend/ENTREGAS_DO_PRODUTO.md#8c2b).
[Validação do recorte](../validacoes/VALIDACAO_8C2B_1_RELATORIO.md).

## Resposta H14

`POST /v1/importacoes`, tanto em simulação como em aplicação e reenvio
idempotente, acrescenta `relatorio` à resposta existente:

- `totalLinhas`: linhas não vazias processadas no lote efetivo;
- `linhasImportadas`: linhas importadas sem pendência;
- `linhasComPendencia`: linhas importadas com pendência;
- `linhasRejeitadas`: linhas rejeitadas;
- `codigosErro`: coleção ordenada de `{ codigo, total }`, sem entradas zeradas.

As três categorias de linhas são disjuntas e somam `totalLinhas`. No relatório
interno do worker, `importable_rows` inclui as linhas com pendência; a projeção
HTTP subtrai essas linhas para manter a mesma semântica da consulta de lotes
SQL53. Códigos seguem o vocabulário fechado e a prioridade da classificação de
SQL53. Nenhuma mensagem livre, linha original, identidade de candidato, hash,
caminho ou versão técnica é copiada à resposta. P-04/P-05 e os demais recortes
de metadados/conflitos permanecem separados.

O worker produz o relatório também no no-op, lendo o lote efetivo do mesmo
conteúdo/layout. A resposta continua distinguindo `codigoLoteSolicitado` e
`codigoLote`; não associa resultados ao código solicitado quando outro lote já
materializou o conteúdo. Contagens não são previsão de novas gravações: no-op
retorna a situação existente sem reaplicar a importação.

A API valida versão/modo do relatório, inteiros não negativos seguros, soma das
categorias, códigos fechados e soma de ocorrências antes de projetar a resposta.
Falha de protocolo após execução do worker retorna erro genérico 503 e orienta
consultar o lote antes de reenviar; não declara que uma escrita confirmada foi
recusada. Falhas do worker preservam a resposta sanitizada já existente.

## Limite de efeitos da simulação

A simulação atual executa o pipeline sobre as tabelas reais dentro de uma
transação revertida. PostgreSQL não reverte `nextval`; sequências dos registros
e da captura prospectiva podem avançar, inclusive em linhas revertidas. Este
incremento não modifica o adaptador transacional, defaults, triggers ou ACLs e
não elimina esse efeito. **8C2B.1 permanece implementada sem validação completa.**

Não é seguro corrigir isso com `setval`/restauração de sequências enquanto outros
escritores operam, nem conceder propriedade de tabelas ao worker para alterar
defaults. O isolamento da execução simulada precisa de incremento próprio que
preserve o mesmo pipeline, catálogo/estado de origem, constraints e regras de
captura. Não há nova decisão clínica neste recorte.
