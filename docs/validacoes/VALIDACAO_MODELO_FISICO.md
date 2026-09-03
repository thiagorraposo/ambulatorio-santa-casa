# Validação do Modelo Físico

> Documento histórico. Registra a validação do núcleo de 25 tabelas em
> 2026-07-01 e não representa o schema vigente. Consulte
> [`../MODELO_FISICO_ATUAL.md`](../MODELO_FISICO_ATUAL.md) e
> [`../evidencias/schema_atual_ambulatorio.sql`](../evidencias/schema_atual_ambulatorio.sql).

Data da validação: 2026-07-01

## Fonte de Evidência

Fonte principal:

- `docs/evidencias/schema_atual_ambulatorio.sql`

Contexto da evidência:

- Arquivo em formato `pg_dump`.
- Dump gerado a partir de PostgreSQL 16.14.
- Schema validado: `ambulatorio`.
- Total de tabelas físicas encontradas: 25.

Fontes reconciliadas:

- Scripts SQL em `sql/00_criar_banco.sql` a `sql/09_tabelas_medicamentos_tratamentos.sql`.
- `docs/MODELO_FISICO_ATUAL.md`.
- `docs/ESTADO_ATUAL_DO_PROJETO.md`.
- `docs/historico/HISTORICO_DE_IMPLEMENTACAO.md`.
- `docs/PROXIMOS_PASSOS.md`.
- `docs/REGISTRO_DE_ALTERACOES.md`.

Nenhuma migration foi executada, nenhum script antigo foi reaplicado e nenhuma tabela foi alterada nesta validação.

## Estratégia Oficial de Implementação Incremental

O modelo físico está sendo construído por fases. As 25 tabelas confirmadas nesta validação correspondem ao núcleo funcional inicial e não representam a cobertura completa e final da planilha original.

Esse núcleo foi implementado deliberadamente para validar funcionamento, integridade referencial, restrições, dados de teste, consultas básicas, padrões de migrations e fluxos principais antes da expansão do modelo.

A ausência temporária das demais tabelas planejadas não é uma falha, uma lacuna involuntária ou uma divergência crítica. As demais tabelas previstas serão implementadas posteriormente por migrations incrementais.

Nenhuma migration antiga deve ser alterada ou reaplicada no banco atual. A cobertura integral das 140 colunas da planilha será tratada em fases posteriores de expansão e antes da importação completa da planilha.

## Lista das 25 Tabelas Encontradas

1. `acompanhamento_cuidado`
2. `atendimento`
3. `atendimento_exame_complementar`
4. `atendimento_medicamento`
5. `atendimento_projeto_estudo`
6. `comorbidade`
7. `complicacao_chagas`
8. `condicao_chagas`
9. `diagnostico_chagas`
10. `encaminhamento`
11. `exame_complementar_resultado`
12. `historico_familiar_chagas`
13. `medicamento`
14. `paciente`
15. `paciente_comorbidade`
16. `paciente_contato`
17. `paciente_endereco`
18. `pendencia_atendimento`
19. `procedimento_clinico`
20. `projeto_estudo`
21. `sorologia_chagas`
22. `sorologia_solicitacao`
23. `tipo_encaminhamento`
24. `tipo_exame_complementar`
25. `tratamento_chagas`

## Cobertura por Migration

