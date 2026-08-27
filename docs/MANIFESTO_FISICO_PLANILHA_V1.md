# Manifesto Físico da Planilha — v1

Atualizado em: 2026-08-24

## Fonte oficial

O artefato executável oficial para a especificação normativa do importador é
`manifestos/planilha_ambulatorio_v1.json`. Ele foi gerado exclusivamente a partir
da linha 1 das duas abas clínicas do arquivo local ignorado
`planejamento/Nova Planilha ambulatório.xlsx`. Nenhuma célula clínica ou linha de
paciente foi lida para compor o manifesto.

A versão explícita é `v1`, identificada tecnicamente como
`planilha_ambulatorio_v1`. Ela descreve apenas o layout observado e não pressupõe
versões históricas inexistentes.

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

Após a reconciliação final, 124 dos 136 rótulos têm cobertura estruturada plena:
8 direta e 116 com transformação. Onze permanecem parciais por lacuna semântica
ou de granularidade comprovada e `Localizado` permanece excluído. Cada parcial
registra no próprio manifesto a razão específica e fica somente no JSONB bruto.

## Exclusões deliberadas

`Localizado` permanece no inventário físico, mas com cobertura `excluido`, sem
tabela ou campo de destino. Seu valor poderá existir apenas no JSONB bruto quando
o futuro importador for autorizado; não será promovido ao estruturado no MVP.

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
regras operacionais, e a futura planilha sintética. Não implementa o importador
nem autoriza dados reais.
