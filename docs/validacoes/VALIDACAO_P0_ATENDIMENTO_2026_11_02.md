# P0 atendimento — execução de 02/11/2026

Estado: **IMPLEMENTADA SEM VALIDAÇÃO COMPLETA** no recorte de feedback.
HUM-M3-03 permanece **ABERTO**; causa humana não confirmada. Base `e968c40`,
branch `feat/m3-janela-1-eventos`, árvore inicialmente limpa. O worktree antigo
`/tmp/ambulatorio-contexto-fix-20261031` foi consultado e preservado, sem copiar
sua árvore ou apresentá-lo como prova integrada.

## Objetivo e resultado

Investigar cadastro novo → confirmação, eliminar rejeições genéricas conhecidas
e dar acesso ao campo/etapa mantendo rascunho, autorização, transação e recibos.
Aceite integral exige navegador/API/PostgreSQL, persistência/releitura em paciente
novo/existente, permissão/revogação, conflito e perda de resposta sem duplicação.

Implementado [contrato de erros](../arquitetura/CONTRATO_ERROS_ATENDIMENTO_M3.md):
validação DTO com caminhos/códigos seguros; ApiClient sem texto arbitrário;
controles do atendimento com associação acessível; resumo com foco e links que
revelam etapa; recusa local de contexto simultâneo, sem escolher valor pelo usuário.
A constraint SQL03, já presente na evidência física, ganha tradução específica.
Isso comprova a lacuna de feedback por inspeção/testes de componente, **não**
reproduz a entrada da avaliação humana. Não houve migration, escrita em banco
persistente, push, merge ou deploy. Dados exclusivamente sintéticos.

## Evidências e comandos

- `make backend-build frontend-build COMPACT=1`: aprovado antes da inclusão dos
  testes novos; log `/tmp/ambulatorio-check-kgmdxndy/output.log`.
- `cd backend && npm run test:unit -- --runTestsByPath test/unit/field-validation.spec.ts test/unit/http-error.filter.spec.ts test/unit/pacientes.service.spec.ts`:
  **3 arquivos / 12 testes aprovados**; `/tmp/m3-p0-backend-unit.log`. Exercita o
  ValidationPipe real sem socket, nested DTO, omissão/null/false, versão,
  whitelist, descarte de valores/SQL e tradução da constraint conhecida.
- `make frontend-unit-test COMPACT=1`: **36 arquivos / 289 testes aprovados**;
  `/tmp/ambulatorio-check-n4lsjtvt/output.log`. Cinco testes novos, incluindo
  rascunho, foco/links/aria, contexto, HTTP aninhado e Consulta.
- Build subsequente encontrou opção `exact` inválida em teste Testing Library;
  corrigida para regex equivalente. `make frontend-build COMPACT=1` aprovado;
  `/tmp/ambulatorio-check-9_abq4a3/output.log`.
- Após restringir o feedback a formulários integrados e ajustar a cor existente:
  `cd frontend && npm run test:unit -- src/features/clinical/attendance-validation.test.tsx src/shared/writing.test.tsx src/shared/operation.test.tsx src/api/client.test.ts src/features/clinical/core-contracts.test.ts`:
  **5 arquivos / 54 testes aprovados**; `/tmp/m3-p0-frontend-focused.log`.
  Não somar aos 289 como testes distintos. Preservados testes de 403/409/rede e
  recuperação por recibo no conjunto focado; são testes de componente, não prova DB.

## Bloqueio real de integração

Cluster PostgreSQL exclusivamente novo em `/tmp/m3-p0-pg`, inicializado com
identidade sintética, não iniciou: `could not create IPv4 socket … Operation not
permitted`; `/tmp/m3-p0-pg.log`. Nenhum banco anterior foi usado/modificado.
O runner `tests/frontend/test_e2e.sh attendance-validation.spec.ts`, com variáveis
sintéticas para esse cluster, falhou **antes de criar banco/login**, em
`listen EPERM 127.0.0.1:6061`; `/tmp/m3-p0-e2e.log` e
`/tmp/etapa6-frontend-ZPU8U4`. O sandbox desta sessão não permite abrir sockets;
a política não permite solicitar execução com privilégio ampliado.

Dois cenários [E2E novos](../../tests/frontend/attendance-validation.spec.ts)
preparados para cadastro pela UI/Administração e paciente existente/Edição:
400 contextual/atomicidade, correção, um POST, releitura, 320px/axe. **Não
executados**. Rodar em ambiente autorizado com sockets e servidor sintético:
`bash tests/frontend/test_e2e.sh attendance-validation.spec.ts`, seguido da
validação proporcional pendente (`frontend-check`, `backend-check` e
`project-check` em destino explicitamente sintético). Não usar defaults de banco
persistente nem repetir suítes já aprovadas no mesmo estado sem motivo.

## DoD e próximos passos

Contrato/backend e UI implementados parcialmente; builds e testes sem rede
aprovados. Integração/persistência, comparação visual real, validações de domínio
residuais e reavaliação humana pendentes. Capacidade M3 e aceite não recalculados.
P1 Edição depende do acesso inicial ao recém-criado sem autovínculo/global.
P1 8D depende das decisões específicas de campos/capacidades, credenciais,
autoações/sessão/auditoria/recuperação, conforme proposta vigente. Perguntas
objetivas apresentadas ao responsável; nenhuma regra foi presumida.
