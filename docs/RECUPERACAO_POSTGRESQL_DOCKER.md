# Recuperação do PostgreSQL Docker

Procedimento de origem: 2026-08-19. Referências e limites revistos em: 2026-10-23.

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
```

O primeiro comando exige a escolha literal do ambiente, inicia o serviço
`postgres-restore` sem porta publicada, limpa somente o schema `ambulatorio`
desse banco controlado e executa `pg_restore --exit-on-error`. Seu volume é
`ambulatorio_santa_casa_postgres_restore_data`, separado do volume principal.
Não há parâmetro de host ou rota de restore para `localhost:5432`.

O check exige 38 tabelas, 155 constraints, 115 índices, 10 projetos, 16 tipos de
exame, 9 tipos de encaminhamento e 8 medicamentos. Esses valores continuam codificados em
`sql/validar_backup_restaurado.sql`; esse check não comprova compatibilidade com
os incrementos posteriores à evidência persistente 00–20.

A descrição de origem mencionava dez testes com `ROLLBACK`. Hoje,
`docker-restore-test` percorre todos os `tests/sql/*.sql` pelo Makefile, incluindo
casos que fazem COMMIT e exigem banco descartável novo/identificado e migrations
posteriores. Portanto, não é validação genérica para qualquer backup do banco
persistente e não deve ser executado sobre uma cópia que precise permanecer
intacta. Escolher um plano de teste de recuperação compatível com a versão do
backup é uma pendência operacional; esta revisão não altera o alvo nem o schema.
A [matriz de validação](WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional)
continua definindo as verificações por escopo.

## Recuperar após perda do container

Se somente o container principal foi perdido e o volume existe, execute
`make docker-up`: o Compose reconecta o volume nomeado. Confirme com
`make docker-db-check`. A suíte SQL completa exige ambiente descartável
compatível; não a use para verificar a saúde do banco persistente. Não restaure
backup sem necessidade.

## Recuperar após perda do volume

1. Preserve o arquivo `.dump` escolhido fora do Git.
2. Teste-o primeiro com o fluxo `postgres-restore` acima.
3. Confirme o catálogo da versão restaurada e defina testes compatíveis em
   cópia descartável; o alvo genérico tem os limites descritos acima.
4. A promoção para um novo volume principal é uma operação destrutiva distinta,
   não automatizada: deve ser autorizada explicitamente, com o ambiente Docker
   identificado e o PostgreSQL local fora de escopo.

Não use `docker-destroy` durante recuperação. O volume de restore também não é
backup: o arquivo lógico validado é o artefato recuperável.
