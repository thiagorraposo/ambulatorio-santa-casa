# Comorbidades — 7B-E3B

Data: 2026-10-31. Base `0a2884c`, branch `feat/continuidade-m2-condicao`.
**E3B.1: catálogo somente leitura implementado e validado tecnicamente.**
Escrita clínica e interface de seleção permanecem planejadas, com as decisões
pendentes abaixo; esta especificação não as aprova por associação.

## Evidência e conflito a resolver antes da escrita

[SQL06](../../sql/06_tabelas_condicoes_comorbidades.sql) possui catálogo
`comorbidade` e associação `paciente_comorbidade`. A associação tem unicidade
por paciente/comorbidade, atendimento opcional e `possui_comorbidade BOOLEAN
NOT NULL DEFAULT TRUE`. Ela representa um registro por par, não múltiplas
avaliações independentes de uma mesma comorbidade em atendimentos distintos.

O [catálogo de entregas](../frontend/ENTREGAS_DO_PRODUTO.md#7b-e3b) pede presença,
negativa e desconhecido distintos, observações e snapshots em duas consultas.
O modelo atual não armazena null nesse indicador; omitir um campo e aceitar o
default true fabricaria presença. Ausência de associação não pode ser
apresentada automaticamente como uma negativa ou um desconhecido explícito.

O importador reconcilia o par já existente em `Importer.comorbidities`, conforme
suas regras de proveniência; esse comportamento não define a nova semântica da
interface. Não reinterpretar legado nem transformar o atendimento opcional em
histórico completo. A seleção das dez categorias do protótipo também não
estabelece identidade automática com todos os nomes atuais do catálogo.

Antes de criar DTO/migration/escrita, confirmar:

1. Avaliação própria por atendimento preservando consultas anteriores, ou
   estado atual único do paciente com histórico auditável? O primeiro exige
   compatibilizar a cardinalidade física com os snapshots pedidos; o segundo
   exige esclarecer o critério do catálogo que pede consultas distintas.
2. “Histórico de doença familiar” refere-se somente a Chagas ou também a outras
   doenças, e quais informações são necessárias? D3 trata exames de familiares,
   não autoriza convertê-los em histórico de doença. Não inventar categorias,
   cardinalidades ou obrigatoriedades desse bloco.

Essas perguntas foram apresentadas ao responsável nesta sessão. Nenhuma
resposta foi registrada até a preparação deste documento. Não há escolha
implícita por silêncio; as opções são alternativas em revisão, não regras novas.

## E3B.1 — catálogo ativo publicado no código

`GET /v1/catalogos/comorbidades?limit=20&offset=0`, JWT obrigatório e usuário ativo.
Consulta, edição e administração usam a mesma política dos catálogos existentes,
sem exigir vínculo de paciente para metadados globais. Não consulta ou altera
`paciente_comorbidade`, nem concede capacidade de escrita clínica.

200: array de `{ id: string, nome: string, ativo: true }`. IDs decimais textuais,
nomes exatamente como armazenados; não normalizar/renomear categorias. A tabela
não tem `codigo`, portanto não devolver nome/ID como um código clínico inventado.
Não expor descrição interna, timestamps ou associações de pessoas.

Usar PageQuery: limit padrão 20, intervalo 1–100; offset padrão 0, intervalo 0–100000.
Somente ativos, ordem `nome_comorbidade,comorbidade_id`, parâmetros SQL separados.
Página vazia responde `[]`, sem total fabricado. O cliente não pode pedir inativos
ou enviar pacienteId por parâmetro extra. Credencial ausente/inválida/expirada
ou usuário inativo segue 401; paginação/propriedade extra inválida segue 400.

POST/PATCH/PUT/DELETE do catálogo não foram publicados; não há comandos de
administração de categorias nesta unidade. Os três catálogos anteriores mantêm
seus caminhos e DTO com `codigo`; o DTO do novo catálogo é distinto.

Não precisou migration/grant: SELECT da tabela existente já pertence à role
limitada usada pela API. [Validação](../validacoes/VALIDACAO_7B_E3B_1.md) com
PostgreSQL real sintético comprova esse acesso e a ausência de escrita clínica.

## Próximas unidades, após as definições

Definir contrato da avaliação clínica e histórico familiar sem usar default true
como resposta ausente. Conferir vínculo paciente/atendimento, gravação
transacional, origem temporal, concorrência, auditoria prospectiva/guarda de
revisão e recuperação por intenção conforme o protocolo vigente. Qualquer
alteração estrutural deve ser incremental, sem modificar SQL06 ou fazer
backfill sem semântica aprovada. A nova leitura de catálogo não habilita esses
comandos nem autoriza construir campo editável sem destino HTTP.

Provas futuras devem distinguir ausência/negativa/desconhecido, duas consultas,
catálogo inativo, autorização, rollback e recuperação. Essas são condições de
aceite planejadas, não resultados executados da escrita. M2 mantém aceite
próprio; este recorte não conclui E3B/E3U ou M3.
