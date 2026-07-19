# Cobertura das Colunas da Planilha pelo Núcleo Físico

Atualizado em: 2026-07-19

## Objetivo e fontes

Este documento reconcilia as 140 entradas únicas de `planejamento/tabelas dicionário de dados/03_coluna_planilha_destino.csv` com o schema físico aplicado de 33 tabelas.

Ordem de precedência usada:

1. `docs/evidencias/schema_atual_ambulatorio.sql`, como evidência do schema aplicado;
2. migrations `sql/00` a `sql/12`, para confirmar a origem versionada da estrutura;
3. documentos atuais em `docs/`;
4. DER, dicionário técnico, relação coluna-tabela e seis CSVs em `planejamento/`, como intenção de modelagem sujeita a reconciliação.

Nenhum dado real foi lido. A análise considera nomes, tipos, constraints e semântica documentada.

## Critérios de classificação

- **Coberta diretamente:** existe campo físico semanticamente equivalente e o valor pode ser copiado sem decomposição ou lookup clínico.
- **Coberta com transformação:** o núcleo representa toda a informação, mas exige conversão de tipo, normalização, lookup ou transformação de coluna em linha.
- **Parcialmente coberta:** parte da semântica cabe no núcleo, mas falta campo, relacionamento ou precisão para preservar a informação integralmente.
- **Não coberta:** não existe destino físico semanticamente adequado.
- **Dúvida pendente:** a origem ou a regra de destino é ambígua e a classificação definitiva depende do layout ou de decisão humana.

## Resultado quantitativo

| Classificação | Quantidade | Percentual sobre 140 |
| --- | ---: | ---: |
| Coberta diretamente | 6 | 4,29% |
| Coberta com transformação | 109 | 77,86% |
| Parcialmente coberta | 12 | 8,57% |
| Não coberta | 1 | 0,71% |
| Dúvida pendente | 12 | 8,57% |
| Total | 140 | 100,00% |

Cobertura plena atual: **115 de 140 entradas (82,14%)**. Incluindo cobertura parcial: **127 de 140 (90,71%)**.

Há uma ressalva no denominador: `Controle da importação como processo.` e `Todas as colunas originais da planilha em formato bruto para auditoria.` são descrições técnicas, não cabeçalhos clínicos demonstrados. Sem elas, o catálogo possui 138 possíveis colunas de origem; elas permanecem classificadas como dúvida até confirmação da lista canônica.

## Reavaliação das 25 entradas fora da cobertura plena

A aplicação do módulo de importação e proveniência promove `Responsavel pela digitacao` para cobertura plena, preservada como texto legado em `importacao_linha`. As demais 25 entradas mantêm suas classificações.

| Grupo | Entradas | Conclusão no schema atual | Evolução indicada |
| --- | ---: | --- | --- |
| Identidade e importação | 1 coberta com transformação e 2 duvidosas | `Responsavel pela digitacao` possui destino em `importacao_linha.responsavel_digitacao_original`. As duas descrições técnicas não são cabeçalhos comprovados. | Estrutura aplicada; manifesto físico e importador permanecem pendentes. |
| Tratamento de Chagas | 5 parciais e 1 não coberta | Datas, status, motivo e eventos adversos existentes ajudam, mas não preservam duração original, ano isolado, data de prescrição, execução pelo ambulatório nem a semântica exata do motivo. | Extensão incremental de `tratamento_chagas`, após confirmar cabeçalhos e granularidade. |
| Encaminhamento e continuidade | 3 parciais | A existência de `encaminhamento` não prova que o paciente trouxe documento; projeto e contrarreferência não têm vínculo ou indicador inequívoco. | Extensão de fluxo assistencial, sem criar tabelas paralelas redundantes. |
| Observação e pendência | 1 parcial | `atendimento.observacoes` e `pendencia_atendimento` armazenam conteúdo, mas não há regra segura para dividir a célula. | Resolver na importação; nova coluna/tabela apenas se a origem comprovar múltiplos elementos tipados. |
| Demografia, diagnóstico e família | 3 parciais | Idade calculada não preserva o original; data de autorrelato não é resultado laboratorial; histórico familiar não representa exame realizado. | Extensões clínicas pequenas depois da proveniência e da confirmação semântica. |
| Notificação | 1 duvidosa | `notificacao` possui destino para justificativa, mas falta confirmar que o cabeçalho pertence ao bloco. | Resolver por posição da coluna durante o desenho da importação; não requer nova tabela. |
| Exames com cabeçalhos repetidos | 9 duvidosas | O modelo genérico representa exames trazidos e solicitados; o nome isolado não identifica o bloco de origem. | Preservar aba, posição e cabeçalho original em `importacao_linha`; não expandir o módulo de exames por essa dúvida. |

