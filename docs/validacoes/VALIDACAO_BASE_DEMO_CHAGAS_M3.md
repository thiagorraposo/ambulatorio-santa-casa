# Base demonstrativa de Chagas — M3

03/11/2026, branch `feat/m3-janela-1-eventos`, entrada
`921a91b231a09306e736c095910436fa51217c44`, árvore inicialmente limpa.
Menor unidade: substituir a base servida por até dez pacientes fictícios,
preservando contratos, RBAC, auditoria e runner descartável. Encerramento pedido
pelo responsável; não conclui M3/8V1/8V2 nem substitui revisão clínica humana.

## Carga e isolamento

`tests/frontend/seed.mjs` seleciona `seed-demo.mjs` apenas no perfil demo escolhido
pelo runner em `--serve`/`--demo-test`. O E2E comum conserva os casos de stress de
paginação/identificadores grandes; esses casos não entram na apresentação.
Não há migration, edição de schema aplicado, dump, acesso a banco persistente,
push ou deploy. O servidor é PostgreSQL16.15 em Docker/tmpfs exclusivo55458;
runner cria banco/logins aleatórios e remove somente esses recursos ao encerrar.

A carga confirma nome efetivo do banco, correspondência com APP_DB_NAME e
política de vínculo explícito antes das escritas. Exige banco inicialmente vazio,
usa lock de sessão para serializar chamadas e grava recibo privado da fixture.
Reexecução concluída com mesmo recibo/banco/IDs retorna sem escritas; banco parcial,
alterado na população ou recibo ausente exige recriação por stop/start. Não apaga
história imutável nem tenta reparar carga parcial sobre dados existentes.
As chamadas API são transações normais, com ator administrador fictício. Se a
carga inicial falha, o runner remove seu banco parcial. A âncora é o dia UTC da
criação: dados e datas são reproduzíveis para essa âncora; reexecução não avança datas.

Bootstrap SQL restrito: três usuários, catálogo canônico de comorbidades,
capacidade nominal para editor/admin, histórico sintético de três lotes com
linhas/proveniência e um uso referido de losartana. O medicamento tem contexto de
auditoria com ator, sem inventar endpoint de escrita, posologia ou prescrição.
Os lotes são explicitamente fixtures `demo_fixture_v1`/`DEMO-HISTORICO-*`, sem
alegar execução de importação real ou contrato de planilha novo. A revisão de
importações continua desativada conforme runner. Não foram criados projetos novos.

## Cenários e roteiro

Todos os nomes são compostos fictícios marcados como tal, sem CPF, telefone,
contato, endereço postal real ou arquivo externo. Os municípios não identificam
pessoas. Os dez cadastros têm datas de nascimento plausíveis e observações fictícias.

| Caso | Percurso disponível |
| --- | --- |
| Aurora Ipê | Forma indeterminada, assintomática, BZN concluído, retorno final, rastreio familiar e projeto |
| Bento Cedro | Forma cardíaca, NYHAII, hipertensão/diabetes referidas, marcapasso, complicação de condução, encaminhamento e contrarreferência concluídos, medicamento referido |
| Celina Acácia | Forma digestiva com disfagia, avaliação especializada agendada, pendência resolvida e pendência de projeto |
| Davi Jacarandá | Forma cardiodigestiva, prioridade alta em encaminhamento pendente e pendência assistencial cancelada |
| Elisa Jatobá | Investigação inconclusiva, informação desconhecida preservada, sem atribuir forma clínica ou diagnóstico confirmado |
| Flávio Buriti | Sorologias não reagentes, diagnóstico descartado e justificativa de não notificação |
| Gema Aroeira | Forma indeterminada, BZN interrompido após reação cutânea, retorno e relato de resolução |
| Hélio Angico | Forma cardíaca, AVC prévio com ano, ausência explicitamente referida de marcapasso |
| Íris Quaresmeira | Histórico cardíaco reservado, óbito posterior ao último atendimento, causa desconhecida |
| Jaci Manacá | Cadastro recente sem consultas; visível para editor/admin |

Nove pacientes têm três atendimentos cada, com sinais vitais e exames;
sorologias, avaliação de comorbidades e parâmetros de exame estão vinculados à
consulta de origem. O histórico não é copiado automaticamente para outra consulta.
Há notificações fictícias sem validade oficial, projetos existentes, retornos,
rastreio familiar, negativos explícitos, desconhecidos e pendências em quatro estados.

