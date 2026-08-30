# Recuperação do PostgreSQL Docker

Atualizado em: 2026-08-19

Este procedimento cobre somente o ambiente Docker de desenvolvimento. Não é uma
política de produção ou retenção e não autoriza dados clínicos reais.

## Criar e localizar backup

```bash
make docker-backup
make docker-backup-list
```

O backup é produzido por `pg_dump --format=custom --no-owner --no-privileges`,
validado por `pg_restore --list` antes da publicação e salvo como
`backups_postgres/ambulatorio_AAAAMMDDTHHMMSSZ.dump`. O diretório e a extensão
são ignorados pelo Git. A senha vem exclusivamente do `.env` local.

## Testar uma restauração

```bash
make docker-restore \
  BACKUP_FILE=backups_postgres/ambulatorio_AAAAMMDDTHHMMSSZ.dump \
  RESTORE_ENV=docker-restore
make docker-restore-check
make docker-restore-test
```

O primeiro comando exige a escolha literal do ambiente, inicia o serviço
`postgres-restore` sem porta publicada, limpa somente o schema `ambulatorio`
desse banco controlado e executa `pg_restore --exit-on-error`. Seu volume é
`ambulatorio_santa_casa_postgres_restore_data`, separado do volume principal.
Não há parâmetro de host ou rota de restore para `localhost:5432`.

O check exige 38 tabelas, 155 constraints, 115 índices, 10 projetos, 16 tipos de
exame, 9 tipos de encaminhamento e 8 medicamentos. O teste executa os dez
arquivos SQL com `ON_ERROR_STOP=1`; os testes confirmam `ROLLBACK` e ausência dos
marcadores sintéticos.

## Recuperar após perda do container

Se somente o container principal foi perdido e o volume existe, execute
`make docker-up`: o Compose reconecta o volume nomeado. Confirme com
`make docker-project-check`. Não restaure backup sem necessidade.

## Recuperar após perda do volume

1. Preserve o arquivo `.dump` escolhido fora do Git.
2. Teste-o primeiro com o fluxo `postgres-restore` acima.
3. Confirme o check de catálogo e os dez testes.
4. A promoção para um novo volume principal é uma operação destrutiva distinta,
   não automatizada: deve ser autorizada explicitamente, com o ambiente Docker
   identificado e o PostgreSQL local fora de escopo.

Não use `docker-destroy` durante recuperação. O volume de restore também não é
backup: o arquivo lógico validado é o artefato recuperável.
