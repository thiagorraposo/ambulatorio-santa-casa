# Registro de Alterações

Atualizado em: 2026-08-19

## Como Registrar Mudanças

Toda mudança relevante no projeto deve ser registrada neste arquivo antes de concluir a tarefa.

Registre mudanças quando houver:

- Criação ou alteração de migration.
- Criação, remoção ou alteração de tabela.
- Inclusão, remoção ou alteração de coluna.
- Mudança de PK, FK, índice, `CHECK`, `UNIQUE`, `DEFAULT` ou regra de deleção.
- Alteração de relacionamento entre entidades.
- Criação ou alteração de módulo.
- Ajuste de regra de negócio.
- Mudança na estrutura do sistema, backend, frontend, importação, testes ou implantação.

Além deste arquivo, atualize quando necessário:

- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/MODELO_FISICO_ATUAL.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/HISTORICO_DE_IMPLEMENTACAO.md`

Antes de finalizar qualquer tarefa futura, verifique se a documentação correspondente foi atualizada.

## 2026-08-19 - Backup, restauração controlada e Docker como padrão

Data: 2026-08-19

Título da alteração: Recuperação lógica validável no Docker de desenvolvimento.

Impacto:

- backups custom do `pg_dump` em diretório local ignorado;
- serviço de restauração sem porta publicada e com volume separado;
- confirmação explícita do ambiente para qualquer restore;
- validação de tabelas, constraints, índices, catálogos e oito testes SQL;
- Docker Compose passa a ser o padrão estrutural e de testes; PostgreSQL local
  permanece preservado como alternativa manual explícita.

Validação: fluxo completo de dump/restore, `docker-project-check`, confirmação de
`ROLLBACK`, ausência sintética e `git diff --check`.

## 2026-08-13 - PostgreSQL 16 reproduzível com Docker Compose

Data: 2026-08-13

Título da alteração: Ambiente PostgreSQL Docker isolado e opcional.

Arquivos principais:

- `compose.yaml`;
- `.env.example`;
- `Makefile`;
- README, workflow, segurança e estado atual.

Impacto:

- imagem `postgres:16.15`, porta `127.0.0.1:5433`, healthcheck e volume nomeado
  `ambulatorio_santa_casa_postgres_data`;
- escolha explícita por `DB_ENV=local` ou `DB_ENV=docker`;
- alvos para subir, aguardar, consultar status/logs, migrar, testar, gerar dump,
  recriar preservando volume e destruir somente o ambiente Docker;
- `.env` local ignorado e `.env.example` sem credencial real;
- PostgreSQL local preservado como ambiente oficial.

Validação:

- banco Docker vazio reconstruído exclusivamente por `sql/00`–`sql/16`;
- 37 tabelas confirmadas e oito testes aprovados com `ROLLBACK`;
- zero pacientes e registros sintéticos finais nas tabelas auditadas;
- dump Docker comparado à evidência: nenhuma diferença estrutural; apenas token
  aleatório do `pg_dump` e versão do servidor 16.15 versus 16.14 local;
- container recriado com novo ID e mesmo volume; 37 tabelas e 10 projetos de
  catálogo preservados;
- PostgreSQL local consultado somente para confirmação final: 37 tabelas, 10
  projetos e zero pacientes;
- `git diff --check` executado.

Riscos pendentes:

- a imagem está fixada em patch específico e requer atualização controlada;
- não há backup/restauração automatizado nem política para dados reais;
- Compose ainda não é o ambiente oficial padrão.

## 2026-08-13 - Implementação do encaminhamento ampliado

Data: 2026-08-13

Título da alteração: Última migration mínima do MVP.

Arquivos principais:

- `sql/16_encaminhamento_ampliado.sql`;
- `tests/sql/08_validar_encaminhamento_ampliado.sql`;
- `docs/VALIDACAO_ENCAMINHAMENTO_AMPLIADO.md`;
- especificação, dump estrutural e documentos de estado, modelo, cobertura,
  decisões e próximos passos.

Impacto:

- quatro colunas anuláveis adicionadas a `encaminhamento`;
- FK opcional para `projeto_estudo` com `ON DELETE RESTRICT`;
- índice parcial por projeto;
- PK e FK de atendimento com `ON DELETE CASCADE` preservadas;
- nenhuma tabela, `UNIQUE`, `CHECK` cruzado, backfill, escrita dupla,
  `paciente_id`, projeto automático ou alteração de contrarreferência;
- schema mantido em 37 tabelas;
- cobertura plena elevada de 129/136 para 131/136.

Validação:

- divergência inicial de `db-check` diagnosticada como bloqueio do sandbox à
  conexão local; PostgreSQL correto confirmado sem recriação;
- migration aplicada com `ON_ERROR_STOP=1`;
- 23 cenários aprovados, `ROLLBACK` alcançado e zero dados sintéticos finais;
- `make db-schema-dump` executado;
- `make project-check` e `git diff --check` aprovados;
- hashes das migrations 00–15 preservados.

Pendências:

- manifesto e regras do importador;
- governança, segurança e preparação do ambiente com Docker Compose;
- contrarreferência múltipla e demais itens de backlog pós-MVP.

## 2026-08-13 - Especificação do encaminhamento ampliado

Data: 2026-08-13

Título da alteração: Contrato físico da última evolução mínima antes do MVP.

Motivo: definir documento apresentado e projeto oficial opcional no
encaminhamento sem reinterpretar registros existentes nem incluir
contrarreferência ainda indefinida.

Arquivos criados ou modificados nesta especificação:

- `docs/ESPECIFICACAO_ENCAMINHAMENTO_AMPLIADO.md`;
- documentos de decisões humanas e arquiteturais, cobertura e próximos passos;
- este registro cronológico.

Impacto previsto:

- futura migration por `ALTER TABLE encaminhamento`, sem nova tabela;
- booleano anulável `documento_apresentado` e FK opcional para
  `projeto_estudo`, ambos com valores originais próprios;
- paciente determinado pelo atendimento obrigatório, sem coluna redundante;
- FK do projeto com `ON DELETE RESTRICT` e índice próprio;
- nenhuma unicidade nova, alteração legada, criação de projeto, backfill, escrita
  dupla ou dedução automática;
- contrarreferência mantida fora da migration e no backlog.

Validação prevista e executada nesta etapa documental:

- revisão do schema físico aplicado e das migrations existentes;
- `make project-check` executado; a etapa documental passou, mas o alvo parou em
  `db-check` porque a conexão disponível não correspondeu ao banco, usuário e
  schema esperados pelo projeto;
- `make docs-check` e `git diff --check` passaram.

Pendências ou riscos:

- implementar a migration incremental e o teste SQL sintético especificado;
- formalizar aliases, booleanos, conflitos e reprocessamento no importador;
- decidir cardinalidade da contrarreferência depois do MVP.

## 2026-08-13 - Implementação do tratamento canônico com benzonidazol

Data: 2026-08-13

Título da alteração: Tratamento de BZN por paciente e reações adversas repetíveis.

Motivo: implementar a extensão mínima do MVP conforme especificação aprovada,
preservando integralmente o tratamento legado por atendimento.

Arquivos criados ou modificados:

- `sql/15_tratamento_benzonidazol.sql`;
- `tests/sql/07_validar_tratamento_benzonidazol.sql`;
- `docs/VALIDACAO_TRATAMENTO_BENZONIDAZOL.md`;
- dump estrutural, especificação, README e documentos de estado, modelo,
  cobertura, decisões e próximos passos.

Impacto:

- adicionadas `tratamento_benzonidazol` e
  `reacao_adversa_benzonidazol`, elevando o schema de 35 para 37 tabelas;
- tratamento limitado a uma linha por paciente, com atendimento opcional
  consistente por FK composta;
- adicionados duração cumprida, ano aproximado, prescrição, indicadores
  triestados, motivos separados, valores originais e reações repetíveis;
- cobertura plena elevada de 124/136 para 129/136;
- `tratamento_chagas` preservada sem alteração, backfill ou escrita dupla.

Validação executada:

- `make db-check` passou contra o PostgreSQL local correto;
- migration aplicada atomicamente com `ON_ERROR_STOP=1`;
- teste isolado passou nos 27 cenários e confirmou o `ROLLBACK`;
- ausência final de dados sintéticos confirmada;
- assinatura de `tratamento_chagas` idêntica antes e depois;
- `make db-schema-dump` atualizou somente a evidência estrutural.

Pendências ou riscos:

- o importador, conversões e reconciliação permanecem fora deste módulo;
- encaminhamento ampliado é a migration mínima restante do MVP;
- domínios clínicos de gravidade e consequência continuam adiados.

## 2026-08-13 - Especificação do tratamento canônico com benzonidazol

Data: 2026-08-13

Título da alteração: Especificação do tratamento com BZN e reações adversas
repetíveis para o MVP.

Motivo: fechar o contrato físico da próxima migration mínima sem reinterpretar a
tabela legada por atendimento nem inventar regras clínicas ausentes da fonte.

Arquivos criados ou modificados:

- `docs/ESPECIFICACAO_TRATAMENTO_BENZONIDAZOL.md`;
- `docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`;
- `docs/COBERTURA_COLUNAS_PLANILHA.md`;
- `docs/DECISOES_ARQUITETURAIS.md`;
- `docs/ESTADO_ATUAL_DO_PROJETO.md`;
- `docs/PROXIMOS_PASSOS.md`;
- `docs/REGISTRO_DE_ALTERACOES.md`.

Migrations, tabelas e testes envolvidos:

- nenhuma migration, tabela, coluna ou teste SQL foi criado ou alterado;
- a futura migration criará `tratamento_benzonidazol`, única por paciente, e
  `reacao_adversa_benzonidazol`, repetível por tratamento;
- `tratamento_chagas` permanecerá intacta e não haverá backfill ou escrita dupla.

Impacto:

- fecha identidade, cardinalidades, campos, chaves, deleção, índices,
  proveniência e estratégia de transição;
- separa indicação, início, motivo de não indicação e motivo de não início;
- não promove antecipadamente a cobertura física, pois o schema continua com 35
  tabelas;
- classifica regras do importador e itens adiáveis sem bloqueio da migration.

Como validar:

- executar `make project-check`;
- executar `git diff --check`;
- confirmar que `git status --short` lista apenas documentação afetada.

Pendências ou riscos:

- implementar a futura migration e o teste SQL sintético especificado;
- formalizar no manifesto as conversões, reconciliação e reprocessamento;
- domínios institucionais de gravidade e consequência permanecem depois do MVP.

## 2026-08-06 - Implementação dos exames por paciente

Data: 2026-08-06

Título da alteração: Exames canônicos por paciente com atendimento opcional.

Motivo: implementar a segunda extensão mínima do MVP conforme especificação
aprovada, preservando as estruturas legadas sem backfill ou escrita dupla.

Arquivos criados ou modificados:

- `sql/14_exames_por_paciente.sql`;
- `tests/sql/06_validar_exames_por_paciente.sql`;
- `docs/VALIDACAO_EXAMES_POR_PACIENTE.md`;
- dump estrutural, especificação e documentos de estado, modelo, cobertura,
  decisões, próximos passos e README.

Impacto:

- adicionada `paciente_exame_complementar`, elevando o schema de 34 para 35
  tabelas;
- adicionada `uq_atendimento_id_paciente` e FK composta com
  `ON DELETE SET NULL (atendimento_id)`;
- adicionados cinco tipos genéricos aprovados ao catálogo;
- os 21 cabeçalhos de exames passaram de cobertura parcial para cobertura com
  transformação, elevando a cobertura plena para 124/136 (91,18%);
- tabelas legadas preservadas sem backfill, escrita dupla ou migração automática.

Validação executada:

- migration aplicada atomicamente com `ON_ERROR_STOP=1`;
- teste isolado passou nos 22 cenários e confirmou o `ROLLBACK`;
- ausência final de dados sintéticos confirmada;
- assinaturas das duas tabelas legadas idênticas antes e depois;
- constraints, ações de deleção e índices confirmados no catálogo;
- `make db-schema-dump` atualizou somente a evidência estrutural;
- `make project-check` e `git diff --check` passaram.

## 2026-08-06 - Especificação da evolução dos exames complementares

Data: 2026-08-06

Título da alteração: Especificação de exames canônicos por paciente.

Motivo: fechar a estrutura incremental necessária para os dois blocos de exames
do novo layout sem alterar o schema ou deduzir vínculos legados.

Arquivos criados ou modificados:

- `docs/ESPECIFICACAO_EVOLUCAO_EXAMES_COMPLEMENTARES.md`;
- `docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`;
- `docs/DECISOES_ARQUITETURAIS.md`;
- `docs/COBERTURA_COLUNAS_PLANILHA.md`;
- `docs/ESTADO_ATUAL_DO_PROJETO.md`;
- `docs/PROXIMOS_PASSOS.md`;
- `docs/REGISTRO_DE_ALTERACOES.md`.

Migrations envolvidas:

- nenhuma migration criada, alterada ou aplicada;
- a futura evolução deverá ocorrer em nova migration incremental.

Impacto:

- definida nova tabela canônica `paciente_exame_complementar`, com paciente
  obrigatório, atendimento opcional consistente e múltiplas ocorrências;
- definidos blocos `trazido` e `solicitado`, catálogo reutilizado, tipos livres,
  textos e valores originais;
- preservadas integralmente as três estruturas atuais de exames, sem backfill;
- cobertura física permanece inalterada até aplicação da futura migration.

Validação executada:

- `make docs-check`;
- `git diff --check`;
- `make db-check` confirmou o PostgreSQL local disponível;
- `make project-check` passou com os cinco testes SQL transacionais;
- PostgreSQL local 16.14 confirmado para a estratégia documentada.

## 2026-08-06 - Implementação da associação paciente–projeto

Data: 2026-08-06

Título da alteração: Associação consolidada entre paciente e projeto oficial.

Motivo: implementar a primeira extensão mínima do MVP conforme especificação
aprovada, sem alterar ou migrar silenciosamente os vínculos por atendimento.

Arquivos criados ou modificados:

- `sql/13_associacao_paciente_projeto.sql`;
- `tests/sql/05_validar_associacao_paciente_projeto.sql`;
- `docs/VALIDACAO_ASSOCIACAO_PACIENTE_PROJETO.md`;
- evidência estrutural, especificação e documentos de estado, modelo, cobertura,
  próximos passos e README.

Impacto:

- adicionada `paciente_projeto_estudo`, elevando o schema de 33 para 34 tabelas;
- adicionadas PK, FKs para paciente e projeto, unicidade do par e índice inverso;
- os 15 cabeçalhos de projetos passaram de cobertura parcial para cobertura com
  transformação, elevando a cobertura plena para 103/136 (75,74%);
- `atendimento_projeto_estudo` permaneceu intacta, sem backfill ou remoção;
- nenhuma regra do importador ou projeto adicional de falha foi criado.

Validação executada:

- migration aplicada com `ON_ERROR_STOP=1`;
- teste isolado passou nos 17 cenários e confirmou o `ROLLBACK`;
- ausência final de dados sintéticos confirmada;
- assinatura estrutural de `atendimento_projeto_estudo` idêntica antes e depois;
- `make db-schema-dump` atualizou somente a evidência estrutural;
- `make project-check` e `git diff --check` passaram.

## 2026-08-06 - Especificação da associação paciente–projeto

Data: 2026-08-06

Título da alteração: Especificação física da associação consolidada entre
paciente e projeto.

Motivo: fechar nome, cardinalidades, campos, constraints, proveniência e transição
da primeira migration mínima do MVP sem alterar o schema aplicado.

Arquivos criados ou modificados:

- `docs/ESPECIFICACAO_ASSOCIACAO_PACIENTE_PROJETO.md`
- `docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`
- `docs/DECISOES_ARQUITETURAIS.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/MODELO_FISICO_ATUAL.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada, alterada ou aplicada.
- A futura `paciente_projeto_estudo` foi especificada para migration incremental
  posterior a `sql/12`.

