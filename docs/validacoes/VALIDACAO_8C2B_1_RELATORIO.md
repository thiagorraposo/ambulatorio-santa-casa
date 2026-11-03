# Relatório de simulação e aplicação — recorte 8C2B.1

2026-11-02, Janela 1 retomada, base `ed85c9e` (camadas backend/importador desde `69c9428`) + diff deste recorte.
Relatório HTTP VALIDADO TECNICAMENTE. **8C2B.1 inteira permanece IMPLEMENTADA
SEM VALIDAÇÃO COMPLETA**, pois a simulação ainda consome sequências.
[Contrato e limite](../arquitetura/CONTRATO_RELATORIO_IMPORTACAO_8C2B_1.md).

H14 passa a devolver contagens reais e códigos fechados, separando importadas
sem pendência das importadas com pendência como a projeção SQL53. O worker
retorna relatório também no no-op; aplicação/reenvio identificam o lote efetivo.
A projeção ignora campos extras e recusa modo/versão/códigos/contagens
incoerentes. Não expõe mensagens, conteúdo da planilha, hash, versão ou candidatos.
Não modifica schema, importador transacional, permissões ou regras clínicas.

## Evidências

Servidor exclusivo `ambulatorio-avc-interacoes-20261101`, PostgreSQL 16.15,
`127.0.0.1:55457`, mount `/var/lib/postgresql/data` confirmado como tmpfs antes
de cada runner. Bancos/logins exclusivos criados e removidos pelos testes; nenhum
acesso ao PostgreSQL persistente.

- `make backend-build backend-unit-test COMPACT=1`: 197 testes/21 suítes,
  `/tmp/ambulatorio-check-0c8xtfx9/output.log`. Os 188 casos anteriores e nove casos novos passaram. Os novos verificam
  projeção, separação de totais e recusa de protocolo incoerente.
- `python3 -m unittest tests.importador.test_transformacoes`: 35 testes,
  incluindo vocabulário/prioridade/sanitização dos códigos.
- `tests/importador/test_e2e.sh` em banco sintético exclusivo: aprovado,
  `/tmp/m3-import-report-importer-final.log`. Fixture de 13 linhas com
  5 importadas sem pendência, 3 com pendência e 5 rejeitadas; seis códigos
  agregados. Relatórios de duas simulações são idênticos; comparação real
  comprova paridade dos códigos com SQL53 após aplicação. Regressões de
  proveniência, reprocessamento, captura ativa, D2/concorrência e D8 preservadas.
- `tests/backend/test_clinical_integration.sh test/clinical/clinical.http.spec.ts
  test/clinical/importacoes.http.spec.ts`: 26 HTTP/2 suítes aprovados,
  `/tmp/m3-import-report-http-final.log`. Simulação,
  aplicação e no-op produzem o mesmo relatório da fixture HTTP de duas linhas;
  totais confrontados com a projeção SQL do lote efetivo. Perfis, escopo de
  proveniência e erro sanitizado preservados.

A primeira execução do shell de importador foi invalidada por edição do próprio
arquivo durante sua execução e terminou com EOF inesperado. `bash -n` passou;
a execução integral final, iniciada após a edição, passou. Não foi falha do
pipeline. Backend build/unit e HTTP foram repetidos após mudar o tratamento de
protocolo inválido para 503 com orientação de consulta antes de reenvio.

A composição proporcional de `importer-test` foi executada pelos seus dois
componentes: 35 transformações Python + runner E2E integral. Não foi chamado o
alvo Make porque sua dependência `docker-wait` aponta ao Compose persistente;
os componentes receberam diretamente o servidor tmpfs confirmado. Sem repetir
uma suíte já aprovada sobre o mesmo estado.

## Prontidão e DoD do recorte

| Gate | Estado e prova |
| --- | --- |
| Contrato/semântica | Totais disjuntos e vocabulário SQL53; sem clínica nova |
| Pipeline/HTTP/PostgreSQL | 13 linhas no pipeline e 2 HTTP; projeção do lote efetivo e no-op conferidos |
| Sanitização | Allowlist/códigos fechados; testes negativos de protocolo e conteúdo |
| Documentação | Contrato, este relatório; monitoramento integrado pelo agente principal |
| Efeitos do dry-run | **PENDENTE**: ROLLBACK não reverte sequências; folha C2B.1 não concluída |
| Aceite humano | Não registrado; validação técnica não o substitui |

`make docs-check repository-check COMPACT=1` aprovado em
`/tmp/ambulatorio-check-ohkqcuk_/output.log`; `git diff --check` sem erros.

Logs `/tmp` são voláteis; resultados relevantes foram resumidos aqui. Não houve
regressão SQL completa, pois nenhum SQL/schema foi alterado; a integração usa
migrations 02–73 e consulta real de SQL53. Frontend não faz parte deste recorte.
Sem CI remoto, push, merge, deploy ou aceite humano.

## Pendência impeditiva de C2B.1

O snapshot de tabelas continua válido para simulação, mas não comprova ausência
de consumo de sequências. O worker mantém `rollback_only`; `nextval` e captura
podem avançar sequências, cujo estado não é revertido pelo PostgreSQL. Não foi
usado `setval`, restauração concorrente ou ampliação de privilégios. Próximo
incremento: isolamento da simulação com o mesmo pipeline e prova de igualdade
de todas as tabelas **e sequências**, inclusive captura e caminhos de erro.


Prontidão/DoD técnico do recorte: contrato sanitizado, API/worker, totais
disjuntos, códigos fechados, lote efetivo e integração real comprovados.
FM-IMP-32/42 têm avanço de backend apenas; interface e restantes do relatório
não são aceitos por essas provas. Gate de ausência de efeitos em sequências
permanece aberto. EVM não recalculado: não há baseline confiável de esforço,
custo ou valor; testes/recortes não são unidades de valor agregado.