| Tabela | Banco físico | Migration correspondente | Situação |
| --- | --- | --- | --- |
| `acompanhamento_cuidado` | Sim | `sql/08_tabelas_encaminhamentos_acompanhamento.sql` | Existe no banco e nas migrations |
| `atendimento` | Sim | `sql/03_tabelas_atendimento.sql` | Existe no banco e nas migrations |
| `atendimento_exame_complementar` | Sim | `sql/07_tabelas_exames_complementares.sql` | Existe no banco e nas migrations |
| `atendimento_medicamento` | Sim | `sql/09_tabelas_medicamentos_tratamentos.sql` | Existe no banco e nas migrations |
| `atendimento_projeto_estudo` | Sim | `sql/04_tabelas_projetos_estudos.sql` | Existe no banco e nas migrations |
| `comorbidade` | Sim | `sql/06_tabelas_condicoes_comorbidades.sql` | Existe no banco e nas migrations |
| `complicacao_chagas` | Sim | `sql/06_tabelas_condicoes_comorbidades.sql` | Existe no banco e nas migrations |
| `condicao_chagas` | Sim | `sql/06_tabelas_condicoes_comorbidades.sql` | Existe no banco e nas migrations |
| `diagnostico_chagas` | Sim | `sql/05_tabelas_diagnostico_sorologia.sql` | Existe no banco e nas migrations |
| `encaminhamento` | Sim | `sql/08_tabelas_encaminhamentos_acompanhamento.sql` | Existe no banco e nas migrations |
| `exame_complementar_resultado` | Sim | `sql/07_tabelas_exames_complementares.sql` | Existe no banco e nas migrations |
| `historico_familiar_chagas` | Sim | `sql/05_tabelas_diagnostico_sorologia.sql` | Existe no banco e nas migrations |
| `medicamento` | Sim | `sql/09_tabelas_medicamentos_tratamentos.sql` | Existe no banco e nas migrations |
| `paciente` | Sim | `sql/02_tabelas_paciente.sql` | Existe no banco e nas migrations |
| `paciente_comorbidade` | Sim | `sql/06_tabelas_condicoes_comorbidades.sql` | Existe no banco e nas migrations |
| `paciente_contato` | Sim | `sql/02_tabelas_paciente.sql` | Existe no banco e nas migrations |
| `paciente_endereco` | Sim | `sql/02_tabelas_paciente.sql` | Existe no banco e nas migrations |
| `pendencia_atendimento` | Sim | `sql/08_tabelas_encaminhamentos_acompanhamento.sql` | Existe no banco e nas migrations |
| `procedimento_clinico` | Sim | `sql/09_tabelas_medicamentos_tratamentos.sql` | Existe no banco e nas migrations |
| `projeto_estudo` | Sim | `sql/04_tabelas_projetos_estudos.sql` | Existe no banco e nas migrations |
| `sorologia_chagas` | Sim | `sql/05_tabelas_diagnostico_sorologia.sql` | Existe no banco e nas migrations |
| `sorologia_solicitacao` | Sim | `sql/05_tabelas_diagnostico_sorologia.sql` | Existe no banco e nas migrations |
| `tipo_encaminhamento` | Sim | `sql/08_tabelas_encaminhamentos_acompanhamento.sql` | Existe no banco e nas migrations |
| `tipo_exame_complementar` | Sim | `sql/07_tabelas_exames_complementares.sql` | Existe no banco e nas migrations |
| `tratamento_chagas` | Sim | `sql/09_tabelas_medicamentos_tratamentos.sql` | Existe no banco e nas migrations |

Resumo:

- Tabelas existentes tanto no banco quanto nas migrations: 25.
- Tabelas existentes no banco mas não cobertas pelas migrations: nenhuma identificada.
- Tabelas existentes nas migrations mas não presentes no banco: nenhuma identificada.

## Campos, PKs, FKs e Restrições Confirmados

### `acompanhamento_cuidado`

- Campos confirmados: `acompanhamento_cuidado_id`, `atendimento_id`, `encaminhamento_id`, `data_prevista`, `data_realizada`, `retorno_programado`, `compareceu`, `status_acompanhamento`, `tipo_acompanhamento`, `resumo_acompanhamento`, `conduta`, `valor_original_acompanhamento`, `valor_original_status`, `valor_original_conduta`, `observacoes`, `criado_em`, `atualizado_em`.
- PK: `acompanhamento_cuidado_pkey`.
- FKs: `fk_acompanhamento_atendimento`, `fk_acompanhamento_encaminhamento`.
- Restrições: `chk_acompanhamento_status`.

### `atendimento`

