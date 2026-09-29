# Estado Atual do Projeto

Atualizado em: 2026-09-29

Esta é a síntese vigente do sistema. Detalhes normativos pertencem às fontes
temáticas indicadas abaixo; decisões antigas e resultados de etapas permanecem
preservados em `historico/`, `validacoes/` e no registro cronológico.

## Escopo e estágio

O projeto organiza registros do ambulatório em PostgreSQL e já contém migrations,
20 testes SQL transacionais, importador com homologação sintética do contrato v1, hardening, CI e
uma fundação NestJS com autenticação, autorização mínima e primeiros fluxos
clínicos transacionais. A importação HTTP existe sob ativação sintética explícita;
não há frontend nem autorização para dados reais.

A Etapa 4C está concluída. As respostas de [`Perguntas pendentes sobre campos e
regras clínicas.md`](Perguntas%20pendentes%20sobre%20campos%20e%20regras%20cl%C3%ADnicas.md)
foram incorporadas como referência autoritativa em 2026-09-28: idade derivada,
data de descoberta de Chagas, familiares, exames e retorno BZN. O roadmap oficial
mantém dez etapas: 1–4 concluídas e 5–10 restantes.
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
hashes e a implementação física de alguns contratos da 5A continuam pendentes.
As decisões humanas do documento de perguntas não estão mais pendentes. A Etapa
5B permanece em andamento.

Em 2026-09-25 foi concluída a especificação da extensão física de revisão temporal:
linhagem, decisões atribuíveis, histórico por campo e controles de aplicação.
Naquela data, tratava-se de proposta documental da ADR-022, sem aplicação das
novas relações. A implementação sintética posterior está descrita a seguir;
ela não representa atualização do banco persistente.
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
  clínicas; o manifesto v1.2 declara 126 rótulos plenos, nove preservados apenas no
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
- O backend não executa migrations nem DDL; suas operações clínicas são
  transacionais e o worker de importação utiliza credencial separada. A role da
  aplicação não lê as tabelas de proveniência; o importador não acessa a
  identidade funcional.
- Dados reais, planilhas reais, backups, credenciais e exports clínicos não podem
  ser versionados nem usados no ambiente atual. A política está em
  [`SEGURANCA_DE_DADOS.md`](SEGURANCA_DE_DADOS.md) e os riscos em
  [`THREAT_MODEL.md`](THREAT_MODEL.md).

## Limites e pendências

O modelo já permite idade derivada do nascimento, exames identificados por bloco,
acompanhamentos repetíveis e pendências textuais, e possui o rastreio familiar
mínimo com resultado. A semântica da data de descoberta de Chagas está resolvida,
e sua representação física foi adicionada pela migration 28 no ambiente descartável.
O registro de contrarreferências múltiplas permanece pendente no escopo clínico
da Etapa 5; o upload avançado continua no backlog posterior. Não há nova decisão
humana presumida. A exclusão funcional de `Localizado` foi confirmada,
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
O guard recusa rota privada sem metadados `@Perfis`; somente `@Public` permite
acesso público. A matriz explícita de cada operação usa política da classe ou
da operação. As operações clínicas
compostas compartilham transação e contexto atribuído ao ator. A listagem de
pacientes usa o mesmo filtro por vínculo e paginação da exportação.
O PATCH do paciente agora abrange comunidade, snapshot de endereço e adição
de telefones, mantendo dados anteriores. O PATCH do atendimento exige versão
e vínculo ao paciente. Atendimentos, exames, projetos, retornos BZN e pendências
possuem paginação; pendências possui filtro por status e DTO explícito de saída.
Dezoito cenários HTTP/SQL clínicos foram aprovados em instalação descartável 02–42,
incluindo três perfis, edição composta, rollback e concorrência de versões.
Coleções clínicas aninhadas ainda precisam de paginação integrada. Linhas de lote
possuem `limit`/`offset`, com metadados de página. A importação HTTP foi testada com
worker Python real e credenciais separadas: dry-run, carga inicial, idempotência,
consulta sanitizada de lote com os três perfis e recusa de revisão temporal.
O cadastro BZN pela API grava o tratamento canônico e suas reações, preserva ano
isolado sem inventar data e recusa duplicações concorrentes. O retorno BZN já
pode ser percorrido sem inserir o tratamento diretamente no banco. A edição de
tratamento existente e outros recursos clínicos ainda precisam de contrato HTTP.
Migrations 29–30, validadas em bancos descartáveis, fornecem funções restritas
de registro de fonte e gestão de autorização temporal. O ator vem do ledger do
XID; papéis NOLOGIN separados não possuem membros automáticos. A integridade
diferida usa dono técnico com privilégios limitados. Migrations 31–34 publicam
decisão/plano atomicamente, com hash canônico calculado pelo servidor e snapshots
observados no banco. Autorização, versão efetiva e metadados técnicos são
revalidados. Migrations 35–39 acrescentam arquivos técnicos recuperáveis pelos bytes e SHA-256,
preparação com bruto/manifesto conferidos, transformações determinísticas fechadas
e exigência de representação de todos os campos alterados e destinos derivados.
Correção/anulação exige captura atribuível desde a importação da linha-base,
com proveniência do alvo; marco legado e igualdade aparente não bastam. A prova
atual cobre a base inicial e sua cadeia do mesmo conteúdo; a continuidade por
revisões aplicadas ainda depende do executor. O login herdado do importador
agora também exige contexto, mesmo sem SET ROLE. Há aprovação sintética de nome
e data do atendimento sem mudança clínica, além de captura pelo escritor Python
real. Migrations 40–42 avaliam decisão publicada em READ ONLY e fornecem executor
privado para alvos existentes: correção/associação, eventos/proveniência, avanço
atômico da fonte, rollback e retomada sem duplicação. A simulação passou sem
alterações em todas as tabelas e sequências; dois executores produziram um único
sucesso. Criação de visitas/dependentes, fechamento, prova através das revisões
aplicadas e simulação de proposta/arquivo sem staging continuam pendentes. O
aceite integral F01–F16/T01–T18 e as demais transformações clínicas permanecem
obrigatórios; o executor não tem EXECUTE concedido a operadores.
O importador continua recusando revisão.

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
