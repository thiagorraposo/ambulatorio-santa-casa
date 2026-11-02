# Execução M3 — registro de02/11/2026

Atualizado em 2026-11-02T11:43:25-03:00. Continuidade da numeração registrada **Janela1/6**;
retomadas não comprovam três janelas completas. Primeira observação00:14:30,
última anterior à interrupção00:44:22; regressão automática21,6min parcialmente
sobreposta. Relógio observado novamente09:24:49. Intervalo inativo não computado;
sem total confiável de horas ativas, PV/EV ou percentual de M3. Escopo integral
continua em risco para03/11; não se afirma adiantamento ou atraso mensurado.

Branch `feat/m3-janela-1-eventos`. **Candidato funcional `a84001a`**, após
restauração do AVC/paginação de catálogo. Commits posteriores de controle e
propostas são documentais; consultar `git log -1` para HEAD desses registros.
Baseline anterior preservada em `e25aafb`/`6fb4cdc`. Nenhum push/merge/deploy.

## Entregas desta retomada e provas

| Commit local | Recorte | Evidência |
| --- | --- | --- |
|5ee274d|E6U parâmetros canônicos, lista/formulário/revisão/recibo|[E6U](VALIDACAO_7B_E6U_PARAMETROS.md)|
|ed85c9e|8B3U.4 atalhos por pessoa e retorno à busca|[Atalhos](VALIDACAO_8B3U_4.md)|
|1c0f6a2|8C2B.1 relatório sanitizado/totais/códigos, sem fechar sequências|[Backend relatório](VALIDACAO_8C2B_1_RELATORIO.md)|
|7d6c3d6|Rollback externo preservado após rejeição precoce|[Correção](VALIDACAO_DRY_RUN_REJEICAO_PRECOCE.md)|
|55f82b5|8C2U.1 relatório básico real na simulação|[Interface](VALIDACAO_8C2_U1_RELATORIO.md)|
|e1fe8f0|Ensaio integrado e isolamento das contagens E2E|[Ensaio](VALIDACAO_DEMONSTRACAO_M3_2026_11_02.md)|
|191016f/f5d1517|Propostas e confronto renderizado medicamentos|[Medicamentos](VALIDACAO_7B_E5U_LEITURA.md)|
|a84001a|AVC restaurado e roteiro navega catálogo composto|[Regressão composta](VALIDACAO_REGRESSAO_FRONTEND_M3_2026_11_02.md)|

Frontend: build e284 unidades passaram; arquivo afetado de leitura12/12 repetido
após correção. E2E integral97 aprovados/4falhas em101; as quatro falhas foram
corrigidas e5 E2E dirigidos passaram (incluindo pré-requisito de catálogo).
Cobertura composta dos101 casos, sem inventar rodada101/101. Backend197 unidades
e26 HTTP do relatório; importador38 unidades e pipeline integral. Baseline
137 HTTP/44 SQL/upgrade72→73 preservada onde não houve mudança relevante.
Capturas/referências/Axe e limites em cada relatório; dados somente sintéticos.

## Monitoramento, prontidão e gates

O [plano/checkpoint único](../execucao/PLANO_M3_2026_11_03.md#10-checkpoint-único-e-transferência-de-contexto),
[matriz FM/RQ](../frontend/MATRIZ_FIGMA_FRONTEND.md) e catálogo foram atualizados;
prontidão/DoD do recorte estão nos relatórios, não como aceite do agregado.
EVM não calculado sem baseline confiável. Não há novo aceite humano deM3/8V.
[Triagem das decisões](../arquitetura/TRIAGEM_DECISOES_M3_2026_11_02.md) aponta
fontes e propostas sem aprovar opções.

Restantes impedimentos de runtime: escrita de medicamentos/semântica dos campos,
datas/status/correções de exames, eventos residuais/precisão parcial, contratos
de concorrência e P-03–09 conforme unidade; confirmação da importação exige
recuperação autoritativa, simulação sem avançar sequências exige isolamento
adequado. Propostas preparadas não substituem decisões, permissões ou contratos.
Não foi criada funcionalidade baseada em mocks para contornar esses gates.

## Aplicação disponível no navegador

**Atualização de02/11,15:56−03 — endereço vigente: http://127.0.0.1:4178**,
API6063, PostgreSQL55459 exclusivamente sintético em tmpfs. Código servido da
raiz `/home/raposo/Projetos/ambulatorio-santa-casa`, runtime `ae19c41`; diff de
backend/src e frontend/src contra esse HEAD vazio. Login real de Administração,
menu Usuários e GET /usuarios200/tabela confirmados em Chromium; captura
volátil `/tmp/m3-demo-atual-usuarios.png`. Mesmo acesso sintético abaixo.

Supervisor da raiz `python3 scripts/dev_sintetico.py status`, estado privado
`/tmp/ambulatorio-dev-1000-209b0b6ca48a`, log `runner.log`. Iniciado com
`python3 scripts/dev_sintetico.py start --pg-port 55459 --api-port 6063 --web-port 4178`.
O Vite usa agora a raiz corrente; frontend acompanha suas alterações. Alterações
posteriores de backend exigem recompilar e atualizar o processo servido antes de
anunciar o link como atual. Conferir checkout/versão e smoke autenticado, além
da resposta200 da página de login. Criação/alteração de usuários e novo escopo de
Edição continuam pendentes; a atualização de endereço não os implementa.

A demonstração anterior em4177 foi preservada e está **desatualizada**. O registro
abaixo descreve aquele ambiente anterior, não o código vigente.


**http://127.0.0.1:4177**; API6062 e PostgreSQL55458, exclusivamente sintéticos.
Usuário `frontend-administracao@example.invalid`; senha `Etapa6-sintetica!`.
Sessão de15min; novo login permite continuar. O responsável pediu explicitamente
que a aplicação ficasse disponível; o ambiente permanece ativo para essa revisão.

Checkout servido: `/tmp/ambulatorio-m3-correcoes-20261102`, base191016f mais diff
validado. SHA256 de245 arquivos de código/testes foi comparado ao código final
a84001a na raiz e confirmou igualdade. Não apresentar HEAD191016f isoladamente
como versão servida sem mencionar o diff. Build e smoke reais comprovados.

Supervisor `scripts/dev_sintetico.py`, estado privado
`/tmp/ambulatorio-dev-1000-9614c441be97`, log `runner.log`.
Container próprio `ambulatorio-dev-1000-9614c441be97`, PostgreSQL16.15 com
`/var/lib/postgresql/data` em tmpfs; não usa volumes persistentes ou `.env`.
Smoke `/tmp/m3-bootstrap-smoke-1.log`: login201, sessão900s, busca/ficha/última
consulta, AVC/dispositivos/óbito com retorno exato, formulário de simulação e
**zero escritas clínicas**. Não é aceite humano ou ensaio integral deM3.

Para consultar/parar somente esse ambiente, executar no checkout servido:
`python3 scripts/dev_sintetico.py status` ou `python3 scripts/dev_sintetico.py stop`.
Parar descarta a base sintética; não apagar checkout nem arquivos antes de
encerrar seu supervisor. Container anterior de testes55457 não foi removido.

Próxima ação concreta: recolher o resultado da revisão no navegador e registrar
escopo/parecer real; selecionar na fila a primeira unidade cujo gate tenha sido
resolvido. Antes de alterar o candidato, conferir branch/HEAD/diff e preservar
o ambiente que está sendo revisado. Não repetir suítes aprovadas sem mudança,
falha ou dúvida concreta. Janelas2/3 não serão abertas por inferência.
