# 1. Modelagem do Banco de Dados
* [[tabelas]]
* [[tabelas e atributos]]
* [[relação de cada tabela com cada coluna da planilha]]

# 2. Dicionário de Dados
- [[Visão Geral das Tabelas]]
- [[Dicionário de Dados Técnico]]
- [[Estrutura Esperada do Dicionário de Dados]]
- [[Dicionário de dados - Planilhas]]

# 3. DER definitivo
- [[DER Definitivo]]
# 4. Modelo físico: roteiro geral
- [[Modelo Físico]]
- [[Rotina curta para voltar ao projeto no futuro]]



### Depois — Importação da planilha

1. ler a planilha com pandas;
2. salvar a linha bruta em `importacao_linha`;
3. transformar valores;
4. criar pacientes e atendimentos;
5. criar registros relacionados;
6. registrar erros;
7. testar com poucas linhas;
8. importar o restante.

### Depois — Backend/API

Primeiros módulos:

- autenticação;
- pacientes;
- atendimentos;
- exames;
- programas;
- tratamentos;
- busca;
- importação.

### Depois — Frontend React

Primeiras telas:

- login;
- lista de pacientes;
- cadastro;
- prontuário;
- histórico de atendimentos;
- formulário de atendimento;
- exames;
- dashboard;
- importação.