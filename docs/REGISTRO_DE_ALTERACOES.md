# Registro de Alterações

Atualizado em: 2026-07-18

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
