# Continuidade da Etapa 5

Execução iniciada em 2026-09-27. Documento de trabalho e evidência de execução;
o escopo permanece em [PROXIMOS_PASSOS.md](../PROXIMOS_PASSOS.md).

## Estado inicial preservado

- Única alteração preexistente: `sql/21_armazenamento_revisao_temporal.sql`, não
  versionada, SHA-256 `0c96ea418b5b0dfaed4de648e6d81eb15d8ed20b5649485578e568a61921578e`.
- Migrations 00–20 e dump do ambiente persistente devem permanecer intactos.
- Banco persistente não será modificado. Validações usam PostgreSQL descartável.

## Plano e critérios

| Subetapa | Estado inicial | Critério de conclusão |
| --- | --- | --- |
| 5A | Respostas clínicas incorporadas e invariantes registradas | Escolhas técnicas justificadas; nenhuma inferência clínica; executor temporal permanece técnico |
| 5B | Importador v1.4.0 com revisão bloqueada | Promoções autorizadas e revisão auditada validadas, preservando idempotência e proveniência |
| 5C | Rastreio familiar implementado; semântica da descoberta de Chagas resolvida | Campo físico da descoberta, integridade e testes SQL |
| 5D | Fundação HTTP e listagem mínima | Fluxos de paciente, atendimento, importação e CSV com autorização por recurso |
| 5E | Pendente | Contratos documentados e testes HTTP/SQL, perfis e transações aprovados |

## Decisões incorporadas

As seis respostas de [`Perguntas pendentes sobre campos e regras clínicas.md`](../Perguntas%20pendentes%20sobre%20campos%20e%20regras%20cl%C3%ADnicas.md)
foram incorporadas em 2026-09-28: idade derivada da data de nascimento; data do
autorelato de Chagas como descoberta pelo paciente, independente da sorologia;
familiares com identificação e resultado, sem data de sorologia; identificação
obrigatória dos exames trazidos e solicitados; e retorno de 30 dias sempre ligado
ao benznidazol, registrando a data do comparecimento.

## Pendências técnicas

Não há decisão humana pendente nesse documento. Ainda faltam o fluxo
de promoção da descoberta em lotes antigos, o executor e a ativação controlada da
revisão temporal, além do aceite integrado dos fluxos HTTP e de importação. A
política de acesso sintética permanece explícita e desabilitada por padrão, sem
liberar dados reais.

## Execução

- Diagnóstico documental e inspeção da fundação concluídos.
- Migrations 00–27 foram instaladas em PostgreSQL descartável em `127.0.0.1:55457`;
  o banco persistente não foi tocado.
- As 16 suítes SQL passaram, além de `manifest-check`, `importer-test`,
  `backend-build` e `backend-unit-test` em modo compacto.
- A captura temporal, proveniência e rastreio familiar têm migrations e testes;
  o importador inicia contexto de auditoria por linha.
- A API possui ficha de paciente, criação/consulta de atendimentos e consulta
  detalhada de dados clínicos, exames, pendências e rastreio familiar, além de
  retornos BZN em `acompanhamento_cuidado`, tratamento BZN, projetos, exames,
  notificação e consulta sanitizada de lotes/linhas de importação com DTOs,
- A exportação CSV agora exige identidade válida e política de acesso habilitada;
  em vínculo explícito, filtra pacientes pelo vínculo ativo do usuário.
- A administração pode conceder ou revogar vínculo por paciente somente pela
  função SQL restrita, com contexto transacional do ator; não há mutação direta
  da tabela de acesso.
  transação, controle de versão e política de acesso configurável.
- A Etapa 5 continua **não concluída**: revisão entre hashes, aplicação
  seletiva/dry-run auditado, promoções restantes e aceite
  integrado ainda faltam. A importação HTTP
  foi implementada com upload temporário e worker/role separados, permanecendo
  desabilitada por padrão e em produção.
- O Makefile passou a respeitar `PGPASSWORD` fornecida pelo ambiente; assim,
  `project-check` completo foi executado com as 16 suítes no banco descartável,
  além de `manifest-check`, `importer-test`, build e testes unitários.
