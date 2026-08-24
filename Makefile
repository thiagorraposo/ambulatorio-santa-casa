DB_ENV ?= docker

ifneq (,$(wildcard .env))
include .env
endif

ifeq ($(DB_ENV),docker)
DB_NAME ?= $(POSTGRES_DB)
DB_USER ?= $(POSTGRES_USER)
DB_HOST ?= localhost
DB_PORT ?= $(POSTGRES_PORT)
export PGPASSWORD := $(POSTGRES_PASSWORD)
else
DB_NAME ?= ambulatorio_santa_casa
DB_USER ?= ambulatorio_user
DB_HOST ?= localhost
DB_PORT ?= 5432
endif

DB_SCHEMA ?= ambulatorio
SCHEMA_DUMP ?= docs/evidencias/schema_atual_ambulatorio.sql
DOCKER_SCHEMA_DUMP ?= /tmp/schema_ambulatorio_docker.sql
BACKUP_DIR ?= backups_postgres
BACKUP_FILE ?=
RESTORE_ENV ?=
DESTROY_ENV ?=
SQL_TESTS := $(sort $(wildcard tests/sql/*.sql))
SQL_MIGRATIONS := $(sort $(wildcard sql/[0-1][0-9]_*.sql))
COMPOSE := docker compose --env-file .env

.DEFAULT_GOAL := help

.PHONY: help git-status db-check db-test db-migrate docs-check project-check \
	db-schema-dump docker-config-check docker-up docker-status docker-wait \
	docker-stop docker-recreate docker-logs docker-migrate docker-db-check docker-db-test \
	docker-schema-dump docker-project-check docker-destroy \
	docker-backup docker-backup-list docker-restore docker-restore-check docker-restore-test \
	manifest-check

help:
	@echo "Comandos disponíveis:"
	@echo "  make help            Exibe esta ajuda"
	@echo "  make git-status      Exibe status Git e últimos commits"
	@echo "  make db-check        Valida conexão, banco, schema e usuário"
	@echo "  make db-test         Executa todos os testes em tests/sql/"
	@echo "  make docs-check      Verifica documentos obrigatórios e não vazios"
	@echo "  make manifest-check  Valida o manifesto físico v1 e a fonte local"
	@echo "  make project-check   Executa todos os checks locais não destrutivos"
	@echo "  make db-schema-dump  Atualiza somente o dump estrutural do schema $(DB_SCHEMA)"
	@echo "  make docker-up       Sobe somente o PostgreSQL Docker"
	@echo "  make docker-status   Exibe containers e health do PostgreSQL Docker"
	@echo "  make docker-stop     Para o container sem remover o volume"
	@echo "  make docker-recreate Recria o container preservando o volume"
	@echo "  make docker-logs     Acompanha os logs do PostgreSQL Docker"
	@echo "  make docker-migrate  Aplica sql/00 a sql/16 no PostgreSQL Docker"
	@echo "  make docker-db-check Executa db-check explicitamente no Docker"
	@echo "  make docker-db-test  Executa os oito testes SQL no Docker"
	@echo "  make docker-schema-dump Gera dump estrutural Docker em $(DOCKER_SCHEMA_DUMP)"
	@echo "  make docker-project-check Executa o project-check no Docker"
	@echo "  make docker-backup    Cria backup lógico custom em $(BACKUP_DIR)/"
	@echo "  make docker-backup-list Lista backups locais ignorados pelo Git"
	@echo "  make docker-restore BACKUP_FILE=... RESTORE_ENV=docker-restore"
	@echo "  make docker-restore-check Valida o banco Docker restaurado"
	@echo "  make docker-restore-test Executa os oito testes no banco restaurado"
	@echo "  make docker-destroy DESTROY_ENV=docker  DESTROI os volumes Docker do projeto"

git-status:
	@git status --short --branch
	@echo ""
	@git log --oneline --decorate -n 8

db-check:
	@command -v psql >/dev/null 2>&1 || { echo "Erro: psql não encontrado."; exit 1; }
	@resultado="$$(psql -X -h "$(DB_HOST)" -p "$(DB_PORT)" -U "$(DB_USER)" -d "$(DB_NAME)" -v ON_ERROR_STOP=1 -Atc "SELECT current_database(), current_user, EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = '$(DB_SCHEMA)');")"; \
		esperado="$(DB_NAME)|$(DB_USER)|t"; \
		if [ "$$resultado" != "$$esperado" ]; then \
			echo "Erro: validação do banco divergiu do esperado."; \
			echo "Esperado: banco=$(DB_NAME), usuario=$(DB_USER), schema=$(DB_SCHEMA) existente"; \
			exit 1; \
		fi; \
		echo "OK: conexão PostgreSQL"; \
		echo "OK: banco $(DB_NAME)"; \
		echo "OK: usuário $(DB_USER)"; \
		echo "OK: schema $(DB_SCHEMA)"

db-test: db-check
	@if [ -z "$(SQL_TESTS)" ]; then \
		echo "Erro: nenhum teste SQL encontrado em tests/sql/."; \
		exit 1; \
	fi
	@for test_file in $(SQL_TESTS); do \
		echo "Executando $$test_file"; \
		psql -X -h "$(DB_HOST)" -p "$(DB_PORT)" -U "$(DB_USER)" -d "$(DB_NAME)" -v ON_ERROR_STOP=1 -f "$$test_file" || exit 1; \
	done
	@echo "OK: $(words $(SQL_TESTS)) teste(s) SQL executado(s)"

db-migrate:
	@if [ -z "$(SQL_MIGRATIONS)" ]; then \
		echo "Erro: nenhuma migration SQL encontrada."; \
		exit 1; \
	fi
	@for migration in $(SQL_MIGRATIONS); do \
		echo "Aplicando $$migration"; \
		psql -X -h "$(DB_HOST)" -p "$(DB_PORT)" -U "$(DB_USER)" -d "$(DB_NAME)" \
			-v ON_ERROR_STOP=1 -f "$$migration" || exit 1; \
	done
	@echo "OK: $(words $(SQL_MIGRATIONS)) migration(s) aplicada(s)"

docs-check:
	@missing=0; \
	for file in \
		AGENTS.md \
		README.md \
		docs/ESTADO_ATUAL_DO_PROJETO.md \
		docs/PROXIMOS_PASSOS.md \
		docs/REGISTRO_DE_ALTERACOES.md \
		docs/PADRAO_DE_COMMITS.md \
		docs/DECISOES_ARQUITETURAIS.md \
		docs/MODELO_FISICO_ATUAL.md \
		docs/MANIFESTO_FISICO_PLANILHA_V1.md \
		docs/RECUPERACAO_POSTGRESQL_DOCKER.md \
		docs/SEGURANCA_DE_DADOS.md \
		docs/WORKFLOW_DE_DESENVOLVIMENTO.md; do \
		if [ ! -s "$$file" ]; then \
			echo "Ausente ou vazio: $$file"; \
			missing=1; \
		else \
			echo "OK: $$file"; \
		fi; \
	done; \
	exit $$missing

manifest-check:
	@python3 scripts/validar_manifesto_planilha.py --fonte

project-check: docs-check db-test
	@git diff --check
	@echo "OK: git diff --check"
	@echo ""
	@$(MAKE) --no-print-directory git-status

db-schema-dump: db-check
	@command -v pg_dump >/dev/null 2>&1 || { echo "Erro: pg_dump não encontrado."; exit 1; }
	@mkdir -p "$$(dirname "$(SCHEMA_DUMP)")"
	@arquivo_temporario="$(SCHEMA_DUMP).tmp"; \
		if pg_dump -h "$(DB_HOST)" -p "$(DB_PORT)" -U "$(DB_USER)" -d "$(DB_NAME)" \
			--schema="$(DB_SCHEMA)" --schema-only --no-owner --no-privileges \
			--file="$$arquivo_temporario"; then \
			if [ -f "$(SCHEMA_DUMP)" ]; then \
				chave_existente="$$(sed -n 's/^\\restrict //p' "$(SCHEMA_DUMP)" | head -n 1)"; \
				chave_nova="$$(sed -n 's/^\\restrict //p' "$$arquivo_temporario" | head -n 1)"; \
				if [ -n "$$chave_existente" ] && [ -n "$$chave_nova" ]; then \
					sed -i "s/$$chave_nova/$$chave_existente/g" "$$arquivo_temporario"; \
				fi; \
			fi; \
			if [ -f "$(SCHEMA_DUMP)" ] && cmp -s "$(SCHEMA_DUMP)" "$$arquivo_temporario"; then \
				rm -f "$$arquivo_temporario"; \
				echo "OK: schema sem alteração estrutural; evidência preservada"; \
			else \
				mv "$$arquivo_temporario" "$(SCHEMA_DUMP)"; \
				echo "OK: dump somente estrutural atualizado em $(SCHEMA_DUMP)"; \
			fi; \
		else \
			status=$$?; \
			rm -f "$$arquivo_temporario"; \
			exit $$status; \
		fi

docker-config-check:
	@test -f .env || { echo "Erro: .env ausente. Copie .env.example e defina uma senha local."; exit 1; }
	@test -n "$(POSTGRES_DB)" -a -n "$(POSTGRES_USER)" -a -n "$(POSTGRES_PASSWORD)" -a -n "$(POSTGRES_PORT)" || { \
		echo "Erro: variáveis POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD e POSTGRES_PORT são obrigatórias."; \
		exit 1; \
	}
	@test "$(POSTGRES_PORT)" != "5432" || { echo "Erro: a porta Docker não pode ser 5432 nesta etapa."; exit 1; }
	@$(COMPOSE) config --quiet

docker-up: docker-config-check
	@$(COMPOSE) up -d postgres

docker-status: docker-config-check
	@$(COMPOSE) ps
	@$(COMPOSE) exec -T postgres pg_isready -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)"

docker-wait: docker-config-check
	@container_id="$$( $(COMPOSE) ps -q postgres )"; \
		test -n "$$container_id" || { echo "Erro: container PostgreSQL não está em execução."; exit 1; }; \
		for tentativa in $$(seq 1 30); do \
			saude="$$(docker inspect --format '{{.State.Health.Status}}' "$$container_id")"; \
			if [ "$$saude" = "healthy" ]; then echo "OK: PostgreSQL Docker healthy"; exit 0; fi; \
			if [ "$$saude" = "unhealthy" ]; then echo "Erro: PostgreSQL Docker unhealthy"; exit 1; fi; \
			sleep 2; \
		done; \
		echo "Erro: timeout aguardando healthcheck do PostgreSQL Docker"; exit 1

docker-stop: docker-config-check
	@$(COMPOSE) stop

docker-recreate: docker-config-check
	@$(COMPOSE) up -d --force-recreate postgres
	@$(MAKE) --no-print-directory docker-wait

docker-logs: docker-config-check
	@$(COMPOSE) logs -f postgres

docker-migrate: docker-wait
	@$(MAKE) --no-print-directory db-migrate DB_ENV=docker

docker-db-check: docker-wait
	@$(MAKE) --no-print-directory db-check DB_ENV=docker

docker-db-test: docker-wait
	@$(MAKE) --no-print-directory db-test DB_ENV=docker

docker-schema-dump: docker-wait
	@$(MAKE) --no-print-directory db-schema-dump DB_ENV=docker SCHEMA_DUMP="$(DOCKER_SCHEMA_DUMP)"

docker-project-check: docker-wait
	@$(MAKE) --no-print-directory project-check DB_ENV=docker

docker-backup: docker-wait
	@mkdir -p "$(BACKUP_DIR)"
	@arquivo="$(BACKUP_DIR)/ambulatorio_$$(date -u +%Y%m%dT%H%M%SZ).dump"; \
		temporario="$$arquivo.tmp"; \
		$(COMPOSE) exec -T postgres pg_dump -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)" \
			--format=custom --no-owner --no-privileges > "$$temporario" && \
		$(COMPOSE) exec -T postgres pg_restore --list < "$$temporario" >/dev/null && \
		mv "$$temporario" "$$arquivo" && \
		echo "OK: backup lógico validado em $$arquivo" || { status=$$?; rm -f "$$temporario"; exit $$status; }

docker-backup-list:
	@mkdir -p "$(BACKUP_DIR)"
	@find "$(BACKUP_DIR)" -maxdepth 1 -type f -name '*.dump' -printf '%TY-%Tm-%Td %TH:%TM  %10s bytes  %p\n' | sort -r

docker-restore: docker-config-check
	@test "$(RESTORE_ENV)" = "docker-restore" || { echo "Erro: confirme RESTORE_ENV=docker-restore; restore local não é suportado."; exit 1; }
	@test -n "$(BACKUP_FILE)" -a -f "$(BACKUP_FILE)" || { echo "Erro: informe BACKUP_FILE apontando para um backup local existente."; exit 1; }
	@$(COMPOSE) --profile recovery up -d postgres-restore
	@container_id="$$( $(COMPOSE) --profile recovery ps -q postgres-restore )"; \
		for tentativa in $$(seq 1 30); do \
			saude="$$(docker inspect --format '{{.State.Health.Status}}' "$$container_id")"; \
			[ "$$saude" = healthy ] && break; \
			[ "$$saude" = unhealthy ] && { echo "Erro: PostgreSQL de restore unhealthy"; exit 1; }; \
			sleep 2; \
		done; \
		[ "$$(docker inspect --format '{{.State.Health.Status}}' "$$container_id")" = healthy ] || { echo "Erro: timeout no ambiente de restore"; exit 1; }
	@$(COMPOSE) exec -T postgres-restore psql -X -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)" -v ON_ERROR_STOP=1 \
		-c 'DROP SCHEMA IF EXISTS ambulatorio CASCADE;'
	@$(COMPOSE) exec -T postgres-restore pg_restore -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)" \
		--exit-on-error --no-owner --no-privileges < "$(BACKUP_FILE)"
	@echo "OK: backup restaurado exclusivamente no serviço Docker postgres-restore"

docker-restore-check: docker-config-check
	@$(COMPOSE) --profile recovery exec -T postgres-restore psql -X -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)" \
		-v ON_ERROR_STOP=1 < sql/validar_backup_restaurado.sql

docker-restore-test: docker-restore-check
	@for test_file in $(SQL_TESTS); do \
		echo "Executando $$test_file no restore"; \
		$(COMPOSE) --profile recovery exec -T postgres-restore psql -X -U "$(POSTGRES_USER)" \
			-d "$(POSTGRES_DB)" -v ON_ERROR_STOP=1 < "$$test_file" || exit 1; \
	 done
	@echo "OK: $(words $(SQL_TESTS)) teste(s) SQL executado(s) no restore"

docker-destroy: docker-config-check
	@test "$(DESTROY_ENV)" = "docker" || { echo "Erro: confirme DESTROY_ENV=docker; o PostgreSQL local não é suportado."; exit 1; }
	@$(COMPOSE) down --volumes --remove-orphans
	@echo "OK: somente containers, rede e volumes Docker deste projeto foram removidos"
