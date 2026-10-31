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
na execução inicial. O resultado remoto final está registrado abaixo.

Destino confirmado antes do SQL: `postgres|ambulatorio_ci|5432` no container
`ambulatorio-m2-focus-20261027`, PostgreSQL 16.15 em tmpfs publicado em 55459.
O runner criou e removeu seus bancos/logins aleatórios; dados somente sintéticos.
Comparação visual integral e aceite humano continuam pendentes.

O CI do PR #16 (`40446523662`) passou build/componentes e 54/55 E2E, incluindo
o novo cenário de remoção. O cenário existente de troca BZN → retorno anual
expirou esperando a resposta do POST em `submitWrite`. Três repetições locais
passaram (`/tmp/etapa6-frontend-s1MTh5`); a causa desse episódio remoto não foi
comprovada. O helper agora exige validade HTML antes de confirmar e, em falha,
registra somente labels inválidos, estado ocupado e método/caminho/status das
últimas respostas. Não registra valores, headers ou corpos, não reenvia e mantém
o timeout/status esperado. A suíte local completa passou 55/55 sem retry/skip
(`make frontend-e2e COMPACT=1`, log `/tmp/ambulatorio-check-qditye4y/output.log`,
artefatos `/tmp/etapa6-frontend-iVL1Sw`); Quality, Database, Backend e Frontend
passaram no run final `40448281960`. O PR #16 foi integrado em `a2dbd30`.
Essa instrumentação não é declarada correção de causa raiz do timeout.

## Comparação executada em 31/10/2026

Base: `ff5be94`, branch `feat/continuidade-m2-condicao`, com o teste novo
`tests/frontend/m2-visual.spec.ts`. Sem alteração de CSS/contratos nesta unidade.
**Estado: validada tecnicamente no recorte de controles compartilhados abaixo;
revisão humana e aceite continuam pendentes.** Não conclui 8V1/8V2.

A referência original `referencias/frontend/figma-make-prototipo` foi copiada
para `/tmp/ambulatorio-m2-reference-HqCa0h`, instalada com
`pnpm install --frozen-lockfile --ignore-scripts` e executada com
`FIGMA_DEV_SERVER_HOST=127.0.0.1 PORT=8445 pnpm dev`. Nenhum arquivo da referência
versionada foi modificado. Chromium headless, locale pt-BR e fuso
America/Sao_Paulo; fontes HTTPS da referência bloqueadas para evitar dependência
externa, usando fallback local. O protótipo usa exclusivamente sua fixture
sintética local; não é prova de persistência.

Na referência: login de demonstração → Pacientes → Paciente Sintético 001 →
Novo atendimento; preencher a data, abrir a seção 12 e Revisar dados. Na aplicação:
login real → atendimento de pessoa sintética criada pela API → controles de
cancelamento → ficha/histórico → busca, carga e falha de transporte. Os dados
e módulos disponíveis diferem; a comparação é de controles/hierarquia e não de
valores clínicos ou equivalência das doze seções com as cinco etapas aprovadas.

| Tela/controle | Referência executada | Aplicação com API/PostgreSQL sintéticos |
| --- | --- | --- |
| Atendimento desktop 1440×960 | [Original](../frontend/visuais/m2-referencia-atendimento-1440.png) | [Atual](../frontend/visuais/m2-atendimento-1440.png) |
| Atendimento 390×844 | [Original](../frontend/visuais/m2-referencia-atendimento-390.png) | [Atual](../frontend/visuais/m2-atendimento-390.png) |
| Revisão/modal e foco | [Revisão original em 390 px](../frontend/visuais/m2-referencia-revisao-390.png) | [Diálogo de rascunho em 320 px](../frontend/visuais/m2-dialogo-320.png); são intenções diferentes, comparação restrita a legibilidade/composição do contêiner |
| Tabela/erro atuais | Referência tem linhas acionadas por clique e modal sem semântica de diálogo | [Histórico rolado em 320 px](../frontend/visuais/m2-historico-320.png), [erro sanitizado em 390 px](../frontend/visuais/m2-erro-390.png) |

### Diferenças verificadas e disposição

