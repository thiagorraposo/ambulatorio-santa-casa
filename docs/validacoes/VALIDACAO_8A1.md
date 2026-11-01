# Exportação CSV da página de pacientes — 8A1

Data: 2026-10-31. Base auditada `ff5be94`, branch
`feat/continuidade-m2-condicao`, incremento identificado no histórico como
`feat: exportar CSV da página de pacientes`. Validação sintética; aceite humano
e CI remoto permanecem separados.

## Contrato preservado

A interface consome o H16 existente (`GET /v1/pacientes/export.csv`), sem alterar
backend, SQL ou autorização. Exporta somente ID/nome com nome, sexo, limit e
offset aplicados na URL da busca. Texto ainda não aplicado por Buscar não muda
a exportação. A confirmação informa campos/filtros/limite/deslocamento; cancelar
ou Escape não requisitam e devolvem foco. Não é exportação completa/dashboard.

Consulta, edição e administração mantêm exatamente a política publicada no
H16: os dois primeiros recebem somente pacientes autorizados; administração
segue o escopo já vigente. A menção P-05 no catálogo não é uma nova decisão de
restrição por perfil nesta entrega; exportação ampliada continua dependente de
contrato/decisão própria. Não foi copiado o admin-only do protótipo.

O cliente reutiliza autenticação em memória, validação de geração/cancelamento,
401 e mensagens sanitizadas. Exige MIME CSV e o cabeçalho esperado antes de
criar Blob UTF-8 com BOM e nome fixo `pacientes-pagina.csv`. URL temporária é
revogada; não se usa storage/cache. Não é afirmado que o arquivo foi salvo no
disco: a mensagem informa apenas que foi preparado para download.

Respostas tardias são descartadas após cancelamento, filtros/página diferentes,
consulta indisponível, mudança de sessão ou desmontagem. Repetir confirmação
durante solicitação em curso não cria outro download. Falha não gera Blob nem
sucesso fictício. Uma nova tentativa após erro exige confirmação explícita.

## Ambiente e provas

PostgreSQL 16 exclusivo em tmpfs, container
`ambulatorio-condicao-ui-20261031`, localhost 55461; identidade TCP conferida
`postgres|ambulatorio_ci|5432`, API 6065/web 4180. Runner cria/remove somente
banco e logins aleatórios, migrations 02–66. Dados estritamente sintéticos;
nenhuma base persistente ou planilha real usada.

- Build TypeScript/Vite aprovado. Aviso de bundle acima de 500 KB permanece
  não bloqueante, sem alterar limites.
- Cliente: 18/18 testes; componente CSV: 13/13, incluindo MIME/header inválidos,
  erros 403/503, nenhum texto bruto, cancelamento/duplicação/foco e descarte de
  respostas tardias. A suíte de leitura 12/12 passou também na rodada anterior.
  Comandos focados: `npm --prefix frontend run test:unit -- src/api/client.test.ts src/features/pacientes/PatientCsvExport.test.tsx --maxWorkers=1`.
- Runner `tests/frontend/test_e2e.sh`, seleção de `pacientes-csv.spec.ts`: 4/4 aprovados,
  10 segundos, zero retry/skip; log `/tmp/pacientes-csv-e2e-20261031.log`,
  artefatos `/tmp/etapa6-frontend-yfwUDf/results.json`.
- Três perfis e seis downloads reais: conteúdo CSV igual à resposta HTTP, com
  BOM acrescentado no arquivo UTF-8,
  acentos/aspas preservados, fórmula neutralizada pelo backend existente,
  limit=2 e offsets=0/2. A página posterior inclui o paciente sem vínculo só
  para administração; consulta/edição recebem somente cabeçalho quando vazia.
- Filtros URL versus rascunho de campo, ausência de request ao cancelar/Escape,
  foco devolvido, Axe e 320/390 px passaram. Downloads ficaram apenas em `/tmp`.
- Falha de rede foi provocada na entrega de leitura. Para o caso 403, o teste
  entregou ao pedido CSV uma recusa real obtida da rota de paciente reservado.
  Isso valida reação da interface, não prova que H16 produz 403 por vínculo:
  H16 filtra registros e pode retornar CSV vazio 200. Nenhum download/sucesso
  ocorreu nas falhas. Não houve persistência clínica simulada.

## Limites

CSV cobre somente a página atual e os dois campos publicados. Não inclui total,
origem, indicadores, exportação integral ou nova política de acesso. Download
iniciado pelo navegador não comprova que a pessoa guardou o arquivo. Registros
são temporários e sintéticos; aceite humano e liberação institucional continuam
pendentes. Os caminhos `/tmp` são evidências locais sujeitas à limpeza.

## Regressão conjunta final de 31/10/2026

Sobre a árvore final dos incrementos 7B-E2U.1/8A1 desta sessão, sem alterações
de fonte durante a execução:

```bash
SYNTHETIC_PG_HOST=127.0.0.1 SYNTHETIC_PG_PORT=55461 \
SYNTHETIC_PG_USER=ambulatorio_ci FRONTEND_E2E_API_PORT=6065 \
FRONTEND_E2E_WEB_PORT=4180 make frontend-check COMPACT=1
```

`PGPASSWORD` foi fornecida pelo ambiente sintético, sem valor versionado.
Build aprovado; **252/252 testes de componentes/cliente, 26 arquivos, e 73/73
E2E aprovados**, zero skips/retries/flaky. Navegador: 12,7 minutos. Inclui M2/A1,
condição, CSV e regressões existentes com API/PostgreSQL reais. Log final
`/tmp/ambulatorio-check-x41rsw9c/output.log`; relatório JSON/screenshot em
`/tmp/etapa6-frontend-IKelPH`. O runner removeu seus bancos/logins/fixture.
A árvore não alterou backend, migrations ou lockfiles; não exigiu repetir SQL
ou importador além da preparação sintética do runner. CI remoto e aceite humano
não foram executados por esta prova.

`make docs-check repository-check COMPACT=1` e `git diff --check` passaram.
Destinos locais das fontes documentais afetadas foram conferidos; âncoras e URLs
externas não foram revalidadas integralmente.