Nos cinco itens de tratamento considerados parciais estão `teve reação adversa?`, `tratamento pelo ambulatorio?`, `Em qual ano tomou a medicação (Benzonidazol)?`, `Prescrição do BZN (data)` e `Se não, descreva o motivo`. `Por quanto tempo foi usado?` permanece não coberta. `teve reação adversa?` continua suspensa até se confirmar se pertence ao tratamento ou a evento clínico genérico.

## Classificação de cada coluna

### Coberta diretamente (6)

- `ID` → `paciente.codigo_planilha`.
- `Nome` → `paciente.nome`.
- `Endereço` → `paciente_endereco.endereco`.
- `Cidade` → `paciente_endereco.cidade`.
- `Telefone de Contato` → `paciente_contato.telefone`.
- `Localização do prontuário` → `atendimento.localizacao_prontuario`.

### Coberta com transformação (109)

Conversões simples e padronizações:

- `Data de Nascimento`, `Sexo`, `Raça`, `Pertence a comunidade Quilombola ou indígena`, `Qual? Indígena ou quilombola?`, `Origem da aba: portador ou não portador de DC` e `Data do atendimento`.
- `Origem encaminhamento`, `Diagnóstico da DC por sorologia`, `Resultado final da sorologia`, `Ou solicitado sorologia`, `Se sim, data solicitada`, `Forma da DC` e `Classificacao da cardiopatia chagasica`.

Transformação de colunas em registros estruturados:

- `Complicações relacionadas a DC`, `Complicações cardiacas relacioadas a DC`, `Complicações do trato digestivo relacioadas a DC` e `Outras complicações relacionadas a DC, qual?` → uma ou mais linhas em `complicacao_chagas`.
- `Comorbidades não relacionadas a DC?`, `Doenças do sistema cardiovascular`, `Hipertensão arterial`, `Doenças do sistema imunológico`, `Doenças do sistema nervoso`, `Doenças psicológicas`, `Doenças do sistema respiratório`, `Doenças do sistema digestório`, `Doenças do sistema endócrino`, `Doenças do sistema tegumentar`, `Diabetes`, `Doença renal` e `Outras doenças` → catálogo `comorbidade` e vínculo `paciente_comorbidade`.
- `Valor da glicemia`, `Valor de colesterol HDL`, `Valor de colesterol LDL`, `Triglicerideos`, `Data do Exame Colesterol`, `Glicemia`, `Colesterol HDL`, `Colesterol LDL` e `Triglicerídeos` → `tipo_exame_complementar`, `atendimento_exame_complementar` e `exame_complementar_resultado`.
- `Resultado ecg`, `Data do ecg`, `ECG solicitado`, `FEVE%`, `Paciente trouxe outros exames complementares?`, `Solicitado exames complementares?` e `ECG` → módulo físico genérico de exames complementares e resultados.
- `Caso seja sorologia: Metodo 1`, `Data da Sorologia 01`, `Caso seja sorologia: Metodo 2`, `Data sorologia 2`, `Caso seja sorologia: Metodo 3` e `Data sorologia 3` → até três linhas em `sorologia_chagas`.

Projetos e estudos:

- `SaMi-Trop AIM3`, `SaMi-Trop 1.1`, `Parachute`, `BenBrasil`, `Ambulatório unicamente`, `Ambulatório anexo ao projeto`, `EPOCA`, `Santa Casa DICA`, `Santa Casa RENOMICA`, `Santa Casa ARCHIMEDES`, `Santa Casa CHARM`, `LXE Novartis` e `Benbrasil`.
- `SaMi-Trop AIM3 PENDÊNCIA`, `Parachute falha`, `BenBrasil FALHA`, `Falha EPOCA`, `EPOCA FALHA` e `LXE Novartis falha`.

Os projetos são normalizados em `projeto_estudo` e `atendimento_projeto_estudo`; as duas colunas de contexto ambulatorial também possuem campos próprios em `atendimento`.

Medicamentos e acompanhamento:

- `Anti- hipertensivo`, `Diuréticos`, `Anti-coagulantes`, `Anti-arritmicos`, `Anti- depressivos`, `IECA/BRA`, `INRA`, `Alfa/Betabloqueador`, `Vasodilatador`, `Hipoglicemiante`, `Estatinas`, `Bloqueador de cálcio` e `Outros medicamentos` → `medicamento.classe_medicamento` e `atendimento_medicamento`.
- `Uso do benzonidazol para tratamento da DC?` e `Tem indicação de BZN?` → `medicamento` e `tratamento_chagas`.
- `Retorno 30 dias de tratamento`, `Retorno final de tratamento`, `Retorno anual realizado` e `Desfecho do retorno` → linhas tipadas em `acompanhamento_cuidado`.

Avaliação clínica e fatos longitudinais:

- `Altura`, `Peso`, `Circunferencia Abdominal`, `Frequencia cardiaca`, `Saturacao`, `PA sistolica`, `PA diastolica` e `NYHA` → campos normalizados e respectivos valores originais em `dados_clinicos_atendimento`.
- `teve AVC` e `Ano do ultimo AVC` → linha de `evento_clinico` com tipo `avc`, ocorrência e ano informados.
- `portador de marcapasso?` e `portador de CDI?` → linhas de `dispositivo_implantado`, uma por tipo de dispositivo.
- `Óbito`, `Data do óbito` e `causa do óbito` → registro consolidado em `obito`.
- `Paciente notificado?` e `Número notificação` → estado consolidado em `notificacao`, com valores originais preservados.

Importação e proveniência:

- `Responsavel pela digitacao` → `importacao_linha.responsavel_digitacao_original`, como texto legado sem equivalência com usuário autenticado.

### Parcialmente coberta (12)

| Coluna | Cobertura atual | Lacuna |
| --- | --- | --- |
| `Idade` | Pode ser calculada por `paciente.data_nascimento` | Não preserva a idade originalmente importada para auditoria. |
| `Pendencias/Observação` | `atendimento.observacoes` e `pendencia_atendimento` | Falta regra para separar texto livre de pendência estruturada. |
| `Trouxe encaminhamento` | `encaminhamento.valor_original_encaminhamento` e existência do registro | Falta booleano estruturado equivalente. |
| `Autorelato diagnóstico de Chagas do participante (data)` | `diagnostico_chagas.data_resultado_final` ou observações | Data de autorrelato não é semanticamente igual à data do resultado; falta campo próprio. |
| `Familiares diretos (mãe, pai, irmãos) realizaram o exame de Chagas?` | `historico_familiar_chagas` | `possui_historico_familiar` não expressa especificamente realização de exame por familiar. |
| `teve reação adversa?` | Eventos adversos existem em `tratamento_chagas`; `evento_clinico` não deve duplicá-los conforme ADR-009 | Falta confirmar se o cabeçalho se refere ao tratamento de Chagas ou a evento adverso genérico. |
| `tratamento pelo ambulatorio?` | Contexto pode ser inferido de atendimento/tratamento | Falta campo explícito no tratamento. |
| `Em qual ano tomou a medicação (Benzonidazol)?` | `tratamento_chagas.data_inicio` | Uma informação apenas anual não possui regra segura de conversão para data completa. |
| `Prescrição do BZN (data)` | `tratamento_chagas.data_indicacao` | Indicação e prescrição são eventos distintos. |
| `Se não, descreva o motivo` | `tratamento_chagas.motivo_nao_tratamento` | O cabeçalho não define se o motivo é de não uso ou de não indicação. |
| `Encaminhado a qual projeto?` | `encaminhamento` e `atendimento_projeto_estudo` | Falta relação explícita entre o encaminhamento e o projeto. |
| `Paciente com contrarreferencia realizada?` | Pode ser descrita em `acompanhamento_cuidado` | Falta tipo/booleano inequívoco de contrarreferência. |

