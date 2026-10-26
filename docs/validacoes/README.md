# Validações e aceites

Relatórios comprovam somente os cenários, a versão e o ambiente registrados.
O [estado vigente](../ESTADO_ATUAL_DO_PROJETO.md) resume o estágio; o
[roadmap](../PROXIMOS_PASSOS.md) define o próximo trabalho. Uma quantidade antiga
de testes não é uma contagem atual e aceite sintético não autoriza dados reais.

## Marcos e evidências recentes

| Escopo | Evidência | Leitura correta |
| --- | --- | --- |
| Etapa 5 — backend/importação | [Aceite integrado](ACEITE_INTEGRADO_ETAPA_5.md) | Matriz F01–F16/T01–T18 e limites sintéticos. |
| Execução incremental da Etapa 5 | [Continuidade](CONTINUIDADE_ETAPA_5.md) | Diário de tentativas e resultados; o fechamento de 03/10 prevalece sobre pendências de entradas anteriores. |
| Etapa 6 — fundação da interface | [Validação](VALIDACAO_ETAPA_6.md) | Aceite sintético da fundação, não de todo o produto. |
| Etapa 7 — fluxo clínico original | [Validação vigente](VALIDACAO_ETAPA_7.md) | Correções R7-01–07 e provas técnicas; parecer clínico pendente. |
| Revisão humana da Etapa 7 | [Roteiro e registro](ROTEIRO_REVISAO_CLINICA_ETAPA_7.md) | Campos pendentes até a equipe executar e registrar o parecer. |
| U3.1 — cabeçalho/último atendimento | [Validação](VALIDACAO_7D_U3_1.md) | Inclui a ocorrência de seleção de ambiente e seus limites. |
| U3.2 — diagnóstico/avaliação por consulta | [Validação](VALIDACAO_7D_U3_2.md) | Seleção explícita e paginação; sem herança entre visitas. |
| U3.3 — histórico/detalhe/exames | [Validação](VALIDACAO_7D_U3_3.md) | Provas técnicas encerradas em 21/10; não é fidelidade integral. |
| U4.1 — navegação/conta/erros | [Validação](VALIDACAO_7D_U4_1.md) | Não aceita controles/diálogos de U4.2 por associação. |
| Ordenação numérica de identificadores | [Validação](VALIDACAO_ORDENACAO_IDENTIFICADORES.md) | Recursos e cenários expressamente cobertos. |

## Evidências de origem por módulo

Esses documentos preservam as validações anteriores e os critérios específicos
dos módulos. Não representam nova execução sobre o estado atual. Para aplicar
as verificações hoje, use a [matriz proporcional](../WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional)
e um ambiente descartável compatível.

| Escopo de origem | Relatório |
| --- | --- |
| Núcleo de 25 tabelas | [Modelo físico de 01/07](VALIDACAO_MODELO_FISICO.md) e [dados de teste de 16/07](VALIDACAO_DADOS_DE_TESTE.md) |
| Avaliação clínica | [Validação](VALIDACAO_MODULO_AVALIACAO_CLINICA.md) |
| Notificação | [Validação](VALIDACAO_MODULO_NOTIFICACAO.md) |
| Importação/proveniência | [Validação](VALIDACAO_MODULO_IMPORTACAO_PROVENIENCIA.md) |
| Vínculo paciente–projeto | [Validação](VALIDACAO_ASSOCIACAO_PACIENTE_PROJETO.md) |
| Exames por paciente | [Validação](VALIDACAO_EXAMES_POR_PACIENTE.md) |
| BZN | [Validação](VALIDACAO_TRATAMENTO_BENZONIDAZOL.md) |
| Encaminhamento ampliado | [Validação](VALIDACAO_ENCAMINHAMENTO_AMPLIADO.md) |
| Fundação do backend (4C) | [Validação](VALIDACAO_ETAPA_4C.md) |

A reauditoria de 05/10 está no [histórico](../historico/RELATORIO_ETAPA_7_2026_10_05.md).
Logs e capturas em `/tmp` citados nos relatórios podem ter sido removidos pelo
sistema; sua menção preserva rastreabilidade, não garante disponibilidade atual.
