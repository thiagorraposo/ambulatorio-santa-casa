# Especificação do Módulo de Avaliação Clínica, Eventos, Dispositivos e Óbito

Atualizado em: 2026-07-16

Status: especificação técnica concluída, com pendências antes da migration.

## Escopo e fronteiras

O módulo proposto cobre `dados_clinicos_atendimento`, `evento_clinico`, `dispositivo_implantado` e `obito`. Esta especificação não altera o schema e deve orientar uma futura migration incremental.

Fronteiras com o núcleo atual:

- `dados_clinicos_atendimento` armazena medidas e classificação funcional obtidas no atendimento; não substitui `atendimento`, `condicao_chagas` ou resultados de exames.
- `evento_clinico` armazena fatos clínicos longitudinais, inicialmente AVC e reação adversa sem vínculo terapêutico identificável; não substitui `complicacao_chagas`, `procedimento_clinico` nem `tratamento_chagas`.
- Reação adversa atribuída a tratamento de Chagas permanece em `tratamento_chagas.eventos_adversos` e `descricao_eventos_adversos`. O mesmo fato não deve ser duplicado em `evento_clinico`.
- `dispositivo_implantado` representa o estado consolidado de presença de marcapasso ou CDI; não é procedimento de implante e não substitui `procedimento_clinico`.
- `obito` representa o desfecho consolidado do paciente; não é acompanhamento, pendência ou observação de atendimento.

## Decisão sobre vínculo com atendimento

- `dados_clinicos_atendimento.atendimento_id` é obrigatório e único. Medidas representam uma avaliação produzida em um atendimento e o paciente é derivado por essa FK; não haverá `paciente_id` redundante.
- `evento_clinico`, `dispositivo_implantado` e `obito` terão vínculo apenas com `paciente`. AVC prévio, dispositivo já implantado e óbito podem ser informados retrospectivamente sem um atendimento correspondente ao fato.
- Não será incluído `atendimento_id` opcional nessas três tabelas na primeira versão. Isso evita criar uma FK de proveniência que possa apontar para atendimento de outro paciente e evita obrigar um atendimento artificial.
- A proveniência da importação deverá ser resolvida futuramente por `importacao_linha`, não por FK clínica ambígua.

Consequência: a primeira versão não registra em qual atendimento um fato histórico foi digitado. Se essa auditoria for necessária antes do módulo de importação, será preciso reavaliar a decisão.

## Unidades e formatos canônicos

As unidades abaixo são propostas para armazenamento normalizado. Não definem faixa clínica normal.

| Informação | Campo | Tipo | Unidade/formato canônico | Validação física proposta |
| --- | --- | --- | --- | --- |
| Altura | `altura_cm` | `NUMERIC(5,2)` | centímetros | valor maior que zero |
| Peso | `peso_kg` | `NUMERIC(6,2)` | quilogramas | valor maior que zero |
| Circunferência abdominal | `circunferencia_abdominal_cm` | `NUMERIC(5,2)` | centímetros | valor maior que zero |
| Frequência cardíaca | `frequencia_cardiaca_bpm` | `SMALLINT` | batimentos por minuto | valor maior que zero |
| Saturação | `saturacao_percentual` | `NUMERIC(5,2)` | percentual de 0 a 100 | entre 0 e 100 |
| Pressão sistólica | `pa_sistolica_mmhg` | `SMALLINT` | mmHg | valor maior que zero |
| Pressão diastólica | `pa_diastolica_mmhg` | `SMALLINT` | mmHg | valor maior que zero |
| NYHA | `nyha` | `VARCHAR(20)` | `i`, `ii`, `iii`, `iv`, `nao_informado` | lista fechada inicial |

Conversões de metros para centímetros, gramas para quilogramas, separador decimal e remoção de símbolos pertencem à importação. O valor da célula deve ser preservado em `valor_original_*` mesmo quando a conversão falhar.

Não foram propostas faixas fisiológicas mínimas/máximas para altura, peso, circunferência, frequência ou pressão, pois exigem validação clínica. Os `CHECK` acima impedem apenas valores incompatíveis com a unidade física.

