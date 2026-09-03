# Especificação do Encaminhamento Ampliado

Atualizado em: 2026-08-13

## Objetivo e escopo

Este documento é a fonte de verdade técnica para a última evolução física mínima
antes do MVP: ampliar o encaminhamento existente para registrar a apresentação do
documento e, quando informado, o projeto oficial de destino. As decisões
semânticas permanecem em `docs/dados/DECISOES_HUMANAS_NOVA_PLANILHA.md`; o schema
aplicado continua evidenciado por
`docs/evidencias/schema_atual_ambulatorio.sql`.

A estrutura foi implementada por `sql/16_encaminhamento_ampliado.sql` e validada
por `tests/sql/08_validar_encaminhamento_ampliado.sql`. Contrarreferência ficou
fora da migration porque sua multiplicidade continua indefinida e ela não está
inseparavelmente representada em `encaminhamento`.

## Diagnóstico do modelo físico atual

`encaminhamento`, criada por
`sql/08_tabelas_encaminhamentos_acompanhamento.sql`, é a tabela existente que
representa cada encaminhamento. Ela possui PK própria, exige `atendimento_id`,
aceita tipo catalogado, origem, destino, datas, status, prioridade, textos livres,
valores originais e timestamps. A FK do atendimento usa `ON DELETE CASCADE`.

O vínculo obrigatório com `atendimento` já torna o paciente inequívoco, porque
todo atendimento possui um único `paciente_id`. A chave de suporte
`UNIQUE (atendimento_id, paciente_id)` já existe em `atendimento`, mas não é
necessária para esta evolução enquanto `encaminhamento` não repetir
`paciente_id`.

As lacunas são locais à própria entidade: não há booleano para indicar que o
paciente apresentou o documento e não há referência ao catálogo
`projeto_estudo`. `valor_original_encaminhamento` é genérico e não substitui a
preservação separada dos dois novos campos de origem.

`acompanhamento_cuidado` pode apontar opcionalmente para um encaminhamento, mas
descreve acompanhamento/retorno. Ele não estabelece uma representação
inequívoca de contrarreferência nem resolve sua multiplicidade.

## Decisão estrutural

### Ampliar a tabela existente

A solução mínima é uma nova migration com `ALTER TABLE encaminhamento`. Não criar
nova tabela canônica nem estrutura associativa:

- os novos atributos pertencem a uma ocorrência de encaminhamento já identificada
  por `encaminhamento_id`;
- cada encaminhamento admite no máximo um projeto, portanto uma FK escalar é mais
  fiel que uma associação N:N;
- uma tabela paralela duplicaria identidade, atendimento, timestamps e regras de
  deleção sem resolver uma incompatibilidade de cardinalidade;
- alterar a migration antiga violaria a política de migrations aplicadas.

### Campos previstos

| Campo | Tipo | Nulabilidade/default | Finalidade |
| --- | --- | --- | --- |
| `documento_apresentado` | `BOOLEAN` | `NULL`, sem default | registra se o paciente apresentou o documento de encaminhamento |
| `projeto_estudo_id` | `BIGINT` | `NULL`, sem default | projeto oficial relacionado ao encaminhamento, quando identificado |
| `valor_original_documento_apresentado` | `TEXT` | `NULL` | preserva o conteúdo que originou o booleano |
| `valor_original_projeto` | `TEXT` | `NULL` | preserva a grafia original do projeto, inclusive alias ou valor não conciliado |

`documento_apresentado` é triestado no banco: `TRUE` significa documento
apresentado, `FALSE` significa documento não apresentado e `NULL` significa sem
informação estruturada. Não há evidência para torná-lo obrigatório nem para
atribuir default. O campo não significa emissão, solicitação, realização ou
entrega de contrarreferência.

`projeto_estudo_id` é opcional independentemente do booleano. Não impor `CHECK`
entre os dois campos: a fonte pode informar um projeto sem preencher a resposta
sobre o documento, e apresentação de documento não prova que um projeto foi
informado.

Os campos atuais permanecem com sua nulabilidade e semântica. `criado_em` e
`atualizado_em` já existem como `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` e
não serão duplicados. Eles representam processamento no sistema, não datas
assistenciais ou da planilha. Não será criado trigger; uma atualização deverá
atribuir `atualizado_em` explicitamente.

