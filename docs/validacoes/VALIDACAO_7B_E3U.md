# Interface de comorbidades — 7B-E3U

Data: 2026-11-01. Base `45ac491`, branch `feat/continuidade-m2-condicao`.
**Implementada e validada tecnicamente; aceite humano pendente.**
[Contrato e decisões delegadas](../arquitetura/CONTRATO_COMORBIDADES_7B_E3B.md).

## Escopo e ambiente

Rotas de leitura e criação por atendimento, acessíveis na consulta selecionada
da ficha e no detalhe do atendimento. Catálogo ativo paginado de 20 em 20,
seleção inicialmente vazia, indicadores explícitos, observações por item e
histórico de doença familiar livre independente dos exames. Revisão completa,
rascunho em memória, descarte/Escape, origem em URL e recibo existente.

Frontend/API reais e PostgreSQL 16 sintético tmpfs em localhost 55469, servidor
`ambulatorio-comorbidades-20261101`. Runner cria/remove seu próprio banco
`etapa6_frontend_*`, aplica SQL02–68 e remove logins/processos ao terminar.
API em 6071 e frontend em 4186. Nenhum dado real ou migration persistente.

## Validação proporcional

- Build e 256 testes anteriores aprovados em `/tmp/ambulatorio-check-ne863ws0/output.log`.
- Três testes novos de componentes aprovados: seleção explícita/revisão/corpo,
  consulta/recusa e erro ocultando leitura anterior, recuperação sem repetir POST.
  Log `/tmp/comorbidades-ui-unit-20261101.log`. Total vigente **259**, na composição
  256+3, sem alegar uma nova rodada completa de 259.
- Build final aprovado em `/tmp/ambulatorio-check-49ilqs8m/output.log`.
- Quatro E2E novos aprovados em composição: três em
  `/tmp/comorbidades-ui-e2e-final-20261101.log` (artefatos `/tmp/etapa6-frontend-wEAwca`)
  e leitura corrigida em `/tmp/comorbidades-ui-leitura-final-20261101.log`
  (artefatos `/tmp/etapa6-frontend-ZBTuzQ`). Sem retries configurados.
- Regressão anterior da condição, com seis campos e persistência real, passou
  na rodada inicial `/tmp/comorbidades-ui-e2e-20261101.log`. A baseline de 76
  E2E não foi repetida integralmente. Há **80 cenários cadastrados**, sem afirmar
  que a suíte completa de 80 rodou nesta sessão.

Os E2E provam rascunho/retorno, revisão/correção, dois cliques com um POST,
false/null/ausente, leitura persistida, consulta seguinte sem herança, perfil
consulta, recusa HTTP, erro de leitura sem conteúdo antigo e recuperação real
de resposta perdida após COMMIT. Catálogo sintético com 25 categorias prova
seleção em páginas distintas, persistindo somente dois itens selecionados.
Axe sem violações nos estados exercitados, 320/390 px e zoom CSS de 200%.
Captura de revisão em 390 px em `playwright-results/.../comorbidades-revisao-390.png`
no diretório de artefatos; logs/capturas em `/tmp` podem desaparecer.

## Falhas observadas e correções

Primeira rodada: dois cenários falharam antes do fluxo por catálogo sintético
vazio; fixture passou a criar 25 categorias exclusivamente no banco do runner.
Não houve remoção de asserções. Uma compilação posterior recusou a propriedade
`exact` em queryByRole da Testing Library; removida opção não suportada, sem
mudar a expectativa. Build final aprovado.

Leitura com erro: o teste usava reload, que perde a sessão somente em memória,
e depois um seletor exato que omitia a seta do link. Corrigido para navegação
interna, reconsulta real e seletor compatível com o nome acessível; a asserção de
erro e ocultação do conteúdo permaneceu. Rodada focada final passou 1/1.

Backend/SQL não mudaram após `45ac491`: preservar provas E3B.2 (182 unidades,
102 HTTP na composição, 39 SQL e upgrade). Não repetir camadas sem alteração.
CI remoto, edição/revisão temporal, aceite humano e implantação separados.

## Continuidade

Encerrar após commit desta entrega, conforme solicitação expressa do responsável.
Próxima unidade técnica: reconhecimento dirigido de 7B-E4B, conforme roadmap;
nenhuma implementação dessa unidade começou. Aceite E3B/E3U continua pendente.
