# Fila e responsabilidade de revisão — proposta 8A2D/P-04

**Atualização vigente de02/11:** as [decisões de produto1–31](../dados/DECISOES_PRODUTO_M3_2026_11_02.md)
aprovam as regras sintéticas correspondentes. Perguntas e estados de aprovação
abaixo descrevem a preparação anterior e são sucedidos por essa fonte; contratos
técnicos, implementação, validação e homologação continuam separados.

2026-11-02, Janela 1 de M3. **Proposta não aprovada; B/U dependentes bloqueados.**
Fontes: [catálogo 8A2D](../frontend/ENTREGAS_DO_PRODUTO.md#8a2d),
[visão PEN](../frontend/VISAO_E_ESPECIFICACAO.md#pendências-por-paciente-e-fila-global--pen)
e [D11](../dados/DECISOES_HUMANAS_NOVA_PLANILHA.md).
Não há nova classificação clínica, responsável, autorização ou contrato de
concorrência instituído por este documento.

## Decisão de produto solicitada

H12 guarda pendências assistenciais livres por atendimento; H14 projeta lotes e
linhas de importação com códigos sanitizados. Não são uma única entidade hoje.
D11 não autoriza classificar texto legado nem eliminar observações clínicas.

| Tema | Opções e consequência a decidir |
| --- | --- |
| Apresentação | Grupos relacionados de pendências e inconsistências preservam suas identidades; fila única com tipo de origem exige definir equivalência, estados e contadores, sem converter uma origem na outra |
| População | Definir quais estados de cada fonte entram e quais apenas se consultam no histórico; ausência/null e `nao_informado` não viram "aberta" automaticamente |
| Responsável | Definir quem pode assumir, revisar e encerrar cada tipo, eventual substituição e tratamento de item sem responsável; nome de digitador legado não é identidade de revisor |
| Escopo | Preservar escopos atuais por paciente e lote; aprovar qualquer capacidade nova por fonte e ação antes de ampliar visibilidade ou revisão |
| Revisão | Distinguir decisão operacional do fato original; definir resultados possíveis, justificativa, efeitos clínicos permitidos e o que exige fluxo clínico separado |
| Filtros/período | Aprovar status, origem e instante/data de referência: criação, atendimento, importação ou revisão; não usar uma data silenciosamente para todas as fontes |
| Contadores | Definir se contam itens, pacientes ou linhas e como tratam relação entre fontes; o resultado deve ser agregado autorizado, sem varrer páginas clínicas |
| Histórico/retenção | Decidir acesso ao original e às decisões, correções e prazo institucional; nenhuma purga ou sobrescrita silenciosa é proposta |

## Exemplos sintéticos que a decisão deve resolver

| Dados | Pergunta e limite preservado |
| --- | --- |
| Paciente A tem pendência livre "Verificar notificação" com status null | A descrição não permite classificar automaticamente como erro de importação nem presumir que esteja aberta |
| Linha do lote L possui `data_invalida`, mas não tem paciente conciliado | A regra atual de leitura de lotes e proveniência continua aplicável; não inventar paciente/encaminhamento ou abrir ficha de candidato não autorizado |
| Pendência de A e inconsistência do lote L referem-se aparentemente ao mesmo assunto | Decidir se apenas se relacionam; não deduplicar, encerrar uma pela outra ou contar como uma única tarefa por semelhança textual |
| Revisor pode ler A, mas L contém também paciente B fora do seu escopo | Não contornar a autorização do lote inteiro pela fila; definir o destino visível sem expor a linha de B |
| Dois revisores atuam sobre o mesmo item ou a resposta da confirmação se perde | A política deve determinar conflito e recuperação da decisão efetiva; a UI não pode reenviar cegamente nem substituir o fato original |

Próxima decisão exata: selecionar representação/grupos, população por estado,
responsável e capacidades por ação, com os cinco exemplos acima respondidos.
Somente então especificar contratos B de fila/revisão, versão, auditoria e
recuperação. Preparação não é aceite VD; nenhum endpoint, contador ou fixture
persistente foi criado.