1. Entrar em `http://127.0.0.1:4177` com um dos três acessos do
   [guia](../FRONTEND.md#demonstração-sintética-isolada).
2. Buscar Aurora/Bento, abrir ficha e histórico, conferir três consultas e registros
   relacionados. Consulta não oferece escrita; editor/admin mantêm seus fluxos.
3. Abrir Dashboard: período inicial do mês até hoje contém oito atendimentos.
4. Ampliar início para o primeiro dia de cinco meses antes da âncora. Na execução
   de03/11: `2026-06-01` a `2026-11-03`; série mensal, tabela e paginação preenchidas.
5. Combinar nome/ID, sexo feminino, projeto de Aurora e pendência aberta: três
   consultas; alternar ordenação e exportar CSV. Lotes só respondem ao período e
   à autorização própria, não aos filtros da população clínica.

| Perfil | Pacientes | Atendimentos no recorte completo | Pendências abertas/em andamento | Lotes no recorte completo | Lotes no mês |
| --- | ---: | ---: | ---: | ---: | ---: |
| Consulta | 8 | 24 | 4 | Sem permissão | Sem permissão |
| Edição | 9 | 24 | 4 | 2 | 2 |
| Administração | 10 | 27 | 5 | 3 | 2 |

Íris e seu lote não são acessíveis por Consulta/Edição. A capacidade de indicador
é nominal para os dois usuários fictícios, sem nova concessão por perfil no produto.
Os dois CSVs existentes foram baixados pelo navegador: pacientes da página e todos
os atendimentos filtrados, incluindo resultados além da primeira página.

## Provas e limites

Após as validações isoladas, stop/start recriou a demonstração limpa com o
código final. O mesmo `demo-base.spec.ts` foi executado também contra o ambiente
servido4177/API6062: **4/4** em22s, com reexecução do seed e leitura dos recursos,
login/UI/CSV dos três perfis. Resultado sanitizado em
[AMBIENTE_SERVIDO.json](../evidencias/demo_chagas_2026_11_03/AMBIENTE_SERVIDO.json).
A demonstração permanece pronta, com10pacientes/27consultas; a verificação não
criou pacientes ou atendimentos. Logs/fixture privados no diretório informado por
`make dev-sintetico-status`; nenhum segredo foi incluído na evidência.

- `make frontend-demo-test COMPACT=1`: **4/4**, Chromium/API/PostgreSQL reais,
  idempotência sem alterar auditoria, recusas de destino/política/recibo, dez
  pacientes/27consultas e releitura dos recursos clínicos. Três perfis: SQL
  independente comparado a indicadores, série, resultados/ordem/página, cada
  filtro disponível e combinação; filtros e downloads também exercitados pela UI.
  CSV do dashboard conferido com volume/escopo e auditoria. Capturas1440/390,
  Axe e viewport aprovados. Log `/tmp/ambulatorio-check-pv0qkepj/output.log`;
  resultado `/tmp/etapa6-frontend-YG8e1C/results.json`.
- `make frontend-build frontend-unit-test workflow-test COMPACT=1`: build,
  **369/369** unidades frontend e **31/31** workflow aprovados;
  `/tmp/ambulatorio-check-u0zy2dwy/output.log`.
- `make project-check COMPACT=1 DB_ENV=local ...`: **50/50scriptsSQL**, docs e
  diff/status em outro banco `synthetic_demo_validation_*`, com migrations02–79.
  Log `/tmp/ambulatorio-check-2vu328e_/output.log`; banco de validação removido.
- Regressão focada com fixture antiga: `bash tests/frontend/test_e2e.sh
  dashboard.spec.ts final-stabilization.spec.ts demo-catalogo.spec.ts`, **7/7**;
  `/tmp/etapa6-frontend-lyVjGr/results.json`. Não se apresenta isso como E2E global.
  Backend não mudou; build aprovado pelo alvo demo. Sem repetir suíte clínica
  integral, importador ou suíte global E2E para esta unidade.

[Evidência sanitizada dos quatro cenários](../evidencias/demo_chagas_2026_11_03/RESULTADOS.json),
[Administração1440](../evidencias/demo_chagas_2026_11_03/dashboard-administracao-1440.png),
[Edição1440](../evidencias/demo_chagas_2026_11_03/dashboard-edicao-1440.png),
[Consulta390](../evidencias/demo_chagas_2026_11_03/dashboard-consulta-390.png) e
[histórico](../evidencias/demo_chagas_2026_11_03/historico-consulta.png).
Capturas inspecionadas; layout existente preservado. A série com seis meses
revelou `scrollable-region-focusable`: correção mínima `tabIndex=0` no gráfico,
confirmada por Axe e foco de teclado. Nenhum dado de sucesso foi mockado.

Falhas intermediárias: código de exame ajustado ao catálogo existente
`eletrocardiograma`; teste esperava404 onde contrato retorna403; navegação direta
recarregava sessão em memória, substituída por links reais; menu mobile fechado
exigia restaurar viewport para navegação desktop; gráfico sem foco corrigido.
Uma tentativa de runner recusou porta ocupada antes de criar banco. Tentativa
inicial de project-check no banco demo parou na proteção nominal do SQL33;
a demonstração foi integralmente recriada depois, e SQL geral passou em banco
separado. Os testes não relaxaram essas proteções. Reexecuções finais aprovadas.

Aceite clínico/humano, M3/8V1/8V2 e funcionalidades ainda sem contrato continuam
pendentes.
