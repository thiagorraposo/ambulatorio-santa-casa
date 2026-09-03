# Estado Atual do Projeto

Atualizado em: 2026-09-03

Esta é a síntese vigente do sistema. Detalhes normativos pertencem às fontes
temáticas indicadas abaixo; decisões antigas e resultados de etapas permanecem
preservados em `historico/`, `validacoes/` e no registro cronológico.

## Escopo e estágio

O projeto organiza registros do ambulatório em PostgreSQL e já contém migrations,
dez testes SQL transacionais, importador sintético homologado, hardening, CI e
uma fundação NestJS com autenticação e autorização mínimas. Não há frontend,
escrita clínica HTTP, gestão de usuários nem autorização para dados reais.

A Etapa 4C está concluída. A próxima evolução é a Etapa 5, ainda exclusivamente
com dados sintéticos e precedida pela definição do contrato e da autorização por
recurso de cada módulo clínico.

## Componentes vigentes

- PostgreSQL no schema `ambulatorio`, construído por migrations incrementais de
  `sql/00_criar_banco.sql` a `sql/20_isolar_identidade_do_importador.sql`.
- Schema aplicado com 38 tabelas, todas reconciliadas com as migrations. A
  descrição humana é [`MODELO_FISICO_ATUAL.md`](MODELO_FISICO_ATUAL.md) e a
  evidência física é
  [`evidencias/schema_atual_ambulatorio.sql`](evidencias/schema_atual_ambulatorio.sql).
- Importador v1 em Python, homologado com fixture sintética nas duas abas
  clínicas, 124 rótulos plenamente cobertos, onze preservados apenas no bruto e
  `Localizado` excluído do estruturado. O contrato normativo está em
  [`ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md`](ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md),
  a implementação em [`IMPORTADOR_SINTETICO_V1.md`](IMPORTADOR_SINTETICO_V1.md)
  e a reconciliação em
  [`dados/COBERTURA_COLUNAS_PLANILHA.md`](dados/COBERTURA_COLUNAS_PLANILHA.md).
- Backend Node.js/NestJS em monólito modular, com `health`, `auth` e `pacientes`,
  driver `pg`, JWT, RBAC, rate limit local, SQL parametrizado e menor privilégio.
  A fonte normativa é [`ARQUITETURA_BACKEND.md`](ARQUITETURA_BACKEND.md).
- PostgreSQL Docker opcional em `127.0.0.1:5433`; o ambiente local em 5432 é
  alternativa manual. Docker e CI usam somente dados sintéticos.

## Garantias atuais

- O importador valida manifesto/layout, trabalha por linha em transação, concilia
  pacientes, registra proveniência e suporta idempotência e reprocessamento
  encadeado explícito.
- As migrations antigas aplicadas permanecem imutáveis; evoluções usam novas
  migrations. A decisão completa está nas ADR-001 e ADR-002 de
  [`DECISOES_ARQUITETURAIS.md`](DECISOES_ARQUITETURAIS.md).
- Testes SQL usam dados sintéticos e `ROLLBACK`. Resultados de aceite ficam em
  [`validacoes/`](validacoes/), sem competir com o estado vigente.
- O backend não executa migrations, DDL, importação ou escrita clínica. A role da
  aplicação não lê as tabelas de proveniência; o importador não acessa a
  identidade funcional.
- Dados reais, planilhas reais, backups, credenciais e exports clínicos não podem
  ser versionados nem usados no ambiente atual. A política está em
  [`SEGURANCA_DE_DADOS.md`](SEGURANCA_DE_DADOS.md) e os riscos em
  [`THREAT_MODEL.md`](THREAT_MODEL.md).

## Limites e pendências

Dados reais continuam bloqueados por governança institucional, ambiente
protegido, TLS, gestão/rotação de segredos, backup e retenção, auditoria de acesso,
responsáveis por autorizar lotes e revisar inconsistências e resposta a
incidentes. Autorização por recurso/linha, rate limit distribuído e requisitos
dos módulos clínicos também permanecem pendentes.

O roadmap, a ordem do próximo trabalho e o backlog autorizado têm uma única fonte:
[`PROXIMOS_PASSOS.md`](PROXIMOS_PASSOS.md).

## Governança e validação

- ADRs: [`DECISOES_ARQUITETURAIS.md`](DECISOES_ARQUITETURAIS.md).
- Semântica da planilha:
  [`dados/DECISOES_HUMANAS_NOVA_PLANILHA.md`](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md).
- Workflow e comandos oficiais:
  [`WORKFLOW_DE_DESENVOLVIMENTO.md`](WORKFLOW_DE_DESENVOLVIMENTO.md).
- Histórico cronológico: [`REGISTRO_DE_ALTERACOES.md`](REGISTRO_DE_ALTERACOES.md).
- Mapa completo da documentação: [`README.md`](README.md).

Mudanças relevantes atualizam o registro cronológico e somente as fontes
temáticas realmente afetadas.
