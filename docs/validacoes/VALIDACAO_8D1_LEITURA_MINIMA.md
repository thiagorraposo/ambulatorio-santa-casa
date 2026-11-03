# 8D1B.1 / 8D1U.1 — listagem mínima administrativa

Recorte técnico **VALIDADO TECNICAMENTE** de listagem; agregados D1B.1/U.1
permanecem **IMPLEMENTADOS SEM VALIDAÇÃO COMPLETA**. Base `ddb4389` mais o diff
registrado no commit desta entrega. [Contrato](../arquitetura/CONTRATO_LEITURA_USUARIOS_8D1B.md).
Não conclui 8D1D/P-08, consulta detalhada/histórico, criação, alteração de perfil,
ativação/inativação, me ampliado ou homologação institucional/humana.

## Implementação e segurança

GET /usuarios e página/menu somente para Administração. Projeção real de
ID textual/nome/perfil, paginação estável por nome/ID, inclusive homônimos,
limites reutilizados e query desconhecida recusada. Não busca hash/login/estado
ou dados clínicos. A lista inclui contas existentes sem afirmar ativação.
O perfil de gestão e a projeção mínima vêm dos mínimos já determinados de 8D1D;
nenhum campo adicional, permissão clínica ou regra de autoação foi presumido.
Backend revalida identidade ativa/perfil em cada requisição pelo H1 existente;
Consulta/Edição não consultam terceiros, inclusive por URL direta.

Frontend usa QueryState/TableScroll/paginação existentes: carga, vazio, falha,
repetição de leitura e URL reais; “você” deriva da identidade atual, perfil usa
badge compartilhado. Sem botões fictícios de criação/alteração/estado. Nenhuma
migration, escrita persistente, regra de credenciais/sessão nova ou autovínculo.

## Provas sintéticas

Cluster exclusivo localhost55483 criado na retomada P0; runners criam/removem
suas bases e logins. Não há conexão a banco persistente ou dados reais.

- `make backend-build frontend-build COMPACT=1`: aprovado;
  `/tmp/ambulatorio-check-0rhuiaue/output.log`. Build após ajuste visual restrito
  à tabela: `/tmp/ambulatorio-check-w81y0rtq/output.log`.
- `SYNTHETIC_PG_HOST=127.0.0.1 SYNTHETIC_PG_PORT=55483 SYNTHETIC_PG_USER=m3_sintetico PGPASSWORD=sintetico bash tests/backend/test_clinical_integration.sh test/clinical/usuarios.http.spec.ts`:
  **9 aprovados** após integrar AppModule, `/tmp/m3-continuo-usuarios-http-integrado.log`.
  Anônimo/inativo401, Consulta/Edição403, projeção exata, homônimos com IDs além
  de2^53, página vazia, queries inválidas e mudança real de perfil/ativação com
  mesmo token. Alterações de fixture ocorrem só pelo owner da base descartável;
  não são implementação HTTP de gestão de contas.
- `make backend-unit-test frontend-unit-test COMPACT=1`: backend **211 aprovados**;
  frontend **25 arquivos aprovados / 11 com falhas de timeout** sob concorrência
  com navegador/HTTP, `/tmp/ambulatorio-check-2suid3g0/output.log`. Apenas os11
  arquivos falhos foram reexecutados em série com `npm run test:unit -- --maxWorkers=1 <arquivos falhos>`:
  **115 aprovados**, `/tmp/m3-continuo-unit-serial.log`. Sem ampliar timeout ou
  mudar produto para essas falhas. Corpus frontend atual298 testes, sem alegar
  execução298/298 numa única rodada.
- E2E `bash tests/frontend/test_e2e.sh usuarios.spec.ts`: Consulta/Edição passaram;
  Administração excedeu tempo no login sob a mesma concorrência, antes de
  exercitar a leitura (`/tmp/m3-continuo-usuarios-e2e.log`). Reexecução só desse
  cenário sem carga de unidades passou1/1 (`/tmp/m3-continuo-usuarios-admin-e2e.log`).
