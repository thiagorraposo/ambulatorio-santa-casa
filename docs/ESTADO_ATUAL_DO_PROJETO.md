# Estado Atual do Projeto

Atualizado em: 2026-07-16

## Objetivo Geral

O projeto `ambulatorio-santa-casa` define a base de dados PostgreSQL para organizar registros de pacientes, atendimentos ambulatoriais, diagnóstico de doença de Chagas, sorologias, condições clínicas, comorbidades, exames complementares, encaminhamentos, acompanhamentos, medicamentos, tratamentos e procedimentos clínicos.

Até o momento, o repositório contém scripts SQL de criação de banco, schema, tabelas, índices, restrições e alguns dados iniciais de catálogo. Não há backend, frontend, scripts de importação, testes automatizados ou aplicação executável versionados.

## Stack e Tecnologias Usadas

- Banco de dados: PostgreSQL.
- Linguagem/artefatos implementados: SQL.
- Controle de versão: Git.
- Organização atual: scripts numerados em `sql/` e documentação em `docs/`.
- Schema principal: `ambulatorio`.
- Banco previsto pelos scripts: `ambulatorio_santa_casa`.
- Usuário previsto pelos scripts: `ambulatorio_user`.

## Status Atual

- Scripts SQL existentes de `sql/00_criar_banco.sql` a `sql/09_tabelas_medicamentos_tratamentos.sql`.
- README e documentos antigos `docs/dicionario-dados.md` e `docs/decisoes-modelagem.md` existem, mas estão vazios.
- A estrutura física real aplicada no PostgreSQL foi validada por evidência versionada em `docs/evidencias/schema_atual_ambulatorio.sql`.
- O dump foi gerado com PostgreSQL 16.14 e contém o schema `ambulatorio` com 25 tabelas aplicadas.
- As 25 tabelas físicas encontradas também estão cobertas pelos scripts SQL em `sql/`.
- Não foi encontrada tabela física sem migration correspondente, nem tabela em migration ausente do dump analisado.
- Existe uma rotina reutilizável de validação com dados de teste em `tests/sql/01_validar_nucleo_inicial.sql`.
- A rotina de validação usa transação com `ROLLBACK`, não altera a estrutura física do banco e não deixa dados de teste persistidos quando executada com sucesso.
- A rotina foi executada com sucesso em 2026-07-16: as 25 tabelas receberam dados sintéticos temporários, os testes de FK, `UNIQUE`, `CHECK` e `NOT NULL` foram aprovados, e uma consulta posterior confirmou ausência de dados de teste persistidos.
- A reconciliação das 140 entradas do mapeamento da planilha está documentada em `docs/COBERTURA_COLUNAS_PLANILHA.md`: 97 estão plenamente cobertas pelo núcleo atual, 12 parcialmente cobertas, 19 não cobertas e 12 dependem de esclarecimento.
- O próximo módulo está tecnicamente especificado em `docs/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md` e pronto para uma nova migration incremental permissiva; unidades e semântica ainda bloqueiam somente a futura importação automática.
- O projeto possui orientações permanentes para Codex em `AGENTS.md`, `sql/AGENTS.md`, `tests/AGENTS.md` e `docs/AGENTS.md`.
- Decisões arquiteturais duradouras são registradas em `docs/DECISOES_ARQUITETURAIS.md`.
- O workflow oficial está documentado em `docs/WORKFLOW_DE_DESENVOLVIMENTO.md`.
- Regras de segurança de dados estão documentadas em `docs/SEGURANCA_DE_DADOS.md`.
- Comandos locais reproduzíveis estão definidos no `Makefile`.

## Estratégia de Implementação Incremental

O modelo físico está sendo construído por fases. As 25 tabelas atuais correspondem ao núcleo funcional inicial, implementado deliberadamente para validar o funcionamento do banco, os relacionamentos, as regras de integridade, os padrões de migrations e os fluxos principais antes da expansão do modelo.

A ausência temporária das demais tabelas planejadas não deve ser tratada como falha, lacuna involuntária ou divergência crítica. As demais estruturas previstas serão implementadas posteriormente por migrations incrementais.

Nenhuma migration antiga deve ser alterada ou reaplicada no banco atual. Qualquer evolução física deve ser feita por nova migration incremental, depois de registrada a decisão técnica e atualizada a documentação.

