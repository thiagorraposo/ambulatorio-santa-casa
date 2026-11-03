# Estado atual do projeto

**Continuidade M3 — 03/11/2026:** a revisão humana comparativa está
temporariamente adiada para priorizar a continuidade de M3. As validações técnicas
continuam obrigatórias e os aceites humanos permanecem pendentes. A restrição de
congelamento anterior foi substituída pelo comando de continuidade, preservando
seu histórico. Fila e checkpoint no [plano vigente](execucao/PLANO_M3_2026_11_03.md).
As 306 unidades e 118 E2E anteriores foram aprovados por composição; não houve
nova execução integral no último SHA. Novas evidências serão registradas por unidade.


**Histórico da retomada visual de 03/11:** atendimento organizado nas 12 seções
informacionais, pacientes/formulários/ficha e componentes compartilhados
aproximados da referência. Contratos, perfis e confirmações próprias preservados.
[Comparação renderizada, suporte por seção e validações](validacoes/ADEQUACAO_VISUAL_FRONTEND_2026_11_03.md).
O congelamento abaixo descreve o candidato anterior; esta retomada não o substitui
nem conclui M3/8V1/8V2.

**Congelamento temporário para apresentação:** candidato `c4a3c99`, runtime
preservado, builds e40 E2E aprovados e ensaio separado no navegador/API/PostgreSQL
sintéticos. [SHA completo, roteiro, evidências, ressalvas e contingência](validacoes/CONGELAMENTO_DEMONSTRACAO_2026_11_02.md).
HUM-M3-03 permanece aberto; M3 não concluído nem homologado. Não retomar
expansão automaticamente após esse marco; cadastro por Edição e8D preservados.

**Decisões posteriores aprovadas:** [produto M3 de02/11](dados/DECISOES_PRODUTO_M3_2026_11_02.md).
Esta atualização registra política, sem mudar o runtime comprovado. A restrição
atual de cadastro por Edição passa a ser lacuna de implementação, com vínculo
automático específico autorizado; demais novas regras têm entrega própria.

Atualizado em: 2026-11-02. Síntese de implementação e evidências existentes;
esta atualização documental não reexecuta as suítes da aplicação.

## Atualização após avaliação humana M3

A avaliação com a equipe do Centro de Pesquisa em Saúde da Santa Casa foi
**REALIZADA — COM PROBLEMAS IDENTIFICADOS**. **ACEITE INTEGRAL NÃO REGISTRADO**;
data exata da sessão, ambiente efetivamente usado e commit não foram confirmados.
Fonte: [relato formal do responsável e decisões de produto](validacoes/AVALIACAO_HUMANA_EQUIPE_SANTA_CASA_M3.md).
M1/M2 não são reabertos; as evidências abaixo permanecem válidas nos seus recortes.

