# Diagnóstico e validação do CI — 26/10/2026

Base: `3854a06`, branch local `fix/ci-validacoes`, inicialmente limpa.
Escopo funcional: `.github/workflows/validacoes.yml`. Makefile, runner compacto,
testes, migrations e aplicação não foram alterados.

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

## Limitações e confirmação no PR

A execução completa do workflow corrigido no GitHub permanece pendente.
Backend, frontend, navegador e imagem backend não foram reexecutados nesta
reprodução local: não há alteração desses componentes; suas etapas passaram
nas três execuções remotas analisadas. O runner GitHub deve confirmar também
essas etapas com a nova porta. A instalação em Ubuntu limpo não simula toda a
imagem hospedada nem a disponibilidade futura dos repositórios apt.

Após autorização para commit/push e abertura do PR de `fix/ci-validacoes` para
`main`, acompanhar e localizar a execução de pull request:

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
da etapa correspondente. Sem commit, push, merge ou deploy nesta entrega.
