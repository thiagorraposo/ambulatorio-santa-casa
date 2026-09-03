# Histórico de Implementação

> Documento histórico. Não representa o estado vigente do sistema; sua
> reconstrução termina em 2026-07-01. Consulte
> [`../ESTADO_ATUAL_DO_PROJETO.md`](../ESTADO_ATUAL_DO_PROJETO.md) e
> [`../REGISTRO_DE_ALTERACOES.md`](../REGISTRO_DE_ALTERACOES.md).

Atualizado em: 2026-07-01

Este histórico foi reconstruído a partir do log Git, dos scripts SQL versionados e da evidência física em `docs/evidencias/schema_atual_ambulatorio.sql`. O dump confirma 25 tabelas aplicadas no schema `ambulatorio`, todas cobertas pelas migrations existentes.

## 2026-06-15 16:06:40 - Commit `64081d3`

Título: Estrutura inicial do projeto

Arquivos envolvidos:

- `.gitignore`
- `README.md`
- `docs/historico/decisoes-modelagem.md`
- `docs/historico/dicionario-dados.md`
- `sql/00_criar_banco.sql`
- `sql/01_criar_schema.sql`

Tabelas criadas, alteradas ou removidas: nenhuma.

Objetivo da mudança: criar a estrutura inicial de arquivos e diretórios.

Impacto no modelo de dados: nenhum, pois os arquivos SQL foram criados vazios neste commit.

Observações:

- `README.md`, `docs/historico/decisoes-modelagem.md` e `docs/historico/dicionario-dados.md` permanecem vazios na versão analisada.

## 2026-06-15 16:53:04 - Commit `26e727c`

Título: adiciona scripts iniciais no banco

Arquivos envolvidos:

- `.gitignore`
- `sql/00_criar_banco.sql`
- `sql/01_criar_schema.sql`

Tabelas criadas, alteradas ou removidas: nenhuma tabela.

Objetivo da mudança:

- Criar a role `ambulatorio_user`, caso não exista.
- Criar o banco `ambulatorio_santa_casa`, caso não exista.
- Criar o schema `ambulatorio`.
- Configurar o `search_path` do banco para `ambulatorio, public`.

Impacto no modelo de dados:

- Define a base física onde as tabelas futuras serão criadas.
- Não cria entidades de domínio.

Observações:

- O script `00_criar_banco.sql` não define senha para o usuário, preservando o cuidado de não versionar credenciais.
- O usuário é criado com `LOGIN CREATEDB`.

## 2026-06-15 17:32:07 - Commit `ee70688`

Título: cria tabelas inicias de pacientes

Arquivos envolvidos:

- `sql/02_tabelas_paciente.sql`

Tabelas criadas:

- `paciente`
- `paciente_endereco`
- `paciente_contato`

Objetivo da mudança:

- Criar o núcleo de cadastro de pacientes.
- Separar endereço e contato em tabelas próprias vinculadas ao paciente.

Impacto no modelo de dados:

- `paciente` passa a ser a entidade raiz para dados demográficos.
- `paciente_endereco` e `paciente_contato` dependem de `paciente` por FK com `ON DELETE CASCADE`.
- Foram adicionadas validações por `CHECK` para `sexo` e `tipo_comunidade_tradicional`.

Observações:

- O script não define `SET search_path`; depende do `search_path` configurado no banco ou da sessão.

## 2026-06-15 21:17:26 - Commit `8b98925`

Título: cria tabelas inicias de atendimento

Arquivos envolvidos:

- `sql/03_tabelas_atendimento.sql`

Tabelas criadas:

- `atendimento`

Objetivo da mudança:

- Registrar atendimentos vinculados aos pacientes.

Impacto no modelo de dados:

- `atendimento` referencia `paciente(paciente_id)` com `ON DELETE RESTRICT`.
- Foram criados índices para `paciente_id` e `data_atendimento`.
- Foi criada restrição para impedir que `ambulatorio_unicamente` e `ambulatorio_anexo_projeto` sejam verdadeiros simultaneamente.
- Foi criado domínio controlado para `origem_registro`.

Observações:

- A partir deste script há `SET search_path TO ambulatorio, public;`.

## 2026-06-16 14:15:58 - Commit `7152122`

Título: cria tabelas iniciais de projetos e estudos

Arquivos envolvidos:

- `sql/04_tabelas_projetos_estudos.sql`

Tabelas criadas:

- `projeto_estudo`
- `atendimento_projeto_estudo`

Objetivo da mudança:

- Criar catálogo de projetos/estudos.
- Relacionar atendimentos com projetos/estudos.

Impacto no modelo de dados:

- `projeto_estudo` possui código único por `codigo_projeto`.
- `atendimento_projeto_estudo` referencia `atendimento` com `ON DELETE CASCADE` e `projeto_estudo` com `ON DELETE RESTRICT`.
- Há unicidade para o par `(atendimento_id, projeto_estudo_id)`.
- Foram inseridos registros iniciais de catálogo para SaMi-Trop, Parachute, BenBrasil, EPOCA, Santa Casa DICA, RENOMICA, ARCHIMEDES, CHARM e LXE Novartis.

Observações:

- A tabela associativa preserva valores brutos da planilha em campos `valor_original_*`.

## 2026-06-16 15:19:45 - Commit `9855340`

Título: cria tabelas diagnóstico e sorologia

Arquivos envolvidos:

- `sql/05_tabelas_diagnostico_sorologia.sql`

Tabelas criadas:

- `diagnostico_chagas`
- `sorologia_chagas`
- `sorologia_solicitacao`
- `historico_familiar_chagas`

Objetivo da mudança:

- Registrar diagnóstico de doença de Chagas, sorologias relacionadas, solicitações de sorologia e histórico familiar.

Impacto no modelo de dados:

- `diagnostico_chagas` é 1:1 com `atendimento` por `UNIQUE(atendimento_id)`.
- `sorologia_chagas` depende de `diagnostico_chagas` e limita `numero_metodo_planilha` entre 1 e 3.
- `sorologia_chagas` tem unicidade por `(diagnostico_chagas_id, numero_metodo_planilha)`.
- `sorologia_solicitacao` depende diretamente de `atendimento`.
- `historico_familiar_chagas` é 1:1 com `paciente`.
- Foram criados checks para status e resultados padronizados.

Observações:

- O modelo distingue diagnóstico, sorologia executada e solicitação de sorologia.

## 2026-06-16 15:41:00 - Commit `cefc106`

Título: cria tabelas condições e comorbidades

Arquivos envolvidos:

- `sql/06_tabelas_condicoes_comorbidades.sql`

Tabelas criadas:

- `condicao_chagas`
- `complicacao_chagas`
- `comorbidade`
- `paciente_comorbidade`

Objetivo da mudança:

- Registrar condição clínica da doença de Chagas, complicações e comorbidades.

Impacto no modelo de dados:

- `condicao_chagas` é 1:1 com `atendimento`.
- `complicacao_chagas` permite múltiplos registros por atendimento.
- `comorbidade` é catálogo com unicidade por `nome_comorbidade`.
- `paciente_comorbidade` associa paciente e comorbidade, com vínculo opcional ao atendimento.
- Há unicidade por `(paciente_id, comorbidade_id)`.

Observações:

- Foram adicionados índices para FKs e para `tipo_complicacao`.

## 2026-06-16 15:41:00 - Commit `cde1fb4`

Título: cria tabelas de exames complementares

Arquivos envolvidos:

- `sql/06_tabelas_condicoes_comorbidades.sql`
- `sql/07_tabelas_exames_complementares.sql`

Tabelas criadas:

- `tipo_exame_complementar`
- `atendimento_exame_complementar`
- `exame_complementar_resultado`

Objetivo da mudança:

- Criar estrutura para exames complementares, exames por atendimento e resultados estruturados.

Impacto no modelo de dados:

- `tipo_exame_complementar` é catálogo com unicidade por `codigo_exame`.
- `atendimento_exame_complementar` referencia `atendimento` e `tipo_exame_complementar`.
- `exame_complementar_resultado` referencia `atendimento_exame_complementar`.
- Foram criadas validações para categoria, origem, status e resultado/interpretação.
- Foram inseridos tipos iniciais de exame.

Observações:

- O commit registra também `sql/06_tabelas_condicoes_comorbidades.sql`, já criado no commit `cefc106` no histórico. Isso indica divergência/duplicidade no histórico Git, possivelmente causada por ramificação ou merge. A versão atual do arquivo deve ser considerada a referência.

## 2026-06-16 20:24:15 - Commit `1d8289f`

Título: cria tabelas de encaminhamentos e acompanhamento

Arquivos envolvidos:

- `sql/08_tabelas_encaminhamentos_acompanhamento.sql`

Tabelas criadas:

- `tipo_encaminhamento`
- `encaminhamento`
- `acompanhamento_cuidado`
- `pendencia_atendimento`

