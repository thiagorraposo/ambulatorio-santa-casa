# Estado Atual do Projeto

Atualizado em: 2026-09-28

Esta é a síntese vigente do sistema. Detalhes normativos pertencem às fontes
temáticas indicadas abaixo; decisões antigas e resultados de etapas permanecem
preservados em `historico/`, `validacoes/` e no registro cronológico.

## Escopo e estágio

O projeto organiza registros do ambulatório em PostgreSQL e já contém migrations,
dez testes SQL transacionais, importador com homologação sintética do contrato v1, hardening, CI e
uma fundação NestJS com autenticação, autorização mínima e primeiros fluxos
clínicos transacionais. Não há frontend, importação HTTP nem autorização para
dados reais.

A Etapa 4C está concluída. As doze respostas de `Perguntas pendentes.docx` foram
consolidadas documentalmente em 2026-09-14, mas ainda não incorporadas ao contrato
executável. O roadmap oficial mantém dez etapas: 1–4 concluídas e 5–10 restantes.
A Etapa 5 foi subdividida para resolver lacunas do importador, complementar
somente a modelagem indispensável e entregar o backend clínico; as Etapas 6–10
cobrem frontend, fluxos, complementos, produção e homologação.

Em 2026-09-15 foi entregue o primeiro incremento da Etapa 5B: reconciliação de
BZN no importador v1.1.1, validada com dez testes unitários e E2E sintético.
Em 2026-09-21 o importador v1.2.0 implementou o contrato técnico de promoção
controlada e habilitou D11 (`pendencias_observacao`). Em 2026-09-22, a v1.3.0
acrescentou a classificação conservadora de erros e a primeira regra não crítica,
`catalogo_projeto_ausente`, com nova tentativa seletiva no reprocessamento. A
suíte possui 19 testes unitários e E2E sintético. Também em 2026-09-22 foi definido
o [contrato temporal de revisão entre hashes](arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md)
(ADR-022). A v1.4.0 implementa sua primeira barreira: finalidade explícita,
recusa de revisão antes de escrita e preservação do fluxo do mesmo hash/layout.
A suíte agora possui 26 testes unitários e E2E sintético. Reconciliação entre
hashes e as demais decisões clínicas da 5A continuam pendentes. A Etapa 5B
permanece em andamento.

Em 2026-09-25 foi concluída a especificação da extensão física de revisão temporal:
linhagem, decisões atribuíveis, histórico por campo e controles de aplicação.
É proposta documental da ADR-022; nenhuma das novas relações está aplicada.
Entre 2026-09-27 e 2026-09-28 foram aplicadas, somente em banco descartável, as
migrations 21–27 para armazenamento e integridade da ADR-022, captura histórica,
contexto de proveniência, rastreio familiar mínimo, vínculo explícito de acesso e
views sanitizadas de acompanhamento de lotes.
Foram adicionados testes SQL transacionais e a API ganhou ficha de paciente e
criação/consulta de atendimentos com DTOs, SQL parametrizado, transação e
controle de versão. A revisão entre hashes continua desabilitada.

## Componentes vigentes

- PostgreSQL no schema `ambulatorio`, construído por migrations incrementais de
  `sql/00_criar_banco.sql` a `sql/20_isolar_identidade_do_importador.sql`.
- Schema aplicado com 38 tabelas, todas reconciliadas com as migrations. A
  descrição humana é [`MODELO_FISICO_ATUAL.md`](MODELO_FISICO_ATUAL.md) e a
  evidência física é
  [`evidencias/schema_atual_ambulatorio.sql`](evidencias/schema_atual_ambulatorio.sql).
- Importador v1 em Python, homologado com fixture sintética nas duas abas
  clínicas; o manifesto v1.1 declara 125 rótulos plenos, dez preservados apenas no
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
  dados sintéticos. A API expõe saúde, autenticação, listagem, ficha de paciente
  e atendimentos; os novos fluxos permanecem desabilitados por padrão até a
  política de acesso.

## Garantias atuais

- O importador valida manifesto/layout, trabalha por linha em transação, concilia
  pacientes e registra proveniência. Idempotência e reprocessamento encadeado
  existem para o contrato v1; a promoção controlada está habilitada para D11.
  A v1.4.0 exige finalidade explícita e recusa revisões, inclusive em dry-run.
  Atualização de uma mesma linha clínica em arquivo modificado e as demais
  promoções têm limitações descritas abaixo.
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

O importador já reconcilia BZN do mesmo paciente, preservando o vínculo original,
preenchendo nulos e rejeitando divergências com rollback. O caminho de
reprocessamento separa linhas concluídas das que ainda têm pendências e promove
somente chaves registradas. Para D11, reutiliza as âncoras da proveniência, cria ou
associa uma pendência textual sem inferir classificação e isola novas escritas em
savepoint; edição manual ambígua permanece intacta e pendente. As outras dez chaves
continuam somente no bruto. Erros são críticos por padrão; catálogo de projeto
ausente é a primeira exceção explícita, preserva o atendimento e pode ser resolvida
sem nova visita após correção do catálogo. Os demais erros secundários ainda podem
rejeitar a linha inteira.
Um arquivo com novo hash não tem reconciliação de atualização clínica. A v1.4.0
recusa revisões e exige carga inicial declarada para iniciar novo conteúdo;
declaração incorreta ainda pode gerar outro atendimento. O contrato temporal já
distingue revisão de nova visita, mas linhagem entre hashes, mapeamento e auditoria
por campo ainda precisam ser implementados antes de habilitar revisões.
A representação estruturada do ano legado continua pendente; nenhum histórico
ausente pode ser reconstruído automaticamente.

Existem DTOs e endpoints para paciente, atendimento, consulta de lotes e
importação HTTP multipart com credenciais separadas. Retornos BZN, projetos,
exames, notificação e tratamento já possuem consultas; contrarreferência e demais
recursos ainda precisam ser integrados. A importação permanece desabilitada por
padrão e em produção.
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
