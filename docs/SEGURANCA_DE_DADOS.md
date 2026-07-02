# Segurança de Dados

Atualizado em: 2026-07-01

## Por que Dados Clínicos São Sensíveis

Dados clínicos podem identificar pacientes, revelar condições de saúde, histórico de atendimento, exames, tratamentos e outros dados pessoais. Esses arquivos exigem proteção adicional e não devem ser versionados no Git.

## O que Pode Entrar no Git

- Migrations e scripts SQL sem dados reais.
- Documentação técnica sem dados identificáveis.
- Dumps exclusivamente estruturais, como `docs/evidencias/schema_atual_ambulatorio.sql`.
- Dados sintéticos de teste.
- Testes SQL que usam `BEGIN` e `ROLLBACK`.

## O que Não Pode Entrar no Git

- Dados reais de pacientes.
- Planilhas reais.
- Backups de banco com dados.
- Dumps com dados.
- Credenciais, senhas, tokens e arquivos `.env`.
- Exports contendo pacientes.
- Arquivos temporários locais com dados clínicos.

## Dados Sintéticos

Use dados sintéticos em testes, exemplos e documentação. Dados sintéticos não devem permitir identificação de pacientes reais e devem ser claramente artificiais.

## Dump Somente de Schema

Use dump estrutural, sem dados, sem owner e sem privilégios:

```bash
make db-schema-dump
```

Comando equivalente:

```bash
pg_dump -h localhost -U ambulatorio_user -d ambulatorio_santa_casa --schema=ambulatorio --schema-only --no-owner --no-privileges --file=docs/evidencias/schema_atual_ambulatorio.sql
```

## Planilhas Reais

- Mantenha planilhas reais fora do repositório.
- Use diretórios locais ignorados pelo Git, como `planilhas_reais/`.
- Não copie trechos de planilha real para documentação.
- Para testes, crie amostras sintéticas.

## Revisão Antes de Commit

Antes de commitar:

```bash
git status --short
git diff --cached
```

Procure por:

- nomes de pacientes;
- documentos pessoais;
- telefones reais;
- endereços reais;
- caminhos para backups;
- senhas, tokens ou strings de conexão;
- dumps com `COPY` ou `INSERT` contendo dados reais.

## Em Caso de Inclusão Acidental

Se dado sensível for adicionado por engano, interrompa a tarefa e não faça push. Será necessário remover o arquivo e avaliar limpeza de histórico antes de compartilhar o repositório.