Objetivo da mudança:

- Modelar encaminhamentos, continuidade do cuidado, retornos/acompanhamentos e pendências de atendimento.

Impacto no modelo de dados:

- `tipo_encaminhamento` é catálogo com unicidade por `codigo_tipo`.
- `encaminhamento` depende de `atendimento` e pode referenciar `tipo_encaminhamento`.
- `acompanhamento_cuidado` depende de `atendimento` e pode referenciar `encaminhamento`.
- `pendencia_atendimento` depende de `atendimento`.
- Foram criados checks para origem, status e prioridade dos encaminhamentos, status de acompanhamento e status de pendência.
- Foram inseridos tipos iniciais de encaminhamento.

Observações:

- Relações opcionais usam `ON DELETE SET NULL` quando a preservação do registro dependente é desejada.

## 2026-06-16 20:38:10 - Commit `9117205`

Título: Merge remote-tracking branch `origin/main`

Arquivos envolvidos: não há lista de arquivos alterados no trecho de log analisado.

Tabelas criadas, alteradas ou removidas: nenhuma alteração direta identificada.

Objetivo da mudança: merge de branch remota.

Impacto no modelo de dados: não identificado.

Observações:

- O histórico anterior já mostra duplicidade envolvendo `sql/06_tabelas_condicoes_comorbidades.sql`.

## 2026-06-16 21:38:04 - Commit `a3254dd`

Título: cria tabelas de medicamentos e tratamentos

Arquivos envolvidos:

- `sql/09_tabelas_medicamentos_tratamentos.sql`

Tabelas criadas:

- `medicamento`
- `atendimento_medicamento`
- `tratamento_chagas`
- `procedimento_clinico`

Objetivo da mudança:

- Modelar catálogo de medicamentos, medicamentos por atendimento, tratamento de Chagas e procedimentos/condutas clínicas.

Impacto no modelo de dados:

- `medicamento` é catálogo com unicidade por `codigo_medicamento`.
- `atendimento_medicamento` depende de `atendimento` e pode referenciar `medicamento`.
- `tratamento_chagas` depende de `atendimento` e pode referenciar `medicamento`.
- `procedimento_clinico` depende de `atendimento`.
- Foram adicionados checks para tipo de registro, finalidade, status de uso, status de tratamento, adesão e status de procedimento.
- Foram inseridos medicamentos iniciais, incluindo benznidazol e nifurtimox.

Observações:

- Esta é a migration mais recente e adiciona as tabelas mais recentes do modelo atual.

## 2026-07-01 - Documentação do Estado Atual

Arquivos envolvidos:

- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/historico/HISTORICO_DE_IMPLEMENTACAO.md`
- `docs/MODELO_FISICO_ATUAL.md`
- `docs/REGISTRO_DE_ALTERACOES.md`
- `docs/PROXIMOS_PASSOS.md`

Tabelas criadas, alteradas ou removidas: nenhuma.

Objetivo da mudança:

- Documentar o estado real do projeto a partir de Git, migrations e documentação existente.

Impacto no modelo de dados: nenhum.

Observações:

- Nenhuma migration, código, configuração ou banco de dados foi alterado nesta tarefa.

## 2026-07-01 - Reconciliação com Schema Físico Aplicado

Arquivos envolvidos:

- `docs/evidencias/schema_atual_ambulatorio.sql`
- `docs/validacoes/VALIDACAO_MODELO_FISICO.md`
- `docs/ESTADO_ATUAL_DO_PROJETO.md`
- `docs/historico/HISTORICO_DE_IMPLEMENTACAO.md`
- `docs/MODELO_FISICO_ATUAL.md`
- `docs/REGISTRO_DE_ALTERACOES.md`
- `docs/PROXIMOS_PASSOS.md`

Tabelas criadas, alteradas ou removidas: nenhuma.

Objetivo da mudança:

- Reconciliar a documentação com o schema físico real aplicado no PostgreSQL.
- Registrar que o schema `ambulatorio` possui 25 tabelas aplicadas.
- Comparar tabelas físicas com as migrations versionadas.

Impacto no modelo de dados: nenhum, pois não houve alteração no banco.

Observações:

- A evidência `docs/evidencias/schema_atual_ambulatorio.sql` tem prioridade sobre inferências feitas apenas pelas migrations.
- As 25 tabelas físicas encontradas existem também nos scripts SQL versionados.
- Não foram identificadas tabelas físicas sem migration correspondente.
- Não foram identificadas tabelas em migrations ausentes do banco físico.
