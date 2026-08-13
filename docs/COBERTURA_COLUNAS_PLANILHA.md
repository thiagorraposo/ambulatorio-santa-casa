# Cobertura das Colunas da Planilha pelo Núcleo Físico

Atualizado em: 2026-08-13

## Fonte e critério

A cobertura usa os 136 rótulos distintos das duas abas clínicas e o schema físico
atual de 35 tabelas. As decisões humanas consolidadas em
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md` resolvem semânticas, mas não contam como
cobertura física quando a cardinalidade ou obrigatoriedade do banco é incompatível.

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
| Coberta com transformação | 118 | 86,76% |
| Parcialmente coberta | 10 | 7,35% |
| Não coberta | 1 | 0,74% |
| Dúvida pendente | 1 | 0,74% |
| Total | 136 | 100,00% |

Cobertura plena atual: **124/136 (91,18%)**. Incluindo cobertura parcial:
**134/136 (98,53%)**.

A cobertura plena incorpora agora as cardinalidades confirmadas de projetos e
exames por paciente. As lacunas restantes pertencem aos dez itens parciais, ao
campo não coberto e à dúvida semântica documentada.

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

## Grupos parcialmente cobertos (10)

### Demais parciais — 10

| Cabeçalho | Lacuna atual |
| --- | --- |
| `Idade` | não preserva idade original estruturada |
| `Pendencias/Observação` | divisão entre texto e pendência segue ambígua |
| `Trouxe encaminhamento` | falta booleano de documento apresentado |
| `Autorelato diagnóstico de Chagas do participante (data)` | autorrelato não equivale a resultado laboratorial |
| `Familiares diretos (mãe, pai, irmãos) realizaram o exame de Chagas?` | histórico familiar não representa exame realizado |
| `teve reação adversa?` | faltam gravidade, data, consequência e estrutura repetível |
| `tratamento pelo ambulatorio?` | falta indicador explícito |
| `Em qual ano tomou a medicação (Benzonidazol)?` | falta ano aproximado próprio |
| `Prescrição do BZN (data)` | falta data de prescrição distinta da indicação |
| `Encaminhado a qual projeto?` | falta FK do encaminhamento para projeto oficial |

## Não coberta (1)

`Por quanto tempo foi usado?`: o schema não possui duração efetivamente cumprida
em dias. A coluna deve ser coberta por migration incremental antes do MVP.

## Cobertura projetada após migrations mínimas

As migrations de tratamento/reação adversa e encaminhamento eliminarão as lacunas
estruturais prioritárias restantes. A cobertura exata
pós-migration deverá ser recalculada a partir das especificações aprovadas, sem
promover antecipadamente itens de backlog ou `Localizado`.

A evolução de tratamento está especificada em
`docs/ESPECIFICACAO_TRATAMENTO_BENZONIDAZOL.md`. Quando implementada, cobrirá as
lacunas atuais de reação adversa repetível, realização pelo ambulatório, ano de
uso, data de prescrição e duração cumprida. Esta atualização é somente documental:
as contagens atuais permanecem inalteradas até a migration existir, ser aplicada
e validada.
