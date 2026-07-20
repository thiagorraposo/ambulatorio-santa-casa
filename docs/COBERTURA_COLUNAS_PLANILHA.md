# Cobertura das Colunas da Planilha pelo Núcleo Físico

Atualizado em: 2026-07-20

## Fonte e critério

A cobertura usa os 136 rótulos distintos das duas abas clínicas e o schema físico
atual de 33 tabelas. As decisões humanas consolidadas em
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
| Coberta com transformação | 82 | 60,29% |
| Parcialmente coberta | 46 | 33,82% |
| Não coberta | 1 | 0,74% |
| Dúvida pendente | 1 | 0,74% |
| Total | 136 | 100,00% |

Cobertura plena atual: **88/136 (64,71%)**. Incluindo cobertura parcial:
**134/136 (98,53%)**.

A queda da cobertura plena não representa perda do schema. Ela decorre de decisões
mais precisas: projetos pertencem ao paciente e exames não podem depender
obrigatoriamente do atendimento. O modelo atual consegue guardar valores, mas não
respeita ainda essas cardinalidades.

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

## Grupos parcialmente cobertos (46)

### Projetos — 15

Os cabeçalhos de participação, pendência e falha dos projetos podem ser guardados,
mas `atendimento_projeto_estudo` vincula o projeto ao atendimento. A decisão exige
vínculo ao paciente. A futura associação deverá preservar `houve_falha` sem
confundir BenBrasil e EPOCA.

### Exames — 21

Incluem valores laboratoriais, ECG/ECO/FEVE, os dois indicadores de bloco e os nove
tipos repetidos. O modelo genérico representa tipo, origem e resultado textual,
mas exige `atendimento_id`; a decisão exige paciente obrigatório e atendimento
opcional.

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

As migrations de paciente–projeto, exame por paciente, tratamento/reação adversa
e encaminhamento eliminam as lacunas estruturais prioritárias. A cobertura exata
pós-migration deverá ser recalculada a partir das especificações aprovadas, sem
promover antecipadamente itens de backlog ou `Localizado`.
