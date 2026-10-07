# Caderno visual — observação e proposta

Data: 2026-10-05; código `29b3186`. Este caderno apoia a
[visão de produto](../VISAO_E_ESPECIFICACAO.md) e a
[matriz individual](../MATRIZ_FIGMA_FRONTEND.md). Capturas mostram o código
existente; wireframes mostram propostas. Nenhuma imagem é aceite de persistência.

## Método e limites

- Chromium headless, locale pt-BR/fuso America/Sao_Paulo; viewport desktop
  1440×960 e móvel 390×844. Capturas da área visível, sem rolar todas as seções.
- Protótipo executado de cópia em `/tmp`, com seu lockfile, Vite local na porta
  8443; frontend original servido por Vite local na 4180. As portas usuais de
  prévia não estavam ativas no início. Nenhuma fonte/lockfile foi alterada.
- **Frontend com todas as requisições `/v1` interceptadas por fixture sintética.**
  Leituras e respostas simuladas de 403/identidade permitiram observar navegação,
  remontagem e estados. Não houve API/PostgreSQL reais, migrations nem nova
  prova de autorização/persistência. Os dois envios de retorno da inspeção foram
  interceptados: um recebeu 403, outro confirmação; nenhum foi gravação real.
- Pessoa sintética 001, nascimento 14/03/1965 e 61 anos, aparece nas duas fichas.
  Histórico/catálogos/demais valores diferem entre fixtures; comparar hierarquia
  e controles, sem tratar discrepância de fixture como defeito de contrato.
- Fontes externas do protótipo bloqueadas; fallback local pode mudar tipografia.
  Dados, nomes, endereços e identidades das imagens são sintéticos. A tela de
  login Figma exibe credenciais **locais de demonstração já presentes na fonte**,
  excluídas do produto. Não há token, credencial real ou dado clínico real nas imagens.
- Acesso por teclado, zoom 200%, Axe completo e revisão com equipe pertencem ao
  aceite futuro. Medir largura do body não comprova usabilidade móvel.
- Os cinco diagramas Mermaid da visão foram analisados e renderizados com
  Mermaid em Chromium; os três SVG propostos foram renderizados e inspecionados.
  Dependências e roteiros dessa inspeção ficaram em `/tmp`, fora do projeto.

## Comparações em desktop

Cada imagem pode ser aberta para inspecionar a viewport original.
Anotações abaixo correspondem à região visível, não a toda a tela lógica.

| Tela | Protótipo Figma Make | Frontend atual |
| --- | --- | --- |
| Login | ![Login Figma](figma-login.png) | ![Login atual](frontend-login.png) |
| Início | ![Início Figma](figma-inicio.png) | ![Início atual](frontend-inicio.png) |
| Pacientes | ![Pacientes Figma](figma-pacientes.png) | ![Pacientes atual](frontend-pacientes.png) |
| Cadastro, estado inicial | ![Busca prévia Figma](figma-cadastro.png) | ![Busca e cadastro atuais](frontend-cadastro.png) |
| Ficha, primeira seção | ![Resumo Figma](figma-ficha.png) | ![Dados atuais](frontend-ficha.png) |
| Novo atendimento, início | ![Etapas Figma](figma-atendimento.png) | ![Formulário atual](frontend-atendimento.png) |

