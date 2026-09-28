# Modelo Físico Atual

Atualizado em: 2026-09-21

Este documento descreve a estrutura física real aplicada no schema `ambulatorio`, usando como fonte principal o dump `docs/evidencias/schema_atual_ambulatorio.sql`. Os scripts em `sql/` foram usados como fonte de reconciliação.

O schema físico aplicado possui 38 tabelas. Todas as tabelas encontradas no dump existem nas migrations versionadas, e nenhuma tabela das migrations ficou ausente da evidência analisada.

## Estratégia de Construção por Fases

O modelo físico atual reúne as 37 tabelas clínicas/de proveniência anteriores e
a identidade funcional mínima `usuario_aplicacao`. Ela não representa role
PostgreSQL nem responsável legado. O modelo ainda não representa a cobertura final.

As demais tabelas previstas serão implementadas posteriormente por migrations incrementais. A ausência temporária dessas estruturas não representa falha, lacuna involuntária ou divergência crítica em relação ao plano do projeto.

Nenhuma migration antiga deve ser alterada ou reaplicada no banco atual. A
cobertura integral dos 136 cabeçalhos canônicos das duas abas clínicas será
tratada em fases posteriores de expansão e antes da importação completa da
planilha.

## Banco, Usuário e Schema

- Role: `ambulatorio_user`, criada com `LOGIN CREATEDB`.
- Banco: `ambulatorio_santa_casa`, owner `ambulatorio_user`, encoding `UTF8`.
- Schema: `ambulatorio`, autorizado para `ambulatorio_user`.
- `search_path` do banco: `ambulatorio, public`.

## Tabelas

## Cobertura Banco x Migrations

| Tabela | Banco físico | Migration correspondente | Situação |
| --- | --- | --- | --- |
| `acompanhamento_cuidado` | Sim | `sql/08_tabelas_encaminhamentos_acompanhamento.sql` | Banco e migration |
| `atendimento` | Sim | `sql/03_tabelas_atendimento.sql` | Banco e migration |
| `atendimento_exame_complementar` | Sim | `sql/07_tabelas_exames_complementares.sql` | Banco e migration |
| `atendimento_medicamento` | Sim | `sql/09_tabelas_medicamentos_tratamentos.sql` | Banco e migration |
| `atendimento_projeto_estudo` | Sim | `sql/04_tabelas_projetos_estudos.sql` | Banco e migration |
| `comorbidade` | Sim | `sql/06_tabelas_condicoes_comorbidades.sql` | Banco e migration |
| `complicacao_chagas` | Sim | `sql/06_tabelas_condicoes_comorbidades.sql` | Banco e migration |
| `condicao_chagas` | Sim | `sql/06_tabelas_condicoes_comorbidades.sql` | Banco e migration |
| `dados_clinicos_atendimento` | Sim | `sql/10_modulo_avaliacao_clinica.sql` | Banco e migration |
| `diagnostico_chagas` | Sim | `sql/05_tabelas_diagnostico_sorologia.sql` | Banco e migration |
| `dispositivo_implantado` | Sim | `sql/10_modulo_avaliacao_clinica.sql` | Banco e migration |
| `encaminhamento` | Sim | `sql/08_tabelas_encaminhamentos_acompanhamento.sql`, `sql/16_encaminhamento_ampliado.sql` | Banco e migrations |
| `evento_clinico` | Sim | `sql/10_modulo_avaliacao_clinica.sql` | Banco e migration |
| `exame_complementar_resultado` | Sim | `sql/07_tabelas_exames_complementares.sql` | Banco e migration |
| `historico_familiar_chagas` | Sim | `sql/05_tabelas_diagnostico_sorologia.sql` | Banco e migration |
| `importacao_linha` | Sim | `sql/12_modulo_importacao_proveniencia.sql` | Banco e migration |
| `importacao_lote` | Sim | `sql/12_modulo_importacao_proveniencia.sql` | Banco e migration |
| `importacao_registro` | Sim | `sql/12_modulo_importacao_proveniencia.sql` | Banco e migration |
| `medicamento` | Sim | `sql/09_tabelas_medicamentos_tratamentos.sql` | Banco e migration |
| `obito` | Sim | `sql/10_modulo_avaliacao_clinica.sql` | Banco e migration |
| `notificacao` | Sim | `sql/11_modulo_notificacao.sql` | Banco e migration |
| `paciente` | Sim | `sql/02_tabelas_paciente.sql` | Banco e migration |
| `paciente_exame_complementar` | Sim | `sql/14_exames_por_paciente.sql` | Banco e migration |
| `paciente_projeto_estudo` | Sim | `sql/13_associacao_paciente_projeto.sql` | Banco e migration |
| `paciente_comorbidade` | Sim | `sql/06_tabelas_condicoes_comorbidades.sql` | Banco e migration |
| `paciente_contato` | Sim | `sql/02_tabelas_paciente.sql` | Banco e migration |
| `paciente_endereco` | Sim | `sql/02_tabelas_paciente.sql` | Banco e migration |
| `pendencia_atendimento` | Sim | `sql/08_tabelas_encaminhamentos_acompanhamento.sql` | Banco e migration |
| `procedimento_clinico` | Sim | `sql/09_tabelas_medicamentos_tratamentos.sql` | Banco e migration |
| `projeto_estudo` | Sim | `sql/04_tabelas_projetos_estudos.sql` | Banco e migration |
| `reacao_adversa_benzonidazol` | Sim | `sql/15_tratamento_benzonidazol.sql` | Banco e migration |
| `sorologia_chagas` | Sim | `sql/05_tabelas_diagnostico_sorologia.sql` | Banco e migration |
| `sorologia_solicitacao` | Sim | `sql/05_tabelas_diagnostico_sorologia.sql` | Banco e migration |
| `tipo_encaminhamento` | Sim | `sql/08_tabelas_encaminhamentos_acompanhamento.sql` | Banco e migration |
| `tipo_exame_complementar` | Sim | `sql/07_tabelas_exames_complementares.sql` | Banco e migration |
| `tratamento_chagas` | Sim | `sql/09_tabelas_medicamentos_tratamentos.sql` | Banco e migration |
| `tratamento_benzonidazol` | Sim | `sql/15_tratamento_benzonidazol.sql` | Banco e migration |

