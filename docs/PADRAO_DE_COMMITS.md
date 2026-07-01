# Padrão de Commits

Atualizado em: 2026-07-01

Este projeto adota Conventional Commits em português para manter o histórico Git claro, pesquisável e consistente.

## Formato

Use sempre:

```text
tipo: descrição curta em português
```

Regras:

- Use letras minúsculas no tipo.
- Use dois-pontos e espaço depois do tipo.
- Escreva a descrição no infinitivo ou em frase curta de ação.
- Não use ponto final na descrição curta.
- Prefira mensagens objetivas e específicas ao contexto do projeto.

## Tipos Permitidos

- `feat`: nova funcionalidade ou novo módulo funcional.
- `fix`: correção de defeito.
- `docs`: documentação.
- `refactor`: reorganização sem mudança de comportamento.
- `test`: testes.
- `chore`: manutenção, configuração ou tarefas gerais.
- `build`: dependências, build ou banco.
- `ci`: automação de integração ou entrega.
- `perf`: melhoria de desempenho.
- `style`: formatação sem mudança lógica.
- `revert`: reversão.

## Regra para Banco, Migrations e Documentação

Toda alteração de banco, migration ou documentação deve ter mensagem compatível com o tipo da mudança:

- Use `build` quando a mudança for infraestrutura de banco, dependências, build ou preparação estrutural.
- Use `feat` quando uma migration adicionar um novo módulo funcional de tabelas.
- Use `fix` quando uma migration corrigir defeito em estrutura já existente.
- Use `docs` quando a alteração for apenas documentação.
- Use `test` quando a alteração criar ou ajustar validações automatizadas ou dados/rotinas de teste.

Migrations antigas não devem ser alteradas nem reaplicadas no banco atual. Evoluções físicas devem ser feitas por migrations incrementais.

## Exemplos do Projeto

```text
docs: registrar estratégia incremental do modelo físico
build: criar schema ambulatorio no PostgreSQL
feat: adicionar tabelas de pacientes e atendimentos
feat: implementar módulo de medicamentos e tratamentos
test: validar constraints do núcleo inicial
chore: configurar estrutura inicial do repositório
```

## Exemplos para Próximas Etapas

Criação de migration:

```text
feat: adicionar tabelas do módulo de acompanhamento cardiológico
fix: corrigir constraint de status de tratamento
build: criar baseline do schema ambulatorio
```

Validação de banco:

```text
test: validar integridade referencial do núcleo inicial
test: adicionar dados de teste para pacientes e atendimentos
test: validar checks de diagnóstico e sorologia
```

Importação com Pandas:

```text
feat: importar planilha inicial com pandas
fix: tratar datas inválidas na importação da planilha
test: validar mapeamento das colunas da planilha
```

Criação de API:

```text
feat: criar api de consulta de pacientes
feat: adicionar endpoints de atendimentos
fix: corrigir validação de origem do atendimento
```

Frontend React:

```text
feat: criar tela de consulta de pacientes
feat: adicionar histórico de atendimentos no frontend
style: ajustar espaçamento da tabela de pacientes
```

Testes:

```text
test: adicionar testes de criação de pacientes
test: validar fluxo de cadastro de atendimento
test: cobrir consultas representativas do núcleo inicial
```

Documentação:

```text
docs: atualizar modelo físico atual
docs: registrar decisão de nova migration incremental
docs: documentar fluxo de importação da planilha
```

## Escolha do Tipo

Quando houver dúvida:

- Se cria capacidade nova para usuário, sistema ou banco: `feat`.
- Se corrige algo errado: `fix`.
- Se só documenta: `docs`.
- Se só organiza sem mudar comportamento: `refactor`.
- Se só valida comportamento: `test`.
- Se é tarefa de manutenção geral: `chore`.
- Se afeta banco estrutural, dependências ou build: `build`.
