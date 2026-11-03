# AVC longitudinal — recorte de 7B-E4B

Data: 2026-11-01. Janela 1, base 7842d82, branch feat/m3-janela-1-eventos.
[Contrato](../arquitetura/CONTRATO_EVENTOS_7B_E4B.md). Recorte implementado e validado tecnicamente;
E4B agregado e aceite humano permanecem separados.

## Ambiente e provas

PostgreSQL16.15 novo `ambulatorio-m3-j1-20261101`, tmpfs em localhost55457,
identidade postgres|ambulatorio_ci|5432 e armazenamento confirmados antes SQL00.
SQL00–69 em banco próprio; rodada corrigida em m3_j1_pos_correcao. HTTP/upgrade
criam/removem suas bases, sem dados reais, migration ou acesso ao persistente.

- Build e 183 unidades passaram: `/tmp/ambulatorio-check-31949s6v/output.log`.
- Oito HTTP novos passaram: `/tmp/m3-j1-avc-http-focado.log`. Triestado, ano
  independente, formatos0/9999, literal vazio, pacientes bigint, repetição,
  paginação20/1, tipos isolados, duas intenções concorrentes, autorização/revogação,
  UUID/replay e rollback de registro/captura/recibo; erros sanitizados.
- SQL39 anteriores passaram após correção da migration; novoSQL41 passou na
  rodada focada. Total40 na composição39+1, sem alegar nova execução integral
  de40. Logs `/tmp/m3-j1-avc-sql-importer-corrigido.log` e
  `/tmp/ambulatorio-check-sg0do8mu/output.log`.
- Upgrade68→69 preservou registro legado, marco/história de ano_evento, ACLs
  tabela/seq, funções e gatilhos; sem backfill dos novos campos. Primeira
  mudança posterior preserva marco_atual.
- Importador completo e31 testes de workflow passaram na mesma rodada. Efeitos
  de captura ampliada sobre D8/proveniência foram exercitados, sem reduzir as
  expectativas das suítes existentes.

## Falhas e ajustes preservados

SQL69 inicial revogava UPDATE da aplicação e quebrou SQL28 D8. Removidas as
alterações de privilégios: a migration final preserva integralmente as ACLs
preexistentes, e o upgrade compara antes/depois. Nenhum teste anterior alterado.
Uma fixture nova de guard anual esperava só NOT NULL, mas o guard vigente
levantou no_data_found por falta de plano. SQL41 passou a aceitar as duas
recusas pertinentes, mantendo a falha se o novo guard bloquear ano_evento;
regressões anuais completas existentes também passaram.

A API não publica PATCH/PUT/DELETE nem altera a semântica de D8. SQL69 não
reescreve gatilhos/captura/resolver; ativa quatro campos prospectivamente e
bloqueia somente sua revisão temporal. Outros tipos de evento são capturados,
mas não aparecem na lista de AVC. Ano sozinho não infere ocorrência.

Fundação 8/8 e suíte clínica completa 110/110 (17 suítes) passaram na versão
final de SQL69, sem ignorados, via `make -o docker-wait backend-foundation-e2e
backend-clinical-test COMPACT=1`, com DB_*/APP_DB_* explícitos em 127.0.0.1:55457,
base m3_j1_pos_correcao, role ambulatorio_aplicacao e login/JWT sintéticos.
Log `/tmp/ambulatorio-check-py78zzpn/output.log`. Docker-wait foi marcado como
atendido apenas após conferir o servidor exclusivo. Servidor descartável
encerrado no checkpoint. Nenhum serviço persistente foi iniciado/modificado.

Reprodução: provisionar PostgreSQL16.15 descartável confirmado, SQL00–69 e login
limitado via alvo existente; executar os alvos acima com DB_*/APP_DB_* explícitos,
`db-test`, `db-avc-upgrade-test`, `importer-test`, `workflow-test` com
SYNTHETIC_PG_* correspondentes e PGPASSWORD exclusivamente sintético.
Build/unidades já passaram em rodada própria; não foram repetidos sem mudança.
 Interface, comparação visual, CI remoto próprio e aceite
humano não são declarados por este relatório de backend. Logs /tmp são voláteis.
