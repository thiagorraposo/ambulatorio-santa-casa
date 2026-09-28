# Roadmap do Projeto

Atualizado em: 2026-09-28

Este é o roadmap oficial do projeto. A estrutura original possui dez etapas;
as etapas 1–4 estão concluídas. As etapas 5, 7, 9 e 10 possuem subetapas porque
contêm entregas independentes e dependências próprias. As letras identificam
subetapas de execução e não criam uma nova numeração principal.

As decisões de negócio vigentes estão em
[`dados/DECISOES_HUMANAS_NOVA_PLANILHA.md`](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md),
as lacunas por camada em
[`dados/COBERTURA_COLUNAS_PLANILHA.md`](dados/COBERTURA_COLUNAS_PLANILHA.md) e o
estado técnico em [`ESTADO_ATUAL_DO_PROJETO.md`](ESTADO_ATUAL_DO_PROJETO.md).
Prioridades P0–P3 são recomendações técnicas: P0 bloqueia o fluxo afetado, P1 é
necessária ao MVP, P2 é importante sem bloquear e P3 é pós-MVP.

## Etapa 1 — Fechar a camada de dados — concluída

**Objetivo:** chegar ao ponto em que a planilha possa ser interpretada
deterministicamente.

**Entrega realizada:** contrato físico `planilha → banco`, manifesto das duas
abas clínicas, 136 chaves semânticas, aliases, blocos, posições, identificação
de paciente, precedência entre abas, conflitos, idempotência, reprocessamento,
regras de transformação e exclusão funcional de `Localizado`.

**Evidências:** manifesto executável, especificação normativa e decisões humanas.

## Etapa 2 — Importador — concluída no contrato v1 sintético

**Objetivo:** produzir registros estruturados a partir de uma planilha sintética.

**Entrega realizada:** fixture sintética, leitura das duas abas, validação de
layout, lote/linha/proveniência, identificação de pacientes, atendimentos,
transformações, erros, revisão, idempotência e reprocessamento encadeado.

**Limite conhecido:** a homologação original não cobre integralmente as novas
respostas D1–D12. A reconciliação BZN foi corrigida na v1.1.1 e a promoção
controlada de D11 foi entregue na v1.2.0. Antes do MVP revisado ainda é necessário
tratar as demais chaves aprovadas, implementar o contrato temporal de linhas
atualizadas e classificar individualmente os demais erros secundários. A primeira política não
crítica foi entregue na v1.3.0. Isso é evolução da etapa 5, não reabertura da
etapa 2 concluída.

## Etapa 3 — Fundação do backend — concluída

**Objetivo:** deixar de manipular o banco diretamente.

**Entrega realizada:** projeto NestJS, Docker, configuração por ambiente,
camada SQL parametrizada, migrations fora da API, autenticação, usuários,
perfis, erros padronizados, logging sem dados clínicos sensíveis e healthcheck.

**Limites:** não há ainda escrita clínica HTTP, endpoint de importação ou
autorização por paciente/atendimento. A fundação não deve ser refeita.

## Etapa 4 — CRUD clínico — concluída na camada física, não na API

**Objetivo original:** refletir os fluxos clínicos necessários, sem criar um
endpoint por tabela.

**Entrega realizada:** núcleo físico e migrations até `sql/20`, incluindo
pacientes, atendimentos, dados clínicos, projetos, exames, BZN, reações,
encaminhamentos e notificações.

**Esclarecimento de escopo:** a camada de dados necessária está concluída, mas
os endpoints clínicos ainda não existem. A implementação HTTP desses fluxos
ocorre na Etapa 5, conforme o estado real do código, e não será contada como
conclusão fictícia da Etapa 4.

## Etapa 5 — Recursos funcionais e backend clínico do MVP

**Objetivo:** fechar o backend utilizável, incorporando as regras confirmadas e
os recursos necessários para a interface.

### 5A — Fechar contratos funcionais e invariantes (P0/P1)