Não foram identificadas tabelas físicas sem migration correspondente. Não foram identificadas tabelas nas migrations ausentes do banco físico.

### `paciente`

Finalidade: tabela principal de pacientes.

Campos:

- `paciente_id BIGSERIAL` PK.
- `codigo_planilha VARCHAR(50)`.
- `nome VARCHAR(255) NOT NULL`.
- `data_nascimento DATE`.
- `sexo VARCHAR(30)`.
- `raca VARCHAR(50)`.
- `pertence_comunidade_tradicional BOOLEAN`.
- `tipo_comunidade_tradicional VARCHAR(30)`.
- `grupo_origem_planilha VARCHAR(50)`.
- `criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.
- `atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.

Restrições:

- `chk_paciente_tipo_comunidade`: permite `NULL`, `indigena` ou `quilombola`.
- `chk_paciente_sexo`: permite `NULL`, `feminino`, `masculino`, `outro` ou `nao_informado`.

Relacionamentos:

- Referenciada por `paciente_endereco`, `paciente_contato`, `atendimento`, `historico_familiar_chagas` e `paciente_comorbidade`.

### `paciente_endereco`

Finalidade: endereços vinculados a pacientes.

Campos:

- `endereco_id BIGSERIAL` PK.
- `paciente_id BIGINT NOT NULL` FK.
- `endereco TEXT`.
- `cidade VARCHAR(120)`.
- `criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.

Relacionamentos:

- FK `paciente_id` -> `paciente(paciente_id)` com `ON DELETE CASCADE`.

### `paciente_contato`

Finalidade: contatos telefônicos vinculados a pacientes.

Campos:

- `contato_id BIGSERIAL` PK.
- `paciente_id BIGINT NOT NULL` FK.
- `telefone VARCHAR(30)`.
- `criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.

Relacionamentos:

- FK `paciente_id` -> `paciente(paciente_id)` com `ON DELETE CASCADE`.

### `atendimento`

Finalidade: atendimentos realizados ou registrados para pacientes.

Campos:

- `atendimento_id BIGSERIAL` PK.
- `paciente_id BIGINT NOT NULL` FK.
- `data_atendimento DATE`.
- `localizacao_prontuario VARCHAR(120)`.
- `ambulatorio_unicamente BOOLEAN`.
- `ambulatorio_anexo_projeto BOOLEAN`.
- `origem_registro VARCHAR(50)`.
- `observacoes TEXT`.
- `criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.
- `atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.

Restrições e índices:

- FK `paciente_id` -> `paciente(paciente_id)` com `ON DELETE RESTRICT`.
- `uq_atendimento_id_paciente UNIQUE (atendimento_id, paciente_id)`, chave de
  suporte para vínculos opcionais que precisam confirmar o paciente.
- `chk_atendimento_contexto_ambulatorio`: impede `ambulatorio_unicamente` e `ambulatorio_anexo_projeto` ambos verdadeiros.
- `chk_atendimento_origem_registro`: permite `planilha_portador_dc`, `planilha_nao_portador_dc`, `cadastro_sistema`, `nao_informado` ou `NULL`.
- Índices: `idx_atendimento_paciente_id`, `idx_atendimento_data_atendimento`.

Relacionamentos:

- Referenciada pelas tabelas de projetos, diagnóstico, sorologia, condições, exames, encaminhamentos, medicamentos, tratamentos e procedimentos.

### `projeto_estudo`

Finalidade: catálogo de projetos, estudos ou pesquisas.