Impacto:

- Definida associação única por paciente e projeto, com participação, pendência,
  falha, valores originais e proveniência por `importacao_registro`.
- `atendimento_projeto_estudo` permanece intacta como associação
  legada/contextual, sem backfill ou remoção no MVP.
- A especificação está pronta para orientar migration e teste SQL sintético; as
  pendências restantes pertencem ao importador ou ao backlog.
- Corrigidas inconsistências sobre testes SQL, 136 cabeçalhos canônicos, status
  das ADRs implementadas e ordem cronológica do registro do novo layout.

Validação executada:

- `make docs-check` passou;
- `git diff --check` passou;
- `pg_isready -h localhost -p 5432 -d ambulatorio_santa_casa` retornou
  `no response`; por isso `make project-check` não foi executado e as etapas de
  banco permanecem sem revalidação nesta tarefa.

## 2026-07-20 - Análise de impacto do novo layout canônico

Data: 2026-07-20

Título da alteração: Análise de impacto do novo layout canônico da planilha.

Motivo: substituir o catálogo documental inferido pelos metadados físicos da nova
fonte canônica local e recalcular a cobertura do schema atual.

Arquivos modificados:

- `docs/IMPACTO_NOVO_LAYOUT_PLANILHA.md`
- `docs/METADADOS_SEGUROS_LAYOUT_PLANILHA.md`
- `docs/COBERTURA_COLUNAS_PLANILHA.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada ou alterada.

Tabelas e colunas afetadas:

- Nenhuma estrutura física alterada.
- A cobertura documental passa a usar 136 rótulos distintos das duas abas
  principais: 110 plenamente cobertos, 12 parciais, 1 não coberto e 13 dúvidas.

Impacto no sistema:

- Sem impacto no banco ou nos testes SQL.
- O planejamento passa a exigir mapeamento distinto por aba, posição e ocorrência.
- Abas operacional e auxiliares permanecem bloqueadas para importação até
  confirmação humana.

Como testar:

- Confirmar o `.xlsx` com `git check-ignore -v`.
- Executar `make project-check`.
- Revisar `git diff --check` e `git status --short`.

Pendências ou riscos:

- PostgreSQL local precisa estar disponível para concluir as etapas de banco do
  `make project-check`.
- Resolver os aliases, cabeçalhos ambíguos, tipos, unidades e papéis das abas
  auxiliares antes do importador ou de novas migrations.

## 2026-07-20 - Consolidação das decisões humanas do MVP

Data: 2026-07-20

Título da alteração: Consolidação das decisões humanas da nova planilha e revisão
da rota até o MVP.

Motivo: incorporar semânticas, cardinalidades, conversões, escopo e requisitos de
segurança confirmados, reconciliando-os com as 33 tabelas atuais.

Arquivos criados ou modificados:

- `docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`
- `docs/COBERTURA_COLUNAS_PLANILHA.md`
- `docs/IMPACTO_NOVO_LAYOUT_PLANILHA.md`
- `docs/METADADOS_SEGUROS_LAYOUT_PLANILHA.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada ou alterada nesta tarefa.
- Foram identificadas quatro especificações incrementais necessárias antes do MVP:
  paciente–projeto, exame por paciente, tratamento/reação adversa e
  encaminhamento/projeto.

