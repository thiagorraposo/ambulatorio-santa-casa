# Especificação do Módulo de Avaliação Clínica, Eventos, Dispositivos e Óbito

Atualizado em: 2026-07-16

Status: pronta para orientar migration incremental; regras de importação permanecem pendentes.

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

## Unidades e formatos de armazenamento

As unidades e tipos abaixo constam no dicionário técnico de planejamento e definem o formato de armazenamento normalizado. O projeto não contém evidência das unidades efetivamente presentes nas células da planilha.

| Informação | Campo | Tipo | Unidade/formato de destino | Validação na migration |
| --- | --- | --- | --- | --- |
| Altura | `altura_cm` | `NUMERIC(5,2)` | centímetros | sem `CHECK` de faixa |
| Peso | `peso_kg` | `NUMERIC(5,2)` | quilogramas | sem `CHECK` de faixa |
| Circunferência abdominal | `circunferencia_abdominal_cm` | `NUMERIC(5,2)` | centímetros | sem `CHECK` de faixa |
| Frequência cardíaca | `frequencia_cardiaca_bpm` | `INTEGER` | batimentos por minuto | sem `CHECK` de faixa |
| Saturação | `saturacao_percentual` | `NUMERIC(5,2)` | percentual | sem `CHECK` de faixa |
| Pressão sistólica | `pa_sistolica_mmhg` | `INTEGER` | mmHg | sem `CHECK` de faixa |
| Pressão diastólica | `pa_diastolica_mmhg` | `INTEGER` | mmHg | sem `CHECK` de faixa |
| NYHA | `nyha` | `VARCHAR(20)` | texto a normalizar futuramente | sem lista fechada |

Conversões de unidade, separador decimal e remoção de símbolos pertencem à futura importação. Até confirmar a origem, a rotina não poderá presumir metros, centímetros, gramas, quilogramas, fração ou percentual. O valor da célula deve ser preservado em `valor_original_*` mesmo quando a conversão não for executada ou falhar.

Não serão criados `CHECK`s de faixa nem domínio de NYHA nesta migration. As fontes locais não fornecem valores observados nem regra clínica validada; os tipos e a preservação do original são suficientes para criar a estrutura sem antecipar a importação.

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
| `altura_cm` | `NUMERIC(5,2)` | não | unidade de destino: cm |
| `peso_kg` | `NUMERIC(5,2)` | não | unidade de destino: kg |
| `circunferencia_abdominal_cm` | `NUMERIC(5,2)` | não | unidade de destino: cm |
| `frequencia_cardiaca_bpm` | `INTEGER` | não | unidade de destino: bpm |
| `saturacao_percentual` | `NUMERIC(5,2)` | não | unidade de destino: percentual |
| `pa_sistolica_mmhg` | `INTEGER` | não | unidade de destino: mmHg |
| `pa_diastolica_mmhg` | `INTEGER` | não | unidade de destino: mmHg |
| `nyha` | `VARCHAR(20)` | não | sem domínio fechado nesta fase |
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
- Nenhum `CHECK` de faixa física ou domínio clínico nesta fase.
- Não criar índice isolado adicional em `atendimento_id`, pois seria redundante com o `UNIQUE`.

Não se propõe `CHECK` relacionando pressão sistólica e diastólica. O dicionário não define essa regra, e valores não normalizados devem poder ser preservados para auditoria.

## Tabela `evento_clinico`

### Finalidade e cardinalidade

Registrar afirmações positivas, negativas ou desconhecidas sobre eventos longitudinais do paciente, inicialmente AVC e reação adversa não atribuída a tratamento específico.

- `paciente` 1 : N `evento_clinico`.
- Não há unicidade por paciente e tipo, pois podem existir eventos repetidos.

### Representação de AVC e reação adversa

- `teve AVC` gera registro `tipo_evento = 'avc'`; `ocorreu` recebe o booleano normalizado.
- `Ano do ultimo AVC` preenche `ano_evento`. Não existe `data_evento`, pois a fonte local prevê apenas o ano.
- O dicionário mapeia `teve reação adversa?` para `evento_clinico`, mas não informa se a pergunta se refere ao tratamento de Chagas. A tabela aceitará `tipo_evento = 'reacao_adversa'`, porém a transformação dessa coluna fica suspensa até decisão semântica.
- Se futuramente for comprovado vínculo com tratamento, usar exclusivamente `tratamento_chagas` e não criar evento duplicado.

