# Especificação do Módulo de Notificação

Atualizado em: 2026-07-18

Status: pronta para orientar migration incremental; regras de importação permanecem pendentes.

## Objetivo e fontes

O módulo `notificacao` deve representar, sem perda do valor original, as entradas `Paciente notificado?`, `Número notificação` e `Caso não, justifique`.

Fontes usadas, em ordem de precedência:

1. `docs/evidencias/schema_atual_ambulatorio.sql`, como evidência do schema aplicado;
2. `docs/COBERTURA_COLUNAS_PLANILHA.md` e decisões arquiteturais atuais;
3. `planejamento/relação de cada tabela com cada coluna da planilha.md` e `planejamento/Dicionário de Dados Técnico.md`, como intenção de modelagem;
4. o escopo desta especificação, que confirma `Caso não, justifique` como informação a ser suportada pelo módulo.

Nenhuma regra de notificação sanitária, prazo, obrigatoriedade legal, formato oficial ou unicidade global do número foi inferida. Esses temas exigem fonte normativa ou requisito funcional próprio.

## Escopo e fronteiras

- `notificacao` representa o estado consolidado informado para o paciente.
- Não representa protocolo externo completo, histórico de transmissões, retificações, unidades notificadoras ou fluxo de vigilância.
- Não substitui `atendimento`, `pendencia_atendimento`, `acompanhamento_cuidado` nem a futura rastreabilidade por `importacao_linha`.
- A estrutura aceita informação positiva, negativa, desconhecida, incompleta ou contraditória, preservando os três valores originais.
- Não será criado catálogo de status ou tipo de notificação nesta fase, porque os três cabeçalhos não comprovam essas dimensões.

## Cardinalidade e vínculo

- `paciente` 1 : 0..1 `notificacao`.
- `notificacao.paciente_id` é obrigatório e único; a primeira versão mantém um estado consolidado por paciente.
- Não haverá `atendimento_id` na primeira versão. Os cabeçalhos não contêm data de notificação nem demonstram qual atendimento originou ou registrou a informação.
- Uma FK opcional para atendimento poderia produzir proveniência aparente e até associar a notificação a um atendimento sem relação comprovada com o fato.
- A origem da linha e o atendimento de digitação deverão ser rastreados futuramente por `importacao_linha`, sem misturar proveniência com vínculo clínico.

Se surgir evidência de múltiplas notificações por paciente, retificações ou histórico temporal, a cardinalidade deverá ser revista por nova decisão e migration incremental. Não se deve remover o `UNIQUE` apenas por hipótese.

## Representação das três entradas

- `Paciente notificado?` → `paciente_notificado`, após normalização para `TRUE`, `FALSE` ou `NULL`; o conteúdo bruto permanece em `valor_original_notificado`.
- `Número notificação` → `numero_notificacao`, como texto para preservar zeros à esquerda, pontuação e identificadores alfanuméricos; o conteúdo bruto permanece em `valor_original_numero`.
- `Caso não, justifique` → `justificativa_nao_notificacao`, sem vocabulário fechado; o conteúdo bruto permanece em `valor_original_justificativa`.
- Uma linha totalmente vazia nas três entradas não deve gerar registro durante a importação.

## Campos propostos

