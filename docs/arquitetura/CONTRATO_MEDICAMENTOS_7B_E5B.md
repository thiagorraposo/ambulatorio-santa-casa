# Medicamentos por atendimento — 7B-E5B

2026-11-01, Janela1; base28cb878. Recorte de consulta implementado e VALIDADO TECNICAMENTE;
[evidência](../validacoes/VALIDACAO_7B_E5B_LEITURA.md).
Fonte física: [SQL09](../../sql/09_tabelas_medicamentos_tratamentos.sql),
permissões SQL17 e [catálogo E5B/U](../frontend/ENTREGAS_DO_PRODUTO.md#7b-e5b).
Não representa decisão clínica nem conclusão integral de E5B.

## Consulta elegível

GET `/v1/catalogos/medicamentos`: catálogo ativo paginado, autenticado para os
três perfis, sem vínculo de paciente. Retorna id textual, codigo, nome, ativo,
principioAtivo e classeMedicamento (textos nullable). Ordenação nome/id, mesmos
limit/offset dos catálogos vigentes. Não cria opções, não calcula doses nem
interpreta códigos; não publica timestamps ou metadados internos.

GET `/v1/pacientes/:id/atendimentos/:atendimentoId/medicamentos`: consulta
paginada, três perfis, vínculo clínico vigente e atendimento pertencente ao
paciente. Lista itens SQL09 sem consolidar ocorrências ou importar tratamentos
BZN canônicos. Ordem atendimento_medicamento_id DESC; IDs textuais, datas
YYYY-MM-DD ou null, indicadores true/false/null, textos literais. Ausência é[];
não equivale a ausência de uso. Sem POST/PATCH/DELETE neste recorte.

Allowlist: atendimentoMedicamentoId, atendimentoId, medicamentoId,
codigoMedicamento, nomeMedicamento, principioAtivo, classeMedicamento,
nomeMedicamentoLivre, tipoRegistro, finalidadeUso, dose, viaAdministracao,
frequencia, dataInicio, dataFim, usoAtual, prescritoNoAtendimento, statusUso,
motivo, observacoes. Campos de catálogo vêm de LEFT JOIN por FK, inclusive se
inativo; FK null não é substituída por correspondência textual. Os metadados do
catálogo são atuais, não um snapshot de identificação histórica. Nome livre e
nome do catálogo são separados. valor_original_* e timestamps ficam fora do HTTP.
Não corrigir/rejeitar datas legadas na leitura nem inferir status por datas.

## Escrita e restante do agregado

SQL09 armazena dose/frequência/via como texto, mas não possui campos próprios
para apresentação e unidade. A especificação de E5 exige esses elementos e
recusa de datas incompatíveis por regra aprovada. Antes de POST, definir destino
exato e semântica desses campos, identificação mínima (catálogo/nome livre),
cronologia admitida, origem e eventual vínculo com BZN; não presumir respostas
por enums físicos, desenho do protótipo ou leitura de legado. Nenhuma nova regra
clínica, migration, captura histórica ou mutação é autorizada por este contrato.
E5U de escrita depende desse contrato posterior; leitura pode avançar isoladamente.

## Critérios técnicos do recorte de leitura

Integração HTTP real PostgreSQL: catálogo ativo com null/texto, paginação estável,
IDs grandes, três perfis, credenciais/entrada inválida; dois atendimentos e dois
pacientes, autorização/revogação, literalidade/null/negativo, FK de catálogo
inativo e não identificado, nenhum dado bruto ou escrita oferecida. Testes não
constituem aceite humano, nem validam prescrição ou o agregado E5B.
