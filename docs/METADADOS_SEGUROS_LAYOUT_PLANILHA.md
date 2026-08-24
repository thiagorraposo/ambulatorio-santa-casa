# Metadados Seguros do Layout da Planilha

Atualizado em: 2026-08-21

## Fonte canônica

A fonte canônica do layout é o arquivo local, não versionado e ignorado pelo Git
`planejamento/Nova Planilha ambulatório.xlsx`. Somente seus metadados estruturais
podem orientar o planejamento. O relatório completo e a classificação das
diferenças estão em `docs/IMPACTO_NOVO_LAYOUT_PLANILHA.md`, fonte de verdade desta
análise.

O catálogo antigo de 140 nomes deixa de ser canônico para o layout físico. Ele
continua útil apenas como histórico de intenção e mapeamento.

## Inventário seguro resumido

- cinco abas: duas clínicas principais, uma operacional e duas auxiliares;
- cabeçalho na linha 1 das abas principais;
- 142 posições preenchidas na aba de portadores e 136 na de não portadores;
- nove cabeçalhos repetidos em dois blocos de exames nas duas abas;
- quatro colunas de complicações somente na aba de portadores;
- 81 rótulos compartilhados deslocados entre as abas;
- cabeçalho na linha 2 e dois blocos repetidos na aba operacional;
- ausência de cabeçalho demonstrado nas duas abas auxiliares AIM3;
- mistura geral de texto, número e booleano, sem fórmulas.

Nenhum valor de célula assistencial ou identificável integra este inventário.

## Manifesto oficial

O requisito foi implementado em `manifestos/planilha_ambulatorio_v1.json`, fonte
oficial executável do layout físico `v1`. A descrição humana e o procedimento de
validação estão em `docs/MANIFESTO_FISICO_PLANILHA_V1.md`. As abas operacional e
auxiliares permanecem fora do manifesto de importação.

## Decisões aplicáveis ao MVP

- somente as duas abas clínicas entram na primeira versão;
- cada linha representa um atendimento e a aba determina a condição de Chagas;
- portadores prevalece em conflito de paciente entre abas;
- coluna ausente ou célula vazia significa não informado, nunca resposta negativa;
- os dois blocos de exames devem registrar bloco, posição, ocorrência e tipo;
- o cabeçalho canônico é `Responsável pela digitação`;
- `Localizado` permanece sem semântica suficiente e fora do mapeamento estruturado;
- a aba operacional e as duas abas AIM3 ficam fora do MVP.

As regras completas estão em `docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`.
