# Validação com Dados de Teste do Núcleo Inicial

Atualizado em: 2026-07-01

## Objetivo

`tests/sql/01_validar_nucleo_inicial.sql` é uma rotina reutilizável para validar o núcleo físico atual do banco PostgreSQL no schema `ambulatorio`.

O script insere dados mínimos, coerentes e encadeados nas 25 tabelas atuais, valida relacionamentos e restrições principais, executa testes negativos e finaliza com `ROLLBACK` para não deixar dados de teste persistidos.

Esta rotina não altera migrations, schema, tabelas ou estrutura física do banco.

## Pré-requisitos

- Banco `ambulatorio_santa_casa` acessível.
- Schema `ambulatorio` já criado.
- Núcleo físico atual com 25 tabelas aplicado.
- Usuário com permissão de `INSERT` e `SELECT` nas tabelas do schema `ambulatorio`.
- Execução via `psql`.

## Comando de Execução

```bash
psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -v ON_ERROR_STOP=1 -f tests/sql/01_validar_nucleo_inicial.sql
```

## Módulos Cobertos

- Paciente, endereço, contato e atendimento.
- Diagnóstico de Chagas, sorologia, solicitação de sorologia e histórico familiar.
- Condição e complicação de Chagas.
- Comorbidade e vínculo do paciente com comorbidade.
- Projeto/estudo e vínculo com atendimento.
- Tipo de encaminhamento, encaminhamento, acompanhamento de cuidado e pendência.
- Tipo de exame complementar, exame do atendimento e resultado estruturado.
- Medicamento, medicamento no atendimento, tratamento de Chagas e procedimento clínico.

## Tabelas Cobertas

1. `paciente`
2. `paciente_endereco`
3. `paciente_contato`
4. `atendimento`
5. `diagnostico_chagas`
6. `sorologia_chagas`
7. `sorologia_solicitacao`
8. `historico_familiar_chagas`
9. `condicao_chagas`
10. `complicacao_chagas`
11. `comorbidade`
12. `paciente_comorbidade`
13. `projeto_estudo`
14. `atendimento_projeto_estudo`
15. `tipo_encaminhamento`
16. `encaminhamento`
17. `tipo_exame_complementar`
18. `atendimento_exame_complementar`
19. `exame_complementar_resultado`
20. `medicamento`
21. `atendimento_medicamento`
22. `tratamento_chagas`
23. `procedimento_clinico`
24. `acompanhamento_cuidado`
25. `pendencia_atendimento`

## Constraints Efetivamente Testadas

Testes positivos:

- FKs encadeadas entre paciente, atendimento e módulos dependentes.
- `NOT NULL` dos campos obrigatórios usados nos inserts.
- `UNIQUE` em catálogos e vínculos que recebem valores únicos temporários.
- `CHECK` dos campos de domínio textual usados com valores válidos.

Testes negativos automáticos:

- FK inexistente em `atendimento.paciente_id`.
- Duplicidade de `comorbidade.nome_comorbidade`, coberta por `uq_comorbidade_nome`.
- Violação de `chk_atendimento_contexto_ambulatorio`.
- Ausência de `paciente.nome`, campo obrigatório.
- Valor inválido em `paciente.sexo`, coberto por `chk_paciente_sexo`.

## Por que o ROLLBACK Remove os Dados de Teste

O script começa com:

```sql
BEGIN;
SET search_path TO ambulatorio, public;
```

Todos os inserts e testes negativos são executados dentro dessa mesma transação. O script termina obrigatoriamente com:

```sql
ROLLBACK;
```

Com isso, o PostgreSQL desfaz todos os dados temporários criados durante a validação. A consulta final ocorre antes do `ROLLBACK`, apenas para comprovar que os registros existiram dentro da transação.

## Como Interpretar a Saída

`NOTICE` indica validação bem-sucedida. Exemplos esperados:

- `OK: paciente, endereco, contato e atendimento inseridos`
- `OK: FK inexistente bloqueada por constraint`
- `OK: valor duplicado bloqueado por UNIQUE`
- `OK: campo obrigatorio ausente bloqueado por NOT NULL`

A consulta final retorna uma lista de módulos e `registros_encontrados`. O esperado é que cada módulo listado tenha ao menos 1 registro dentro da transação.

Falhas:

- Se uma operação inválida for aceita indevidamente, o script executa `RAISE EXCEPTION`.
- Com `-v ON_ERROR_STOP=1`, o `psql` interrompe a execução ao encontrar erro não tratado.
- Se uma constraint esperada não existir ou tiver comportamento diferente, o teste negativo correspondente falhará.

## Limitações da Rotina

- A rotina valida integridade estrutural e regras físicas principais, não regras clínicas completas.
- A rotina não testa todas as combinações possíveis de valores de todos os `CHECK`.
- A rotina não valida índices por plano de execução.
- A rotina não valida performance.
- A rotina não testa permissões por perfil de usuário.
- A rotina não testa triggers de `atualizado_em`, pois não há triggers versionadas no núcleo atual.
- A rotina não cobre a importação completa das 140 colunas da planilha original.

## Regras Não Testáveis Automaticamente Nesta Rotina

- Atualização automática de `atualizado_em`: não aplicável, pois não há trigger confirmada no schema atual.
- Semântica clínica dos valores textuais: exige validação de negócio e comparação com a planilha original.
- Regras de permissões e autenticação: ainda não há backend/API ou perfis de usuário versionados.
- Cobertura integral da planilha original: será tratada em fases posteriores de expansão do modelo.
- Integridade de dados de catálogo pré-existentes: o script cria catálogos temporários próprios e não depende de registros já existentes.

## Quando Executar Novamente

Execute esta rotina:

- Após qualquer migration incremental que altere uma das 25 tabelas do núcleo atual.
- Após adicionar FKs, `UNIQUE`, `CHECK`, `NOT NULL` ou defaults relevantes.
- Antes de iniciar a importação completa da planilha.
- Após restauração de ambiente de desenvolvimento ou homologação.
- Antes de documentar que uma nova fase do modelo físico está validada.

Se futuras migrations adicionarem novos módulos, crie uma nova rotina ou amplie esta, atualizando também este documento e `docs/REGISTRO_DE_ALTERACOES.md`.