- Após corrigir quebra visual das colunas, `FRONTEND_E2E_API_PORT=6065 FRONTEND_E2E_WEB_PORT=4180` e mesmas variáveis sintéticas,
  `bash tests/frontend/test_e2e.sh usuarios.spec.ts --grep 'Administração consulta'`:
  **1 aprovado**, `/tmp/m3-continuo-usuarios-visual.log`, runner
  `/tmp/etapa6-frontend-j5lMru`. Paginação/recarga/relogin, falha de rede que oculta
  coleção, repetição explícita de GET, vazio e recusa real dos outros perfis.
  Axe/viewport1440/390/320 e rolagem horizontal por teclado aprovados.

A validação de SQL e fundação da retomada P0 é reaproveitada para componentes
inalterados; teste clínico137 após limites do DTO permanece válido no seu escopo.
A nova listagem tem prova HTTP própria e guard real. Regressão restante do
frontend e conclusão documental constam no checkpoint vigente.

## Comparação técnica renderizada — 8V1 parcial

Comparados [referência desktop](../frontend/visuais/figma-usuarios.png) e aplicação
[1440](../frontend/visuais/8d1u-usuarios-1440.png),
[390](../frontend/visuais/8d1u-usuarios-390.png) e
[320](../frontend/visuais/8d1u-usuarios-320.png), capturas exclusivamente sintéticas.

Tabela/cartão branco, navegação azul, nomes e perfil em badge mantêm a linguagem
da referência. Usuários aparece como destino ativo correto; na captura antiga
da referência o item destacado é Dashboard. Aplicação usa o shell responsivo
existente, paginação real e ID textual secundário; referência usa seis contas
locais e contagem global não publicada na API. Login/status/ações da referência
não são exibidos neste recorte sem contrato correspondente.

A primeira captura320 quebrou ID e perfil em letras; tabela passou a preservar
largura mínima dentro da região rolável com foco e setas, sem rolagem horizontal
da página. Perfil pode exigir rolagem da tabela em320; eixo/ordem de colunas se
mantêm. Não há captura mobile de referência neste confronto nem equivalência
pixel a pixel; revisão humana/aceite8V1/8V2 e fluxos de mutação continuam pendentes.


## Retomada de 1abe410 — proposta de consulta individual

Retomada em 02/11/2026, branch `feat/m3-janela-1-eventos`, HEAD inicial
`1abe410b65fdf3cde42015f61ddd9808b965699d`, árvore limpa e sem upstream
configurado. `origin` cadastrado; não houve consulta remota, commit de aplicação,
push ou troca de branch. A próxima ação expressa do checkpoint era delimitar a
proposta de consulta individual e seus gates antes de implementar.

Inspeção dirigida do catálogo D1B.1/U.1, contrato de leitura, proposta 8D1D,
controller/service de usuários e `UsuariosPage.tsx`: há GET de coleção com
projeção explícita ID/nome/perfil e página de listagem; não há rota individual
nesses arquivos. Histórico de operações e campos adicionais continuam pendentes.
Os guards H1 e a validação textual de bigint existentes podem ser reutilizados.

A [proposta de consulta individual](../arquitetura/CONTRATO_LEITURA_USUARIOS_8D1B.md#proposta-de-próximo-incremento--consulta-individual-mínima)
especifica HTTP/capacidades por perfil, projeção mínima, erros, navegação com
retorno paginado, estados e critérios API/PostgreSQL/navegador. Os três campos
e Administração já têm contrato suficiente; implementar esse recorte não exige
aprovar novas políticas institucionais. Histórico, campos ampliados e mutações
conservam gates específicos. Não foi criado ID novo nem declarado USR-24 completo.

Validação desta preparação: `make docs-check COMPACT=1` aprovado (log
`/tmp/ambulatorio-check-v5kwjh4m/output.log`), revisão manual dos links/âncoras
e conteúdo, `git diff --check` aprovado e status revisado. Somente documentação
alterada; nenhuma suíte funcional repetida, ambiente iniciado ou conexão ao
banco. As provas de listagem acima e a regressão b95df82 (306 unidades/110 E2E)
permanecem no seu escopo; não provam o detalhe proposto. Próxima unidade concreta:
implementar B/U mínimo e executar a composição de validações pertinente ao diff.