- Campos confirmados: `atendimento_id`, `paciente_id`, `data_atendimento`, `localizacao_prontuario`, `ambulatorio_unicamente`, `ambulatorio_anexo_projeto`, `origem_registro`, `observacoes`, `criado_em`, `atualizado_em`.
- PK: `atendimento_pkey`.
- FKs: `fk_atendimento_paciente`.
- Restrições: `chk_atendimento_contexto_ambulatorio`, `chk_atendimento_origem_registro`.

### `atendimento_exame_complementar`

- Campos confirmados: `atendimento_exame_complementar_id`, `atendimento_id`, `tipo_exame_complementar_id`, `origem_exame`, `status_exame`, `data_solicitacao`, `data_realizacao`, `data_resultado`, `trouxe_exame`, `solicitado_exame`, `resultado_geral`, `resumo_resultado`, `laudo_texto`, `local_realizacao`, `profissional_solicitante`, `valor_original_trazido`, `valor_original_solicitado`, `valor_original_resultado`, `valor_original_observacao`, `observacoes`, `criado_em`, `atualizado_em`.
- PK: `atendimento_exame_complementar_pkey`.
- FKs: `fk_atendimento_exame_atendimento`, `fk_atendimento_exame_tipo`.
- Restrições: `chk_atendimento_exame_origem`, `chk_atendimento_exame_status`, `chk_atendimento_exame_resultado_geral`.

### `atendimento_medicamento`

- Campos confirmados: `atendimento_medicamento_id`, `atendimento_id`, `medicamento_id`, `nome_medicamento_livre`, `tipo_registro`, `finalidade_uso`, `dose`, `via_administracao`, `frequencia`, `data_inicio`, `data_fim`, `uso_atual`, `prescrito_no_atendimento`, `status_uso`, `motivo`, `observacoes`, `valor_original_medicamento`, `valor_original_dose`, `valor_original_status`, `criado_em`, `atualizado_em`.
- PK: `atendimento_medicamento_pkey`.
- FKs: `fk_atendimento_medicamento_atendimento`, `fk_atendimento_medicamento_medicamento`.
- Restrições: `chk_atendimento_medicamento_tipo_registro`, `chk_atendimento_medicamento_finalidade`, `chk_atendimento_medicamento_status`.

### `atendimento_projeto_estudo`

- Campos confirmados: `atendimento_projeto_estudo_id`, `atendimento_id`, `projeto_estudo_id`, `participa`, `possui_pendencia`, `descricao_pendencia`, `houve_falha`, `descricao_falha`, `valor_original_participacao`, `valor_original_pendencia`, `valor_original_falha`, `observacoes`, `criado_em`, `atualizado_em`.
- PK: `atendimento_projeto_estudo_pkey`.
- FKs: `fk_atendimento_projeto_atendimento`, `fk_atendimento_projeto_projeto`.
- Restrições: `uq_atendimento_projeto`.

### `comorbidade`

- Campos confirmados: `comorbidade_id`, `nome_comorbidade`, `descricao`, `ativo`, `criado_em`, `atualizado_em`.
- PK: `comorbidade_pkey`.
- FKs: nenhuma.
- Restrições: `uq_comorbidade_nome`.

### `complicacao_chagas`

- Campos confirmados: `complicacao_chagas_id`, `atendimento_id`, `tipo_complicacao`, `possui_complicacao`, `descricao`, `gravidade`, `valor_original_tipo`, `valor_original_presenca`, `valor_original_gravidade`, `criado_em`, `atualizado_em`.
- PK: `complicacao_chagas_pkey`.
- FKs: `fk_complicacao_chagas_atendimento`.
- Restrições: `chk_complicacao_chagas_gravidade`.

### `condicao_chagas`

