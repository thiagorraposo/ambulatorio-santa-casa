# Documentação

Este índice aponta para a fonte principal de cada assunto. Documentos históricos e
relatórios de validação preservam contexto e evidências, mas não substituem as
fontes vigentes.

| Assunto | Fonte principal |
| --- | --- |
| Estado técnico vigente | [`ESTADO_ATUAL_DO_PROJETO.md`](ESTADO_ATUAL_DO_PROJETO.md) |
| Próximo trabalho e bloqueios | [`PROXIMOS_PASSOS.md`](PROXIMOS_PASSOS.md) |
| Decisões arquiteturais duradouras | [`DECISOES_ARQUITETURAIS.md`](DECISOES_ARQUITETURAIS.md) |
| Histórico cronológico de mudanças | [`REGISTRO_DE_ALTERACOES.md`](REGISTRO_DE_ALTERACOES.md) |
| Modelo físico PostgreSQL | [`MODELO_FISICO_ATUAL.md`](MODELO_FISICO_ATUAL.md) |
| Contrato físico da planilha | [`MANIFESTO_FISICO_PLANILHA_V1.md`](MANIFESTO_FISICO_PLANILHA_V1.md) e manifesto executável em [`../manifestos/planilha_ambulatorio_v1.json`](../manifestos/planilha_ambulatorio_v1.json) |
| Regras do importador | [`ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md`](ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md) |
| Implementação atual do importador | [`IMPORTADOR_SINTETICO_V1.md`](IMPORTADOR_SINTETICO_V1.md) |
| Arquitetura do backend | [`ARQUITETURA_BACKEND.md`](ARQUITETURA_BACKEND.md) |
| Segurança e política de dados | [`SEGURANCA_DE_DADOS.md`](SEGURANCA_DE_DADOS.md) |
| Ameaças, controles e riscos residuais | [`THREAT_MODEL.md`](THREAT_MODEL.md) |
| Workflow e validação local | [`WORKFLOW_DE_DESENVOLVIMENTO.md`](WORKFLOW_DE_DESENVOLVIMENTO.md) |

## Coleções de apoio

- [`arquitetura/`](arquitetura/): especificações estruturais implementadas e
  decisões técnicas específicas de módulos.
- [`dados/`](dados/): cobertura, decisões semânticas e metadados seguros da
  planilha.
- [`validacoes/`](validacoes/): relatórios de aceite e evidências de etapas
  concluídas.
- [`evidencias/`](evidencias/): artefatos estruturais; o dump vigente é
  [`schema_atual_ambulatorio.sql`](evidencias/schema_atual_ambulatorio.sql).
- [`historico/`](historico/): fotografias anteriores, reconstruções históricas e
  documentos substituídos que não representam o estado vigente.
- [`AGENTS.md`](AGENTS.md): regras específicas para manutenção documental.