### Campos

| Campo | Tipo PostgreSQL | Obrigatório | Regra |
| --- | --- | --- | --- |
| `evento_clinico_id` | `BIGSERIAL` | sim | PK |
| `paciente_id` | `BIGINT` | sim | FK |
| `tipo_evento` | `VARCHAR(100)` | sim | valor padronizado pela origem futura |
| `ocorreu` | `BOOLEAN` | não | permite desconhecido |
| `ano_evento` | `INTEGER` | não | ano sem data artificial |
| `descricao` | `TEXT` | não | detalhe disponível |
| `valor_original_ocorrencia` | `TEXT` | não | célula de presença/ausência |
| `valor_original_data` | `TEXT` | não | ano original |
| `valor_original_descricao` | `TEXT` | não | detalhe original |
| `observacoes` | `TEXT` | não | informação complementar |
| `criado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |
| `atualizado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |

### Constraints, índices e deleção

- PK em `evento_clinico_id`.
- FK `paciente_id` → `paciente(paciente_id)` com `ON DELETE CASCADE`, alinhada às extensões clínicas atuais do paciente.
- Nenhum `CHECK` de tipo ou formato do ano nesta fase; o dicionário prevê `VARCHAR(100)` e `INTEGER`, mas não fornece domínios validados.
- Não criar `UNIQUE` por paciente/tipo/ano: eventos diferentes podem compartilhar tipo e ano.
- Índice em `(paciente_id, tipo_evento)`. Não criar índice isolado em `paciente_id`, pois o índice composto já atende buscas pelo paciente.

## Tabela `dispositivo_implantado`

### Finalidade e cardinalidade

Registrar o estado consolidado informado para cada tipo de dispositivo implantável do paciente.

- `paciente` 1 : N `dispositivo_implantado`.
- No escopo da planilha, no máximo uma linha por paciente e tipo.

### Representação de marcapasso e CDI

- `portador de marcapasso?` → `tipo_dispositivo = 'marcapasso'`.
- `portador de CDI?` → `tipo_dispositivo = 'cdi'`.
- Para célula não vazia, `possui_dispositivo` recebe `TRUE`, `FALSE` ou `NULL` quando o valor for ambíguo; o valor bruto é preservado. Célula vazia não gera linha.
- A tabela não representa o procedimento de implante. Se o procedimento for conhecido, ele continua em `procedimento_clinico` sem duplicar o estado do dispositivo.

### Campos

| Campo | Tipo PostgreSQL | Obrigatório | Regra |
| --- | --- | --- | --- |
| `dispositivo_implantado_id` | `BIGSERIAL` | sim | PK |
| `paciente_id` | `BIGINT` | sim | FK |
| `tipo_dispositivo` | `VARCHAR(100)` | sim | `marcapasso` ou `cdi` conforme a coluna de origem |
| `possui_dispositivo` | `BOOLEAN` | não | permite desconhecido |
| `valor_original_tipo` | `TEXT` | não | cabeçalho/tipo original quando necessário |
| `valor_original_presenca` | `TEXT` | não | célula original |
| `observacoes` | `TEXT` | não | informação complementar |
| `criado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |
| `atualizado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |

### Constraints, índices e deleção

- PK em `dispositivo_implantado_id`.
- FK `paciente_id` → `paciente(paciente_id)` com `ON DELETE CASCADE`.
- `UNIQUE(paciente_id, tipo_dispositivo)` para o estado consolidado da primeira versão.
- Nenhum `CHECK` de tipo além do `NOT NULL`; os dois valores conhecidos serão definidos pela transformação futura, sem fechar o domínio físico prematuramente.
- Índice isolado em `paciente_id` é dispensável porque ele é a primeira coluna do `UNIQUE`.

Risco conhecido: o `UNIQUE` não modela troca de dispositivo ou múltiplos dispositivos do mesmo tipo. Se o escopo futuro exigir inventário/histórico individual, será necessário introduzir identificação e vigência ou substituir o estado consolidado por registros históricos.

