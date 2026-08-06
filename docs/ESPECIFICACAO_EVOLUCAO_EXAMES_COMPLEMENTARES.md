# Especificação da Evolução dos Exames Complementares

Atualizado em: 2026-08-06

## Objetivo e escopo

Este documento é a fonte de verdade técnica para a futura evolução incremental
dos exames complementares do novo layout. As decisões semânticas permanecem em
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`; o schema aplicado continua evidenciado
por `docs/evidencias/schema_atual_ambulatorio.sql`.

Esta etapa não cria migration, tabela ou teste SQL e não altera o schema atual.
Não autoriza importar dados reais, deduzir resultados clínicos nem converter
célula vazia em resposta negativa.

## Diagnóstico do modelo físico atual

O módulo criado por `sql/07_tabelas_exames_complementares.sql` possui:

- `tipo_exame_complementar`: catálogo reutilizável, com código único, categoria,
  descrição e estado ativo;
- `atendimento_exame_complementar`: registro de exame com
  `atendimento_id NOT NULL`, tipo obrigatório, origem, status, datas, textos,
  valores originais e timestamps;
- `exame_complementar_resultado`: detalhes estruturados vinculados exclusivamente
  a `atendimento_exame_complementar`.

O catálogo e os campos textuais demonstram conceitos reaproveitáveis. A
cardinalidade da tabela principal, porém, é incompatível com a decisão aprovada:
o exame pertence obrigatoriamente ao paciente e não ao atendimento em que foi
digitado. Tornar o vínculo atual opcional por `ALTER TABLE` exigiria adicionar e
preencher `paciente_id` em registros legados ou aceitar linhas sem paciente. Uma
associação adicional paciente–exame manteria a identidade clínica presa à tabela
por atendimento e criaria dois caminhos obrigatórios para a mesma relação.

## Decisão estrutural

### Nova tabela canônica

Criar futuramente `paciente_exame_complementar` como nova tabela canônica para os
fluxos do MVP. Preservar integralmente `atendimento_exame_complementar` e
`exame_complementar_resultado` como estruturas legadas/contextuais, sem backfill,
remoção, alteração de nulabilidade ou migração silenciosa.

Reutilizar `tipo_exame_complementar`. A migration futura poderá inserir somente
os tipos oficiais comprovadamente ausentes no catálogo; não deverá alterar os
registros de tipo já existentes.

### Campos propostos

| Campo | Tipo | Nulabilidade/default | Finalidade |
| --- | --- | --- | --- |
| `paciente_exame_complementar_id` | `BIGSERIAL` | `PRIMARY KEY` | identidade técnica de cada ocorrência de exame |
| `paciente_id` | `BIGINT` | `NOT NULL` | paciente ao qual o exame pertence |
| `atendimento_id` | `BIGINT` | `NULL` | atendimento clínico relacionado, quando comprovado |
| `tipo_exame_complementar_id` | `BIGINT` | `NOT NULL` | tipo oficial ou tipo genérico `outro` |
| `bloco_origem` | `VARCHAR(20)` | `NOT NULL` | `trazido` ou `solicitado` |
| `tipo_exame_original` | `TEXT` | `NULL` | rótulo ou tipo livre da origem, especialmente quando não catalogado |
| `resultado_texto` | `TEXT` | `NULL` | resultado livre, sem interpretação clínica automática |
| `observacoes` | `TEXT` | `NULL` | contexto textual adicional |
| `valor_original_resultado` | `TEXT` | `NULL` | conteúdo bruto que originou o resultado ou estado registrado |
| `valor_original_observacao` | `TEXT` | `NULL` | observação bruta da origem, quando houver |
| `criado_em` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | criação no sistema |
| `atualizado_em` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | atualização controlada pela aplicação/importador |

Não propor datas clínicas, resultado padronizado, valor numérico, unidade ou
referência sem evidência da fonte. Os timestamps representam processamento no
sistema e não datas do exame ou da planilha. A primeira versão não exige trigger
para `atualizado_em`; atualizações deverão atribuí-lo explicitamente.

## Chaves, relacionamentos e deleção

- PK `paciente_exame_complementar_pkey` em
  `paciente_exame_complementar_id`;
- FK `fk_paciente_exame_paciente`: `paciente_id` referencia
  `paciente(paciente_id)` com `ON DELETE CASCADE`;
- FK `fk_paciente_exame_tipo`: `tipo_exame_complementar_id` referencia
  `tipo_exame_complementar(tipo_exame_complementar_id)` com
  `ON DELETE RESTRICT`;
- `atendimento_id` é opcional e nunca define a propriedade do exame.

Para garantir no banco que um atendimento informado pertence ao mesmo paciente,
a migration futura deverá adicionar a
`atendimento` a constraint redundante, mas necessária como chave referenciada,
`uq_atendimento_id_paciente UNIQUE (atendimento_id, paciente_id)`. A nova tabela
usará a FK composta `fk_paciente_exame_atendimento_paciente` em
`(atendimento_id, paciente_id)` referenciando esse par, com
`ON DELETE SET NULL (atendimento_id)`. Assim:

- quando `atendimento_id` for `NULL`, o exame continua válido pelo paciente;
- quando informado, atendimento e paciente precisam coincidir;
- excluir um atendimento remove somente o vínculo opcional, preservando o exame;
- excluir o paciente remove seus exames pela FK direta com `CASCADE`.

Essa constraint em `atendimento` não exige backfill: o par já existe em todas as
linhas e `atendimento_id` é PK. Nenhuma coluna ou linha legada de exame é alterada.

## Blocos e multiplicidade

`bloco_origem` representa os dois conceitos confirmados:

- `trazido`: ocorrência do bloco “Paciente trouxe outros exames
  complementares?”;
- `solicitado`: ocorrência do bloco “Solicitado exames complementares?”.

Não usar dois booleanos para representar os blocos: cada ocorrência da fonte gera
no máximo uma linha própria quando houver informação, e uma linha pertence a um
único bloco. Célula vazia não gera exame nem linha negativa.

Não criar `UNIQUE` envolvendo paciente, tipo, bloco ou atendimento. Um paciente
pode possuir várias linhas do mesmo tipo, inclusive dentro do mesmo bloco, em
atendimentos diferentes ou sem atendimento. A identidade técnica distingue cada
ocorrência.

## Tipos catalogados e livres

Os códigos existentes reutilizáveis incluem `ecocardiograma`, `holter`,
`teste_ergometrico`, tipos laboratoriais e de imagem específicos e `outro`. A
migration futura deverá acrescentar ao catálogo, com códigos estáveis e sem
duplicar conceitos existentes, os tipos genéricos confirmados ainda ausentes:

- `laboratoriais`;
- `imagem`;
- `endoscopia`;
- `colonoscopia`;
- `mapa`.

O cabeçalho `ECO` será mapeado pelo importador para `ecocardiograma`. Valores de
“Outros” ou nomes não catalogados usam o registro oficial `outro` e preservam a
grafia em `tipo_exame_original`; o importador não cria tipos automaticamente. O
tipo `nao_informado` não deve ser usado para célula vazia, pois vazio significa
ausência de informação e não gera registro.

## Valores originais, resultado e observação

`resultado_texto` recebe somente texto cuja função de resultado esteja definida
pelo manifesto. Nenhuma normalização clínica, interpretação, unidade ou data será
inferida. `valor_original_resultado` preserva o conteúdo da célula antes de
qualquer normalização segura; `tipo_exame_original` preserva tipo/rótulo livre;
`valor_original_observacao` preserva eventual observação bruta.

Conteúdo ambíguo permanece em `importacao_linha.dados_brutos` e gera pendência ou
rejeição. Não será promovido silenciosamente a resultado, observação ou resposta
negativa.

## Índices e constraints

Além das constraints de chave e do `CHECK (bloco_origem IN ('trazido',
'solicitado'))`, criar:

- `idx_paciente_exame_paciente_id` em `paciente_id`;
- `idx_paciente_exame_tipo_id` em `tipo_exame_complementar_id`;
- `idx_paciente_exame_atendimento_id` em `atendimento_id`, preferencialmente
  parcial com `WHERE atendimento_id IS NOT NULL`.

Não criar índice ou `UNIQUE` em resultado livre, valores originais, bloco isolado
ou combinação paciente–tipo. Índices adicionais dependem de evidência de consulta
e volume.

## Cabeçalhos repetidos e proveniência

Aba, versão do layout, posição da coluna, bloco, tipo e ocorrência pertencem ao
manifesto futuro. `importacao_linha.dados_brutos` preserva a sequência física e
os cabeçalhos repetidos; o manifesto resolve cada célula pela chave composta de
aba + posição + bloco + tipo + ocorrência.

Depois de criar uma linha de `paciente_exame_complementar`, o importador registra:

- `tabela_destino = 'paciente_exame_complementar'`;
- `registro_id = paciente_exame_complementar_id`;
- ação `criado` ou `associado`, conforme a operação efetiva.

Não haverá FK direta da nova tabela para lote ou linha. A proveniência N:N
continua em `importacao_registro`. Como exames são ocorrências e não estado
consolidado por paciente–tipo, reprocessamento não deve localizar ou sobrescrever
uma linha apenas por paciente, tipo ou bloco; idempotência e reconciliação deverão
usar a identidade da origem e auditoria explícita.

## Convivência e transição

1. A migration incremental cria `paciente_exame_complementar`, acrescenta os tipos
   oficiais ausentes e a chave composta de suporte em `atendimento`.
2. `atendimento_exame_complementar` e `exame_complementar_resultado` permanecem
   intactas e consultáveis como legado/contexto por atendimento.
3. Não haverá backfill automático: derivar paciente pelo atendimento é
   tecnicamente possível, mas não prova que o registro antigo representa a mesma
   ocorrência do novo layout nem resolve bloco, posição ou duplicidade.
4. Novos fluxos do MVP gravarão na tabela canônica por paciente; não haverá escrita
   dupla automática.
5. Consumidores não devem unir ou deduplicar silenciosamente tabelas antiga e
   nova. Migração auditada, visão de leitura ou descontinuação da antiga exige
   decisão e migration próprias.

## Cenários do futuro teste SQL

O teste deverá usar dados sintéticos, `BEGIN`, `ON_ERROR_STOP=1` e `ROLLBACK`, e
validar ao menos:

1. exame obrigatório por paciente sem atendimento;
2. exame com atendimento pertencente ao mesmo paciente;
3. rejeição de atendimento pertencente a outro paciente;
4. vários exames do mesmo tipo para um paciente;
5. mesmo tipo repetido nos blocos `trazido` e `solicitado`;
6. vários pacientes com o mesmo tipo de exame;
7. tipos ECO, laboratoriais, imagem, Holter, endoscopia, colonoscopia, teste
   ergométrico, MAPA e outro presentes ou corretamente reutilizados no catálogo;
8. tipo livre representado por `outro` com `tipo_exame_original` preservado;
9. resultado, observação e valores originais como textos livres;
10. campos textuais opcionais aceitando `NULL` sem conversão para negativo;
11. rejeição de `paciente_id`, tipo e bloco nulos;
12. rejeição de bloco fora de `trazido` e `solicitado`;
13. rejeição de FKs inexistentes;
14. `ON DELETE CASCADE` ao excluir paciente sintético;
15. `ON DELETE SET NULL` ao excluir atendimento sintético, preservando o exame;
16. `ON DELETE RESTRICT` ao excluir tipo referenciado;
17. defaults não nulos dos timestamps e atualização explícita de
    `atualizado_em`;
18. existência da PK, FKs, chave composta de suporte, `CHECK` e índices no
    catálogo PostgreSQL;
19. coexistência independente com `atendimento_exame_complementar` e
    `exame_complementar_resultado`;
20. duas células/cabeçalhos repetidos da mesma linha apontando para ocorrências de
    exame distintas por `importacao_registro`;
21. ausência de `UNIQUE` por paciente–tipo e ausência de backfill legado;
22. ausência de dados sintéticos persistidos depois do `ROLLBACK`.

## Pendências classificadas

### Bloqueio da migration

Nenhum bloqueio estrutural permanece. Nome, identidade, campos, tipos mínimos,
cardinalidades, consistência paciente–atendimento, deleções, multiplicidade,
índices, convivência e estratégia sem backfill estão definidos.

O PostgreSQL local 16.14 suporta a estratégia proposta. Um ambiente alvo com
versão diferente deverá ter a compatibilidade da sintaxe
`ON DELETE SET NULL (atendimento_id)` confirmada antes da implantação; isso é uma
checagem de portabilidade, não um bloqueio da migration no ambiente atual.

### Regra futura do importador

- versionar o manifesto por aba e layout com posição, bloco, tipo e ocorrência;
- mapear aliases como `ECO` e `Mapa` para códigos oficiais;
- não criar linha para célula vazia;
- separar texto de resultado, tipo livre e observação conforme o manifesto;
- preservar todo conteúdo original e manter ambiguidade somente no bruto;
- não criar automaticamente novos tipos a partir de texto livre;
- definir idempotência, conflitos e reprocessamento por identidade da origem;
- registrar cada destino em `importacao_registro`.

### Item adiável para depois do MVP

- estrutura de resultados numéricos, unidades, referências e interpretação
  clínica para os novos exames;
- datas próprias de solicitação, realização ou resultado sem fonte confirmada;
- migração auditada ou marcação formal dos registros legados;
- visão unificada entre tabelas antiga e nova;
- índices adicionais orientados por métricas;
- importação das abas operacional e AIM3.

## Prontidão

Status: **especificação pronta para migration incremental** no PostgreSQL local
16.14. Nenhuma regra do importador precisa ser implementada para criar e testar a
estrutura física.
