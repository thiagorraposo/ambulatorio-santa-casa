# Candidato da demonstração Santa Casa

**CONGELADO para demonstração sintética com ressalvas.**
Execução de 02/11/2026, America/Sao_Paulo. Escopo exclusivo de estabilização;
nenhuma expansão de M3, homologação ou conclusão integral. Última janela
informada: registro histórico **1/6 com retomadas**, sem consolidação suficiente
para afirmar a numeração atual, início ou limite desta sessão.

## Candidato e ambiente

- **SHA único: `c4a3c998f1b25addac65e1c79fb2b6a00f3fac73`**, preservado na
  branch local `demo/santa-casa-2026-11-03`. Branch de trabalho:
  `feat/m3-janela-1-eventos`, inicialmente limpa nesse SHA.
- Runtime de `cc150dd1a7f8a27c7802d4c6cf50e9fe3a2a14a1`, sem mudanças de
  aplicação posteriores até o candidato. Esta entrega acrescenta documentação
  e provas, sem substituir o runtime validado por código novo.
- Node 24.15.0; Chromium headless, pt-BR, America/Sao_Paulo.
  [Versão do navegador e ambiente](../evidencias/demonstracao_2026_11_02/ambiente.json).
- `make dev-sintetico-start`: PostgreSQL16.15 exclusivo, `tmpfs` confirmado,
  sem volume persistente; portas PostgreSQL55458, API6062 e frontend4177.
  Banco aleatório do ensaio: `etapa6_frontend_1559838_1793666375_fbf816`;
  conferir o nome efetivo na [evidência SQL](../evidencias/demonstracao_2026_11_02/postgresql.txt).
  Migrations02–73 aplicadas somente pelo runner no banco descartável.
- Logs do supervisor: `/tmp/ambulatorio-dev-1000-209b0b6ca48a/runner.log`.
  Não houve acesso ao PostgreSQL persistente5433 ou à API3000.

## P0 e percurso comprovado

**HUM-M3-03 permanece ABERTO.** Não foram fornecidos payload, campos, perfil,
HTTP ou ambiente originais. O incidente humano não foi reproduzido; nenhum
sucesso sintético comprova sua causa ou permite encerrá-lo.

Inspecionados `AttendanceFormPage`, `attendanceBody`, `MutationForm`, DTO
`AttendanceCreateDto`, `PacientesService.createAttendance` e os limites físicos
do PostgreSQL. A mensagem estruturada por campo já existe no candidato;
a descrição antiga de ausência desse contrato é histórica. Contexto
mutuamente exclusivo e NUMERIC(5,2) são restrições comprovadas, sem vínculo
demonstrado com a falha humana.

Ensaio exploratório separado da suíte, conduzido por comandos Playwright no
Chromium real, com inspeção das capturas e leitura da API/PostgreSQL. Não é
ensaio humano presencial, nem somente execução do spec `m3-demo`:

1. Login administrativo real, pesquisa sem correspondência e busca prévia.
2. Cadastro pela UI de **Congelamento Final Sintético**, nascimento12/05/1980,
   sexo Feminino; ID textual `9007199254806515`.
3. Primeiro atendimento02/11/2026: conflito Sim/Sim recusado antes do POST,
   `aria-invalid`, erro por campo, rascunho e observações preservados.
4. Correção explícita do contexto, altura170,25cm, peso65,25kg, FC72bpm e
   observação clínica; revisão e confirmação pela UI.
5. Resposta interrompida **após COMMIT real201**: um único POST clínico;
   Verificar resultado do envio recuperou recibo e abriu atendimento22.
6. Histórico e releitura200 confirmaram núcleo e medidas. PostgreSQL confirmou
   proveniência `cadastro_sistema`, operação `confirmada` e autoria3 na auditoria.
7. Segundo atendimento03/11/2026, ID23: formulário vazio de medidas, persistido
   com `dadosClinicos=null`, sem herança da consulta22. Exatamente dois
   atendimentos e dois recibos de atendimento no banco.
8. Vínculo de leitura específico concedido pela API administrativa existente;
   logout/login de Consulta, busca/ficha/histórico/consulta22 com os mesmos
   valores; ação de editar ausente. POST de atendimento com esse token recusado
   pela API com403, sem gravação.
9. Exportação real da página filtrada, confirmação e download lido do disco:
   UTF-8/BOM, cabeçalho `paciente_id,nome` e somente a pessoa pesquisada.

Recarga exigiu autenticação novamente, preservou o destino e releu as medidas;
`localStorage` e `sessionStorage` vazios. A seleção inicial de link Pacientes
encontrou também o breadcrumb; restringir ao Menu principal resolveu a
ambiguidade do roteiro. Não foi falha da aplicação ou de persistência.

[Releitura e payload sintéticos](../evidencias/demonstracao_2026_11_02/releitura.json),
[SQL/recibos/auditoria](../evidencias/demonstracao_2026_11_02/postgresql.txt),
[CSV obtido](../evidencias/demonstracao_2026_11_02/pacientes.csv).
Capturas e trace completos locais em `/tmp/ambulatorio-ensaio-final-c4a3c99`;
trace com sessão não versionado. [Hashes dos artefatos duráveis](../evidencias/demonstracao_2026_11_02/sha256.json).

## Validação e apresentação visual

Builds backend/frontend: `make backend-build frontend-build COMPACT=1`, saída0,
`/tmp/ambulatorio-check-tywz2de2/output.log`. Aviso conhecido de bundle>500kB.
Regressão integrada selecionada: **40/40 E2E aprovados em8,4min**, zero
retries/skip/falhas; saída0 e cleanup do banco/logins do runner confirmado.
Log `/tmp/ambulatorio-check-50q5r7rr/output.log`, artefatos
`/tmp/etapa6-frontend-B9fr4A`; [40 resultados duráveis](../evidencias/demonstracao_2026_11_02/regressao.json).
Com as variáveis sintéticas obtidas somente do container exclusivo55458:

```bash
bash tests/frontend/test_e2e.sh attendance-validation.spec.ts stage7.spec.ts \
  stage7-access-recovery.spec.ts m3-demo.spec.ts usuarios.spec.ts
```

Inclui novo/existente, limites/erros por campo, rollback de filhos, versão409,
revogação403,401 real, respostas tardias, cliques repetidos, perda de resposta
após COMMIT, rascunho, teclado/zoom e três perfis. `m3-demo` também comprovou
sorologias, condição/complicações/comorbidades e parâmetros de exame, com
confirmações independentes e isolamento entre atendimentos. Esses adicionais
foram exercitados na suíte, além do núcleo do ensaio exploratório separado.

Sem alterações de aplicação/SQL/importador: não repetidas as suítes completas
dessas camadas. Checks finais documentais registrados no checkpoint; evidências
e links locais conferidos. `make docs-check repository-check COMPACT=1` aprovado,
log `/tmp/ambulatorio-check-cp3cothr/output.log`.
Ambiente do ensaio encerrado ao finalizar, com
descarte de seu banco e container; os recursos preexistentes foram preservados.

Preservadas as [306 unidades e110 E2E em b95df82](VALIDACAO_REGRESSAO_FRONTEND_M3_2026_11_02.md)
e as [provas posteriores de cc150dd](VALIDACAO_8D1_LEITURA_MINIMA.md#consulta-individual-mínima--retomada-de-6764cb8):
306 frontend **por composição**,211 backend,19 HTTP usuários e8+1 E2E
administrativos. Os hashes são ancestrais do candidato. Não se afirma nova
execução integral dessas suítes; nenhuma alteração de código exigiu repeti-las.

Revisadas capturas reais1440×960,390×844 e320×844. Sem overflow horizontal
da página nos estados observados; a tabela de busca móvel tem rolagem própria.
Axe: zero violações na busca desktop/mobile e detalhe móvel inspecionados.
[Login](../evidencias/demonstracao_2026_11_02/01-login-desktop.png),
[validação móvel](../evidencias/demonstracao_2026_11_02/05-validacao-mobile.png),
[atendimento desktop](../evidencias/demonstracao_2026_11_02/09-atendimento-persistido.png),
[consulta320](../evidencias/demonstracao_2026_11_02/14-consulta-320.png),
[CSV](../evidencias/demonstracao_2026_11_02/15-csv-confirmacao.png) e
[busca móvel](../evidencias/demonstracao_2026_11_02/17-busca-mobile.png).

Comparação limitada com referências efetivas `figma-login.png`,
`figma-pacientes.png`, `figma-atendimento.png` do [caderno visual](../frontend/visuais/README.md)
e fontes Login/Layout/NewAppointment do protótipo: azul, cartões claros,
sidebar e hierarquia permanecem coerentes. Persistem diferenças de títulos,
densidade, colunas e cinco etapas versus12 seções da referência. Recursos sem
backend não foram adicionados. Não há nova melhoria visual implementada neste
ciclo; preservadas as correções existentes. **8V1 integral não comprovado.**

## Inicializar, apresentar e encerrar

Conferir SHA antes de iniciar; usar o checkout candidato ou outro checkout
isolado desse SHA. Não trocar branch com alterações pendentes.

```bash
git rev-parse HEAD
make backend-install frontend-install backend-build
make dev-sintetico-start
make dev-sintetico-status
# Navegador: http://127.0.0.1:4177
# Ao terminar, no mesmo checkout:
make dev-sintetico-stop
```

Contas `frontend-administracao@example.invalid` e
`frontend-consulta@example.invalid`; senha exclusivamente sintética
`Etapa6-sintetica!`. Sessão15min; repetir login se necessário. Start recria a
fixture; stop descarta os registros. Reiniciar após rebuild se backend mudar.
O roteiro acima é reprodutível; IDs novos serão diferentes. Para demonstrar
Consulta na pessoa recém-criada, Administração deve conceder vínculo específico
via `PUT /v1/pacientes/:id/acesso/:usuarioId`, corpo
`{"ativo":true,"podeEditar":false}`, com seu token de sessão; não há tela de
atribuição. Sem essa preparação, usar pessoa já vinculada da fixture e informar
que é outro paciente. Não apresentar uma atribuição administrativa fictícia.

## Contingência e pendências

Contingência anterior comprovada: **`b95df82028232d058eed00f3a46b632542a58068`**,
306 unidades/110 E2E no seu escopo; checkout isolado preservado em
`/tmp/ambulatorio-demo-contingencia-b95df82`, sem reset ou descarte de trabalho.
Se necessário: encerrar a demonstração do checkout atual, entrar no checkout
de contingência, conferir SHA e executar os mesmos comandos de instalação,
build/start/status/stop. Essa cópia foi preparada, mas não novamente ensaiada;
não usar artefatos compilados de outro SHA. A consulta individual8D mais recente
não pertence a essa versão. Não há promessa de rollback dos dados descartados.

Conhecidos: P0 humano aberto; revisão usa datas ISO e alguns valores sim/nao
sem a formatação da ficha; tabelas móveis exigem rolagem local; rascunhos/recibos
só em memória; CSV limitado à página ID/nome. Cadastro/autovínculo por Edição,
gestão8D ampliada, decisões1–31 e demais recortes M3 permanecem obrigatórios
após a apresentação. Sem homologação clínica/institucional, produção ou dados
reais; política real de retenção e recuperação operacional continua pendente.