## Vínculos e cardinalidades

- um paciente pode possuir zero ou vários encaminhamentos, por meio de seus
  atendimentos;
- um atendimento pode possuir zero ou vários encaminhamentos;
- cada encaminhamento pertence exatamente a um atendimento e, indiretamente, a
  exatamente um paciente;
- cada encaminhamento aponta para zero ou um projeto oficial;
- um projeto oficial pode ser apontado por zero ou vários encaminhamentos.

Não adicionar `paciente_id` a `encaminhamento`. Isso repetiria informação já
determinada pela FK obrigatória para atendimento e exigiria manter consistência
entre dois vínculos. Se uma evolução futura tornar atendimento opcional, ela
deverá decidir conjuntamente a propriedade por paciente e usar a chave composta
já disponível; essa hipótese não faz parte do requisito atual.

Não criar `UNIQUE` por atendimento, paciente, projeto ou combinações desses
campos. Não há evidência de máximo de um encaminhamento por atendimento ou por
projeto, e ocorrências distintas precisam continuar representáveis.

## PKs, FKs, deleção e índices

- preservar `encaminhamento_pkey` em `encaminhamento_id`;
- preservar `fk_encaminhamento_atendimento`, com `atendimento_id NOT NULL` e
  `ON DELETE CASCADE`;
- preservar `fk_encaminhamento_tipo`, com `ON DELETE SET NULL`;
- adicionar `fk_encaminhamento_projeto`, de `projeto_estudo_id` para
  `projeto_estudo(projeto_estudo_id)`, com `ON DELETE RESTRICT`.

`RESTRICT` impede remover do catálogo um projeto oficial ainda referenciado e é
consistente com as associações de projeto já existentes. A migration não altera
nem cria projetos. BenBrasil e EPOCA continuam sendo os registros distintos de
códigos `benbrasil` e `epoca`; nenhum alias ou variante gera catálogo novo.

Adicionar `idx_encaminhamento_projeto_estudo_id` em `projeto_estudo_id`,
preferencialmente parcial com `WHERE projeto_estudo_id IS NOT NULL`, para consulta
inversa e suporte operacional à FK. Os índices atuais de atendimento, tipo,
status e data permanecem. Não criar índice no booleano, nos textos originais nem
índices compostos sem evidência de consulta e volume.

## Valores originais e conteúdo ambíguo

Os dois valores originais são anuláveis e independentes dos valores estruturados.
Eles permitem preservar respostas negativas, aliases, grafias variantes e
conteúdo que passou por normalização segura. O JSONB de `importacao_linha`
continua sendo a cópia bruta integral da linha.

Conteúdo ambíguo de `Trouxe encaminhamento` não deve ser convertido para
`FALSE`: permanece no bruto, pode ser preservado em
`valor_original_documento_apresentado` e gera pendência ou rejeição. Projeto não
conciliado com o catálogo permanece em `valor_original_projeto`, com
`projeto_estudo_id = NULL`, e também exige tratamento explícito. A presença de
texto original não autoriza dedução automática do valor estruturado.

## Convivência e estratégia incremental

1. A futura migration somente adicionará as quatro colunas, a FK e o índice à
   tabela `encaminhamento` existente.
2. Linhas existentes permanecerão válidas com os novos campos em `NULL`; não
   haverá backfill a partir de destino, origem, observações, tipo, atendimento ou
   estruturas de projeto.
3. Não haverá escrita dupla em `atendimento_projeto_estudo` ou
   `paciente_projeto_estudo`: participação em projeto e projeto de destino de um
   encaminhamento são relações diferentes.
4. O importador não criará projetos. Somente códigos oficiais previamente
   cadastrados poderão preencher a FK.
5. Não haverá dedução automática de BenBrasil, EPOCA ou outro projeto por textos
   de destino sem regra versionada de alias e conciliação.
6. `acompanhamento_cuidado`, `tipo_encaminhamento` e demais campos de
   `encaminhamento` permanecem intactos. Nenhuma estrutura será marcada como
   obsoleta nesta migration.
7. Contrarreferência não será copiada, inferida nem alterada.

## Integração futura com importação e proveniência