Campos:

- `projeto_estudo_id BIGSERIAL` PK.
- `codigo_projeto VARCHAR(80) NOT NULL`.
- `nome_projeto VARCHAR(150) NOT NULL`.
- `descricao TEXT`.
- `ativo BOOLEAN NOT NULL DEFAULT TRUE`.
- `criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.
- `atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.

Restrições:

- `uq_projeto_estudo_codigo UNIQUE(codigo_projeto)`.

Dados iniciais:

- `sami_trop_aim3`, `sami_trop_1_1`, `parachute`, `benbrasil`, `epoca`, `santa_casa_dica`, `renomica`, `archimedes`, `charm`, `lxe_novartis`.

### `atendimento_projeto_estudo`

Finalidade: associação entre atendimentos e projetos/estudos.

Campos principais:

- `atendimento_projeto_estudo_id BIGSERIAL` PK.
- `atendimento_id BIGINT NOT NULL` FK.
- `projeto_estudo_id BIGINT NOT NULL` FK.
- `participa BOOLEAN`.
- `possui_pendencia BOOLEAN`.
- `descricao_pendencia TEXT`.
- `houve_falha BOOLEAN`.
- `descricao_falha TEXT`.
- `valor_original_participacao TEXT`.
- `valor_original_pendencia TEXT`.
- `valor_original_falha TEXT`.
- `observacoes TEXT`.
- `criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.
- `atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.

Restrições e índices:

- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- FK `projeto_estudo_id` -> `projeto_estudo(projeto_estudo_id)` com `ON DELETE RESTRICT`.
- `uq_atendimento_projeto UNIQUE(atendimento_id, projeto_estudo_id)`.
- Índices em `atendimento_id` e `projeto_estudo_id`.

Esta associação permanece intacta como vínculo legado/contextual por atendimento.
Não houve backfill, remoção ou migração silenciosa para a associação consolidada
por paciente.

### `paciente_projeto_estudo`

Finalidade: estado consolidado da relação entre paciente e projeto oficial,
independente de atendimento.

Campos principais:

- `paciente_projeto_estudo_id BIGSERIAL` PK.
- `paciente_id BIGINT NOT NULL` FK.
- `projeto_estudo_id BIGINT NOT NULL` FK.
- booleanos anuláveis `participa`, `possui_pendencia` e `houve_falha`.
- descrições de pendência e falha, três valores originais e `observacoes`.
- `criado_em` e `atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.

Restrições e índices:

- FK `fk_paciente_projeto_paciente` com `ON DELETE CASCADE`.
- FK `fk_paciente_projeto_projeto` com `ON DELETE RESTRICT`.
- `uq_paciente_projeto UNIQUE (paciente_id, projeto_estudo_id)`.
- índice `idx_paciente_projeto_projeto_id` em `projeto_estudo_id`.

A tabela não possui FK para atendimento ou linha de importação. A proveniência
reutiliza `importacao_registro`, permitindo várias linhas apontarem para a mesma
associação consolidada.

### `diagnostico_chagas`

Finalidade: diagnóstico de doença de Chagas por atendimento.

Campos principais:

- `diagnostico_chagas_id BIGSERIAL` PK.
- `atendimento_id BIGINT NOT NULL` FK.
- `possui_diagnostico_chagas BOOLEAN`.
- `status_diagnostico VARCHAR(30)`.
- `resultado_final VARCHAR(30)`.
- `data_resultado_final DATE`.
- `criterio_confirmacao VARCHAR(80)`.
- `observacoes TEXT`.
- `valor_original_diagnostico TEXT`.
- `valor_original_resultado_final TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- `uq_diagnostico_chagas_atendimento UNIQUE(atendimento_id)`.
- Checks para `status_diagnostico` e `resultado_final`.
- Índice `idx_diagnostico_chagas_atendimento_id`.

### `sorologia_chagas`

Finalidade: sorologias vinculadas a um diagnóstico de Chagas.

Campos principais:

- `sorologia_chagas_id BIGSERIAL` PK.
- `diagnostico_chagas_id BIGINT NOT NULL` FK.
- `numero_metodo_planilha SMALLINT`.
- `metodo_sorologico VARCHAR(120)`.
- `data_solicitacao DATE`, `data_coleta DATE`, `data_resultado DATE`.
- `resultado VARCHAR(30)`.
- `laboratorio VARCHAR(120)`.
- `valor_original_metodo TEXT`, `valor_original_data TEXT`, `valor_original_resultado TEXT`.
- `observacoes TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `diagnostico_chagas_id` -> `diagnostico_chagas(diagnostico_chagas_id)` com `ON DELETE CASCADE`.
- `UNIQUE(diagnostico_chagas_id, numero_metodo_planilha)`.
- `numero_metodo_planilha` entre 1 e 3 quando informado.
- Check de `resultado`.
- Índices em `diagnostico_chagas_id` e `resultado`.

### `sorologia_solicitacao`

Finalidade: solicitações de sorologia por atendimento.

Campos principais:

- `sorologia_solicitacao_id BIGSERIAL` PK.
- `atendimento_id BIGINT NOT NULL` FK.
- `solicitada BOOLEAN NOT NULL DEFAULT TRUE`.
- `data_solicitacao DATE`.
- `tipo_solicitacao VARCHAR(120)`.
- `status_solicitacao VARCHAR(30)`.
- `valor_original_solicitacao TEXT`.
- `observacoes TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- Check de `status_solicitacao`.
- Índice `idx_sorologia_solicitacao_atendimento_id`.