### Não coberta (1)

| Grupo | Colunas | Expansão necessária |
| --- | --- | --- |
| Tratamento | `Por quanto tempo foi usado?` | Duração original ou regra derivada no tratamento. |

### Dúvida pendente (12)

| Coluna | Dúvida |
| --- | --- |
| `Caso não, justifique` | O layout precisa confirmar se pertence exclusivamente a `Paciente notificado?`. |
| `Controle da importação como processo.` | É descrição técnica de `importacao_planilha`, não cabeçalho comprovado da planilha. |
| `Todas as colunas originais da planilha em formato bruto para auditoria.` | É descrição técnica de JSONB, não cabeçalho comprovado da planilha. |
| `ECO` | O mapeamento atribui três destinos e não identifica inequivocamente o bloco de origem. |
| `Laboratoriais` | Cabeçalho repetido; é necessário identificar bloco trazido/solicitado pela posição original. |
| `De imagem` | Cabeçalho repetido; é necessário identificar bloco trazido/solicitado pela posição original. |
| `Holter` | Cabeçalho repetido; é necessário identificar bloco trazido/solicitado pela posição original. |
| `Endoscopia` | Cabeçalho repetido; é necessário identificar bloco trazido/solicitado pela posição original. |
| `Colonoscopia` | Cabeçalho repetido; é necessário identificar bloco trazido/solicitado pela posição original. |
| `Teste Ergometrico` | Cabeçalho repetido; é necessário identificar bloco trazido/solicitado pela posição original. |
| `Mapa` | Cabeçalho repetido; é necessário identificar bloco trazido/solicitado pela posição original. |
| `Outros` | Cabeçalho repetido e semanticamente aberto; exige posição e regra para preservar o texto associado. |

O schema físico já consegue representar exames trazidos e solicitados. A dúvida desses nove cabeçalhos é de identificação da origem, não necessariamente de expansão física.

## Reconciliação das 38 tabelas planejadas

### Absorvidas pelo schema atual

- Correspondência direta ou renomeada: `paciente`, `paciente_endereco`, `paciente_contato`, `atendimento`, `encaminhamento`, `diagnostico_chagas`, `sorologia_chagas`, `sorologia_solicitacao`, `historico_familiar_chagas`, `condicao_chagas`, `complicacao_chagas`, `comorbidade`, `paciente_comorbidade` e `tipo_exame_complementar`.
- `programa` e `paciente_programa` foram absorvidas por `projeto_estudo` e `atendimento_projeto_estudo`; o vínculo atual é temporal por atendimento, do qual se deriva o paciente.
- `tipo_exame_laboratorial`, `resultado_laboratorial`, `tipo_exame`, `exame`, `ecocardiograma` e `exame_complementar` foram absorvidas pelo trio genérico `tipo_exame_complementar`, `atendimento_exame_complementar` e `exame_complementar_resultado`.
- `tratamento_benzonidazol` foi absorvida por `tratamento_chagas` mais o catálogo `medicamento`.
- `retorno_tratamento` e `retorno_anual` foram absorvidas por registros tipados em `acompanhamento_cuidado`.
- `dados_clinicos_atendimento`, `evento_clinico`, `dispositivo_implantado` e `obito` foram implementadas por `sql/10_modulo_avaliacao_clinica.sql`.
- `notificacao` foi implementada por `sql/11_modulo_notificacao.sql`.
- `importacao_planilha` e `importacao_linha` foram implementadas como `importacao_lote`, `importacao_linha` e `importacao_registro` por `sql/12_modulo_importacao_proveniencia.sql`.