**Avanço em 2026-09-22:** definido o
[contrato temporal de revisão entre hashes](arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md)
(ADR-022), distinguindo correção, nova visita e atualização consolidada. Em
2026-09-28, as respostas de [`Perguntas pendentes sobre campos e regras clínicas.md`](Perguntas%20pendentes%20sobre%20campos%20e%20regras%20cl%C3%ADnicas.md)
foram incorporadas como referência autoritativa para idade, Chagas, familiares,
exames e retorno de 30 dias. A implementação técnica desses contratos continua
separada da decisão clínica.

- **Objetivo:** congelar o escopo e resolver somente as ambiguidades que afetam implementação.
- **Principais alterações:** consolidar as respostas de idade, descoberta de Chagas, familiares, exames e retorno BZN; implementar as invariantes sem inferir fatos ausentes; manter ADR-022 e o backlog de contrarreferência nos limites aprovados.
- **Dependências:** schema/código existentes, implementação física restante e aceite técnico da ADR-022.
- **Critérios de aceite:** contratos decididos ou explicitamente adiados; nenhuma data inventada; nenhuma regra clínica inferida; modelo existente avaliado antes de propor migration.
- **Validação:** revisão com a equipe, matriz de impacto atualizada e `make docs-check`.

### 5B — Corrigir importador e reprocessamento (P0/P1)

**Status:** em andamento. Reconciliação BZN entregue em 2026-09-15 (v1.1.1),
com dez testes unitários e E2E de 13 linhas sintéticas. A promoção controlada de
D11 foi entregue em 2026-09-21 (v1.2.0), elevando a cobertura para 125 rótulos
plenos. Em 2026-09-22, a v1.3.0 introduziu criticidade conservadora e a primeira
regra não crítica, para catálogo de projeto ausente, elevando os testes unitários
para 19.
Foram comprovados
reutilização do tratamento, preenchimento de nulos, preservação do vínculo e dos
originais, rejeição atômica de conflitos, promoção parcial, preservação de edição
manual ambígua, resolução seletiva de catálogo, dry-run e dois elos de
reprocessamento sem duplicação. O contrato temporal entre hashes foi definido em
2026-09-22, com 18 casos de aceite. A v1.4.0 implementa a barreira de finalidade,
com recusa de revisão antes de escrita, 26 testes unitários e E2E sintético;
T01 e a parte de T02 relativa à recusa estão cobertos. A reconciliação entre
hashes, as demais promoções aprovadas e a classificação individual dos outros
erros secundários seguem abertas.

Em 2026-09-25 foi especificada a extensão física mínima da ADR-022, com entidades,
invariantes, autorização, histórico por campo e 16 casos de aceite F01–F16 por
incremento. As migrations 21–24 agora cobrem armazenamento, integridade, captura
e contexto de proveniência em banco descartável; aplicação seletiva, dry-run e
revisão entre hashes continuam bloqueados.

- **Objetivo:** eliminar duplicação e perda de promoção nos fluxos já suportados.
- **Principais alterações:** reconciliar BZN consolidado por paciente; promover pendências resolvidas sem recriar alvos; separar erros críticos de não críticos; aplicar a política aprovada a arquivos revisados; atualizar metadados semânticos do gerador/manifesto/validador em conjunto.
- **Dependências:** a reconciliação BZN usa a unicidade existente; os demais itens dependem de 5A.
- **Critérios de aceite:** duas linhas compatíveis não violam unicidade nem duplicam tratamento; conflitos não sobrescrevem fatos; proveniência permanece íntegra; novo hash não é tratado automaticamente como nova consulta.
- **Validação:** testes unitários, fixture e E2E sintéticos com BZN repetido, conflito, pendência promovida e dois elos de reprocessamento.

### 5C — Completar modelagem indispensável (P1)

