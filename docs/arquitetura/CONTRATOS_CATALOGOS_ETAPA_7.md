# Catálogos HTTP da Etapa 7

Este documento define as consultas públicas de catálogo necessárias aos
formulários das Etapas 7B–7C. Complementa a
[matriz de integração](../historico/ANALISE_FIGMA_MAKE_2026_10_03.md) e os
[contratos clínicos](CONTRATOS_CLINICOS_ETAPA_5.md). O schema físico permanece o
registrado em [schema aplicado](../evidencias/schema_atual_ambulatorio.sql);
nenhuma migration é necessária para essas consultas.

## Rotas e representação

| Rota | Fonte existente | Uso do `id` na escrita clínica |
| --- | --- | --- |
| `GET /v1/catalogos/exames` | `tipo_exame_complementar` | `tipoExameId` na criação transacional de atendimento |
| `GET /v1/catalogos/projetos` | `projeto_estudo` | `projetoId` na associação por paciente |
| `GET /v1/catalogos/tipos-encaminhamento` | `tipo_encaminhamento` | `tipoEncaminhamentoId` na criação de encaminhamento |

As três rotas respondem `200` com um array de objetos no mesmo formato:

```json
[
  {
    "id": "9007199254740993",
    "codigo": "exemplo_sintetico",
    "nome": "Opção sintética",
    "ativo": true
  }
]
```

O identificador é uma string decimal, inclusive acima do limite de precisão de
`number` no JavaScript. `codigo` e `nome` vêm do catálogo; não são nomes ou IDs
fabricados pelo cliente. Somente itens ativos são retornados. Descrições,
categorias, timestamps e metadados internos não integram a resposta.

## Autorização, paginação e falhas

Exigem Bearer token válido e identidade ativa, verificados pelos guards globais
em cada requisição. `consulta`, `edicao` e `administracao` podem ler os três
catálogos. São catálogos globais de referência: leitura não exige vínculo a um
paciente e não autoriza acesso ou escrita em recurso clínico. As operações de
escrita continuam verificando perfil, vínculo e atividade do tipo selecionado
no servidor, mesmo que o catálogo tenha sido lido antes.

Parâmetros aceitos: `limit` inteiro entre 1 e 100, padrão 20; `offset` inteiro
entre 0 e 100000, padrão 0. A ordem é nome crescente, com desempate pelo ID
numérico crescente. A paginação ocorre depois do filtro de ativos. Não há total
ou envelope de paginação; página sem itens responde `[]`. O cliente deve carregar
as páginas necessárias para os selects e tratar ausência ou falha de catálogo
sem recorrer a IDs fixos.

Parâmetros desconhecidos, incluindo `ativo`, e paginação inválida produzem `400`.
Ausência de token, token inválido/expirado ou identidade inativa produzem `401`;
perfil não autorizado produz `403`. Indisponibilidade produz `503` sanitizado,
sem texto SQL ou credenciais. Não há criação, edição ou inativação de catálogos
por essas rotas.

## Evidência de validação

`backend/test/unit/catalogos.service.spec.ts` verifica representação explícita,
IDs textuais, filtro de ativos, ordem e parâmetros das consultas.
`backend/test/unit/catalogos.http.spec.ts` verifica guards, três perfis,
validação de query, resposta vazia e falha sanitizada com banco simulado.
`backend/test/clinical/catalogos.http.spec.ts` verifica o contrato HTTP contra
PostgreSQL descartável, com itens sintéticos ativos/inativos, IDs acima da
precisão de JavaScript, desempate, paginação e revogação de identidade.

A integração compõe `make backend-clinical-test COMPACT=1` e exige as variáveis
sintéticas previstas no [workflow](../WORKFLOW_DE_DESENVOLVIMENTO.md).
Unitários não substituem essa evidência de integração.
