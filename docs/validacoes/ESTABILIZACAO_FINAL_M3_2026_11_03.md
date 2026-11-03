# Estabilização final M3 — experiência integrada dos três perfis

03/11/2026. Branch `feat/m3-janela-1-eventos`; entrada `e17257d`, working tree
limpa, sem alterações posteriores à referência informada. Objetivo: Início
operacional distinto da análise, tarefas reais por perfil, filtros/CSV autorizados
e navegação contínua, preservando confirmação coordenada e importações.
Escopo encerrado na menor unidade integrada pelo comando posterior do responsável.
Sem homologação humana ou conclusão de M3/8V1/8V2.

## Entrega e permissões

- Início dá boas-vindas, busca real e tarefas específicas: Consulta lê fichas,
  históricos/lotes e analisa/exporta; Edição acrescenta cadastro autorizado,
  edição/atendimento e simulação; Administração acrescenta gestão de contas.
- Dashboard concentra quatro indicadores PostgreSQL, filtros por período, nome,
  ID, sexo, participação em projeto e pendência, ordenação/página na URL, remoção
  individual/geral, série mensal/tabela equivalente e resultados navegáveis.
  Atividade recente é a ordem por data do atendimento; não simula fila ou eventos
  de criação. Lotes continuam exigindo capacidade nominal, além de escopo próprio.
