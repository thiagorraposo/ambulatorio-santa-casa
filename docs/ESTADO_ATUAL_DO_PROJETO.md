# Estado Atual do Projeto

Atualizado em: 2026-08-13

## Objetivo Geral

O projeto `ambulatorio-santa-casa` define a base de dados PostgreSQL para organizar registros de pacientes, atendimentos ambulatoriais, diagnóstico de doença de Chagas, sorologias, condições clínicas, comorbidades, exames complementares, encaminhamentos, acompanhamentos, medicamentos, tratamentos e procedimentos clínicos.

Até o momento, o repositório contém scripts SQL de criação de banco, schema,
tabelas, índices, restrições, dados iniciais de catálogo e oito testes SQL
transacionais reutilizáveis. Não há backend, frontend, scripts de importação,
suíte automatizada da aplicação, CI ou aplicação executável versionados.

## Stack e Tecnologias Usadas

- Banco de dados: PostgreSQL.
- Linguagem/artefatos implementados: SQL.
- Controle de versão: Git.
- Organização atual: scripts numerados em `sql/` e documentação em `docs/`.
- Schema principal: `ambulatorio`.
- Banco previsto pelos scripts: `ambulatorio_santa_casa`.
- Usuário previsto pelos scripts: `ambulatorio_user`.

## Status Atual

- Scripts SQL existentes de `sql/00_criar_banco.sql` a `sql/16_encaminhamento_ampliado.sql`.
- README e documentos antigos `docs/dicionario-dados.md` e `docs/decisoes-modelagem.md` existem, mas estão vazios.
- A estrutura física real aplicada no PostgreSQL foi validada por evidência versionada em `docs/evidencias/schema_atual_ambulatorio.sql`.
- O dump foi atualizado em 2026-08-13 e contém o schema `ambulatorio` com 37 tabelas aplicadas.
- As 37 tabelas físicas encontradas também estão cobertas pelos scripts SQL em `sql/`.
- Não foi encontrada tabela física sem migration correspondente, nem tabela em migration ausente do dump analisado.
- Existe uma rotina reutilizável de validação com dados de teste em `tests/sql/01_validar_nucleo_inicial.sql`.
- A rotina de validação usa transação com `ROLLBACK`, não altera a estrutura física do banco e não deixa dados de teste persistidos quando executada com sucesso.
- A rotina foi executada com sucesso em 2026-07-16: as 25 tabelas receberam dados sintéticos temporários, os testes de FK, `UNIQUE`, `CHECK` e `NOT NULL` foram aprovados, e uma consulta posterior confirmou ausência de dados de teste persistidos.
- A nova fonte canônica de layout é o arquivo local e ignorado pelo Git `planejamento/Nova Planilha ambulatório.xlsx`; a análise usou somente metadados seguros.
- As duas abas clínicas principais possuem 136 rótulos semânticos distintos. Após as quatro migrations mínimas, a cobertura atual está em `docs/COBERTURA_COLUNAS_PLANILHA.md`: 131 estão plenamente cobertos, 4 parcialmente cobertos, nenhum está não coberto e 1 permanece semanticamente desconhecido.
- As decisões semânticas e a rota até o MVP estão consolidadas em `docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`.
- A associação canônica entre paciente e projeto foi aplicada por
  `sql/13_associacao_paciente_projeto.sql` e validada nos 17 cenários definidos em
  `docs/ESPECIFICACAO_ASSOCIACAO_PACIENTE_PROJETO.md`.
- A evolução canônica dos exames por paciente foi aplicada por
  `sql/14_exames_por_paciente.sql` e validada nos 22 cenários definidos em
  `docs/ESPECIFICACAO_EVOLUCAO_EXAMES_COMPLEMENTARES.md`.
- A evolução canônica do tratamento com BZN e das reações adversas foi aplicada
  por `sql/15_tratamento_benzonidazol.sql` e validada nos 27 cenários definidos
  em `docs/ESPECIFICACAO_TRATAMENTO_BENZONIDAZOL.md`; `tratamento_chagas`
  permaneceu estruturalmente intacta e sem backfill.
- O encaminhamento ampliado foi aplicado por
  `sql/16_encaminhamento_ampliado.sql` e validado nos 23 cenários de
  `tests/sql/08_validar_encaminhamento_ampliado.sql`, sem backfill ou alteração
  de contrarreferência.