| Prioridade | Estado atual versus requisito novo | Próxima validação |
| --- | --- | --- |
| P0 · confirmação de atendimento | Falha humana relatada após novo cadastro; mensagem genérica, sem causa/HTTP/campo comprovados. Lacuna de feedback confirmada por inspeção, não reprodução | Reproduzir UI/API/PostgreSQL sintético; corrigir causa real e validar persistência novo/existente, erros por campo, permissão/conflito e recibo sem duplicação |
| P1 · cadastro/edição por Edição | Nova política desejada ainda não validada. Cadastro atualmente restringe Edição em vinculo_explicito; PATCH cadastral versionado/auditado já existe | Contratar acesso inicial ao criado sem vínculo automático/global; capacidade/backend/UI, whitelist cadastral, perfis e releitura |
| P1 · gestão8D | [Listagem e detalhe mínimos integrados](validacoes/VALIDACAO_8D1_LEITURA_MINIMA.md#consulta-individual-mínima--retomada-de-6764cb8); ampliação ainda incompleta; criar conta agora explicitamente8D2B.3/U.3, USR20–24, preservando19EX | Mínimos determinados e P-08 específico; leitura, comandos, auditoria, sessão e provisão segura por recorte |
| P1 · cobertura frontend | Recortes B/U tecnicamente comprovados não constituem frontend completo; insuficiência relatada pela equipe permanece aberta | [Matriz dirigida de cobertura](frontend/MATRIZ_FIGMA_FRONTEND.md#cobertura-funcional-dirigida-após-avaliação-humana), DoD/prontidão integrada e nova avaliação dos cenários afetados |

Candidato funcional anterior `a84001a` preservado. A existência de um percurso
sintético positivo não fecha a falha humana com entradas não conhecidas.
Nesta entrega foram feitas somente inspeções de código e documentação; nenhum
reteste clínico, migration, dado real ou alteração da aplicação. Não declarar
M3 tecnicamente concluída, formalmente aceita, percentual de cobertura ou EVM.
Retomada funcional: [checkpoint/fila P0→P1→P2](execucao/PLANO_M3_2026_11_03.md#5-fila-dinâmica-e-regra-de-seleção).

## Escopo e estágio

O objetivo aprovado é entregar o protótipo como produto completo, incluindo
funcionalidades, experiência de uso e fidelidade visual. Os antigos destinos VP
estão incluídos como PC. O [roadmap](PROXIMOS_PASSOS.md) define M1–M5; o
[catálogo](frontend/ENTREGAS_DO_PRODUTO.md) define cada entrega e seu aceite.
As estimativas anteriores de 65% e aproximadamente 20 entregas não medem esse
escopo. Detalhes clínicos/operacionais ainda abertos não são decisões aprovadas.

| Parte | Estado comprovado | Limite |
| --- | --- | --- |
| Etapas 1–4 | Contratos de dados, importador original, fundação do backend e núcleo físico entregues. | Aceites históricos não implicam operação real. |
| Etapa 5 | 5A–5E concluídas em ambiente sintético em 03/10. | [Matriz de aceite](validacoes/ACEITE_INTEGRADO_ETAPA_5.md); incrementos não aplicados ao persistente nesta entrega. |
| Etapa 6 | 6A–6B concluídas em ambiente sintético em 04/10. | [Relatório](validacoes/VALIDACAO_ETAPA_6.md). |
| Etapa 7 original | Implementação e validação técnica sintética concluídas em 15/10, com correções R7-01–07; M1 aprovado em 26/10 conforme confirmação do responsável do projeto. | [Relatório vigente](validacoes/VALIDACAO_ETAPA_7.md) e [registro do parecer](validacoes/ROTEIRO_REVISAO_CLINICA_ETAPA_7.md). |
| M2 — 7A-U1 | Cadastro precedido por busca implementado e validado tecnicamente em 26/10. | [Evidência](validacoes/VALIDACAO_7A_U1.md); M2/VU1 e percurso integrado aceitos pelo responsável em 31/10; ver parecer em 7D-A1. |
| M2 — 7D-U1/U2 | Formulário em cinco etapas, revisão e confirmação única implementados e validados tecnicamente em 26/10. | [Evidência](validacoes/VALIDACAO_7D_U1_U2.md); aceite de M2 confirmado pelo responsável em 31/10, conforme parecer em 7D-A1. |
| M2 — 7D-U4.2 | Tabelas com região rolável focável e legibilidade preservada no histórico; remoção de itens devolve foco à coleção. Formulários e diálogo exercitados em 320/390 px e zoom 200%; 55 E2E locais e quatro jobs do PR #16 passaram. | [Evidência](validacoes/VALIDACAO_7D_U4_2.md); comparação do recorte U4.2 executada em 31/10, com adaptações acessíveis e diferenças baixas registradas; aceite humano de M2 confirmado em 31/10; fidelidade integral 8V1 permanece pendente. |
| M2 — 7D-A1 | Jornada sintética pela interface, releitura de recursos, notificação e confirmação única validadas tecnicamente em 27/10; PR #15 passou Quality, Database, Backend e Frontend no run `40442560575`. | [Evidência](validacoes/VALIDACAO_7D_A1.md); M2 aprovado pelo responsável em 31/10, conforme parecer oficial no relatório. P-03 segue bloqueando qualquer mudança em semântica de concorrência. |
| Melhorias U3.1/U3.2/U3.3/U4.1 | Implementação e validação técnica próprias. | [Índice de evidências](validacoes/README.md); não concluem automaticamente U3/U4 ou fidelidade integral; M2/VU1 tem parecer próprio aprovado em 31/10. |
| Produto completo e Etapas 8–10 | Escopo planejado e critérios definidos. | Implementações adicionais, decisões específicas, implantação e homologação pendentes. |
| M3 — 8C2U.1 | Seleção e simulação mínima XLSX pela interface, com worker real e dados sintéticos; build, 219 testes de componentes e quatro E2E passaram em rodadas proporcionais. | [Evidência e consulta do CI remoto](validacoes/VALIDACAO_8C2_U1.md); aceite pendente. Dry-run não persiste registros, mas consome sequências; C2B.1 continua pendente. |
| M3 — 7B-E1B | API de episódios individuais de sorologia por atendimento, auditoria prospectiva 65 e recuperação; validações locais HTTP/SQL/importador aprovadas. | [Contrato](arquitetura/CONTRATO_SOROLOGIAS_7B_E1B.md) e [evidência/CI remoto](validacoes/VALIDACAO_7B_E1B.md); interface tem unidade própria; solicitação geral e aceite pendentes. |
| M3 — 7B-E1U | Interface por atendimento implementada: lista paginada, formulário e revisão de sete campos, rascunho/recibo recuperável; build, 228 componentes e 63 cenários E2E em rodadas proporcionais. | [Evidência](validacoes/VALIDACAO_7B_E1U.md); CI remoto próprio, solicitação geral e aceite humano permanecem separados. |
| M3 — 7B-E2B.1 | API de condição única por atendimento implementada sobre seis campos; auditoria 66, sem backfill e recibo. | [Contrato](arquitetura/CONTRATO_CONDICAO_CHAGAS_7B_E2B_1.md)/[evidência](validacoes/VALIDACAO_7B_E2B_1.md); 177 unidades,83 HTTP,37 SQL,upgrade/importador locais aprovados; CI remoto, complicações e aceite humano separados; interface com evidência própria abaixo. |
| M3 — 7B-E2U.1 | Interface dos seis campos de condição: leitura por consulta, formulário/revisão, confirmação única, rascunho e recibo; ficha/histórico conservam o contexto. | [Evidência](validacoes/VALIDACAO_7B_E2U_1.md); complicações, sintomas específicos sem contrato e aceite humano separados. |
| M3 — 8A1 | CSV real de ID/nome da página/filtros aplicados, confirmação de escopo e tratamento de respostas tardias; mantém H16 e seus três perfis. | [Evidência](validacoes/VALIDACAO_8A1.md); exportação ampliada, aceite humano e dados reais separados. |
| M3 — 7B-E2B.2 | API GET/POST de complicações repetíveis por atendimento, quatro campos SQL06, captura prospectiva 67 e recibo por UUID. | [Contrato](arquitetura/CONTRATO_COMPLICACOES_CHAGAS_7B_E2B_2.md) e [validação](validacoes/VALIDACAO_7B_E2B_2.md); interface CON-11, edição/revisão temporal e aceite humano separados. |
| M3 — 7B-E2U.2 | Interface de complicações CON-07–11: lista paginada, quatro campos revistos, episódios separados, rascunho e recibos. | [Validação](validacoes/VALIDACAO_7B_E2U_2.md); build, 256 testes de componentes/cliente e 76 E2E finais aprovados; aceite humano separado. |
| M3 — 7B-E3B.1 | GET autenticado de comorbidades ativas, ID/nome/ativo, paginação e DTO sem código inventado. | [Contrato](arquitetura/CONTRATO_COMORBIDADES_7B_E3B.md)/[validação](validacoes/VALIDACAO_7B_E3B_1.md); sem escrita/seleção clínica. Decisões delegadas e escrita E3B.2 registradas abaixo. |

| M3 — 7B-E3B.2 | Avaliação própria por atendimento, itens triestado e histórico familiar livre; SQL68 sem backfill, autorização, captura e recibo atômico. | [Contrato](arquitetura/CONTRATO_COMORBIDADES_7B_E3B.md)/[validação](validacoes/VALIDACAO_7B_E3B_2.md); tecnicamente validada, interface/aceite separados. |
| M3 — 7B-E3U | Interface de avaliação por consulta: catálogo paginado, triestado, relato familiar, revisão, rascunho e recuperação por recibo. | [Validação](validacoes/VALIDACAO_7B_E3U.md); build, 259 unidades na composição 256+3 e quatro E2E novos por rodadas focadas. Baseline anterior de 76 E2E preservada, sem repetir a suíte completa; aceite humano pendente. |

| M3 — 7B-E4B, recorte AVC | GET/POST longitudinal por paciente, quatro campos, captura SQL69, paginação e recibo; sem vínculo artificial com atendimento. | [Contrato](arquitetura/CONTRATO_EVENTOS_7B_E4B.md)/[prova](validacoes/VALIDACAO_7B_E4B_AVC.md); 183 unidades, 8 fundação, 110 HTTP, SQL/importador/upgrade validados. Interface E4U e demais EVT pendentes. |

M2/VU1 está **aprovado por aceite humano em 31/10/2026**, conforme confirmação
expressa do responsável de que passou em todos os testes de aceite humano.
O [parecer oficial](validacoes/VALIDACAO_7D_A1.md#aceite-humano-oficial-de-m2--31102026)
registra a origem e os detalhes não informados; não amplia o aceite a M3 ou à
operação com dados reais. U3/U4.1 foram reexercitadas pela suíte completa local e
pelo CI do PR #16. Em M3, C2B.1 exige resolver o consumo de sequências antes de
declarar a garantia ampliada de simulação. A frente de sorologias individuais tem API e interface implementadas, sem
inferir diagnóstico. Solicitação geral exige contrato próprio; 7B-E2B.1 tem a API de condição e 7B-E2U.1 sua interface de seis campos; 7B-E2B.2 acrescenta a API de complicações repetíveis; a interface CON-07–11 tem o incremento E2U.2, sem acrescentar sintomas
específicos ou aceitar o pacote agregado por associação. E3B.1 publica somente
o catálogo de comorbidades; E3B.2 acrescenta snapshots por consulta e histórico
familiar livre, após delegação explícita das decisões em 01/11. O legado e seu
default físico true permanecem intactos; E3U entrega a interface e sua evidência
própria, sem aceite humano presumido.
A sequência detalhada pertence
ao [roadmap](PROXIMOS_PASSOS.md#próximo-trabalho).

## Componentes e ambientes

- **PostgreSQL:** schema `ambulatorio`. A evidência persistente versionada cobre
  migrations 00–20 e 38 tabelas; incrementos posteriores foram validados em bancos
  descartáveis, incluindo as migrations 65/66/67 de captura prospectiva de sorologias/condição/complicações. O
  [modelo físico](MODELO_FISICO_ATUAL.md) separa os ambientes; o
  [dump aplicado](evidencias/schema_atual_ambulatorio.sql) é a prova estrutural.
- **Importador Python:** v1.7.0, manifesto semântico v1.4; reconciliação BZN,
  promoção seletiva, proveniência, idempotência e reprocessamento encadeado.
  [Implementação](IMPORTADOR_SINTETICO_V1.md) e
  [regras normativas](ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md) têm papéis distintos.
- **Backend NestJS/TypeScript:** API `/v1`, autenticação JWT, autorização clínica
  por perfil/vínculo, SQL parametrizado, transações e controle de versão.
  [Arquitetura](ARQUITETURA_BACKEND.md) e [contratos](arquitetura/CONTRATOS_CLINICOS_ETAPA_5.md).
- **Frontend React/TypeScript:** sessão/token em memória, busca, ficha/histórico,
  formulários 7A–7D, rascunhos, conflitos explícitos e recuperação por operação.
  Recibos/rascunhos têm limites de sessão; não há garantia geral de idempotência
  de POST entre sessões. [Guia técnico](FRONTEND.md) e
  [protocolo de recuperação](arquitetura/RECUPERACAO_OPERACOES_ETAPA_7.md).
- **CI:** Quality, Database, Backend e Frontend passaram na `main` após a
  correção de processos (run `40446442622`, commit `0603259`) e no PR #16 final
  (run `40448281960`, integrado em `a2dbd30`). O workflow usa Chromium/API e
  PostgreSQL descartável. A falha de processos e o timeout isolado de acompanhamento
  mantêm evidências/limites nos relatórios de [CI](validacoes/VALIDACAO_CI_2026_10_26.md)
  e [U4.2](validacoes/VALIDACAO_7D_U4_2.md); não se declara causa comprovada do timeout.

## Regras e limites vigentes

As [decisões clínicas D1–D12 e respostas originais](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md)
são autoritativas. Dados ambíguos e ausência legada não autorizam inferência;
`Localizado` fica fora do funcional. D9 não produz comparecimento efetivo.
A [cobertura da planilha](dados/COBERTURA_COLUNAS_PLANILHA.md) distingue promoção,
preservação e lacunas; armazenamento no banco/importador não comprova suporte HTTP.

A política clínica é desabilitada por padrão. Administração não concede por si
só gestão temporal ou autorização por fonte. Importação/revisão HTTP exigem opt-in
sintético e recusam produção. Dados reais dependem de 9D; TLS, segredos,
backup/retenção e homologação institucional seguem pendentes.

O recorte original não inclui toda a experiência e todos os módulos do produto
completo. Upload, extensões clínicas, gestão de usuários, dashboard e ferramentas
operacionais têm implementação/decisões/aceites próprios. A preparação da
migração pode avançar com ensaios sintéticos, conforme o roadmap.

## Evidências e histórico

Resultados e limitações por rodada estão no [índice de validações](validacoes/README.md).
A [fotografia anterior à reorganização](historico/ESTADO_2026_10_23.md) preserva
integralmente as continuidades e contagens antes misturadas a esta síntese.
O [registro de alterações](REGISTRO_DE_ALTERACOES.md) mantém a cronologia oficial.

Continuidade E4U AVC: interface longitudinal implementada, com build/261 unidades
e dois E2E reais focados aprovados. [Provas e limites](validacoes/VALIDACAO_7B_E4U_AVC.md);
comparação visual renderizada e aceite humano permanecem pendentes.

E4B marcapasso/CDI: backend de leitura/criação inicial implementado sobre SQL10,
com captura70 e409 em existente; [provas](validacoes/VALIDACAO_7B_E4B_DISPOSITIVOS.md).
Interface e aceite humano próprios, sem presumir resincronizador ou correção.

E4U marcapasso/CDI implementada e validada tecnicamente no recorte inicial:
[build/262 unidades/dois E2E/comparação renderizada](validacoes/VALIDACAO_7B_E4U_DISPOSITIVOS.md).
Aceite humano/visual integral e demais EVT permanecem separados.

E4B óbito inicial com data completa implementado conforme SQL10, sem upsert ou
inferência; [provas e limites](validacoes/VALIDACAO_7B_E4B_OBITO.md). Interface,
precisão parcial, aceite e conclusão do agregado permanecem separados.

E4U óbito inicial: interface integrada e VALIDADA TECNICAMENTE sobre fa2329d,
com build/263 unidades/dois E2E reais, recuperação e comparação renderizada.
[Provas e limites](validacoes/VALIDACAO_7B_E4U_OBITO.md). Precisão parcial,
ressincronizador, demais EVT e aceites continuam separados. Próxima: 7B-E5B,
conferir contrato e modelo de medicamentos antes de publicar escrita.

7B-E5B: recorte de catálogo/consulta de medicamentos por atendimento VALIDADO
TECNICAMENTE (186 unidades e15 HTTP reais). [Contrato](arquitetura/CONTRATO_MEDICAMENTOS_7B_E5B.md)
e [provas](validacoes/VALIDACAO_7B_E5B_LEITURA.md). Escrita integral depende de
identificação/apresentação/unidade/cronologia definidas; leitura E5U pode avançar
independentemente, sem prescrição ou alterações de legado.

7B-E5U consulta de medicamentos VALIDADA TECNICAMENTE, sobre cfcdf60:
[build/264 unidades/dois E2E reais](validacoes/VALIDACAO_7B_E5U_LEITURA.md).
Cadastro de medicamentos e aceite integral seguem pendentes; próximo passo da
fila é conferir o contrato7B-E6B de resultados antes de implementar a escrita.

7C-E1B E1.2, reação isolada BZN: backend VALIDADO TECNICAMENTE sobre SQL15,
com captura72; [contrato](arquitetura/CONTRATO_REACOES_BZN_7C_E1B.md) e
[provas](validacoes/VALIDACAO_7C_E1B_REACOES.md). Próxima elegível: E1.2 de7C-E1U.
E1.1 não incluída. E6 exige contrato para resultados no exame canônico H6:
SQL07 liga resultados à estrutura legada; não equiparar IDs nem migrar legado.
Essa lacuna técnica não foi declarada decisão clínica aprovada ou bloqueio humano.

7C-E1U E1.2, reação isolada BZN: interface VALIDADA TECNICAMENTE com cinco
campos/revisão/rascunho/recuperação e múltiplas intenções; [provas/limites](validacoes/VALIDACAO_7C_E1U_REACOES.md).
E1.1/aceite continuam pendentes. Próxima: contrato7B-E6B para parâmetros no exame
canônico, sem reutilizar a FK legada SQL07 ou inferir resultados/datas/diagnóstico.

7B-E6B parâmetros do exame canônico VALIDADO TECNICAMENTE: RQ-EXA-09–13/16,
SQL73,188 unidades/137 HTTP/44 SQL/upgrade sem backfill. [Contrato e limites](arquitetura/CONTRATO_RESULTADOS_7B_E6B.md).
Vínculo canônico definido tecnicamente sem reinterpretar legado SQL07; valores
textuais humanos, nenhum cálculo. Próxima: E6U desse recorte; datas/status do pai,
correções e aceite integral continuam pendentes.


Continuidade de 02/11/2026: [E6U parâmetros](validacoes/VALIDACAO_7B_E6U_PARAMETROS.md)
VALIDADA TECNICAMENTE no recorte RQ-EXA-09–13/16, com API/PostgreSQL sintético,
revisão e recuperação. Datas/status do pai e aceite humano permanecem pendentes.
Próximas unidades e estado operacional no [checkpoint único](execucao/PLANO_M3_2026_11_03.md#10-checkpoint-único-e-transferência-de-contexto).


Estado consolidado da retomada02/11: [entregas, regressão composta, candidato
a84001a e gates](validacoes/RELATORIO_EXECUCAO_M3_2026_11_02.md). Demonstração
sintética disponível para revisão; sem aceite humano novo ou conclusão deM3.
Contagem de janelas/horas não consolidada; não afirmar três janelas completas.
