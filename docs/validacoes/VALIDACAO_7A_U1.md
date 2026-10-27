# Validação técnica da 7A-U1 — cadastro precedido por busca

Data: 2026-10-26. Resultado: **validação técnica aprovada nos cenários abaixo**;
aceite de produto/equipe não declarado.

## Alteração

O formulário de novo paciente fica oculto até uma busca autorizada terminar e a
pessoa declarar que nenhuma correspondência serve. Editar o texto invalida os
resultados anteriores; uma busca vazia não afirma inexistência global; a tela
oferece acesso às outras páginas. Abrir uma correspondência navega para a ficha
existente sem POST. A capacidade de cadastro e os guards existentes continuam
ativos. Nenhuma API, semântica clínica ou schema foi alterado.

## Evidências executadas

- `cd frontend && npm run build` — passou.
- `cd frontend && npm run test:unit` — 22 arquivos e 205 testes passaram.
- `make backend-build COMPACT=1` — passou, necessário ao runner integrado.
- `SYNTHETIC_PG_HOST=127.0.0.1 SYNTHETIC_PG_PORT=55459 SYNTHETIC_PG_USER=ambulatorio_ci PGPASSWORD=<senha sintética> bash tests/frontend/test_e2e.sh --grep '7A'` — 7 cenários passaram: cadastro/homônimos, abertura sem escrita, busca vazia, busca recusada, cancelamento, política de capacidade, além das regressões 7A/7B/7D selecionadas pelo filtro.
- `git diff --check` e `make docs-check COMPACT=1` — passaram na revisão documental final.

O runner aplicou migrations 02–64 apenas no banco descartável aleatório
`etapa6_frontend_*`, dentro do container `ambulatorio-m2-e2e-postgres-1`, em
`tmpfs`; o servidor foi confirmado via `SELECT current_database(),
current_user, inet_server_port()` como banco `postgres`, role `ambulatorio_ci`,
porta publicada `55459` (servidor `5432`). O runner removeu seu banco/login de
teste e o compose dedicado foi encerrado após os testes. Nenhum banco persistente
foi utilizado.

O cenário de falha de busca usa resposta 403 interceptada no navegador; o teste
de política consulta a capacidade sintética real e confirma que edição sem
permissão não mostra o cadastro. Os E2E não substituem aceite humano da VU1.