### `historico_familiar_chagas`

Finalidade: histórico familiar de Chagas por paciente.

Campos principais:

- `historico_familiar_chagas_id BIGSERIAL` PK.
- `paciente_id BIGINT NOT NULL` FK.
- `possui_historico_familiar BOOLEAN`.
- `parentesco VARCHAR(120)`.
- `descricao TEXT`.
- `valor_original_historico TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `paciente_id` -> `paciente(paciente_id)` com `ON DELETE CASCADE`.
- `UNIQUE(paciente_id)`.
- Índice `idx_historico_familiar_chagas_paciente_id`.

### `condicao_chagas`

Finalidade: condição clínica de Chagas registrada no atendimento.

Campos principais:

- `condicao_chagas_id BIGSERIAL` PK.
- `atendimento_id BIGINT NOT NULL` FK.
- `forma_clinica VARCHAR(50)`.
- `fase_doenca VARCHAR(50)`.
- `classificacao_clinica VARCHAR(80)`.
- `possui_sintomas BOOLEAN`.
- `descricao_sintomas TEXT`.
- `observacoes TEXT`.
- `valor_original_forma_clinica TEXT`, `valor_original_fase_doenca TEXT`, `valor_original_classificacao TEXT`, `valor_original_sintomas TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- `UNIQUE(atendimento_id)`.
- Checks para `forma_clinica` e `fase_doenca`.
- Índice `idx_condicao_chagas_atendimento_id`.

### `complicacao_chagas`

Finalidade: complicações associadas à doença de Chagas por atendimento.

Campos principais:

- `complicacao_chagas_id BIGSERIAL` PK.
- `atendimento_id BIGINT NOT NULL` FK.
- `tipo_complicacao VARCHAR(80)`.
- `possui_complicacao BOOLEAN`.
- `descricao TEXT`.
- `gravidade VARCHAR(30)`.
- `valor_original_tipo TEXT`, `valor_original_presenca TEXT`, `valor_original_gravidade TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- Check de `gravidade`.
- Índices em `atendimento_id` e `tipo_complicacao`.

### `comorbidade`

Finalidade: catálogo de comorbidades.

Campos:

- `comorbidade_id BIGSERIAL` PK.
- `nome_comorbidade VARCHAR(120) NOT NULL`.
- `descricao TEXT`.
- `ativo BOOLEAN NOT NULL DEFAULT TRUE`.
- timestamps `criado_em`, `atualizado_em`.

Restrições:

- `UNIQUE(nome_comorbidade)`.

### `paciente_comorbidade`

Finalidade: associação entre pacientes e comorbidades.

Campos principais:

- `paciente_comorbidade_id BIGSERIAL` PK.
- `paciente_id BIGINT NOT NULL` FK.
- `comorbidade_id BIGINT NOT NULL` FK.
- `atendimento_id BIGINT` FK opcional.
- `possui_comorbidade BOOLEAN NOT NULL DEFAULT TRUE`.
- `data_registro DATE`.
- `observacoes TEXT`.
- `valor_original_comorbidade TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `paciente_id` -> `paciente(paciente_id)` com `ON DELETE CASCADE`.
- FK `comorbidade_id` -> `comorbidade(comorbidade_id)` com `ON DELETE RESTRICT`.
- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE SET NULL`.
- `UNIQUE(paciente_id, comorbidade_id)`.
- Índices em `paciente_id`, `comorbidade_id` e `atendimento_id`.

### `tipo_exame_complementar`

Finalidade: catálogo de tipos de exames complementares.

Campos:

- `tipo_exame_complementar_id BIGSERIAL` PK.
- `codigo_exame VARCHAR(80) NOT NULL`.
- `nome_exame VARCHAR(150) NOT NULL`.
- `categoria VARCHAR(50)`.
- `descricao TEXT`.
- `ativo BOOLEAN NOT NULL DEFAULT TRUE`.
- timestamps `criado_em`, `atualizado_em`.

Restrições:

- `UNIQUE(codigo_exame)`.
- Check de `categoria`.

Dados iniciais:

- Eletrocardiograma, ecocardiograma, Holter, teste ergométrico, radiografia de tórax, tomografia, ressonância, hemograma, creatinina, outro e não informado.
- Tipos genéricos incrementais: laboratoriais, imagem, endoscopia, colonoscopia e MAPA.

### `atendimento_exame_complementar`

Finalidade: exames complementares associados a atendimento.

Campos principais:

- `atendimento_exame_complementar_id BIGSERIAL` PK.
- `atendimento_id BIGINT NOT NULL` FK.
- `tipo_exame_complementar_id BIGINT NOT NULL` FK.
- `origem_exame VARCHAR(40)`.
- `status_exame VARCHAR(40)`.
- datas `data_solicitacao`, `data_realizacao`, `data_resultado`.
- `trouxe_exame BOOLEAN`.
- `solicitado_exame BOOLEAN`.
- `resultado_geral VARCHAR(40)`.
- `resumo_resultado TEXT`.
- `laudo_texto TEXT`.
- `local_realizacao VARCHAR(150)`.
- `profissional_solicitante VARCHAR(150)`.
- campos `valor_original_*`.
- `observacoes TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- FK `tipo_exame_complementar_id` -> `tipo_exame_complementar(tipo_exame_complementar_id)` com `ON DELETE RESTRICT`.
- Checks para origem, status e resultado geral.
- Índices em `atendimento_id`, `tipo_exame_complementar_id`, `status_exame`, `data_solicitacao` e `data_resultado`.