**Status:** parcialmente implementada. A migration 25 modela rastreio familiar
triestado e resultados repetíveis com trigger diferido e testes transacionais.
A semântica da descoberta de Chagas está resolvida: a data é a descoberta pelo
paciente e pode diferir da sorologia. Ainda falta o campo físico específico;
nenhuma data foi inventada.

- **Objetivo:** estruturar apenas fatos que o modelo atual não consegue representar.
- **Principais alterações:** migration incremental mínima para data de descoberta de Chagas e rastreio familiar, após 5A; não criar tabelas próprias para retornos, pendências ou contrarreferências apenas pela existência dessas palavras.
- **Dependências:** contratos de 5A; migrations antigas permanecem imutáveis.
- **Critérios de aceite:** ausência, negativo e desconhecido distinguíveis; resultado de familiar não vira histórico de doença; FKs, permissões e histórico preservados; nenhuma alteração física sem justificativa documentada.
- **Validação:** testes SQL sintéticos com `BEGIN`/`ROLLBACK`, `make db-test`, `make project-check` e dump somente se o schema mudar.

### 5D — Implementar recursos de consulta e importação (P1)

**Status:** parcialmente implementada. A API possui DTOs, ficha de paciente,
criação/consulta de atendimentos, incluindo dados clínicos, exames, pendências e
rastreio familiar, consulta detalhada, retornos BZN e controle de versão, com transações. A consulta sanitizada de
lotes/linhas, importação HTTP multipart com role separada e um CSV protegido foram
adicionados; o worker permanece desabilitado por padrão e dependente de configuração
sintética explícita.

- **Objetivo:** entregar o backend funcional previsto na etapa original.
- **Principais alterações:** busca e filtros de pacientes; histórico de atendimentos; consultas de exames, projetos, tratamento, notificações e pendências; endpoint de importação; acompanhamento de lote e erros; exportação CSV; DTOs clínicos; autorização explícita por operação e recurso; transações compostas quando uma operação fizer várias gravações.
- **Dependências:** 5A–5C e fundação da Etapa 3. Não expor JSONB bruto nem criar API genérica de todas as tabelas.
- **Critérios de aceite:** cadastrar/consultar paciente completo por fluxo de negócio; filtros respeitam autorização; erros não vazam dados clínicos; importação e API preservam proveniência e histórico.
- **Validação:** testes unitários, contratos HTTP e integração API/SQL sintética, incluindo os três perfis existentes.

### 5E — Encerrar o backend do MVP (P1)

**Status:** em andamento. Validação, erros sanitizados, SQL parametrizado,
observabilidade existente e controle de acesso configurável foram preservados;
faltam contratos HTTP completos, cobertura dos três perfis para os novos fluxos,
paginação/filtros e integração de importação/exportação.

- **Objetivo:** consolidar a API antes do frontend.
- **Principais alterações:** revisão de DTOs, paginação, erros, autorização por paciente/atendimento, observabilidade técnica e documentação de contratos; endpoint de importação e CSV estabilizados.
- **Dependências:** 5D e decisões institucionais aplicáveis ao ambiente sintético.
- **Critérios de aceite:** backend cobre os fluxos do MVP sem acesso direto ao banco; operações indevidas retornam 401/403; contratos versionados e testes passam em banco descartável.
- **Validação:** `make backend-check`, integração HTTP/SQL, `make project-check` e revisão de diff.

**Marco da Etapa 5:** backend do MVP praticamente fechado, com uma planilha sintética processada sem duplicações indevidas e paciente completo consultável.

## Etapa 6 — Fundação do frontend

- **Objetivo:** permitir login e navegação básica consumindo somente a API.
- **Principais alterações:** React, rotas, sessão, comunicação autenticada, layout principal, navegação, erros, listagem, busca e página de paciente.
- **Dependências:** Etapa 5E e contratos HTTP estáveis.
- **Critérios de aceite:** usuário autenticado entra, navega, pesquisa e abre paciente; expiração de sessão e erros são tratados; nenhuma estética sofisticada bloqueia o fluxo.
- **Validação:** build, testes de componentes/fluxos sintéticos, revisão manual de autenticação e `make project-check`.

