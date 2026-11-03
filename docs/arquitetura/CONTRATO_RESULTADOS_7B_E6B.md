# Resultados identificados — 7B-E6B, recorte de parâmetros

2026-11-01, Janela1, base2495895. Recorte implementado e VALIDADO TECNICAMENTE;
[evidência](../validacoes/VALIDACAO_7B_E6B_PARAMETROS.md).
Fontes: [catálogo E6B/U](../frontend/ENTREGAS_DO_PRODUTO.md#7b-e6b),
[RQ-EXA-09–13/16](../frontend/MATRIZ_FIGMA_FRONTEND.md#fm-exa-09),
[exame canônico](ESPECIFICACAO_EVOLUCAO_EXAMES_COMPLEMENTARES.md),
[D4/D5](CONTRATOS_CLINICOS_ETAPA_5.md#escolhas-técnicas-resolvidas).
Não é nova regra de interpretação clínica ou aceite humano.

## Identidade e destino

H6 cria paciente_exame_complementar, pertencente ao paciente, com atendimento
opcional. SQL07.exame_complementar_resultado aponta à tabela legada por consulta;
seus IDs não identificam o exame canônico. Não reatribuir FK/backfill, replicar
legado ou criar segundo exame. Nova tabela paciente_exame_resultado armazena
parâmetros repetíveis como filhos do exame canônico, com FK RESTRICT, sem cópia
de paciente/atendimento e sem unicidade clínica de nome/valor.

Nome do parâmetro obrigatório não branco (até120 caracteres). valorInformado,
unidadeInformada, referenciaInformada, interpretacaoInformada e observacoes
são textos independentes opcionais/null até10000 caracteres. Armazenar valor
literal em texto evita escolher precisão numérica, arredondar ou converter
unidades clínicas sem decisão. Interpretação é somente o texto humano informado;
nenhum domínio, faixa normal, diagnóstico ou cálculo inferidos. Nome sem valor
não fabrica resultado; ausência de parâmetros não significa resultado negativo.

GET `/v1/pacientes/:id/exames/:exameId`: metadados canônicos H6, mesmo DTO de
leitura existente, sem bruto/timestamps. GET/POST no sufixo `/resultados`: coleção
paginada e criação de um parâmetro. Três perfis leem, edição/administração criam;
vínculo clínico vigente, autorização de escrita e exame do paciente conferidos
na transação, com bloqueio do pai. Não recebe paciente/atendimento/exame no body.
GET ordena resultado_id DESC, IDs texto; resposta de POST:resultadoId.

Leitura: resultadoId,exameId,nomeParametro,valorInformado,unidadeInformada,
referenciaInformada,interpretacaoInformada,observacoes. Duas intenções iguais
produzem IDs distintos. UUID confirmado não repete POST(409), GET da operação
recupera recibo. Falha SQL reverte parâmetro, histórico e recibo.

Captura prospectiva dos seis campos pela infraestrutura vigente; resolver paciente
pela FK canônica e bloquear revisão temporal até contrato específico. Sem alterar
SQL07/H6, ACLs anteriores ou importador. Data/status e texto resumo do exame pai
não são inferidos/atualizados a partir de parâmetro. RQ-EXA-07/08 dependem de outro
recorte de contrato/versionamento do pai, assim como E7 correções; não concluídos.

## Critérios técnicos

PostgreSQL real sintético: dois parâmetros e dois exames/consultas, retorno de
todos os campos, literalidade/null, catálogo genérico identificado via H6,
autorização/revogação/IDs trocados, intenções concorrentes/replay/recibo, rollback
transacional/captura, guard de revisão e upgrade72→73 sem backfill. Preservar os
campos e IDs do exame, diagnóstico e tratamento; não declarar o agregadoE6B/U
ou aprovação humana com base neste recorte.