## Tabela `dados_clinicos_atendimento`

### Finalidade e cardinalidade

Concentrar uma avaliação objetiva consolidada por atendimento.

- `atendimento` 1 : 0..1 `dados_clinicos_atendimento`.
- O paciente é obtido por `atendimento.paciente_id`.

### Campos

| Campo | Tipo PostgreSQL | Obrigatório | Regra |
| --- | --- | --- | --- |
| `dados_clinicos_atendimento_id` | `BIGSERIAL` | sim | PK |
| `atendimento_id` | `BIGINT` | sim | FK e `UNIQUE` |
| `altura_cm` | `NUMERIC(5,2)` | não | maior que zero |
| `peso_kg` | `NUMERIC(6,2)` | não | maior que zero |
| `circunferencia_abdominal_cm` | `NUMERIC(5,2)` | não | maior que zero |
| `frequencia_cardiaca_bpm` | `SMALLINT` | não | maior que zero |
| `saturacao_percentual` | `NUMERIC(5,2)` | não | entre 0 e 100 |
| `pa_sistolica_mmhg` | `SMALLINT` | não | maior que zero |
| `pa_diastolica_mmhg` | `SMALLINT` | não | maior que zero |
| `nyha` | `VARCHAR(20)` | não | domínio textual proposto |
| `valor_original_altura` | `TEXT` | não | célula original |
| `valor_original_peso` | `TEXT` | não | célula original |
| `valor_original_circunferencia_abdominal` | `TEXT` | não | célula original |
| `valor_original_frequencia_cardiaca` | `TEXT` | não | célula original |
| `valor_original_saturacao` | `TEXT` | não | célula original |
| `valor_original_pa_sistolica` | `TEXT` | não | célula original |
| `valor_original_pa_diastolica` | `TEXT` | não | célula original |
| `valor_original_nyha` | `TEXT` | não | célula original |
| `observacoes` | `TEXT` | não | informação complementar |
| `criado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |
| `atualizado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |

### Constraints, índices e deleção

