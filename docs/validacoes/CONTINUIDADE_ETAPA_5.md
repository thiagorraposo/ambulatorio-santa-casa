# Continuidade da Etapa 5

Execução iniciada em 2026-09-27. Documento de trabalho e evidência de execução;
o escopo permanece em [PROXIMOS_PASSOS.md](../PROXIMOS_PASSOS.md).

## Organização autorizada do aceite final — 2026-10-03

O responsável solicitou organizar todas as alterações pendentes em commits, sem
descartar trabalho, usar comandos destrutivos ou fazer push. Status, diff, índice
inicialmente vazio e histórico foram revisados na `main`, a partir de `062de16`.
Um inventário de hashes dos 36 arquivos permite conferir preservação integral;
somente a guarda de teste e os registros desta organização receberam ajustes.

Os grupos seguem a dependência: captura/promoção D2 (61), simulador (62),
integridade SQL, regressões do importador, ativação sintética (63), testes HTTP,
CI e documentação. Regressões imediatas acompanham a funcionalidade; provas mais
amplas permanecem em commits `test`. Não houve push nem alteração no banco persistente.

A guarda D2 agora valida a porta configurada em vez de exigir 55457, permitindo
o CI efêmero em 5433. O sufixo `_importador_test` continua obrigatório. A prova
isolada aceitou ambas as portas e recusou porta inválida/banco nominal sem
conectar ao banco. Por essa alteração, `importer-test COMPACT=1` foi repetido
no descartável em 55457 e passou 34 unitários + E2E, incluindo concorrência D2;
log local `/tmp/ambulatorio-check-1zb87v3q/output.log`. Suítes SQL/backend aprovadas
abaixo foram reaproveitadas porque seu estado permaneceu inalterado.

Migrations antigas, SQL21 preexistente e dump aplicado foram conferidos sem diff.
A revisão final usa `docs-check COMPACT=1`, `git diff --check` e conferência dos
arquivos de cada commit, seguida de status/log. O próximo desenvolvimento
previsto continua sendo a Etapa 6, fora desta organização.

## Fechamento integrado — 2026-10-03

**Etapa 5 (5A–5E) concluída no ambiente sintético.** Esta seção e a
[matriz de aceite](ACEITE_INTEGRADO_ETAPA_5.md) descrevem o estado presente.
As seções datadas abaixo preservam resultados e pendências daqueles incrementos;
não substituem o estado atual. Não há decisão humana pendente no escopo autorizado.
As respostas clínicas permanecem autoritativas; a governança de gestão usa o
entitlement nominal por delegação já registrada, separado da autorização por fonte.

### Implementação e decisões técnicas

- SQL61 habilita captura prospectiva D2 e prova booleana restrita para promoção.
  O importador bloqueia o diagnóstico antes de conferir contexto, proveniência
  e evento inicial importado da linha-base, sem evento posterior. NULL legado,
  divergência e A→B→A são preservados; igualdade só associa. Não há backfill nem
  acesso bruto do importador à auditoria. SQL34 e os E2E distinguem legado,
  manutenção e edição concorrente real, sem manipular o ledger ou desabilitar triggers.
- SQL62 alinha simulação pré-staging à criação com observação ausente em ambos
  os manifestos: plano explícito, catálogo ativo e uma transformação fechada.
  Correção sem coluna, omissão do campo e transformação ausente continuam recusadas.
  SQL22 e o HTTP XLSX real percorrem simulação, recebimento, publicação, aplicação
  e replay com exatamente uma visita, sem copiar BZN/dependentes anteriores.
- SQL63 foi implementada depois do aceite integrado até 62. Concede só os três
  wrappers de aplicação, encerramento e diagnóstico à role dedicada de revisão;
  internals permanecem privados. SQL21/35 provam ACLs, identidade e reversão por
  REVOKE, sem apagar evidências. O runner usa essas permissões sem GRANT adicional.
  A execução exige opt-in sintético com staging/Git em development/test; padrão
  desligado e produção recusada. Não há ativação no banco persistente.
- SQL11 amplia negativos de base/fonte/hash/layout, ciclo de lotes, planos
  conflitantes, eventos forjados e reversão de concessão. SQL33 confirma B e
  fecha a fonte em transações reais, recusando reprocessamento A e revisão B→A.
  SQL28/29/33 deixam apenas baselines sintéticos confirmados no descartável;
  os demais testes preferem BEGIN/ROLLBACK e constraints imediatas.
