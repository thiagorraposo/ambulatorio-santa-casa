# Segurança de Dados

Atualizado em: 2026-08-26

O threat model técnico vigente está em `docs/THREAT_MODEL.md`; ele não autoriza dados reais.

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

## PostgreSQL Docker local

- `.env` contém a senha exclusiva do ambiente Docker e permanece ignorado pelo
  Git; somente `.env.example`, com valor fictício, pode ser versionado;
- não reutilizar senha institucional, local existente ou de produção;
- a porta Docker padrão é `127.0.0.1:5433`, sem exposição em interfaces externas;
- o volume `ambulatorio_santa_casa_postgres_data` é persistente e pode conter
  dados sensíveis no futuro; não copiá-lo, publicá-lo nem tratá-lo como backup;
- `make docker-stop` preserva dados; `make docker-destroy DESTROY_ENV=docker`
  remove somente o ambiente Docker e seus volumes, com confirmação explícita;
- o ambiente Docker atual é destinado a migrations e dados sintéticos, não está
  autorizado para dados clínicos reais;
- dumps comparativos do Docker devem ser somente estruturais e permanecer em
  `/tmp`, salvo decisão explícita de atualizar a evidência oficial.

## Backups lógicos e segredos

- backups criados por `make docker-backup` ficam em `backups_postgres/`, ignorado
  pelo Git, e podem conter todas as linhas do banco;
- nunca versionar, anexar a tickets ou enviar esses arquivos por canais não autorizados;
- `.env` é a fonte local das variáveis Docker; mantenha permissões restritas e
  use senha exclusiva de desenvolvimento, nunca credencial institucional;
- o Makefile e a documentação não contêm senha; a configuração vem do ambiente;
- restore só é suportado no serviço `postgres-restore`, sem porta publicada, com
  confirmação `RESTORE_ENV=docker-restore` e volume separado;
- desenvolvimento e testes usam somente dados sintéticos. Produção futura exigirá
  servidor, roles, segredos, retenção, auditoria e política institucional próprios.

## Planilhas Reais

- Mantenha planilhas reais fora do repositório.
- Use diretórios locais ignorados pelo Git, como `planilhas_reais/`.
- Não copie trechos de planilha real para documentação.
- Para testes, crie amostras sintéticas.

## Privilégios e logs do importador

- `ambulatorio_user` permanece owner de manutenção e não é a identidade normal do processo;
- `ambulatorio_importador` e `ambulatorio_aplicacao` são roles sem login assumidas por login gerenciado;
- o importador não possui ownership, `CREATE` ou `DELETE`; a aplicação não lê as tabelas de importação;
- logs são JSON de allowlist, sem nomes, telefones, endereços, conteúdo clínico, valores originais ou mensagens de linha;
- quality reports contêm apenas hashes, versões, revisão Git e métricas agregadas e devem ser protegidos.

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