O objetivo da fase atual é validar funcionamento, integridade referencial, restrições, dados de teste e consultas básicas sobre o núcleo atual. A cobertura integral das 140 colunas da planilha original será tratada em fases posteriores de expansão e antes da importação completa da planilha.

## Tabelas Atualmente Existentes no Banco

O schema físico `ambulatorio`, conforme `docs/evidencias/schema_atual_ambulatorio.sql`, possui atualmente 25 tabelas:

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
| `diagnostico_chagas` | Existe no banco e nas migrations |
| `encaminhamento` | Existe no banco e nas migrations |
| `exame_complementar_resultado` | Existe no banco e nas migrations |
| `historico_familiar_chagas` | Existe no banco e nas migrations |
| `medicamento` | Existe no banco e nas migrations |
| `paciente` | Existe no banco e nas migrations |
| `paciente_comorbidade` | Existe no banco e nas migrations |
| `paciente_contato` | Existe no banco e nas migrations |
| `paciente_endereco` | Existe no banco e nas migrations |
| `pendencia_atendimento` | Existe no banco e nas migrations |
| `procedimento_clinico` | Existe no banco e nas migrations |
| `projeto_estudo` | Existe no banco e nas migrations |
| `sorologia_chagas` | Existe no banco e nas migrations |
| `sorologia_solicitacao` | Existe no banco e nas migrations |
| `tipo_encaminhamento` | Existe no banco e nas migrations |
| `tipo_exame_complementar` | Existe no banco e nas migrations |
| `tratamento_chagas` | Existe no banco e nas migrations |

Resumo da reconciliação:

- Tabelas existentes tanto no banco quanto nas migrations: 25.
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
- Encaminhamentos e acompanhamento: catálogo de encaminhamentos, encaminhamentos, acompanhamento de cuidado e pendências.
- Medicamentos e tratamentos: catálogo de medicamentos, medicamentos por atendimento, tratamento de Chagas e procedimentos clínicos.

## Módulos Ainda Pendentes

- Migrações formais com ferramenta de versionamento, se o projeto evoluir para aplicação.
- Expansão incremental do modelo físico para cobrir as demais tabelas e campos planejados.
- Cobertura integral das 140 colunas da planilha original, em fases posteriores e antes da importação completa.
- Importação completa da planilha original, após expansão e validação do modelo.
- Normalização e limpeza dos valores brutos da planilha.
- Backend/API.
- Frontend React.
- Autenticação, autorização e perfis de usuário.
- Regras de negócio de cadastro, atendimento, diagnóstico e acompanhamento.
- Testes automatizados.
- Rotinas adicionais de teste para futuras fases incrementais do modelo físico.
- Estratégia de deploy, backup e observabilidade.
- Documentação operacional de execução dos scripts e restauração de ambiente.
- Automação futura de CI, se o projeto passar a ter colaboração recorrente, API ou frontend.

## Próximos Passos Recomendados

1. Criar a migration incremental do módulo conforme `docs/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md`, sem acrescentar regras clínicas não documentadas.
2. Registrar a decisão técnica e o escopo da próxima fase.
3. Criar uma nova migration incremental, sem alterar ou reaplicar migrations antigas.
4. Criar ou ampliar os testes sintéticos correspondentes.
5. Atualizar a documentação antes de encerrar a alteração.

## Próxima fase técnica

1. Criar a migration incremental do módulo conforme `docs/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md`, sem acrescentar regras clínicas não documentadas.
2. Registrar a decisão técnica e o escopo da próxima fase.
3. Criar uma nova migration incremental, sem alterar ou reaplicar migrations antigas.
4. Criar ou ampliar os testes sintéticos correspondentes.
5. Atualizar a documentação antes de encerrar a alteração.

## Regra Permanente de Documentação

A partir desta tarefa, toda mudança relevante deve atualizar `docs/REGISTRO_DE_ALTERACOES.md` e, quando necessário, `docs/ESTADO_ATUAL_DO_PROJETO.md`, `docs/MODELO_FISICO_ATUAL.md` e `docs/PROXIMOS_PASSOS.md`.

Antes de concluir qualquer alteração futura, deve ser verificado se a documentação correspondente foi atualizada.