### Ainda precisam ser criadas

- `usuario` ou, antes de autenticação, uma entidade mínima de responsável/importador.

### Redundantes ou a reformular

- `classe_medicamento` e `paciente_medicamento`: o núcleo usa `medicamento.classe_medicamento` e `atendimento_medicamento`; decidir se a classe textual basta ou se merece catálogo próprio, sem criar uma segunda associação concorrente.
- `encaminhamento_projeto`: reformular como relação explícita entre `encaminhamento` e `projeto_estudo`, caso a rastreabilidade do encaminhamento seja necessária.
- `contrarreferencia`: avaliar como especialização/etapa de `acompanhamento_cuidado`, evitando fluxo paralelo sem necessidade.
- `atendimento_observacao`: dividir a semântica entre `atendimento.observacoes` e `pendencia_atendimento`; criar tabela própria somente se houver múltiplas observações tipadas por atendimento.
- `tratamento_benzonidazol`, `retorno_tratamento`, `retorno_anual`, `tipo_exame_laboratorial`, `resultado_laboratorial`, `tipo_exame`, `exame` e `ecocardiograma`: não devem ser recriadas com esses nomes sem demonstrar informação que o modelo genérico atual não preserve.

## Divergências encontradas

- O dicionário planeja 38 tabelas e 364 campos; o schema aplicado possui 33 tabelas com nomes, chaves `BIGINT` e estruturas diferentes. O dicionário não é retrato do banco atual.
- O relatório automático afirma 140 colunas originais, mas sua fonte canônica esperada não existe; o fallback contém duas descrições técnicas tratadas como se fossem colunas.
- O CSV possui 192 linhas de destino para 140 nomes únicos. Parte é decomposição legítima, mas nomes repetidos perderam posição/aba e não distinguem os blocos trazido e solicitado.
- Campos planejados como `paciente.nome_completo`, `paciente.origem_aba` e `paciente_contato.valor_contato` existem fisicamente como `nome`, `grupo_origem_planilha` e `telefone`.
- `programa/paciente_programa` foi modelado fisicamente como projeto por atendimento, não como vínculo direto permanente do paciente.
- Exames laboratoriais, ECG, ECO e FEVE foram generalizados no módulo físico de exames complementares; recriar tabelas planejadas produziria sobreposição.
- Medicamentos foram generalizados por atendimento; o catálogo separado de classes planejado não existe.
- `Ambulatório unicamente` e `Ambulatório anexo ao projeto` foram mapeados como programas no documento antigo, mas são campos físicos de contexto em `atendimento`.
- A pergunta sobre exame realizado por familiares não equivale ao campo físico de histórico familiar.
- O DER e o dicionário planejado incluem estruturas ainda não aplicadas; ambos são fontes de intenção e não evidência do estado físico.

## Comparação que fundamentou a priorização

| Candidato | Ganho imediato de cobertura | Dependências | Valor funcional | Risco de retrabalho |
| --- | --- | --- | --- | --- |
| Importação e proveniência | 1 entrada clínica não coberta; dá suporte às 2 descrições técnicas e à resolução de 10 dúvidas de origem | Definir identidade legada, lote, linha bruta e vínculo com registros gerados | Alto: torna futura importação auditável e beneficia todos os módulos | Menor se vier antes da importação; cresce muito se for retroajustado depois |
| Extensão de tratamento de Chagas | Até 6 entradas hoje parciais/não cobertas | Confirmar semântica, unidade da duração e diferença entre indicação, prescrição e início | Alto no cuidado com benzonidazol | Alto enquanto os cabeçalhos e valores reais não forem inventariados |
| Fluxo de encaminhamento e contrarreferência | Até 3 entradas parciais | Confirmar documento trazido, vínculo com projeto e conceito de contrarreferência | Médio/alto para continuidade do cuidado | Médio, com risco de duplicar `encaminhamento` e `acompanhamento_cuidado` |
| Ajustes isolados de observação, idade, autorrelato e família | Até 4 entradas parciais | Regras específicas e confirmação semântica independentes | Localizado | Alto se implementados como campos soltos antes da importação |

