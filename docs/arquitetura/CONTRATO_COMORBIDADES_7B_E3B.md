# Comorbidades — 7B-E3B

Data: 2026-10-31. Base `0a2884c`, branch `feat/continuidade-m2-condicao`.
**E3B.1: catálogo somente leitura implementado e validado tecnicamente.**
E3B.2: avaliação por atendimento implementada e validada tecnicamente em
01/11/2026; decisões delegadas abaixo. Interface E3U também implementada e
validada tecnicamente; aceite humano permanece separado.

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

## Decisões adotadas em 01/11/2026 — delegação explícita do responsável

O responsável autorizou escolher as respostas pelo contexto antes da escrita.
Isso autoriza o desenho abaixo; não equivale a aceite humano da funcionalidade.

1. Avaliação própria por atendimento, sem herança automática. SQL06 e importador
   continuam sendo o legado por paciente; não são convertidos nem sobrescritos.
2. Histórico familiar cobre doenças relatadas, inclusive Chagas, em texto livre,
   separado dos resultados de exames. Não inferir parentesco, doença, resultado
   ou diagnóstico. O indicador familiar é triestado e admite descrição mesmo
   quando negativo/desconhecido; não há lista fechada de doenças.
3. Uma avaliação imutável por atendimento contém itens de catálogo e/ou histórico
   familiar. Ausência de avaliação é GET null; ausência de item é não avaliado;
   item presente exige indicador explícito true/false/null. Não há default true.
   Ausência de bloco familiar é não avaliado; bloco com indicador null é
   desconhecido explícito. Observações são independentes do indicador.
4. Correções/versionamento são unidade posterior, sem PATCH/PUT nesta entrega.
   Segundo POST recebe 409, sem substituir a avaliação anterior. Cadastro não
   propaga diagnósticos, condições ou associação legada de paciente.

## E3B.2 — contrato de criação e leitura por atendimento

`GET|POST /v1/pacientes/:id/atendimentos/:atendimentoId/comorbidades`.
GET admite consulta/edição/administração, POST edição/administração; ambos exigem
vínculo clínico vigente (administração segue política existente) e atendimento
pertencente ao paciente. IDs são texto decimal positivo na faixa bigint.

POST: `{ itens?: [{ comorbidadeId: string, possuiComorbidade: boolean|null,
observacoes?: string|null }], historicoFamiliar?: {
possuiDoenca: boolean|null, descricao?: string|null } }`.
Pelo menos um item ou bloco familiar. Array, quando presente, 1–100 itens,
sem IDs repetidos; null no lugar do array/bloco é inválido. Indicadores são
obrigatórios dentro dos objetos, inclusive para informar null explicitamente.
Textos até 10000 caracteres, sem trim/normalização clínica. IDs precisam existir
e estar ativos no momento da gravação. Nomes atuais são copiados para o snapshot;
inativação/renomeação posterior não oculta nem reinterpreta registros existentes.

POST 201: `{ avaliacaoComorbidadesId: string }`. GET 200: null ou
`{ avaliacaoComorbidadesId, atendimentoId, itens: [{ itemId, comorbidadeId,
nomeComorbidade, possuiComorbidade, observacoes }], historicoFamiliar: null|{
possuiDoenca, descricao } }`. Itens em ordem de ID de catálogo, máximo 100 por
avaliação; não truncar nem paginar silenciosamente. Nenhum campo bruto do
importador, credencial ou identificador interno de auditoria é publicado.

400 para DTO/catálogo inválido; 401/403/404 seguem as políticas existentes;
409 para avaliação já registrada. A avaliação, todos os filhos, captura atribuível
e recibo `avaliacaoComorbidadesId` usam uma transação; falha de filho reverte tudo.
Lock do atendimento serializa concorrência e UNIQUE impede substituição. Protocolo
vigente de UUID/hash recupera confirmação sem repetir POST. Captura prospectiva
não habilita revisão temporal destes campos. SQL68 é incremental, sem backfill,
sem alterar migrations antigas ou permissões de escrita do legado/importador.

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

## E3U — interface sobre o contrato

Leitura e criação em `/pacientes/:pacienteId/atendimentos/:atendimentoId/comorbidades`
e `/nova`; acessíveis pelo atendimento e pela consulta selecionada na ficha.
Origem da consulta preservada em URL. Catálogo paginado de 20 em 20; seleção
começa vazia, permanece entre páginas e não fabrica negativas. Selecionar um
item inicia indicador desconhecido explícito, alterável para Sim/Não. Observações
por item, inclusive Outras quando existente no catálogo, sem mapear automaticamente
as dez opções do protótipo para identidades diferentes na SQL06.

Histórico familiar começa não avaliado; desconhecido, Sim e Não são escolhas
explícitas. Relato independente do indicador. Textos não vazios são preservados
literalmente; textarea vazia é enviada como null. Campos desmarcados não entram
no corpo; rascunho conserva seus valores em memória. Revisão mostra todos os
itens selecionados, indicadores, observações e histórico familiar antes do POST.
Confirmação usa UUID/recibo existente, sem repetição automática; leitura consulta
somente este atendimento, inclusive após falha. Perfil consulta não escreve.

[Validação da interface](../validacoes/VALIDACAO_7B_E3U.md) distingue provas novas
da baseline reutilizada. A entrega não habilita edição/revisão temporal, alteração
de catálogo ou migração do legado, nem implica aceite humano de E3B/E3U/M3.

## Próximas unidades

Aceite humano de E3B/E3U separado da validação técnica. Próxima frente técnica:
reconhecimento dirigido de **7B-E4B**, eventos/dispositivos/óbito, confrontando
contratos existentes antes de publicar campos. Não iniciar essa unidade nesta
sessão: o responsável pediu encerrar após o commit imediato da interface.