- HTTP de staging cobre correção data/texto + fato anual com falha depois da
  gravação do atendimento e rollback completo, revisão anual isolada com precisão
  anual, e criação com coluna ausente. Escritores Python reais provam precedência
  no reprocessamento/promoção e concorrência D2 sob lock observado no PostgreSQL.
- A auditoria paralela de 5D/5E conferiu rotas, DTOs, services e provas HTTP de
  paciente completo, recursos, filtros, CSV, importação/lotes/erros, versionamento,
  perfis, autorização por vínculo e transações; não encontrou requisito obrigatório
  restante. A matriz normativa F01–F16/T01–T18 foi preservada e mapeada às provas.

### Validações aprovadas

Todos os resultados aprovados usam somente o servidor descartável em 55457.
Os logs abaixo são locais e temporários, não artefatos versionados nem evidência
estrutural do ambiente persistente.

| Verificação | Resultado | Log local |
| --- | --- | --- |
| Instalação limpa 02–61 e incremento 60→61, SQL31/34 | Aprovados | `/tmp/ambulatorio-check-2_fl7o9k/output.log` |
| Incremento 61→62 e SQL22/23 | Aprovados | `/tmp/ambulatorio-check-_fv9o02p/output.log` |
| Aceite integrado anterior à 63: importador + clínica até 62 | 34 unitários/E2E e 38 clínicos aprovados | `/tmp/ambulatorio-check-d95toauq/output.log`; `/tmp/ambulatorio-check-emif8w_u/output.log` |
| Instalação limpa 02–63 e incremento 62→63, SQL21/35 | Aprovados | `/tmp/ambulatorio-check-lyqo_k8q/output.log` |
| `manifest-check project-check COMPACT=1` final | Manifesto, 34 testes SQL (01–31, 33–35), documentação/diff aprovados | `/tmp/ambulatorio-check-y1fxyaqv/output.log` |
| `importer-test COMPACT=1` final | 34 unitários + E2E aprovado, incluindo precedência/concorrência D2 | `/tmp/ambulatorio-check-hsao0uvy/output.log` |
| Build + unitários/contratos do backend | Build e 53 testes aprovados; fundação desse comando falhou antes do SQL e foi repetida separadamente | `/tmp/ambulatorio-check-u4vil19h/output.log` |
| Fundação + runner clínico final | Oito testes de fundação e sete suítes/38 clínicos aprovados, incluindo staging development | `/tmp/ambulatorio-check-ted3bt14/output.log` |
| Revisão documental de fechamento | `docs-check COMPACT=1` e `git diff --check` aprovados | `/tmp/ambulatorio-check-0s1nylh0/output.log` |

O build/unitários e a fundação/runner final compõem os alvos de `backend-check`
mais `backend-clinical-test`; os 38 casos clínicos são executados separadamente
no runner, não contabilizados pelos skips da suíte unitária. Verificações foram
selecionadas pela matriz do workflow e não repetidas depois de mudanças apenas
documentais. O CI passou a incluir o runner clínico em banco próprio; não houve
execução remota do CI nesta entrega.

### Falhas intermediárias e limitações

A chamada inicial do importador apontou banco-base inexistente, e uma tentativa
E2E encontrou manifesto já registrado por outro cenário. A fixture passou a
reutilizar o artefato imutável pelo hash e os cenários têm namespaces distintos.
A prova booleana de D2 foi corrigida para exigir `t`, e a concorrência passou a
bloquear o diagnóstico antes de verificar captura. O cenário de nova visita
exibiu divergência entre simulador e executor na ausência de coluna; SQL62 corrige
a causa mantendo as recusas. Essas rodadas intermediárias não contam como aceite.

O primeiro comando agregado de backend informou apenas `SYNTHETIC_PG_*`,
insuficiente para o alvo de fundação, que usa `DB_*`. O Make verificou o serviço
padrão e a conexão em 5433 foi recusada na autenticação, antes de qualquer SQL.
Nenhuma alteração ocorreu no banco persistente. A repetição informou DB_ENV/local,
DB_* e APP_DB_* explicitamente em 55457 e usou login exclusivo da tarefa. Todos
os resultados aprovados e migrations desta entrega pertencem aos descartáveis.