Impacto:

- Cobertura atual conservadora: 88 plenos, 46 parciais, 1 não coberto e 1 dúvida,
  sobre 136 rótulos.
- A primeira versão limita-se às duas abas clínicas.
- Uso de dados reais permanece bloqueado por governança, privilégios, auditoria,
  retenção e preparação segura do servidor.

Validação executada:

- `make project-check` passou pelas verificações documentais e parou em `db-check`
  porque o PostgreSQL local esperado não estava disponível/configurado;
- `make docs-check` e `git diff --check` passaram como fallback.

Pendências:

- especificar e implementar as migrations futuras com testes sintéticos;
- formalizar o manifesto e o importador em tarefas posteriores;
- resolver os bloqueios operacionais antes de dados reais.

## 2026-07-19 - Implementação do módulo de importação e proveniência

Data: 2026-07-19

Título da alteração: Migration incremental de lote, linha bruta e associação genérica.

Motivo: implementar a estrutura aprovada de proveniência antes de qualquer importador ou acesso a dados reais.

Arquivos modificados:

- `sql/12_modulo_importacao_proveniencia.sql`
- `tests/sql/04_validar_modulo_importacao_proveniencia.sql`
- `docs/ESPECIFICACAO_MODULO_IMPORTACAO_PROVENIENCIA.md`
- `docs/VALIDACAO_MODULO_IMPORTACAO_PROVENIENCIA.md`
- `docs/MODELO_FISICO_ATUAL.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/COBERTURA_COLUNAS_PLANILHA.md`
- `docs/DECISOES_ARQUITETURAIS.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`
- `docs/evidencias/schema_atual_ambulatorio.sql`

