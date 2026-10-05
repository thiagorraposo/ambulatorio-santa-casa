# Documentação

Este índice aponta para a fonte principal de cada assunto. Documentos históricos e
relatórios de validação preservam contexto e evidências, mas não substituem as
fontes vigentes.

| Assunto | Fonte principal |
| --- | --- |
| Estado técnico vigente | [`ESTADO_ATUAL_DO_PROJETO.md`](ESTADO_ATUAL_DO_PROJETO.md) |
| Próximo trabalho e bloqueios | [`PROXIMOS_PASSOS.md`](PROXIMOS_PASSOS.md) |
| Regras de negócio e respostas clínicas vigentes | [`Perguntas pendentes sobre campos e regras clínicas.md`](Perguntas%20pendentes%20sobre%20campos%20e%20regras%20cl%C3%ADnicas.md) e [`dados/DECISOES_HUMANAS_NOVA_PLANILHA.md`](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md) |
| Matriz de impacto e cobertura funcional das decisões | [`dados/COBERTURA_COLUNAS_PLANILHA.md`](dados/COBERTURA_COLUNAS_PLANILHA.md) |
| Decisões arquiteturais duradouras | [`DECISOES_ARQUITETURAIS.md`](DECISOES_ARQUITETURAIS.md) |
| Histórico cronológico de mudanças | [`REGISTRO_DE_ALTERACOES.md`](REGISTRO_DE_ALTERACOES.md) |
| Modelo físico PostgreSQL | [`MODELO_FISICO_ATUAL.md`](MODELO_FISICO_ATUAL.md) |
| Contrato físico da planilha | [`MANIFESTO_FISICO_PLANILHA_V1.md`](MANIFESTO_FISICO_PLANILHA_V1.md) e manifesto executável em [`../manifestos/planilha_ambulatorio_v1.json`](../manifestos/planilha_ambulatorio_v1.json) |
| Regras do importador | [`ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md`](ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md) |
| Revisão de planilhas entre hashes em ambiente sintético | [`arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md`](arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md) |
| Aceite integrado 5A–5E e matriz F01–F16/T01–T18 | [`validacoes/ACEITE_INTEGRADO_ETAPA_5.md`](validacoes/ACEITE_INTEGRADO_ETAPA_5.md) |
| Implementação atual do importador | [`IMPORTADOR_SINTETICO_V1.md`](IMPORTADOR_SINTETICO_V1.md) |
| Arquitetura do backend | [`ARQUITETURA_BACKEND.md`](ARQUITETURA_BACKEND.md) |
| Aplicação frontend, setup e contratos de leitura/escrita | [`FRONTEND.md`](FRONTEND.md) |
| Validação da fundação do frontend 6A–6B | [`validacoes/VALIDACAO_ETAPA_6.md`](validacoes/VALIDACAO_ETAPA_6.md) |
| Recorte dos formulários clínicos 7A–7D | [`arquitetura/RECORTE_CLINICO_ETAPA_7.md`](arquitetura/RECORTE_CLINICO_ETAPA_7.md) |
| Validação dos fluxos clínicos 7A–7D | [`validacoes/VALIDACAO_ETAPA_7.md`](validacoes/VALIDACAO_ETAPA_7.md) |
| Trabalho local desde o commit `adf2fd5` e reauditoria da Etapa 7 | [`RELATORIO_DESDE_ULTIMO_COMMIT_2026_10_05.md`](RELATORIO_DESDE_ULTIMO_COMMIT_2026_10_05.md) |
| Contratos dos catálogos clínicos ativos | [`arquitetura/CONTRATOS_CATALOGOS_ETAPA_7.md`](arquitetura/CONTRATOS_CATALOGOS_ETAPA_7.md) |
| Referência Figma Make e planejamento do frontend | [`arquitetura/ANALISE_INTEGRACAO_FIGMA_MAKE.md`](arquitetura/ANALISE_INTEGRACAO_FIGMA_MAKE.md) |
| Localização e uso dos materiais de referência | [`../referencias/README.md`](../referencias/README.md) |
| Preparação da migração da planilha real | [`PROXIMOS_PASSOS.md`](PROXIMOS_PASSOS.md#preparação-da-migração-da-planilha-real) |
| Segurança e política de dados | [`SEGURANCA_DE_DADOS.md`](SEGURANCA_DE_DADOS.md) |
| Ameaças, controles e riscos residuais | [`THREAT_MODEL.md`](THREAT_MODEL.md) |
| Workflow e validação local | [`WORKFLOW_DE_DESENVOLVIMENTO.md`](WORKFLOW_DE_DESENVOLVIMENTO.md) |

## Coleções de apoio

As respostas do DOCX local foram consolidadas na fonte de regras de negócio em
2026-09-14. As seis respostas do documento de campos e regras clínicas foram
incorporadas como referência autoritativa em 2026-09-28. A revisão documental não
promove campos no manifesto nem implementa funcionalidades; o estado atual e a
matriz distinguem código existente, lacunas e trabalho técnico restante.

- [`arquitetura/`](arquitetura/): especificações estruturais implementadas e
  decisões técnicas específicas de módulos.
- [`dados/`](dados/): cobertura, decisões semânticas e metadados seguros da
  planilha.
- [`validacoes/`](validacoes/): relatórios de aceite e evidências de execução,
  com estágio e pendências identificados em cada documento.
- [`evidencias/`](evidencias/): artefatos estruturais; o dump vigente é
  [`schema_atual_ambulatorio.sql`](evidencias/schema_atual_ambulatorio.sql).
- [`historico/`](historico/): fotografias anteriores, reconstruções históricas e
  documentos substituídos que não representam o estado vigente.
- [`AGENTS.md`](AGENTS.md): regras específicas para manutenção documental.