## Módulo de importação e proveniência implementado

O módulo de **importação e proveniência** foi implementado antes das extensões clínicas. Ele preserva a origem necessária para interpretar cabeçalhos repetidos, separa o responsável legado do futuro usuário autenticado e fornece rastreabilidade estrutural sem implementar importador.

Estrutura definida:

- `importacao_lote`: uma execução identificada por código opaco, SHA-256 e versão de layout, com cadeia explícita de reprocessamento;
- `importacao_linha`: FK para o lote, aba e posição, array `JSONB` ordenado, responsável pela digitação em texto original e status;
- `importacao_registro`: associação genérica N:N entre linha e registros gerados, com alvo identificado por schema, tabela e ID;
- `ON DELETE RESTRICT` para preservar proveniência e índices somente para identidade, processamento e rastreio inverso;
- nenhuma entidade `usuario` nesta fase: o texto legado não comprova identidade única e não deve ser confundido com autenticação futura.

A estrutura está aplicada e validada. Manifesto físico seguro, permissões operacionais, política de retenção, auditoria e regras do importador continuam pendentes. As fontes canônicas e limitações do layout estão em `docs/METADADOS_SEGUROS_LAYOUT_PLANILHA.md`.

## Módulo de notificação implementado

O módulo **notificação da doença de Chagas** foi implementado. Ele cobre `Paciente notificado?`, `Número notificação` e dispõe de campo próprio para `Caso não, justifique`; a posição canônica desse último cabeçalho ainda deve ser confirmada antes da importação.

Importação/proveniência continua pendente e exige decidir identidade do responsável, fronteira com autenticação, lote, linha bruta e vínculos com vários registros.

O desenho detalhado e suas justificativas estão em `docs/ESPECIFICACAO_MODULO_NOTIFICACAO.md`.

Estrutura física aplicada:

### `notificacao`

- `notificacao_id`, PK;
- `paciente_id`, FK obrigatória para `paciente`;
- `paciente_notificado`, booleano opcional;
- `numero_notificacao`, texto opcional, preservando zeros e formatação;
- `justificativa_nao_notificacao`, texto opcional, condicionado à confirmação do cabeçalho;
- `valor_original_notificado`, `valor_original_numero` e `valor_original_justificativa`;
- `observacoes`, `criado_em` e `atualizado_em`.

A especificação decidiu `UNIQUE(paciente_id)`, ausência de `atendimento_id`, índice não único em `numero_notificacao` e nenhuma validação condicional rígida no banco. As dúvidas restantes bloqueiam somente a importação automática, não a criação da estrutura permissiva.

## Decisões humanas pendentes

- Confirmar a lista canônica e ordenada das colunas por aba, incluindo cabeçalhos duplicados.
- Confirmar se as duas descrições de importação pertencem ou não às 140 colunas.
- Definir unidades e regras de normalização para medidas clínicas e FEVE antes da importação.
- Confirmar a posição canônica de `Caso não, justifique` e os valores efetivos antes da importação.
- Confirmar a semântica de autorrelato, exame de familiares, contrarreferência, notificação e motivo do não tratamento.
- Normalizar duplicatas `BenBrasil`/`Benbrasil` e `Falha EPOCA`/`EPOCA FALHA`.
- Decidir se classes de medicamento precisam de catálogo próprio.
- Reconciliar futuramente o DER planejado com o schema aplicado, sem tratá-lo como fonte física.
