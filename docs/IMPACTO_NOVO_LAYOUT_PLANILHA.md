# Impacto do Novo Layout da Planilha

Atualizado em: 2026-07-20

## Escopo e segurança

A fonte canônica de layout passa a ser o arquivo local e ignorado pelo Git
`planejamento/Nova Planilha ambulatório.xlsx`. A regra `*.xlsx` de `.gitignore`
foi confirmada com `git check-ignore -v`; o arquivo não foi removido, alterado ou
versionado.

Esta análise leu somente nomes de abas, coordenadas e textos de cabeçalhos,
dimensões, filtros, congelamento, mesclagens, tipos de célula, estilos e formatos
gerais. Nenhum valor de paciente ou valor clínico foi impresso, copiado, resumido
ou registrado.

Este documento é a fonte de verdade para a estrutura e o impacto físico do layout
de 2026-07-20. As decisões semânticas posteriores estão consolidadas em
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`. A evidência do banco continua sendo
`docs/evidencias/schema_atual_ambulatorio.sql`.

## Estrutura física encontrada

| Ordem | Aba | Papel | Região declarada | Cabeçalho | Estrutura geral |
| ---: | --- | --- | --- | --- | --- |
| 1 | `Pacientes portadores de DC` | Clínica principal | `A1:EO2128` | linha 1, 142 posições preenchidas (`A:EL`) | filtro `A1:EL1737`, primeira linha congelada, sem mesclagens e sem fórmulas |
| 2 | `Pacientes não portadores de DC` | Clínica principal | `A1:EI161` | linha 1, 136 cabeçalhos preenchidos e duas posições finais vazias | filtro `A1:EI1`, primeira linha congelada, sem mesclagens e sem fórmulas |
| 3 | `P Digitar` | Operacional | `A1:L131` | linha 2 | dois blocos de três colunas (`A:C` e `J:L`), filtro em `A2:C131`, duas mesclagens e sem fórmulas |
| 4 | `AIM3 incluidos sem ambulatorio` | Auxiliar | `A1:C25` | não há linha de cabeçalho demonstrada | lista estreita, duas posições normalmente ocupadas, sem filtro, congelamento ou fórmula |
| 5 | `AIM3 sem ambulatorio` | Auxiliar | `A1:C76` | não há linha de cabeçalho demonstrada | lista estreita, duas posições normalmente ocupadas e terceira esporádica, sem filtro, congelamento ou fórmula |

A dimensão `EO` da primeira aba excede o último cabeçalho e o filtro (`EL`), o que
indica artefatos de formatação/uso da planilha e não 145 colunas canônicas.

As células das abas principais misturam texto compartilhado, números e booleanos,
com estilos diferentes por grupo de colunas. Há formatos compatíveis com datas e
números, mas também valores textuais nas mesmas regiões. Isso confirma que o
importador futuro não poderá inferir o tipo somente pelo formato do Excel. As abas
auxiliares combinam principalmente texto e número. Não foram encontradas fórmulas.

## Comparação das duas abas principais

As duas abas não podem usar um mapa puramente posicional único.

- As posições `A:AS` compartilham a mesma sequência, exceto pelas variantes de
  grafia em `J` (`Benbrasil`/`BenBrasil`) e `O` (`Falha EPOCA`/`EPOCA FALHA`).
- A aba de portadores inclui quatro colunas de complicações em `AT:AW` que não
  existem na aba de não portadores.
- Por isso, 81 cabeçalhos compartilhados a partir de comorbidades estão deslocados
  quatro posições para a esquerda na aba de não portadores.
- A aba de portadores acrescenta no fim `Responao se aplicavel pela digitacao`,
  `Localizado` e `observação`. A aba de não portadores termina com
  `Responsavel pela digitacao` e duas células de cabeçalho vazias.
- Um mesmo mapeamento semântico pode ser reutilizado depois de identificar a aba,
  normalizar o cabeçalho e usar sua ocorrência; a coordenada absoluta precisa ser
  específica de cada aba e versão.

## Classificação das diferenças

O inventário anterior tinha 140 nomes únicos, mas misturava cabeçalhos inferidos,
quatro nomes de catálogo, um metadado derivável da aba e duas descrições técnicas.
O novo layout tem 136 rótulos semânticos distintos nas duas abas principais, após
aparar espaços externos e preservar diferenças de caixa relevantes para a fonte.

### Mantidas

Foram comprovadas fisicamente 133 entradas do catálogo anterior. Nesse total estão
os 125 rótulos comuns às duas abas e os rótulos específicos de portadores. Espaços
externos em `Origem encaminhamento`, `Anti- hipertensivo`, `ECG` e `Saturacao` são
variações físicas que devem ser normalizadas sem perder o original.

### Renomeadas ou com variante de grafia

| Conceito | Variação física | Tratamento recomendado |
| --- | --- | --- |
| Projeto BenBrasil | `Benbrasil` na aba de portadores; `BenBrasil` na outra | mesma chave normalizada, preservando o cabeçalho original |
| Falha EPOCA | `Falha EPOCA` e `EPOCA FALHA` | confirmar equivalência humana antes de consolidar |
| Responsável pela digitação | `Responsavel pela digitacao` e `Responao se aplicavel pela digitacao` | a segunda forma parece corrompida, mas a equivalência não deve ser assumida automaticamente |
| Data do atendimento na aba operacional | `D. Atend` | alias operacional a confirmar |
| Identificador na aba operacional | `DN` | significado insuficientemente claro; não assumir data de nascimento |

### Novas

`Localizado` e `observação`, ambas exclusivas da aba de portadores, não constavam
do catálogo anterior. A forma corrompida `Responao se aplicavel pela digitacao`
também é uma ocorrência nova até confirmação de que renomeia o responsável.

### Removidas do layout físico

- `Glicemia`, `Colesterol HDL`, `Colesterol LDL` e `Triglicerídeos` não aparecem
  como cabeçalhos; eram nomes de catálogo inferidos. Os respectivos campos de
  valor continuam presentes.
- `Controle da importação como processo.` e `Todas as colunas originais da
  planilha em formato bruto para auditoria.` são descrições técnicas, não colunas.
- `Origem da aba: portador ou não portador de DC` não é coluna: é metadado derivado
  do nome da aba e continua necessário no processo de importação.

### Deslocadas

Há 81 rótulos compartilhados em posições diferentes. O deslocamento começa em
`Comorbidades não relacionadas a DC?` (`AX` nos portadores e `AT` nos não
portadores) e segue até `Classificacao da cardiopatia chagasica` (`EI` e `EE`).
Os blocos de exames repetidos também mudam de `CN:DE` para `CJ:DA`.

### Repetidas

Nas duas abas principais, `ECO`, `Laboratoriais`, `De imagem`, `Holter`,
`Endoscopia`, `Colonoscopia`, `Teste Ergometrico`, `Mapa` e `Outros` aparecem duas
vezes. As ocorrências pertencem aos blocos iniciado por `Paciente trouxe outros
exames complementares?` e iniciado por `Solicitado exames complementares?`.
Logo, aba + posição + ocorrência são obrigatórias; o texto isolado não é chave.

Na aba `P Digitar`, `DN`, `Nome` e `D. Atend` se repetem nos blocos `A:C` e `J:L`.

### Específicas por aba

- Somente em portadores: as quatro colunas de complicações, `Localizado`,
  `observação` e a forma corrompida do possível responsável; `Falha EPOCA` e
  `Benbrasil` são variantes locais.
- Somente em não portadores: as formas `EPOCA FALHA`, `BenBrasil` e
  `Responsavel pela digitacao`.
- Somente na operacional: `DN` e `D. Atend`; `Nome` é compartilhado apenas em
  sentido lexical, não em finalidade comprovada.
- As duas abas AIM3 não possuem cabeçalho demonstrado e não entram no mapeamento
  clínico até confirmação humana de sua finalidade e de suas colunas.

### Sem significado suficientemente claro

`Localizado` continua sem significado e entidade confirmados. `DN` e `D. Atend`
ficam fora do MVP com a aba operacional. A grafia canônica de responsável,
`observação`, os blocos de exames, notificação, tratamento, unidades e valores
foram definidos posteriormente em `docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`.

## Cobertura histórica antes das decisões humanas

A contagem conservadora usa os 136 rótulos distintos das duas abas principais.
Cabeçalhos repetidos contam uma vez no denominador semântico e estão registrados
como ocorrências físicas separadas no manifesto v1.

| Classificação | Quantidade | Percentual |
| --- | ---: | ---: |
| Coberta diretamente | 6 | 4,41% |
| Coberta com transformação | 104 | 76,47% |
| Parcialmente coberta | 12 | 8,82% |
| Não coberta | 1 | 0,74% |
| Dúvida pendente | 13 | 9,56% |
| Total | 136 | 100,00% |

Cobertura plena: **110 de 136 (80,88%)**. Incluindo cobertura parcial:
**122 de 136 (89,71%)**.

Esta era a fotografia anterior às decisões humanas. A cobertura corrente,
rebaixada quando o schema tem cardinalidade incompatível, está em
`docs/COBERTURA_COLUNAS_PLANILHA.md`: **88/136 (64,71%)** plena e
**134/136 (98,53%)** incluindo parcial.

## Impacto nas 33 tabelas

Nenhuma tabela precisa ser removida e nenhuma migration aplicada deve ser
alterada. O impacto é de revisão futura, não de mudança física imediata.

| Situação | Tabelas/módulos | Impacto |
| --- | --- | --- |
| Mantido | `paciente`, endereço, contato, atendimento, projetos, diagnóstico, sorologia, comorbidades, medicamentos, avaliação clínica, óbito e notificação | os cabeçalhos correspondentes foram confirmados; regras de normalização continuam necessárias |
| Mantido e reforçado | `importacao_lote`, `importacao_linha`, `importacao_registro` | o layout confirma a necessidade de registrar aba, ordem e ocorrências repetidas; o array posicional continua adequado |
| Revisar | `complicacao_chagas` | as quatro colunas existem apenas na aba de portadores; ausência na outra aba é estrutural, não valor negativo |
| Revisar | `tratamento_chagas` | duração segue sem destino; ano, prescrição, execução pelo ambulatório e motivo seguem parciais/ambíguos |
| Revisar | `encaminhamento`, `acompanhamento_cuidado`, `pendencia_atendimento` | `Localizado`, `observação`, contrarreferência e separação entre observação/pendência dependem de definição humana |
| Revisar | `atendimento_exame_complementar` e resultados | o modelo genérico serve aos dois blocos, mas o importador precisará preservar contexto trazido/solicitado |
| Revisar | `importacao_linha.responsavel_digitacao_original` | confirmar o cabeçalho corrompido antes de mapear a aba de portadores |
| Sem destino decidido | abas operacionais/auxiliares | não criar tabelas a partir de listas sem cabeçalho ou aliases não confirmados |

## Módulos e planejamento

### Mantidos

- manifesto físico seguro e importador configurável por versão;
- extensão de tratamento de Chagas;
- revisão do fluxo de encaminhamento/contrarreferência;
- autenticação/autorização, API e frontend somente após estabilizar a importação.

### Revisados

- O manifesto deixou de ser uma atividade de descoberta e passa a ser a
  formalização versionável dos metadados comprovados neste levantamento.
- Um único mapa posicional para as duas abas principais deixou de fazer sentido.
- A futura extensão de complicações não é nova: o módulo existe, mas sua regra de
  ausência por tipo de aba precisa ser explícita.
- A migration futura genérica para "demais tabelas planejadas" deixa de ser uma
  etapa válida. Só devem existir migrations incrementais justificadas por lacunas
  confirmadas.

### Potencialmente adicionados

- configuração/manifesto de layout por aba, versão, posição e ocorrência (artefato
  de importação; não exige necessariamente tabela nova);
- fila operacional de digitação, somente se `P Digitar` for confirmada como fluxo
  vigente e não como lista temporária;
- controle de localização de prontuário, somente se `Localizado` tiver semântica
  distinta de `atendimento.localizacao_prontuario`;
- observações tipadas, somente se `observação` for distinta de
  `Pendencias/Observação` e admitir múltiplas ocorrências;
- elegibilidade/participação AIM3 fora do ambulatório, somente após confirmar o
  papel das duas abas auxiliares e evitar duplicar `projeto_estudo`.

## Decisões anteriormente bloqueadoras

A maior parte foi resolvida e incorporada em
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`. Permanecem como bloqueios para dados
reais a governança operacional, retenção, roles, auditoria/acesso ao JSONB e a
semântica de `Localizado` caso seja incluído no MVP.

## Sequência histórica

A rota atual substitui esta sequência e está definida em
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md` e `docs/PROXIMOS_PASSOS.md`.

## Validação

- `git check-ignore -v -- planejamento/Nova Planilha ambulatório.xlsx` confirmou
  a regra `*.xlsx`.
- A extração estrutural não gerou arquivo intermediário versionado.
- `make project-check` deve validar a documentação; as etapas de banco dependem do
  PostgreSQL local configurado.
