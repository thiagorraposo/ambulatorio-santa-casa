# Próximos Passos

Atualizado em: 2026-07-01

## 1. Estratégia Incremental do Modelo Físico

1. Manter as 25 tabelas atuais como núcleo funcional inicial.
2. Tratar o modelo físico como construção por fases, não como entrega final da cobertura da planilha.
3. Implementar as demais tabelas previstas posteriormente por migrations incrementais.
4. Não alterar migrations antigas e não reaplicar scripts antigos no banco atual.
5. Validar funcionamento, integridade referencial, restrições, dados de teste e consultas básicas antes da próxima expansão.
6. Planejar a cobertura integral das 140 colunas da planilha em fases posteriores e antes da importação completa.

## 2. Próxima fase técnica

1. Executar `tests/sql/01_validar_nucleo_inicial.sql` em ambiente local ou de homologação.
2. Analisar `NOTICE`, consulta final e eventuais falhas do `psql`.
3. Registrar problemas e decisões encontradas.
4. Definir o próximo módulo de tabelas a implementar.
5. Criar migration incremental.
6. Atualizar documentação antes de encerrar a alteração.

## 3. Ajustes e Documentação Pendentes

1. Preencher ou revisar `README.md` com objetivo do projeto, requisitos e ordem de execução dos scripts.
2. Decidir se `docs/dicionario-dados.md` e `docs/decisoes-modelagem.md` serão preenchidos, substituídos ou mantidos como histórico vazio.
3. Documentar convenções de nomenclatura, valores padronizados e uso dos campos `valor_original_*`.
4. Documentar regras de atualização dos campos `atualizado_em`, pois ainda não há triggers ou mecanismos automáticos versionados.
5. Documentar estratégia de backup, restauração e ambientes.

## 4. Expansão e Importação da Planilha

1. Localizar e versionar apenas metadados seguros da planilha, sem dados sensíveis.
2. Mapear as 140 colunas da planilha para o núcleo atual e para os módulos futuros.
3. Definir as próximas fases de expansão do modelo antes da importação completa.
4. Definir regras de padronização para enums textuais usados nos `CHECK`.
5. Criar migrations incrementais para os módulos adicionais definidos.
6. Preservar valores originais nos campos `valor_original_*`.
7. Criar rotina de importação em ambiente controlado somente depois da cobertura necessária.
8. Criar relatório de registros importados, rejeitados e pendentes de revisão.

## 5. Backend/API

1. Definir linguagem, framework e estratégia de conexão com PostgreSQL.
2. Implementar camada de acesso a dados respeitando constraints existentes.
3. Criar endpoints mínimos para pacientes, atendimentos e consultas do modelo clínico.
4. Implementar validações compatíveis com os `CHECK` do banco.
5. Definir autenticação, autorização e auditoria antes de uso real com dados sensíveis.
6. Criar documentação da API.

## 6. Frontend React

1. Definir stack do frontend React somente após estabilizar a API.
2. Criar telas iniciais de consulta de paciente e histórico de atendimentos.
3. Criar fluxos de cadastro/edição que respeitem valores padronizados do banco.
4. Criar visualizações para diagnóstico, sorologias, exames, encaminhamentos e tratamentos.
5. Tratar estados de carregamento, erro, permissões e dados incompletos.

## 7. Testes e Implantação

1. Criar testes de execução das migrations em banco limpo.
2. Criar testes de integridade referencial e checks principais.
3. Criar testes de importação da planilha com amostras anonimizadas.
4. Criar testes do backend/API.
5. Criar testes básicos de frontend.
6. Definir pipeline de CI.
7. Definir estratégia de deploy, variáveis de ambiente, backup, restauração e monitoramento.
8. Validar requisitos de segurança e privacidade antes de qualquer uso com dados reais.

## Próximo Passo Técnico Recomendado

O próximo passo prático no banco é executar `tests/sql/01_validar_nucleo_inicial.sql` em ambiente local ou de homologação para validar inserções, FKs, `UNIQUE`, `CHECK`, regras de integridade e consultas representativas. Só depois disso deve ser definido o próximo módulo de tabelas e criada uma migration incremental. Não alterar migrations antigas e não reaplicar scripts antigos no banco atual.
