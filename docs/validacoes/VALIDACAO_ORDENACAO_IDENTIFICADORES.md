# Ordenação numérica de identificadores em leituras paginadas

Data: 2026-10-17. Validação técnica aprovada.

Durante a investigação do [último atendimento](VALIDACAO_7D_U3_1.md), foi
confirmado que `SELECT id::text ... ORDER BY id` pode ordenar o alias textual,
em vez da coluna bigint. Uma auditoria das outras consultas encontrou três
casos funcionais além do histórico de atendimentos.

Plano executado: reproduzir a ordem incorreta com IDs sintéticos discriminantes;
qualificar as colunas originais nas três consultas; verificar páginas, arrays,
autorização e regressão clínica completa. Sem alterar DTOs, migrations ou
identificadores devolvidos como texto.

| Recurso | Ordem preservada após a correção |
| --- | --- |
| Pendências na leitura de um atendimento | ID numérico crescente, antes de LIMIT/OFFSET |
| Reações de tratamento BZN | ID numérico crescente |
| Lotes de importação autorizados | ID numérico decrescente, antes de LIMIT/OFFSET |

O novo `ordering.http.spec.ts` usa IDs explícitos maiores que
`Number.MAX_SAFE_INTEGER`, cruzando uma mudança de largura decimal, com dados
e proveniência exclusivamente sintéticos. Não altera sequências. A prova inicial
teve três falhas de ordenação e uma aprovação de autenticação/vínculo:
`/tmp/ambulatorio-ordering-before.log`.

Após a correção, quatro suítes focadas passaram com 14 testes. O cenário de
lotes verifica o prefixo dos três IDs grandes para administração e também o
fim da coleção para os perfis ligados somente à fixture, respeitando que
administração pode consultar lotes de outras suítes.

Um teste temporal preexistente selecionava um campo apenas por decisão e ID do
registro, sujeito a coincidência entre IDs de tabelas distintas. A seleção agora
inclui explicitamente `paciente.nome` pelo catálogo `auditoria_campo`, mantendo
os identificadores do plano original e sem depender da ordem das fixtures.

O novo spec integra o runner padrão. A suíte clínica completa final passou:
**70 testes em 12 suítes**, log `/tmp/ambulatorio-ordering-full.log`.
O build backend final e a checagem documental passaram no log
`/tmp/ambulatorio-check-nqreqmv0/output.log`.
As consultas de catálogos/eventos auditadas usam nomes de saída distintos ou
colunas qualificadas. A ordenação intermediária textual dos grupos familiares
não muda a resposta observável, reconstruída pela ordem dos snapshots e pela
posição numérica de cada filho; não foi alterada.

As correções não exigem aplicação de migrations nem alteração estrutural. A
ocorrência de seleção incorreta do ambiente em um comando de validação está
registrada na [validação U3.1](VALIDACAO_7D_U3_1.md#ocorrência-na-seleção-do-ambiente-de-validação).
O teste comprova os recursos listados e não afirma auditoria de SQL externo ao projeto.