Migrations antigas 00–44, SQL21 preexistente e dump persistente foram preservados.
Hash da SQL21: `0c96ea418b5b0dfaed4de648e6d81eb15d8ed20b5649485578e568a61921578e`.
Não houve dado real, frontend, Etapas 6–10, commit ou push nesta continuação.
NULL sem cobertura, ocorrência sem identidade e valores ambíguos permanecem
preservados ou recusados por contrato, sem transformar isso em decisão ausente.
Implantação, segredos/TLS/backup/retenção e homologação institucional são posteriores.

### Continuidade

5A–5E e o aceite integrado estão concluídos; não resta trabalho obrigatório desta
etapa. Ao fechar o aceite, as alterações permaneciam no worktree da main; a
organização autorizada posterior está registrada acima. O próximo desenvolvimento previsto
é a Etapa 6, fora desta execução. A sincronização anterior do remoto foi resolvida
no commit `062de16`, sem push feito pelo agente.

## Organização autorizada de commits e validação até 60 — 2026-10-03

O responsável solicitou organizar todas as alterações por contexto/tipo e
integrá-las à `main` local, sem push. Os agentes de implementação foram
interrompidos antes da revisão. A migration 60 já estava salva; seu teste
correspondente foi concluído para tornar o incremento revisável.

SQL59 consulta o recebimento histórico autorizado antes da simulação: o reenvio
após encerramento/avanço retorna os mesmos IDs sem gravações; revogação retorna
403. SQL60 habilita data e observação do atendimento, além do ano D8. SQL31
comprova captura, ator/origem, A→B→A, rollback composto e proteção de exclusão.
O teste clínico aplica correção de data/texto no mesmo atendimento, com antes,
depois, histórico e proveniência, além de repetir o sucesso sem duplicar efeitos.

Validações desta organização, somente em descartáveis em 55457:

- Instalação limpa 02–60 em `etapa5_commit_20261003_779986`:
  `/tmp/etapa5-commit-clean-Tztb.log`.
- Atualização incremental 59→60 e SQL31 no banco descartável anterior
  `etapa5_validation58_20261003_726309`: aprovadas. A atualização 58→59 já havia
  sido validada no incremento do reenvio.
- SQL01 aprovado em `/tmp/ambulatorio-check-td82lac3/output.log`; SQL02–21 em
  `/tmp/ambulatorio-check-1pyylnex/output.log`; SQL22–31, `manifest-check`,
  documentação e diff aprovados por `project-check manifest-check COMPACT=1`
  em `/tmp/ambulatorio-check-jfdkvxp2/output.log`. Testes já aprovados foram
  reaproveitados, pois as correções posteriores afetaram somente fixtures
  SQL02/22 e E2E.
- `backend-build backend-unit-test COMPACT=1`: build e 53 testes aprovados;
  `/tmp/ambulatorio-check-zchon8ek/output.log`.
- `backend-foundation-e2e COMPACT=1`: oito testes aprovados;
  `/tmp/ambulatorio-check-l74dbu6u/output.log`.
- `backend-clinical-test COMPACT=1`: sete suítes/36 testes aprovados até 60;
  `/tmp/ambulatorio-check-n90orhet/output.log`.
- `importer-test COMPACT=1`: 32 unitários e E2E aprovados;
  `/tmp/ambulatorio-check-gm6vgmsv/output.log`.

As rodadas intermediárias falharam em fixtures afetadas pela nova captura:
SQL02 esperava um código de recusa de exclusão específico, SQL22 omitia a
observação obrigatória no plano, e o E2E modificava proveniência legada já
protegida ou contava eventos por tabela. Os testes foram corrigidos sem relaxar
constraints: o E2E representa o estado legado até 59, aplica 60 antes da carga
ativa e verifica eventos por campo. Essas falhas não contam como aceite.

Migrations 00–44, a migration 21 preexistente e o dump persistente permanecem
inalterados. Nenhum banco persistente foi usado. Testes28/29 deixam baselines
sintéticos confirmados somente nos descartáveis, conforme seus cabeçalhos.

Pendências da Etapa 5: promoção histórica D2, prova completa de precedência de
todos os escritores habilitados, linha mista com correção/fato consolidado e
aceite integral F01–F16/T01–T18 antes da ativação operacional. Não há conclusão
da etapa nem nova decisão clínica atribuída à equipe nesta organização.

## Staging e execução temporal em ambiente sintético — 2026-10-03

