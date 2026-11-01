# Validação técnica de complicações — 7B-E2B.2

Data: 2026-10-31. Base `c8271a3`, branch `feat/continuidade-m2-condicao`.
Contrato técnico adotado após solicitação de continuidade do responsável,
sem acrescentar regras clínicas. **Implementado e validado tecnicamente em
ambiente sintético; aceite humano e interface são separados.**

## Escopo e ambiente

GET/POST de quatro campos da SQL06 por paciente/atendimento, ocorrências
repetíveis, paginação própria, autorização, transação e recibo por UUID.
Migration 67 acrescenta somente captura prospectiva, resolução do paciente e
guard temporal, preservando a função de captura vigente. Sem nova tabela,
condição/diagnóstico obrigatório, backfill ou edição persistida.

Servidor exclusivo `ambulatorio-complicacoes-20261031`, PostgreSQL 16 com tmpfs,
localhost 55467. Antes do bootstrap confirmou-se `postgres|ambulatorio_ci|5432`
e o tmpfs por inspeção Docker. SQL/fundação usaram somente o banco desse
servidor; HTTP/upgrade/frontend criaram e removeram seus próprios bancos/logins.
O importador exige porta fixa 55457 e foi concluído em outro container tmpfs
exclusivo `ambulatorio-complicacoes-importer-20261031`, identidade igualmente
conferida. Somente fixtures sintéticas, sem carga real ou migration persistente.

## Resultados

| Verificação | Resultado / evidência local |
| --- | --- |
| Build e unidades backend | 180/180, 20 suítes; `/tmp/ambulatorio-check-cwvuiic5/output.log`. |
| Integração da fundação | 8/8; `/tmp/ambulatorio-check-cfkwi_pn/output.log`. |
| Migrations 00–67 em servidor novo | `/tmp/complicacoes-bootstrap-20261031.log`. |
| SQL completo / project-check | 38 scripts aprovados, incluindo SQL39 com BEGIN/ROLLBACK; `/tmp/ambulatorio-check-cfkwi_pn/output.log`. |
| HTTP clínico completo | 91/91, 15 suítes, incluindo oito novos; mesmo log. |
| Importador completo | Aprovado em 55457; `/tmp/ambulatorio-check-tll0ck82/output.log`. |
| Upgrade 66→67 | Legado idêntico, sem eventos retroativos e captura posterior; definição/owner/ACL/configuração da captura compartilhada preservados. `/tmp/complicacao-upgrade-Mt9kpV`, mesmo log do importador. |
| Workflow | 30/30, mesmo log. Novo alvo de upgrade compatível com COMPACT=1. |
| Frontend focado / runner 02–67 | A1 e simulação XLSX: 2/2, zero retry/skip; `/tmp/etapa6-frontend-x3poWP`, `/tmp/complicacoes-frontend-focado-20261031.log`. |
| CI estático | Actionlint 1.7.12 com SHA256 igual ao fixado no workflow aprovado; não executou CI remoto. |

A baseline histórica de 252 testes frontend/73 E2E não foi reapresentada como
nova execução. Nenhum código de interface foi alterado neste incremento; o
runner foi atualizado para 02–67 e dois percursos representativos foram
reexercitados devido à mudança de backend/schema/importação.

HTTP comprova null/false/texto vazio/espaços, domínio/limites, paginação 20/1,
conteúdo repetido e concorrente com IDs distintos, dois pacientes/consultas,
perfis/vínculos/revogação, ausência de condição/diagnóstico inferidos, recibo
atômico, consulta autorizada e replay 409. Falha SQL controlada reverte
registro/auditoria e resulta em não aplicação da intenção. A consulta de recibo
após COMMIT não é apresentada como perda de transporte injetada pela interface.
SQL39 cobre também grants, autoria, proveniência obrigatória, DELETE/TRUNCATE,
guards novos/anteriores e envelopes prospectivos. Upgrade verifica ausência de
backfill e a integridade da função compartilhada, não somente contagem final.

## Falhas encontradas e tratamento

- Rodada HTTP focada inicial: 7/8. O teste esperava 403 ao consultar UUID de
  outro autor; o protocolo existente responde 404 para não enumerar intenções.
  Corrigida somente a expectativa; a suíte final passou 91/91.
- Primeira composição: unidades passaram, mas fundação teve 4/8 falhas em
  autenticação. O `.env` lido pelo Make sobrescreveu `APP_DB_PORT=55467` do
  ambiente por 5433. A API tentou autenticar na base local; os testes falharam
  antes de leitura de pacientes/escrita clínica. Não houve migration ou gravação
  clínica nessa base. A rodada foi descartada e os parâmetros passaram a ser
  argumentos explícitos do Make, conferindo a precedência. Fundação então 8/8.
- O alvo `docker-wait` observaria o Docker padrão; nas provas finais foi marcado
  como já atendido com `make -o docker-wait`, após confirmar explicitamente os
  containers sintéticos. Nenhum servidor persistente foi usado como alvo final.
- A primeira execução do importador parou na proteção de porta D3: 55467 não
  satisfaz a exigência 55457. A asserção foi preservada; repetição completa no
  segundo servidor descartável passou. Não foi enfraquecido o guard do teste.

## Reprodução e limites

Selecionar servidor exclusivamente sintético e confirmar identidade/tmpfs antes
de aplicar migrations. Para fundação/project-check, passar `DB_*`, `APP_DB_*`
e configuração JWT como argumentos do Make; variáveis de ambiente podem ser
sobrescritas pelo `.env`. Fornecer senhas sintéticas fora do Git. O importador
usa DB_PORT=55457; HTTP/upgrade/frontend recebem `SYNTHETIC_PG_*`. Não usar
`project-check` com destino implícito ou reaplicar migrations no banco persistente.

CI remoto, interface CON-07–11, edição/remoção, revisão temporal e aceite humano
não são concluídos por esta prova. M2 mantém seu aceite oficial anterior; M3 e
operação institucional continuam abertos. Logs em `/tmp` podem ser removidos.