- A última execução do `project-check` passou com 16 suítes SQL; o backend também
  possui testes unitários para configuração, worker de importação, autorização,
  transação e exportação.

## Retomada com respostas autoritativas — 2026-09-28

Estado de trabalho após a interrupção: migration 28, importador v1.5.0 e manifesto
v1.2, diagnóstico HTTP, cálculo de idade com referência, correção da listagem
por vínculo/paginação e autoria transacional das escritas. A concessão de acesso
assume a role de serviço somente durante a chamada à função administrativa.
O retorno BZN exige tratamento do paciente; exames genéricos exigem identificação.

Validações deste incremento:

- `manifest-check`: destinos incluem a migration 28 sem regenerar o dump persistente.
- `importer-test`: 26 unitários e E2E sintético, com data de descoberta distinta da
  sorologia e preservação do bruto; instalação limpa em banco de teste.
- `backend-build` e `backend-unit-test`: aprovados.
- `backend-clinical-test`: sete cenários HTTP reais em banco descartável criado
  com migrations 02–28, incluindo três perfis, acesso por recurso, paginação,
  CSV, diagnóstico, filhos clínicos, rollback diferido, BZN e concorrência de versão.
- Migration 28 aplicada incrementalmente somente no servidor descartável da tarefa;
  17 suítes SQL passaram nesse ambiente. A evidência persistente até 20 foi preservada.
- `project-check COMPACT=1` aprovado contra o banco descartável em 55457 após
  revisão documental; `git diff --check` também aprovado. A suíte clínica foi
  repetida após os ajustes de perfis e consultas sequenciais, com sete casos aprovados.

Pendências obrigatórias mantidas: executor/autorizações/aprovação/dry-run da
ADR-022 com F10–F15 e T03–T18; promoções clínicas restantes e sua reexecução em
lotes antigos; recursos clínicos ainda sem mutação/DTO de saída; paginação das
coleções aninhadas e linhas de lote; integração HTTP de importação e autorização operacional;
revisão dos contratos e matriz de aceite integral. As sete provas HTTP acima
não substituem os casos ainda ausentes. A Etapa 5 permanece em andamento.

## Edição composta e paginação — 2026-09-28

Retomada com Git limpo em `1c43565`; nenhuma alteração preexistente foi
descartada. Adicionados PATCH versionado de atendimento, edição composta do
paciente, paginação de coleções clínicas e consulta de pendências por status.
O contrato preserva snapshots anteriores de endereço e acrescenta telefones
sem remoção implícita, sob a mesma versão e transação do paciente.

- Build aprovado: `/tmp/ambulatorio-check-9fneebgs/output.log`.
- Dez cenários HTTP aprovados: `/tmp/ambulatorio-check-u26l6qwc/output.log`, em
  banco exclusivo descartável instalado com migrations 02–28 e removido pelo
  runner. Inclui acesso com três perfis, paginação, status, restrição SQL,
  preservação de dados e concorrência. Uma falha de inferência SQL dos parâmetros
  de contato foi reproduzida por PREPARE sem gravação e corrigida com casts.
- Unitários exigem sockets locais do Supertest; a tentativa inicial no sandbox
  retornou EPERM. A repetição autorizada passou, sem mudar testes para contornar
  a restrição. Validação final aprovada:
  `/tmp/ambulatorio-check-ef4qd2rk/output.log`.
- `docs-check COMPACT=1` e `git diff --check` aprovados. Git revisado com dez
  arquivos modificados e um DTO novo, sem commit nesta continuação.
- Sem migrations novas, atualização do dump persistente ou mudanças no
  importador. Suítes SQL e do importador aprovadas no incremento anterior não
  foram repetidas sobre o mesmo estado.

Pendências da ADR-022, promoções, recursos clínicos restantes e integração de
importação continuam obrigatórias. Não há nova decisão humana solicitada nem
ativação de revisão temporal neste incremento. Nenhum commit foi executado.