- Campos confirmados: `condicao_chagas_id`, `atendimento_id`, `forma_clinica`, `fase_doenca`, `classificacao_clinica`, `possui_sintomas`, `descricao_sintomas`, `observacoes`, `valor_original_forma_clinica`, `valor_original_fase_doenca`, `valor_original_classificacao`, `valor_original_sintomas`, `criado_em`, `atualizado_em`.
- PK: `condicao_chagas_pkey`.
- FKs: `fk_condicao_chagas_atendimento`.
- Restrições: `uq_condicao_chagas_atendimento`, `chk_condicao_chagas_forma_clinica`, `chk_condicao_chagas_fase_doenca`.

### `diagnostico_chagas`

- Campos confirmados: `diagnostico_chagas_id`, `atendimento_id`, `possui_diagnostico_chagas`, `status_diagnostico`, `resultado_final`, `data_resultado_final`, `criterio_confirmacao`, `observacoes`, `valor_original_diagnostico`, `valor_original_resultado_final`, `criado_em`, `atualizado_em`.
- PK: `diagnostico_chagas_pkey`.
- FKs: `fk_diagnostico_chagas_atendimento`.
- Restrições: `uq_diagnostico_chagas_atendimento`, `chk_diagnostico_chagas_status`, `chk_diagnostico_chagas_resultado_final`.

### `encaminhamento`

- Campos confirmados: `encaminhamento_id`, `atendimento_id`, `tipo_encaminhamento_id`, `origem_encaminhamento`, `destino_nome`, `destino_servico`, `especialidade_destino`, `data_encaminhamento`, `data_agendamento`, `data_realizacao`, `status_encaminhamento`, `prioridade`, `motivo`, `conduta_orientada`, `valor_original_encaminhamento`, `valor_original_origem`, `valor_original_destino`, `valor_original_status`, `observacoes`, `criado_em`, `atualizado_em`.
- PK: `encaminhamento_pkey`.
- FKs: `fk_encaminhamento_atendimento`, `fk_encaminhamento_tipo`.
- Restrições: `chk_encaminhamento_origem`, `chk_encaminhamento_status`, `chk_encaminhamento_prioridade`.

### `exame_complementar_resultado`

- Campos confirmados: `exame_complementar_resultado_id`, `atendimento_exame_complementar_id`, `nome_campo`, `valor_texto`, `valor_numerico`, `unidade`, `valor_referencia`, `interpretacao`, `valor_original`, `observacoes`, `criado_em`, `atualizado_em`.
- PK: `exame_complementar_resultado_pkey`.
- FKs: `fk_exame_resultado_exame`.
- Restrições: `chk_exame_resultado_interpretacao`.

### `historico_familiar_chagas`

- Campos confirmados: `historico_familiar_chagas_id`, `paciente_id`, `possui_historico_familiar`, `parentesco`, `descricao`, `valor_original_historico`, `criado_em`, `atualizado_em`.
- PK: `historico_familiar_chagas_pkey`.
- FKs: `fk_historico_familiar_chagas_paciente`.
- Restrições: `uq_historico_familiar_chagas_paciente`.

### `medicamento`

- Campos confirmados: `medicamento_id`, `codigo_medicamento`, `nome_medicamento`, `principio_ativo`, `classe_medicamento`, `ativo`, `criado_em`, `atualizado_em`.
- PK: `medicamento_pkey`.
- FKs: nenhuma.
- Restrições: `uq_medicamento_codigo`.

### `paciente`

- Campos confirmados: `paciente_id`, `codigo_planilha`, `nome`, `data_nascimento`, `sexo`, `raca`, `pertence_comunidade_tradicional`, `tipo_comunidade_tradicional`, `grupo_origem_planilha`, `criado_em`, `atualizado_em`.
- PK: `paciente_pkey`.
- FKs: nenhuma.
- Restrições: `chk_paciente_sexo`, `chk_paciente_tipo_comunidade`.

### `paciente_comorbidade`

- Campos confirmados: `paciente_comorbidade_id`, `paciente_id`, `comorbidade_id`, `atendimento_id`, `possui_comorbidade`, `data_registro`, `observacoes`, `valor_original_comorbidade`, `criado_em`, `atualizado_em`.
- PK: `paciente_comorbidade_pkey`.
- FKs: `fk_paciente_comorbidade_paciente`, `fk_paciente_comorbidade_comorbidade`, `fk_paciente_comorbidade_atendimento`.
- Restrições: `uq_paciente_comorbidade`.