Severidade: alta impede operar/interpretar; média dificulta tarefa; baixa é
diferença visual sem impedir operação no recorte exercitado.

| Requisito | Diferença e severidade | Disposição |
| --- | --- | --- |
| RQ-EST-07 / RQ-ATD-15 | Referência mantém sidebar de 224 px e formulário cortado/sobreposto em 320/390 px; alta se reproduzida no produto. Aplicação recolhe menu e mantém formulário em uma coluna. | Adaptação preservada; não copiar corte da referência. |
| RQ-EST-02, 07, 09 | Aplicação tem fontes/controles maiores e fieldsets aninhados, ocupando mais altura; baixa. Campos permanecem legíveis, nomeados e alcançáveis. | Diferença registrada para 8V1 e avaliação humana; não reduzir legibilidade para igualar densidade. |
| RQ-EST-04 / RQ-LIS-12 | Tabela atual usa links explícitos, cabeçalhos e região focável com rolagem local; referência depende de clique na linha. | Adaptação acessível preservada. Captura do histórico mostra deslocamento horizontal exercitado, não corte da página. |
| RQ-EST-05 | Protótipo usa sobreposição sem `role=dialog`/Escape/contenção; diálogo atual tem nome, foco inicial, Escape e devolução ao acionador. | Adaptação preservada; teclado verificado, sem novo modal contratual. |
| RQ-EST-01, 03, 06 / RQ-ERR-03, 05 | Estados atuais usam texto e resultado de rede; não copiam timer/toast de sucesso do protótipo. | Carga real atrasada e conexão abortada somente na leitura; sem sucesso/persistência simulados. |

Não foi encontrado desvio impeditivo de implementação nos controles examinados.
As diferenças de densidade permanecem explícitas; não se declara fidelidade
integral de todas as telas, módulos futuros, estados de contraste do sistema
operacional, leitores de tela ou equivalência pixel a pixel.

### Execuções e limites

Servidor exclusivo `ambulatorio-m2-audit-20261031`, PostgreSQL 16 com tmpfs,
porta localhost 55459, API 6063 e web 4178. Inspeção Docker confirmou tmpfs e
publicação; `SELECT current_database(), current_user, inet_server_port()` por
socket confirmou `postgres|ambulatorio_ci|NULL` (NULL esperado em socket).
O runner criou/removeu somente bancos/logins aleatórios e aplicou 02–66 neles.

- `bash tests/frontend/test_e2e.sh --grep '7D-U4.2: evidências'`: **1/1 passou**,
  8,1 s, zero retry/skip; artefatos `/tmp/etapa6-frontend-riJ1nL`, log
  `/tmp/ambulatorio-m2-validation-visual.log`. Testa Axe WCAG A/AA, formulário e
  diálogo em 320/390/1440 px, formulário com zoom CSS 200% em 1280 px, tabela
  rolável por ArrowRight, foco/Enter/Escape e ausência de escrita clínica pela UI.
  Capturas adicionais de login/carga/zoom ficam nos artefatos.
- Cenário existente `7D-U4.2: etapas`: **1/1 passou**, 4,7 s, artefatos
  `/tmp/etapa6-frontend-cH2XuS`; cobre etapa seguinte/anterior e diálogo em zoom.
- Na rodada inicial, remoção de coleções, A1, confirmação única e percurso de
  histórico U3.3 passaram. O teste novo falhou por `page.goto` apagar a sessão
  em memória; corrigido para links e decisão de rascunho. Segunda tentativa
  encontrou seletor ambíguo de dois estados de carga legítimos; corrigido no teste.
- A primeira tentativa do cenário antigo U4.2 foi interrompida por reload HMR
  de `App.tsx` durante alterações paralelas de M3, registrado no frontend.log;
  repetição sem alterações de fonte passou. Não foi atribuído defeito ao produto.

Para reproduzir, usar as variáveis do [runner](../../tests/frontend/README.md)
com servidor descartável e o comando focado acima. Reutilizar os resultados A1
descritos no [relatório próprio](VALIDACAO_7D_A1.md), sem repetir suíte integral
sobre o mesmo estado. Zoom CSS é a técnica automatizada existente e não substitui
a revisão humana com zoom nativo do navegador.