- O impacto físico e de planejamento do novo layout está documentado em `docs/IMPACTO_NOVO_LAYOUT_PLANILHA.md`; nenhuma migration, tabela ou teste SQL foi alterado.
- O módulo de avaliação clínica foi aplicado pela migration incremental `sql/10_modulo_avaliacao_clinica.sql`; as quatro novas tabelas e suas constraints constam no banco local e na evidência física.
- O módulo de notificação foi aplicado pela migration incremental `sql/11_modulo_notificacao.sql`; a tabela e suas constraints constam no banco local e na evidência física.
- O módulo de importação e proveniência foi aplicado pela migration incremental `sql/12_modulo_importacao_proveniencia.sql`; as três tabelas e suas constraints constam no banco local e na evidência física.
- Os oito testes SQL passaram no banco local em 2026-08-13. Todos executaram `ROLLBACK`, e auditoria confirmou ausência de dados sintéticos persistidos.
- O projeto possui orientações permanentes para Codex em `AGENTS.md`, `sql/AGENTS.md`, `tests/AGENTS.md` e `docs/AGENTS.md`.
- Decisões arquiteturais duradouras são registradas em `docs/DECISOES_ARQUITETURAIS.md`.
- O workflow oficial está documentado em `docs/WORKFLOW_DE_DESENVOLVIMENTO.md`.
- Regras de segurança de dados estão documentadas em `docs/SEGURANCA_DE_DADOS.md`.
- Comandos locais reproduzíveis estão definidos no `Makefile`.
- Existe ambiente PostgreSQL Docker opcional e isolado, com imagem
  `postgres:16.15`, porta `127.0.0.1:5433`, healthcheck e volume persistente
  nomeado. O PostgreSQL local em 5432 permanece o padrão oficial.

## Estratégia de Implementação Incremental

O modelo físico está sendo construído por fases. As 25 tabelas do núcleo funcional inicial foram expandidas pelas quatro tabelas do módulo de avaliação clínica, pela tabela de notificação, pelas três tabelas de importação e proveniência, pela associação paciente–projeto, pelos exames por paciente e pelas duas tabelas de BZN, totalizando 37 tabelas validadas.

A ausência temporária das demais tabelas planejadas não deve ser tratada como falha, lacuna involuntária ou divergência crítica. As demais estruturas previstas serão implementadas posteriormente por migrations incrementais.

Nenhuma migration antiga deve ser alterada ou reaplicada no banco atual. Qualquer evolução física deve ser feita por nova migration incremental, depois de registrada a decisão técnica e atualizada a documentação.

O objetivo da fase atual é validar funcionamento, integridade referencial, restrições, dados de teste e consultas básicas sobre o núcleo atual. A cobertura integral dos 136 rótulos físicos distintos das abas principais será tratada em fases posteriores de expansão e antes da importação completa da planilha.

## Tabelas Atualmente Existentes no Banco

O schema físico `ambulatorio`, conforme `docs/evidencias/schema_atual_ambulatorio.sql`, possui atualmente 37 tabelas:

1. `paciente`
2. `paciente_endereco`
3. `paciente_contato`
4. `atendimento`
5. `projeto_estudo`
6. `atendimento_projeto_estudo`
7. `diagnostico_chagas`
8. `sorologia_chagas`
9. `sorologia_solicitacao`
10. `historico_familiar_chagas`
11. `condicao_chagas`
12. `complicacao_chagas`
13. `comorbidade`
14. `paciente_comorbidade`
15. `tipo_exame_complementar`
16. `atendimento_exame_complementar`
17. `exame_complementar_resultado`
18. `tipo_encaminhamento`
19. `encaminhamento`
20. `acompanhamento_cuidado`
21. `pendencia_atendimento`
22. `medicamento`
23. `atendimento_medicamento`
24. `tratamento_chagas`
25. `procedimento_clinico`
26. `dados_clinicos_atendimento`
27. `evento_clinico`
28. `dispositivo_implantado`
29. `obito`
30. `notificacao`
31. `importacao_lote`
32. `importacao_linha`
33. `importacao_registro`
34. `paciente_projeto_estudo`
35. `paciente_exame_complementar`
36. `tratamento_benzonidazol`
37. `reacao_adversa_benzonidazol`

## Cobertura Banco x Migrations

| Tabela | Situação |
| --- | --- |
| `acompanhamento_cuidado` | Existe no banco e nas migrations |
| `atendimento` | Existe no banco e nas migrations |
| `atendimento_exame_complementar` | Existe no banco e nas migrations |
| `atendimento_medicamento` | Existe no banco e nas migrations |
| `atendimento_projeto_estudo` | Existe no banco e nas migrations |
| `comorbidade` | Existe no banco e nas migrations |
| `complicacao_chagas` | Existe no banco e nas migrations |
| `condicao_chagas` | Existe no banco e nas migrations |
| `dados_clinicos_atendimento` | Existe no banco e nas migrations |
| `diagnostico_chagas` | Existe no banco e nas migrations |
| `dispositivo_implantado` | Existe no banco e nas migrations |
| `encaminhamento` | Existe no banco e nas migrations |
| `evento_clinico` | Existe no banco e nas migrations |
| `exame_complementar_resultado` | Existe no banco e nas migrations |
| `historico_familiar_chagas` | Existe no banco e nas migrations |
| `importacao_linha` | Existe no banco e nas migrations |
| `importacao_lote` | Existe no banco e nas migrations |
| `importacao_registro` | Existe no banco e nas migrations |
| `medicamento` | Existe no banco e nas migrations |
| `obito` | Existe no banco e nas migrations |
| `notificacao` | Existe no banco e nas migrations |
| `paciente` | Existe no banco e nas migrations |
| `paciente_exame_complementar` | Existe no banco e nas migrations |
| `paciente_projeto_estudo` | Existe no banco e nas migrations |
| `paciente_comorbidade` | Existe no banco e nas migrations |
| `paciente_contato` | Existe no banco e nas migrations |
| `paciente_endereco` | Existe no banco e nas migrations |
| `pendencia_atendimento` | Existe no banco e nas migrations |
| `procedimento_clinico` | Existe no banco e nas migrations |
| `projeto_estudo` | Existe no banco e nas migrations |
| `reacao_adversa_benzonidazol` | Existe no banco e nas migrations |
| `sorologia_chagas` | Existe no banco e nas migrations |
| `sorologia_solicitacao` | Existe no banco e nas migrations |
| `tipo_encaminhamento` | Existe no banco e nas migrations |
| `tipo_exame_complementar` | Existe no banco e nas migrations |
| `tratamento_chagas` | Existe no banco e nas migrations |
| `tratamento_benzonidazol` | Existe no banco e nas migrations |