`importacao_registro` será reutilizada sem alteração. Ao criar, atualizar ou
associar um encaminhamento, o importador registrará:

- `tabela_destino = 'encaminhamento'`;
- `registro_id = encaminhamento_id`;
- `acao` igual a `criado`, `atualizado` ou `associado`, conforme a operação
  efetiva.

Várias linhas de importação podem apontar para um mesmo encaminhamento somente
quando a identidade tiver sido conciliada por regra auditável. A migration não
cria FK direta para lote ou linha. Idempotência, identidade entre
reprocessamentos e atualização de `atualizado_em` pertencem ao importador.

## Cenários do futuro teste SQL

O teste deverá usar dados exclusivamente sintéticos, `BEGIN`,
`ON_ERROR_STOP=1` e `ROLLBACK`, e validar ao menos:

1. encaminhamento com `documento_apresentado = TRUE`;
2. encaminhamento com `documento_apresentado = FALSE`;
3. aceitação de `NULL` como informação ausente;
4. preservação independente de ambos os valores originais;
5. encaminhamento sem projeto;
6. encaminhamento apontando para BenBrasil;
7. encaminhamento apontando para EPOCA como projeto distinto;
8. vários encaminhamentos apontando para o mesmo projeto;
9. vários encaminhamentos no mesmo atendimento, sem `UNIQUE` indevida;
10. encaminhamentos de atendimentos distintos do mesmo paciente;
11. rejeição de `atendimento_id NULL` e de atendimento inexistente;
12. rejeição de projeto inexistente;
13. `ON DELETE RESTRICT` ao tentar excluir projeto referenciado;
14. `ON DELETE CASCADE` ao excluir atendimento sintético;
15. paciente obtido inequivocamente pelo atendimento, sem coluna `paciente_id`
    redundante em `encaminhamento`;
16. coexistência sem alteração de `atendimento_projeto_estudo` e
    `paciente_projeto_estudo`;
17. ausência de backfill nas linhas de encaminhamento preexistentes;
18. defaults não nulos dos timestamps existentes e atualização explícita de
    `atualizado_em`;
19. existência das colunas, FK e índice propostos no catálogo PostgreSQL;
20. ausência de `UNIQUE` novo sobre atendimento, paciente ou projeto;
21. rastreabilidade por `importacao_registro` nas ações permitidas;
22. ausência de qualquer mudança em `acompanhamento_cuidado` para
    contrarreferência;
23. ausência de dados sintéticos persistidos depois do `ROLLBACK`.

## Pendências classificadas

### Bloqueio da migration

Nenhum bloqueio estrutural permaneceu. Tabela-alvo, campos, nulabilidade,
cardinalidades, PK, FK, deleção, índice, valores originais, timestamps,
convivência e fronteira de contrarreferência foram implementados e validados.

### Regra futura do importador

- mapear tokens confirmados de booleano sem converter vazio ou ambiguidade em
  `FALSE`;
- versionar aliases de projetos e resolver somente contra `projeto_estudo`;
- preservar os dois valores originais e a linha bruta;
- não criar projetos automaticamente;
- não confundir projeto de encaminhamento com participação do paciente;
- definir identidade, idempotência, conflitos e precedência em reprocessamentos;
- registrar cada destino em `importacao_registro` e atualizar
  `atualizado_em` explicitamente quando houver mudança efetiva.

Essas regras bloqueiam a carga estruturada real desse módulo, mas não a migration.

### Item adiável para depois do MVP

- definir cardinalidade e estrutura própria de contrarreferência;
- eventual vínculo direto de encaminhamento ao paciente se atendimento vier a se
  tornar opcional por requisito futuro;
- histórico temporal de alterações do projeto ou do documento apresentado;
- índices adicionais orientados por métricas reais;
- estratégia auditada para interpretar ou migrar registros legados já existentes.

## Prontidão

Status: **implementada e validada**.

`sql/16_encaminhamento_ampliado.sql` foi aplicada sem editar migrations
anteriores. Os 23 cenários alcançaram o `ROLLBACK` e a auditoria confirmou
ausência de dados sintéticos. Não houve backfill, escrita dupla, criação de
catálogo, inclusão de `paciente_id` nem alteração de contrarreferência.
