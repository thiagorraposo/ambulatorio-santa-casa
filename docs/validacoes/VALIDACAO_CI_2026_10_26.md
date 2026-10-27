# Diagnóstico e validação do CI — 26/10/2026

Base: `3854a06`, branch local `fix/ci-validacoes`, inicialmente limpa.
Escopo da primeira correção: `.github/workflows/validacoes.yml`. Naquela fase,
Makefile, runner compacto, testes, migrations e aplicação não foram alterados.
O fechamento da missão evolui essa correção conforme a seção seguinte.

## Estabilização por componente

A continuação autorizada preserva o diagnóstico e a primeira correção no commit
`cd60910`, e separa o CI em Quality, Database, Backend e Frontend. A arquitetura,
comandos, versões, manutenção e diagnóstico ficam no
[workflow de desenvolvimento](../WORKFLOW_DE_DESENVOLVIMENTO.md); não são duplicados
neste relatório. Banco/importação usam composição exclusiva com tmpfs; os jobs
SQL verificam destino e armazenamento antes do bootstrap.

A auditoria encontrou duas lacunas estruturais: o comando unitário do backend
descobria suítes clínicas reais e as marcava como ignoradas; o whitespace era
conferido somente no working tree limpo, sem examinar o diff commitado. O mock
HTTP de revisão foi movido, sem alteração de conteúdo, para `test/unit`, e os
comandos agora descobrem diretórios disjuntos: 18 suítes unitárias, 12 clínicas
e uma de integração. `repository-check` valida scripts sem executá-los e também
o diff do PR/push; sete regressões sintéticas cobrem falhas e status. Outra
regressão verifica o diagnóstico interno do frontend, limitado e filtrado,
preservando a falha sem executar SQL. Quality reúne 27 testes aprovados.

As execuções remotas associadas ao PR de `fix/ci-validacoes` e o resumo final da
missão registram o aceite do pipeline e, após merge autorizado pelas regras,
da `main`. A existência deste diagnóstico não substitui esses resultados.

## Evidências remotas e primeira falha

As três execuções foram consultadas com `gh run view ID --json ...` e
`gh run view ID --log-failed`, com acesso autenticado:

| Execução | Evento/base | Resultado comprovado |
| --- | --- | --- |
| [40369782887](https://github.com/thiagorraposo/ambulatorio-santa-casa/actions/runs/40369782887) | Push em `main`, `3854a06` | Falha em `importer-test`: `rg: command not found`, linha 109 do E2E. |
| [40369517682](https://github.com/thiagorraposo/ambulatorio-santa-casa/actions/runs/40369517682) | PR de `etapa7-commits`, head `29b3186` | Mesma falha na linha 109. |
| [37256017821](https://github.com/thiagorraposo/ambulatorio-santa-casa/actions/runs/37256017821) | Push em `main`, `90d4d57` | Mesma falha na linha 109; parte do log é identificada pelo gh como `UNKNOWN STEP`. |

Em todas, o manifesto e os 34 testes de transformação passam. O E2E cria seu
banco sintético, aplica as migrations iniciais e falha ao usar `rg -q` para
verificar uma recusa de finalidade. Ripgrep não foi instalado pelo workflow e
não estava disponível nesses runners. O script termina com 127; o Make interno
retorna 2 e `check_compact.py` preserva esse resultado. O Make externo também
retorna 2. Não há evidência de mascaramento de erro pelo modo compacto.

Os quatro alvos estavam na mesma chamada sequencial. A interrupção em
`importer-test` impediu `docker-project-check` e `workflow-test` de executar.
O check de whitespace seguinte foi pulado pelo Actions. Esses são efeitos da
primeira falha, não falhas independentes dessas verificações.

Backend, integração clínica, frontend e container tinham etapas aprovadas.
Erros de permissão vistos no diagnóstico do PostgreSQL correspondem, entre
outros, às recusas esperadas em
`backend/test/integration/backend.integration.spec.ts` e
`backend/test/clinical/clinical.http.spec.ts`. Esses testes verificam códigos
como `42501`, `23514` e `25P02`; um `ERROR` no log do servidor não demonstra
falha da suíte. Não se atribuiu automaticamente todo registro SQL a um cenário.
Avisos de transação/roles, `punycode` e de runtime Node das actions não impediram
o sucesso das etapas anteriores e não causaram o erro 127.

## Segundo bloqueio, descoberto na reprodução

Com `rg` disponível, o mesmo E2E avançou até
`tests/importador/test_rastreio_familiar.py:60`, que exige `DB_PORT=55457`.
`test_ultimo_comparecimento_ano.py` contém a mesma guarda D8. O workflow
configurava `POSTGRES_PORT`, `APP_DB_PORT` e `SYNTHETIC_PG_PORT` como `5433`.

A falha D3 foi reproduzida integralmente em porta descartável diferente de
`55457`. D3 e D8 também foram chamados isoladamente com `DB_PORT=5433` e
`Database` substituído por mock: ambas as guardas recusaram a configuração
antes de qualquer conexão. Portanto, há um segundo bloqueio demonstrado de
configuração, oculto pela ausência de `rg` nas três execuções remotas. Não se
afirma que essas execuções chegaram a D3/D8.

## Correção preparada

- Instalar `ripgrep` por apt e executar `rg --version` antes dos testes.
- Configurar as três portas do CI como `55457`, preservando as guardas de
  isolamento D3/D8 e a conexão das demais suítes com o servidor efêmero.
- Separar manifesto, importador, projeto/SQL e mecanismo de validação em quatro
  etapas, cada uma com seu resultado e log compacto. A primeira falha continua
  interrompendo as etapas seguintes; não foi usado `continue-on-error`.

O Compose persistente local continua com sua configuração padrão em `5433`.
Não houve flexibilização de expectativas clínicas, de autorização ou de
segurança; nenhuma asserção ou teste foi removido/alterado.

## Ambiente e reprodução local

Cópia temporária do repositório em
`/tmp/ambulatorio-ci-diagnostico-82obc54z/repo`, com `.env` exclusivamente
sintético e privado. Projeto Docker exclusivo `ambulatorio-ci-diag-82obc54z`,
PostgreSQL 16.15, publicação somente no loopback e dados em tmpfs, sem volumes
compartilhados com o projeto persistente. `PGPASSFILE` e `PGSERVICEFILE`
apontaram para `/dev/null`; conexões tiveram host, porta, banco e usuário
explicitamente configurados.

Antes das migrations, o destino foi informado e confirmado por
`SELECT current_database(), session_user, inet_server_port()`:
`ambulatorio_santa_casa|ambulatorio_ci|5432` (porta interna do container).
O primeiro servidor usou a porta externa `37513`; depois de removê-lo, um novo
servidor efêmero usou `55457`. O banco do importador foi
`ambulatorio_santa_casa_importador_test`, criado/removido pelo E2E.
As 65 migrations 00–64 foram aplicadas somente nesses servidores novos.
Nenhuma operação SQL foi dirigida ao PostgreSQL persistente em `5433`.

O Make recebeu `COMPOSE` apontando ao arquivo temporário de serviço com tmpfs,
nome de projeto e `.env` privados. As verificações preservaram os alvos reais:

| Verificação | Resultado |
| --- | --- |
| Quatro alvos com PATH isolado contendo as ferramentas habituais, exceto `rg` | Falha esperada e reproduzida na linha 109: erro 127, Make 2. |
| Mesmo conjunto com `rg`, ainda na porta `37513` | Falha esperada na guarda D3; mostrou o bloqueio seguinte. |
| `apt-get update`, `apt-get install --yes --no-install-recommends ripgrep`, `rg --version` em container Ubuntu 24.04 limpo | Aprovado; ausência inicial de `rg` confirmada e ripgrep 14.1.0 instalado. Comandos executados como root nesse container, sem alterar pacotes do host. |
| `make manifest-check importer-test docker-project-check workflow-test COMPACT=1` em `55457`, com `rg` | Aprovado: manifesto, 34 unitários, E2E completo, 35 arquivos SQL e 19 testes de workflow. |
| `make manifest-check workflow-test`, modo normal | Aprovado; 19 testes, incluindo falhas controladas e filtragem de segredos. |
| actionlint 1.7.12, `-shellcheck=`, sobre o workflow editado | Aprovado; ShellCheck não instalado e sua integração não foi executada. |
| YAML, alinhamento de portas, preservação dos quatro alvos e `bash -n` nos blocos `run` | Aprovados. |
| `make docs-check COMPACT=1`, `git diff --check` e whitespace do relatório novo | Aprovados no repositório de trabalho. |

O conjunto final inclui os cenários D3, D2 concorrente, D8, finalidade,
proveniência, reprocessamento e captura ativa. A suíte de workflow verifica
status 127 para comando ausente, preservação do código de falha pelo runner,
erro 2 do Make em modo normal/compacto e ocultação de segredos sintéticos.
Não foi necessário alterar `scripts/check_compact.py`.

Logs locais ficam em `/tmp/ambulatorio-ci-diagnostico-82obc54z/` e nos diretórios
`/tmp/ambulatorio-check-*` indicados pelos resumos. Logs remotos consultados
ficam em `/tmp/ambulatorio-actions-ID.log`. São artefatos temporários, sem
garantia de retenção; não foram versionados. O servidor exclusivo foi removido
ao concluir a validação.

## Limitações da primeira fase e confirmação remota

A primeira fase não executou o workflow corrigido no GitHub nem reexecutou
backend/frontend/container localmente. Essas limitações motivaram a continuação
integral da missão; não são aprovação desses componentes. A instalação em Ubuntu
limpo não simula toda a imagem hospedada nem a disponibilidade futura dos
repositórios apt. A validação remota deve conferir todos os componentes.

Na continuação, commit/push, PR e merge condicionado aos checks e regras foram
autorizados. Para acompanhar e localizar a execução de pull request:

```bash
gh pr checks fix/ci-validacoes --watch
gh run list --workflow validacoes.yml --branch fix/ci-validacoes --event pull_request --limit 5
gh run view ID_DA_EXECUCAO --json conclusion,jobs
gh run view ID_DA_EXECUCAO --log-failed
```

Substituir `ID_DA_EXECUCAO` pelo ID do resultado referente ao commit do PR.
Aceite remoto: instalação/verificação de ripgrep e todas as etapas aprovadas,
incluindo os quatro alvos separados, backend, frontend, container e whitespace.
Qualquer falha deve manter o job vermelho e ser investigada pelo primeiro erro
da etapa correspondente. Não há autorização para deploy nesta missão.

## Estabilização complementar: verificação do UID no container

A execução na `main` após o merge inicial, `40382446360`, concluiu com sucesso
nos quatro jobs. Na revisão final, um stub reproduziu um falso sucesso local:
quando `docker compose exec ... id -u` retornava erro 37 e stdout vazio, o teste
`[ "" != "0" ]` aceitava o container. O alvo agora preserva o status do exec e
rejeita UID vazio ou não numérico. A regressão exercita os casos de UID 1000,
UID 0, vazio, texto e erro 37 nos modos normal e compacto, sem Docker real nem
comandos SQL. `make workflow-test repository-check COMPACT=1` passou com 30
testes; `git diff --check` passou. O PR complementar [#9](https://github.com/thiagorraposo/ambulatorio-santa-casa/pull/9)
teve Quality, Database e Backend aprovados na execução
[40406296603](https://github.com/thiagorraposo/ambulatorio-santa-casa/actions/runs/40406296603).
Frontend falhou em `writing.test.tsx:107`: o teste verificava a chamada clínica
antes de terminar a preparação assíncrona (hash e registro da intenção). O campo
já estava bloqueado, e a chamada ainda não havia sido despachada. `waitFor` agora
sincroniza a mesma expectativa de exatamente uma chamada, sem alterar seu valor
ou relaxar a proteção contra reenvio. A suíte frontend local passou com 21
arquivos e 202 testes; workflow-test passou 30 e repository-check passou. O aviso
do Vitest sobre custo de criação de jsdom é de desempenho e não bloqueia o job.
O E2E que falhou passou quatro vezes em execução isolada no servidor descartável
confirmado; o CI expirou no limite de espera HTTP configurado em 10 s. A espera
do helper foi ajustada para 30 s, permanecendo limitada e exigindo a resposta e
o status esperados. Isso não repete nem oculta a escrita; se ela não ocorrer, o
teste continua falhando.
A nova execução remota, revisão do PR, merge e CI subsequente de `main` ainda
estavam pendentes na redação acima. A execução
[40408685735](https://github.com/thiagorraposo/ambulatorio-santa-casa/actions/runs/40408685735)
do commit `9824fce` concluiu com sucesso nos quatro jobs: Quality, Database,
Backend e Frontend. Cada etapa de teste passou; somente os uploads condicionais
de logs em falha foram ignorados por não haver falhas. O PR #9 está limpo e foi
revisado quanto ao escopo: sete arquivos diretamente ligados ao CI, sem mudanças
de aplicação ou migrations. O merge e a execução da versão integrada na `main`
continuam pendentes.

## Continuidade de 27/10 — limpeza de processos no teste de workflow

Após integrar A1 pelo PR #15, Quality falhou na execução
[`40444653135`](https://github.com/thiagorraposo/ambulatorio-santa-casa/actions/runs/40444653135),
em `test_cleanup_finds_orphan_after_runner_killed`: o `finally` verificava uma
identidade de processo e depois enviava `SIGKILL` por PID, recebendo
`ProcessLookupError`. O processo pode terminar entre a verificação e o sinal;
essa exceção também pode encobrir a asserção original. A hipótese de identidade
nula durante o início não foi comprovada: 100 repetições locais do teste antigo
passaram, portanto não se declara reprodução natural da falha remota.

O teste agora recebe prontidão do próprio filho, exige identidade não nula e
abre um `pidfd` antes de encerrar o runner. O término do filho é comprovado pelo
handle e a limpeza final usa esse mesmo handle, aceitando somente o caso de
processo já encerrado. As asserções de término e identidade são preservadas;
nenhum script de produção, teste clínico ou expectativa foi desativado.

`make workflow-test COMPACT=1` passou 30/30, o teste focado corrigido passou
100 repetições e `git diff --check` passou. Todos usam processos sintéticos,
sem Docker, SQL ou dados clínicos. A publicação e o CI da correção ainda precisam
ser conferidos antes de considerar a `main` estabilizada.