### `paciente_contato`

- Campos confirmados: `contato_id`, `paciente_id`, `telefone`, `criado_em`.
- PK: `paciente_contato_pkey`.
- FKs: `fk_paciente_contato_paciente`.
- Restrições: nenhuma adicional confirmada.

### `paciente_endereco`

- Campos confirmados: `endereco_id`, `paciente_id`, `endereco`, `cidade`, `criado_em`.
- PK: `paciente_endereco_pkey`.
- FKs: `fk_paciente_endereco_paciente`.
- Restrições: nenhuma adicional confirmada.

### `pendencia_atendimento`

- Campos confirmados: `pendencia_atendimento_id`, `atendimento_id`, `tipo_pendencia`, `descricao`, `status_pendencia`, `data_identificacao`, `data_resolucao`, `responsavel`, `valor_original_pendencia`, `observacoes`, `criado_em`, `atualizado_em`.
- PK: `pendencia_atendimento_pkey`.
- FKs: `fk_pendencia_atendimento`.
- Restrições: `chk_pendencia_status`.

### `procedimento_clinico`

- Campos confirmados: `procedimento_clinico_id`, `atendimento_id`, `tipo_procedimento`, `descricao`, `data_procedimento`, `status_procedimento`, `responsavel`, `resultado`, `conduta_pos_procedimento`, `valor_original_procedimento`, `valor_original_resultado`, `valor_original_conduta`, `observacoes`, `criado_em`, `atualizado_em`.
- PK: `procedimento_clinico_pkey`.
- FKs: `fk_procedimento_clinico_atendimento`.
- Restrições: `chk_procedimento_clinico_status`.

### `projeto_estudo`

- Campos confirmados: `projeto_estudo_id`, `codigo_projeto`, `nome_projeto`, `descricao`, `ativo`, `criado_em`, `atualizado_em`.
- PK: `projeto_estudo_pkey`.
- FKs: nenhuma.
- Restrições: `uq_projeto_estudo_codigo`.

### `sorologia_chagas`

- Campos confirmados: `sorologia_chagas_id`, `diagnostico_chagas_id`, `numero_metodo_planilha`, `metodo_sorologico`, `data_solicitacao`, `data_coleta`, `data_resultado`, `resultado`, `laboratorio`, `valor_original_metodo`, `valor_original_data`, `valor_original_resultado`, `observacoes`, `criado_em`, `atualizado_em`.
- PK: `sorologia_chagas_pkey`.
- FKs: `fk_sorologia_chagas_diagnostico`.
- Restrições: `uq_sorologia_chagas_metodo_por_diagnostico`, `chk_sorologia_chagas_numero_metodo`, `chk_sorologia_chagas_resultado`.

### `sorologia_solicitacao`

- Campos confirmados: `sorologia_solicitacao_id`, `atendimento_id`, `solicitada`, `data_solicitacao`, `tipo_solicitacao`, `status_solicitacao`, `valor_original_solicitacao`, `observacoes`, `criado_em`, `atualizado_em`.
- PK: `sorologia_solicitacao_pkey`.
- FKs: `fk_sorologia_solicitacao_atendimento`.
- Restrições: `chk_sorologia_solicitacao_status`.

### `tipo_encaminhamento`

- Campos confirmados: `tipo_encaminhamento_id`, `codigo_tipo`, `nome_tipo`, `descricao`, `ativo`, `criado_em`, `atualizado_em`.
- PK: `tipo_encaminhamento_pkey`.
- FKs: nenhuma.
- Restrições: `uq_tipo_encaminhamento_codigo`.

### `tipo_exame_complementar`

