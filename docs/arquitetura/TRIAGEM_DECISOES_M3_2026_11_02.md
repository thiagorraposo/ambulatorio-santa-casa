# Triagem dirigida de decisões restantes de M3

**Atualização vigente de02/11:** as [decisões de produto1–31](../dados/DECISOES_PRODUTO_M3_2026_11_02.md)
aprovam as regras sintéticas correspondentes. Perguntas e estados de aprovação
abaixo descrevem a preparação anterior e são sucedidos por essa fonte; contratos
técnicos, implementação, validação e homologação continuam separados.

2026-11-02, Janela 1. Leitura de catálogo/visão e trechos das fontes abaixo,
sem auditoria exaustiva ou releitura de histórico. Não é novo índice, roadmap,
aprovação clínica ou mudança de estado de B/U. As propostas permanecem não
aprovadas; o catálogo conserva os critérios de aceite VD.

| Unidade/gate | Fonte suficiente para a próxima conversa de decisão | Exata próxima decisão e limite |
| --- | --- | --- |
| 8A2D/P-04 | [Proposta de fila](PROPOSTA_FILA_REVISAO_8A2D.md), [visão PEN](../frontend/VISAO_E_ESPECIFICACAO.md#pendências-por-paciente-e-fila-global--pen) e D11 | Escolher grupos/fila, população por estado, responsáveis e capacidades; responder casos de lote misto/sem paciente e decisão concorrente. Não classificar texto nem designar responsável legado |
| 8B1D/P-05 | [Proposta de métricas e fixture](PROPOSTA_METRICAS_BUSCA_P05.md), [catálogo](../frontend/ENTREGAS_DO_PRODUTO.md#8b1d) | Aprovar unidade/população/fonte temporal dos quatro indicadores e resultados da fixture. Não criar score ou derivar total de páginas |
| 8B3D/P-05 | [Dicionário proposto](PROPOSTA_METRICAS_BUSCA_P05.md#dicionário-da-primeira-expansão-da-busca), [catálogo](../frontend/ENTREGAS_DO_PRODUTO.md#8b3d) | Selecionar primeira expansão e fonte/precisão de código, nascimento, procedência, projetos e última consulta. Não gerar código fictício ou derivar origem do diagnóstico |
| 7C-E5D/P-06 | [D9 original](../dados/DECISOES_HUMANAS_NOVA_PLANILHA.md), [limites de futuro/ano/comparecimento](ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md), [catálogo](../frontend/ENTREGAS_DO_PRODUTO.md#7c-e5d) | Confirmar destino de planejamento/orientação, exibição e eventual retirada funcional do legado. Responder: data futura, orientação de voltar com exames prontos, visita efetiva e ano isolado. Não eliminar texto nem converter plano em comparecimento. Fonte já explicita a distinção; não duplicada em outra proposta |
| 8C4D/P-09 | [ADR-022/023](../DECISOES_ARQUITETURAIS.md#adr-022), [especificação temporal](ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md), [recuperação H14 pendente](PROPOSTA_CONFIRMACAO_IMPORTACAO_8C2U_2.md), [catálogo](../frontend/ENTREGAS_DO_PRODUTO.md#8c4d) | Aprovar quem pode comandar/consultar/retomar novo elo, metadados e ordem HTTP. Distinguir no-op do mesmo conteúdo, reprocessamento explícito do mesmo hash/layout e revisão entre hashes. Ler lote não concede capacidade de gestão; resposta perdida não autoriza repetir POST |

Foram preparadas somente duas propostas adicionais, P-04 eP-05, onde a leitura
dirigida não localizou opções/exemplos numéricos suficientes. P-06 eP-09 têm
fronteiras e perguntas já documentadas; a ausência de resposta humana não se
resolve repetindo desenhos ou implementando política nova. Nenhuma dessas
preparações substitui contratos futuros de concorrência, recuperação e acesso.

Validação aplicável: links/âncoras e revisão de coerência com fontes. Não foram
executados testes da aplicação, comandos de escrita ou dados reais por esta
triagem. Aprovações e responsáveis permanecem pendentes.