## Gestão temporal restrita — 2026-09-28

Migrations 29–30 aplicadas incrementalmente apenas no banco descartável 55457.
Funções de registro de fonte, concessão e revogação usam o ator do contexto
autenticado. Cadastro da fonte confere uma âncora de paciente e atendimento por
linha importada e congela as linhas/vínculos; essa verificação não substitui
a análise futura de cada alvo clínico aprovado. Não há membros automáticos dos
papéis de gestão/serviço, autorização por perfil ou executor habilitado.

O primeiro teste revelou falta de privilégios no commit diferido sob papel
restrito. A correção foi feita na migration 30, sem editar a 29 já aplicada:
SECURITY DEFINER com owner limitado e mesmas invariantes, sem leitura de senha.

Evidências:

- 18 suítes SQL: `/tmp/ambulatorio-check-frohk0fy/output.log`.
- Casos negativos adicionais do teste 18, com BEGIN/ROLLBACK:
  `/tmp/ambulatorio-check-fxiri4mg/output.log` (ator inativo, linha não terminal,
  bruto congelado e gestor sem leitura de tabela).
- Instalação limpa até 30 e dez cenários HTTP:
  `/tmp/ambulatorio-check-vn3qcto_/output.log`.
- Importador: 26 unitários e E2E sintético aprovados em
  `/tmp/ambulatorio-check-sy8x4g9k/output.log`. O alvo sobrescrevia `PGPASSWORD`;
  Makefile corrigido para respeitar a senha externa também no E2E da fundação.

Pendências obrigatórias: aprovação/publicação canônica, aplicação seletiva,
dry-run sem consumo de sequências e aceite F10–F15/T03–T18; promoções em lotes
antigos; contratos/DTOs dos recursos clínicos restantes e integração HTTP de
importação. Este incremento cobre gestão de autorização, não o aceite completo
de F06, que exige também aprovação/aplicação. Nenhum commit ou push realizado.

## Importação HTTP integrada e BZN — 2026-09-28

O runner clínico instala até 30 em banco exclusivo, cria logins distintos para
aplicação e importador, gera uma fixture mínima sintética em `/tmp` e limpa seus
artefatos. A importação usa worker Python real com ambiente restrito; não recebe
credenciais da aplicação nem segredo JWT. Conteúdo idempotente retorna o lote
efetivo mesmo com outro código solicitado. O booleano multipart é validado e as
linhas de lote são paginadas/sanitizadas para os três perfis. Rotas privadas sem
política de perfis são recusadas; `/auth/me` possui política explícita.

O cadastro BZN grava o estado canônico e reações numa transação, sem inferir
prescrição/data/comparecimento. Duas requisições concorrentes geram um cadastro
e um 409. O retorno usa essa âncora criada pela API. A revisão encontrou mistura
de resultados entre snapshots familiares do mesmo atendimento; foi corrigida
com `rastreiosFamiliares`, preservando cada ID e seus próprios filhos, sem
escolher uma avaliação implicitamente. O singular fica nulo quando há várias.

Evidências finais deste incremento:

- Build: `/tmp/ambulatorio-check-9bfd1yhi/output.log`.
- 28 unitários (incluindo política explícita de perfis):
  `/tmp/ambulatorio-check-iwe61pvh/output.log`. A suíte clínica é intencionalmente
  ignorada no alvo unitário e executada pelo runner próprio.
- 12 cenários clínicos HTTP/SQL com worker real:
  `/tmp/ambulatorio-check-2brnme_l/output.log`.
- Fundação: oito cenários em banco descartável 55457, com credencial de aplicação
  sintética exclusiva: `/tmp/ambulatorio-check-xs03w5_5/output.log`.
- Manifesto/documentação: `/tmp/ambulatorio-check-61vmthss/output.log`;
  documentação final em `/tmp/ambulatorio-check-jubx05x9/output.log`. Revisão do
  diff, sintaxe bash do runner e preservação das migrations antigas/dump
  verificadas. Git contém 20 arquivos modificados e seis novos, sem commit.

