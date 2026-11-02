# Métricas e projeção de busca — proposta P-05

2026-11-02, Janela 1 de M3. **Proposta não aprovada.** Prepara 8B1D/8B3D sem
definir política clínica, score, acesso ampliado ou contrato de exportação.
Fontes: [8B1D](../frontend/ENTREGAS_DO_PRODUTO.md#8b1d),
[8B3D](../frontend/ENTREGAS_DO_PRODUTO.md#8b3d),
[visão DAS](../frontend/VISAO_E_ESPECIFICACAO.md#dashboard-e-csv--das) e
[P-05](../frontend/VISAO_E_ESPECIFICACAO.md#decisões-de-produto-e-limites-ainda-pendentes).

## Definições a aprovar antes de indicadores

| Indicador candidato do catálogo | Escolha pendente, sem fórmula assumida |
| --- | --- |
| Pacientes cadastrados | Estoque atual autorizado ou pessoas com cadastro/atendimento no período? Definir fonte temporal; timestamp técnico de importação não prova cadastro original |
| Atendimentos | Quantidade de consultas, não pessoas; aprovar campo temporal, limites do período e tratamento de informação apenas anual sem fabricar consultas |
| Pendências abertas | Aprovar estados incluídos e data de referência; `null`, `nao_informado` e erro de importação não entram por inferência textual |
| Lotes | Definir se conta recebidos, concluídos ou todos; data de criação/aplicação, no-op e elos explícitos têm significados distintos |

Cada resposta precisa especificar população autorizada, unidade contada,
fonte/instante, filtros, valor desconhecido e resultado vazio. Consulta com falha
não é zero. Contadores não serão calculados percorrendo páginas da UI. Indicadores
de completude/origem/projeto permanecem sem score ou fórmula até decisão própria.

### Fixture numérica de decisão, somente documental

Período ilustrativo: datas de atendimento 30/10/2026 e31/10/2026, excluindo
01/11/2026. Não escolhe timezone ou regra de timestamp para o contrato futuro.

| Pessoa sintética | Visível ao leitor L | Datas de consultas | Projetos |
| --- | --- | --- | --- |
| A | Sim | 28/10,30/10,31/10 e01/11/2026 | X eY |
| B | Sim | 31/10/2026 | X |
| C | Não | 30/10/2026 | X |
| D | Sim | Nenhuma | Y |

Se a definição aprovada for consultas autorizadas nas duas datas, L conta **3**;
se for pessoas com consulta no período, conta **2**; se for estoque atual de
pessoas autorizadas, conta **3**. C não entra em nenhuma dessas populações de L.
Projetos do estoque de L: X=2,Y=2; pessoas distintas=3. Somar projetos daria4
e duplicaria A. Esses números são consequências das definições condicionais,
não resultados de um KPI implementado. A decisão deve responder qual indicador
usa cada população e se o filtro de período o afeta.

Ainda na fixture, uma pendência de A está `aberta`, uma de B em
`em_andamento`, outra de A `resolvida`, uma de B `nao_informado` e a de D tem
status null. Se "abertas" incluir somente o estado literal, o contador é **1**;
se incluir também `em_andamento`, é **2**. Essa inclusão depende de aprovação;
os dois desconhecidos não são reclassificados. A data que filtrará pendências
continua sendo pergunta da tabela, sem inventar evento de resolução/criação.

Para lotes ordinários, L1 concluído contém somente A/B; L2 concluído contém A/C;
L3 falhou sem paciente conciliado. Pela regra atual de leitura de lotes para
consulta/edição ([ADR-023](../DECISOES_ARQUITETURAIS.md#adr-023)), L só pode
consultar L1; L2 não é parcialmente liberado e L3 não recebe âncora inventada.
Se o KPI aprovado contar lotes visíveis concluídos nesse recorte, resulta **1**,
nunca3 por contagem global. A regra de data/status e capacidades do KPI deve ser
explicitamente aprovada, preservando os escopos existentes.

## Dicionário da primeira expansão da busca

Hoje H2 retorna ID/nome com filtros nome/sexo e página; atalhos U3.4 usam rotas
existentes. Cada expansão exige fonte e semântica, sem N+1 nem dados locais falsos.

| Campo/filtro | Decisão e exemplo de desconhecido |
| --- | --- |
| Código da pessoa | Aprovar existência, origem, unicidade e eventual geração institucional; ID técnico e código de origem não são intercambiáveis, código ausente continua ausente |
| Nascimento/idade | Usar precisão e data de referência já aprovadas em D1; decidir como buscar/exibir nascimento desconhecido, sem inventar dia/mês para ano isolado |
| Origem/procedência | Escolher dado por pessoa, consulta ou fonte de importação e vocabulário; uma pessoa pode ter consultas de procedências diferentes, sem isso definir diagnóstico |
| Projetos | Aprovar relação ativa/histórica e como filtrar sobreposição; A em X/Y não cria duas pessoas na lista |
| Última consulta/período | Definir data/ordenação e fonte autorizada, inclusive pessoa D sem consulta; ausência não vira data do cadastro/importação |
| Exportação ampliada | Aprovar colunas/população/filtros/capacidade separadamente; CSV da página ID/nome já existente mantém o seu contrato, sem passar a representar toda a base |

Próxima decisão exata: aprovar a tabela dos quatro indicadores e seus resultados
na fixture; selecionar a primeira fatia de colunas/filtros com fonte e tratamento
de desconhecido. Registrar responsável/data e decisões de acesso pertinentes.
Só depois publicar DTOs/queries por unidade. Preparação não conclui VD, não
desbloqueia B/U nem altera o CSV atual.