SQL56 recebe o XLSX inteiro, registra hash dos bytes e bruto e grava recebimento,
lote/linhas e preparação de forma idempotente e atômica, sem escrita clínica.
Manifesto e transformações devem estar registrados por mantenedor antes do
recebimento. SQL57 fornece wrappers separados de aplicação, finalização e
diagnóstico pós-rollback, sem `EXECUTE` operacional. A configuração expõe a
execução HTTP somente com `NODE_ENV=test` e staging; o runner concede os wrappers
somente em banco descartável.

SQL27 e SQL28 passaram. SQL28 cobriu
D8 ativo com A–B–A, legado sem cobertura conhecida e valores iguais/NULL sem
captura comprovada. Apenas `evento_clinico.ano_evento` está no catálogo ativo.
O teste HTTP específico de staging passou 2/2 após correção, incluindo os três
perfis, revogação com 403, recebimentos e aplicação concorrentes, rollback tardio
com diagnóstico posterior, fechamento com pendências e repetição do
histórico após edição manual. A validação ampla final passou com sete suítes/36
testes até migration 58 (`/tmp/ambulatorio-check-df9wh4rr/output.log`). Uma rodada
anterior compilou antes da tradução de autorização revogada para 403 e falhou;
essa rodada não foi contabilizada como aprovada.

SQL29 comprovou associação equivalente aplicada no destino D8, sem alteração do
valor ou da cadeia de auditoria, e repetição após edição manual preservando o
valor editado. SQL28 e SQL29 deixam baselines sintéticos confirmados no banco
descartável para separar contextos de importador e aplicação; as alterações de
verificação usam `ROLLBACK`. O executor interno foi chamado explicitamente como
integração privilegiada, sem concessão operacional de `EXECUTE`.

SQL58 e SQL30 restringem consultas ordinárias de lotes por identidade, perfil e
proveniência integral dos pacientes com vínculo ativo. Lotes revisados são
excluídos para todos os perfis, inclusive em `todos_sinteticos`. Cabeçalho e linhas
do detalhe usam uma única consulta com projeção fechada. Contratos HTTP `/v1`
preservam aliases sem prefixo; versões não publicadas retornam 404.

Validação consolidada em instalação limpa 02–58, somente em descartáveis:

- `project-check` com SQL01–30 e `manifest-check`:
  `/tmp/ambulatorio-check-ydmlz6eb/output.log`.
- `importer-test`: 32 unitários e E2E, incluindo promoções, BZN, idempotência,
  reprocessamento, D8 e F13 com escritor Python real:
  `/tmp/ambulatorio-check-j980bgg4/output.log`.
- `backend-check`: build, 53 casos unitários/de contrato e oito casos da fundação:
  `/tmp/ambulatorio-check-osynlr5h/output.log`.
- `backend-clinical-test`: sete suítes/36 casos, incluindo três perfis, acesso a
  lotes, versionamento, worker real e revisão anual:
  `/tmp/ambulatorio-check-df9wh4rr/output.log`.

Atualização incremental 55→56→57→58 também passou no banco descartável da tarefa.
Nos alvos que normalmente dependem de `docker-wait`, essa dependência foi
considerada disponível (`make -o docker-wait`) porque o servidor descartável já
estava ativo. Nenhum container persistente foi iniciado para essas validações.
O E2E do importador agora prepara schema/search_path do próprio banco temporário
e não executa migrations 00/01, que configuram o banco nominal.

Limites vigentes: essa prova cobre somente cenários exercitados e não fecha o
aceite F01–F16/T01–T18, os destinos clínicos restantes ou 5B–5E. O papel de
serviço recebe negação deliberada de `EXECUTE` nas migrations; os testes de
aplicação invocam wrappers via runner isolado, sem demonstrar uma concessão
operacional. O banco persistente e `docs/evidencias/schema_atual_ambulatorio.sql`
permanecem inalterados.

O próximo incremento deve habilitar deliberadamente os destinos necessários para
correção de data/texto do mesmo atendimento e criação de visita (T05/T06), com
captura/proteção em todos os seus escritores. O catálogo não precisa copiar todas
as colunas do schema: destino sem contrato/cobertura deve ser recusado. Essa
restrição não dispensa nenhum cenário obrigatório F/T. Também falta testar o
reenvio de recebimento depois do avanço/encerramento da fonte: SQL56 possui
retorno histórico, mas a API simula a base antes de consultá-lo e pode recusá-la
como obsoleta. Resolver e provar esse caso antes do aceite de idempotência integral.

