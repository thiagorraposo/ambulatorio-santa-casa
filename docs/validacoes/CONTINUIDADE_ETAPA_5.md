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
| 5A | Respostas clínicas incorporadas e invariantes registradas | Escolhas técnicas justificadas; nenhuma inferência clínica; executor temporal permanece técnico |
| 5B | Importador v1.4.0 com revisão bloqueada | Promoções autorizadas e revisão auditada validadas, preservando idempotência e proveniência |
| 5C | Rastreio familiar implementado; semântica da descoberta de Chagas resolvida | Campo físico da descoberta, integridade e testes SQL |
| 5D | Fundação HTTP e listagem mínima | Fluxos de paciente, atendimento, importação e CSV com autorização por recurso |
| 5E | Pendente | Contratos documentados e testes HTTP/SQL, perfis e transações aprovados |

## Decisões incorporadas

As seis respostas de [`Perguntas pendentes sobre campos e regras clínicas.md`](../Perguntas%20pendentes%20sobre%20campos%20e%20regras%20cl%C3%ADnicas.md)
foram incorporadas em 2026-09-28: idade derivada da data de nascimento; data do
autorelato de Chagas como descoberta pelo paciente, independente da sorologia;
familiares com identificação e resultado, sem data de sorologia; identificação
obrigatória dos exames trazidos e solicitados; e retorno de 30 dias sempre ligado
ao benznidazol, registrando a data do comparecimento.

## Pendências técnicas

Não há decisão humana pendente nesse documento. Ainda faltam o fluxo
de promoção da descoberta em lotes antigos, o executor e a ativação controlada da
revisão temporal, além do aceite integrado dos fluxos HTTP e de importação. A
política de acesso sintética permanece explícita e desabilitada por padrão, sem
liberar dados reais.

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
- A Etapa 5 continua **não concluída**: revisão entre hashes, aplicação
  seletiva/dry-run auditado, promoções restantes e aceite
  integrado ainda faltam. A importação HTTP
  foi implementada com upload temporário e worker/role separados, permanecendo
  desabilitada por padrão e em produção.
- O Makefile passou a respeitar `PGPASSWORD` fornecida pelo ambiente; assim,
  `project-check` completo foi executado com as 16 suítes no banco descartável,
  além de `manifest-check`, `importer-test`, build e testes unitários.
- A última execução do `project-check` passou com 16 suítes SQL; o backend também
  possui testes unitários para configuração, worker de importação, autorização,
  transação e exportação.

## Retomada com respostas autoritativas — 2026-09-28

Estado de trabalho após a interrupção: migration 28, importador v1.5.0 e manifesto
v1.2, diagnóstico HTTP, cálculo de idade com referência, correção da listagem
por vínculo/paginação e autoria transacional das escritas. A concessão de acesso
assume a role de serviço somente durante a chamada à função administrativa.
O retorno BZN exige tratamento do paciente; exames genéricos exigem identificação.

Validações deste incremento:

- `manifest-check`: destinos incluem a migration 28 sem regenerar o dump persistente.
- `importer-test`: 26 unitários e E2E sintético, com data de descoberta distinta da
  sorologia e preservação do bruto; instalação limpa em banco de teste.
- `backend-build` e `backend-unit-test`: aprovados.
- `backend-clinical-test`: sete cenários HTTP reais em banco descartável criado
  com migrations 02–28, incluindo três perfis, acesso por recurso, paginação,
  CSV, diagnóstico, filhos clínicos, rollback diferido, BZN e concorrência de versão.
- Migration 28 aplicada incrementalmente somente no servidor descartável da tarefa;
  17 suítes SQL passaram nesse ambiente. A evidência persistente até 20 foi preservada.
- `project-check COMPACT=1` aprovado contra o banco descartável em 55457 após
  revisão documental; `git diff --check` também aprovado. A suíte clínica foi
  repetida após os ajustes de perfis e consultas sequenciais, com sete casos aprovados.

Pendências obrigatórias mantidas: executor/autorizações/aprovação/dry-run da
ADR-022 com F10–F15 e T03–T18; promoções clínicas restantes e sua reexecução em
lotes antigos; recursos clínicos ainda sem mutação/DTO de saída; paginação das
coleções clínicas; integração HTTP de importação e autorização operacional;
revisão dos contratos e matriz de aceite integral. As sete provas HTTP acima
não substituem os casos ainda ausentes. A Etapa 5 permanece em andamento.