## Etapa 7 — Fluxos clínicos

**Objetivo:** tornar utilizáveis as telas efetivamente usadas pela equipe.

### 7A — Cadastro e atendimentos

- **Objetivo:** permitir localizar pacientes e registrar atendimentos básicos.
- **Principais alterações:** cadastro/edição de paciente, busca, atendimento,
  dados demográficos, idade calculada com referência visível e histórico básico.
- **Dependências:** Etapa 6, Etapa 5E e contratos de 5A.
- **Critérios de aceite:** paciente pode ser consultado e editado conforme perfil;
  idade não é digitada como fato independente; atendimento não é sobrescrito.
- **Validação:** testes de componentes e integração sintética de paciente/atendimento.

### 7B — Dados clínicos e exames

- **Objetivo:** registrar os dados clínicos e exames necessários ao atendimento.
- **Principais alterações:** dados clínicos, exames trazidos e solicitados,
  identificação obrigatória, familiares examinados e resultados, preservação de
  ausências e estados desconhecidos.
- **Dependências:** contratos incorporados de Chagas, exames e familiares, além da
  migration física restante da Etapa 5C.
- **Critérios de aceite:** exame solicitado não exige resultado; exame trazido é
  identificado; familiar examinado não vira histórico de doença.
- **Validação:** testes de formulário/API com casos positivos, negativos, vazios e
  ambíguos, usando somente dados sintéticos.

### 7C — Tratamento, retornos e encaminhamentos

- **Objetivo:** implementar os fluxos clínicos de BZN e comunicação assistencial.
- **Principais alterações:** BZN, reações, retorno de 30 dias, retorno final,
  retornos anuais, histórico de ocorrências, encaminhamento, contrarreferências
  repetíveis, notificação e pendências textuais.
- **Dependências:** contrato temporal de D6–D11 e importador/API da Etapa 5; não
  fabricar datas do ano legado. Contrarreferência avançada e upload permanecem
  fora do escopo atual.
- **Critérios de aceite:** datas são comparecimentos efetivos; 30/60 dias não são
  calculados automaticamente; histórico não é substituído; `Localizado` não
  aparece funcionalmente.
- **Validação:** testes de componentes e integração com múltiplos retornos,
  contrarreferências e conflitos de autorização.

### 7D — Integração do fluxo clínico

- **Objetivo:** comprovar que os módulos formam um atendimento utilizável.
- **Principais alterações:** navegação entre ficha, atendimento, exames, BZN,
  encaminhamento, notificação e histórico; mensagens de erro e estados de carga.
- **Dependências:** 7A–7C e contratos HTTP estabilizados.
- **Critérios de aceite:** fluxo principal completo sem acesso direto ao banco;
  dados permanecem rastreáveis e o usuário não perde alterações válidas.
- **Validação:** fluxo end-to-end sintético, revisão de usabilidade com a equipe e
  `make project-check`.

## Etapa 8 — Dashboard e funcionalidades complementares

- **Objetivo:** oferecer visão operacional pequena e útil.
- **Principais alterações:** dashboard inicial, filtros e indicadores essenciais, CSV pela interface, importação, acompanhamento de lote, inconsistências, validações de formulário e ajustes de UX.
- **Dependências:** Etapas 5–7 e métricas aprovadas; não iniciar plataforma analítica nem dashboard sofisticado.
- **Critérios de aceite:** indicadores têm definição verificável e não exibem JSONB bruto; importação e inconsistências são compreensíveis; CSV respeita autorização e filtros.
- **Validação:** testes de interface/API, revisão com dados sintéticos e análise de permissões/exportação.

## Etapa 9 — Produção

**Objetivo:** executar a aplicação fora do notebook com controles institucionais.

### 9A — Ambiente e implantação