Git após a consolidação: branch `fix/reconciliar-bzn-importador`, HEAD `f5e98b9`,
36 entradas rastreadas modificadas e 47 entradas não rastreadas, sem staging,
commit ou push nesta continuação. Mudanças preexistentes foram preservadas;
migration 21 mantém o SHA-256 registrado abaixo. Não há diff em migrations
00–44 nem no dump persistente. Os bancos novos de validação pertencem ao servidor
descartável em 55457; o nome da instalação 02–58 desta rodada está em
`/tmp/etapa5-validation58-db.txt`. Dados sintéticos confirmados por SQL28/29 nesse
banco são resíduos previstos de teste, não evidência do ambiente persistente.

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

## Criação resolvida e falha atribuível — 2026-09-29

Retomada após `f5e98b9`, com Git inicialmente limpo. Migrations 45–49 acrescentam
resolução privada de IDs, criação de visitas/dependentes, prova de gênese,
reutilização por versões sucessoras, diagnóstico em transação após rollback e
recusa de alteração da identidade depois de sucesso. Nenhuma migration 00–44
foi modificada. A regra técnica de nulo inicial consta no contrato temporal;
não representa nova decisão humana.

Evidências já obtidas:

- Instalação limpa até 49 e 20 cenários clínicos:
  `/tmp/ambulatorio-check-oqw3g4xr/output.log`.
- Dois executores da criação coordenados por `pg_blocking_pids`: um sucesso e
  um retorno histórico, sem outro atendimento. Versão sucessora reutiliza os
  mesmos IDs e vínculos, sem novo evento clínico.
- Dois comparecimentos distintos na mesma data permanecem separados; dependente
  recebe o atendimento resolvido. Falha posterior ao INSERT do atendimento
  reverte atendimento, eventos, vínculos e sucesso.
- Registro de falha é recusado enquanto a transação está abortada; após rollback,
  nova transação grava somente código técnico, com autoria ligada ao ledger.
  Mensagem livre e EXECUTE por operadores são recusados.
- Simulação de alvos novos em READ ONLY preserva o hash de todas as tabelas e
  `last_value/is_called` de todas as sequências.
- Fechamento incompleto é recusado; linhas bloqueadas permitem fechamento com
  pendências após os sucessos válidos. Aprovação após estado terminal é recusada.
- Atualização incremental de 44 a 49 concluída via `make db-migrate-one` somente
  no banco descartável da tarefa em 127.0.0.1:55457.

Falhas corrigidas durante a validação: tipagem de parâmetro na fixture, conflito
no vínculo único ao reaplicar versão sucessora (46) e alias ambíguo na prova de
predecessor (47). Os logs anteriores ficam como evidência de diagnóstico, não de
aceite.

Validação final: `make manifest-check importer-test project-check COMPACT=1`,
direcionado ao servidor descartável 55457, aprovado em
`/tmp/ambulatorio-check-f9052q3q/output.log`. Inclui manifesto, 26 unitários e E2E
do importador em instalação limpa até 49, documentação, 20 suítes SQL e diff.
A suíte clínica já aprovada no mesmo estado não foi repetida. A migration 26
mantém incremento de versão clínica por trigger em paciente/atendimento, inclusive
para o escritor de revisão; a concorrência com edição ainda deve ser comprovada
no cenário integrado, sem presumir que testes isolados bastem.

Revisão do Git: HEAD `f5e98b9`, sete arquivos modificados e cinco migrations novas,
sem staging/commit/push. Migration 21 preserva SHA-256
`0c96ea418b5b0dfaed4de648e6d81eb15d8ed20b5649485578e568a61921578e`;
nenhum diff nas migrations 00–44 nem no dump persistente.

Próximo trabalho obrigatório: concorrência de revisões/edição/revogação;
precedência do escritor Python após correção; planos completos e transformações
dos demais destinos; dry-run de proposta/arquivo sem staging; integração e
ativação após aceite F01–F16/T01–T18. Depois, promoções legadas e recursos/DTOs/
paginação restantes de 5D/5E. Nenhuma decisão humana nova está pendente no conjunto
fornecido. Goal ativo, sem limite; funções executoras privadas. Sem commit/push.

