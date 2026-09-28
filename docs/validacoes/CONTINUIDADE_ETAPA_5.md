# Continuidade da Etapa 5

Execução iniciada em 2026-09-27. Documento de trabalho e evidência de execução;
o escopo permanece em [PROXIMOS_PASSOS.md](../PROXIMOS_PASSOS.md).

## Estado inicial preservado

- Única alteração preexistente: `sql/21_armazenamento_revisao_temporal.sql`, não
  versionada, SHA-256 `0c96ea418b5b0dfaed4de648e6d81eb15d8ed20b5649485578e568a61921578e`.
- Migrations 00–20 e dump do ambiente persistente devem permanecer intactos.
- Banco persistente não será modificado. Validações usam PostgreSQL descartável.

## Plano e critérios

| Subetapa | Estado inicial | Critério de conclusão |
| --- | --- | --- |
| 5A | Contrato temporal definido; contratos clínicos pendentes | Escolhas técnicas justificadas; decisões humanas atribuídas; nenhuma inferência clínica |
| 5B | Importador v1.4.0 com revisão bloqueada | Promoções autorizadas e revisão auditada validadas, preservando idempotência e proveniência |
| 5C | Lacunas de descoberta de Chagas e rastreio familiar | Modelagem mínima com contrato resolvido, integridade e testes SQL |
| 5D | Fundação HTTP e listagem mínima | Fluxos de paciente, atendimento, importação e CSV com autorização por recurso |
| 5E | Pendente | Contratos documentados e testes HTTP/SQL, perfis e transações aprovados |

## Decisões aguardadas

Perguntas enviadas sobre referência da idade, titularidade da data de descoberta
de Chagas, política de acesso/revisão exclusivamente sintética, representação de
desfecho e contrarreferências. Nenhuma resposta é presumida. Decisões
institucionais para dados reais permanecem fora do escopo.

## Execução

- Diagnóstico documental e inspeção da fundação concluídos.
- Migrations 00–27 foram instaladas em PostgreSQL descartável em `127.0.0.1:55457`;
  o banco persistente não foi tocado.
- As 16 suítes SQL passaram, além de `manifest-check`, `importer-test`,
  `backend-build` e `backend-unit-test` em modo compacto.
- A captura temporal, proveniência e rastreio familiar têm migrations e testes;
  o importador inicia contexto de auditoria por linha.
- A API possui ficha de paciente, criação/consulta de atendimentos e consulta
  detalhada de dados clínicos, exames, pendências e rastreio familiar, além de
  retornos BZN em `acompanhamento_cuidado`, tratamento BZN, projetos, exames,
  notificação e consulta sanitizada de lotes/linhas de importação com DTOs,
- A exportação CSV agora exige identidade válida e política de acesso habilitada;
  em vínculo explícito, filtra pacientes pelo vínculo ativo do usuário.
- A administração pode conceder ou revogar vínculo por paciente somente pela
  função SQL restrita, com contexto transacional do ator; não há mutação direta
  da tabela de acesso.
  transação, controle de versão e política de acesso configurável.
- A Etapa 5 continua **não concluída**: decisões D1, D2, D9, D10 e política
  institucional de acesso não foram respondidas; revisão entre hashes, aplicação
  seletiva/dry-run auditado e aceite integrado ainda faltam. A importação HTTP
  foi implementada com upload temporário e worker/role separados, permanecendo
  desabilitada por padrão e em produção.
- O Makefile passou a respeitar `PGPASSWORD` fornecida pelo ambiente; assim,
  `project-check` completo foi executado com as 16 suítes no banco descartável,
  além de `manifest-check`, `importer-test`, build e testes unitários.
- A última execução do `project-check` passou com 16 suítes SQL; o backend também
  possui testes unitários para configuração, worker de importação, autorização,
  transação e exportação.
