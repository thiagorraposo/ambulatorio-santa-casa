# Cobertura das Colunas da Planilha pelo Núcleo Físico

Atualizado em: 2026-07-16

## Objetivo e fontes

Este documento reconcilia as 140 entradas únicas de `planejamento/tabelas dicionário de dados/03_coluna_planilha_destino.csv` com o núcleo físico aplicado de 25 tabelas.

Ordem de precedência usada:

1. `docs/evidencias/schema_atual_ambulatorio.sql`, como evidência do schema aplicado;
2. migrations `sql/00` a `sql/09`, para confirmar a origem versionada da estrutura;
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
| Coberta com transformação | 91 | 65,00% |
| Parcialmente coberta | 12 | 8,57% |
| Não coberta | 19 | 13,57% |
| Dúvida pendente | 12 | 8,57% |
| Total | 140 | 100,00% |

Cobertura plena atual: **97 de 140 entradas (69,29%)**. Incluindo cobertura parcial: **109 de 140 (77,86%)**.

Há uma ressalva no denominador: `Controle da importação como processo.` e `Todas as colunas originais da planilha em formato bruto para auditoria.` são descrições técnicas, não cabeçalhos clínicos demonstrados. Sem elas, o catálogo possui 138 possíveis colunas de origem; elas permanecem classificadas como dúvida até confirmação da lista canônica.

## Classificação de cada coluna

### Coberta diretamente (6)

- `ID` → `paciente.codigo_planilha`.
- `Nome` → `paciente.nome`.
- `Endereço` → `paciente_endereco.endereco`.
- `Cidade` → `paciente_endereco.cidade`.
- `Telefone de Contato` → `paciente_contato.telefone`.
- `Localização do prontuário` → `atendimento.localizacao_prontuario`.

### Coberta com transformação (91)

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

### Parcialmente coberta (12)

| Coluna | Cobertura atual | Lacuna |
| --- | --- | --- |
| `Idade` | Pode ser calculada por `paciente.data_nascimento` | Não preserva a idade originalmente importada para auditoria. |
| `Pendencias/Observação` | `atendimento.observacoes` e `pendencia_atendimento` | Falta regra para separar texto livre de pendência estruturada. |
| `Trouxe encaminhamento` | `encaminhamento.valor_original_encaminhamento` e existência do registro | Falta booleano estruturado equivalente. |
| `Autorelato diagnóstico de Chagas do participante (data)` | `diagnostico_chagas.data_resultado_final` ou observações | Data de autorrelato não é semanticamente igual à data do resultado; falta campo próprio. |
| `Familiares diretos (mãe, pai, irmãos) realizaram o exame de Chagas?` | `historico_familiar_chagas` | `possui_historico_familiar` não expressa especificamente realização de exame por familiar. |
| `teve reação adversa?` | Eventos adversos existem em `tratamento_chagas` | Só cobre reação ligada ao tratamento de Chagas; não há evento clínico genérico. |
| `tratamento pelo ambulatorio?` | Contexto pode ser inferido de atendimento/tratamento | Falta campo explícito no tratamento. |
| `Em qual ano tomou a medicação (Benzonidazol)?` | `tratamento_chagas.data_inicio` | Uma informação apenas anual não possui regra segura de conversão para data completa. |
| `Prescrição do BZN (data)` | `tratamento_chagas.data_indicacao` | Indicação e prescrição são eventos distintos. |
| `Se não, descreva o motivo` | `tratamento_chagas.motivo_nao_tratamento` | O cabeçalho não define se o motivo é de não uso ou de não indicação. |
| `Encaminhado a qual projeto?` | `encaminhamento` e `atendimento_projeto_estudo` | Falta relação explícita entre o encaminhamento e o projeto. |
| `Paciente com contrarreferencia realizada?` | Pode ser descrita em `acompanhamento_cuidado` | Falta tipo/booleano inequívoco de contrarreferência. |

### Não coberta (19)

