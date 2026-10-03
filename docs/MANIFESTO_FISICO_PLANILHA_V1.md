# Manifesto Físico da Planilha — v1

Atualizado em: 2026-10-01

## Fonte oficial

O artefato executável oficial para a especificação normativa do importador é
`manifestos/planilha_ambulatorio_v1.json`. Ele foi gerado exclusivamente a partir
da linha 1 das duas abas clínicas do arquivo local ignorado
`planejamento/Nova Planilha ambulatório.xlsx`. Nenhuma célula clínica ou linha de
paciente foi lida para compor o manifesto.

A versão de layout permanece `planilha_ambulatorio_v1`; o campo `versao` está em
`v1.4` e identifica
a evolução semântica do manifesto. Ela descreve o layout observado e os destinos
declarados, sem pressupor versões históricas inexistentes.

## Inventário

| Aba | Chave | Colunas físicas |
| --- | --- | ---: |
| `Pacientes portadores de DC` | `portadores` | 142 |
| `Pacientes não portadores de DC` | `nao_portadores` | 136 |

As 278 posições representam 136 rótulos físicos canônicos e 133 chaves semânticas
estáveis. A redução ocorre por três aliases consolidados:

- `Benbrasil` e `BenBrasil` → `benbrasil`;
- `Falha EPOCA` e `EPOCA FALHA` → `epoca_falha`;
- `Responao se aplicavel pela digitacao` e `Responsavel pela digitacao` →
  `responsavel_pela_digitacao`.

Cada entrada física contém versão, aba, coordenada, ordem, cabeçalho original,
chave semântica, ocorrência, bloco, tipo, destino, tabela/campo, cobertura,
transformação, alias e observação técnica segura.

O bloco `aliases_versionados` contém somente equivalências aprovadas de
booleanos, projetos, exames e medicamentos, além dos domínios efetivamente usados.
Comorbidades e domínios sem variantes aprovadas possuem lista/mapa vazio; isso
proíbe correspondência aproximada e criação automática de catálogo.

## Diferenças e repetições

As quatro complicações de Chagas existem somente nos portadores. Outros 81
cabeçalhos compartilhados ficam deslocados quatro posições entre as abas. Os nove
tipos `ECO`, `Laboratoriais`, `De imagem`, `Holter`, `Endoscopia`, `Colonoscopia`,
`Teste Ergometrico`, `Mapa` e `Outros` têm ocorrências `1` e `2`, diferenciadas
pelos blocos `trazido` e `solicitado`, além de aba e posição.

Altura é declarada como número de origem em metros com transformação explícita
`altura_cm = altura_m * 100`. Célula vazia significa `não informado`, nunca falso.

Os dois indicadores de contexto do ambulatório apontam diretamente para
`atendimento.ambulatorio_unicamente` e `atendimento.ambulatorio_anexo_projeto`;
eles não são associações com `projeto_estudo`.

O manifesto atual declara 126 dos 136 rótulos com cobertura estruturada plena:
8 direta e 118 com transformação. Nove permanecem parciais e `Localizado`
permanece excluído. Cada parcial preserva o original no JSONB bruto; alguns
valores inequívocos também podem ser materializados por handlers explícitos,
sem alterar a classificação global. D11 (`pendencias_observacao`) passou a destino pleno na v1.1 do
manifesto e é promovida de forma controlada pelo importador v1.2.0. A contagem não
comprova, isoladamente, cobertura funcional das demais respostas da equipe.

## Divergências conhecidas após as respostas da equipe

A fonte semântica vigente é
[decisões humanas](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md), com avaliação na
[matriz de impacto](dados/COBERTURA_COLUNAS_PLANILHA.md). Razões antigas de
semântica indefinida para retornos, contrarreferência e `Localizado` ficaram
superadas; D11, D2 e ano D8 possuem destinos executáveis. D2 exige a migration 28;
D8 usa `evento_clinico.ano_evento` sem criar visita e tem captura nova na 52.

O tipo semântico do texto legado de retorno BZN, ano D8 e exame de familiares é
`texto`, pois nem toda célula permite conversão segura. Os destinos parciais
declarados indicam onde um valor inequívoco pode ser materializado; não afirmam
que todo texto foi promovido. Idade ainda aparece como `data` por inferência do
gerador, ponto de metadado a corrigir com validador e testes. As contagens 126/9
e as listas de parciais são fixadas nesses artefatos: aprovação do
`manifest-check` não substitui o aceite funcional de cada handler.

## Exclusões deliberadas

`Localizado` permanece no inventário físico, mas com cobertura `excluido`, sem
tabela ou campo de destino. O importador sintético já o preserva somente no JSONB
bruto. A equipe confirmou que indica prontuário físico localizado e pode sair do
funcional; isso não autoriza purgar bruto nem remover `localizacao_prontuario`.

As abas `P Digitar`, `AIM3 incluidos sem ambulatorio` e `AIM3 sem ambulatorio`
estão registradas como fora do escopo e não possuem colunas no manifesto.

## Validação

```bash
make manifest-check
```

Esse alvo valida somente artefatos versionados e é o usado no CI. Quando a fonte
local ignorada estiver disponível, a comparação adicional dos cabeçalhos é:

```bash
make manifest-source-check
```

O alvo valida campos obrigatórios, versão, contagens, posições e ordens únicas,
ocorrências repetidas, chaves, blocos/tipos, formato e existência dos destinos no
schema versionado, ausência de padrões sensíveis e igualdade dos cabeçalhos com a
fonte local. O validador não lê linhas de dados.

O manifesto orienta `docs/ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md`, fonte das
regras operacionais, e a fixture sintética já existente. Não implementa o importador
nem autoriza dados reais.

## Extensão sintética de descoberta de Chagas — manifesto v1.2

O layout físico permanece v1; o contrato semântico do manifesto passou a v1.2.
O validador verifica o destino `diagnostico_chagas.data_descoberta_autorelato`
na migration 28, adicionalmente ao dump persistente até migration 20. Essa
validação não afirma que a extensão está aplicada no banco persistente.

## Destinos parciais seletivos — manifesto v1.4

O layout e as contagens permanecem iguais. O manifesto v1.4 declara destinos
parciais para o texto legado: datas reais de retorno BZN em
`acompanhamento_cuidado.data_realizada`, ano inequívoco D8 em
`evento_clinico.ano_evento` e negativa inequívoca D3 em
`rastreio_familiar.familiares_examinados`. Os rótulos continuam `parcial` e com
`tipo_semantico = texto`: `sim`, texto ambíguo e afirmativa familiar sem parente/
resultado não viram fatos estruturados por aproximação. O bruto é preservado.

O validador confere esses destinos contra o schema e as migrations incrementais
25/28. A migration 52 ativa captura de novos `ano_evento`; não atribui prova
retroativa a eventos legados. O E2E da versão v1.4 passou junto com 32 testes
unitários em `/tmp/ambulatorio-check-lvoqpa3u/output.log`, cobrindo D3, D8 e
F13. O manifesto não habilita a revisão operacional entre hashes.
