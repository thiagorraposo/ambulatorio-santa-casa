# 7D-U3.3 — histórico, detalhe e exames com contexto recuperável

Implementação e execuções: 2026-10-20. Encerramento documental: 2026-10-21.
Estado: implementação e validação técnica aprovadas no recorte descrito.

Unidade do [roadmap](../frontend/ENTREGAS_DO_PRODUTO.md#7d-u3), continuando
[U3.1](VALIDACAO_7D_U3_1.md) e [U3.2](VALIDACAO_7D_U3_2.md).
A seleção deste próximo trabalho segue a sequência documentada e os contratos
H3/H5–H12 existentes. Não depende das decisões abertas sobre etapas de cadastro,
formulário guiado ou novos módulos. Alterações locais anteriores de navegação
e de datas legadas foram preservadas.

## Plano e critérios de aceite

1. Abrir o atendimento correto a partir do histórico, último atendimento,
   seleção clínica ou recurso do paciente. Retornar explicitamente à mesma
   ficha, aba, seleção e páginas, incluindo o exame expandido.
2. Aceitar `retorno` somente para a ficha do mesmo paciente; rejeitar origem
   externa, outro paciente e rota de escrita/detalhe; remover retornos encadeados.
   Ausência/invalidade usa o histórico padrão. IDs permanecem textuais.
3. Mostrar data, contexto e observações do atendimento; detalhe conserva
   avaliação, diagnóstico, exames, pendências e familiares da consulta indicada.
   Não inferir procedência, completude ou histórico de projetos sem contrato.
4. Agrupar os exames da página por `trazido` e `solicitado`. Cada exame expande
   identificação, resultado, observações e vínculo disponível. `exameId` na URL
   preserva expansão ao voltar e reautenticar; vazio não implica negativo.
5. Oferecer links às áreas canônicas do paciente com contexto e páginas,
   distinguindo estado atual do paciente de fatos registrados na consulta.
6. Ocultar conteúdo anterior em carga/falha/recusa; manter paginação por recurso,
   foco ao paginar, teclado, 320/390 px e revisão visual desktop.

## Implementação e rastreabilidade

- `AttendanceLink`, último atendimento e seleção clínica levam um retorno
  validado; o detalhe oferece Voltar à ficha de origem. Um link à própria
  consulta conserva a URL atual, evitando perder paginação e retorno.
- Histórico acrescenta os dois indicadores de contexto, inclusive desconhecido.
  O detalhe mantém sua fonte temporal e links para BZN/retornos, projetos,
  notificação, encaminhamentos e pendências. Projetos/notificação não são
  apresentados como snapshots históricos daquela consulta.
- Exames compartilham agrupamento e expansão controlada por URL na ficha e no
  detalhe. Contagens e vazios se referem somente à página. Um bloco desconhecido
  continua visível em grupo próprio, sem ser classificado como trazido/solicitado.
- Paginação das coleções foca o título após resolver a leitura, inclusive vazia
  ou com erro. Cabeçalho e último atendimento usam composição mais compacta;
  o texto permanece completo, sem corte ou limite artificial de linhas.

Requisitos exercitados: RQ-HIS-01/02/05/06/07/08/09/10/14,
RQ-EXA-01–06/14 e o retorno de RQ-FIC-10/14 e RQ-RES-30/31 no recorte de
navegação. RQ-HIS-03/04/11 (procedência, completude e projetos históricos),
RQ-EXA-07–13 (datas/estado/resultados estruturados) e adicionar/corrigir exames
continuam nas entregas posteriores da matriz; não são aceitos por associação.

## Evidências e limites

Os testes de componentes de navegação/exames cobrem IDs acima de 2^53,
retorno validado, preservação de scopes, URL direta, expansão, ausência de vínculo,
bloco desconhecido, página vazia, carga, 503, 403/404 e foco.

`tests/frontend/u33-navigation.spec.ts` usa API/PostgreSQL reais exclusivamente
sintéticos: duas consultas com datas distintas, exames trazido/solicitado,
resultado/observação discriminantes e pendência. Consulta e edição percorrem
histórico → detalhe → área Projetos → voltar → exames → detalhe → voltar,
sem mutação clínica da interface. Outro cenário atrasa a resposta de leitura
real e revoga o vínculo antes de paginar. Teclado/Enter, Axe e reflow são
verificados; capturas desktop/390 px documentam composição. Não há escrita
clínica nova nem mudança de schema/API/importador nesta unidade.

Resultados já obtidos:

- Build TypeScript/Vite final aprovado, log
  `/tmp/ambulatorio-check-husud3mv/output.log`.
- Suíte completa inicial de componentes: 190 testes aprovados, log
  `/tmp/ambulatorio-check-sb2ylu4z/output.log`. Após completar os links canônicos,
  a regressão dos seis arquivos de leitura afetados passou com 64 testes,
  log `/tmp/ambulatorio-u33-final-components.log`.
- Um teste inicial de interrupção durante hash ultrapassou a espera padrão sob
  concorrência da suíte. O arquivo focado passou com nove testes; a suíte
  completa posterior passou com os 190 testes. Sem alteração de produção para
  contornar essa falha: `/tmp/ambulatorio-check-_m3ln7bx/output.log`.
- Rodada final focada: **13/13 cenários de navegador aprovados**, sem retry,
  log `/tmp/ambulatorio-check-1j4h6xoe/output.log`, artefatos
  `/tmp/etapa6-frontend-zg3qMF`. Inclui os oito cenários de leitura/sessão/acesso,
  último atendimento, percurso integrado de escrita e os três cenários U3.3.
  A rodada completa anterior terminou com 38/44 aprovados e seis falhas de
  fixture/asserções descritas abaixo; todos os seis casos passaram nesta rodada
  focada. As demais aprovações foram reaproveitadas, sem declarar uma nova
  execução integral de 44 casos sobre o estado final.
  API em 6063 e Vite em 4178; banco descartável
  `etapa6_frontend_2699053_1792503539_7f81b2` em 127.0.0.1:55457.
- IDs sintéticos do percurso consulta: paciente `9007199254778759`, consultas
  `23/24`, exames `25/26`; edição: paciente `9007199254778760`, consultas
  `25/26`, exames `27/28`. IDs vieram da API e estão anotados em `results.json`.
- [Capturas revisadas](../frontend/visuais/README.md#continuidade-de-2026-10-20--exames-da-unidade-u33)
  incluem desktop/390 px com dados reais sintéticos. Os novos percursos passaram
  teclado/Enter, Axe, reflow 320/390 px e zoom 200%. Cabeçalho compacto melhora
  a densidade desktop; a composição mobile ainda é mais extensa que o protótipo.

A primeira rodada completa de navegador executou os novos cenários antes da
fixture de leitura e alterou contagens globais esperadas por três testes. O
arquivo novo foi organizado após a regressão de leitura, seguindo a convenção
dos demais testes que criam pacientes. Também foram atualizadas asserções de
links/recarga para conservar `retorno` e `exameId`, e a observação do percurso
integrado foi localizada na linha da consulta pelo ID, pois o resumo também a
exibe. As verificações de acesso, conteúdo e preservação foram mantidas.
A rodada focada acima comprovou as correções. As capturas de histórico/detalhe
receberam ainda espera explícita pelo conteúdo antes da imagem, sem alterar o
percurso ou as asserções já aprovadas.

Documentação, destinos dos links locais, diff e status foram revisados no
encerramento. Nenhuma migration, evidência estrutural, dado real, commit ou push.
O banco e os processos de cada runner foram removidos pelos próprios runners;
a demonstração separada foi preservada. Backend/importador/SQL não foram
reexecutados: a entrega altera apresentação/navegação, sem novos contratos ou
persistência. O teste de backend já modificado antes desta tarefa permanece
preservado e não integra o aceite desta unidade.

Aceite clínico, fidelidade visual integral e VU1 permanecem pendentes.