Migrations envolvidas:

- Criada e aplicada localmente `sql/12_modulo_importacao_proveniencia.sql`.
- Nenhuma migration antiga foi alterada ou reaplicada.

Impacto e validação:

- Adicionadas `importacao_lote`, `importacao_linha` e `importacao_registro`, elevando o schema de 30 para 33 tabelas.
- Implementados SHA-256, reprocessamento composto, status, JSONB posicional, responsável legado, associação N:N, constraints, índices e deleções restritas.
- Não foram criados importador, manifesto, auditoria, roles, GIN, triggers, logs clínicos ou FK polimórfica.
- O teste isolado e a suíte completa passaram com `ROLLBACK`; nenhuma linha sintética persistiu.

Pendências ou riscos:

- Manifesto físico seguro, roles, política de retenção, auditoria operacional, transições e idempotência continuam necessários antes do importador.
- A associação genérica depende de validação operacional do alvo heterogêneo.

## 2026-07-19 - Fechamento da especificação de importação e proveniência

Data: 2026-07-19

Título da alteração: Resolução e delimitação dos bloqueios da migration de importação e proveniência.

Motivo: fechar o desenho estrutural do próximo módulo sem acessar dados reais, implementar importador ou alterar o schema.

Arquivos modificados:

- `docs/ESPECIFICACAO_MODULO_IMPORTACAO_PROVENIENCIA.md`
- `docs/METADADOS_SEGUROS_LAYOUT_PLANILHA.md`
- `docs/COBERTURA_COLUNAS_PLANILHA.md`
- `docs/DECISOES_ARQUITETURAIS.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada, alterada ou aplicada.

Decisões e impacto:

- Cada lote representa uma execução; reprocessamentos criam novo lote ligado a predecessor com o mesmo SHA-256 e layout.
- Linhas preservam posição e cabeçalhos duplicados em array JSONB ordenado.
- Responsável pela digitação permanece texto legado sem vínculo com usuário.
- `importacao_registro` materializa relação N:N genérica com os registros estruturados.
- Status, cardinalidades, constraints, índices e `ON DELETE RESTRICT` foram definidos.
- O módulo passa a estar pronto para orientar migration incremental e teste SQL sintético.

Como validar:

- Revisar a especificação contra os metadados seguros existentes.
- Executar `make project-check` e confirmar ausência de alterações em `sql/`, `tests/sql/`, dump e banco.

Pendências ou riscos:

- Manifesto físico de abas/posições, roles, política de retenção, importador e auditoria de alvos genéricos ainda precisam ser implementados antes de dados reais.
- A associação genérica não oferece FK para registros em tabelas heterogêneas.

## 2026-07-19 - Priorização de importação e proveniência

Data: 2026-07-19

Título da alteração: Reavaliação de cobertura e definição do próximo módulo incremental.

Motivo: reavaliar as entradas parciais, não cobertas e duvidosas contra o schema aplicado de 30 tabelas e reduzir risco de retrabalho antes das próximas extensões clínicas.

Arquivos modificados:

- `docs/COBERTURA_COLUNAS_PLANILHA.md`
- `docs/ESPECIFICACAO_MODULO_IMPORTACAO_PROVENIENCIA.md`
- `docs/DECISOES_ARQUITETURAIS.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada, alterada ou aplicada.

Decisões e impacto:

- A cobertura permanece em 114 entradas plenas, 12 parciais, 2 não cobertas e 12 duvidosas.
- Importação e proveniência foi priorizada antes de extensões de tratamento e fluxo assistencial por sua dependência transversal.
- O responsável legado será inicialmente preservado como texto de origem, sem equivalência automática com usuário autenticado.
- A futura migration permanece bloqueada até definir lote, reprocessamento, retenção do conteúdo bruto e vínculo aos registros gerados.

Como validar:

- Conferir a classificação contra o dump estrutural de 30 tabelas.
- Executar `make project-check` e confirmar ausência de alterações em `sql/`, `tests/sql/` e no banco.

Pendências ou riscos:

- Lista canônica ordenada de abas e colunas ainda ausente.
- Semântica e valores reais das lacunas clínicas ainda não inventariados.
- Retenção de conteúdo clínico bruto exige decisão de segurança antes da migration.

## 2026-07-19 - Implementação do módulo de notificação

Data: 2026-07-19

Título da alteração: Migration incremental de notificação consolidada por paciente.

Motivo: implementar a estrutura aprovada para preservar indicador, número e justificativa de notificação sem acrescentar regras condicionais ou sanitárias não comprovadas.

Arquivos modificados:

- `sql/11_modulo_notificacao.sql`
- `tests/sql/03_validar_modulo_notificacao.sql`
- `docs/ESPECIFICACAO_MODULO_NOTIFICACAO.md`
- `docs/VALIDACAO_MODULO_NOTIFICACAO.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/MODELO_FISICO_ATUAL.md`
- `docs/COBERTURA_COLUNAS_PLANILHA.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`
- `docs/evidencias/schema_atual_ambulatorio.sql`

Migrations envolvidas:

- Criada e aplicada localmente `sql/11_modulo_notificacao.sql`.
- Nenhuma migration antiga foi alterada ou reaplicada.

Impacto e validação:

- Adicionada `notificacao`, elevando o schema de 29 para 30 tabelas.
- Implementadas PK, FK para paciente com `ON DELETE CASCADE`, `UNIQUE(paciente_id)` e índice não único em `numero_notificacao`.
- O teste transacional aprovou os cinco estados permissivos, campos opcionais, defaults, número repetido, índice, `UNIQUE`, FK, cascata e `ROLLBACK`.
- A suíte completa passou e nenhuma linha sintética persistiu.

Pendências ou riscos:

- Normalização, posição canônica de `Caso não, justifique`, importação e proveniência permanecem pendentes.
- Histórico, retificações, data e fluxo sanitário continuam fora do escopo.

## 2026-07-18 - Especificação do módulo de notificação

Data: 2026-07-18

Título da alteração: Definição física do estado consolidado de notificação por paciente.

Motivo: preparar o próximo módulo incremental para `Paciente notificado?`, `Número notificação` e `Caso não, justifique` sem inventar regras sanitárias nem alterar o schema.

Arquivos modificados:

- `docs/ESPECIFICACAO_MODULO_NOTIFICACAO.md`
- `docs/DECISOES_ARQUITETURAIS.md`
- `docs/COBERTURA_COLUNAS_PLANILHA.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada, alterada ou aplicada.

Decisões:

- Uma notificação consolidada por paciente, com `UNIQUE(paciente_id)` e sem vínculo com atendimento na primeira versão.
- FK para paciente com `ON DELETE CASCADE` e índice não único para número da notificação.
- Valores normalizados opcionais e três campos `valor_original_*`.
- Combinações incompletas ou contraditórias serão preservadas; validações condicionais pertencem à futura importação, sem `CHECK` rígido.

Como validar:

- Revisar a especificação contra o dump físico, o dicionário planejado e a ADR-010.
- Executar `make project-check` sem modificar o schema.

Pendências ou riscos:

- Confirmar posição e valores reais dos três cabeçalhos antes da importação.
- Histórico, retificações, data e fluxo sanitário permanecem fora do escopo por falta de evidência.
- A migration futura deverá seguir a especificação e incluir teste SQL transacional; não foi criada nesta etapa.

## 2026-07-18 - Recálculo de cobertura do schema de 29 tabelas

Data: 2026-07-18

Título da alteração: Reconciliação das 140 entradas da planilha após o módulo de avaliação clínica.

Motivo: recalcular a cobertura contra o dump físico de 29 tabelas e orientar a próxima expansão sem alterar o schema.

Arquivos modificados:

- `docs/COBERTURA_COLUNAS_PLANILHA.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada, alterada ou aplicada.

Impacto no sistema:

- A cobertura plena passou de 97 para 112 entradas de 140, porque 15 entradas agora possuem destino nas quatro tabelas de `sql/10_modulo_avaliacao_clinica.sql`.
- Permanecem 12 entradas parcialmente cobertas, 4 não cobertas e 12 dúvidas pendentes.
- O próximo módulo recomendado passa a ser notificação da doença de Chagas, sujeito a especificação e decisões de cardinalidade, temporalidade e vínculo.

Como validar:

- Conferir as classificações contra `docs/evidencias/schema_atual_ambulatorio.sql` e as migrations versionadas.
- Confirmar que as cinco categorias somam 140 e que os percentuais são consistentes.
- Executar `make project-check` sem modificar o schema.

Pendências ou riscos:

- A lista canônica ordenada da planilha e a posição dos cabeçalhos duplicados continuam ausentes.
- `Caso não, justifique` precisa ser confirmado como parte do bloco de notificação.
- Autoria da digitação, duração original do tratamento e infraestrutura de importação/proveniência continuam sem destino físico completo.

## 2026-07-18 - Implementação do módulo de avaliação clínica

Data: 2026-07-18

Título da alteração: Migration incremental de avaliação clínica, eventos, dispositivos e óbito.

Motivo: implementar a estrutura aprovada em `docs/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md` sem alterar migrations antigas nem antecipar regras de importação.

Arquivos modificados:

- `sql/10_modulo_avaliacao_clinica.sql`
- `tests/sql/02_validar_modulo_avaliacao_clinica.sql`
- `docs/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md`
- `docs/VALIDACAO_MODULO_AVALIACAO_CLINICA.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/MODELO_FISICO_ATUAL.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`
- `docs/evidencias/schema_atual_ambulatorio.sql`
- `README.md`

Migrations envolvidas:

