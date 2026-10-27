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
contêiner. Não foram alterados contratos ou dados.

## Evidências executadas

- `cd frontend && npm run build` — passou (TypeScript e Vite).
- `cd frontend && npm run test:unit` — 22 arquivos, 205 testes passaram.
- `tests/frontend/test_e2e.sh --grep '7D-U4.2: etapas|7D-U3.3: consulta percorre'` —
  2 cenários passaram em PostgreSQL descartável. O cenário novo testa Axe,
  navegação/foco das etapas, cancelamento com Escape e retorno do foco; valida
  ausência de overflow da página em 320/390 px e zoom 200%. O cenário U3.3
  consulta testa que a tabela de histórico em 320 px é região nomeada/focável,
  rola com ArrowRight e mantém a página dentro da viewport.
- `git diff --check` e checks documentais — validar após finalizar esta unidade.

O runner criou banco e login aleatórios descartáveis, aplicou migrations apenas
nesse banco e os removeu. O destino SQL foi confirmado como
`postgres|ambulatorio_ci|5432` dentro de container recém-criado, publicado em
`55459`. Nenhuma base persistente foi usada.

## Limites

A evidência não representa uma revisão visual humana comparativa de todas as
tabelas, mensagens e formulários nem uma auditoria visual integral em zoom.
U4.1 documenta uma limitação anterior de legibilidade do histórico em telas
estreitas; esta alteração trata a quebra arbitrária e oferece rolagem por
teclado, mas a aceitação da composição visual ainda exige revisão. O novo
cenário U4.2 e as regressões de tabela também precisam passar no CI remoto da
branch que os contém.
