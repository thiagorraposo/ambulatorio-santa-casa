# Validação da Fundação do Backend — Etapa 4C

Atualizado em: 2026-08-31

Fonte normativa de arquitetura/HTTP: `docs/ARQUITETURA_BACKEND.md`. Decisões
duradouras: `docs/DECISOES_ARQUITETURAIS.md`.

## Matriz de permissões atual

| Endpoint | Público | consulta | edicao | administracao |
| --- | --- | --- | --- | --- |
| `GET /health` | sim | sim | sim | sim |
| `POST /auth/login` | sim | sim | sim | sim |
| `GET /auth/me` | não | sim | sim | sim |
| `GET /pacientes` | não | sim | sim | sim |
| `GET /auth/authorization-check` | não | não (403) | sim | sim |

Essa matriz cobre somente endpoints existentes. RBAC controla operações, não o
escopo de registros individuais.

## Evidências automatizadas

| Requisito | Evidência |
| --- | --- |
| Build, DTOs, validação, erros e logs | `make backend-check` e `backend/test/unit/` |
| Fluxo HTTP, autenticação e RBAC | `backend/test/integration/backend.integration.spec.ts` |
| Pool/`SET ROLE` sem estado residual | `backend/test/unit/database.service.spec.ts` |
| Menor privilégio e proveniência | testes SQL 09/10 e integração backend |
| Banco limpo e checks legados | `.github/workflows/validacoes.yml` |
| Importador independente | `make importer-test` |
| Compose/container não-root | `make backend-container-check` e `backend/Dockerfile` |

`make backend-foundation-e2e` usa somente fixtures sintéticas, inicializa Nest
contra PostgreSQL e remove as fixtures. Comprova health, login, JWT, `/auth/me`,
pacientes, 401/403, três perfis, HS256, inativação, rate limit, role efetiva,
ausência de ownership/DDL/elevação e bloqueio das três tabelas de proveniência.

## Pendências deliberadas

- Revogação/refresh: retomar quando resposta a incidente exigir encerramento de
  sessão específica antes da expiração curta.
- Autorização por linha: definir na Etapa 5 antes de módulos clínicos/dados reais.
- Rate limit distribuído e proxy confiável: necessários com múltiplas instâncias.
- TLS, MFA, SSO, rotação institucional, auditoria e infraestrutura definitiva
  bloqueiam dados reais, não a Etapa 5 sintética.