- **Objetivo:** disponibilizar instalação reproduzível de produção.
- **Principais alterações:** servidor, Docker Compose/configuração equivalente,
  configuração por ambiente, roles PostgreSQL, permissões e healthchecks.
- **Dependências:** Etapa 8 e arquitetura de implantação escolhida.
- **Critérios de aceite:** aplicação sobe em ambiente controlado sem comandos
  privados do autor; migrations seguem o procedimento correto.
- **Validação:** `make docker-project-check` e teste de reinício/recuperação.

### 9B — Segurança de transporte e segredos

- **Objetivo:** proteger comunicação, credenciais e dados estruturados/brutos.
- **Principais alterações:** HTTPS, gestão/rotação de segredos, roles mínimas,
  permissões, proteção do JSONB e revisão da exposição da API/frontend.
- **Dependências:** 9A e decisões institucionais de identidade e acesso.
- **Critérios de aceite:** nenhum segredo versionado; transporte seguro; JSONB
  não acessível por rotas genéricas; acesso indevido retorna 401/403.
- **Validação:** checklist de segurança e testes de autorização isolados.

### 9C — Continuidade e observabilidade

- **Objetivo:** permitir recuperação e investigação de falhas.
- **Principais alterações:** backup, restore, logs técnicos, auditoria mínima,
  retenção, tratamento de falhas e alertas operacionais.
- **Dependências:** 9A–9B e política institucional de retenção/auditoria.
- **Critérios de aceite:** backup restaura em ambiente isolado; logs não contêm
  dados clínicos sensíveis; falhas são rastreáveis.
- **Validação:** backup/restore repetido, inspeção de logs e simulação de falha.

### 9D — Liberação controlada

- **Objetivo:** verificar que a operação está autorizada antes de dados reais.
- **Principais alterações:** responsáveis por lotes, revisão de incidentes,
  E2E sintético e decisão formal de liberação.
- **Dependências:** 9A–9C e governança institucional aprovada.
- **Critérios de aceite:** controles verificados, autorização explícita registrada
  e nenhum dado real carregado prematuramente.
- **Validação:** `make docker-project-check`, E2E, restore e revisão operacional.

## Etapa 10 — Homologação e estabilização

**Objetivo:** fechar o MVP sem adicionar funcionalidades grandes.

### 10A — Homologação funcional

- **Objetivo:** testar com usuários os fluxos definidos nas Etapas 5–8.
- **Principais alterações:** roteiro de uso, importação completa autorizada,
  pacientes, atendimentos, exames, BZN, retornos, encaminhamentos, dashboard e CSV.
- **Dependências:** Etapas 5–9 e dados sintéticos ou autorizados conforme 9D.
- **Critérios de aceite:** usuários completam o fluxo principal e registram
  evidências sem acessar o banco diretamente.
- **Validação:** sessões de homologação, E2E e registro de casos aceitos/rejeitados.

### 10B — Correções e regressão

- **Objetivo:** corrigir bugs sem ampliar o escopo congelado.
- **Principais alterações:** duplicações, permissões, validações, backup/restore,
  dashboard, CSV, mensagens e problemas encontrados em 10A.
- **Dependências:** evidências da homologação e triagem de severidade.
- **Critérios de aceite:** defeitos críticos resolvidos; nenhuma correção remove
  histórico, enfraquece autorização ou inventa regra clínica.
- **Validação:** regressão completa, testes focados e revisão do diff.

### 10C — Entrega reproduzível

- **Objetivo:** permitir que outra pessoa instale e opere o sistema.
- **Principais alterações:** instalação reproduzível, configuração, backup/restore,
  documentação operacional, roteiro de suporte e material de entrega.
- **Dependências:** 10B, ambiente da Etapa 9 e documentação atualizada.
- **Critérios de aceite:** instalação limpa e restauração executáveis por outra
  pessoa sem comandos privados do autor.
- **Validação:** execução por operador diferente, `make project-check` e revisão
  documental.

### 10D — Release do MVP

