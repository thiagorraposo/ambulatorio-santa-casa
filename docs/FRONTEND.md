# Frontend — leitura e fluxos clínicos

Atualizado em: 2026-10-17. Fundação 6A–6B concluída; recorte original 7A–7D
implementado e validado tecnicamente com dados sintéticos, com 41 cenários de
navegador verificados após os incrementos U3.1/U3.2.
As evidências e seus limites pertencem ao relatório da entrega.
Aceite integral, revisão com a equipe e VU1
não são declarados aqui.

A aplicação própria está em [`frontend/`](../frontend/). Consome os contratos
públicos `/v1` do backend, com React/TypeScript, Vite, roteamento e consultas por
recurso. O [roadmap](PROXIMOS_PASSOS.md#pacotes-verificáveis-do-produto-frontend) define o
escopo e os critérios de aceite; os relatórios da
[Etapa 6](validacoes/VALIDACAO_ETAPA_6.md) e da
[Etapa 7](validacoes/VALIDACAO_ETAPA_7.md) registram evidências e limites,
com escopo limitado aos cenários executados. O estágio
vigente está em
[ESTADO_ATUAL_DO_PROJETO.md](ESTADO_ATUAL_DO_PROJETO.md).

Este documento descreve setup e comportamento existente. A experiência
pretendida está na [visão de produto](frontend/VISAO_E_ESPECIFICACAO.md);
a [matriz Figma/frontend](frontend/MATRIZ_FIGMA_FRONTEND.md) inventaria campos,
ações e destinos, e os [pacotes do roadmap](PROXIMOS_PASSOS.md#pacotes-verificáveis-do-produto-frontend)
definem dependências e aceite. Proposta não é contrato publicado.

## Preparação e comandos

Use Node.js 24 e npm. As dependências são fixadas por `frontend/package-lock.json`.
Instale novamente quando esse lockfile mudar. Nenhum segredo de banco, JWT ou
importação deve entrar no bundle ou em variáveis públicas do navegador.

```bash
make backend-install frontend-install
cd frontend && npx playwright install chromium
```

O Chromium é necessário para E2E. No CI, `--with-deps` instala também as
bibliotecas do sistema. Para desenvolvimento, prepare uma API com schema
compatível e dados exclusivamente sintéticos, em ambiente descartável, e então:

```bash
FRONTEND_API_TARGET=http://127.0.0.1:3000 make frontend-dev
```

`FRONTEND_API_TARGET` é configuração do servidor Vite, com padrão
`http://127.0.0.1:3000`; o cliente continua usando `/v1` na mesma origem.
O proxy preserva o prefixo e encaminha as requisições à API. O frontend e o
backend não aplicam migrations no startup. O ambiente persistente com migrations
00–20 é distinto dos incrementos da Etapa 5 e não deve ser usado implicitamente
para esta validação.

| Comando | Finalidade |
| --- | --- |
| `make frontend-install` | Instalar pelo lockfile com `npm ci`. |
| `make frontend-dev` | Servir a aplicação e encaminhar `/v1` pelo proxy. |
| `make frontend-build COMPACT=1` | Verificar TypeScript e gerar `frontend/dist/`. |
| `make frontend-unit-test COMPACT=1` | Executar testes de sessão, contratos e apresentação. |
| `make frontend-e2e COMPACT=1` | Compilar backend e testar navegador/API/PostgreSQL sintéticos. |
| `make frontend-check COMPACT=1` | Combinar build, unitários e E2E do frontend. |

O runner [`tests/frontend/test_e2e.sh`](../tests/frontend/test_e2e.sh) recebe
`SYNTHETIC_PG_HOST`, `SYNTHETIC_PG_PORT`, `SYNTHETIC_PG_USER` e `PGPASSWORD` pelo
ambiente, todos obrigatórios. O usuário deve poder criar banco e login de teste.
Ele cria seu banco e roles de teste, aplica as
migrations 02–64 apenas nesse banco, inicia API/Vite e encerra os recursos que
criou.
Não lê `.env` para selecionar o banco de teste. Não exige build do frontend para
servir Vite; o build de produção é verificado separadamente por `frontend-check`.
Logs e artefatos de navegador ficam em `/tmp`, fora do repositório.

As portas padrão do E2E são 6061 (API) e 4176 (Vite); podem ser escolhidas com
`FRONTEND_E2E_API_PORT` e `FRONTEND_E2E_WEB_PORT`. O runner recusa portas ocupadas,
sem reaproveitar outro serviço. Para revisar manualmente a interface com a mesma
fixture, depois de instalar dependências e executar `make backend-build`, use
`bash tests/frontend/test_e2e.sh --serve` com as variáveis sintéticas configuradas.
O runner mantém os serviços ativos até a interrupção e informa os acessos
exclusivamente sintéticos; o encerramento remove seu banco e login de teste.
A sessão desse modo dura 15 minutos para permitir a revisão dos formulários;
nos testes automáticos ela continua durando 60 segundos. O
[roteiro clínico](validacoes/ROTEIRO_REVISAO_CLINICA_ETAPA_7.md) orienta as tarefas
e o registro do parecer da equipe.

Em mudanças mistas, combine os alvos numa chamada para compartilhar dependências:

```bash
make backend-check backend-clinical-test frontend-check COMPACT=1
```

Essa combinação exige o ambiente das verificações do backend além das variáveis
do runner sintético. Consulte a
[matriz de validação](WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional).
`project-check` cobre documentação, SQL, diff e status; não substitui testes do
frontend.

## Demonstração sintética isolada

`make dev-sintetico-start` cria um PostgreSQL 16.15 exclusivo e inicia o runner
`test_e2e.sh --serve`, com migrations e fixture sintéticas. Requer Python 3.9+
em Linux com suporte a pidfd, Docker, Node.js 24, clientes PostgreSQL e build preparados
por `make backend-install frontend-install backend-build`. O Chromium só é
necessário para testes automatizados, não para servir a aplicação.

O frontend fica em `http://127.0.0.1:4177`, a API em
`http://127.0.0.1:6062/v1` e o PostgreSQL em `127.0.0.1:55458`.
Os usuários são `frontend-consulta@example.invalid`,
`frontend-edicao@example.invalid` e `frontend-administracao@example.invalid`,
todos com a senha exclusivamente sintética `Etapa6-sintetica!`.
Cada sessão de login dura 15 minutos; novo login permite continuar a revisão.

`make dev-sintetico-status` verifica o supervisor e a disponibilidade HTTP;
`make dev-sintetico-stop` encerra o runner e o container que pertencem à
demonstração. O banco usa armazenamento temporário e é descartado ao encerrar;
um novo start recria a fixture. O estado e os logs ficam em diretório privado
em `/tmp`, indicado pelos comandos. O script não lê `.env`, não usa volumes
persistentes e recusa portas ocupadas. Reiniciar não incorpora alterações de
backend sem executar antes `make backend-build`.
O supervisor verifica a identidade dos processos e limpa seus descendentes
marcados mesmo após morte abrupta do runner, usando pidfd para evitar sinalizar
um PID reaproveitado. Se o próprio supervisor for morto abruptamente, execute
`stop` para limpar os recursos antes de um novo `start`.

Para portas alternativas, use diretamente `python3 scripts/dev_sintetico.py start
--pg-port 55459 --api-port 6064 --web-port 4178`. As operações `status` e `stop`
consultam o estado salvo, sem precisar repetir as portas.

## Organização

| Área | Responsabilidade |
| --- | --- |
| `src/app/` | Composição de rotas, layout e sessão em memória. |
| `src/api/` | Cliente HTTP, tipos públicos e consultas canceláveis por recurso. |
| `src/features/pacientes/` | Busca, ficha e detalhe/histórico dos atendimentos. |
| `src/features/clinical/` | Cadastro, atendimento composto e operações de acompanhamento. |
| `src/shared/` | Componentes e formatação de apresentação, sem regras clínicas. |

React monta a interface; React Router representa a navegação na URL; TanStack
Query mantém consultas do servidor por recurso; Vite serve o proxy e compila o
bundle; Vitest testa os contratos e a sessão; Playwright testa a interface no
Chromium. As versões efetivamente instaladas pertencem ao manifesto/lockfile.
CSS próprio incorpora a apresentação revisada; não há necessidade de adotar
todas as dependências do protótipo para a fundação de leitura.

Referências técnicas: [Vite](https://vite.dev/guide/),
[React Router](https://reactrouter.com/start/declarative/installation),
[cancelamento de consultas](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)
e [Playwright](https://playwright.dev/docs/intro). `npm run preview` serve o build
estático; o proxy `/v1` desta fundação pertence ao servidor de desenvolvimento.
A implantação posterior precisa servir assets e API pela mesma origem.

## Sessão e navegação

A ficha mantém nascimento, ID e idade com referência no cabeçalho. O painel
“Último atendimento por data registrada” lê apenas a primeira posição do
histórico ordenado, independentemente da paginação cadastral. Data desconhecida
é apresentada explicitamente, sem afirmar cronologia. Contexto, prontuário e
observação pertencem à consulta indicada; nenhum resumo clínico é inferido.
A [validação U3.1](validacoes/VALIDACAO_7D_U3_1.md) delimita essa unidade.

As abas Chagas e Avaliação clínica exigem escolha explícita da consulta.
`atendimentoId` na URL preserva a seleção entre abas e navegação; as opções
usam `consultaLimit/consultaOffset`, sem trocar a consulta ao paginar. O painel
indica data/ID da fonte e mostra somente seus dados, inclusive ausências, sem
buscar valores de outra visita. Diagnóstico e avaliação reutilizam os mesmos
painéis do detalhe. ID inválido não gera leitura de detalhe; 403/404 das opções
ocultam a consulta anterior. Critérios, provas e limites estão na
[validação U3.2](validacoes/VALIDACAO_7D_U3_2.md).

A sessão usa o token retornado pelo login somente em memória. A identidade e o
perfil são obtidos de `/v1/auth/me`; nenhum dado de paciente fica em armazenamento
persistente do navegador. Recarregar exige novo login e preserva o destino da
navegação, incluindo paciente, aba, filtros e página. Início oferece atalhos, e
Minha conta mostra a identidade retornada pela API.

| Rota | Uso |
| --- | --- |
| `/login` | Autenticação e retorno ao destino protegido. |
| `/` | Início com atalhos. |
| `/pacientes` | Busca; nome, sexo, limit e offset na query string. |
| `/pacientes/novo` | Busca prévia e cadastro conforme política do servidor. |
| `/pacientes/:pacienteId/editar` | Cadastro com versão original e alterações parciais. |
| `/pacientes/:pacienteId/atendimentos/novo` | Atendimento e filhos aceitos numa transação. |
| `/pacientes/:pacienteId/atendimentos/:atendimentoId/editar` | Edição versionada dos dados básicos. |
| `/pacientes/:pacienteId/registrar?tipo=...` | Salvamento independente por módulo clínico. |
| `/pacientes/:pacienteId?aba=...` | Ficha com aba representada na URL. |
| `/pacientes/:pacienteId/atendimentos/:atendimentoId` | Detalhe de atendimento e coleções paginadas por limit/offset. |
| `/minha-conta` | Identidade e perfil obtidos da API. |

Sessão, cache de consultas e estado local de filtros têm responsabilidades
separadas. Saída, expiração, 401 e troca de identidade invalidam a sessão,
cancelam leituras pendentes e limpam o cache clínico. Respostas iniciadas sob uma
identidade antiga não podem repovoar os dados da sessão seguinte. Na retomada por
foco/visibilidade, o frontend revalida a identidade e os recursos clínicos ativos,
inclusive quando a identidade não mudou: o vínculo pode ter sido revogado.

O perfil influencia a apresentação; autorização de paciente/recurso permanece
na API. Os perfis `consulta`, `edicao` e `administracao` usam a mesma interface de
leitura e recebem somente os dados autorizados pelo servidor. Não existe CRUD
administrativo de usuários ou descoberta pública de vínculos nesta etapa.

## Busca e ficha

A busca usa os filtros nome/sexo e `limit`/`offset` na URL. A listagem apresenta
ID e nome disponíveis no contrato, sem consultas individuais para completar
colunas de cada paciente. Ficha, histórico de atendimentos e recursos aninhados
são carregados por aba/recurso, sem varredura de todos os dados clínicos.

Coleções ordinárias aceitam `limit` de 1 a 100 e `offset` de 0 a 100000. A API não
retorna total: a interface informa os itens da página, anterior/próxima e estado
vazio. Uma página vazia não comprova inexistência de resultados em outras páginas.
Filtros de uma busca nova reiniciam o offset; voltar e avançar no navegador
restauram a consulta representada pela URL.
Parâmetros de paginação fornecidos fora das faixas válidas são normalizados na
URL com substituição da entrada de histórico, preservando filtros e páginas
válidas de outros recursos. Parâmetros ausentes usam os defaults 20/0.

Paginação aninhada segue `paginacaoColecoes` e os parâmetros do contrato de cada
recurso. Familiares têm consultas independentes: a lista de rastreios usa
`/atendimentos/:atendimentoId/rastreios-familiares`, e cada página de filhos usa
`/:rastreioFamiliarId/familiares` sob essa rota. No endereço do detalhe,
`familiaresLimit`/`familiaresOffset` paginam snapshots;
`familiares<rastreioFamiliarId>Limit`/`familiares<rastreioFamiliarId>Offset`
paginam seus resultados. Exames e pendências conservam seus parâmetros.
Voltar, avançar e reabrir o endereço restauram as páginas; mudar página move o
foco ao bloco atualizado. Falha de leitura permite nova consulta, sem apresentar
a página anterior como atual ou afirmar ausência de familiares. O
[contrato de familiares](arquitetura/CONTRATO_FAMILIARES_ETAPA_7.md) descreve os
IDs e a prévia de até 20 resultados por snapshot no detalhe compatível.

IDs PostgreSQL permanecem texto, inclusive acima de `Number.MAX_SAFE_INTEGER`.
Datas clínicas são apresentadas como datas civis, sem conversão que desloque o
dia pelo fuso. Idade usa o valor e a referência retornados pela API. Valores
desconhecidos e nulos não recebem interpretação clínica inventada; a apresentação
mantém a distinção definida pelos contratos.

## Escrita clínica e rascunhos

O [recorte clínico da Etapa 7](arquitetura/RECORTE_CLINICO_ETAPA_7.md) é a fonte
dos destinos de campos, preservação e pendências HTTP. A ficha oferece ações de
escrita a edição/administração; o servidor decide também política de cadastro e
vínculo de escrita. O perfil consulta mantém somente leitura, inclusive ao abrir
diretamente uma rota de edição. Não há descoberta pública de todas as capacidades
por vínculo; um perfil de edição não garante cadastro em qualquer política.
`GET /v1/pacientes/capacidades` informa somente `podeCadastrar`, segundo a mesma
política revalidada no POST. Cadastro e seu formulário só aparecem após essa
confirmação; carga/falha não concede capacidade implicitamente.

Os tipos de `/registrar` são `bzn`, `retorno-bzn`, `projeto`, `notificacao`,
`encaminhamento`, `contrarreferencia`, `retorno-anual`, `ocorrencia-anual` e
`pendencia`. O atendimento do contexto pode ser levado em `atendimentoId`;
`projetoId`, `encaminhamentoId` e `pendenciaId` selecionam registros existentes.
Seletores paginam opções da API; IDs continuam texto e não são hardcoded.
Atalhos do detalhe e entre acompanhamentos preservam paciente, atendimento e
origem de retorno. A seleção de outra consulta é explícita; o contexto de uma
consulta é validado no recurso do paciente antes de mostrar o formulário.
`retorno` preserva o endereço de origem e `origemAtendimentoId` separa a origem
da consulta escolhida para a operação.

Criação do atendimento envia medidas, diagnóstico/descoberta, exames,
familiares e pendências junto com o núcleo. BZN/reações, retornos, projetos,
notificação, encaminhamentos, contrarreferências e pendências posteriores usam
operações com confirmação própria. PATCH do núcleo não edita filhos. Paciente
e atendimento conservam a versão obtida antes da edição; reconsulta por foco
não rebasa o rascunho nem permite sobrescrever uma versão concorrente.

`DraftProvider`/`useClinicalDraft` mantêm valores, baseline e intenção de envio
somente em memória, com assinatura para propagar o resultado mesmo se houver
remontagem durante uma consulta. O escopo dos rascunhos é separado da geração
de requisições: cancelar uma leitura por falha temporária de identidade não
apaga alterações válidas. Formulários ficam ocultos/desabilitados durante a
revalidação, preservando o bloqueio de navegação e retirando dados antigos da tela.

React Router usa data router para bloquear navegação com alterações pendentes;
o diálogo permite continuar ou sair mantendo rascunho nesta sessão.
`beforeunload` protege saída/recarregamento, cuja perda de memória é informada.
Essa proteção inclui rascunhos de outros módulos ou seleções mantidos na sessão.
O diálogo usa portal para continuar acessível quando reconsultas ocultam o
formulário.
Saída, 401, expiração e troca de identidade/perfil limpam cache e rascunhos.

`MutationForm` registra uma UUID com método, caminho e hash SHA-256 do corpo em
`POST /v1/operacoes`; em seguida envia a escrita uma vez com `X-Operacao-Id`.
O protocolo cobre as 14 mutações de cadastro, atendimento e acompanhamento
enumeradas no [contrato de recuperação](arquitetura/RECUPERACAO_OPERACOES_ETAPA_7.md).
O recibo mínimo de IDs/versão é confirmado na mesma transação da clínica e seus
filhos. Rede, resposta inválida, 5xx ou cancelamento após envio clínico mantêm a
intenção bloqueada. Verificar consulta `GET /v1/operacoes/:operacaoId`; encerrar
usa `POST /v1/operacoes/:operacaoId/encerrar`. Nenhuma ação reaplica a clínica.
Resultado confirmado reconcilia o recibo; em curso, indeterminável ou falha de
consulta conservam o bloqueio. Prova de não aplicação permite revisar e confirmar
outra intenção. Página vazia ou valor coincidente não provam o resultado.

403/409 não produzem sucesso. Após 403, revalidar acesso faz somente leitura e
libera revisão; nova confirmação revalida a escrita no servidor. Após 409
cadastral ou do núcleo de atendimento, o usuário pode comparar versões e
descartar somente esse rascunho antes de outra edição. Conflito BZN mantém o
canônico e todos os campos/reações do rascunho para comparação, cópia e descarte
explícito; não oferece correção por criação duplicada. Nenhum PATCH é reenviado
automaticamente. Confirmação exige ID canônico textual e, na edição, o ID original.

Recibos e valores confirmados permanecem em memória ao navegar e após falha
temporária de identidade na mesma sessão. Outro episódio exige ação explícita;
recibos anteriores continuam disponíveis. Logout, 401, expiração e troca de
identidade/perfil limpam esses dados. Recarregar perde a memória local: a API
permite verificar uma UUID conhecida pela mesma identidade autorizada, mas a
interface não persiste nem redescobre automaticamente as intenções de outra sessão.

Os dois formulários de criação de pendência distinguem desconhecido (`null`),
`nao_informado` e `aberta`; resolução exige data explícita. PATCH atual exige
status string e não permite retornar a `null`. Essa evolução, as etapas/revisão
do atendimento e outros pacotes de UX permanecem propostas no roadmap; não são
declarados implementados pela correção de recuperação.

## Apresentação e erros

A identidade visual, a organização do layout e as abas da ficha foram
revisadas a partir do
[protótipo Figma Make](../referencias/frontend/figma-make-prototipo/). Os componentes
e CSS da aplicação ficam em `frontend/`, sem importar a referência no build.
O protótipo não fornece persistência, autorização, identidade ou regras clínicas.

Carregamento, vazio e erro são estados distintos. 401 leva à reautenticação; 403
explica a recusa de acesso, 429 informa limite temporário, 503 informa serviço
indisponível, e falha de rede em leitura permite tentar novamente. Conteúdo clínico de uma
resposta anterior não deve permanecer visível enquanto uma nova consulta falha.
Navegação deve funcionar por links diretos, teclado, foco visível e telas menores.
Separadores dos breadcrumbs são traços desenhados em CSS, sem texto que altere
o nome acessível dos links.

Importação/revisão, métricas, fila global e gestão de usuários permanecem fora
destes formulários. As lacunas clínicas específicas estão no recorte; produção
e uso de dados reais dependem das Etapas 9–10.
