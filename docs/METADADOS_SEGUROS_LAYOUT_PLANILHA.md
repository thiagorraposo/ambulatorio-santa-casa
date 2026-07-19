# Metadados Seguros do Layout da Planilha

Atualizado em: 2026-07-19

## Fonte canônica disponível

O inventário semântico atual usa os 140 nomes únicos de `planejamento/tabelas dicionário de dados/03_coluna_planilha_destino.csv`. Esse arquivo contém somente metadados de mapeamento, mas foi produzido a partir de um fallback documental e não comprova o layout físico.

Ele é canônico para:

- conjunto de nomes semânticos conhecidos;
- mapeamentos planejados e dúvidas já registradas;
- reconciliação de cobertura enquanto não existir manifesto físico melhor.

Ele não é canônico para:

- nomes exatos e ordem das abas;
- ordem física das colunas;
- quantidade e posição de cabeçalhos repetidos;
- valores de células ou regras de normalização.

## Abas

Os grupos `portador de DC` e `não portador de DC` são conhecidos pelo metadado `Origem da aba: portador ou não portador de DC`, mas os nomes físicos, a capitalização e a ordem das abas não estão comprovados. Nenhum nome físico será inventado.

## Manifesto físico futuro

Antes de implementar o importador, deve ser criado um manifesto versionado contendo apenas:

- `layout_versao`;
- `aba_chave`, `aba_nome_original` e `aba_ordem`;
- `coluna_chave`, `cabecalho_original` e `coluna_ordem`;
- `ocorrencia_cabecalho`.

O manifesto não pode conter valores de células, exemplos clínicos, identificadores de pacientes, caminhos locais ou credenciais. Sua extração deverá ler somente a estrutura do arquivo em ambiente controlado.

## Cabeçalhos repetidos

`ECO`, `Laboratoriais`, `De imagem`, `Holter`, `Endoscopia`, `Colonoscopia`, `Teste Ergometrico`, `Mapa` e `Outros` dependem de aba, posição e ocorrência. Até o manifesto existir, continuam semanticamente inventariados, mas fisicamente não identificáveis para importação automática.

Esta limitação não bloqueia a migration genérica de importação e proveniência. Ela bloqueia somente a configuração e execução do importador.
