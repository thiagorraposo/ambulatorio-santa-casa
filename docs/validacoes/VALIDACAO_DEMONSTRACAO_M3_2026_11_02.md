# Ensaio integrado sintético M3 — 02/11/2026

Retomada da Janela1, base `55f82b5` + teste de ensaio e isolamento da suíte.
**Ensaio técnico parcial de apresentação comprovado; candidato integrado em
validação.** Não conclui8V2, M3 integral, homologação visual ou aceite humano.
O [plano operacional](../execucao/PLANO_M3_2026_11_03.md#11-demonstração-sintética-e-contingência)
continua sendo a fonte de limites/candidato/contingência; este relatório guarda
prova de um percurso real com navegador, API e PostgreSQL sintético.

## Percurso executado

`tests/frontend/test_e2e.sh m3-demo.spec.ts`: **1/1 aprovado em8,9s**, sem retry
ou skip, log `/tmp/m3-demo-integrada-v7.log`, artefatos
`/tmp/etapa6-frontend-nHLRB6/results.json` e `playwright-results`.
PostgreSQL16.15, tmpfs confirmado em `ambulatorio-avc-interacoes-20261101`,
localhost55457; runner criou banco/logins exclusivos, aplicou02–73 e encerrou
seus recursos. Nenhuma conexão ou alteração persistente; dados artificiais.

1. Login administrativo real, busca prévia sem correspondência e cadastro
   consciente pela UI; sem uso de seedPatient para criar a pessoa do percurso.
2. Atendimento em cinco etapas, exame genérico identificado, revisão e POST
   contado uma vez. ID do paciente/atendimento e exame retornados pela API.
3. Sorologia inconclusiva, condição cardíaca com negativa de sintomas, duas
   ocorrências de complicação, comorbidade negativa e histórico familiar
   desconhecido com relato. Formulário, revisão e releitura pela UI/API.
   Nenhuma interpretação clínica inferida a partir dos valores sintéticos.
4. Navegação do exame correto ao parâmetro: valor `001,2300 literal`, unidade,
   referência e interpretação humana. COMMIT com resposta perdida provocado
   no transporte; recibo recuperado **sem segundo POST**. Releitura preserva ID.
5. Volta à consulta e ao histórico, criação de segunda consulta pela UI;
   sorologias/condição/complicações/comorbidades não são herdadas. Diagnóstico
   mantém os campos clínicos null da âncora técnica exigida pelo contrato E1B.
6. Acesso de consulta explicitamente concedido no setup sintético; logout/login
   real. Leitura do parâmetro sem ação de criação e POST recusado com403.
7. Busca filtrada da pessoa, revisão da exportação e download CSV efetivo,
   contendo a pessoa correta. Nenhum estado clínico persistido no navegador.
8. Axe e ajuste ao viewport no resultado integrado em1440/390px; capturas
   [desktop](../frontend/visuais/m3-percurso-parametros-1440.png) e
   [estreita](../frontend/visuais/m3-percurso-parametros-390.png).

IDs apenas dessa execução descartável, registrados também nas annotations:
paciente9007199254764612, consultas22/23, exame24, parâmetro1. Não assumir esses
IDs no próximo bootstrap: usar os retornados pelo roteiro/fixture.

## Ajustes do roteiro e limites

Rodadas de autoria anteriores falharam por nomes acessíveis supostos, uso de
`page.goto` que recarrega e descarta a sessão em memória e menu Sair oculto em
viewport estreito. O roteiro final usa links reais e retorna ao desktop após
as capturas. Uma expectativa de diagnóstico null foi confrontada com o
[contrato E1B](../arquitetura/CONTRATO_SOROLOGIAS_7B_E1B.md#transação-âncora-e-auditoria):
sorologia sem diagnóstico cria âncora técnica com campos clínicos null. O teste
final exige essa ausência de inferência e preservação após outros módulos;
não modifica o comportamento para satisfazer uma expectativa equivocada.

A simulação XLSX/relatório tem [ensaio próprio](VALIDACAO_8C2_U1_RELATORIO.md),
com6/3/2/1, no-op e rejeição precoce; confirmação UI permanece bloqueada.
AVC, dispositivos, óbito, medicamentos e reação BZN têm provas por recorte;
não foram todos exercitados nesta mesma pessoa ou como apresentação humana.
Não há parecer clínico/visual registrado por este ensaio. A regressão frontend
integral está em andamento e não é declarada aprovada aqui. Candidato anterior
continua preservado até fechar essa validação e identificar SHA final.


Continuidade: os dois roteiros de catálogo foram corrigidos para percorrer a
segunda página quando outras categorias precedem a canônica. O ensaio passou
novamente em8,4s no checkout corrigido com o catálogo composto.
[Regressão e validação proporcional das correções](VALIDACAO_REGRESSAO_FRONTEND_M3_2026_11_02.md).
A expressão “regressão em andamento” acima descreve a prova inicial; a rodada
terminou97/101 e os quatro casos falhos passaram após correção dirigida.