Resumo da reconciliação:

- Tabelas existentes tanto no banco quanto nas migrations: 37.
- Tabelas existentes no banco mas não cobertas pelas migrations: nenhuma identificada.
- Tabelas existentes nas migrations mas ausentes no banco: nenhuma identificada.

## Módulos Já Implementados

- Infraestrutura inicial de banco: criação de role, banco, schema e `search_path`.
- Cadastro básico de pacientes: dados pessoais, endereço e contato.
- Atendimentos: vínculo com paciente, data, prontuário, contexto ambulatorial e origem do registro.
- Projetos e estudos: catálogo de projetos e associação com atendimentos.
- Diagnóstico e sorologia de Chagas: diagnóstico, sorologias, solicitações e histórico familiar.
- Condições clínicas e comorbidades: condição clínica de Chagas, complicações, catálogo de comorbidades e associação paciente-comorbidade.
- Exames complementares: catálogo de tipos de exame, exames por atendimento e resultados estruturados.
- Exames canônicos por paciente, com atendimento opcional, blocos trazido/solicitado e convivência legada preservada.
- Encaminhamentos e acompanhamento: catálogo, documento apresentado, projeto
  oficial opcional, acompanhamento de cuidado e pendências.
- Medicamentos e tratamentos: catálogo de medicamentos, medicamentos por atendimento, tratamento de Chagas e procedimentos clínicos.
- Avaliação clínica por atendimento, eventos clínicos, dispositivos implantados e óbito, aplicada e validada no banco local.
- Notificação consolidada por paciente, aplicada e validada no banco local.
- Importação e proveniência com lote, linha bruta e associação genérica N:N, aplicada e validada no banco local; nenhum importador foi implementado.
- Associação consolidada paciente–projeto, independente de atendimento e com convivência preservada da associação antiga.
- Tratamento canônico com BZN por paciente e reações adversas repetíveis, com
  atendimento opcional e convivência legada preservada.
- Encaminhamento ampliado com documento apresentado, projeto oficial opcional e
  preservação integral da estrutura por atendimento.

## Módulos Ainda Pendentes

- Migrações formais com ferramenta de versionamento, se o projeto evoluir para aplicação.
- Expansão incremental do modelo físico para cobrir as demais tabelas e campos planejados.
- Cobertura integral dos 136 rótulos físicos distintos das abas principais, em fases posteriores e antes da importação completa.
- Importação completa da planilha original, após expansão e validação do modelo.
- Normalização e limpeza dos valores brutos da planilha.
- Backend/API.
- Frontend React.
- Autenticação, autorização e perfis de usuário.
- Regras de negócio de cadastro, atendimento, diagnóstico e acompanhamento.
- Suíte automatizada da futura aplicação e integração em CI; os oito testes SQL
  transacionais atuais continuam sendo a validação do banco.
- Rotinas adicionais de teste para futuras fases incrementais do modelo físico.
- Estratégia de deploy, backup e observabilidade.
- Política operacional de atualização da imagem PostgreSQL e teste formal de
  backup/restauração do volume Docker.
- Documentação operacional de execução dos scripts e restauração de ambiente.
- Automação futura de CI, se o projeto passar a ter colaboração recorrente, API ou frontend.

## Próximos Passos Recomendados

1. Formalizar o manifesto das duas abas clínicas com aliases, blocos, posições, ocorrências, conversões e regras de vazio.
2. Resolver os bloqueios operacionais e de segurança antes de usar dados reais.

## Próxima fase técnica

1. Não implementar o importador antes de fechar o manifesto e suas regras; as quatro migrations mínimas do MVP estão concluídas.
2. Manter dados reais bloqueados até existir manifesto, governança, roles, auditoria, retenção e ambiente seguro.

## Regra Permanente de Documentação

A partir desta tarefa, toda mudança relevante deve atualizar `docs/REGISTRO_DE_ALTERACOES.md` e, quando necessário, `docs/ESTADO_ATUAL_DO_PROJETO.md`, `docs/MODELO_FISICO_ATUAL.md` e `docs/PROXIMOS_PASSOS.md`.

Antes de concluir qualquer alteração futura, deve ser verificado se a documentação correspondente foi atualizada.