Permanecem obrigatórios aprovação/executor/dry-run da ADR-022, promoções legadas,
recursos/DTOs clínicos ainda ausentes e paginação das coleções aninhadas. A
integração HTTP comprovada não habilita revisão nem conclui a Etapa 5. Não houve
commit, push, migration no banco persistente ou regeneração de seu dump.

## Publicação canônica temporal — 2026-09-28

Migrations 31–34 publicam decisão/campos atomicamente, com hash do servidor,
entrada fechada/normalizada, ator do ledger, autorização revalidada e versão
efetiva sob lock. Snapshot e token são observados, não aceitos do cliente. A
publicação não grava fatos clínicos; correção/anulação sem cobertura homologada
é recusada. Nenhum membro foi associado automaticamente aos papéis. Ajustes de
ambiguidade e CHECK foram feitos em migrations novas, preservando as já aplicadas.

Evidências:

- 19 suítes SQL, incluindo falha tardia que reverte cabeçalho/campos, hash
  canônico com IDs numéricos/textuais e ordem equivalente, sucessão e autorização
  expirada/revogada: `/tmp/ambulatorio-check-1twmritj/output.log`.
- Instalação limpa até 34, treze cenários HTTP/SQL, duas sessões publicando a
  mesma versão (um sucesso e uma recusa) e captura A→B→A pela API com dois eventos
  atribuídos, mantendo a base sem cobertura comprovada:
  `/tmp/ambulatorio-check-tzt9b8xt/output.log`. Captura habilitada apenas nesse
  banco descartável; executor permaneceu sem efeitos.
- Importador, 26 unitários e E2E: `/tmp/ambulatorio-check-ow7pqq5_/output.log`.
- Build: `/tmp/ambulatorio-check-clu21gsx/output.log`.
- Hash da migration preexistente 21 permanece
  `0c96ea418b5b0dfaed4de648e6d81eb15d8ed20b5649485578e568a61921578e`.

Limites de cobertura: concorrência de publicação não é concorrência de aplicação
(F11/F12); rollback de metadados não é F10 clínico; base desconhecida não se torna
história completa. Ainda faltam transformação/artefatos recuperáveis e conferência
integral dos campos da aprovação, executor/aplicação seletiva/avanço da fonte,
dry-run sem sequências e integração F10–F15/T03–T18. As promoções antigas e os
recursos/DTOs clínicos restantes continuam obrigatórios. Etapa 5 não concluída.

## Revisão de encerramento da janela — 2026-09-28

O estado do goal na retomada registrava 17.491 segundos utilizados, restando
cerca de oito minutos das cinco horas. O trabalho final concentrou-se em revisão,
reforço de evidência e continuidade; não foi possível concluir o escopo integral.
O limite de tempo não transforma os requisitos faltantes em itens opcionais.

| Subetapa | Estado comprovado | Trabalho obrigatório restante |
| --- | --- | --- |
| 5A | Respostas clínicas incorporadas e escolhas técnicas identificadas como tais | Confrontar o aceite final de cada contrato com os fluxos completos; nenhuma nova resposta clínica está pendente no conjunto fornecido |
| 5B | BZN/idempotência/reprocessamento v1, armazenamento/captura e gestão/publicação parcial temporal | Preparação/aprovação integrais, executor, dry-run, precedência integrada, promoções legadas e aceite F01–F16/T01–T18 |
| 5C | Extensões sintéticas de rastreio familiar e descoberta de Chagas implementadas e testadas | Aceite integrado de seus escritores, promoções e fluxos dependentes; não aplicar no persistente nesta tarefa |
| 5D | Cadastro/edição/consulta parcial de paciente e atendimento, BZN, consultas clínicas, importação/lotes e CSV | Completar paciente/recursos previstos, contrarreferências múltiplas e contratos HTTP/DTOs explícitos restantes |
| 5E | Perfis explícitos, autorização por vínculo, transações, erros sanitizados e paginação de coleções principais | DTOs de saída completos, paginação aninhada, cobertura dos fluxos restantes e aceite global |