| Grupo | Colunas | Expansão necessária |
| --- | --- | --- |
| Autoria | `Responsavel pela digitacao` | Identidade de usuário/importador e referência no atendimento ou lote. |
| Eventos | `teve AVC`, `Ano do ultimo AVC` | Evento clínico estruturado. |
| Dispositivos | `portador de marcapasso?`, `portador de CDI?` | Dispositivo implantado estruturado. |
| Tratamento | `Por quanto tempo foi usado?` | Duração original ou regra derivada no tratamento. |
| Notificação | `Paciente notificado?`, `Número notificação` | Módulo de notificação. |
| Sinais e medidas | `Altura`, `Peso`, `Circunferencia Abdominal`, `Frequencia cardiaca`, `Saturacao`, `PA sistolica`, `PA diastolica`, `NYHA` | Dados clínicos por atendimento. |
| Desfecho | `Óbito`, `Data do óbito`, `causa do óbito` | Evento de óbito vinculado ao paciente. |

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

### Absorvidas pelo núcleo atual

- Correspondência direta ou renomeada: `paciente`, `paciente_endereco`, `paciente_contato`, `atendimento`, `encaminhamento`, `diagnostico_chagas`, `sorologia_chagas`, `sorologia_solicitacao`, `historico_familiar_chagas`, `condicao_chagas`, `complicacao_chagas`, `comorbidade`, `paciente_comorbidade` e `tipo_exame_complementar`.
- `programa` e `paciente_programa` foram absorvidas por `projeto_estudo` e `atendimento_projeto_estudo`; o vínculo atual é temporal por atendimento, do qual se deriva o paciente.
- `tipo_exame_laboratorial`, `resultado_laboratorial`, `tipo_exame`, `exame`, `ecocardiograma` e `exame_complementar` foram absorvidas pelo trio genérico `tipo_exame_complementar`, `atendimento_exame_complementar` e `exame_complementar_resultado`.
- `tratamento_benzonidazol` foi absorvida por `tratamento_chagas` mais o catálogo `medicamento`.
- `retorno_tratamento` e `retorno_anual` foram absorvidas por registros tipados em `acompanhamento_cuidado`.

### Ainda precisam ser criadas

- `usuario` ou, antes de autenticação, uma entidade mínima de responsável/importador.
- `evento_clinico`.
- `dispositivo_implantado`.
- `notificacao`.
- `dados_clinicos_atendimento`.
- `obito`.
- `importacao_planilha` e `importacao_linha`, antes da importação controlada.

### Redundantes ou a reformular

- `classe_medicamento` e `paciente_medicamento`: o núcleo usa `medicamento.classe_medicamento` e `atendimento_medicamento`; decidir se a classe textual basta ou se merece catálogo próprio, sem criar uma segunda associação concorrente.
- `encaminhamento_projeto`: reformular como relação explícita entre `encaminhamento` e `projeto_estudo`, caso a rastreabilidade do encaminhamento seja necessária.
- `contrarreferencia`: avaliar como especialização/etapa de `acompanhamento_cuidado`, evitando fluxo paralelo sem necessidade.
- `atendimento_observacao`: dividir a semântica entre `atendimento.observacoes` e `pendencia_atendimento`; criar tabela própria somente se houver múltiplas observações tipadas por atendimento.
- `tratamento_benzonidazol`, `retorno_tratamento`, `retorno_anual`, `tipo_exame_laboratorial`, `resultado_laboratorial`, `tipo_exame`, `exame` e `ecocardiograma`: não devem ser recriadas com esses nomes sem demonstrar informação que o modelo genérico atual não preserve.

## Divergências encontradas

