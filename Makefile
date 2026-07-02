DB_NAME ?= ambulatorio_santa_casa
DB_USER ?= ambulatorio_user
DB_HOST ?= localhost
DB_SCHEMA ?= ambulatorio
SCHEMA_DUMP ?= docs/evidencias/schema_atual_ambulatorio.sql
CORE_TEST ?= tests/sql/01_validar_nucleo_inicial.sql

.DEFAULT_GOAL := help

.PHONY: help git-status db-schema-dump db-test-core docs-check project-check

help:
	@echo "Comandos disponíveis:"
	@echo "  make help            Exibe esta ajuda"
	@echo "  make git-status      Exibe status Git e últimos commits"
	@echo "  make db-schema-dump  Atualiza dump estrutural do schema $(DB_SCHEMA)"
	@echo "  make db-test-core    Executa validação SQL do núcleo inicial"
	@echo "  make docs-check      Verifica documentos obrigatórios"
	@echo "  make project-check   Executa checks locais não destrutivos"

git-status:
	@git status --short --branch
	@echo ""
	@git log --oneline --decorate -n 8

db-schema-dump:
	@mkdir -p docs/evidencias
	@pg_dump -h "$(DB_HOST)" -U "$(DB_USER)" -d "$(DB_NAME)" --schema="$(DB_SCHEMA)" --schema-only --no-owner --no-privileges --file="$(SCHEMA_DUMP)"
	@echo "Dump estrutural atualizado em $(SCHEMA_DUMP)"

db-test-core:
	@if [ ! -f "$(CORE_TEST)" ]; then \
		echo "Arquivo $(CORE_TEST) não encontrado. Crie a rotina antes de executar este alvo."; \
		exit 1; \
	fi
	@psql -h "$(DB_HOST)" -U "$(DB_USER)" -d "$(DB_NAME)" -v ON_ERROR_STOP=1 -f "$(CORE_TEST)"

docs-check:
	@missing=0; \
	for file in \
		AGENTS.md \
		docs/ESTADO_ATUAL_DO_PROJETO.md \
		docs/PROXIMOS_PASSOS.md \
		docs/REGISTRO_DE_ALTERACOES.md \
		docs/PADRAO_DE_COMMITS.md \
		docs/DECISOES_ARQUITETURAIS.md \
		docs/MODELO_FISICO_ATUAL.md; do \
		if [ ! -f "$$file" ]; then \
			echo "Ausente: $$file"; \
			missing=1; \
		else \
			echo "OK: $$file"; \
		fi; \
	done; \
	exit $$missing

project-check: docs-check git-status
	@echo ""
	@if command -v pg_isready >/dev/null 2>&1; then \
		pg_isready -h "$(DB_HOST)" -d "$(DB_NAME)" -U "$(DB_USER)" || true; \
	else \
		echo "pg_isready não encontrado; verificação de PostgreSQL ignorada."; \
	fi
	@if command -v psql >/dev/null 2>&1; then \
		psql -h "$(DB_HOST)" -U "$(DB_USER)" -d "$(DB_NAME)" -Atc "SELECT schema_name FROM information_schema.schemata WHERE schema_name = '$(DB_SCHEMA)';" 2>/dev/null | grep -qx "$(DB_SCHEMA)" && echo "OK: schema $(DB_SCHEMA) encontrado" || echo "Aviso: schema $(DB_SCHEMA) não confirmado"; \
	else \
		echo "psql não encontrado; verificação de schema ignorada."; \
	fi