- Campos confirmados: `tipo_exame_complementar_id`, `codigo_exame`, `nome_exame`, `categoria`, `descricao`, `ativo`, `criado_em`, `atualizado_em`.
- PK: `tipo_exame_complementar_pkey`.
- FKs: nenhuma.
- Restrições: `uq_tipo_exame_complementar_codigo`, `chk_tipo_exame_complementar_categoria`.

### `tratamento_chagas`

- Campos confirmados: `tratamento_chagas_id`, `atendimento_id`, `medicamento_id`, `indicado`, `iniciado`, `concluido`, `status_tratamento`, `motivo_nao_tratamento`, `data_indicacao`, `data_inicio`, `data_fim`, `esquema_terapeutico`, `eventos_adversos`, `descricao_eventos_adversos`, `adesao_tratamento`, `valor_original_tratamento`, `valor_original_status`, `valor_original_eventos_adversos`, `observacoes`, `criado_em`, `atualizado_em`.
- PK: `tratamento_chagas_pkey`.
- FKs: `fk_tratamento_chagas_atendimento`, `fk_tratamento_chagas_medicamento`.
- Restrições: `chk_tratamento_chagas_status`, `chk_tratamento_chagas_adesao`.

## Divergências Entre Banco, Migrations e Modelo Lógico

- Banco x migrations: nenhuma divergência de tabelas identificada.
- A não cobertura integral da planilha original nesta fase é decisão arquitetural de implementação incremental, não divergência crítica.
- Migrations que parecem já aplicadas: `sql/01_criar_schema.sql` a `sql/09_tabelas_medicamentos_tratamentos.sql`, considerando schema, tabelas, PKs, FKs, `UNIQUE`, `CHECK` e índices presentes no dump.
- `sql/00_criar_banco.sql` cria role e banco, mas o dump de schema não evidencia role, owner ou criação do database; isso é esperado para o tipo de evidência analisada.
- Modelo lógico/dicionário anterior: `docs/historico/dicionario-dados.md` e `docs/historico/decisoes-modelagem.md` estão vazios, portanto não há comparação lógica detalhada no repositório.
- O dump confirma sequências e defaults equivalentes ao uso de `BIGSERIAL` nas migrations.
- O dump analisado não mostra dados de catálogo via `COPY` ou `INSERT`; a validação aqui é estrutural, não de carga de dados.

## Riscos Técnicos

- Reaplicar scripts antigos no banco atual pode gerar conflitos, duplicidade de dados de catálogo ou efeitos não planejados.
- O projeto ainda não usa uma ferramenta formal de migrations com controle de aplicação por ambiente.
- `sql/02_tabelas_paciente.sql` não possui `SET search_path`; embora as tabelas estejam corretamente no schema `ambulatorio` no banco atual, isso pode ser risco em uma reinstalação se o `search_path` não estiver configurado.
- Não há triggers versionadas para atualização automática de `atualizado_em`.
- Não há documentação lógica preenchida para validar decisões clínicas e regras de negócio.

## Ações Futuras Necessárias

1. Não reaplicar `sql/00` a `sql/09` no banco atual.
2. Criar migrations incrementais somente após decisão explícita sobre ajustes físicos.
3. Se adotada ferramenta formal de migrations, registrar baseline do estado atual de 25 tabelas.
4. Avaliar ajuste futuro para padronizar `SET search_path` em `sql/02_tabelas_paciente.sql` ou em novas migrations.
5. Preencher dicionário de dados e decisões de modelagem a partir do modelo físico validado.
6. Antes de qualquer alteração física, atualizar `docs/REGISTRO_DE_ALTERACOES.md`, `docs/MODELO_FISICO_ATUAL.md` e este documento quando aplicável.

## Próxima fase técnica

1. Criar dados de teste para o núcleo atual.
2. Validar inserções, FKs, `UNIQUE`, `CHECK` e regras de integridade.
3. Executar consultas representativas.
4. Registrar problemas e decisões encontradas.
5. Definir o próximo módulo de tabelas a implementar.
6. Criar migration incremental.
7. Atualizar documentação antes de encerrar a alteração.