- Criada `sql/10_modulo_avaliacao_clinica.sql`.
- Aplicada de forma controlada no banco local previamente confirmado com 25 tabelas e sem aplicação parcial.
- Nenhuma migration antiga foi alterada ou reaplicada.

Tabelas e colunas afetadas:

- `dados_clinicos_atendimento`: avaliação objetiva opcional, uma por atendimento.
- `evento_clinico`: eventos longitudinais repetíveis por paciente.
- `dispositivo_implantado`: estado consolidado único por paciente e tipo.
- `obito`: desfecho consolidado único por paciente.

Impacto no sistema:

- A migration adiciona quatro tabelas, quatro FKs com `ON DELETE CASCADE`, três constraints `UNIQUE` e dois índices explícitos.
- Não adiciona dados, triggers, regras clínicas de faixa, domínios fechados ou importação.
- A estratégia de reversão está documentada na migration, sem execução automática.

Como testar:

- Executar `make project-check` no banco local e conferir os `NOTICE` dos dois testes SQL.
- Confirmar a saída `ROLLBACK`, o aviso pós-transação de ausência do paciente sintético e o código de saída `0`.
- Confirmar pelo catálogo as 29 tabelas e as constraints das quatro tabelas novas.

Pendências ou riscos:

- A migration foi aplicada no banco local; os dois testes passaram e uma consulta independente confirmou zero dados sintéticos persistidos.
- O dump estrutural foi atualizado com `make db-schema-dump` e reconciliado com a documentação física.
- Unidades, NYHA, ano de AVC, semântica de reação adversa e rastreabilidade continuam pendentes para a futura importação.

## Modelo para Novas Alterações

Copie o bloco abaixo para cada nova alteração:

```markdown
## AAAA-MM-DD - Título da Alteração

Data:

Título da alteração:

Motivo:

Arquivos modificados:

- 

Migrations envolvidas:

- 

Tabelas e colunas afetadas:

- 

Impacto no sistema:

Como testar:

Pendências ou riscos:

- 
```

## 2026-07-16 - Validação prática do núcleo inicial

Data: 2026-07-16

Título da alteração: Validação prática do núcleo atual de 25 tabelas.

Motivo: executar a Etapa 1 no PostgreSQL local e registrar evidências verificáveis de inserções, constraints, consulta final e ausência de dados sintéticos persistidos.

Arquivos modificados:

- `docs/VALIDACAO_DADOS_DE_TESTE.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada, alterada ou reaplicada.

Tabelas e colunas afetadas:

- Nenhuma tabela ou coluna foi alterada.
- As 25 tabelas do núcleo receberam somente dados sintéticos temporários dentro da transação de teste.

Impacto no sistema:

- Sem alteração física ou persistência de dados no banco.
- A Etapa 1 passa a constar como validada no ambiente local em 2026-07-16.

Como testar:

- Executar `psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -v ON_ERROR_STOP=1 -f tests/sql/01_validar_nucleo_inicial.sql`.
- Confirmar os `NOTICE` dos testes positivos e negativos, as 25 linhas da consulta final e a saída `ROLLBACK`.
- Em nova sessão, consultar os identificadores-raiz e confirmar zero registros com prefixo `validacao_nucleo_`.
- Executar `make project-check`, `git diff --check` e `git status --short`.

Pendências ou riscos:

- A cobertura permanece limitada às constraints e aos cenários descritos em `docs/VALIDACAO_DADOS_DE_TESTE.md`.
- O próximo módulo físico ainda precisa ser definido antes de uma nova migration incremental.

## 2026-07-16 - Reconciliação da cobertura da planilha

Data: 2026-07-16

Título da alteração: Reconciliação das colunas mapeadas da planilha com o núcleo físico atual.

Motivo: identificar o que as 25 tabelas aplicadas já representam, separar lacunas reais de tabelas planejadas já absorvidas e orientar a próxima expansão incremental.

Arquivos modificados:

- `docs/COBERTURA_COLUNAS_PLANILHA.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada, alterada ou reaplicada.

Tabelas e colunas afetadas:

- Nenhuma tabela ou coluna física foi alterada.
- Foram classificadas 140 entradas únicas do CSV de mapeamento: 6 diretas, 91 com transformação, 12 parciais, 19 não cobertas e 12 dúvidas.

Impacto no sistema:

- Sem impacto físico no banco.
- A documentação passa a distinguir o planejamento antigo do schema aplicado e recomenda o módulo de avaliação clínica, eventos, dispositivos e desfecho.

Como testar:

- Conferir as 140 entradas contra `planejamento/tabelas dicionário de dados/03_coluna_planilha_destino.csv`.
- Comparar destinos propostos com `docs/evidencias/schema_atual_ambulatorio.sql` e migrations `sql/00` a `sql/09`.
- Executar `make project-check`, `git diff --check` e `git status --short`.

Pendências ou riscos:

- A lista canônica e ordenada das colunas por aba ainda precisa ser confirmada.
- O DER visual referenciado não está presente no repositório.
- Nenhuma recomendação deste levantamento autoriza alteração física sem decisão e migration incremental próprias.

## 2026-07-16 - Especificação do módulo de avaliação clínica

Data: 2026-07-16

Título da alteração: Especificação física de avaliação clínica, eventos, dispositivos e óbito.

Motivo: definir campos, tipos, cardinalidades, constraints, índices, deleções e fronteiras do próximo módulo sem criar migration prematuramente.

Arquivos modificados:

- `docs/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md`
- `docs/DECISOES_ARQUITETURAIS.md`
- `docs/COBERTURA_COLUNAS_PLANILHA.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada, alterada ou reaplicada.

Tabelas e colunas afetadas:

- Nenhuma estrutura física foi alterada.
- Foram especificadas, mas não criadas, `dados_clinicos_atendimento`, `evento_clinico`, `dispositivo_implantado` e `obito`.

Impacto no sistema:

- Sem impacto físico ou funcional.
- Define medidas por atendimento, fatos longitudinais por paciente e exclusividade de reação adversa atribuída ao tratamento em `tratamento_chagas`.

Como testar:

- Comparar a especificação com o dump físico, as migrations existentes e os campos do dicionário de planejamento.
- Conferir que nenhuma migration ou arquivo em `sql/` foi alterado.
- Executar `make project-check`, `git diff --check` e `git status --short`.

Pendências ou riscos:

- O módulo não está pronto para migration até validar unidades, NYHA, reação adversa, linhas negativas/desconhecidas e requisitos de proveniência.

## 2026-07-16 - Padronização do fluxo local com Make

Data: 2026-07-16

Título da alteração: Simplificação e automação do fluxo local não destrutivo.

Motivo: centralizar conexão, testes, documentação, validação do projeto e dump estrutural em comandos curtos e reproduzíveis, sem repetir linhas extensas em prompts.

Arquivos modificados:

- `Makefile`
- `README.md`
- `AGENTS.md`
- `docs/WORKFLOW_DE_DESENVOLVIMENTO.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada, alterada ou reaplicada.

Tabelas e colunas afetadas:

- Nenhuma tabela ou coluna foi alterada.

Impacto no sistema:

- Adiciona `make db-check` e `make db-test`.
- Torna `make project-check` estrito e responsável por documentação, banco, testes SQL, diff e status.
- Torna o dump estrutural atômico e mantém autenticação exclusivamente pelo mecanismo local do PostgreSQL.

Como testar:

- Executar `make help`.
- Executar `make db-check`.
- Executar `make db-test`.
- Executar `make docs-check`.
- Executar `make project-check`.
- Executar `make db-schema-dump` e revisar que o dump contém somente estrutura.
- Executar `git diff --check` e `git status --short`.

Pendências ou riscos:

- `db-test` depende de todos os arquivos em `tests/sql/` serem transacionais e seguros, conforme `tests/AGENTS.md`.
- O dump preserva a evidência quando não há mudança estrutural; quando houver alteração, o diff gerado exige revisão.

## 2026-07-16 - Delimitação das pendências do módulo clínico

Data: 2026-07-16

Título da alteração: Resolução e delimitação das pendências que bloqueavam a migration do módulo clínico.

Motivo: separar decisões de estrutura física das regras de transformação que dependem de conhecer unidades e semântica da planilha, sem inventar regras clínicas.

Arquivos modificados:

- `docs/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md`
- `docs/DECISOES_ARQUITETURAIS.md`
- `docs/COBERTURA_COLUNAS_PLANILHA.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada, alterada ou aplicada.

Tabelas e colunas afetadas:

- Nenhuma estrutura física foi alterada.
- A especificação futura das quatro tabelas foi tornada permissiva, removendo campos e `CHECK`s sem evidência local suficiente.

Impacto no sistema:

- Sem impacto físico ou funcional.
- O módulo passa a estar pronto para migration incremental; dúvidas de unidades, NYHA, ano e reação adversa permanecem bloqueadoras apenas da importação automática.

Como testar:

- Conferir a especificação contra o dicionário técnico, CSVs de mapeamento/transformação e ADR-009.
- Confirmar que nenhum arquivo em `sql/` ou `tests/sql/` foi alterado.
- Executar `make project-check`.

Pendências ou riscos:

- A futura migration deve seguir a especificação permissiva e não antecipar regras de importação.
- A importação continua bloqueada até resolver unidades, NYHA, ano do AVC, reação adversa e rastreabilidade por linha.

## 2026-07-01 - Documentação técnica do estado atual

Data: 2026-07-01

Título da alteração: Documentação técnica do estado atual do projeto.

Motivo: consolidar o estado real do repositório, histórico Git, migrations SQL e pendências conhecidas sem alterar código, migrations, banco ou configurações.

Arquivos modificados:

- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/HISTORICO_DE_IMPLEMENTACAO.md`
- `docs/MODELO_FISICO_ATUAL.md`
- `docs/REGISTRO_DE_ALTERACOES.md`
- `docs/PROXIMOS_PASSOS.md`

Migrations envolvidas:

- Nenhuma migration criada ou alterada.
- Migrations analisadas: `sql/00_criar_banco.sql` a `sql/09_tabelas_medicamentos_tratamentos.sql`.

Tabelas e colunas afetadas:

- Nenhuma tabela ou coluna foi alterada.

Impacto no sistema:

- Sem impacto funcional ou físico no banco.
- A documentação passa a refletir a estrutura versionada nas migrations existentes.

Como testar:

- Verificar que não houve alteração nos arquivos `sql/`.
- Verificar `git diff -- docs/`.
- Ler os documentos gerados e comparar com os scripts SQL versionados.

Pendências ou riscos:

- Pendência original superada em 2026-07-01 pela reconciliação com `docs/evidencias/schema_atual_ambulatorio.sql`.
- Documentos antigos `README.md`, `docs/dicionario-dados.md` e `docs/decisoes-modelagem.md` permanecem vazios.

## 2026-07-01 - Reconciliação documental com schema físico aplicado

Data: 2026-07-01

Título da alteração: Reconciliação documental com schema físico aplicado.

Motivo: incorporar a evidência `docs/evidencias/schema_atual_ambulatorio.sql`, que representa a estrutura física real aplicada no PostgreSQL, e corrigir trechos que tratavam a validação do banco como pendente.

Arquivos modificados:

- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/HISTORICO_DE_IMPLEMENTACAO.md`
- `docs/MODELO_FISICO_ATUAL.md`
- `docs/REGISTRO_DE_ALTERACOES.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/VALIDACAO_MODELO_FISICO.md`

Migrations envolvidas:

- Nenhuma migration criada ou alterada.
- Migrations reconciliadas: `sql/00_criar_banco.sql` a `sql/09_tabelas_medicamentos_tratamentos.sql`.

Tabelas e colunas afetadas:

- Nenhuma tabela ou coluna foi alterada.
- A documentação registra que o schema físico `ambulatorio` possui 25 tabelas aplicadas.

Impacto no sistema:

- Sem impacto funcional ou físico no banco.
- A documentação passa a priorizar a evidência do dump físico sobre inferências feitas apenas pelas migrations.

Como testar:

- Verificar que não houve alteração em `sql/`.
- Comparar `docs/evidencias/schema_atual_ambulatorio.sql` com `docs/VALIDACAO_MODELO_FISICO.md`.
- Conferir que as 25 tabelas físicas estão listadas como existentes também nas migrations.

Pendências ou riscos:

- Não reaplicar scripts antigos no banco atual.
- Criar migrations incrementais apenas após definição explícita de ajustes físicos necessários.
- O dicionário de dados e decisões de modelagem anteriores continuam vazios no repositório.

## 2026-07-01 - Implementação incremental do modelo físico

Data: 2026-07-01

Título da alteração: Implementação incremental do modelo físico.

Motivo: registrar como decisão arquitetural que as 25 tabelas atuais são o núcleo funcional inicial do banco e que a cobertura completa da planilha será construída em fases posteriores.

Tipo de registro: decisão arquitetural.

Arquivos modificados:

- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/MODELO_FISICO_ATUAL.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`
- `docs/VALIDACAO_MODELO_FISICO.md`

