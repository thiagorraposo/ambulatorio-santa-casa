# Condição por atendimento — 7B-E2B.1

Data: 2026-10-28. Recorte RQ-CON-01–06; não é aceite do pacote completo ou
homologação clínica. [Contrato](../arquitetura/CONTRATO_CONDICAO_CHAGAS_7B_E2B_1.md).

## Ambiente e verificações

PostgreSQL 16 exclusivamente sintético em tmpfs, projeto Docker
`ambulatorio-condicao-e2b`, `127.0.0.1:55457`. Antes de SQL foram confirmados
armazenamento e identidade `ambulatorio_santa_casa|ambulatorio_ci`; o servidor
foi recriado nas correções, sem tocar outro projeto ou base persistente.
Runners HTTP/upgrade/importador criam e removem seus bancos próprios.

| Verificação | Evidência |
| --- | --- |
| Build e unidades backend | 177/177, 20 suítes; `/tmp/ambulatorio-check-cmm4z4xo/output.log`. |
| Migrations finais 00–66 em instância nova | `/tmp/ambulatorio-check-wxdf3b0a/output.log`. |
| SQL completo | 37 scripts; `/tmp/ambulatorio-check-9mu5q56v/output.log`; SQL38 usa BEGIN/ROLLBACK. |
| Upgrade 65→66 sem backfill | `/tmp/ambulatorio-check-fksotaz1/output.log`; registro legado idêntico, zero eventos retroativos, captura posterior com marco conhecido. |
| Importador completo | `/tmp/ambulatorio-check-blhp_37p/output.log`; inclui fluxo real, proveniência e concorrência D2/D8. |
| HTTP final | 83/83, incluindo 7/7 novos: seis campos/null/false/texto, ausência JSON null sem gravação, diagnóstico inalterado, criação única concorrente,401/403/404, DTO/limites, rollback e reciboUUID/replay409. |

## Falhas encontradas e regressões

SQL38 encontrou erro 42702 em TRUNCATE: alias `c` colidia com variável da função
`auditoria_capturar`. A expectativa 23514/auditoria_alvo_protegido foi mantida.
A primeira correção copiou a baseSQL24 e perdeu patches dinâmicos39/42: sete
HTTP novos passaram, mas oito antigos falharam por perda da revisão seletiva
(`/tmp/ambulatorio-check-22z3oh94/output.log`). Essa regressão foi corrigida
obtendo a função vigente por pg_get_functiondef, substituindo só o fragmento
ambíguo único e conferindo owner/ACL/configuração preservados. SQL38 verifica
proteções39/42 e TRUNCATE de condição/sorologia; nenhuma histórica foi alterada.

A rodada HTTP seguinte passou 80/83. As três falhas restantes eram asserções
antigas de contagem global zero: staging, executado antes, já havia criado quatro
aplicações legítimas. O [ajuste de isolamento do CI](VALIDACAO_CI_2026_10_26.md)
compara o ledger integral antes/depois, sem apagar dados nem ignorar novos
efeitos. Após incorporar o PR #21 integrado em `8736b0d`, a composição final
passou 83/83, em 14 suítes (`/tmp/ambulatorio-check-cqx43ie3/output.log`), incluindo
as revisões seletivas e os sete cenários novos. Nenhum teste ignorado.
Documentação, consistência, 30 testes do workflow e actionlint passaram nas
verificações proporcionais. Os resultados remotos devem ser conferidos no
[histórico da branch](https://github.com/thiagorraposo/ambulatorio-santa-casa/actions?query=branch%3Afeat%2Fcondicao-chagas);
integração exige quatro jobs aprovados e conferência posterior na main.

## Limites

Sem interface, complicações repetíveis, edição/remoção ou revisão temporal do
novo recurso. Sintomas específicos sem destino/domínio aprovado continuam
pendentes; não são mapeados silenciosamente para outros campos. Aceites humano
e clínico, M2/M3 e uso de dados reais permanecem separados desta validação.
