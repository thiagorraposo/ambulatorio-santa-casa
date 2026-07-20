# Próximos Passos

Atualizado em: 2026-07-20

## 1. Estratégia Incremental do Modelo Físico

1. Manter as 33 tabelas atuais como base física validada, preservando as 25 tabelas do núcleo inicial.
2. Tratar o modelo físico como construção por fases, não como entrega final da cobertura da planilha.
3. Implementar as demais tabelas previstas posteriormente por migrations incrementais.
4. Não alterar migrations antigas e não reaplicar scripts antigos no banco atual.
5. Validar funcionamento, integridade referencial, restrições, dados de teste e consultas básicas antes da próxima expansão.
6. Planejar a cobertura dos 136 rótulos físicos distintos das abas principais antes da importação completa.

## 2. Próxima fase técnica

1. Validar humanamente o inventário de `docs/IMPACTO_NOVO_LAYOUT_PLANILHA.md` e formalizar um manifesto físico seguro, separado por aba, posição e ocorrência.
2. Definir política institucional de retenção e rotina de auditoria de associações genéricas antes de usar dados reais.
3. Definir transições, retomada e idempotência clínica do futuro importador.
4. Fechar aliases, semânticas, tipos, unidades e regras de vazio antes de especificar o importador.
5. Especificar em seguida a extensão de tratamento de Chagas e, separadamente, o fluxo de encaminhamento/contrarreferência.

## 3. Ajustes e Documentação Pendentes

1. Preencher ou revisar `README.md` com objetivo do projeto, requisitos e ordem de execução dos scripts.
2. Decidir se `docs/dicionario-dados.md` e `docs/decisoes-modelagem.md` serão preenchidos, substituídos ou mantidos como histórico vazio.
3. Documentar convenções de nomenclatura, valores padronizados e uso dos campos `valor_original_*`.
4. Documentar regras de atualização dos campos `atualizado_em`, pois ainda não há triggers ou mecanismos automáticos versionados.
5. Manter `docs/DECISOES_ARQUITETURAIS.md` como fonte de decisões duradouras.
6. Usar `docs/WORKFLOW_DE_DESENVOLVIMENTO.md` e `AGENTS.md` como orientação para tarefas complexas.

## 4. Expansão e Importação da Planilha

1. Manter a planilha canônica local ignorada e versionar apenas seu futuro manifesto de metadados seguros.
2. Mapear as duas abas principais por nome, posição e ocorrência; não reutilizar um único mapa posicional.
3. Confirmar separadamente o papel da aba operacional e das duas abas auxiliares AIM3.
4. Definir as próximas fases de expansão apenas para lacunas semanticamente confirmadas.
5. Definir regras de padronização para enums textuais usados nos `CHECK`.
6. Criar migrations incrementais somente para os módulos adicionais confirmados.
7. Preservar valores originais nos campos `valor_original_*`.
8. Criar rotina de importação em ambiente controlado somente depois da cobertura necessária.
9. Criar relatório de registros importados, rejeitados e pendentes de revisão.

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

O módulo físico de importação e proveniência está implementado. O próximo trabalho deve validar humanamente o novo inventário, formalizar o manifesto por aba e resolver as decisões bloqueadoras antes de especificar o importador. Depois disso, devem ser especificadas somente as extensões clínicas confirmadas. Não alterar migrations antigas, reaplicar scripts antigos ou usar dados reais.

Comando local recomendado para verificar documentação e estado do projeto:

```bash
make project-check
```
