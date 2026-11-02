# Regressão composta do frontend M3 — 02/11/2026

Base funcional `55f82b5` mais ensaio/isolamento E2E de `e1fe8f0`.
A rodada integral descobriu quatro falhas, resolvidas e validadas em checkout
isolado antes de aplicar a mesma correção à branch da entrega. Não foi
anunciada uma rodada integral101/101 que não ocorreu.

## Rodada integral e causas

`make frontend-e2e COMPACT=1`, log
`/tmp/ambulatorio-check-0nbhcx_o/output.log`, runner
`/tmp/etapa6-frontend-0gp2Pn`: **97 aprovados e4 falhas em21,6min**,101 casos.
PostgreSQL16.15 tmpfs exclusivo localhost55457, migrations02–73, banco/logins
aleatórios removidos pelo runner. Nenhum acesso persistente ou dados reais.

- Dois cenários AVC: regressão real em `AttendancePage.tsx`. A inclusão de
  dispositivos em `0f7edec` substituiu o link longitudinal de AVC em vez de
  acrescentar um link. Rotas/API AVC continuavam existentes. Foi restaurada
  somente a linha do link, preservando dispositivos, óbito e retorno exato.
- Fixture de demonstração e ensaio M3: os25 tipos sintéticos adicionados por
  `comorbidades.spec.ts` deslocam hipertensao_arterial à segunda página do
  catálogo. O roteiro só procurava a primeira página. O helper agora navega
  pela paginação real e espera a resposta/intervalo de itens antes da seleção.
  Não exclui categorias, cria alias ou altera ordenação para tornar o teste verde.

O teste de leitura confere coexistência dos três links longitudinais e destinos,
com ID grande, query e hash da consulta de origem. Nenhum evento AVC passou a
pertencer ao atendimento: esse vínculo continua longitudinal por paciente.

## Correções validadas em isolamento

Checkout `/tmp/ambulatorio-m3-correcoes-20261102`, base `191016f` mais cinco
arquivos corrigidos. Dependências locais reutilizadas; código/testes mantidos
separados dos arquivos que a rodada integral ainda estava servindo.

- Build backend aprovado; primeiro build frontend identificou uso de `exact`
  indevido na opção RTL do teste novo. Opção removida conforme sua API; nenhum
  comportamento de produto alterado por esse ajuste.
- Build frontend final aprovado: `/tmp/ambulatorio-check-eu5i_cap/output.log`.
- Arquivo de leitura **12/12 unidades** aprovado:
  `/tmp/m3-correcoes-reading-unit.log`.
- **5/5 E2E dirigidos**,18,8s, `/tmp/m3-correcoes-direcionadas-e2e.log`, runner
  `/tmp/etapa6-frontend-jSSDfc`: os quatro casos falhos mais um caso anterior de
  catálogo paginado que prepara as25 categorias e prova o contexto composto.
  AVC com rascunho/teclado/recibos, catálogo e ensaio M3 passaram. Sem retry/skip.

A correção foi aplicada à raiz somente depois de terminar a rodada integral.
Comparação SHA256 de **245 arquivos versionados de código/testes** entre raiz e
checkout isolado confirmou igualdade, incluindo todos os arquivos alterados;
as diferenças de commits entre as bases eram somente documentais. Assim, não
foi necessário repetir os97 cenários aprovados por adicionar um único link e
corrigir helpers do roteiro. Cobertura composta dos101 casos; não uma nova
rodada101/101 sobre o mesmo SHA.

## Demais gates e limites

`make frontend-build frontend-unit-test COMPACT=1` passou com **284/284 unidades**,
35 arquivos, em `/tmp/ambulatorio-check-rsj4x13x/output.log`, antes da restauração
do link. As12 unidades de leitura afetadas foram repetidas depois; demais
código unitário e comportamento não receberam mudança relevante.
Backend197 unidades/26 HTTP do relatório e importador38 unidades/pipeline
integral permanecem comprovados em seus relatórios; SQL44/upgrade72→73 da
baseline preservados. Não repetidos backend/SQL completos por alterações
finais de navegação/testes. Logs `/tmp` são voláteis.

O ensaio foi repetido com catálogo composto e passou; sua
[prova inicial](VALIDACAO_DEMONSTRACAO_M3_2026_11_02.md) continua preservada.
Prontidão técnica do candidato limitada aos recortes implementados e ao
percurso sintético. Datas/status do exame, escrita de medicamentos, sequências
do dry-run, recuperação de confirmação da importação e P-03–09 ainda impedem
M3 integral. Não houve CI remoto, aceite humano, push, merge ou deploy.
