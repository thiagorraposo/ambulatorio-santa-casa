# Aceite integrado da Etapa 5

Atualizado em: 2026-10-03. Ambiente exclusivamente sintético.

Este documento relaciona os critérios obrigatórios às provas executáveis. O
contrato normativo continua na [especificação temporal](../arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md#aceite-da-extensão-e-das-portas-de-ativação)
e no [roadmap](../PROXIMOS_PASSOS.md#etapa-5--recursos-funcionais-e-backend-clínico-do-mvp).
O histórico de execução permanece na [continuidade](CONTINUIDADE_ETAPA_5.md).
Existência de um teste não equivale a execução aprovada.

## Resultado do aceite

**Aprovado no ambiente sintético em 2026-10-03; 5A–5E concluídas.** Instalação
limpa 02–63 e atualizações incrementais 60→61→62→63 passaram. A rodada final
aprovou 34 testes SQL (01–31, 33–35), manifesto, 34 unitários e E2E do importador,
build, 53 testes unitários/de contrato do backend, oito de fundação e sete suítes
clínicas/38 casos. A concorrência D2 foi comprovada com escritor Python real;
a criação com observação ausente nos dois arquivos percorreu dry-run, staging,
publicação, aplicação e replay. Os logs e as falhas intermediárias estão na
[continuidade](CONTINUIDADE_ETAPA_5.md#fechamento-integrado--2026-10-03).

A migration 63 foi implementada após o aceite integrado até 62 e passou na
rodada final. Concede somente aplicação, encerramento e diagnóstico à role de
serviço de revisão; rotinas internas continuam privadas. SQL35 prova concessão,
recusa sem identidade e reversão das permissões sem apagar evidências. O runner
HTTP usa essas permissões reais, sem concessão manual. Execução exige opt-in,
modo sintético, staging e revisão Git válida em `development`/`test`; permanece
desligada por padrão e produção é recusada.

Não há decisão clínica/institucional pendente no escopo sintético autorizado;
ativação de produção e designação de pessoas em produção pertencem às etapas
posteriores.

O catálogo mínimo habilitado cobre ano D8, data/observação do atendimento e,
com 61, descoberta D2. Destinos sem contrato e captura completos são recusados;
não se exige habilitar todas as colunas físicas para satisfazer o contrato.
Não há backfill de história clínica nem preenchimento de NULL legado por suposição.

## Integridade e aplicação — F01–F16

| Caso | Provas e resultado observável |
| --- | --- |
| F01 | SQL11: nova linhagem entre hashes; FK antiga recusa hash distinto; mesmo hash/layout conserva reprocessamento. E2E do importador cobre idempotência e dois elos. |
| F02 | SQL11: base não terminal, outra fonte, hash/layout incoerentes, lote sem ancestral e ciclo de lotes recusados. SQL33: aplicação/fechamento B em transações distintas e tentativa de retornar ao conteúdo A. |
| F03 | SQL11/19: linha de outro lote, paciente incompatível e duas autorizações conflitantes recusadas; sucessão preserva decisão anterior. Teste clínico preserva alvos já criados em versões seguintes. |
| F04 | SQL11/20/22/26: ausência/vazio/NULL/valor distintos; envelope, catálogo, exclusão e plano incompleto recusados. |
| F05 | SQL11/21: relações, sequências, rotinas privadas e identidade isoladas. SQL34/E2E D2: prova restrita de promoção sem acesso do importador às tabelas de auditoria. |
| F06 | SQL18/19/20 e HTTP de gestão: ator e fonte atribuíveis, entitlement separado, autorização por usuário/fonte, expiração/revogação e imutabilidade. |
| F07 | SQL11/12: eventos repetidos/saltados, predecessor incompatível e origem de revisão forjada recusados. Teste clínico recusa resolução/proveniência incompatíveis de alvo novo. |
| F08 | SQL24/28/31/34 e E2E Python: captura ou recusa nos escritores habilitados; A→B→A avança tokens. Testes HTTP clínicos e de revisão preservam origem/ator. |
| F09 | SQL28/29 e E2E D2: marco/equivalência não conferem cobertura retroativa; associação equivalente não altera campo; NULL desconhecido permanece. |
| F10 | HTTP de staging misto: falha depois de atualizar atendimento, antes do fato anual, reverte clínica, eventos, proveniência, sucesso e fonte; diagnóstico posterior contém só código técnico. |
| F11 | Testes clínicos e staging: executores concorrentes produzem um sucesso; repetição/sucessora reutiliza IDs sem novas visitas ou eventos. |
| F12 | Teste clínico com duas sessões: revisões concorrentes, edição após aprovação e revogação aguardando aplicação têm ordem verificável; perdedora é obsoleta. |
| F13 | Python real `test_reprocessamento_temporal.py`, `test_precedencia_atendimento.py` e D2: origem antiga/promoção não restaura valor corrigido. SQL26 cobre conservação diante de ausência. |
| F14 | Teste clínico de criação: novo atendimento e dependentes recebem IDs únicos, vínculos/campos/proveniência coerentes, com rollback e reutilização entre versões. |
| F15 | SQL22 e testes clínicos/staging: dry-run preserva tabelas/sequências e aplicação revalida; erros/logs sanitizados e snapshots privados inacessíveis. |
| F16 | Instalação limpa/incremental e suítes proporcionais integradas. SQL11/35 provam reversão somente das concessões de execução, preservando evidências. Migration 63 e HTTP validam ativação sintética explícita após aceite, sem concessões extras do runner. |

## Cenários clínicos — T01–T18

| Caso | Provas e resultado observável |
| --- | --- |
| T01 | E2E importador: mesmo hash/layout concluído não duplica efeitos. |
| T02 | E2E/contratos HTTP: finalidade ausente e revisão sem base recusadas antes de escrita clínica. |
| T03 | SQL23: bruto reordenado em novo hash mantém os mesmos pacientes, atendimentos e dependentes. |
| T04 | SQL22/23: posição reutilizada, candidatos múltiplos e âncoras incompatíveis recusados sem aproximação. |
| T05 | HTTP clínico/staging misto: data/texto corrigidos no mesmo atendimento, somente nos campos aprovados, com antes/depois e proveniência. |
| T06 | Teste clínico de criação e staging XLSX real: paciente existente recebe exatamente uma visita nova, com data completa, sem copiar dependentes anteriores. Ausência de observação nos dois manifestos exige plano explícito e funciona em simulação/aplicação/replay. |
| T07 | Mesmo teste: decisões diferentes geram atendimentos distintos na mesma data. |
| T08 | Staging HTTP anual isolado: 2023→2025 preserva mesmo alvo, atendimentos e BZN; bruto/proposta guardam precisão anual, proveniência única e replay sem novos eventos. |
| T09 | Python D8, SQL24/28 e staging: ano igual, aumento/diminuição inequívocos preservam precisão anual, sem inventar dia ou visitas. |
| T10 | SQL23/26: vazio, coluna não coletada e linha removida conservam dados, sem exclusão/nulificação implícita. |
| T11 | SQL28, clínico A→B→A e E2E D2: edição divergente/NULL sem cobertura não é sobrescrito por igualdade aparente. |
| T12 | SQL23 e E2E importador: identidade conflitante, troca de aba e proveniência ausente impedem substituição/mesclagem ou reversão diagnóstica. |
| T13 | Staging misto: correção de atendimento + fato anual + falha tardia têm rollback integral. |
| T14 | Staging e Python real: repetição, retomada e origem antiga produzem um efeito e preservam correções posteriores. |
| T15 | Teste clínico concorrente e staging: mudança após dry-run/aprovação impede aplicar plano obsoleto. |
| T16 | SQL23 e E2E BZN/D8: ano isolado, planejamento D9 e retorno sem comparecimento não criam visitas, retornos ou documentos inferidos. |
| T17 | SQL22 e staging: dry-run sem persistência, falha atômica e diagnóstico sanitizado. |
| T18 | SQL22/26: dependente repetível copiado sem identidade de ocorrência impede publicação, com zero efeito. |

As referências SQL estão em [`tests/sql`](../../tests/sql/); os cenários de API
em [`backend/test/clinical`](../../backend/test/clinical/) e os escritores reais
em [`tests/importador`](../../tests/importador/). Os testes de armazenamento não
substituem as provas HTTP dos endpoints novos.

## Critérios de 5A–5E

| Subetapa | Critério verificável |
| --- | --- |
| 5A | Respostas clínicas autoritativas e governança delegada registradas, sem fabricar respostas; invariantes e impacto coerentes. |
| 5B | BZN, promoções aprovadas (inclusive D2 segura), idempotência, reprocessamento e revisão seletiva/dry-run passam com proveniência íntegra. |
| 5C | Apenas extensões indispensáveis D2/D3, integridade e permissões comprovadas por instalação limpa/incremental e SQL. |
| 5D | Paciente completo, atendimentos, recursos clínicos, busca/filtros, lotes/erros, importação e CSV funcionam por DTO/operação de negócio. |
| 5E | Paginação, validação, contratos HTTP versionados, transações, observabilidade e autorização por recurso passam para os três perfis, incluindo recusas e concorrência. |

Todos os critérios acima foram satisfeitos pela implementação e pelas rodadas
registradas. O banco persistente e seu dump estrutural não foram alterados nem
usados como evidência deste aceite. A configuração inicial incorreta da fundação
foi recusada na autenticação antes de executar SQL; a validação aprovada usa
somente descartáveis em 55457. Não houve execução remota do CI nesta entrega;
homologação institucional, dados reais e implantação permanecem fora do escopo.