Não confundir evidência parcial dos casos temporais com aceite integral:

- F01–F07: suítes 11/18/19 cobrem partes de armazenamento, autorização e
  publicação; aprovação completa e sua aplicação ainda precisam de provas.
- F08/F09: suítes 12/13 e clínica comprovam captura e base sem história presumida
  nos cenários executados; falta integração de todos os destinos/escritores.
- F10–F15: executor clínico ausente. Concorrência de publicação e rollback de
  metadados não comprovam concorrência/rollback de aplicação; recusar revisão
  em dry-run não equivale a simular uma revisão válida sem sequências.
- F16: há instalação limpa até 34, atualização incremental e regressões; manter
  evidências após as próximas migrations e mudanças do executor.
- T01 e recusa de T02: cobertos no importador v1. T03–T18 permanecem sem aceite
  integral do fluxo entre hashes, mesmo quando há garantias parciais isoladas.

A revisão final reforçou o teste 19: contagens de decisões e campos agora são
tomadas antes das recusas e comparadas imediatamente após a falha tardia.
`project-check` com `SQL_TESTS=tests/sql/19_validar_publicacao_decisao_temporal.sql`
e `COMPACT=1` passou em `DB_ENV=local`, host loopback, porta 55457, banco
descartável da tarefa: `/tmp/ambulatorio-check-dz4rehl0/output.log`. A tentativa
inicial sem acesso de rede no sandbox falhou na conexão; a repetição autorizada
passou. As outras 18 suítes não foram repetidas porque não houve mudança de SQL
produtivo posterior ao resultado completo registrado acima. Build, 28 unitários,
oito cenários da fundação, 13 clínicos e 26 unitários/E2E do importador mantêm as
evidências dos incrementos anteriores; não comprovam endpoints ainda ausentes.
Documentação final aprovada em `/tmp/ambulatorio-check-9uh67mol/output.log`;
`git diff --check` também passou. O alvo documental verifica presença e conteúdo
não vazio; a revisão manual das fontes tratou as inconsistências descritas abaixo.

Índice, estado e matriz foram alinhados ao código, sem alterar decisões humanas.
A próxima tarefa não deve recriar armazenamento: deve começar por preparação e
aprovação completas, seguir as dependências do executor e depois fechar API e
aceite global. Contrarreferências múltiplas continuam no escopo da Etapa 5;
upload avançado permanece no backlog posterior.

Alterações preexistentes preservadas, incluindo o hash da migration 21 informado
acima. Git permanece na branch `fix/reconciliar-bzn-importador`, HEAD `1c43565`,
com 23 arquivos rastreados modificados e 11 novos, sem staging, commit ou push
neste encerramento. Banco persistente e evidência de seu schema não foram
alterados. A Etapa 5 permanece incompleta por requisitos técnicos obrigatórios.

Na conferência seguinte, D6/D8 da matriz e as consequências técnicas das decisões
foram alinhadas aos contratos existentes: vínculo/tipo BZN já escolhido e ano
informado com representação técnica definida, cuja implementação continua
pendente. Nenhuma resposta humana foi acrescentada. O limite de cinco horas
continua vigente; extensão da execução foi perguntada explicitamente, sem
presumir aprovação pela ausência de resposta.


## Retomada sem limite e preparação conferida — 2026-09-29

O usuário retirou o limite de cinco horas. O goal está ativo para concluir todo
5A–5E, com os critérios originais; o encerramento anterior da janela é apenas
histórico. Nenhuma subetapa é concluída por prazo ou redução de escopo.

Migrations 35–39 foram aplicadas incrementalmente somente no descartável 55457.
Arquivos imutáveis são recuperáveis pelos bytes/hash, a preparação confere bruto
e manifesto, e a aprovação exige todas as células alteradas/destinos derivados
com transformações fechadas. A prova desde a base exige captura inicial atribuível
à importação, valor transformado e proveniência da mesma linha/registro. Aprovação
de nome/data foi comprovada, sem aplicar a correção; marco legado não se torna
história completa. A prova por futuras revisões aplicadas ainda deve ser ampliada.
Não há membros automáticos, captura global habilitada ou executor clínico.