## Continuidade até migrations 50–51 — 2026-10-01

Este registro atualiza o aceite após a seção histórica até 49; suas pendências
daquela data não descrevem o estado vigente. Migrations 50–51 adicionam simulação
privada de proposta antes do staging e guarda de identidade de ocorrência para
criação de exame/pendência na publicação e na aplicação. SQL 21–22 passou em
instalação limpa até 51; SQL 22 prova simulação em transação somente de leitura,
sem mudanças de tabelas/sequências, e a recusa T18. A suíte clínica conjunta
passou com 28 cenários em `/tmp/ambulatorio-check-vnbfn32a/output.log`, incluindo
novos endpoints/DTOs, duas sessões de F12, simulação F15 e versões sucessoras.

O importador v1.6.0 e manifesto v1.3 foram exercitados com escritor Python real
para F13: reprocessar a origem antiga após correção não restaurou o valor
superado no cenário. O aceite D8 passou em `/tmp/ambulatorio-check-96n7369y/output.log`:
31 unitários e E2E em banco descartável, com ano 2023 estruturado sem visita,
texto ambíguo bruto, reprocessamento sem duplicação, correção privada para 2022
e origem superada recusada. A migration 52 ativa captura anual para fatos novos;
SQL 24 passou com A→B→A. Instalação limpa até 52 e atualização incremental
49→50→51→52 passaram em bancos descartáveis; legado anterior à captura não
adquire cobertura histórica retroativa. Os contratos HTTP ampliaram projetos, notificação, encaminhamentos com
duas contrarreferências, ocorrências e retornos anuais, pendências, DTOs de saída
e paginação aninhada. Os 28 cenários aprovados cobrem esses fluxos sintéticos,
sem concluir 5D/5E.

| Caso | Evidência atual e limite para aceite integral |
| --- | --- |
| F01–F04 | Armazenamento, envelopes, linhagem e publicação possuem testes SQL; falta confrontar todos os caminhos de proposta/arquivo e aplicação com as invariantes da matriz. |
| F05 | SQL 21 exercita a fronteira de privilégios; manter regressão para todas as novas funções/roles antes da ativação. |
| F06–F07 | Autorização, imutabilidade e predecessor são testados em parte; ampliar negações e origens para todos os destinos aprováveis. |
| F08–F09 | Captura desde a base, A→B→A e legado desconhecido possuem provas; faltam todos os escritores e destinos clínicos habilitados. |
| F10–F11 | Rollback tardio, diagnóstico técnico posterior, dois executores, retomada e sucessão têm cenários executáveis; ampliar a todos os planos e dependentes. |
| F12 | Duas revisões, edição posterior e revogação concorrente têm cenário em duas sessões; falta matriz completa de interleavings e destinos antes da ativação. |
| F13 | Escritor Python real demonstrou não restaurar a correção anual D8 ao reprocessar origem antiga; ampliar às promoções e destinos restantes, e à linha removida/vazia. |
| F14 | Criação de visita/dependente reutiliza IDs e vínculos no cenário; faltam destinos repetíveis adicionais e matriz de proveniência completa. |
| F15 | Simulação de decisão e proposta pré-staging sem persistência/sequências foi provada; falta integração do arquivo operacional e revisão de sanitização de todos os erros/logs. |
| F16 | Instalação limpa até 52, atualização incremental 49→52, SQL 21–22/24, importador D8 e suíte clínica aprovados em seus cenários; manter manifesto/backend, SQL 23 e reversão preservadora na validação final. |

