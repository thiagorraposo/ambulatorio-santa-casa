# Validações e aceites

Relatórios comprovam somente os cenários, a versão e o ambiente registrados.
O [estado vigente](../ESTADO_ATUAL_DO_PROJETO.md) resume o estágio; o
[roadmap](../PROXIMOS_PASSOS.md) define o próximo trabalho. Uma quantidade antiga
de testes não é uma contagem atual e aceite sintético não autoriza dados reais.

## Marcos e evidências recentes

| Escopo | Evidência | Leitura correta |
| --- | --- | --- |
| 8D login/estado administrativo | [Validação integrada](VALIDACAO_8D1_LOGIN_ESTADO.md) | Lista/detalhe reais com cinco campos,19 HTTP/10 E2E; comandos e aceite próprios pendentes. |
| M3 cadastro/edição por Edição | [Validação integrada](VALIDACAO_CADASTRO_EDICAO_M3.md) | Vínculo atômico/específico, PATCH, atendimento, revogação e concorrência; sem aceite humano. |
| CI — diagnóstico e estabilização por componente | [Validação de 26/10](VALIDACAO_CI_2026_10_26.md) | Causas originais reproduzidas; arquitetura, verificações locais e procedimento para conferir o aceite remoto no PR/main. |
| Etapa 5 — backend/importação | [Aceite integrado](ACEITE_INTEGRADO_ETAPA_5.md) | Matriz F01–F16/T01–T18 e limites sintéticos. |
| Execução incremental da Etapa 5 | [Continuidade](CONTINUIDADE_ETAPA_5.md) | Diário de tentativas e resultados; o fechamento de 03/10 prevalece sobre pendências de entradas anteriores. |
| Etapa 6 — fundação da interface | [Validação](VALIDACAO_ETAPA_6.md) | Aceite sintético da fundação, não de todo o produto. |
| Etapa 7 — fluxo clínico original | [Validação vigente](VALIDACAO_ETAPA_7.md) | Correções R7-01–07 e provas técnicas; parecer M1 aprovado conforme roteiro. |
| Revisão humana da Etapa 7 | [Roteiro e registro](ROTEIRO_REVISAO_CLINICA_ETAPA_7.md) | Parecer M1 aprovado em 26/10 por confirmação do responsável; metadados detalhados da sessão não fornecidos. |
| 7A-U1 — busca antes do cadastro | [Validação técnica](VALIDACAO_7A_U1.md) | Homônimos, declaração explícita, vazio, recusa, cancelamento e ausência de POST indevido; sem aceite adicional de produto/equipe. |
| 7D-U1/U2 — etapas e revisão do atendimento | [Validação técnica](VALIDACAO_7D_U1_U2.md) | Cinco etapas, revisão, confirmação única, cancelamento consciente e recuperação em banco descartável; aceite de produto/equipe pendente. |
| 7D-U4.2 — controles de formulários, tabelas e diálogo | [Validação técnica](VALIDACAO_7D_U4_2.md) | Controles comparados à referência executada em 31/10, Axe/teclado/reflow; aceite humano de M2 aprovado em 31/10; fidelidade integral 8V1 pendente. |
| 7D-A1 — jornada clínica integrada pela interface | [Validação técnica](VALIDACAO_7D_A1.md) | Cadastro, atendimento, acompanhamentos, notificação e histórico com IDs sintéticos; quatro jobs do CI do PR passaram (run `40442560575`); aceite humano de M2 aprovado pelo responsável em 31/10, conforme parecer oficial no relatório. |
| U3.1 — cabeçalho/último atendimento | [Validação](VALIDACAO_7D_U3_1.md) | Inclui a ocorrência de seleção de ambiente e seus limites. |
| U3.2 — diagnóstico/avaliação por consulta | [Validação](VALIDACAO_7D_U3_2.md) | Seleção explícita e paginação; sem herança entre visitas. |
| U3.3 — histórico/detalhe/exames | [Validação](VALIDACAO_7D_U3_3.md) | Provas técnicas encerradas em 21/10; não é fidelidade integral. |
| U4.1 — navegação/conta/erros | [Validação](VALIDACAO_7D_U4_1.md) | Não aceita controles/diálogos de U4.2 por associação. |
| 8C2U.1 — seleção/simulação mínima XLSX | [Validação](VALIDACAO_8C2_U1.md) | Worker real, zero registros persistidos, permissões e resposta perdida; consome sequências (limite C2B.1), sem confirmação da importação/aceite humano. |
| 7B-E1B — episódios individuais de sorologia | [Validação](VALIDACAO_7B_E1B.md) | Contrato GET/POST, auditoria prospectiva, upgrade sem backfill, autorização e recuperação; interface tem evidência própria; solicitação geral e aceite pendentes. |
| 7B-E1U — interface de episódios de sorologia | [Validação](VALIDACAO_7B_E1U.md) | Escopo, isolamento e evidências específicas da interface; solicitação geral e aceite clínico permanecem separados. |
| 7B-E2B.1 — condição por atendimento | [Validação](VALIDACAO_7B_E2B_1.md) | Seis campos, criação única, auditoria prospectiva e recuperação; interface, complicações e aceite humano separados. |
| 7B-E2U.1 — interface da condição por atendimento | [Validação](VALIDACAO_7B_E2U_1.md) | Seis campos, revisão, isolamento, rascunho e recuperação; complicações e aceite humano pendentes. |
| 8A1 — CSV da página de pacientes | [Validação](VALIDACAO_8A1.md) | Download real ID/nome/filtros/página e três perfis H16; não é exportação completa/dashboard nem aceite humano. |
| 7B-E2B.2 — complicações por atendimento | [Validação](VALIDACAO_7B_E2B_2.md) | Quatro campos, multiplicidade, paginação, captura prospectiva, rollback e recuperação; interface com evidência própria, aceite humano separado. |
| 7B-E2U.2 — interface de complicações | [Validação](VALIDACAO_7B_E2U_2.md) | Lista/revisão, multiplicidade, paginação, rascunhos e recuperação após COMMIT; aceite humano separado. |
| 7B-E3B.1 — catálogo de comorbidades | [Validação](VALIDACAO_7B_E3B_1.md) | Ativos, três perfis e paginação; não publica estado clínico, seleção ou escrita de paciente. |
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

