# Validação técnica parcial de 7D-U4.2 — controles compartilhados

Data: 2026-10-26. Implementação e validação técnica aprovadas no recorte
descrito; comparação visual integral, revisão humana e aceite de produto/equipe
continuam pendentes.

## Alterações

Os contêineres compartilhados de tabela receberam nome acessível e foco por
teclado, permitindo acessar tabelas que precisam de rolagem horizontal. A tabela
larga do histórico tem largura mínima própria e não força a página a exceder a
largura da tela; palavras normais deixam de ser quebradas arbitrariamente em
colunas estreitas. As demais tabelas continuam podendo rolar em seu próprio
contêiner. Data e link do atendimento permanecem inteiros em uma linha. Não
foram alterados contratos ou dados.

## Evidências executadas

- `cd frontend && npm run build` — passou (TypeScript e Vite).
- `cd frontend && npm run test:unit` — 22 arquivos, 205 testes passaram.
- `tests/frontend/test_e2e.sh --grep '7D-U4.2: etapas|7D-U3.3: consulta percorre'` —
  2 cenários passaram em PostgreSQL descartável. O cenário novo testa Axe,
  navegação/foco das etapas, cancelamento com Escape e retorno do foco; valida
  ausência de overflow da página em 320/390 px e zoom 200%. O cenário U3.3
  consulta testa que a tabela de histórico em 320 px é região nomeada/focável,
  rola com ArrowRight e mantém a página dentro da viewport.
- `make docs-check COMPACT=1`, `make repository-check COMPACT=1` e
  `git diff --check` — aprovados na revisão documental após a alteração inicial.

O runner criou banco e login aleatórios descartáveis, aplicou migrations apenas
nesse banco e os removeu. O destino SQL foi confirmado como
`postgres|ambulatorio_ci|5432` dentro de container recém-criado, publicado em
`55459`. Nenhuma base persistente foi usada.

## Limites

A evidência não representa uma revisão visual humana comparativa de todas as
tabelas, mensagens e formulários nem uma auditoria visual integral em zoom.
U4.1 documenta uma limitação anterior de legibilidade do histórico em telas
estreitas; a primeira captura ainda mostrou a data quebrada, então a primeira e
a segunda coluna passaram a impedir essa quebra e a regressão verificou o
contrato visual de `white-space`. A recaptura mostrou data e link íntegros e a
rolagem permanece por teclado, mas a aceitação da composição visual ainda exige
revisão. O novo cenário U4.2 e as regressões de tabela passaram nos quatro jobs
do PR #14 (run `40440449766`), e a execução pós-merge na `main` também passou
(run `40442523647`).

## Continuidade de 27/10 — remoção de itens por teclado

A revisão encontrou perda de foco ao remover o último item e reutilização do
botão ativo pelo item seguinte nas coleções indexadas. Um segundo Enter podia
remover outro rascunho. A regressão do formulário de atendimento reproduziu o
problema antes da correção. Exames, familiares, pendências, novos telefones e
reações agora devolvem foco ao botão Adicionar da própria coleção após a
atualização do DOM, inclusive quando esse botão estava desabilitado pelo limite.

Build e 206 testes de componentes passaram. O E2E novo passou em 320 px,
preservando valores distintos, removendo o último item, atingindo o limite de
dez telefones e verificando que outro Enter adiciona em vez de apagar o próximo
item. Axe e ausência de overflow passaram; nenhuma escrita clínica foi enviada
pelo navegador. A primeira execução parou por tentar um link indisponível na
página de edição; o teste foi corrigido para navegar pela ficha e passou em
`/tmp/etapa6-frontend-G7uuCC`. O cenário anterior de etapas/diálogo também passou
na execução inicial. CI remoto desta continuidade ainda pendente.

Destino confirmado antes do SQL: `postgres|ambulatorio_ci|5432` no container
`ambulatorio-m2-focus-20261027`, PostgreSQL 16.15 em tmpfs publicado em 55459.
O runner criou e removeu seus bancos/logins aleatórios; dados somente sintéticos.
Comparação visual integral e aceite humano continuam pendentes.
