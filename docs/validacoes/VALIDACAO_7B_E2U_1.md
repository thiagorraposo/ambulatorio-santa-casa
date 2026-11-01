# Interface da condição por atendimento — 7B-E2U.1

Data: 2026-10-31. Base: `ff5be94b605932c2d0ccc8841a54b1e3bc3a635b`, branch
`feat/continuidade-m2-condicao`. Recorte RQ-CON-01–06 sobre o
[contrato existente](../arquitetura/CONTRATO_CONDICAO_CHAGAS_7B_E2B_1.md).
O commit de implementação é identificável no histórico pelo título
`feat: registrar e consultar condição de Chagas pela interface`.
Não é aceite clínico nem conclusão de 7B-E2U/M3.

## Escopo e ambiente

Ficha na aba Chagas e detalhe do atendimento abrem a condição da consulta
selecionada; retorno conserva seleção e paginação. GET distingue registro
ausente de seis campos explicitamente desconhecidos. Formulário, revisão e
recibo usam as seis propriedades existentes, sem limpar descrição ao mudar
sintomas, derivar diagnóstico ou acrescentar sintomas estruturados.

Uma confirmação cria somente a condição, separada da gravação do núcleo do
atendimento. Campos vazios enviam null; espaços e quebras de linha são literais;
Não e Não informado são distintos de desconhecido. A API preserva a unicidade,
autorização e auditoria existentes, sem nova migration. Edição/remoção não foram
habilitadas. O formulário direto de nova condição continua sujeito ao 409 do
servidor quando já existe um registro; nunca sobrescreve o original.

PostgreSQL 16 exclusivamente sintético em tmpfs, container
`ambulatorio-condicao-ui-20261031`, porta local 55461. Identidade TCP conferida
como `postgres|ambulatorio_ci|5432`; API 6065 e frontend 4180. O runner cria
banco/login próprios aleatórios, aplica migrations 02–66 e remove somente seus
recursos ao finalizar. Nenhuma base persistente ou arquivo real participou. O runner selecionou o
destino por `SYNTHETIC_PG_*`, sem usar `.env` para escolher o banco. As fixtures e todos os registros são sintéticos.

## Validação focada

- Build TypeScript/Vite aprovado; aviso de bundle acima de 500 KB permanece
  não bloqueante, sem alteração do limite.
- Oito testes de componentes aprovados com
  `npm --prefix frontend run test:unit -- src/features/condicao/condicao.test.tsx --maxWorkers=1`.
  Transporte simulado nesses testes não é evidência de persistência.
- Cinco E2E em `tests/frontend/condicao-chagas.spec.ts` sobre UI/API/PostgreSQL
  reais: seis campos e correção isolada; false/null/nao_informado; duas consultas
  isoladas e diagnóstico inalterado; perfil consulta sem escrita; leitura com
  falha ocultando dados anteriores; resposta perdida após COMMIT com UUID e um
  POST; 403 real e revalidação; 409 concorrente preservando o original/rascunho.
- Rascunho conserva valores ao navegar; descarte exige confirmação; Escape
  devolve foco. Revisão contém seis termos; dois cliques confirmam uma vez.
  Axe WCAG A/AA, teclado, 320/390 px e zoom CSS de 200% passaram no cenário
  principal. Zoom CSS é a aproximação automatizada do runner, não certificação
  manual de todas as combinações de navegador/dispositivo.

Primeira rodada: 4/5, artefatos `/tmp/etapa6-frontend-d3rRkh`, log
`/tmp/condicao-ui-e2e-20261031.log`. O cenário 403 falhou porque o seletor do
teste alcançava simultaneamente textarea oculto e revisão; corrigido somente o
seletor, escopando a região, passou 1/1 em `/tmp/etapa6-frontend-l2MuLJ`.
O cenário principal foi ampliado para conferir seleção/página da ficha e
retorno; passou 1/1 em `/tmp/etapa6-frontend-9Ox2mu`. Sem alteração de código
funcional entre essas rodadas.

IDs emitidos na primeira rodada: paciente `9007199254833926`, atendimentos
`22/23`, condição `1`. Recuperação: paciente `9007199254833928`, atendimento
`25`, condição `3`, UUID `c7353888-88a7-46d1-9795-edba3d0ffa17`.
Logs/capturas temporários podem desaparecer; não contêm evidência de dados reais.

## Limites e continuidade

CON-07–10/11 continuam pendentes de contrato HTTP/auditoria/recuperação para a
tabela de complicações existente. D1–D12 não aprovam novos tipos clínicos ou
publicação HTTP. Os sintomas específicos sem destino aprovado permanecem
bloqueados; não foram convertidos em texto ou flags por conveniência.
Recibos/rascunhos mantêm os limites de sessão existentes, sem garantia geral de
idempotência entre sessões. Revisão temporal, edição/remoção, comparação visual
integral, aceite humano, CI remoto e liberação para dados reais são separados.

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
