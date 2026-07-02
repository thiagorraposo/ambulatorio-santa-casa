# Decisões Arquiteturais

Atualizado em: 2026-07-01

Este documento registra decisões duradouras do projeto. Mudanças cronológicas continuam em `docs/REGISTRO_DE_ALTERACOES.md`.

## ADR-001

ID: ADR-001

Título: Implementação incremental do modelo físico

Data: 2026-07-01

Status: Aceita

Contexto: O modelo completo da planilha original é amplo e ainda será expandido em fases.

Decisão: Construir o modelo físico por fases, começando pelo núcleo funcional inicial.

Consequências: O núcleo atual pode ser validado antes de cobrir todos os campos da planilha. Novas estruturas entram por migrations incrementais.

Alternativas rejeitadas: Modelar toda a planilha de uma vez antes de validar o banco.

Documentos relacionados: `docs/ESTADO_ATUAL_DO_PROJETO.md`, `docs/PROXIMOS_PASSOS.md`, `docs/VALIDACAO_MODELO_FISICO.md`.

## ADR-002

ID: ADR-002

Título: Migrations antigas não são alteradas

Data: 2026-07-01

Status: Aceita

Contexto: Scripts SQL já foram aplicados ao schema físico atual.

Decisão: Não editar migrations antigas aplicadas. Toda evolução estrutural deve usar nova migration incremental.

Consequências: O histórico permanece auditável e ambientes existentes podem evoluir sem reaplicação destrutiva.

Alternativas rejeitadas: Corrigir scripts antigos diretamente depois de aplicados.

Documentos relacionados: `AGENTS.md`, `sql/AGENTS.md`, `docs/VALIDACAO_MODELO_FISICO.md`.

## ADR-003

ID: ADR-003

Título: Schema físico aplicado é validado por dump de estrutura

Data: 2026-07-01

Status: Aceita

Contexto: A documentação precisa diferenciar estrutura planejada, migrations e estrutura realmente aplicada.

Decisão: Usar `docs/evidencias/schema_atual_ambulatorio.sql` como principal evidência do schema físico aplicado.

Consequências: Comparações futuras devem considerar esse dump estrutural como fonte prioritária para o estado físico aplicado.

Alternativas rejeitadas: Inferir o estado físico somente pelas migrations.

Documentos relacionados: `docs/evidencias/schema_atual_ambulatorio.sql`, `docs/MODELO_FISICO_ATUAL.md`, `docs/VALIDACAO_MODELO_FISICO.md`.

## ADR-004

ID: ADR-004

Título: Testes SQL usam dados temporários e rollback

Data: 2026-07-01

Status: Aceita

Contexto: Testes de integridade devem ser repetíveis e não podem poluir o banco.

Decisão: Testes SQL devem usar dados sintéticos, transação explícita e `ROLLBACK` quando adequado.

Consequências: A validação pode ser repetida sem deixar registros de teste persistidos.

Alternativas rejeitadas: Inserir dados permanentes de validação no banco.

Documentos relacionados: `tests/AGENTS.md`, `tests/sql/01_validar_nucleo_inicial.sql`, `docs/VALIDACAO_DADOS_DE_TESTE.md`.

## ADR-005

ID: ADR-005

Título: Dados reais de pacientes não são versionados

Data: 2026-07-01

Status: Aceita

Contexto: Dados clínicos e identificáveis são sensíveis.

Decisão: Não versionar dados reais de pacientes, planilhas reais, backups, exports com pacientes ou credenciais.

Consequências: Testes e documentação devem usar dados sintéticos ou metadados não sensíveis.

Alternativas rejeitadas: Versionar amostras reais anonimizadas sem processo formal.

Documentos relacionados: `docs/SEGURANCA_DE_DADOS.md`, `.gitignore`, `AGENTS.md`.

## ADR-006

ID: ADR-006

Título: Banco vem antes de importação completa, API e frontend

Data: 2026-07-01

Status: Aceita

Contexto: O projeto ainda não possui backend, frontend ou importação completa versionados.

Decisão: Validar o banco, o núcleo físico e a estratégia incremental antes da importação completa, API e frontend.

Consequências: As próximas fases dependem de validação do modelo físico e dos testes SQL.

Alternativas rejeitadas: Criar API/frontend antes de estabilizar o modelo físico mínimo.

Documentos relacionados: `docs/PROXIMOS_PASSOS.md`, `docs/ESTADO_ATUAL_DO_PROJETO.md`.

## ADR-007

ID: ADR-007

Título: Documentação obrigatória para mudanças relevantes

Data: 2026-07-01

Status: Aceita

Contexto: O projeto depende de documentação para manter rastreabilidade do modelo e das decisões.

Decisão: Mudanças relevantes devem atualizar documentação afetada e `docs/REGISTRO_DE_ALTERACOES.md`.

Consequências: A definição de pronto inclui documentação atualizada.

Alternativas rejeitadas: Documentar apenas em commits ou deixar documentação para etapa posterior.

Documentos relacionados: `docs/REGISTRO_DE_ALTERACOES.md`, `docs/AGENTS.md`, `AGENTS.md`.

## ADR-008

ID: ADR-008

Título: Conventional Commits em português

Data: 2026-07-01

Status: Aceita

Contexto: O histórico Git precisa ser legível e padronizado.

Decisão: Usar Conventional Commits em português conforme `docs/PADRAO_DE_COMMITS.md`.

Consequências: Commits futuros devem usar prefixos aceitos e mensagem curta em português.

Alternativas rejeitadas: Mensagens livres sem padronização.

Documentos relacionados: `docs/PADRAO_DE_COMMITS.md`, `docs/WORKFLOW_DE_DESENVOLVIMENTO.md`.
