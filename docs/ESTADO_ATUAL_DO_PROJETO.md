# Estado Atual do Projeto

Atualizado em: 2026-09-14

Esta é a síntese vigente do sistema. Detalhes normativos pertencem às fontes
temáticas indicadas abaixo; decisões antigas e resultados de etapas permanecem
preservados em `historico/`, `validacoes/` e no registro cronológico.

## Escopo e estágio

O projeto organiza registros do ambulatório em PostgreSQL e já contém migrations,
dez testes SQL transacionais, importador com homologação sintética do contrato v1, hardening, CI e
uma fundação NestJS com autenticação e autorização mínimas. Não há frontend,
escrita clínica HTTP, gestão de usuários nem autorização para dados reais.

A Etapa 4C está concluída. As doze respostas de `Perguntas pendentes.docx` foram
consolidadas documentalmente em 2026-09-14, mas ainda não incorporadas ao contrato
executável. A Etapa 5 foi reorganizada para resolver lacunas do importador,
complementar somente a modelagem indispensável e entregar API/interface clínicas,
sempre com dados sintéticos e autorização definida por módulo.

## Componentes vigentes

- PostgreSQL no schema `ambulatorio`, construído por migrations incrementais de
  `sql/00_criar_banco.sql` a `sql/20_isolar_identidade_do_importador.sql`.
- Schema aplicado com 38 tabelas, todas reconciliadas com as migrations. A
  descrição humana é [`MODELO_FISICO_ATUAL.md`](MODELO_FISICO_ATUAL.md) e a
  evidência física é
  [`evidencias/schema_atual_ambulatorio.sql`](evidencias/schema_atual_ambulatorio.sql).
- Importador v1 em Python, homologado com fixture sintética nas duas abas
  clínicas; o manifesto declara 124 rótulos plenos, onze preservados apenas no
  bruto e `Localizado` excluído do estruturado. Esses números não comprovam
  cobertura funcional das novas respostas. O contrato normativo está em
  [`ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md`](ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md),
  a implementação em [`IMPORTADOR_SINTETICO_V1.md`](IMPORTADOR_SINTETICO_V1.md)
  e a reconciliação em
  [`dados/COBERTURA_COLUNAS_PLANILHA.md`](dados/COBERTURA_COLUNAS_PLANILHA.md).
- Backend Node.js/NestJS em monólito modular, com `health`, `auth` e `pacientes`,
  driver `pg`, JWT, RBAC, rate limit local, SQL parametrizado e menor privilégio.
  A fonte normativa é [`ARQUITETURA_BACKEND.md`](ARQUITETURA_BACKEND.md).
- PostgreSQL Docker em `127.0.0.1:5433`, padrão do Makefile (`DB_ENV=docker`);
  o ambiente local em 5432 é alternativa explícita. Docker e CI usam somente
  dados sintéticos. A API atual expõe saúde, autenticação e listagem mínima de
  pacientes (`pacienteId`, `nome`), não ficha clínica completa.

## Garantias atuais

- O importador valida manifesto/layout, trabalha por linha em transação, concilia
  pacientes e registra proveniência. Idempotência e reprocessamento encadeado
  existem para o contrato v1; promoção de pendências e atualização de uma mesma
  linha clínica em arquivo modificado têm limitações descritas abaixo.
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

O modelo já permite idade derivada do nascimento, exames identificados por bloco,
acompanhamentos repetíveis e pendências textuais. Faltam representação própria da
data de descoberta de Chagas e do exame de familiares. A multiplicidade de
contrarreferências foi confirmada; seu contrato documental e o momento do upload
ainda precisam de decisão. A exclusão funcional de `Localizado` foi confirmada,
sem remover o bruto nem confundir com localização do prontuário.

O importador tenta inserir BZN novamente para o mesmo paciente; o caminho de
reprocessamento reutiliza linhas com pendência antes de executar seus handlers;
erros secundários também podem rejeitar a linha inteira. Um arquivo com novo hash
não tem reconciliação de atualização clínica: pode gerar outro atendimento. A
fonte legada guarda o último ano de retorno e é atualizada, portanto esse fluxo
precisa de contrato temporal. A fixture antiga não cobre essas novas exigências.

Não existem DTOs nem endpoints clínicos a corrigir: precisam ser implementados.
O guard de perfis permite rota autenticada sem metadados `@Perfis`; autorização
explícita por operação/recurso ainda é trabalho de cada novo módulo. O helper de
banco faz transação por consulta, não por uma sequência clínica de várias consultas.

Dados reais continuam bloqueados por governança institucional, ambiente
protegido, TLS, gestão/rotação de segredos, backup e retenção, auditoria de acesso,
responsáveis por autorizar lotes e revisar inconsistências e resposta a
incidentes. Autorização por recurso/linha e requisitos dos módulos clínicos
permanecem pendentes; necessidade de rate limit distribuído depende da topologia
de implantação e não é requisito para avançar com um MVP sintético local.

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

Na análise de 2026-09-14 foram inspecionados código, migrations, dump, testes, CI e
Docker, além de consultas somente de leitura ao schema/permissões do ambiente
Docker. Passaram cinco testes Python, 17 testes unitários do backend, TypeScript
sem emissão, verificações documental/manifesto e configuração Docker. Não foram
reexecutados E2E, testes SQL, integração HTTP/SQL nem CI remoto; não houve nova
homologação completa ou regeneração do dump. A atualização subsequente alterou
somente documentação e tem validação delimitada no registro cronológico.