- PK em `dados_clinicos_atendimento_id`.
- FK `atendimento_id` → `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- `UNIQUE(atendimento_id)`, que já fornece o índice de busca pelo atendimento.
- `CHECK` individual para cada valor físico conforme a tabela de unidades.
- `CHECK (nyha IS NULL OR nyha IN ('i', 'ii', 'iii', 'iv', 'nao_informado'))`.
- Não criar índice isolado adicional em `atendimento_id`, pois seria redundante com o `UNIQUE`.

Não se propõe `CHECK` relacionando pressão sistólica e diastólica; essa é uma regra clínica a validar, e valores originais inconsistentes devem poder ser auditados.

## Tabela `evento_clinico`

### Finalidade e cardinalidade

Registrar afirmações positivas, negativas ou desconhecidas sobre eventos longitudinais do paciente, inicialmente AVC e reação adversa não atribuída a tratamento específico.

- `paciente` 1 : N `evento_clinico`.
- Não há unicidade por paciente e tipo, pois podem existir eventos repetidos.

### Representação de AVC e reação adversa

- `teve AVC` gera registro `tipo_evento = 'avc'`; `ocorreu` recebe o booleano normalizado.
- `Ano do ultimo AVC` preenche `ano_evento`. Não se inventa mês ou dia; `data_evento` permanece nula.
- `teve reação adversa?` gera `tipo_evento = 'reacao_adversa'` somente quando não for possível atribuí-la ao tratamento de Chagas.
- Quando a reação for atribuída ao tratamento, usar exclusivamente `tratamento_chagas`.

### Campos

| Campo | Tipo PostgreSQL | Obrigatório | Regra |
| --- | --- | --- | --- |
| `evento_clinico_id` | `BIGSERIAL` | sim | PK |
| `paciente_id` | `BIGINT` | sim | FK |
| `tipo_evento` | `VARCHAR(60)` | sim | domínio textual |
| `ocorreu` | `BOOLEAN` | não | permite desconhecido |
| `data_evento` | `DATE` | não | data completa, se conhecida |
| `ano_evento` | `SMALLINT` | não | ano sem data artificial |
| `descricao` | `TEXT` | não | detalhe disponível |
| `valor_original_ocorrencia` | `TEXT` | não | célula de presença/ausência |
| `valor_original_data` | `TEXT` | não | ano ou data original |
| `valor_original_descricao` | `TEXT` | não | detalhe original |
| `observacoes` | `TEXT` | não | informação complementar |
| `criado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |
| `atualizado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |

### Constraints, índices e deleção

- PK em `evento_clinico_id`.
- FK `paciente_id` → `paciente(paciente_id)` com `ON DELETE CASCADE`, alinhada às extensões clínicas atuais do paciente.
- `CHECK (tipo_evento IN ('avc', 'reacao_adversa', 'outro', 'nao_informado'))`.
- `CHECK (ano_evento IS NULL OR ano_evento BETWEEN 1000 AND 9999)`, que valida somente o formato de quatro dígitos, não plausibilidade clínica.
- Não criar `UNIQUE` por paciente/tipo/ano: eventos diferentes podem compartilhar tipo e ano.
- Índices em `(paciente_id, tipo_evento)` e `data_evento`. Não criar índice isolado em `paciente_id`, pois o índice composto já atende buscas pelo paciente.

## Tabela `dispositivo_implantado`

### Finalidade e cardinalidade

Registrar o estado consolidado informado para cada tipo de dispositivo implantável do paciente.

- `paciente` 1 : N `dispositivo_implantado`.
- No escopo da planilha, no máximo uma linha por paciente e tipo.

### Representação de marcapasso e CDI

- `portador de marcapasso?` → `tipo_dispositivo = 'marcapasso'`.
- `portador de CDI?` → `tipo_dispositivo = 'cdi'`.
- `possui_dispositivo` recebe `TRUE`, `FALSE` ou `NULL` quando o valor for desconhecido; o valor bruto é preservado.
- A tabela não representa o procedimento de implante. Se o procedimento for conhecido, ele continua em `procedimento_clinico` sem duplicar o estado do dispositivo.

### Campos

| Campo | Tipo PostgreSQL | Obrigatório | Regra |
| --- | --- | --- | --- |
| `dispositivo_implantado_id` | `BIGSERIAL` | sim | PK |
| `paciente_id` | `BIGINT` | sim | FK |
| `tipo_dispositivo` | `VARCHAR(60)` | sim | domínio textual |
| `possui_dispositivo` | `BOOLEAN` | não | permite desconhecido |
| `data_implante` | `DATE` | não | somente se conhecida |
| `valor_original_tipo` | `TEXT` | não | cabeçalho/tipo original quando necessário |
| `valor_original_presenca` | `TEXT` | não | célula original |
| `valor_original_data` | `TEXT` | não | data original |
| `observacoes` | `TEXT` | não | informação complementar |
| `criado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |
| `atualizado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |

### Constraints, índices e deleção

- PK em `dispositivo_implantado_id`.
- FK `paciente_id` → `paciente(paciente_id)` com `ON DELETE CASCADE`.
- `UNIQUE(paciente_id, tipo_dispositivo)` para o estado consolidado da primeira versão.
- `CHECK (tipo_dispositivo IN ('marcapasso', 'cdi', 'outro', 'nao_informado'))`.
- Índice isolado em `paciente_id` é dispensável porque ele é a primeira coluna do `UNIQUE`.

Risco conhecido: o `UNIQUE` não modela troca de dispositivo ou múltiplos dispositivos do mesmo tipo. Se o escopo futuro exigir inventário/histórico individual, será necessário introduzir identificação e vigência ou substituir o estado consolidado por registros históricos.

## Tabela `obito`

### Finalidade e cardinalidade

Registrar o desfecho de óbito consolidado do paciente sem tratá-lo como observação de atendimento.

- `paciente` 1 : 0..1 `obito`.

### Representação

- `Óbito` → `houve_obito`, aceitando `TRUE`, `FALSE` ou `NULL` quando desconhecido.
- `Data do óbito` → `data_obito`, somente quando houver data válida.
- `causa do óbito` → `causa_obito`, sem codificação clínica nesta fase.
- Não será criado campo de relação causal com doença de Chagas sem fonte explícita.
- Não se exigirá data ou causa quando `houve_obito = TRUE`, pois a planilha pode estar incompleta; o valor bruto será preservado.

### Campos

| Campo | Tipo PostgreSQL | Obrigatório | Regra |
| --- | --- | --- | --- |
| `obito_id` | `BIGSERIAL` | sim | PK |
| `paciente_id` | `BIGINT` | sim | FK e `UNIQUE` |
| `houve_obito` | `BOOLEAN` | não | permite desconhecido |
| `data_obito` | `DATE` | não | data válida, se conhecida |
| `causa_obito` | `TEXT` | não | texto original/normalizado |
| `valor_original_obito` | `TEXT` | não | célula original |
| `valor_original_data` | `TEXT` | não | data original |
| `valor_original_causa` | `TEXT` | não | causa original |
| `observacoes` | `TEXT` | não | informação complementar |
| `criado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |
| `atualizado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |

### Constraints, índices e deleção

- PK em `obito_id`.
- FK `paciente_id` → `paciente(paciente_id)` com `ON DELETE CASCADE`.
- `UNIQUE(paciente_id)`, que já fornece o índice por paciente.
- Índice em `data_obito` para consultas temporais.
- Não criar `CHECK` causal ou de preenchimento obrigatório entre `houve_obito`, data e causa nesta fase.

## Ordem recomendada de criação futura

As quatro tabelas dependem apenas de estruturas já existentes e não dependem entre si. A ordem recomendada para a migration é:

1. `dados_clinicos_atendimento`;
2. `evento_clinico`;
3. `dispositivo_implantado`;
4. `obito`;
5. índices não criados implicitamente por PK/`UNIQUE`;
6. comentários e testes SQL sintéticos do módulo.

A ordem acompanha avaliação do atendimento, histórico clínico, estado de dispositivos e desfecho, facilitando revisão e testes.

## Pendências antes da migration

1. Confirmar se a planilha usa centímetros/quilogramas/mmHg/percentual ou se há valores em outras unidades.
2. Confirmar o domínio de NYHA e como tratar valores combinados ou textuais.
3. Confirmar se `Ano do ultimo AVC` sempre contém quatro dígitos e se pode existir sem `teve AVC = true`.
4. Confirmar se `teve reação adversa?` se refere ao benzonidazol/tratamento de Chagas ou a evento genérico.
5. Confirmar se valores `FALSE` de marcapasso/CDI e óbito devem gerar linhas estruturadas ou ficar apenas na camada bruta de importação.
6. Confirmar se o estado consolidado por tipo de dispositivo é suficiente ou se existe necessidade de histórico/troca.
7. Confirmar se a ausência de vínculo com atendimento é aceitável para auditoria antes de `importacao_linha`.
8. Definir política de atualização de `atualizado_em`, pois o núcleo ainda não possui trigger versionada.
9. Definir se `causa_obito` permanecerá texto livre ou terá codificação futura; nenhuma codificação foi presumida.

## Riscos de modelagem

- Valores normalizados incorretamente se as unidades reais não forem confirmadas.
- Perda da proveniência do atendimento de digitação para eventos, dispositivos e óbito até existir rastreabilidade de importação.
- Duplicidade de reação adversa se a regra de exclusividade com `tratamento_chagas` não for aplicada.
- `evento_clinico` mistura afirmação negativa/desconhecida com ocorrência histórica para preservar o formato da planilha; consultas devem considerar `ocorreu`.
- O estado consolidado de dispositivo não atende inventário ou histórico de substituições.
- `ON DELETE CASCADE` segue o padrão das extensões clínicas atuais, mas implica remoção dos fatos se o paciente for excluído após a remoção de dependências restritivas.

## Prontidão

O módulo **não está pronto para virar migration**. A estrutura relacional e os tipos estão definidos, mas as pendências 1 a 7 afetam transformação, cardinalidade ou semântica dos dados e precisam de validação humana antes de fixar constraints em SQL.
