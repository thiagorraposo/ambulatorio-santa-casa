# Cobertura das Colunas da Planilha pelo Núcleo Físico

Atualizado em: 2026-08-21

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
| Coberta diretamente | 6 | 4,41% |
| Coberta com transformação | 125 | 91,91% |
| Parcialmente coberta | 4 | 2,94% |
| Não coberta | 0 | 0,00% |
| Dúvida pendente | 1 | 0,74% |
| Total | 136 | 100,00% |

Cobertura plena atual: **131/136 (96,32%)**. Incluindo cobertura parcial:
**135/136 (99,26%)**.

A cobertura plena incorpora agora as cardinalidades confirmadas de projetos,
exames e tratamento com BZN por paciente e o encaminhamento ampliado. As lacunas
restantes pertencem aos quatro itens parciais e à dúvida semântica documentada.

## Alterações de classificação após confirmação humana

Passaram de dúvida para cobertura com transformação:

- `Responsável pela digitação`, com preservação como texto legado;
- `Caso não, justifique`, no bloco de notificação;
- `observação`, como texto livre genérico do atendimento;
- variantes BenBrasil/EPOCA, preservando o indicador de falha;
- identificação dos nove tipos repetidos pelo bloco, posição e ocorrência.

Passaram de parcial para cobertura com transformação:

- `Se não, descreva o motivo`, confirmado como motivo da não indicação de BZN;
- `Paciente com contrarreferencia realizada?`, representável provisoriamente como
  estado consolidado; múltiplas ocorrências permanecem no backlog.

Continuam como dúvida:

- `Localizado`: o domínio sim/não foi confirmado, mas não o significado nem a
  entidade. Não será estruturado no MVP sem nova decisão.

## Impacto da associação paciente–projeto

Os 15 cabeçalhos de participação, pendência e falha dos projetos passaram de
cobertura parcial para cobertura com transformação. A tabela
`paciente_projeto_estudo` representa o vínculo consolidado por paciente, preserva
os valores originais e registra falhas em BenBrasil e EPOCA sem criar projetos
adicionais.

## Impacto dos exames por paciente

Os 21 cabeçalhos de valores laboratoriais, ECG/ECO/FEVE, indicadores de bloco e
tipos repetidos passaram de cobertura parcial para cobertura com transformação.
`paciente_exame_complementar` fornece paciente obrigatório, atendimento opcional,
blocos independentes, tipos catalogados ou livres e resultado textual.

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

## Grupos parcialmente cobertos (4)

### Demais parciais — 4

| Cabeçalho | Lacuna atual |
| --- | --- |
| `Idade` | não preserva idade original estruturada |
| `Pendencias/Observação` | divisão entre texto e pendência segue ambígua |
| `Autorelato diagnóstico de Chagas do participante (data)` | autorrelato não equivale a resultado laboratorial |
| `Familiares diretos (mãe, pai, irmãos) realizaram o exame de Chagas?` | histórico familiar não representa exame realizado |

## Não coberta (0)

Não há rótulo confirmado sem destino físico. Isso não elimina as quatro coberturas
parciais nem a dúvida de `Localizado`.

## Situação após as migrations mínimas

As quatro migrations mínimas do MVP foram implementadas. Os quatro itens parciais
restantes são backlog permitido, e `Localizado` não será promovido sem definição
semântica. A implementação do encaminhamento está documentada em
`docs/ESPECIFICACAO_ENCAMINHAMENTO_AMPLIADO.md`.
