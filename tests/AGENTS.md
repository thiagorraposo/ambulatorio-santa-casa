# AGENTS.md

Regras para testes.

- Testes SQL não são migrations.
- Usar somente dados sintéticos.
- Preferir `BEGIN` e `ROLLBACK` para impedir persistência de dados.
- Executar via `psql` com `ON_ERROR_STOP=1`.
- Usar `RAISE NOTICE` para indicar testes aprovados.
- Testar cenários positivos e negativos.
- Não assumir IDs fixos; usar `RETURNING`, consultas ou variáveis.
- Documentar limitações de cobertura.
- Não alterar schema para fazer teste passar.