### `exame_complementar_resultado`

Finalidade: resultados estruturados de exames complementares.

Campos principais:

- `exame_complementar_resultado_id BIGSERIAL` PK.
- `atendimento_exame_complementar_id BIGINT NOT NULL` FK.
- `nome_campo VARCHAR(120) NOT NULL`.
- `valor_texto TEXT`.
- `valor_numerico NUMERIC(14,4)`.
- `unidade VARCHAR(40)`.
- `valor_referencia VARCHAR(120)`.
- `interpretacao VARCHAR(40)`.
- `valor_original TEXT`.
- `observacoes TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `atendimento_exame_complementar_id` -> `atendimento_exame_complementar(atendimento_exame_complementar_id)` com `ON DELETE CASCADE`.
- Check de `interpretacao`.
- Índices em `atendimento_exame_complementar_id` e `nome_campo`.

### `paciente_exame_complementar`

Finalidade: ocorrências canônicas de exames pertencentes ao paciente,
independentes do atendimento de digitação.

Campos:

- `paciente_exame_complementar_id BIGSERIAL` PK.
- `paciente_id BIGINT NOT NULL` FK.
- `atendimento_id BIGINT` FK opcional e composta com `paciente_id`.
- `tipo_exame_complementar_id BIGINT NOT NULL` FK.
- `bloco_origem VARCHAR(20) NOT NULL`.
- `tipo_exame_original`, `resultado_texto`, `observacoes`,
  `valor_original_resultado` e `valor_original_observacao` como textos anuláveis.
- timestamps `criado_em`, `atualizado_em` não nulos com `CURRENT_TIMESTAMP`.

Restrições e índices:

- FK `fk_paciente_exame_paciente` com `ON DELETE CASCADE`.
- FK composta `fk_paciente_exame_atendimento_paciente` para
  `(atendimento_id, paciente_id)`, com
  `ON DELETE SET NULL (atendimento_id)`; preserva `paciente_id`.
- FK `fk_paciente_exame_tipo` com `ON DELETE RESTRICT`.
- `chk_paciente_exame_bloco` permite somente `trazido` ou `solicitado`.
- índices em paciente e tipo, e índice parcial em atendimento não nulo.
- nenhuma unicidade por paciente, tipo, bloco ou atendimento; múltiplas
  ocorrências do mesmo tipo são permitidas.

Convivência: `atendimento_exame_complementar` e
`exame_complementar_resultado` permanecem intactas como estruturas legadas, sem
backfill, escrita dupla ou migração automática.

### `tipo_encaminhamento`

Finalidade: catálogo de tipos de encaminhamento.

Campos:

- `tipo_encaminhamento_id BIGSERIAL` PK.
- `codigo_tipo VARCHAR(80) NOT NULL`.
- `nome_tipo VARCHAR(150) NOT NULL`.
- `descricao TEXT`.
- `ativo BOOLEAN NOT NULL DEFAULT TRUE`.
- timestamps `criado_em`, `atualizado_em`.

Restrições:

- `UNIQUE(codigo_tipo)`.

Dados iniciais:

- Cardiologia, gastroenterologia, infectologia, atenção básica, serviço social, exame complementar, hospital, outro e não informado.

### `encaminhamento`

Finalidade: encaminhamentos gerados a partir de atendimento.

Campos principais:

- `encaminhamento_id BIGSERIAL` PK.
- `atendimento_id BIGINT NOT NULL` FK.
- `tipo_encaminhamento_id BIGINT` FK opcional.
- `documento_apresentado BOOLEAN` anulável.
- `projeto_estudo_id BIGINT` FK opcional.
- `origem_encaminhamento VARCHAR(60)`.
- `destino_nome VARCHAR(180)`.
- `destino_servico VARCHAR(180)`.
- `especialidade_destino VARCHAR(120)`.
- datas `data_encaminhamento`, `data_agendamento`, `data_realizacao`.
- `status_encaminhamento VARCHAR(40)`.
- `prioridade VARCHAR(30)`.
- `motivo TEXT`.
- `conduta_orientada TEXT`.
- campos `valor_original_*`, incluindo documento apresentado e projeto.
- `observacoes TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- FK `tipo_encaminhamento_id` -> `tipo_encaminhamento(tipo_encaminhamento_id)` com `ON DELETE SET NULL`.
- FK `projeto_estudo_id` -> `projeto_estudo(projeto_estudo_id)` com `ON DELETE RESTRICT`.
- Checks para origem, status e prioridade.
- Índices em `atendimento_id`, `tipo_encaminhamento_id`, `status_encaminhamento` e `data_encaminhamento`, além do índice parcial `idx_encaminhamento_projeto_estudo_id`.
- Nenhuma `UNIQUE` adicional; paciente continua determinado pelo atendimento.