| Caso | Evidência atual e limite para aceite integral |
| --- | --- |
| T01–T02 | Idempotência do mesmo hash e recusa de revisão pelo importador permanecem; integração de revisão entre hashes ainda desabilitada. |
| T03–T04 | Linhagem e simulação possuem controles de identidade; falta fluxo operacional de arquivo reordenado, posição reutilizada e candidatos ambíguos. |
| T05 | Correção de data/nome na mesma ocorrência foi aplicada em cenário; ampliar aos campos autorizados e conferir auditoria de antes/depois por destino. |
| T06–T07 | Novas visitas distintas, inclusive mesma data, foram criadas sem fundir ocorrência no cenário; ampliar dependentes e entradas reais do importador. |
| T08–T09 | D8 estruturou ano inequívoco e corrigiu 2023→2022 sem criar visita no cenário; faltam os demais estados e combinações de revisão. |
| T10–T12 | Preservação de ausente/vazio, conflito de edição e identidade de paciente têm guardas parciais; faltam combinações de remoção de linha, troca de aba e proveniência órfã. |
| T13–T14 | Rollback tardio, efeito único e reprocessamento antigo possuem cenários; ampliar à linha mista e a todos os destinos. |
| T15 | Concorrência F12 tem cenário aprovado; falta cobertura completa das ordens de bloqueio após dry-run e aprovação em todos os fluxos. |
| T16 | Ano isolado e retorno BZN têm guardas; validar todas as combinações com D9 e sem comparecimento informado. |
| T17 | READ ONLY, rollback e diagnóstico sanitizado são testados; falta transporte operacional e revisão de logs do fluxo completo. |
| T18 | SQL 22 prova recusa de exame/pendência copiado sem identidade alterada, inclusive na publicação; ampliar a outros destinos repetíveis antes do aceite global. |

Próximos passos: terminar os planos/transformações e a identidade dos demais
destinos, capturar e provar precedência em todos os escritores e ampliar F13 às
promoções legadas. Integrar a entrada operacional
da simulação e repetir a matriz F01–F16/T01–T18 sobre o fluxo completo antes de
habilitar revisão entre hashes. Permanecem também a uniformização de DTOs dos
recursos preexistentes e o aceite global de 5A–5E. Nenhuma migration antiga,
banco persistente ou dump foi alterado; os dados de teste são sintéticos. Sem
commit ou push. A Etapa 5 continua incompleta.

## Continuidade até migrations 53–54 — 2026-10-03

O importador v1.7.0 e o manifesto v1.4 passaram novamente por
`make manifest-check importer-test COMPACT=1` contra o servidor descartável
55457. O teste cobre promoções, proveniência, BZN, idempotência, reprocessamento
encadeado e os cenários sintéticos de D3/D8/F13 já implementados. A migration 53
classifica mensagens de importação em códigos fechados para consulta HTTP sem
expor texto livre; a 54 adia a validação temporal durante a transação privada de
aplicação, concluindo a escrita antes de forçar as constraints. Ambas foram
instaladas em banco limpo e por atualização incremental conforme registrado nos
logs dos agentes; migrations antigas permanecem intocadas.

SQL 21–26 passou no banco descartável instalado até 54, inclusive a aplicação
T10 com operação `conservar`, preservação de paciente cuja linha foi removida,
recusa T18 na publicação e impedimento de EXECUTE direto pelo papel de serviço.
T18 é evidência da barreira de publicação; não é evidência de invocação do
executor para uma ocorrência sem identidade, pois a decisão imutável é recusada
antes dessa fase. A integração HTTP exercita um XLSX sintético real até a
simulação read-only do SQL50, confere o resumo sanitizado e recusa autorização
inválida. O manifesto normaliza ocorrência nula para 1 somente na cópia virtual
do contrato temporal. A suite clínica completa do runner descartável passou:
5 suites, 31 testes, incluindo os três perfis e fluxos clínicos existentes.

Validações desta continuidade: `make docs-check manifest-check COMPACT=1`,
`make importer-test COMPACT=1`, `make backend-build backend-unit-test COMPACT=1`,
`git diff --check`, SQL 21–26 e o runner clínico completo passaram. A execução
dos testes SQL 01–02 contra o banco já migrado até 54 não é uma validação válida
da instalação limpa: o teste 02 espera a fronteira histórica anterior às
migrations temporais. O runner clínico, por sua vez, instala o conjunto completo
02–54 em novo banco descartável. O banco persistente e a evidência de schema
aplicado não foram usados nem atualizados; migration 21 mantém o SHA-256
`0c96ea418b5b0dfaed4de648e6d81eb15d8ed20b5649485578e568a61921578e`.

