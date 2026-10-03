# Estado Atual do Projeto

Atualizado em: 2026-10-03

Esta é a síntese vigente. Contratos pertencem às fontes temáticas; o histórico
cronológico está no [registro](REGISTRO_DE_ALTERACOES.md) e na
[continuidade da Etapa 5](validacoes/CONTINUIDADE_ETAPA_5.md).

## Escopo e estágio

Etapas 1–4 concluídas. **Etapa 5 (5A–5E) concluída no ambiente sintético em
2026-10-03**, incluindo o aceite integrado e a ativação controlada.
Implementação, importador, recursos clínicos e provas F01–F16/T01–T18 são
relacionados na [matriz de aceite](validacoes/ACEITE_INTEGRADO_ETAPA_5.md).
Frontend e Etapas 6–10 não foram implementados nesta entrega.

A [avaliação do protótipo Figma Make](arquitetura/ANALISE_INTEGRACAO_FIGMA_MAKE.md)
foi concluída em 2026-10-03, com inventário, compatibilidade HTTP e plano das
Etapas 6–8. A direção é construir frontend próprio em React/TypeScript e
reaproveitar apresentação revisada, preservando arquitetura e regras existentes.
O próximo desenvolvimento previsto é 6A (base/sessão), seguido de 6B (leitura),
conforme o [roadmap](PROXIMOS_PASSOS.md#etapa-6--fundação-do-frontend).
É planejamento documental; não altera o estágio de implementação.

As respostas de [campos e regras clínicas](Perguntas%20pendentes%20sobre%20campos%20e%20regras%20cl%C3%ADnicas.md)
são autoritativas: idade derivada do nascimento, descoberta de Chagas distinta da
sorologia, familiares identificados com resultado, exames identificados e retorno
BZN ligado ao comparecimento real. Não há decisão humana pendente no escopo
sintético. A governança delegada da 5A exige entitlement nominal para gestão,
independente do perfil administrativo e da autorização clínica por fonte.
Designar pessoas e operar com dados reais pertencem à implantação posterior.

## Componentes vigentes

- PostgreSQL, schema `ambulatorio`. O ambiente persistente continua representado
  pelas migrations 00–20 e pelo [dump aplicado](evidencias/schema_atual_ambulatorio.sql),
  com 38 tabelas. Ele não foi alterado nesta execução.
- As migrations incrementais da Etapa 5 foram desenvolvidas e validadas apenas
  em bancos descartáveis. O [modelo físico](MODELO_FISICO_ATUAL.md) distingue
  explicitamente essa implementação do ambiente persistente.
- Importador Python v1.7.0 e manifesto semântico v1.4: reconciliação BZN,
  promoção seletiva, criticidade conservadora, idempotência, dois elos de
  reprocessamento, captura/proveniência e relatórios sanitizados.
- Backend NestJS/TypeScript com autenticação JWT, DTOs explícitos, operações de
  negócio, SQL parametrizado, transações e controle de versão. O contrato é
  `/v1`, com aliases compatíveis sem prefixo e recusa de versões inexistentes.
- CI executa manifesto, importador, SQL, build, fundação e também o runner
  clínico em banco próprio descartável. Há alvos Make com `COMPACT=1`.

## Recursos clínicos e autorização

A API cadastra, consulta e edita o paciente completo; calcula idade com referência;
cria, consulta e edita atendimentos; registra diagnóstico/descoberta, familiares,
exames identificados, BZN/reações e retornos reais, projetos, notificação,
encaminhamentos, contrarreferências múltiplas, fatos/retornos anuais e pendências.
Busca, filtros, coleções aninhadas e CSV seguem a mesma autorização por vínculo;
CSV neutraliza fórmulas. Consultas de lotes/linhas retornam DTOs paginados e códigos
técnicos, sem JSONB bruto ou mensagens clínicas de processamento.

Perfis `consulta`, `edicao` e `administracao` têm operações explícitas. Autenticação
não concede vínculo ao paciente; administração também não concede entitlement
ou autorização temporal automaticamente. A política clínica é desabilitada por
padrão. Escritas compostas usam a mesma transação e contexto confiável do ator.
Pools/credenciais de identidade, aplicação, importador, revisão e gestão têm
capacidades separadas. O importador não lê identidade nem snapshots de auditoria.

## Importação e revisão temporal

A CLI exige finalidade explícita e mantém a recusa de revisão entre hashes;
a revisão tem fluxo HTTP separado de fonte, autorização, simulação, recebimento
XLSX, aprovação seletiva, aplicação e encerramento. Manifesto/transformações são
artefatos imutáveis registrados pelo mantenedor. Hash novo não equivale a visita
nova; identidade de ocorrência é explícita. Dry-run não grava tabelas/sequências.
O POST ordinário permite importação/reenvio idempotente, sem expor a opção
`--reprocessar` da CLI para criar novo elo encadeado.

A captura mínima ativa abrange ano D8, data/observação do atendimento e descoberta
D2. Todos esses escritores geram histórico ou são recusados. Correções exigem
cobertura comprovada desde a base; igualdade, marco atual e NULL legado não a
fornecem. Promoção D2 bloqueia o diagnóstico antes da prova: só preenche NULL
importado da linha-base sem evento posterior. Edição concorrente A→B→A permanece
intacta. A ausência de coluna de observação nos dois arquivos é representada
explicitamente no plano de criação, com catálogo e transformação fechados.

A aplicação revalida fonte, decisão, autorização e tokens sob locks. Falha tardia
reverte clínica, histórico, proveniência e sucesso; diagnóstico técnico é gravado
em transação posterior. Repetição/retomada reutiliza IDs e a origem antiga não
restaura correções. Visitas distintas na mesma data não são fundidas; ano isolado
não fabrica dia, visita ou quantidade de comparecimentos.

As portas HTTP de importação/revisão ficam desligadas por padrão e recusam
produção. A ativação sintética de execução foi validada em `development`/`test`,
com opt-in, staging, Git válido e permissões dedicadas da migration 63. Não há
aplicação das novas migrations nem ativação no banco persistente.

A [preparação da migração real](PROXIMOS_PASSOS.md#preparação-da-migração-da-planilha-real)
pode avançar com mapeamento e ensaios sintéticos em paralelo ao frontend. Execução
real depende da liberação 9D, do ambiente compatível e dos controles institucionais;
campos importados sem HTTP continuam sem consulta/edição pela interface.

## Validação e limites

Instalação limpa 02–63 e atualizações incrementais 60→61→62→63 aprovadas.
A rodada final passou 34 testes SQL, manifesto, 34 unitários e E2E do importador,
build, 53 unitários/de contrato do backend, oito de fundação e 38 clínicos HTTP.
As provas de concessão, recusa e reversão operacional estão incluídas; os testes
da fundação não substituem as provas HTTP dos recursos clínicos. Logs e falhas
intermediárias estão na continuidade. O CI foi atualizado, mas não executado
remotamente nesta entrega.

Nove rótulos parciais preservam conteúdo sem interpretação inequívoca. NULL
legado sem cobertura, ocorrência sem identidade e texto ambíguo seguem preservados
ou bloqueados, como exige o contrato. Essa recusa não autoriza reconstrução de
histórico. `Localizado` continua excluído do estruturado, separado da localização
do prontuário. Planejamento D9 não produz comparecimento; upload avançado de
contrarreferência permanece no backlog aprovado. Não há nova regra clínica inferida.

Dados reais, frontend, implantação, TLS/segredos/backup/retenção e homologação
institucional não fazem parte desta execução. O backlog e as próximas etapas
estão em [PROXIMOS_PASSOS.md](PROXIMOS_PASSOS.md); regras e workflow estão no
[índice da documentação](README.md).