Evidências recentes:

- SQL 19/20 após validação das transformações: `/tmp/ambulatorio-check-0bsafcu3/output.log`.
- Instalação limpa 02–39 e 16 cenários HTTP/SQL:
  `/tmp/ambulatorio-check-497049me/output.log`. Incluem prova da base, rejeição
  de empréstimo da história de outra linha, A→B→A, publicação e congelamento
  concorrentes, e contexto obrigatório no login do importador sem SET ROLE.
- Importador: 26 unitários e E2E limpo até 39:
  `/tmp/ambulatorio-check-pmkpbg9e/output.log`, com captura de nome/data pelo
  escritor Python real ao final. A simulação legada D11 continua anterior à
  ativação da captura, para não remover proveniência que já é protegida.

A migration preexistente 21 e o dump persistente permanecem preservados. Não
houve commit ou push. Próximas dependências: executor transacional seletivo,
resolução de alvos/visitas, fechamento/avanço da fonte, revalidação sob concorrência,
dry-run sem escrita/consumo de sequências e prova histórica entre revisões. Após
o aceite temporal, completar promoções, recursos/DTOs/paginação e confrontar cada
critério obrigatório de 5A–5E. Esses itens não foram adiados para uma etapa futura.


## Simulação de decisão e executor privado — 2026-09-29

Migrations 40–42 aplicadas incrementalmente apenas no descartável 55457. A 40
avalia decisão existente em READ ONLY, sem ledger, staging, tentativas ou sequências;
a 41 corrige SELECT mínimo da aplicação no owner, após teste restrito falhar.
A 42 aplica apenas alvos existentes por função privada, sem EXECUTE para operadores.
Captura referencia campo/alvo aprovados e recusa efeitos fora do plano. SQL clínico
parametriza valores e usa somente identificadores do catálogo protegido. Correção,
proveniência, eventos, status da linha e avanço da fonte confirmam juntos.

Evidências finais do incremento:

- 20 suítes SQL após 42: `/tmp/ambulatorio-check-acp0v80e/output.log`.
- Instalação limpa até 42, 18 cenários clínicos:
  `/tmp/ambulatorio-check-hgxkaa49/output.log`. READ ONLY compara hashes de todas
  as tabelas e last_value/is_called de todas as sequências; plano A→B→A fica
  obsoleto. Falha depois de mudar a data/evento e antes de concluir o nome reverte
  todos os efeitos. Duas sessões demonstram bloqueio real com pg_blocking_pids,
  um sucesso, retorno histórico no concorrente e retomada sem novos vínculos/eventos.
- Importador, 26 unitários e E2E até 42 com captura Python:
  `/tmp/ambulatorio-check-jvj_bwwc/output.log`.
- Manifesto aprovado sem mudança no gerador: `/tmp/ambulatorio-check-cwszeejj/output.log`.

Não confundir esses casos com o aceite de todos F/T. O executor ainda não cria
visitas/dependentes, fecha revisão/lote ou prova história através de revisões
aplicadas. Dry-run cobre decisão publicada, não proposta/arquivo antes do staging.
Tentativa de falha após rollback em transação separada, concorrência de
revisões/edição/revogação, precedência Python de origem superada e ativação integrada
continuam obrigatórios. Depois deles, completar promoções, DTOs/recursos/paginação
faltantes e confrontar o aceite integral 5A–5E. Não há novo bloqueio humano no
conjunto de respostas fornecido. Goal ativo sem limite; sem commit ou push.

