# Plano inicial do projeto

> Documento histórico, movido de `planejamento/Projeto Planilha Ambulatório.md` em 2026-10-23.
> Propostas e comandos abaixo descrevem a origem e não o estado vigente.
> Consulte o [índice atual](../../README.md) e o
> [modelo físico](../../MODELO_FISICO_ATUAL.md) antes de implementar.

# 1. Modelagem do Banco de Dados
* [tabelas](LISTA_DE_TABELAS.md)
* [tabelas e atributos](TABELAS_E_ATRIBUTOS.md)
* [relação de cada tabela com cada coluna da planilha](MAPEAMENTO_TABELAS_COLUNAS.md)

# 2. Dicionário de Dados
- [Visão Geral das Tabelas](VISAO_DAS_TABELAS.md)
- [Dicionário de Dados Técnico](DICIONARIO_TECNICO.md)
- [Estrutura Esperada do Dicionário de Dados](ESTRUTURA_DO_DICIONARIO.md)
- [Dicionário de dados - Planilhas](DICIONARIO_PLANILHAS.md)

# 3. DER definitivo
- [DER Definitivo](DESCRICAO_DO_DER.md)
# 4. Modelo físico: roteiro geral
- `Modelo Físico` (referência local não versionada/não disponível)
- [Rotina curta para voltar ao projeto no futuro](ROTINA_LOCAL_ANTIGA.md)



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
