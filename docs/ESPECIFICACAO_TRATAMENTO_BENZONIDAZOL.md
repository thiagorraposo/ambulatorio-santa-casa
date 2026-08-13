# Especificação do Tratamento com Benzonidazol

Atualizado em: 2026-08-13

## Objetivo e escopo

Este documento é a fonte de verdade técnica para a migration incremental
do tratamento com benzonidazol (BZN) e de suas reações adversas no MVP. As
decisões semânticas permanecem em
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`; o schema aplicado continua descrito em
`docs/MODELO_FISICO_ATUAL.md` e evidenciado por
`docs/evidencias/schema_atual_ambulatorio.sql`.

A estrutura foi implementada por `sql/15_tratamento_benzonidazol.sql` e validada
pelos 27 cenários de `tests/sql/07_validar_tratamento_benzonidazol.sql`. A
especificação não autoriza importação de dados reais e não
define conduta clínica. Célula vazia continua significando informação ausente,
nunca resposta negativa.

## Diagnóstico do modelo físico atual

`tratamento_chagas`, criado por
`sql/09_tabelas_medicamentos_tratamentos.sql`, representa tratamento etiológico
ou específico associado obrigatoriamente a um atendimento. A tabela possui
indicadores de indicação, início, conclusão e evento adverso, datas de indicação,
início e fim, um motivo genérico de não tratamento, descrição única de eventos
adversos, status, adesão e valores originais.

Ela não atende às decisões do MVP porque:

- `atendimento_id` é obrigatório e a propriedade clínica não está diretamente
  vinculada ao paciente;
- não existe unicidade que limite o BZN a um tratamento por paciente;
- a tabela não é exclusiva de BZN e `medicamento_id` é opcional;
- `motivo_nao_tratamento` mistura potencialmente não indicação e não início;
- não existem duração cumprida em dias, texto original da duração, ano aproximado,
  data específica de prescrição ou indicador de realização pelo ambulatório;
- `eventos_adversos` e `descricao_eventos_adversos` permitem somente um resumo,
  sem repetição, gravidade, data ou consequência por ocorrência;
- converter registros existentes exigiria inferir paciente, medicamento,
  equivalência semântica e consolidação de possíveis duplicidades.

Por isso, alterar incrementalmente `tratamento_chagas` não resolveria a identidade
canônica sem reinterpretar o legado. A estrutura existente permanece válida para
registros antigos ou contextuais por atendimento, mas não será o destino dos
novos fluxos de BZN do MVP.

## Decisão estrutural

### Nova tabela canônica de tratamento

Criar `tratamento_benzonidazol` como tabela canônica do MVP. Uma linha representa
o estado consolidado do tratamento com BZN de um paciente, independentemente do
atendimento em que a informação foi registrada.

Não adicionar `medicamento_id`: a identidade do medicamento já é determinada
inequivocamente pela finalidade da tabela. Vinculá-la a uma linha opcional do
catálogo permitiria inconsistência com outro medicamento e não acrescentaria
informação confirmada para o MVP.

### Cardinalidades

- um paciente possui zero ou um `tratamento_benzonidazol`;
- um tratamento pertence obrigatoriamente a exatamente um paciente;
- um tratamento se relaciona com zero ou um atendimento comprovadamente do mesmo
  paciente;
- um tratamento possui zero, uma ou várias
  `reacao_adversa_benzonidazol`;
- cada reação pertence obrigatoriamente a exatamente um tratamento.

A ausência da linha de tratamento significa apenas que não existe informação
estruturada consolidada. Não equivale a ausência de indicação, de uso ou de
reação.

## Campos de `tratamento_benzonidazol`

| Campo | Tipo | Nulabilidade/default | Finalidade |
| --- | --- | --- | --- |
| `tratamento_benzonidazol_id` | `BIGSERIAL` | `PRIMARY KEY` | identidade técnica do tratamento canônico |
| `paciente_id` | `BIGINT` | `NOT NULL` | paciente ao qual o tratamento pertence |
| `atendimento_id` | `BIGINT` | `NULL` | atendimento relacionado, somente quando comprovado |
| `tem_indicacao` | `BOOLEAN` | `NULL` | sim, não ou não informado para indicação de BZN |
| `iniciado` | `BOOLEAN` | `NULL` | sim, não ou não informado sobre início/uso do BZN |
| `tratamento_pelo_ambulatorio` | `BOOLEAN` | `NULL` | sim, não ou não informado sobre prescrição e acompanhamento pelo ambulatório |
| `duracao_cumprida_dias` | `INTEGER` | `NULL` | duração efetivamente cumprida, normalizada em dias |
| `ano_uso_aproximado` | `INTEGER` | `NULL` | ano aproximado informado, sem fabricar dia ou mês |
| `data_prescricao` | `DATE` | `NULL` | data representada pelo cabeçalho `Prescrição do BZN` |
| `motivo_nao_indicacao` | `TEXT` | `NULL` | motivo ligado exclusivamente à resposta negativa de indicação |
| `motivo_nao_inicio` | `TEXT` | `NULL` | motivo de não iniciar apesar do contexto de tratamento, quando houver fonte inequívoca |
| `teve_reacao_adversa` | `BOOLEAN` | `NULL` | sim, não ou não informado sobre reação adversa ao BZN |
| `valor_original_indicacao` | `TEXT` | `NULL` | valor bruto que originou `tem_indicacao` |
| `valor_original_inicio` | `TEXT` | `NULL` | valor bruto que originou `iniciado` |
| `valor_original_tratamento_ambulatorio` | `TEXT` | `NULL` | valor bruto do indicador do ambulatório |
| `valor_original_duracao` | `TEXT` | `NULL` | duração exatamente como recebida antes da conversão |
| `valor_original_ano_uso` | `TEXT` | `NULL` | ano exatamente como recebido |
| `valor_original_data_prescricao` | `TEXT` | `NULL` | data exatamente como recebida antes da conversão |
| `valor_original_motivo_nao_indicacao` | `TEXT` | `NULL` | texto de `Se não, descreva o motivo` |
| `valor_original_motivo_nao_inicio` | `TEXT` | `NULL` | motivo de não início exatamente como recebido, se houver fonte futura inequívoca |
| `valor_original_reacao_adversa` | `TEXT` | `NULL` | valor bruto que originou o indicador de reação |
| `observacoes` | `TEXT` | `NULL` | contexto adicional sem destino mais específico |
| `criado_em` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | criação no sistema |
| `atualizado_em` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | atualização controlada pelo escritor |

Todos os campos clínicos e seus valores originais são anuláveis. Os booleanos são
triestados. Não haverá `CHECK` condicional obrigando motivos, datas, duração ou
reações a acompanhar um determinado booleano: a origem pode ser incompleta ou
contraditória e precisa continuar auditável.

`duracao_cumprida_dias`, quando preenchida, terá `CHECK
(duracao_cumprida_dias > 0)`. Zero ou valor negativo não representa duração
cumprida; conteúdo que não possa ser convertido com segurança permanece no valor
original e na linha bruta. `ano_uso_aproximado` terá somente `CHECK
(ano_uso_aproximado > 0)`, impedindo zero e valores negativos sem inventar limite
superior, intervalo clínico, inferência de século ou conversão em data.

Os timestamps representam processamento no sistema, não fatos clínicos. A
primeira versão não exige trigger para `atualizado_em`; todo `UPDATE` deverá
atribuí-lo explicitamente.

## Indicação, início e motivos

`tem_indicacao` e `iniciado` são fatos independentes. Nenhum deles será derivado
do outro, da duração, da prescrição ou do tratamento pelo ambulatório.

O cabeçalho `Se não, descreva o motivo` responde a `Tem indicação de BZN?` e
alimenta somente `motivo_nao_indicacao` e
`valor_original_motivo_nao_indicacao`. Ele nunca será copiado para
`motivo_nao_inicio`.

O campo `motivo_nao_inicio` é necessário para manter os conceitos separados, mas
o layout confirmado não fornece uma origem inequívoca para preenchê-lo. No MVP da
planilha ele permanece `NULL`. Uma aplicação futura poderá preenchê-lo quando o
usuário registrar explicitamente que houve indicação e o tratamento não começou.

O manifesto deverá confirmar a conversão de `Uso do benzonidazol para tratamento
da DC?` para `iniciado`. Se os valores reais demonstrarem que o cabeçalho significa
uso histórico sem afirmar início, a linha deverá ficar pendente em vez de receber
interpretação automática.

## Duração, ano e prescrição

- `duracao_cumprida_dias` registra somente a duração efetivamente cumprida;
- `valor_original_duracao` é preservado mesmo quando a conversão for bem-sucedida;
- unidades e expressões aceitas para conversão pertencem ao manifesto/importador;
- `ano_uso_aproximado` não gera `data_inicio`, `data_fim` nem uma data no primeiro
  ou último dia do ano;
- `data_prescricao` não será tratada como data de indicação, início ou fim;
- valor vazio ou inválido não será substituído por zero, ano corrente ou data de
  processamento.

## Reações adversas repetíveis

Criar `reacao_adversa_benzonidazol`, permitindo várias ocorrências para o mesmo
tratamento.

| Campo | Tipo | Nulabilidade/default | Finalidade |
| --- | --- | --- | --- |
| `reacao_adversa_benzonidazol_id` | `BIGSERIAL` | `PRIMARY KEY` | identidade técnica da ocorrência |
| `tratamento_benzonidazol_id` | `BIGINT` | `NOT NULL` | tratamento de BZN relacionado |
| `descricao` | `TEXT` | `NULL` | descrição livre da reação |
| `gravidade` | `TEXT` | `NULL` | gravidade textual, sem classificação inferida |
| `data_reacao` | `DATE` | `NULL` | data da reação, somente quando informada |
| `consequencia` | `TEXT` | `NULL` | consequência textual da ocorrência |
| `valor_original_descricao` | `TEXT` | `NULL` | descrição exatamente como recebida |
| `valor_original_gravidade` | `TEXT` | `NULL` | gravidade exatamente como recebida |
| `valor_original_data_reacao` | `TEXT` | `NULL` | data exatamente como recebida antes da conversão |
| `valor_original_consequencia` | `TEXT` | `NULL` | consequência exatamente como recebida |
| `observacoes` | `TEXT` | `NULL` | contexto adicional da ocorrência |
| `criado_em` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | criação no sistema |
| `atualizado_em` | `TIMESTAMP` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | atualização controlada pelo escritor |

Não existe evidência de domínios institucionais para gravidade ou consequência.
Por isso, ambos serão `TEXT`, sem catálogo e sem `CHECK` enumerado. A definição de
escalas ou terminologias fica depois do MVP e exigirá decisão clínica própria.

`teve_reacao_adversa = FALSE` pode existir sem linhas de reação. `TRUE` também
pode existir sem detalhes quando a fonte só confirma a ocorrência. A presença de
uma reação detalhada não atualizará automaticamente o resumo, e combinações
contraditórias não serão bloqueadas por constraint; o importador deverá
encaminhá-las para revisão.

Não haverá `UNIQUE` por descrição, data ou tratamento: reações podem se repetir e
a fonte pode não fornecer data ou descrição suficiente para deduplicação segura.

## Chaves, FKs e deleção

Em `tratamento_benzonidazol`:

- PK `tratamento_benzonidazol_pkey` em
  `tratamento_benzonidazol_id`;
- FK `fk_tratamento_bzn_paciente`: `paciente_id` referencia
  `paciente(paciente_id)` com `ON DELETE CASCADE`;
- `uq_tratamento_bzn_paciente UNIQUE (paciente_id)`, garantindo no banco no
  máximo um tratamento BZN por paciente;
- FK composta `fk_tratamento_bzn_atendimento_paciente` em
  `(atendimento_id, paciente_id)`, referenciando
  `atendimento(atendimento_id, paciente_id)`, com
  `ON DELETE SET NULL (atendimento_id)`.

A chave referenciada `uq_atendimento_id_paciente` já existe no schema aplicado.
Não é necessário alterar nem preencher linhas antigas para reutilizá-la. A FK
composta garante que, quando informado, o atendimento pertence ao mesmo paciente;
ao excluir o atendimento, somente o vínculo opcional é removido. A exclusão do
paciente remove seu tratamento e, por encadeamento, suas reações.

Em `reacao_adversa_benzonidazol`:

- PK `reacao_adversa_benzonidazol_pkey` em
  `reacao_adversa_benzonidazol_id`;
- FK `fk_reacao_bzn_tratamento`: `tratamento_benzonidazol_id` referencia
  `tratamento_benzonidazol(tratamento_benzonidazol_id)` com
  `ON DELETE CASCADE`.

## Índices e constraints previstos

- o `UNIQUE (paciente_id)` já fornece índice para consultas do tratamento por
  paciente; não criar índice redundante nessa coluna;
- criar `idx_tratamento_bzn_atendimento_id` em `atendimento_id`, preferencialmente
  parcial com `WHERE atendimento_id IS NOT NULL`;
- criar `idx_reacao_bzn_tratamento_id` em
  `reacao_adversa_benzonidazol(tratamento_benzonidazol_id)`;
- não indexar booleanos, textos livres, datas ou valores originais sem evidência
  de consultas e volume;
- além das chaves, nulabilidade e checks técnicos de duração e ano, não criar
  constraints clínicas ou condicionais nesta fase.

## Importação e proveniência

`importacao_registro` será reutilizada sem alteração. Depois de criar, atualizar
ou associar os destinos, o importador registrará:

- `tabela_destino = 'tratamento_benzonidazol'` e o respectivo ID;
- `tabela_destino = 'reacao_adversa_benzonidazol'` e o respectivo ID, para cada
  reação detalhada criada;
- ação compatível com a operação efetiva permitida por
  `importacao_registro`.

Várias linhas de origem podem apontar para o mesmo tratamento consolidado. A nova
estrutura não terá FK direta para lote ou linha. Precedência, consolidação de
valores divergentes, idempotência, decisão entre criar/associar/atualizar e
deduplicação de reações são regras futuras do importador; a unicidade por paciente
não autoriza sobrescrever silenciosamente informação já consolidada.

## Convivência e transição

1. A migration cria apenas `tratamento_benzonidazol`,
   `reacao_adversa_benzonidazol`, suas constraints e índices.
2. `tratamento_chagas` permanece integralmente intacta, consultável e com a
   semântica legada por atendimento.
3. Não haverá backfill: nem mesmo paciente e medicamento serão inferidos a partir
   das linhas antigas.
4. Não haverá escrita dupla entre a tabela canônica e `tratamento_chagas`.
5. Novos fluxos do MVP gravarão BZN exclusivamente nas tabelas canônicas.
6. Consultas não devem unir, consolidar ou deduplicar silenciosamente registros
   antigos e novos.
7. Qualquer backfill auditado, visão unificada, bloqueio de novas escritas legadas
   ou remoção futura exigirá decisão humana e migration incremental próprias.

## Pendências classificadas

### Bloqueio da migration

Nenhum. A migration foi implementada e validada.

### Regras futuras do importador

- manifestar posições, aliases e ocorrências dos cabeçalhos de BZN;
- definir conversões aceitas para duração em dias, preservando o original;
- converter datas e ano sem completar partes ausentes;
- confirmar `Uso do benzonidazol para tratamento da DC?` como origem segura de
  `iniciado`; caso contrário, gerar pendência;
- manter `motivo_nao_inicio` nulo para `Se não, descreva o motivo`;
- reconciliar várias linhas do mesmo paciente sem sobrescrita silenciosa;
- tratar contradições entre indicação, início, duração, prescrição, realização
  pelo ambulatório e reação adversa;
- definir identidade de origem e deduplicação auditável das reações em
  reprocessamentos;
- registrar todos os destinos em `importacao_registro`.

### Itens adiáveis para depois do MVP

- domínio institucional de gravidade;
- domínio institucional de consequência;
- retornos de 30 dias e final do tratamento;
- adesão, suspensão, conclusão, dose e esquema terapêutico canônicos;
- visão ou API unificada entre estruturas canônica e legada;
- backfill auditado ou descontinuação de `tratamento_chagas`;
- triggers automáticas para `atualizado_em`.

## Cenários do futuro teste SQL

O teste deverá usar dados sintéticos, `BEGIN`, `ON_ERROR_STOP=1` e `ROLLBACK`, e
validar ao menos:

1. tratamento por paciente sem atendimento;
2. tratamento com atendimento do mesmo paciente;
3. rejeição de atendimento pertencente a outro paciente;
4. rejeição de segundo tratamento BZN para o mesmo paciente;
5. tratamentos independentes para pacientes diferentes;
6. aceitação de `TRUE`, `FALSE` e `NULL` nos quatro indicadores;
7. preservação separada de motivo de não indicação e motivo de não início;
8. aceitação de combinações incompletas ou contraditórias sem dedução automática;
9. duração positiva em dias e preservação do texto original;
10. rejeição de duração zero e negativa;
11. ano aproximado válido e preservação do valor original;
12. rejeição de ano zero ou negativo, sem limite superior clínico inventado;
13. data de prescrição independente de indicação, início e ano aproximado;
14. rejeição de `paciente_id` nulo e de FKs inexistentes;
15. `ON DELETE SET NULL` ao excluir o atendimento, preservando o tratamento;
16. `ON DELETE CASCADE` ao excluir o paciente, removendo tratamento e reações;
17. zero, uma e várias reações para o mesmo tratamento;
18. duas reações com mesma data ou descrição, comprovando ausência de unicidade
    clínica inventada;
19. reação com descrição, gravidade, data, consequência e respectivos valores
    originais;
20. reação parcial, com campos opcionais nulos;
21. gravidade e consequência livres, sem enumeração artificial;
22. exclusão do tratamento removendo suas reações por `CASCADE`;
23. coexistência com `tratamento_chagas` sem alteração, backfill ou conflito;
24. rastreabilidade sintética de tratamento e reações por
    `importacao_registro`, inclusive várias linhas apontando para o tratamento;
25. defaults não nulos dos timestamps e atualização explícita de
    `atualizado_em`;
26. existência das PKs, FKs, `UNIQUE`, `CHECK`s e índices no catálogo PostgreSQL;
27. ausência de dados sintéticos persistidos depois do `ROLLBACK`.

## Prontidão

A evolução está **implementada e validada** por migration incremental. Isso não
significa que a importação de dados reais esteja autorizada.