## Tabela `obito`

### Finalidade e cardinalidade

Registrar o desfecho de óbito consolidado do paciente sem tratá-lo como observação de atendimento.

- `paciente` 1 : 0..1 `obito`.

### Representação

- Para célula `Óbito` não vazia, criar a linha e preencher `houve_obito` com `TRUE`, `FALSE` ou `NULL` quando o valor for ambíguo; célula vazia, sem data e sem causa não gera linha.
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

## Pendências resolvidas ou delimitadas

| Tema | Decisão ou delimitação baseada nas fontes locais | Bloqueia migration? |
| --- | --- | --- |
| Unidades de origem | Destinos seguem nomes/tipos do dicionário (`cm`, `kg`, `bpm`, percentual e `mmHg`), mas nenhuma conversão será definida até conhecer a unidade da célula. Originais permanecem em `TEXT`. | Não; bloqueia transformação automática. |
| NYHA | Manter `VARCHAR(20)` e `valor_original_nyha`, sem `CHECK` ou normalização nesta fase. | Não; bloqueia padronização na importação. |
| Ano do AVC | Manter `INTEGER`, sem fabricar data e sem `CHECK` de quatro dígitos. | Não; formato será validado na importação. |
| Reação adversa | A estrutura aceita evento genérico, mas essa coluna não será importada até esclarecer vínculo com tratamento. | Não; bloqueia somente o mapeamento da coluna. |
| Respostas falsas/ambíguas | A regra R001 sustenta `TRUE`, `FALSE` ou `NULL` com original preservado. Célula não vazia gera linha; célula totalmente vazia não gera. | Não. |
| Histórico de dispositivos | O dicionário contém apenas presença por tipo, sem identificador ou troca. A primeira versão é estado consolidado com `UNIQUE(paciente_id, tipo_dispositivo)`; histórico fica fora do escopo. | Não. |
| Vínculo com atendimento | ADR-009 já decidiu vínculo apenas com paciente para eventos, dispositivos e óbito; proveniência aguarda `importacao_linha`. | Não. |
| `atualizado_em` | Repetir o padrão físico atual: `NOT NULL DEFAULT CURRENT_TIMESTAMP`, sem trigger. Atualizações futuras devem preencher o campo explicitamente. | Não. |
| Causa de óbito | O dicionário define `TEXT` e não fornece codificação. Permanecerá texto livre com original preservado. | Não. |

## Pendências restantes para importação

1. Confirmar unidades e formatos efetivos das células de medidas.
2. Definir valores padronizados de NYHA.
3. Definir validação do ano do AVC e tratamento de inconsistência entre ano e ocorrência.
4. Esclarecer se `teve reação adversa?` pertence ao tratamento de Chagas ou ao histórico clínico genérico.
5. Definir a rastreabilidade por `importacao_linha` antes da importação completa.

## Riscos de modelagem

- Valores normalizados incorretamente se uma futura importação presumir unidades sem confirmação.
- Perda da proveniência do atendimento de digitação para eventos, dispositivos e óbito até existir rastreabilidade de importação.
- Duplicidade de reação adversa se a regra de exclusividade com `tratamento_chagas` não for aplicada.
- `evento_clinico` mistura afirmação negativa/desconhecida com ocorrência histórica para preservar o formato da planilha; consultas devem considerar `ocorreu`.
- O estado consolidado de dispositivo não atende inventário ou histórico de substituições.
- `ON DELETE CASCADE` segue o padrão das extensões clínicas atuais, mas implica remoção dos fatos se o paciente for excluído após a remoção de dependências restritivas.

## Prontidão

O módulo **está pronto para virar migration incremental**, desde que a migration siga exatamente a estrutura permissiva desta especificação, não inclua `CHECK`s clínicos/domínios não comprovados e venha acompanhada de teste SQL sintético e estratégia de reversão.

As pendências restantes impedem a rotina de importação automática dessas colunas, mas não impedem criar tabelas nullable com preservação de valores originais. A migration não autoriza importar dados reais nem inferir unidades ou semântica clínica.
