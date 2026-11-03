# Rejeição precoce na simulação — correção do limite transacional

2026-11-02, Janela 1 retomada, base `1c0f6a2` + diff Python deste incremento.
Correção VALIDADA TECNICAMENTE no recorte descrito. Não encerra
[8C2B.1](../arquitetura/CONTRATO_RELATORIO_IMPORTACAO_8C2B_1.md): sequências
continuam fora da garantia de rollback do PostgreSQL.

## Defeito e correção

`process_row` validava o nascimento antes de abrir a transação da linha. Em uma
rejeição precoce, `Database.transaction('ROLLBACK')` não encontrava savepoint e
enviava `ROLLBACK` diretamente à sessão. No modo `rollback_only`, isso encerrava
a transação externa que deveria proteger toda a simulação. Operações seguintes
poderiam executar em autocommit.

Duas reproduções com o worker real e primeira linha com nascimento inválido,
seguida por linha válida, distinguiram os efeitos:

- Lote novo: erro do worker e ausência da segunda linha no staging, já revertido;
  snapshot de tabelas igual, mas simulação não retornava relatório válido.
- Lote anteriormente preparado/interrompido: erro do worker e **alteração
  persistida nos metadados de lote/linhas** em uma operação declarada como
  simulação. Nesse cenário não houve criação de paciente/atendimento; não é
  evidência de que todo caminho posterior ao rollback seria seguro.

O início da transação/savepoint agora ocorre antes das transformações da linha.
O adaptador de simulação também recusa `COMMIT`/`ROLLBACK` de linha sem savepoint,
início aninhado e comandos transacionais inesperados, sem enviar SQL nesses
casos. Rejeição reverte somente o savepoint; a próxima linha continua dentro da
transação externa. O rollback externo fica reservado ao encerramento da sessão.
Aplicação normal mantém sua transação por linha e validações clínicas existentes.

## Evidências

PostgreSQL 16.15 exclusivamente sintético, container
`ambulatorio-avc-interacoes-20261101`, `127.0.0.1:55457`, mount tmpfs confirmado.
PoCs criaram bancos/logins próprios e os removeram ao terminar. Nenhum banco
persistente, dados reais, mudança de ACL/migration ou reset de sequência.

- Originais: `/tmp/m3-dryrun-birth-original.log` e
  `/tmp/m3-dryrun-birth-original-resume.log`; o segundo registra
  `all_main_tables_unchanged=False`, com lote/duas linhas e nenhum paciente/visita.
- PoCs corrigidas, lote novo e retomada: relatório de duas linhas, uma importável,
  uma rejeitada por `data_invalida`, snapshot de todas as tabelas preservado.
  Última reprodução em `/tmp/m3-dryrun-birth-fixed.log` (retomada).
- `python3 -m unittest tests.importador.test_transformacoes`: **38 testes**,
  incluindo três novos casos do limite de savepoint e recusa sem SQL.
- Regressão permanente `tests/importador/test_dry_run_rejeicao_precoce.py`,
  chamada pelo runner integral: repete ambos os estados, valida continuação da
  linha válida, relatório/código e igualdade de fingerprints de **todas as
  tabelas** do schema antes/depois. Sequências são uma limitação separada.
- Runner integral `tests/importador/test_e2e.sh`: **aprovado**, incluindo a nova
  regressão, códigos/SQL53, proveniência, captura, D2/concorrência e D8; log em `/tmp/m3-dryrun-rejeicao-importer-final.log`.
- Portabilidade da nova regressão: guard confere nome exato criado pelo runner,
  endpoint explicitamente informado e `current_database()`, sem fixar porta.
  Após essa mudança somente o teste novo foi executado em outro container
  PostgreSQL tmpfs, `127.0.0.1:55459` → `5432`, migrations 02–73 e login
  importador dedicado; **aprovado** em
  `/tmp/m3-dryrun-rejeicao-porta-alternativa.log`. Container próprio removido.
  Isso comprova portabilidade; não foi identificado defeito de CI (o workflow
  efetivo usa 55457).
- Integração navegador/API do relatório: três cenários aprovados em
  `/tmp/etapa6-frontend-zHGtXK`, incluindo nascimento inválido com HTTP 201 e
  relatório de seis linhas (3 importadas, 2 com pendência, 1 rejeitada).

Não repetidos backend unitário/SQL completo: não há alteração TypeScript ou
migrations; a regressão exercita o worker Python e PostgreSQL real com captura
ativa. Logs `/tmp` são voláteis. Sem CI remoto ou aceite humano.
