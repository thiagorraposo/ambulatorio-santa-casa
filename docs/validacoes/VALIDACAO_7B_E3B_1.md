# Leitura do catálogo de comorbidades — 7B-E3B.1

Data: 2026-10-31, base `0a2884c`, branch `feat/continuidade-m2-condicao`.
**Implementada e validada tecnicamente; sem aceite humano ou escrita clínica.**
[Contrato e decisões pendentes](../arquitetura/CONTRATO_COMORBIDADES_7B_E3B.md).

## Escopo e ambiente

GET autenticado `/v1/catalogos/comorbidades` com ID textual/nome/ativo, somente
ativos e PageQuery. Não cria código ausente na SQL06, não expõe descrição interna
nem altera vínculos/avaliações de pacientes. Catálogos anteriores sem mudança de
contrato. Sem migration, nova permissão, edição ou interface clínica.

Servidor exclusivo `ambulatorio-comorbidades-catalogo-20261031`, PostgreSQL 16 em
tmpfs, localhost 55469. Identidade `postgres|ambulatorio_ci|5432` e tmpfs confirmados
antes do bootstrap 00–67. Fundação usou base desse servidor; HTTP criou/removeu
banco/logins próprios. Somente fixtures sintéticas. Parâmetros DB/APP_DB passados
como argumentos explícitos do Make, para impedir sobrescrita pelo `.env`.

## Resultados

`make -o docker-wait backend-check backend-clinical-test docs-check repository-check COMPACT=1`
com DB/APP_DB em 127.0.0.1:55469, JWT/senhas sintéticos e `SYNTHETIC_PG_*` no mesmo
servidor confirmado: **build aprovado, 181/181 unidades, 8/8 fundação e 93/93 HTTP
clínicos**. Log `/tmp/ambulatorio-check-_a2r_j4e/output.log`. Docker-wait foi marcado
como já atendido após confirmação manual do destino; nenhuma espera implícita
pelo Docker persistente. Nenhum teste ignorado na composição.

Um teste unitário novo verifica projeção restrita e não fabricação de código.
Dois HTTP novos comprovam ativos/inativos nos três perfis sem vínculo de pessoa,
paginação 1/1/vazia, limites/extra recusados, 401 e ausência de comando POST.
Contagem de associações de paciente permanece idêntica após leituras.
Os testes dos três catálogos anteriores e demais rotas clínicas passaram na
mesma composição; não houve mudança de expectativas/timeouts ou falha observada.

SQL38, upgrade/importador/workflow aprovados em `e128f43` e baseline frontend
256/76 de `0a2884c` foram reutilizados. Essas camadas não mudaram neste incremento;
não se apresenta reaplicação das migrations de bootstrap como nova suíte SQL.
CI remoto e aceite humano não foram executados.

## Pendências

Escrita/seleção de comorbidades depende de definir estado por paciente versus
avaliação por atendimento, representação desconhecida sem default true e o
conteúdo de histórico familiar. Não houve resposta humana presumida nem
integração do bloco de exames familiares a esse histórico. Ambiente descartável
foi encerrado ao finalizar; logs `/tmp` podem desaparecer.