| Campo | Tipo PostgreSQL | Obrigatório | Regra |
| --- | --- | --- | --- |
| `notificacao_id` | `BIGSERIAL` | sim | PK |
| `paciente_id` | `BIGINT` | sim | FK e `UNIQUE` |
| `paciente_notificado` | `BOOLEAN` | não | permite desconhecido ou ambíguo |
| `numero_notificacao` | `VARCHAR(100)` | não | identificador textual sem formato fechado |
| `justificativa_nao_notificacao` | `TEXT` | não | justificativa livre, quando informada |
| `valor_original_notificado` | `TEXT` | não | valor bruto de `Paciente notificado?` |
| `valor_original_numero` | `TEXT` | não | valor bruto de `Número notificação` |
| `valor_original_justificativa` | `TEXT` | não | valor bruto de `Caso não, justifique` |
| `observacoes` | `TEXT` | não | complemento manual que não substitui os originais |
| `criado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |
| `atualizado_em` | `TIMESTAMP` | sim | `DEFAULT CURRENT_TIMESTAMP` |

Não se propõem `data_notificacao`, `tipo_notificacao`, `status`, `unidade_notificadora`, `protocolo_externo` ou `ativo`: nenhum desses campos é necessário para preservar os três cabeçalhos nem está comprovado no schema atual.

## Constraints, índices e deleção

- PK em `notificacao_id`.
- FK `paciente_id` → `paciente(paciente_id)` com `ON DELETE CASCADE`, alinhada às extensões clínicas consolidadas do paciente.
- `UNIQUE(paciente_id)` para garantir no máximo um estado consolidado por paciente; esse índice também atende buscas por paciente.
- Índice não único `idx_notificacao_numero_notificacao` em `numero_notificacao` para localização pelo identificador informado.
- Não criar índice isolado adicional em `paciente_id`, pois seria redundante com o `UNIQUE`.
- Não criar `UNIQUE(numero_notificacao)`: as fontes não comprovam unicidade global, formato, estabilidade ou ausência de duplicatas legadas.
- Não criar FK para `atendimento` nem regra de deleção relacionada a atendimento nesta versão.

## Validações condicionais

O dicionário planejado afirma apenas que número ou justificativa devem ser preenchidos “preferencialmente”. Isso não sustenta `NOT NULL` condicional nem `CHECK` de coerência no banco.

| Condição normalizada | Tratamento estrutural | Tratamento futuro na importação |
| --- | --- | --- |
| `paciente_notificado = TRUE` e número ausente | aceitar | registrar pendência de revisão; não fabricar número |
| `paciente_notificado = FALSE` e justificativa ausente | aceitar | registrar pendência de revisão; não fabricar justificativa |
| `paciente_notificado = TRUE` com justificativa preenchida | aceitar e preservar | sinalizar possível inconsistência sem descartar texto |
| `paciente_notificado = FALSE` com número preenchido | aceitar e preservar | sinalizar possível inconsistência sem apagar número |
| indicador `NULL` com número ou justificativa | aceitar e preservar | manter indicador desconhecido até normalização segura |
| três entradas vazias | estrutura permite | não criar linha durante a importação |

Consequentemente, a migration não deve conter `CHECK` relacionando `paciente_notificado`, `numero_notificacao` e `justificativa_nao_notificacao`. Também não deve converter texto vazio, valores ambíguos ou expressões locais sem regra de importação documentada.

## Estratégia de reversão futura

Uma futura migration deverá documentar, mas não executar automaticamente, a remoção em ordem segura:

1. remover o índice explícito de número, se necessário separadamente;
2. remover `ambulatorio.notificacao`.

Qualquer reversão será destrutiva para dados do módulo e exigirá autorização explícita. Nenhum `DROP` faz parte desta especificação.

## Validação esperada da futura migration

O teste SQL sintético do módulo deverá usar `BEGIN`, `ON_ERROR_STOP=1` e `ROLLBACK`, cobrindo:

- inserção dos cinco estados condicionais descritos acima;
- preenchimento dos defaults de timestamps;
- bloqueio de segundo registro para o mesmo paciente pelo `UNIQUE`;
- bloqueio de paciente inexistente pela FK;
- remoção em cascata ao excluir o paciente dentro da transação;
- aceitação de números repetidos entre pacientes diferentes;
- confirmação pós-`ROLLBACK` de ausência de dados sintéticos persistidos.

## Pendências resolvidas ou delimitadas

| Tema | Decisão ou delimitação | Bloqueia migration? |
| --- | --- | --- |
| Destino de `Caso não, justifique` | O módulo terá campo próprio e preservação do original. A posição canônica ainda precisa ser confirmada antes da importação. | Não. |
| Cardinalidade | Estado consolidado, no máximo um registro por paciente. Histórico exigirá evidência e evolução futura. | Não. |
| Vínculo com atendimento | Ausente na primeira versão; proveniência será responsabilidade de `importacao_linha`. | Não. |
| Número da notificação | `VARCHAR(100)`, sem parse numérico, formato fechado ou unicidade global. | Não. |
| Regras condicionais | Inconsistências são aceitas no banco e sinalizadas na futura importação. | Não. |
| Deleção | `ON DELETE CASCADE` a partir de paciente, seguindo fatos consolidados atuais. | Não. |
| Campos operacionais adicionais | Data, tipo, status, unidade e protocolo ficam fora do escopo por falta de evidência. | Não. |

## Pendências restantes para importação

1. Confirmar a lista canônica e a posição de `Caso não, justifique` no bloco de notificação.
2. Inventariar valores reais de `Paciente notificado?` e definir normalização para `TRUE`, `FALSE` e `NULL`.
3. Definir tratamento de espaços, células vazias e formatação do número sem remover zeros ou pontuação indevidamente.
4. Definir como registrar e revisar combinações condicionais incompletas ou contraditórias.
5. Implementar rastreabilidade por lote e linha antes de importar dados reais.

## Bloqueios da migration

Nenhum bloqueio estrutural permanece. As decisões necessárias para tabela, cardinalidade, vínculo, campos e constraints estão delimitadas com tipos permissivos e preservação dos originais.

## Prontidão

O módulo está **pronto para orientar uma migration incremental**, desde que a migration siga esta especificação, não acrescente regras sanitárias ou condicionais não comprovadas, inclua estratégia de reversão e venha acompanhada de teste SQL sintético transacional. Esta prontidão não autoriza aplicar a migration, alterar o schema ou importar dados reais.