- [Avaliação de comorbidades por atendimento — E3B.2](VALIDACAO_7B_E3B_2.md).

- [Interface de comorbidades — E3U](VALIDACAO_7B_E3U.md).

- [Backend AVC longitudinal — recorte E4B](VALIDACAO_7B_E4B_AVC.md).

- [Interface AVC — E4U, provas e pendência visual](VALIDACAO_7B_E4U_AVC.md).

- [Catálogo mínimo da demonstração M3](VALIDACAO_FIXTURE_DEMO_M3.md).

- [Backend marcapasso/CDI — criação inicial](VALIDACAO_7B_E4B_DISPOSITIVOS.md).

- [Interface marcapasso/CDI — recorte E4U](VALIDACAO_7B_E4U_DISPOSITIVOS.md).

- [Backend óbito inicial — recorte E4B](VALIDACAO_7B_E4B_OBITO.md).

- [Interface de parâmetros do exame — E6U](VALIDACAO_7B_E6U_PARAMETROS.md).

- [Atalhos diretos por pessoa — 8B3U.4](VALIDACAO_8B3U_4.md).

- [Relatório H14 sanitizado — recorte8C2B.1](VALIDACAO_8C2B_1_RELATORIO.md).

- [Rollback de rejeição precoce no dry-run](VALIDACAO_DRY_RUN_REJEICAO_PRECOCE.md).

- [Totais/códigos na simulação — recorte8C2U.1](VALIDACAO_8C2_U1_RELATORIO.md).

- [Ensaio integrado sintético M3](VALIDACAO_DEMONSTRACAO_M3_2026_11_02.md).
- [Isolamento das contagens E2E M3](VALIDACAO_ISOLAMENTO_E2E_M3.md).

- [Regressão composta do frontend M3 — 02/11](VALIDACAO_REGRESSAO_FRONTEND_M3_2026_11_02.md).

- [Registro consolidado da execução M3 — 02/11](RELATORIO_EXECUCAO_M3_2026_11_02.md).

- [Avaliação humana do protótipo funcional com a equipe Santa Casa — M3](AVALIACAO_HUMANA_EQUIPE_SANTA_CASA_M3.md): REALIZADA — COM PROBLEMAS IDENTIFICADOS; ACEITE INTEGRAL NÃO REGISTRADO, achados abertos e data exata não informada.
