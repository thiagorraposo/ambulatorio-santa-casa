DB_NAME ?= ambulatorio_santa_casa
DB_USER ?= ambulatorio_user
DB_HOST ?= localhost
DB_PORT ?= 5432
DB_SCHEMA ?= ambulatorio
SCHEMA_DUMP ?= docs/evidencias/schema_atual_ambulatorio.sql
SQL_TESTS := $(sort $(wildcard tests/sql/*.sql))

.DEFAULT_GOAL := help

.PHONY: help git-status db-check db-test docs-check project-check db-schema-dump

help:
	@echo "Comandos disponíveis:"
	@echo "  make help            Exibe esta ajuda"
	@echo "  make git-status      Exibe status Git e últimos commits"
	@echo "  make db-check        Valida conexão, banco, schema e usuário"
	@echo "  make db-test         Executa todos os testes em tests/sql/"
	@echo "  make docs-check      Verifica documentos obrigatórios e não vazios"
	@echo "  make project-check   Executa todos os checks locais não destrutivos"
	@echo "  make db-schema-dump  Atualiza somente o dump estrutural do schema $(DB_SCHEMA)"

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
		docs/WORKFLOW_DE_DESENVOLVIMENTO.md; do \
		if [ ! -s "$$file" ]; then \
			echo "Ausente ou vazio: $$file"; \
			missing=1; \
		else \
			echo "OK: $$file"; \
		fi; \
	done; \
	exit $$missing

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
