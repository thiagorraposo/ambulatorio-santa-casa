# Cobertura das Colunas da Planilha pelo Núcleo Físico

Atualizado em: 2026-08-24

## Fonte e critério

A cobertura usa os 136 rótulos distintos das duas abas clínicas e o schema físico
atual de 37 tabelas. As decisões humanas consolidadas em
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md` resolvem semânticas, mas não contam como
cobertura física quando a cardinalidade ou obrigatoriedade do banco é incompatível.
O detalhamento por posição, aba e destino está no manifesto oficial
`manifestos/planilha_ambulatorio_v1.json`.

- **Direta:** destino semanticamente equivalente sem decomposição.
- **Com transformação:** destino atual preserva toda a informação após conversão,
  lookup ou transformação coluna-linha.
- **Parcial:** há destino aproximado, mas a estrutura atual viola uma cardinalidade,
  obrigatoriedade ou detalhe confirmado.
- **Não coberta:** não existe destino para a informação normalizada exigida.
- **Dúvida:** a semântica ainda não foi confirmada.

## Resultado conservador atual

| Classificação | Quantidade | Percentual |
| --- | ---: | ---: |
| Coberta diretamente | 8 | 5,88% |
| Coberta com transformação | 116 | 85,29% |
| Parcialmente coberta | 11 | 8,09% |
| Não coberta | 0 | 0,00% |
| Excluída do estruturado | 1 | 0,74% |
| Total | 136 | 100,00% |

Cobertura plena atual: **124/136 (91,18%)**. Incluindo cobertura parcial:
**135/136 (99,26%)**.

A contagem foi recalculada diretamente dos 136 rótulos físicos distintos do
manifesto. Ela corrige a divergência anterior, que informava quatro parciais
enquanto o artefato executável ainda continha dezoito. Sete foram promovidos com
destino comprovado; onze permanecem parciais. `Localizado` é exclusão deliberada,
não dúvida a ser inferida pelo importador.

## Alterações de classificação após confirmação humana

Passaram de dúvida para cobertura com transformação:

- `Responsável pela digitação`, com preservação como texto legado;
- `Caso não, justifique`, no bloco de notificação;
- `observação`, como texto livre genérico do atendimento;
- variantes BenBrasil/EPOCA, preservando o indicador de falha;
- identificação dos nove tipos repetidos pelo bloco, posição e ocorrência.

Passaram de parcial para cobertura com transformação:

- `Se não, descreva o motivo`, confirmado como motivo da não indicação de BZN;
- `ECG` e `ECG solicitado`, consolidados na ocorrência de eletrocardiograma;
- glicemia, HDL, LDL, triglicerídeos e data do colesterol, consolidados na
  ocorrência laboratorial do atendimento.

Continua excluído:

- `Localizado`: o domínio sim/não foi confirmado, mas não o significado nem a
  entidade. Não será estruturado no MVP sem nova decisão.

## Impacto da associação paciente–projeto

Os 15 cabeçalhos de participação, pendência e falha dos projetos passaram de
cobertura parcial para cobertura com transformação. A tabela
`paciente_projeto_estudo` representa o vínculo consolidado por paciente, preserva
os valores originais e registra falhas em BenBrasil e EPOCA sem criar projetos
adicionais.

## Impacto dos exames por paciente

Os tipos repetidos usam `paciente_exame_complementar`. ECG, resultado e data são
consolidados em `atendimento_exame_complementar` do tipo
`eletrocardiograma`. Glicemia, HDL, LDL e triglicerídeos usam
`exame_complementar_resultado`, e a data de colesterol usa a ocorrência
laboratorial do atendimento. Os indicadores agregados dos dois blocos continuam
parciais porque não identificam uma ocorrência exigida pelo modelo canônico.

## Impacto do tratamento com benzonidazol

Os cabeçalhos `teve reação adversa?`, `tratamento pelo ambulatorio?`, `Em qual
ano tomou a medicação (Benzonidazol)?`, `Prescrição do BZN (data)` e `Por quanto
tempo foi usado?` passaram para cobertura com transformação. As tabelas
`tratamento_benzonidazol` e `reacao_adversa_benzonidazol` fornecem cardinalidade
por paciente, atendimento opcional, duração em dias, ano aproximado, prescrição,
indicadores triestados, motivos separados e reações repetíveis.

## Impacto do encaminhamento ampliado

`Trouxe encaminhamento` e `Encaminhado a qual projeto?` passaram de cobertura
parcial para cobertura com transformação. `encaminhamento` agora preserva o
booleano triestado, o projeto oficial opcional e os dois valores originais, sem
criar projetos ou duplicar o vínculo com paciente.

## Grupos parcialmente cobertos (11)

| Cabeçalho | Lacuna atual |
| --- | --- |
| `Idade` | não há campo para idade original nem data de referência comprovada; a idade calculável deriva de nascimento e atendimento |
| `Autorelato diagnóstico de Chagas do participante (data)` | não há campo que diferencie data de autorrelato de data de resultado laboratorial |
| `Familiares diretos (mãe, pai, irmãos) realizaram o exame de Chagas?` | histórico familiar representa doença familiar, não realização de exame por parentes |
| `Paciente trouxe outros exames complementares?` | indicador agregado sem tipo; a tabela canônica exige ocorrência de exame identificada |
| `Solicitado exames complementares?` | indicador agregado sem tipo; a tabela canônica exige ocorrência de exame identificada |
| `Retorno 30 dias de tratamento` | valor e vínculo clínico do retorno não possuem semântica aprovada |
| `Retorno final de tratamento` | valor e vínculo clínico do retorno não possuem semântica aprovada |
| `Retorno anual realizado` | valor e vínculo clínico do retorno não possuem semântica aprovada |
| `Desfecho do retorno` | não está definido a qual retorno pertence nem seu domínio |
| `Paciente com contrarreferencia realizada?` | estado triestado é conhecido, mas o modelo não distingue fielmente “não realizada” de seus vários status nem fecha multiplicidade |
| `Pendencias/Observação` | o cabeçalho mistura pendência e observação sem regra segura de separação |

## Não coberta (0)

Não há rótulo confirmado sem possibilidade de preservação. Isso não transforma as
onze lacunas reais em cobertura estruturada: elas ficam no JSONB bruto e geram
pendência de linha. `Localizado` permanece deliberadamente excluído.

## Situação após as migrations mínimas

As quatro migrations mínimas do MVP foram implementadas. Os onze itens parciais
possuem comportamento determinístico no contrato sintético e podem ficar no
backlog sem promoção estruturada. `Localizado` não será promovido sem definição
semântica. A implementação do encaminhamento está documentada em
`docs/ESPECIFICACAO_ENCAMINHAMENTO_AMPLIADO.md`.
