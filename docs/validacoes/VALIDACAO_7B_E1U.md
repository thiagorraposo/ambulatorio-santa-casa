# Sorologias individuais pela interface — 7B-E1U

Data: 2026-10-27. Implementação sintética em continuidade à API
[7B-E1B](../arquitetura/CONTRATO_SOROLOGIAS_7B_E1B.md).
Não constitui aceite clínico, comparação visual integral ou liberação real.

## Escopo

No detalhe do atendimento, o acesso às sorologias abre lista paginada própria.
O registro usa sete campos independentes, revisão antes da confirmação, recibo
e releitura. Métodos repetidos permanecem episódios distintos. Ausência de
resultado não equivale a “não informado”; as datas não atualizam descoberta,
diagnóstico ou resultado final da consulta.

Rascunhos e recibos permanecem na sessão conforme o mecanismo compartilhado.
Sair da página preserva o rascunho após escolha consciente; descarte exige
confirmação e só existe antes do envio. Operação incerta exige consulta da
intenção, sem reenvio automático. O perfil consulta somente lê; o servidor
continua revalidando vínculo/permissão de escrita.

## Validação

Build TypeScript/Vite aprovado. Nove testes focados de componentes aprovados;
na suíte completa, 228/228 passaram com `npm --prefix frontend run test:unit --
--maxWorkers=2` (log `/tmp/ambulatorio-check-j_j4m3kl/output.log`).

A primeira execução local de `make frontend-check COMPACT=1` passou no build,
mas quatro testes antigos falharam, incluindo dois timeouts de 5 segundos, sob
concorrência padrão e carga local elevada. A mesma suíte, sem mudança de código,
timeouts ou expectativas, passou com dois workers. Isso evidencia sensibilidade
local ao paralelismo/carga, sem provar uma causa única; a rodada original está
preservada em `/tmp/ambulatorio-check-yfnopz6n/output.log`. O aviso Vite de
bundle de 503,84 KB é não bloqueante; o limite não foi alterado.

A revisão cruzada de contrato, autorização, recibos e descarte não encontrou
bloqueios concretos. A primeira rodada completa de navegador terminou com 62/63 aprovados e zero ignorados.
Na primeira rodada, três cenários novos passaram. O quarto parou antes da
revisão porque o seletor exato do teste ignorava a seta decorativa no nome do
link “← Voltar aos episódios”. O snapshot comprovou a presença do link e dos
valores; corrigido somente o seletor, preservando o comportamento esperado e a
asserção de navegação. A repetição integral desse cenário em banco novo passou (1/1). Não houve
mudança no código da aplicação entre as rodadas.

| Evidência | Resultado e localização |
| --- | --- |
| Regressão completa, incluindo três cenários novos | 62/63; somente seletor acima falhou; `/tmp/ambulatorio-check-w9zy348o/output.log`, `/tmp/etapa6-frontend-aW83DJ/results.json`. |
| Sete campos, correção, dois episódios e rascunho/descarte | 1/1 após correção do seletor; `/tmp/ambulatorio-check-j9qvhrr0/output.log`, `/tmp/etapa6-frontend-MZ7tyV/results.json`. |
| IDs sintéticos do cenário corrigido | Paciente `9007199254797109`, atendimento `22`, sorologias `1` e `2`; métodos iguais, datas independentes e diagnóstico original preservado. |
| Resposta perdida após COMMIT | Paciente `9007199254785783`, atendimento `34`, sorologia `23`, intenção `ab3bdb87-c06d-44f1-85d4-7f98d37c320f`; recibo consultado sem segundo POST. |

Os quatro cenários novos cobrem sete campos na revisão/payload/releitura,
repetição de método, null versus não informado, paginação 20/1, erro sem dados
antigos, consulta somente leitura, 403 real, recuperação por UUID e ausência de
duplicação. Teclado, Escape, retorno de foco, 320/390 px, zoom 200% e Axe foram
exercitados. Os 59 cenários anteriores passaram na rodada completa.
Logs diagnósticos também contêm aviso React preexistente de `key` por spread em
FollowupPage; ele não foi a causa da falha nem foi ocultado.
Servidor exclusivo: projeto Docker `ambulatorio-sorologias-ui`, PostgreSQL 16
em tmpfs, `127.0.0.1:55457`. Identidade confirmada antes do bootstrap:
`ambulatorio_santa_casa|ambulatorio_ci|5432`. O runner E2E cria seu próprio banco
aleatório, aplica 02–65 e remove banco/logins no final. Nenhum SQL na base
persistente; todos os dados são sintéticos.

## Limites e continuidade

Solicitação geral (RQ-DIA-15–18), alteração/remoção de episódios persistidos e
revisão temporal continuam fora deste contrato. RQ-DIA-20 trata somente do
rascunho, sem habilitar DELETE. Aceite de produto/equipe e fidelidade visual
integral continuam pendentes. Os resultados remotos ficam no
[histórico da branch](https://github.com/thiagorraposo/ambulatorio-santa-casa/actions?query=branch%3Afeat%2Fsorologias-interface).
Integração exige os quatro jobs aprovados; resultados locais proporcionais não
substituem essa aprovação.
