# Validação da Etapa 6 — fundação do frontend

Data: 2026-10-04. Status: **CONCLUÍDA NO AMBIENTE SINTÉTICO**.

Escopo: 6A (base, sessão e navegação) e 6B (busca/ficha em leitura), conforme
o [roadmap](../PROXIMOS_PASSOS.md#etapa-6--fundação-do-frontend), a
[ADR-024](../DECISOES_ARQUITETURAIS.md#adr-024) e a
[análise de integração](../historico/ANALISE_FIGMA_MAKE_2026_10_03.md).
[FRONTEND.md](../FRONTEND.md) descreve uso, contratos e limites vigentes.

## Ambiente e comandos executados

| Item | Resultado e evidência |
| --- | --- |
| Toolchain | Node 24.15.0, npm 11.16.0; `make frontend-install` (`npm ci`) aprovado, 114 pacotes instalados e auditoria sem vulnerabilidades reportadas. Manifesto e lockfile correspondentes. |
| PostgreSQL | 16.15; servidor exclusivamente sintético em `127.0.0.1:55457`. Novo banco `etapa6_frontend_1611855_1791128345_6b4700`, migrations 02–63 explicitamente aplicadas pelo runner, fora do startup. |
| API/proxy/política | NestJS compilado pelo alvo E2E, API em 6061 e Vite em 4176; proxy `/v1` sem remover prefixo, `vinculo_explicito`, TTL 60 s. Importação/revisão desligadas. |
| `make frontend-check workflow-test COMPACT=1` | Aprovado: TypeScript/Vite, **47 testes frontend em seis arquivos**, **oito E2E** (16,5 s), **nove testes de workflow**. Build do backend compartilhado pelo grafo Make. Log `/tmp/ambulatorio-check-l87rjluh/output.log`. |
| E2E | Resultados e imagens em `/tmp/etapa6-frontend-NRDR9R/`; `results.json` registra oito aprovados, sem falhas, skips ou retries. |
| Revisão manual | Chromium, com API/fixture do runner `--serve`: Início → consulta por teclado, expansão de contrarreferências por Enter, foco, inspeção de desktop/390/320 px e reflow em 683 px. Sem erro de página ou overflow em 320 px. |
| Documentação/diff/status | `make docs-check COMPACT=1` aprovado, log `/tmp/ambulatorio-check-wxpcebe5/output.log`; 129 destinos locais e 20 âncoras verificados sem erros, YAML válido, `git diff --check` e status revisados. |
| CI remota | Configuração revisada, Node 24/lockfiles/Chromium e variáveis sintéticas incorporados. Não executada remotamente nesta entrega. |

O estado final foi validado pelo alvo composto; não se repetiram os seus alvos
individuais depois do sucesso. As repetições intermediárias tiveram mudanças ou
falhas concretas: correção de revogação ao retomar foco, tipagem dos testes e
normalização de parâmetros de paginação. Não houve alteração de backend, SQL,
manifesto/importador ou schema persistente; suas suítes não foram repetidas.

## Matriz de aceite

| ID | Requisito | Evidência executada | Resultado |
| --- | --- | --- | --- |
| F6-01 | Aplicação própria React/TypeScript, toolchain/lockfile e apresentação revisada. | `npm ci`, build TypeScript/Vite e inspeção de imports: sem dependência da referência ou internos do backend. CSS local, sem carregamento externo de fontes. | Aprovado. |
| F6-02 | Login real, `/auth/me`, início e Minha conta. | E2E autentica por formulário/API/PostgreSQL e compara `/auth/me`; identidade básica e atalhos apresentados. Unitário de retorno ao destino. | Aprovado. |
| F6-03 | Saída, 401, expiração/troca limpam sessão/cache; respostas antigas não reaparecem. | Testes de cliente/SessionManager e E2E atrasam respostas reais de busca/exames; saída consulta→edição, relógio local de expiração e 401 real por usuário inativado. Cache e storage verificados. | Aprovado. |
| F6-04 | Links diretos, voltar e recarregar preservam destino e exigem novo login. | E2E abre ficha/detalhe com paginação, recarrega, autentica de novo e volta; busca/página restauradas pelo histórico. Destinos externos/circulares recusados nos unitários. | Aprovado. |
| F6-05 | Busca nome/sexo, ID/nome e filtros/página na URL, sem consultas por linha. | E2E observa requisições, usa filtros reais e confere as colunas; testes de componentes verificam busca/retorno pela URL sem N+1. | Aprovado. |
| F6-06 | Paginação `limit`/`offset`, sem totais inventados nem ausência global inferida. | E2E percorre páginas com >20 pacientes, estado vazio e anterior/próxima. Unitários normalizam parâmetros inválidos via replace, preservando filtros/scopes simultâneos. | Aprovado. |
| F6-07 | Ficha por recurso/aba, histórico e paginação aninhada. | E2E percorre todos os recursos clínicos de leitura da ficha, 21 atendimentos, 23 exames e 11 contrarreferências; detalhe/coleções e páginas independentes. Unitários de snapshots múltiplos. | Aprovado no contrato vigente; limite de familiares abaixo. |
| F6-08 | Três perfis leem só seu escopo; recusa/revogação respeitadas. | E2E consulta/edição/administração, paciente reservado recusado e PUT administrativo revogando vínculo; retomada de foco recebe 403 e oculta a ficha. | Aprovado. |
| F6-09 | Carregamento, vazio, erro, 403/429/503/rede compreensíveis. | Carregamento/vazio/403 reais no E2E; testes de cliente/componentes controlam 429/503/rede e verificam mensagens sanitizadas, foco e remoção do dado anterior em refetch. | Aprovado; falhas controladas identificadas como unitárias. |
| F6-10 | IDs como texto, datas civis, desconhecidos/nulos/NUMERIC e idade por referência. | ID gerado acima de MAX_SAFE_INTEGER via API e exibido sem arredondamento; E2E data/idade/raça legada; formatters cobrem true/false/null, precisão decimal, texto desconhecido e referência da API. | Aprovado. |
| F6-11 | Teclado, foco, contraste, zoom/reflow e telas menores. | Axe WCAG 2/2.1 A/AA sem violações nos cenários auditados; Tab/Enter no login, foco no main e navegação/summary por teclado. Screenshots desktop/390 px/zoom CSS 200%; revisão adicional de 320 px e reflow 683 px. | Aprovado nos cenários executados. |
| F6-12 | Makefile/CI, COMPACT=1, documentação e ausência de dados sensíveis. | Alvo composto aprovado com log privado, nove testes do workflow, revisão de grafo/CI/lockfile/imports e arquivos novos. Apenas dados sintéticos; documentação/registro atualizados. | Aprovado localmente; CI remota não executada. |

## Resultados, correções e limites

A primeira rodada de E2E passou sete cenários e falhou na revogação de vínculo:
`/auth/me` respondia com a mesma identidade e nenhuma consulta clínica era
refeita ao retomar somente foco. `SessionManager.revalidate` passou a invalidar
as consultas clínicas ativas mesmo com identidade inalterada. O teste passou na
rodada corrigida e novamente no estado final pelo Make. A falha intermediária
está em `/tmp/etapa6-frontend-LlmO9Q/results.json`; a rodada corrigida anterior
ao último ajuste de paginação está em `/tmp/etapa6-frontend-wnnLZ9/results.json`.

Os testes E2E usam respostas da API real. Intercepções apenas atrasam respostas
obtidas por `route.fetch()`, sem trocar conteúdo/status. Expiração local usa o
relógio do navegador; 401 do servidor é provocado separadamente por inativação
da identidade. 429/503/rede são testes controlados de cliente/componentes.

A auditoria automatizada e a inspeção visual não equivalem a homologação
institucional nem a cobertura de todas as tecnologias assistivas. O teste de
zoom usa CSS 200%, complementado por revisão de reflow com metade da largura;
não foi automatizado o controle de zoom nativo da interface do Chromium.

A paginação simultânea de coleções/filhos no detalhe segue a API vigente:
avançar o offset pode retirar o rastreio externo antes de alcançar todos os seus
familiares. Não há cursor independente por snapshot; esse limite está em
[FRONTEND.md](../FRONTEND.md#busca-e-ficha). A interface não afirma completude
global nem fabrica dados ausentes. Não foi alterado o contrato nesta fundação.

Banco, login e processos criados pelo runner final foram removidos pelo cleanup;
o ambiente `--serve` da revisão também foi encerrado. Logs/screenshots/traces
permanecem em diretórios privados de `/tmp`, sem dados reais; o arquivo de fixture
é removido após uso. Etapas 7–10, produção, dados reais, commit e push permanecem
fora desta entrega.

O catálogo PostgreSQL confirmou ausência do banco/login finais; portas 6061/4176
ficaram sem listeners. Revisão dos arquivos novos e do bundle não encontrou
credenciais, dados clínicos reais, fixtures de teste ou imports da referência no
artefato executável. O status final contém somente as alterações desta entrega,
mantidas sem commit conforme solicitado.