| Anotação | Região/elementos comparados e consequência |
| --- | --- |
| V-01 — Login | Cartão/título/rótulos e área de demonstração: [LOG](../MATRIZ_FIGMA_FRONTEND.md#log--login). O timer local do Figma e a sessão HTTP atual são distinguidos pelo código; a imagem não prova autenticação. |
| V-02 — Navegação e início | Sidebar à esquerda: Figma contém seis áreas operacionais; aplicação contém Início/Pacientes/Minha conta. Conteúdo principal: quatro KPIs/listas viraram dois atalhos. [NAV/HOM](../MATRIZ_FIGMA_FRONTEND.md#nav--layout-menus-e-navegação), entregas 8A/8B/8C/8D conforme capacidade. |
| V-03 — Busca | Filtros/colunas no conteúdo principal: Figma oferece origem, código e dados locais; aplicação usa nome/sexo e lista ID/nome, página real. [LIS](../MATRIZ_FIGMA_FRONTEND.md#lis--pacientes-filtros-tabela-e-paginação), expansão 8B3 por fatia. Captura não autoriza inferir total. |
| V-04 — Cadastro | Figma começa pela busca e etapas; aplicação mostra busca e campos de cadastro simultaneamente. [FM-CAD-01](../MATRIZ_FIGMA_FRONTEND.md#fm-cad-01) → 7A-U1. O gate de escolha humana é proposta, não comportamento atual. |
| V-05 — Ficha | Cabeçalho acima das abas e cards abaixo: Figma prioriza identidade/diagnóstico/última consulta; aplicação abre Dados do paciente, com altura maior e informações clínicas em outros recursos. [FIC/RES](../MATRIZ_FIGMA_FRONTEND.md#fic--cabeçalho-e-abas-da-ficha) → 7D-U3. Código/origem exigem projeção; ID real já existe. |
| V-06 — Atendimento | Figma tem menu de doze seções; atual é formulário longo. [ATD](../MATRIZ_FIGMA_FRONTEND.md#atd--novo-atendimento-estrutura-passos-revisão-e-ações) → 7D-U1/U2. Cinco etapas propostas cobrem o recorte publicado, com revisão completa; demais módulos mantêm destino posterior. |

### Revisão do protótipo e áreas sem tela atual equivalente

![Revisão demonstrativa do atendimento](figma-revisao.png)

**V-07:** modal mostra oito grupos resumidos, sem todos os valores/filhos.
[FM-ATD-05–14](../MATRIZ_FIGMA_FRONTEND.md#fm-atd-05) → revisão completa 7D-U2.
A captura não demonstra que os campos serão guardados: análise de `handleSave`
identificou descarte de condições/sintomas/eventos/dispositivos/óbito, perda de
algumas medidas isoladas e precedência de uma observação sobre outra.

| Área demonstrativa sem equivalente global atual | Captura | Destino |
| --- | --- | --- |
| Pendência, modal de revisão | ![Pendência Figma](figma-pendencia.png) | Pendência por paciente já existe; fila/nota/responsável dependem 8A2/8A3 e P-04. |
| Importação, relatório após timer | ![Importação Figma](figma-importacao.png) | 8C1 e 8C2 em unidades; contagens não provêm de arquivo real no protótipo. |
| Dashboard | ![Dashboard Figma](figma-dashboard.png) | P-05 → 8B1/8B2; agregados antes dos gráficos; CSV atual tem outro escopo. |
| Usuários | ![Usuários Figma](figma-usuarios.png) | P-08 → 8D1/8D2; contexto local não administra identidade do backend. |

## Comparação móvel — mesma ficha, 390×844

| Protótipo | Frontend atual |
| --- | --- |
| ![Ficha Figma a 390 px](figma-ficha-390.png) | ![Ficha atual a 390 px](frontend-ficha-390.png) |

**V-08 / OBS-F-MOBILE / OBS-A-MOBILE:** `body.scrollWidth` foi 390 em ambas.
Mesmo assim, a sidebar fixa do Figma ocupa 224 px e o conteúdo fica cortado;
na aplicação a navegação fica acima do conteúdo. O reflow atual é melhor nesse
estado observado, mas a captura não certifica todos os formulários/diálogos ou
320 px/zoom. [FM-NAV-01](../MATRIZ_FIGMA_FRONTEND.md#fm-nav-01) e
[EST](../MATRIZ_FIGMA_FRONTEND.md#est--componentes-estados-rascunhos-e-confirmação) → 7D-U4.

## Observações de navegação e recuperação

| Evidência observada | Resultado e vínculo exato |
| --- | --- |
| OBS-F01 | Clicar Editar paciente manteve o mesmo conteúdo principal. [FM-FIC-07](../MATRIZ_FIGMA_FRONTEND.md#fm-fic-07): botão sem ação no Figma; edição atual existe. |
| OBS-F-ABA | Abas Atendimentos, Chagas e Sorologia, Projetos, Exames, Tratamentos, Avaliação Clínica, Encaminhamentos e Notificação foram abertas; painéis/títulos apareceram. Composição observada, não prova de todos os campos/botões. Grupos HIS/CHA/PRO/EXA/TRA/AVL/ENC/NOT. |
| OBS-F-ETAPA | Novo atendimento aberto, data sintética preenchida, seção 12 e modal Revisão abertos, Voltar e editar/Cancelar percorridos. FM-ATD-02–14; campos clínicos não foram gravados nesta inspeção. |
| OBS-F-OPERACIONAL | Modal de pendência, relatório simulado de importação, dashboard e usuários foram abertos. Grupos PEN/IMP/DAS/USR; suporte/persistência avaliados estaticamente. |
| OBS-A-CONSULTA | Login, início, busca, ficha, cadastro e novo atendimento renderizados com fixture interceptada; rascunho foi mantido ao sair do atendimento. Não houve envio real de cadastro/atendimento. |
| OBS-R7-05 | Link principal Registrar acompanhamento de Atendimento 101 tinha href `/pacientes/1/registrar?tipo=bzn`, sem `atendimentoId`. [FM-HIS-15](../MATRIZ_FIGMA_FRONTEND.md#fm-his-15) → 7D-R1. ClinicalActions já inclui o parâmetro em outros atalhos. |
| OBS-R7-02 | Um envio interceptado recebeu 403; após restaurar leituras e disparar foco, Salvar registro continuou desabilitado. [FM-EST-11](../MATRIZ_FIGMA_FRONTEND.md#fm-est-11) → 7D-R2. Contagem de envios até esse ponto: 1. |
| OBS-R7-07 | Outra sessão confirmou retorno com ID 201; falha de me ocultou o formulário, recuperação da mesma identidade perdeu recibo e data. Resultado observado: recibos visíveis 0, data vazia; envios totais 2, ambos intencionais e interceptados. [FM-EST-15](../MATRIZ_FIGMA_FRONTEND.md#fm-est-15) → 7D-R4. |

![Intenção bloqueada após 403](frontend-escrita-403.png)

**V-09:** erro e rascunho preservados, botão bloqueado; nenhuma ação conclui a
retomada. A captura não representa restauração de vínculo real no banco.

![Confirmação antes da falha de identidade](frontend-confirmacao.png)

**V-10:** captura da confirmação **antes** da falha. A perda posterior foi
verificada pelo DOM (recibo 0/data vazia), sem captura posterior. Não apresentar
esta imagem como evidência de confirmação preservada; ela demonstra o estado
que o produto precisa conservar.

R7-01, R7-03, R7-04 e R7-06 foram reavaliadas estaticamente, sem nova reprodução
SQL/HTTP real. As [evidências históricas](../../validacoes/VALIDACAO_ETAPA_7.md)
não foram repetidas nesta tarefa documental. `OBS` na matriz se limita aos
pontos nomeados aqui; os demais campos/transições têm evidência `EST`.

## Wireframes propostos

Não são exportações do Figma nem telas implementadas. São SVGs documentais com
título/descrição e marca PROPOSTA, usando dados sintéticos. A composição desktop
ilustra hierarquia; a implementação deverá atender também 320/390 px e teclado.

| Proposta | O que torna explícito | Requisitos/pacotes |
| --- | --- | --- |
| [Ficha com fonte temporal](proposta-ficha.svg) | Pessoa/consulta escolhida, dados desconhecidos, última consulta e recursos canônicos separados. | FIC/RES/HIS/CHA/AVL → 7D-U3/R1. |
| [Atendimento com etapas/revisão](proposta-atendimento.svg) | Cinco etapas, todos os preenchimentos revisados, uma confirmação inicial e acompanhamento separado. | ATD/DIA/MED/EXN/ACO → 7D-U1/U2/R4, 7B-R2. |
| [Recibo e recuperação](proposta-recuperacao.svg) | Consulta confirmada permanece; operação incerta mantém valores e verifica resultado sem repetir escrita. | EST → 7D-R2/R4/R5/R6 e P-02. |

## Verificação documental desta rodada

`make docs-check COMPACT=1` e `git diff --check` aprovados. Conferidos 1.507
links/âncoras locais nas fontes alteradas/novas, sem destino quebrado; 580 IDs FM
e RQ únicos e todos ligados aos 74 conjuntos/pacotes do roadmap. Cada pacote
contém escopo, dependências, trabalho por camada, critérios/casos, validação,
evidência e condição de conclusão; conjuntos maiores nomeiam unidades separadas.
As 21 PNGs têm dimensões esperadas, os três SVGs são XML válido e foram
inspecionados, e os cinco Mermaid foram analisados/renderizados. Diff/status
revisados: somente documentação/visuais, sem implementação ou commit/push.

## Como produzir evidência de aceite depois

Para cada unidade do roadmap, registrar RQ exercitados, revisão de código,
ambiente/fixture, passos, IDs, asserts e resultado. Captura ajuda a comparar
visual e contexto; gravação exige UI/API/PostgreSQL reais do runner sintético.
Não repetir automaticamente o envio para produzir sucesso, nem considerar
primeira página vazia como prova de não aplicação. Atualizar destino/estado do
requisito somente com evidência correspondente e aceite registrado.