- **Objetivo:** formalizar a versão entregue e seu estado conhecido.
- **Principais alterações:** revisão final de segurança, changelog, tag/release,
  lista de limitações e aceite formal da equipe.
- **Dependências:** 10A–10C e aprovação institucional.
- **Critérios de aceite:** versão identificada, documentação e limitações publicadas,
  aceite registrado e nenhum trabalho fora do escopo apresentado como concluído.
- **Validação:** regressão final, `make project-check`, checklist de release e
  conferência de `git status` antes do commit/tag.

## Congelamento de escopo do MVP

Ficam fora das dez etapas do MVP: `Localizado` como funcionalidade, abas AIM3,
aba operacional, migração das estruturas legadas, funcionalidades avançadas de
contrarreferência, dashboards sofisticados, regras clínicas adicionais,
otimizações prematuras, aplicativo mobile e refinamentos estéticos não essenciais.

Upload de contrarreferência é P2 proposto e depende de decisão sobre representação,
estado, armazenamento, retenção e momento de entrega. Se for indispensável ao
primeiro uso, deve ser promovido explicitamente antes da Etapa 8, com revisão de
segurança; não se presume essa promoção.

Para compromisso de dez semanas, 24 horas semanais é a referência recomendada;
20 horas é piso arriscado. O marco de risco é concluir a Etapa 5 com banco,
importador e backend funcionais antes de iniciar as Etapas 6–8.

## Próxima tarefa isolada

A especificação física foi concluída em 2026-09-25 no
[contrato temporal](arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md#extensão-física-mínima-proposta).
O próximo incremento é implementar somente seu armazenamento fechado: nova
migration incremental, constraints, gatilhos de integridade das novas relações,
permissões e testes SQL sintéticos. Não instalar ainda captura clínica, executor
de revisão ou concessões institucionais. A barreira v1.4.0 permanece ativa.

Cobrir F01–F07 e F16 nas partes verificáveis sem executor, distinguindo restrições
estruturais de testes futuros de aprovação/aplicação. Validar banco limpo e
atualização incremental em ambiente descartável. Preservar a FK de mesmo
hash/layout, o isolamento funcional e a ausência de dados reais. A captura de
todos os escritores e o fluxo auditado serão incrementos posteriores; não
escolher destinos clínicos pendentes da 5A por inferência.

Prompt pronto para a próxima tarefa:

> Siga AGENTS.md e implemente apenas a migration de armazenamento fechado da
> extensão física especificada no contrato temporal da ADR-022. Comece pela seção
> “Extensão física mínima proposta”; consulte schema/permissões por trechos.
> Planeje brevemente, crie nova migration e testes de integridade/permissões
> F01–F07 e F16, delimitando a cobertura ainda dependente do executor. Revogue os
> privilégios padrão indevidos nas novas relações/sequências; não conceda acesso à
> identidade ao importador. Mantenha revisão bloqueada na v1.4.0 e não implemente
> captura ou escrita clínica. Valide conforme a matriz do workflow para schema,
> usando COMPACT=1 e bancos descartáveis limpo/atualizado; combine regressões
> pertinentes sem repetir suítes sobre o mesmo estado. Não aplique no banco
> persistente nem regenere sua evidência sem autorização específica. Preserve
> alterações existentes, atualize somente a documentação afetada e registre a
> mudança. Sem dados reais, subagentes, commit ou push. Informe resultado, testes,
> limites e próximo incremento brevemente.

## Validação da revisão documental de 2026-09-14

Esta atualização altera somente documentação. Foram lidos os AGENTS.md relevantes,
o workflow de desenvolvimento, as respostas integrais do DOCX e o estado executável
do repositório. Validar com `make docs-check`, `make manifest-check` e
`git diff --check`; `make project-check` não foi executado naquela revisão por
incluir testes SQL com escrita transacional. No incremento BZN de 2026-09-15,
`make project-check` foi executado antes e depois da implementação, além de
`make importer-test` e `make manifest-check`.