- CSV exporta todos os atendimentos filtrados e ordenados até5.000; excesso é erro
  explícito sem arquivo parcial. Reutiliza neutralização/quoting existentes e gera
  auditoria imutável SQL79. [Contrato](../arquitetura/CONTRATO_DASHBOARD_8B1.md#extensão-de-estabilização--filtros-série-e-csv-em-03112026).
- Retorno validado de Pacientes/Dashboard atravessa ficha, edição, cancelamento e
  confirmação; rejeita destinos externos. Rascunhos, recuperação, recibos,
  integridade clínica, RBAC e proveniência não foram substituídos.

## Validação executada e limites

Ambiente exclusivo PostgreSQL16 Docker tmpfs em127.0.0.1:55469, rotulado
`br.ambulatorio.sprint-final=sintetico`; runners criam bancos/logins exclusivos e
os removem ao encerrar. Não houve banco persistente, dump, push, merge ou deploy.

- Builds backend/frontend aprovados. Frontend integral **369/369**,43arquivos:
  `/tmp/m3-final-frontend-validation.log` → `/tmp/ambulatorio-check-ktfbytr_/output.log`.
- Backend integral unitário **236/236**,25suítes:
  `/tmp/m3-final-backend-unit.log` → `/tmp/ambulatorio-check-ywpvfstx/output.log`.
- HTTP/PostgreSQL clínico integral **193/193**,27suítes:
  `/tmp/m3-final-full-clinical.log` → `/tmp/ambulatorio-check-uwlzun5j/output.log`.
  Inclui11cenários dashboard/CSV, filtros/RBAC, limite5001, auditoria e revogação.
- `project-check` com02–79 em banco limpo exclusivo: **50/50scriptsSQL**, docs,
  diff/status aprovados: `/tmp/m3-final-project.log` →
  `/tmp/ambulatorio-check-oozez_08/output.log`. Dump persistente não atualizado.
- E2E focado inicial9/9, real Chromium/API/PostgreSQL:
  `/tmp/m3-final-focused-e2e.log` → `/tmp/etapa6-frontend-uDNWI9/results.json`.
  Backend recebeu depois apenas correção de cabeçalho em erro de CSV; não chamar
  essa rodada de prova única da versão final.
- Regressão final selecionada: **33cenários distintos aprovados por composição**,
  não uma suíte integral E2E única. Rodada de33teve32aprovados/1seletor ambíguo:
  `/tmp/m3-final-regression-e2e.log` → `/tmp/etapa6-frontend-o4ke2u/results.json`.
  Após corrigir somente o seletor do teste, Dashboard+Importações **5/5**:
  `/tmp/m3-final-import-regression.log` → `/tmp/etapa6-frontend-FC3K9P/results.json`.
  Cobertura: três perfis, filtros/CSV além da página, cadastro Edição, fluxo único
  e12seções/revisão/confirmação, resposta perdida/concorrência/rollback,
  importação simulada e lotes, navegação/erros e gestão administrativa de usuários.
- [12capturas por perfil em1440/390](../evidencias/estabilizacao_final_m3_2026_11_03/README.md),
  inspecionadas contra referência oficial; Axe/viewport aprovados no ensaio.
  Os três perfis usam login real, navegação/CSV/recusas reais, sem interceptar
  resultados clínicos. Falha de transporte do cenário de erro é controlada e
  identificada; não simula dados de sucesso.

Ambiente de demonstração reiniciado com build/backend e migrations79 alinhados,
`http://127.0.0.1:4177` (API6062, PostgreSQL tmpfs55458), sessão15min. Smoke
adicional com navegador real nos três perfis aprovou login → Início → Dashboard,
período fevereiro2026 e download de21atendimentos em cada perfil.
[Resultado sem segredos](../evidencias/estabilizacao_final_m3_2026_11_03/ensaio_ambiente_servido.json).
O primeiro start aguardou a remoção do container sintético anterior; stop/start
repetido resolveu, sem modificar serviço/banco persistente.

Falhas intermediárias registradas: unidade frontend de recuperação teve timeout
na primeira integral (353 passaram/1 timeout); reexecução dirigida passou e a
integral final passou. Dois testes novos usavam opção `exact` não suportada pela
tipagem Testing Library; removida antes do build final. HTTP detectou Content-Type
CSV em erro de volume; cabeçalhos agora são aplicados só ao sucesso, com erro400
JSON comprovado. Preparação SQL inicialmente rejeitou nome de banco sem marcador
sintético; repetida em banco `sprint_final_test_project_*`, aprovado. A regressão composta também encontrou seletor ambíguo no teste de importações:
com um lote adicional válido criado pelo teste de Dashboard, “Consultar” apontava
para duas linhas. O teste passou a selecionar o lote sintético correto, sem mudar
a aplicação; reexecução Dashboard+Importações5/5 aprovou o cenário conjunto.
Não se
apresentam essas tentativas como execuções integrais aprovadas.

## Ensaio reproduzível e contingência

Código demonstrável **`ad876010b65c5576899416fbec30932db5ed7a65`**, após API `4188d40` e UI `ad87601`.
As validações acima rodaram no diff depois commitado nesses SHAs; a última correção
foi somente seletor E2E, validado na composição indicada. Commit posterior somente
documental registra esta evidência e o checkpoint, sem alterar o código servido.
Contingência preservada: `e17257d`, branch local `demo/m3-contingencia-e17257d`,
com as limitações/provas anteriores do dashboard básico. Não foi apagada, resetada
ou substituída; para usá-la criar checkout isolado e seu ambiente descartável,
sem sobrepor este candidato. Novo candidato: `demo/m3-estabilizado-ad87601`.

Comando da regressão selecionada, com `SYNTHETIC_PG_*`/`PGPASSWORD` apontando
exclusivamente ao servidor descartável:

```bash
make frontend-build frontend-unit-test COMPACT=1
bash tests/frontend/test_e2e.sh final-stabilization.spec.ts dashboard.spec.ts shell-navigation.spec.ts attendance-unified.spec.ts cadastro-edicao.spec.ts importacoes.spec.ts importacao-simulacao.spec.ts usuarios.spec.ts
# Reexecução conjunta após corrigir o seletor do teste de importações:
bash tests/frontend/test_e2e.sh dashboard.spec.ts importacoes.spec.ts
```

Não substituir os resultados compostos acima por alegação de execução integral
única; suíte E2E global não foi executada nesta entrega.

1. Na versão demonstrável, executar `make backend-build` e iniciar o ambiente
   descartável com `make dev-sintetico-start`; verificar `make dev-sintetico-status`.
   Para trocar código de backend, parar/iniciar **somente esse ambiente sintético**.
   O guia [Frontend](../FRONTEND.md#demonstração-sintética-isolada) contém setup e
   acessos exclusivamente sintéticos; não usar `.env`/banco clínico como destino.
2. Entrar como Administração, Edição e Consulta, separadamente. Mostrar tarefas
   do Início, buscar `Pessoa`, abrir ficha e histórico. Nos perfis de escrita,
   cadastrar pessoa sintética após busca prévia, editar cadastro, iniciar atendimento,
   percorrer12seções, revisar, confirmar uma vez e abrir registro/histórico.
   Consulta não oferece escrita; tentativa direta deve recusar.
3. Abrir Dashboard pelo menu: escolher período da fixture (`2026-02-01` a
   `2026-02-28`, ajustar à data do atendimento mostrado se necessário), combinar
   filtros por pessoa/projeto/status disponíveis, ordenar e paginar. Comparar
   indicador de atendimentos com tabela/série; limpar filtro individual e geral.
4. Exportar CSV, revisar o escopo e confirmar download. Com `limit=1` na URL,
   exportar todas as linhas filtradas, não só a visível. Abrir atendimento/ficha
   e retornar à análise preservada. Mostrar “Sem permissão” em lotes quando faltar
   capacidade; isso não equivale a zero nem impede consulta de lotes legados.
5. Administração abre Usuários; Edição/Administração simulam planilha sintética;
   Consulta lê importações autorizadas. Conferir1440px/390px e menu compacto.
   Não anunciar como disponível fila global, origem sem contrato ou anexos.

A fixture do ensaio automatizado acrescenta população exclusiva identificada por
`EnsaioFinal...`: pessoa feminina com nome começando `=1+1`, projeto registrado,
dois atendimentos13/14de março2004, pendências abertas; outra pessoa sem vínculo.
Administração encontra3linhas, Edição/Consulta2, com CSV neutralizado e acesso
oculto recusado. Scripts/fixtures são sintéticos e descartáveis. Esse ensaio
exercita os percursos descritos, sem equivaler a aceite humano integral.

Pendências relevantes: origem e timeline unificada sem semântica aprovada;
fila global e partes residuais dos módulos de M3; revisão humana de todos os
achados e aceite M3/8V1/8V2. Exportação tem limite5000, resultados representam
atendimentos realizados; não é exportação clínica completa nem exportação de lotes.
