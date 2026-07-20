# Cobertura das Colunas da Planilha pelo Núcleo Físico

Atualizado em: 2026-07-20

## Fonte e critério

A cobertura foi recalculada contra os metadados de
`planejamento/Nova Planilha ambulatório.xlsx`, arquivo local ignorado pelo Git, e
contra as 33 tabelas documentadas em
`docs/evidencias/schema_atual_ambulatorio.sql`. Nenhum valor de dado foi lido para
esta classificação.

O inventário detalhado, posições, diferenças entre abas e impactos por módulo
estão em `docs/IMPACTO_NOVO_LAYOUT_PLANILHA.md`.

- **Direta:** campo físico semanticamente equivalente.
- **Com transformação:** toda a informação cabe no modelo após conversão,
  normalização, lookup ou transformação coluna-linha.
- **Parcial:** parte da semântica cabe no modelo, mas há perda ou ambiguidade.
- **Não coberta:** não há destino físico adequado.
- **Dúvida:** posição repetida ou significado ainda impede decisão segura.

## Resultado

O denominador é de 136 rótulos distintos nas duas abas principais, aparando
espaços externos, mas preservando variantes de grafia. As ocorrências repetidas
serão individualizadas no manifesto físico.

| Classificação | Quantidade | Percentual |
| --- | ---: | ---: |
| Coberta diretamente | 6 | 4,41% |
| Coberta com transformação | 104 | 76,47% |
| Parcialmente coberta | 12 | 8,82% |
| Não coberta | 1 | 0,74% |
| Dúvida pendente | 13 | 9,56% |
| Total | 136 | 100,00% |

Cobertura plena: **110/136 (80,88%)**. Com cobertura parcial:
**122/136 (89,71%)**.

## Coberta diretamente (6)

`ID`, `Nome`, `Endereço`, `Cidade`, `Telefone de Contato` e
`Localização do prontuário`.

## Coberta com transformação (104)

São os 109 itens anteriormente classificados nessa categoria, exceto os cinco que
o arquivo comprovou não serem cabeçalhos físicos: `Origem da aba: portador ou não
portador de DC` é derivado da aba; `Glicemia`, `Colesterol HDL`, `Colesterol LDL` e
`Triglicerídeos` eram nomes de catálogo. A origem da aba continua coberta como
metadado do processo, mas não entra no denominador de colunas.

Permanecem nesse grupo os cabeçalhos de demografia, atendimento, projetos,
diagnóstico, sorologia, condições/complicações, comorbidades, valores laboratoriais,
medicamentos, avaliação clínica, eventos, dispositivos, óbito, notificação,
acompanhamento e responsável pela digitação cuja equivalência é comprovada.

## Parcialmente coberta (12)

| Cabeçalho | Lacuna atual |
| --- | --- |
| `Idade` | calculável, mas sem preservação estruturada do original |
| `Pendencias/Observação` | regra de separação entre texto e pendência ausente |
| `Trouxe encaminhamento` | falta booleano equivalente inequívoco |
| `Autorelato diagnóstico de Chagas do participante (data)` | autorrelato não equivale a resultado laboratorial |
| `Familiares diretos (mãe, pai, irmãos) realizaram o exame de Chagas?` | histórico familiar não representa especificamente exame realizado |
| `teve reação adversa?` | vínculo com tratamento ou evento genérico não confirmado |
| `tratamento pelo ambulatorio?` | falta campo explícito no tratamento |
| `Em qual ano tomou a medicação (Benzonidazol)?` | ano isolado não converte com segurança em data |
| `Prescrição do BZN (data)` | prescrição e indicação são eventos distintos |
| `Se não, descreva o motivo` | objeto do motivo não está definido |
| `Encaminhado a qual projeto?` | falta vínculo explícito encaminhamento-projeto |
| `Paciente com contrarreferencia realizada?` | falta tipo/estado inequívoco |

## Não coberta (1)

`Por quanto tempo foi usado?`: falta duração original ou regra derivada em
`tratamento_chagas`.

## Dúvida pendente (13)

- Nove rótulos repetidos: `ECO`, `Laboratoriais`, `De imagem`, `Holter`,
  `Endoscopia`, `Colonoscopia`, `Teste Ergometrico`, `Mapa` e `Outros`. O schema
  genérico cobre exames, mas aba, posição, ocorrência e bloco são indispensáveis.
- `Caso não, justifique`: a posição sugere notificação, mas a regra semântica ainda
  requer confirmação humana.
- `Responao se aplicavel pela digitacao`: possível forma corrompida de responsável,
  sem equivalência automática segura.
- `Localizado`: objeto e domínio desconhecidos.
- `observação`: relação com `Pendencias/Observação` desconhecida.

## Itens retirados do denominador antigo

Além dos cinco itens técnicos/de catálogo descritos acima,
`Controle da importação como processo.` e `Todas as colunas originais da planilha
em formato bruto para auditoria.` são descrições das tabelas de proveniência, não
cabeçalhos. Sua retirada explica a mudança do denominador, sem reduzir a capacidade
das tabelas `importacao_lote`, `importacao_linha` e `importacao_registro`.

## Consequência

O schema de 33 tabelas permanece uma base válida, mas a redução percentual de
82,14% para 80,88% reflete um denominador agora físico e três cabeçalhos novos
mantidos como dúvida. Nenhuma migration deve ser criada antes das confirmações
listadas no relatório de impacto.