Revisão final deste incremento: `docs-check COMPACT=1` aprovado em
`/tmp/ambulatorio-check-ehzxzvex/output.log`; `git diff --check` e sintaxe bash dos
runners aprovados. Git na branch `fix/reconciliar-bzn-importador`, HEAD `1c43565`,
com 24 arquivos modificados e 20 novos, 0 entradas no staging. Sem commit/push.
Migration preexistente 21 mantém SHA-256
`0c96ea418b5b0dfaed4de648e6d81eb15d8ed20b5649485578e568a61921578e`; nenhum diff
em migrations 00–21 ou no dump persistente. Próximo incremento dependente: criação
resolvida de alvos e fechamento, com prova desde a base através das revisões
aplicadas; manter o executor privado até o aceite integrado.


## Organização do histórico a pedido do usuário — 2026-09-29

A solicitação de commits interrompeu a implementação para organizar os 44 arquivos
pendentes, preservando seus conteúdos e a ordem das migrations 29–42. Foram
separados 18 grupos: funcionalidades e correções incrementais do banco, correção
do workflow, política explícita de acesso, ampliação clínica, isolamento/idempotência
da importação, testes SQL, integração sintética e documentação. Nenhum push foi
solicitado ou executado. As contagens e o HEAD da seção anterior retratam o estado
antes dessa organização; não são o status final após os commits.

Evidências conferidas sem repetir suítes sobre o mesmo estado: 20 SQL,
18 cenários clínicos HTTP/SQL, 26 unitários/E2E do importador, 28 unitários do
backend e manifesto, nos logs indicados acima. Verificações desta organização:
`git diff --check`, sintaxe bash dos runners e `make docs-check COMPACT=1`.
Migration 21 mantém seu SHA-256; banco persistente e dump continuam preservados.
A Etapa 5 ainda exige as implementações e o aceite integral já listados. Organizar
commits não habilita o executor privado nem conclui qualquer requisito ausente.

## Encerramento e cadeia histórica; organização em commits — 2026-09-29

Após a organização anterior, quatro arquivos ficaram pendentes: migrations 43–44,
SQL 20 e o novo cenário clínico. A revisão atual preservou esses arquivos e
separou as chamadas de cancelamento da leitura de evidência no SQL 20: funções
VOLATILE e a subconsulta na mesma expressão usavam snapshots diferentes. A
conferência mantém estado, autoria, autorização, instante, idempotência,
imutabilidade e ausência de avanço da fonte.

A 43 fecha somente revisões com linhas contabilizadas e cancela propostas sem
efeitos; a 44 encadeia provas de aplicações anteriores encerradas, preservando a
exigência de evidência desde a base. Ambas foram aplicadas incrementalmente no
banco descartável e instaladas em banco limpo pelo runner clínico. Dezenove
cenários passaram em `/tmp/ambulatorio-check-uol6ogb7/output.log`, incluindo duas
revisões sucessivas da mesma ocorrência e retomada do sucesso antigo sem
restaurar valores ou criar efeitos. SQL 20 isolado passou em
`/tmp/ambulatorio-check-25wpdsmh/output.log` após a correção do teste.

Validações finais: `make project-check COMPACT=1`, com as 20 suítes SQL no banco
descartável, aprovado em `/tmp/ambulatorio-check-t8_ripic/output.log`;
`make manifest-check importer-test COMPACT=1`, com 26 unitários e E2E em nova
instalação limpa até 44, aprovado em `/tmp/ambulatorio-check-sf2tj342/output.log`.
O código de aplicação/backend não mudou neste incremento; build, unitários e
fundação mantêm as evidências anteriores. Os 19 cenários clínicos, incluindo o
novo caso encadeado, foram conferidos sem repetir a suíte aprovada no mesmo estado.

O agrupamento solicitado segue as dependências: funcionalidade de encerramento,
continuidade histórica, testes e documentação. Não houve edição de migration
aplicada, descarte de alteração, push, acesso ao banco persistente ou atualização
de seu dump. Os testes novos não cobrem ainda fechamento com linhas bloqueadas
ou incompletas, criação de visitas/dependentes, concorrência entre revisões e
revogação durante execução. Esses casos e os demais requisitos do roadmap
continuam obrigatórios; nenhum aceite integral da Etapa 5 foi anunciado.