### `acompanhamento_cuidado`

Finalidade: acompanhamento, seguimento ou retorno associado a atendimento e opcionalmente a encaminhamento.

Campos principais:

- `acompanhamento_cuidado_id BIGSERIAL` PK.
- `atendimento_id BIGINT NOT NULL` FK.
- `encaminhamento_id BIGINT` FK opcional.
- `data_prevista DATE`.
- `data_realizada DATE`.
- `retorno_programado BOOLEAN`.
- `compareceu BOOLEAN`.
- `status_acompanhamento VARCHAR(40)`.
- `tipo_acompanhamento VARCHAR(80)`.
- `resumo_acompanhamento TEXT`.
- `conduta TEXT`.
- campos `valor_original_*`.
- `observacoes TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- FK `encaminhamento_id` -> `encaminhamento(encaminhamento_id)` com `ON DELETE SET NULL`.
- Check de `status_acompanhamento`.
- Índices em `atendimento_id`, `encaminhamento_id` e `status_acompanhamento`.

### `pendencia_atendimento`

Finalidade: pendências gerais associadas a atendimento.

Campos principais:

- `pendencia_atendimento_id BIGSERIAL` PK.
- `atendimento_id BIGINT NOT NULL` FK.
- `tipo_pendencia VARCHAR(80)`.
- `descricao TEXT`.
- `status_pendencia VARCHAR(40)`.
- `data_identificacao DATE`.
- `data_resolucao DATE`.
- `responsavel VARCHAR(150)`.
- `valor_original_pendencia TEXT`.
- `observacoes TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- Check de `status_pendencia`.
- Índices em `atendimento_id` e `status_pendencia`.

### `medicamento`

Finalidade: catálogo de medicamentos.

Campos:

- `medicamento_id BIGSERIAL` PK.
- `codigo_medicamento VARCHAR(80) NOT NULL`.
- `nome_medicamento VARCHAR(150) NOT NULL`.
- `principio_ativo VARCHAR(150)`.
- `classe_medicamento VARCHAR(120)`.
- `ativo BOOLEAN NOT NULL DEFAULT TRUE`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- `UNIQUE(codigo_medicamento)`.
- Índice `idx_medicamento_codigo`.

Dados iniciais:

- Benznidazol, nifurtimox, anti-hipertensivo não especificado, diurético não especificado, betabloqueador não especificado, antiarrítmico não especificado, outro e não informado.

### `atendimento_medicamento`

Finalidade: medicamentos usados, prescritos, suspensos ou registrados durante atendimento.

Campos principais:

- `atendimento_medicamento_id BIGSERIAL` PK.
- `atendimento_id BIGINT NOT NULL` FK.
- `medicamento_id BIGINT` FK opcional.
- `nome_medicamento_livre VARCHAR(180)`.
- `tipo_registro VARCHAR(40)`.
- `finalidade_uso VARCHAR(60)`.
- `dose VARCHAR(80)`.
- `via_administracao VARCHAR(50)`.
- `frequencia VARCHAR(80)`.
- datas `data_inicio`, `data_fim`.
- `uso_atual BOOLEAN`.
- `prescrito_no_atendimento BOOLEAN`.
- `status_uso VARCHAR(40)`.
- `motivo TEXT`.
- `observacoes TEXT`.
- campos `valor_original_*`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- FK `medicamento_id` -> `medicamento(medicamento_id)` com `ON DELETE SET NULL`.
- Checks para tipo, finalidade e status.
- Índices em `atendimento_id`, `medicamento_id` e `status_uso`.

### `tratamento_chagas`

Finalidade: tratamento etiológico ou específico para doença de Chagas associado ao atendimento.

Campos principais:

- `tratamento_chagas_id BIGSERIAL` PK.
- `atendimento_id BIGINT NOT NULL` FK.
- `medicamento_id BIGINT` FK opcional.
- `indicado BOOLEAN`, `iniciado BOOLEAN`, `concluido BOOLEAN`.
- `status_tratamento VARCHAR(40)`.
- `motivo_nao_tratamento TEXT`.
- datas `data_indicacao`, `data_inicio`, `data_fim`.
- `esquema_terapeutico TEXT`.
- `eventos_adversos BOOLEAN`.
- `descricao_eventos_adversos TEXT`.
- `adesao_tratamento VARCHAR(40)`.
- campos `valor_original_*`.
- `observacoes TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- FK `medicamento_id` -> `medicamento(medicamento_id)` com `ON DELETE SET NULL`.
- Checks para `status_tratamento` e `adesao_tratamento`.
- Índices em `atendimento_id`, `medicamento_id` e `status_tratamento`.

### `tratamento_benzonidazol`

Finalidade: estado canônico do tratamento com BZN, no máximo um por paciente.

Campos principais:

- `tratamento_benzonidazol_id BIGSERIAL` PK;
- `paciente_id BIGINT NOT NULL` e `atendimento_id BIGINT` opcional;
- indicadores triestados `tem_indicacao`, `iniciado`,
  `tratamento_pelo_ambulatorio` e `teve_reacao_adversa`;
- `duracao_cumprida_dias INTEGER`, `ano_uso_aproximado INTEGER` e
  `data_prescricao DATE`;
- motivos separados de não indicação e não início;
- campos `valor_original_*`, observações e timestamps.

Restrições e índices:

- FK do paciente com `ON DELETE CASCADE`;
- FK composta opcional para `(atendimento_id, paciente_id)`, com
  `ON DELETE SET NULL (atendimento_id)`;
- `UNIQUE (paciente_id)`;
- checks positivos para duração e ano quando informados;
- índice parcial `idx_tratamento_bzn_atendimento_id`.

### `reacao_adversa_benzonidazol`

Finalidade: ocorrências repetíveis de reações adversas do tratamento com BZN.

- PK `reacao_adversa_benzonidazol_id`;
- FK obrigatória para `tratamento_benzonidazol` com `ON DELETE CASCADE`;
- descrição, gravidade, data, consequência, valores originais, observações e
  timestamps opcionais;
- gravidade e consequência são textos livres, sem domínio clínico inventado;
- índice `idx_reacao_bzn_tratamento_id` na FK;
- não há unicidade por data, descrição ou tratamento.

`tratamento_chagas` permanece intacta como estrutura legada por atendimento. Não
houve backfill, escrita dupla ou migração automática entre as estruturas.

### `procedimento_clinico`

Finalidade: procedimentos, condutas clínicas ou intervenções do atendimento.

Campos principais:

- `procedimento_clinico_id BIGSERIAL` PK.
- `atendimento_id BIGINT NOT NULL` FK.
- `tipo_procedimento VARCHAR(120)`.
- `descricao TEXT`.
- `data_procedimento DATE`.
- `status_procedimento VARCHAR(40)`.
- `responsavel VARCHAR(150)`.
- `resultado TEXT`.
- `conduta_pos_procedimento TEXT`.
- campos `valor_original_*`.
- `observacoes TEXT`.
- timestamps `criado_em`, `atualizado_em`.

Restrições e índices:

- FK `atendimento_id` -> `atendimento(atendimento_id)` com `ON DELETE CASCADE`.
- Check de `status_procedimento`.
- Índices em `atendimento_id` e `status_procedimento`.

### `dados_clinicos_atendimento`

Finalidade: avaliação objetiva consolidada, limitada a uma por atendimento.

- PK `dados_clinicos_atendimento_id`.
- FK `atendimento_id` para `atendimento`, com `ON DELETE CASCADE`.
- `UNIQUE (atendimento_id)`.
- Medidas normalizadas opcionais, valores originais em texto, observações e timestamps obrigatórios.

### `evento_clinico`

Finalidade: eventos clínicos longitudinais positivos, negativos ou desconhecidos do paciente.

- PK `evento_clinico_id`.
- FK `paciente_id` para `paciente`, com `ON DELETE CASCADE`.
- `tipo_evento` obrigatório; eventos do mesmo tipo e ano podem se repetir.
- Índice em `(paciente_id, tipo_evento)`.

### `dispositivo_implantado`

Finalidade: estado consolidado de cada tipo de dispositivo informado para o paciente.

- PK `dispositivo_implantado_id`.
- FK `paciente_id` para `paciente`, com `ON DELETE CASCADE`.
- `tipo_dispositivo` obrigatório e `UNIQUE (paciente_id, tipo_dispositivo)`.

### `obito`

Finalidade: desfecho consolidado de óbito do paciente.

- PK `obito_id`.
- FK `paciente_id` para `paciente`, com `ON DELETE CASCADE`.
- `UNIQUE (paciente_id)` e índice em `data_obito`.
- Indicador, data, causa e valores originais permanecem opcionais para representar informação desconhecida.

### `notificacao`

Finalidade: estado consolidado de notificação informado para o paciente.

- PK `notificacao_id`.
- FK `paciente_id` para `paciente`, com `ON DELETE CASCADE` e `UNIQUE (paciente_id)`.
- Indicador, número, justificativa, valores originais e observações opcionais.
- Índice não único `idx_notificacao_numero_notificacao` em `numero_notificacao`.
- Sem `CHECK` condicional, vínculo com atendimento ou unicidade global do número.

### `importacao_lote`

Finalidade: identificar cada execução e sua cadeia de reprocessamento.

- PK `importacao_lote_id` e `UNIQUE(codigo_lote)`.
- SHA-256 e versão de layout obrigatórios.
- FK composta autorreferente de reprocessamento com `ON DELETE RESTRICT`.
- Oito status permitidos, validação de período e bloqueio de autorreferência direta.
- Índice único parcial para um lote inicial por hash/layout e índice de consulta da cadeia.

### `importacao_linha`

Finalidade: preservar linha sintática de origem antes da normalização.

- PK `importacao_linha_id` e FK para lote com `ON DELETE RESTRICT`.
- `UNIQUE(importacao_lote_id, aba_ordem, numero_linha)`.
- Aba e posições obrigatórias e positivas.
- `dados_brutos JSONB` obrigatório e limitado a array, sem índice GIN.
- Responsável da digitação preservado como texto legado, sem vínculo com usuário.
- Seis status permitidos e índice por lote/status.

### `importacao_registro`

Finalidade: associação genérica N:N entre linhas e registros estruturados.

- PK `importacao_registro_id` e FK para linha com `ON DELETE RESTRICT`.
- Alvo identificado por schema `ambulatorio`, tabela e ID positivo, sem FK polimórfica.
- Ações permitidas: `criado`, `atualizado` e `associado`.
- `UNIQUE` do vínculo e índice de rastreio inverso do destino.

## Diferenças em Relação ao Dicionário de Dados ou Modelo Lógico Anterior

- `docs/historico/dicionario-dados.md` está vazio.
- `docs/historico/decisoes-modelagem.md` está vazio.
- Não há modelo lógico anterior preenchido no repositório para comparação detalhada.
- A comparação com a planilha completa será feita em fases posteriores,
  considerando que o núcleo atual não pretende cobrir integralmente os 136
  cabeçalhos canônicos das duas abas clínicas.

## Pendências de Validação

- Confirmar permissões reais do usuário `ambulatorio_user`.
- Confirmar se o script `02_tabelas_paciente.sql` sempre executa no schema correto, pois ele não contém `SET search_path`.
- Se forem planejadas mudanças no banco atual, criar migrations incrementais de ajuste em vez de reaplicar scripts antigos.

## Próxima fase técnica

1. Continuar a evolução do importador exclusivamente com dados sintéticos,
   usando o manifesto e a especificação normativa v1.
2. Preservar em `dados_brutos` as dez chaves parciais e ampliar a promoção
   controlada somente após contrato explícito; D11 já usa
   `pendencia_atendimento` sem classificação inferida.
3. Definir retenção, autoridades, roles e auditoria antes de dados reais.
## Hardening da proveniência

A migration `sql/17_hardening_operacional.sql` adiciona a `importacao_lote`
`manifesto_sha256`, `importador_versao` e `revisao_git`, com constraints de
formato. Não cria tabelas, remove dados nem muda as 37 tabelas então existentes.
As roles de importação e aplicação são objetos do cluster e não owners do schema.

## Identidade funcional

As migrations 18 a 20 criam `usuario_aplicacao`, corrigem incrementalmente sua
constraint de hash. A tabela guarda ID interno, nome, login normalizado único,
hash bcrypt, perfil (`consulta`, `edicao` ou `administracao`), estado ativo e
timestamps e removem os privilégios padrão do importador. `ambulatorio_aplicacao` recebe somente `SELECT`; usuários funcionais
jamais recebem login PostgreSQL.

## Extensão sintética proposta e validada — migration 28

A migration `28_data_descoberta_autorelato_chagas.sql` adiciona
`diagnostico_chagas.data_descoberta_autorelato DATE`, como snapshot do relato do
paciente registrado no atendimento. Não substitui `data_resultado_final` nem
qualquer data de sorologia; não há backfill. Coluna opcional preserva ausência
legada, sem inferir confirmação diagnóstica.

Instalação limpa e atualização incremental foram validadas exclusivamente em
bancos descartáveis. O dump em `evidencias/schema_atual_ambulatorio.sql` permanece
a evidência do banco persistente até migration 20. Reversão deve usar nova
migration restritiva preservando relatos e proveniência; nenhuma coluna com
dados é removida automaticamente.