Migrations envolvidas:

- Nenhuma migration criada ou alterada.
- Nenhuma migration antiga deve ser alterada ou reaplicada no banco atual.

Tabelas e colunas afetadas:

- Nenhuma tabela ou coluna foi alterada.
- A decisão registra que as 25 tabelas atuais correspondem ao núcleo funcional inicial.
- A cobertura integral das 140 colunas da planilha será tratada em fases posteriores, antes da importação completa.

Impacto no sistema:

- Sem impacto físico no banco.
- A documentação passa a declarar que o modelo físico é incremental e que a ausência temporária das demais tabelas planejadas não é falha, lacuna involuntária ou divergência crítica.

Como testar:

- Criar dados de teste para o núcleo atual.
- Validar inserções, FKs, `UNIQUE`, `CHECK` e regras de integridade.
- Executar consultas representativas.
- Registrar problemas e decisões encontradas antes de definir o próximo módulo.

Pendências ou riscos:

- Definir o próximo módulo de tabelas a implementar.
- Criar migration incremental apenas depois da validação do núcleo atual.
- Atualizar a documentação antes de encerrar qualquer alteração futura.

## 2026-07-01 - Adoção do padrão Conventional Commits

Data: 2026-07-01

Título da alteração: Adoção do padrão Conventional Commits.

Motivo: padronizar as mensagens de commit do projeto em português, usando tipos convencionais para facilitar leitura do histórico, revisão e futuras automações.

Arquivos modificados:

- `docs/PADRAO_DE_COMMITS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada ou alterada.

Tabelas e colunas afetadas:

- Nenhuma tabela ou coluna foi alterada.

Impacto no sistema:

- Sem impacto físico no banco ou no comportamento do projeto.
- O projeto passa a documentar o padrão oficial de mensagens de commit.

Como testar:

- Conferir `docs/PADRAO_DE_COMMITS.md`.
- Conferir se commits futuros usam um dos prefixos permitidos.

Pendências ou riscos:

- Reforçar o padrão em revisões futuras.
- Avaliar futuramente hook local ou validação em CI para mensagens de commit.

## 2026-07-01 - Rotina de validação do núcleo inicial

Data: 2026-07-01

Título da alteração: Rotina de validação do núcleo inicial.

Motivo: criar uma rotina reutilizável para validar dados mínimos, relacionamentos e constraints principais das 25 tabelas atuais do schema `ambulatorio`.

Arquivos modificados:

- `tests/sql/01_validar_nucleo_inicial.sql`
- `docs/VALIDACAO_DADOS_DE_TESTE.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada ou alterada.

Tabelas e colunas afetadas:

- Nenhuma tabela ou coluna foi alterada.
- A rotina cobre as 25 tabelas atuais do núcleo físico inicial apenas com dados temporários dentro de transação.

Impacto no sistema:

- Sem impacto físico no banco, desde que executada até o `ROLLBACK` final.
- A rotina adiciona validação reutilizável para inserções, FKs, `UNIQUE`, `CHECK`, `NOT NULL` e consulta final de consistência.

Como testar:

- Executar:

```bash
psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -v ON_ERROR_STOP=1 -f tests/sql/01_validar_nucleo_inicial.sql
```

- Conferir os `NOTICE` de sucesso.
- Conferir a consulta final de registros temporários.
- Confirmar que os dados não permanecem no banco após o `ROLLBACK`.

Pendências ou riscos:

- O script ainda não foi executado nesta tarefa.
- Regras clínicas, permissões, performance, triggers inexistentes e cobertura completa da planilha continuam fora do escopo desta rotina.
- Atualizar a rotina após migrations relevantes que alterem tabelas, colunas ou constraints do núcleo.

## 2026-07-01 - Melhoria de workflow e governança técnica

Data: 2026-07-01

Título da alteração: Melhoria de workflow e governança técnica.

Motivo: tornar o trabalho com Codex mais previsível, seguro, reproduzível e fácil de retomar.

Arquivos modificados:

- `AGENTS.md`
- `sql/AGENTS.md`
- `tests/AGENTS.md`
- `docs/AGENTS.md`
- `docs/DECISOES_ARQUITETURAIS.md`
- `docs/SEGURANCA_DE_DADOS.md`
- `docs/WORKFLOW_DE_DESENVOLVIMENTO.md`
- `Makefile`
- `.gitignore`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/PROXIMOS_PASSOS.md`
- `docs/REGISTRO_DE_ALTERACOES.md`

Migrations envolvidas:

- Nenhuma migration criada ou alterada.
- Nenhum script SQL aplicado foi modificado.

Tabelas e colunas afetadas:

- Nenhuma tabela ou coluna foi alterada.

Impacto no sistema:

- Sem impacto físico no banco.
- Adiciona orientações permanentes para agentes, decisões arquiteturais, comandos locais seguros, regras de segurança de dados e workflow oficial.

Como testar:

- Executar `make help`.
- Executar `make docs-check`.
- Verificar que o Makefile não possui comandos destrutivos.
- Executar `git diff --check`.

Pendências ou riscos:

- `README.md` permanece vazio e deve ser preenchido em tarefa futura.
- CI e hooks de validação ainda não foram configurados.
- Comandos que acessam PostgreSQL dependem de ambiente local configurado.