| Subetapa | Status verificável | Restante obrigatório |
| --- | --- | --- |
| 5A | **Concluída no ambiente sintético.** Contratos clínicos autoritativos, invariantes ADR-022 e matriz de impacto revisados/documentados. Por delegação expressa do responsável em 2026-10-03, gestão exige entitlement explícito por usuário, independente do perfil; migration 55, documentação e rotas HTTP de gestão foram implementadas e testadas. | Nenhuma decisão humana bloqueia o escopo sintético. Designação de pessoas reais pertence à implantação institucional. F01–F16/T01–T18 são evidências técnicas das subetapas seguintes, não decisões clínicas. |
| 5B | Promoções aprovadas do importador, BZN, idempotência, reprocessamento e migrations temporais 21–55 avançaram com regressões sintéticas. Gestão HTTP de fontes e autorizações está implementada e o teste dedicado passou. | Staging operacional, aprovação/aplicação/encerramento HTTP integrados e aceite de todos os destinos/casos. Revisão continua desabilitada fora do modo sintético e do aceite integrado. |
| 5C | Descoberta de Chagas e rastreio familiar implementados no importador e exercitados nos cenários disponíveis. | Completar aceites integrados dos escritores e destinos autorizados na matriz temporal. |
| 5D | Recursos clínicos, importação, consultas, paginação e CSV têm DTOs/rotas e 31 testes HTTP integrados no runner descartável. | Fechar o ciclo de revisão operacional, completar os contratos/consultas pendentes identificados na matriz. |
| 5E | Perfis, sanitização, paginação, transações e isolamento de credenciais possuem cobertura integrada nos fluxos já implementados. | Autorização explícita por cada operação de revisão, observabilidade e aceites restantes de concorrência/rollback em toda a superfície. |

O documento `Perguntas pendentes sobre campos e regras clínicas.md` resolve as
respostas clínicas D1–D6. A regra de governança foi escolhida por delegação
expressa do responsável e registrada na ADR-022: entitlement nominal explícito,
provisionado externamente; perfil `administracao` sozinho não basta, e gestão não
concede autorização clínica por fonte. A migration 55 aplica a barreira, e o
teste HTTP comprova registro de fonte e concessão/revogação de autorização para
gestor provisionado e recusa a administrador sem entitlement. Isso não constitui
aprovação institucional para pessoas reais, não habilita a revisão fora do modo
sintético e não substitui o aceite integral da matriz temporal.

F15 agora tem um XLSX real integrado à simulação SQL50 read-only; não cobre
staging nem aprovação/aplicação. F08/F09 ainda não comprovam precedência em todos
os escritores habilitados. F13 permanece limitada aos destinos e cenários
explicitamente listados. T10 tem um cenário de aplicação; T18 para na publicação.
F01–F16/T01–T18 como conjunto, preparação/staging HTTP e rota HTTP de
aplicação/encerramento não foram aceitos. A Etapa 5 segue incompleta; não
declarar conclusão nem habilitar revisão.

## Decisão de governança e validação da migration 55 — 2026-10-03

O responsável autorizou explicitamente que as decisões de governança da 5A
fossem tomadas pelo agente. A decisão adotada é entitlement explícito por
usuário, fora da API, com trilha de provisionamento/revogação; perfil
`administração` não implica competência, e a competência de gestão não substitui
a autorização clínica explícita por fonte. A decisão e sua justificativa estão
em `DECISOES_ARQUITETURAIS.md`; não foram inventadas pessoas ou concessões reais.

A migration 55 foi validada em instalação limpa 02–55 e atualização incremental
54→55 em bancos descartáveis. SQL18–26 e E2E sintético do importador passaram
após adaptar os fixtures para provisionar o entitlement. O teste
`revisoes.sql.http.spec.ts` passou com 1/1 cenários, incluindo recusa sem
entitlement e registro/concessão/revogação pela API. O runner HTTP amplo passou
com 5 suítes/31 testes após tornar o provisionamento global dos fixtures
explícito e o teste de contexto do importador autocontido. `project-check`
completo também passou, com SQL01–26, contra banco descartável até migration 55.
O SQL02 legado foi alinhado à proteção nova: tenta apagar paciente com evento
temporal e verifica recusa do cascade destrutivo e preservação dos dependentes.
Isso valida os fluxos cobertos, mas não representa aceite integral de 5D/5E nem
F01–F16/T01–T18.

Migrations 21–55 e testes foram executados somente em PostgreSQL descartável;
nenhuma migration antiga, dump persistente ou evidência de schema aplicado foi
alterada. A migration 21 preexistente mantém seu hash registrado acima. O fluxo
de staging, aplicação e encerramento HTTP, a cobertura integral F01–F16/T01–T18,
precedência F08/F09 em todos os escritores habilitados e aceites integrados de
rollback/concorrência permanecem necessários. A revisão temporal continua
desabilitada até completar esses critérios.
