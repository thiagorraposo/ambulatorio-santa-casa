# Próximos Passos

Atualizado em: 2026-07-19

## 1. Estratégia Incremental do Modelo Físico

1. Manter as 30 tabelas atuais como base física validada, preservando as 25 tabelas do núcleo inicial.
2. Tratar o modelo físico como construção por fases, não como entrega final da cobertura da planilha.
3. Implementar as demais tabelas previstas posteriormente por migrations incrementais.
4. Não alterar migrations antigas e não reaplicar scripts antigos no banco atual.
5. Validar funcionamento, integridade referencial, restrições, dados de teste e consultas básicas antes da próxima expansão.
6. Planejar a cobertura integral das 140 colunas da planilha em fases posteriores e antes da importação completa.

## 2. Próxima fase técnica

1. Resolver as pendências de desenho de importação e proveniência descritas em `docs/ESPECIFICACAO_MODULO_IMPORTACAO_PROVENIENCIA.md`.
2. Obter a lista canônica ordenada de abas e colunas como metadados seguros, sem versionar dados clínicos.
3. Definir reprocessamento, retenção do conteúdo bruto e vínculo entre linha e registros gerados.
4. Somente depois preparar a migration incremental e o teste SQL sintético transacional do módulo.
5. Especificar em seguida a extensão de tratamento de Chagas e, separadamente, o fluxo de encaminhamento/contrarreferência.

## 3. Ajustes e Documentação Pendentes

1. Preencher ou revisar `README.md` com objetivo do projeto, requisitos e ordem de execução dos scripts.
2. Decidir se `docs/dicionario-dados.md` e `docs/decisoes-modelagem.md` serão preenchidos, substituídos ou mantidos como histórico vazio.
3. Documentar convenções de nomenclatura, valores padronizados e uso dos campos `valor_original_*`.
4. Documentar regras de atualização dos campos `atualizado_em`, pois ainda não há triggers ou mecanismos automáticos versionados.
5. Manter `docs/DECISOES_ARQUITETURAIS.md` como fonte de decisões duradouras.
6. Usar `docs/WORKFLOW_DE_DESENVOLVIMENTO.md` e `AGENTS.md` como orientação para tarefas complexas.

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

O próximo módulo recomendado é importação e proveniência. Antes de qualquer migration, devem ser fechadas identidade de lote, retenção de `JSONB`, reprocessamento e associação entre a linha de origem e os registros gerados. Não importar dados reais, alterar migrations antigas nem reaplicar scripts antigos no banco atual.

Comando local recomendado para verificar documentação e estado do projeto:

```bash
make project-check
```