- O dicionário planeja 38 tabelas e 364 campos; o schema aplicado possui 25 tabelas com nomes, chaves `BIGINT` e estruturas diferentes. O dicionário não é retrato do banco atual.
- O relatório automático afirma 140 colunas originais, mas sua fonte canônica esperada não existe; o fallback contém duas descrições técnicas tratadas como se fossem colunas.
- O CSV possui 192 linhas de destino para 140 nomes únicos. Parte é decomposição legítima, mas nomes repetidos perderam posição/aba e não distinguem os blocos trazido e solicitado.
- Campos planejados como `paciente.nome_completo`, `paciente.origem_aba` e `paciente_contato.valor_contato` existem fisicamente como `nome`, `grupo_origem_planilha` e `telefone`.
- `programa/paciente_programa` foi modelado fisicamente como projeto por atendimento, não como vínculo direto permanente do paciente.
- Exames laboratoriais, ECG, ECO e FEVE foram generalizados no módulo físico de exames complementares; recriar tabelas planejadas produziria sobreposição.
- Medicamentos foram generalizados por atendimento; o catálogo separado de classes planejado não existe.
- `Ambulatório unicamente` e `Ambulatório anexo ao projeto` foram mapeados como programas no documento antigo, mas são campos físicos de contexto em `atendimento`.
- A pergunta sobre exame realizado por familiares não equivale ao campo físico de histórico familiar.
- O DER citado por `DER Definitivo.md` referencia `DER_organizado_paineis.svg`, mas o arquivo SVG não está presente no inventário do repositório; só foi possível analisar a descrição textual do DER.

## Próximo módulo físico recomendado

Recomenda-se o módulo **avaliação clínica, eventos, dispositivos e desfecho**, porque depende apenas de `paciente` e `atendimento`, acrescenta cobertura direta para 15 das 19 colunas hoje não cobertas e preserva informação clínica de alto valor que não deve ficar em observações livres.

Estrutura proposta para decisão antes de migration:

### `dados_clinicos_atendimento`

- `dados_clinicos_atendimento_id`, PK;
- `atendimento_id`, FK e `UNIQUE` se houver uma avaliação consolidada por atendimento;
- `altura_cm`, `peso_kg`, `circunferencia_abdominal_cm`;
- `frequencia_cardiaca_bpm`, `saturacao_percentual`;
- `pa_sistolica_mmhg`, `pa_diastolica_mmhg`, `nyha`;
- campos `valor_original_*` para medidas cuja unidade/formato ainda precisa ser validado;
- `observacoes`, `criado_em`, `atualizado_em`.

### `evento_clinico`

- `evento_clinico_id`, PK;
- `paciente_id`, FK;
- `atendimento_id`, FK opcional até decisão sobre legado;
- `tipo_evento`, `ocorreu`, `data_evento`, `ano_evento`, `descricao`;
- `valor_original_evento`, `valor_original_data`, `observacoes`, timestamps.

### `dispositivo_implantado`

- `dispositivo_implantado_id`, PK;
- `paciente_id`, FK;
- `atendimento_id`, FK opcional como origem do registro;
- `tipo_dispositivo`, `possui_dispositivo`, `data_implante`, `status_dispositivo`;
- `valor_original_dispositivo`, `observacoes`, timestamps.

### `obito`

- `obito_id`, PK;
- `paciente_id`, FK e `UNIQUE` se houver apenas um desfecho consolidado;
- `atendimento_id`, FK opcional como origem do registro;
- `houve_obito`, `data_obito`, `causa_obito`, `relacao_chagas`;
- `valor_original_obito`, `valor_original_causa`, `observacoes`, timestamps.

Este desenho ainda não autoriza migration. Unidades, cardinalidade, obrigatoriedade do atendimento e domínios clínicos devem ser decididos primeiro.

## Decisões humanas pendentes

- Confirmar a lista canônica e ordenada das colunas por aba, incluindo cabeçalhos duplicados.
- Confirmar se as duas descrições de importação pertencem ou não às 140 colunas.
- Definir unidades e faixas aceitáveis para medidas clínicas e FEVE.
- Definir se eventos e dispositivos exigem `atendimento_id` obrigatório ou podem representar histórico legado sem atendimento.
- Definir se óbito é único por paciente e se `houve_obito=false` deve gerar linha.
- Confirmar a semântica de autorrelato, exame de familiares, contrarreferência, notificação e motivo do não tratamento.
- Normalizar duplicatas `BenBrasil`/`Benbrasil` e `Falha EPOCA`/`EPOCA FALHA`.
- Decidir se classes de medicamento precisam de catálogo próprio.
- Obter ou regenerar o DER visual ausente e alinhá-lo ao schema aplicado.
