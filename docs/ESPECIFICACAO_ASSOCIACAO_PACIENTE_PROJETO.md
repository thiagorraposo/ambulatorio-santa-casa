# Especificação da Associação Paciente–Projeto

Atualizado em: 2026-08-06

## Objetivo e escopo

Este documento especifica a associação incremental entre pacientes e o
catálogo existente de projetos. É a fonte de verdade para a migration
desse vínculo. As decisões semânticas permanecem em
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`, e o schema aplicado continua descrito
em `docs/MODELO_FISICO_ATUAL.md` e evidenciado por
`docs/evidencias/schema_atual_ambulatorio.sql`.

A estrutura foi implementada por `sql/13_associacao_paciente_projeto.sql` e
validada por `tests/sql/05_validar_associacao_paciente_projeto.sql`.

## Decisão estrutural

### Nome e finalidade

Nome proposto: `paciente_projeto_estudo`.

Finalidade: representar o estado consolidado da relação entre um paciente e um
projeto oficial, independentemente de atendimento, preservando participação,
pendência, falha e os textos originais da fonte.

`projeto_estudo` continua sendo o catálogo canônico. BenBrasil e EPOCA permanecem
registros distintos, identificados respectivamente pelos códigos `benbrasil` e
`epoca`. As variantes de falha não criam novos projetos: apontam para o projeto
principal e usam `houve_falha` para registrar separadamente essa condição.

### Cardinalidades

- um paciente pode possuir zero, uma ou várias associações com projetos;
- um projeto pode estar associado a zero, um ou vários pacientes;
- cada par paciente–projeto possui no máximo uma linha consolidada;
- a associação não depende de atendimento;
- uma linha pode preservar estado desconhecido por meio de booleanos anuláveis.

## Campos propostos

| Campo | Tipo | Nulabilidade/default | Finalidade |
| --- | --- | --- | --- |
| `paciente_projeto_estudo_id` | `BIGSERIAL` | `PRIMARY KEY` | identificador técnico |
| `paciente_id` | `BIGINT` | `NOT NULL` | paciente associado |
| `projeto_estudo_id` | `BIGINT` | `NOT NULL` | projeto oficial associado |
| `participa` | `BOOLEAN` | `NULL` | sim, não ou não informado sobre participação |
| `possui_pendencia` | `BOOLEAN` | `NULL` | sim, não ou não informado sobre pendência |
| `descricao_pendencia` | `TEXT` | `NULL` | detalhe livre da pendência |
| `houve_falha` | `BOOLEAN` | `NULL` | sim, não ou não informado sobre falha no projeto |
| `descricao_falha` | `TEXT` | `NULL` | detalhe livre da falha |
| `valor_original_participacao` | `TEXT` | `NULL` | valor bruto usado para interpretar participação |
| `valor_original_pendencia` | `TEXT` | `NULL` | valor bruto usado para interpretar pendência |
| `valor_original_falha` | `TEXT` | `NULL` | valor bruto usado para interpretar falha |
| `observacoes` | `TEXT` | `NULL` | contexto não representado pelos campos anteriores |
| `criado_em` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | criação do registro no banco |
| `atualizado_em` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | última atualização controlada pela aplicação/importador |

Os timestamps representam processamento no sistema, não datas clínicas nem datas
da planilha. A primeira versão não exige trigger para `atualizado_em`; toda
atualização deverá atribuí-lo explicitamente na mesma transação.

## Chaves, constraints, índices e deleção

### Chaves e unicidade

- PK: `paciente_projeto_estudo_pkey` em
  `paciente_projeto_estudo_id`;
- FK `fk_paciente_projeto_paciente`: `paciente_id` referencia
  `paciente(paciente_id)` com `ON DELETE CASCADE`;
- FK `fk_paciente_projeto_projeto`: `projeto_estudo_id` referencia
  `projeto_estudo(projeto_estudo_id)` com `ON DELETE RESTRICT`;
- `uq_paciente_projeto UNIQUE (paciente_id, projeto_estudo_id)`.

O `CASCADE` remove vínculos sem identidade própria quando um paciente é removido.
O `RESTRICT` impede excluir um projeto oficial ainda referenciado. A constraint
única materializa o estado consolidado e impede duplicar o mesmo projeto para o
mesmo paciente.

### Índices

- a constraint `uq_paciente_projeto` já atende consultas iniciadas por
  `paciente_id`; não deve ser criado índice redundante apenas nessa coluna;
- criar `idx_paciente_projeto_projeto_id` em `projeto_estudo_id` para consultas
  inversas e suporte à FK;
- não criar nesta fase índices parciais por participação, pendência ou falha sem
  evidência de consulta ou volume que os justifique.

### Regras de consistência

Não serão criados `CHECK`s condicionais entre os booleanos e suas descrições. A
origem pode conter informação incompleta ou contraditória, que deve permanecer
auditável em vez de ser rejeitada pelo banco. Também não haverá `CHECK` que
consulte o código do catálogo para limitar `houve_falha`, pois uma constraint de
linha não deve depender de outra tabela.

## Participação, pendência e falha

Os três booleanos são triestados:

- `TRUE`: condição afirmada;
- `FALSE`: condição negada;
- `NULL`: ausente, vazia, desconhecida, ambígua ou ainda não reconciliada.

`descricao_pendencia` e `descricao_falha` preservam detalhes normalizados ou
livres. Os três campos `valor_original_*` preservam separadamente os textos que
originaram cada interpretação.

Para `BenBrasil falha`, o importador deverá usar o projeto `benbrasil` e registrar
`houve_falha = TRUE`. Para `EPOCA falha`, deverá usar `epoca` e registrar
`houve_falha = TRUE`. A grafia da coluna ou célula permanece em
`valor_original_falha` e na linha bruta de importação. Falha não implica, por
constraint, `participa = TRUE`: combinações contraditórias devem ser encaminhadas
à regra de reconciliação do importador.

## Integração com importação e proveniência

`importacao_registro` será reutilizada sem alteração. Depois de criar, atualizar
ou associar uma linha de `paciente_projeto_estudo`, o importador registrará o
destino com:

- `tabela_destino = 'paciente_projeto_estudo'`;
- `registro_id = paciente_projeto_estudo_id`;
- ação `criado`, `atualizado` ou `associado`, conforme a operação efetiva.

Várias `importacao_linha` podem apontar para a mesma associação consolidada. A
nova tabela não terá FK direta para atendimento, lote ou linha, pois
`importacao_registro` já representa a proveniência N:N e evita atribuir a relação
do paciente a um único atendimento de digitação.

## Convivência e transição

`atendimento_projeto_estudo` permanece física e semanticamente intacta. Ela
continua representando vínculos legados ou contextuais registrados por
atendimento; a nova tabela representa a relação canônica por paciente.

Regras de transição:

1. a migration cria somente `paciente_projeto_estudo`, suas constraints e
   seu índice; não altera nem remove a associação antiga;
2. não haverá backfill automático a partir de `atendimento_projeto_estudo`, pois
   múltiplos atendimentos podem conter estados divergentes e a conversão exige
   regra de reconciliação e auditoria;
3. após a implantação, novos fluxos do MVP e o futuro importador gravarão a
   relação canônica exclusivamente em `paciente_projeto_estudo`;
4. consumidores que precisem de participação por paciente consultarão a nova
   tabela; a antiga não será agregada silenciosamente como substituta;
5. o uso para novas escritas em `atendimento_projeto_estudo` só poderá ser
   descontinuado depois que todos os escritores forem identificados e migrados;
6. eventual backfill, marcação formal de legado ou remoção física da tabela
   antiga fica fora do MVP e exigirá decisão própria, auditoria dos dados e nova
   migration incremental. A migration desta especificação não autoriza essas
   ações.

## Cenários do teste SQL

O teste deverá usar dados sintéticos, `BEGIN` e `ROLLBACK`, e validar:

1. inserção de um paciente associado a vários projetos;
2. associação de vários pacientes ao mesmo projeto;
3. coexistência independente de BenBrasil e EPOCA para o mesmo paciente;
4. representação de `BenBrasil falha` e `EPOCA falha` pelo projeto principal com
   `houve_falha = TRUE`, sem criar projetos de falha;
5. preservação de participação, pendência, falha, descrições e valores originais;
6. aceitação de `TRUE`, `FALSE` e `NULL` nos três estados;
7. aceitação auditável de combinações incompletas ou contraditórias;
8. rejeição de duplicidade do par `(paciente_id, projeto_estudo_id)`;
9. rejeição de `paciente_id` e `projeto_estudo_id` nulos;
10. rejeição de FKs inexistentes;
11. `ON DELETE CASCADE` ao excluir paciente sintético;
12. `ON DELETE RESTRICT` ao tentar excluir projeto ainda referenciado;
13. defaults não nulos de `criado_em` e `atualizado_em` e atualização explícita de
    `atualizado_em`;
14. coexistência com uma linha em `atendimento_projeto_estudo`, sem alteração ou
    conflito entre as duas associações;
15. rastreabilidade sintética por `importacao_registro` nas ações permitidas e
    possibilidade de várias linhas apontarem para o mesmo destino;
16. existência da PK, FKs, `UNIQUE` e índice propostos no catálogo PostgreSQL;
17. ausência de dados sintéticos persistidos depois do `ROLLBACK`.

## Pendências classificadas

### Bloqueio da migration

Nenhum bloqueio estrutural permanece. Nome, cardinalidades, campos, constraints,
índice, deleções, convivência e fronteira de transição estão definidos. A
associação está pronta para orientar uma nova migration incremental e seu teste
SQL sintético.

### Regra futura do importador

- mapear aliases e ocorrências de cada projeto para o código oficial;
- transformar variantes de falha no projeto principal com `houve_falha = TRUE`;
- diferenciar célula vazia, valor negativo e conteúdo ambíguo;
- consolidar estados repetidos do mesmo paciente–projeto sem sobrescrever
  silenciosamente contradições;
- definir precedência entre linhas, lotes e reprocessamentos;
- registrar revisão humana e cada destino em `importacao_registro`;
- atribuir `atualizado_em` explicitamente quando houver mudança efetiva.

Essas regras bloqueiam o importador real, mas não a criação da estrutura física.

### Item adiável para depois do MVP

- histórico temporal de participação, pendência e falha;
- datas próprias de entrada, saída, pendência ou falha no projeto;
- backfill auditado da associação antiga;
- marcação formal ou remoção física de `atendimento_projeto_estudo`;
- índices adicionais orientados por métricas reais de uso;
- fluxo das abas AIM3 e eventual relação com participação em projetos.

## Implementação e validação

Status: **implementada e validada**.

`sql/13_associacao_paciente_projeto.sql` foi aplicada de forma controlada sem
editar migrations anteriores. O teste transacional cobriu os 17 cenários, atingiu
o `ROLLBACK` e confirmou ausência de dados sintéticos persistidos. A evidência
estrutural e a documentação física foram atualizadas.
