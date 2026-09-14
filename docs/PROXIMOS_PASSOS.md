# Próximos Passos

Atualizado em: 2026-09-14

## Ponto de partida e fontes

Estão concluídos o núcleo físico e as evoluções até `sql/20`, as quatro migrations
mínimas anteriormente planejadas, o importador v1 com sua homologação sintética
original, a infraestrutura de testes/CI/Docker e a fundação backend da Etapa 4C.
A consolidação documental das doze respostas da equipe também está concluída;
ela não altera o contrato executável nem equivale a implementação das respostas.
Não há frontend nem escrita clínica HTTP.

As [decisões humanas](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md) são a fonte da
semântica. A [matriz de impacto](dados/COBERTURA_COLUNAS_PLANILHA.md) distingue
reaproveitamento, lacunas e incertezas. O [estado atual](ESTADO_ATUAL_DO_PROJETO.md)
descreve o que já existe. Este documento é a fonte única da sequência proposta.

P0 bloqueia a continuidade do fluxo afetado; P1 é necessário para o MVP; P2 é
importante, mas não bloqueante; P3 é pós-MVP. A priorização abaixo é recomendação
técnica, não uma nova decisão clínica. Permanecem apenas as duas abas clínicas
no escopo inicial, sem dados reais e sem recriar etapas concluídas.

## 1. Etapa 5A — Fechar os contratos ainda ambíguos (P0 dos fluxos afetados)

- **Objetivo:** transformar as respostas confirmadas em contratos mínimos sem
  inventar regras clínicas.
- **Principais alterações:** decidir referência da idade; localização da data
  de descoberta; representação mínima do exame de familiares; tipos dos retornos
  e preservação do ano legado; distinguir atualização da planilha de nova visita;
  escolher representação da contrarreferência, estados necessários e momento do
  upload; confirmar se a intenção de retirar o desfecho será adotada.
- **Dependências:** decisões D1–D12 já documentadas e inspeção do modelo existente.
- **Critérios de aceite:** cada dúvida tem decisão explícita ou exclusão delimitada;
  nenhuma data inventada, novo cadastro familiar obrigatório ou remoção de dados;
  reutilização do modelo avaliada antes de propor tabela ou coluna.
- **Validação:** revisão dos contratos com a equipe e checagem de coerência com
  schema, manifesto e casos sintéticos; `make docs-check`.

## 2. Etapa 5B — Corrigir integridade e reprocessamento do importador (P0/P1)

- **Objetivo:** tornar seguros os caminhos necessários à evolução do contrato.
- **Principais alterações:** reconciliar o BZN já existente por paciente; permitir
  promoção controlada de pendências sem duplicar alvos; alinhar rejeição de campo
  secundário ao contrato; implementar a política aprovada para linhas atualizadas.
  Entregar essas correções em tarefas separadas.
- **Dependências:** a reconciliação BZN depende apenas da unicidade já vigente;
  mudanças temporais e de promoção dependem dos respectivos contratos da 5A.
- **Critérios de aceite:** repetição compatível não viola unicidade nem duplica
  tratamento; conflito não sobrescreve silenciosamente; reprocessamento conserva
  proveniência e consegue resolver pendências; novo hash não é tratado como prova
  de nova consulta.
- **Validação:** regressões unitárias e E2E exclusivamente sintéticas, incluindo
  BZN em duas linhas do mesmo paciente, conflitos e dois elos de reprocessamento.

## 3. Etapa 5C — Completar somente a modelagem indispensável (P1)

- **Objetivo:** representar a data de descoberta e o exame de familiares sem
  confundi-los com sorologia do paciente ou doença familiar.
- **Principais alterações:** migration incremental mínima para as lacunas D2/D3,
  após escolha de titularidade e formato; outras extensões somente se o contrato
  aprovado demonstrar insuficiência das estruturas existentes. Não criar tabelas
  de retorno, pendência ou contrarreferência apenas pelo nome da funcionalidade.
- **Dependências:** contratos correspondentes da 5A; independe de reimplementar
  as migrations anteriores.
- **Critérios de aceite:** valores ausentes continuam distinguíveis de negativos;
  não há exigências clínicas adicionais; integridade, permissões e histórico
  preservados; migrations antigas intactas.
- **Validação:** testes SQL sintéticos com rollback, aplicação incremental em
  ambiente de teste, `make project-check` e nova evidência física só após mudança.

## 4. Etapa 5D — Incorporar as decisões ao contrato de importação (P1)

- **Objetivo:** sair da preservação bruta para a cobertura funcional justificada.
- **Principais alterações:** atualizar manifesto, gerador, validador e handlers
  em conjunto; identificar exames; importar datas reais dos retornos BZN e ano
  legado sem fabricar datas; registrar pendências textuais e contrarreferências
  conforme contrato; incorporar D2/D3; manter `Localizado` fora do funcional.
- **Dependências:** contratos da 5A, correções pertinentes da 5B e extensões
  indispensáveis da 5C; funcionalidades com modelo suficiente não aguardam outras.
- **Critérios de aceite:** contagens refletem destinos efetivamente implementados;
  idade não depende do número legado; solicitação não exige resultado; familiares
  não viram histórico de doença; registros desconhecidos permanecem rastreáveis.
- **Validação:** testes de transformação, manifesto e E2E sintético com exemplos
  positivos, negativos, ausentes e ambíguos, preservando idempotência/proveniência.

## 5. Etapa 5E — Entregar o backend clínico mínimo (P1)

- **Objetivo:** permitir consulta e registro clínico controlados sobre o modelo.
- **Principais alterações:** módulos pequenos para ficha/atendimentos, diagnósticos,
  familiares, exames, retornos, pendências e contrarreferências; DTOs, consultas de
  histórico, autorização explícita por operação/recurso e transações multicomando.
- **Dependências:** contratos aprovados e schema necessário; não refazer login,
  pool ou infraestrutura já entregues. Importação e API devem compartilhar semântica.
- **Critérios de aceite:** acesso indevido negado, erros sem dados sensíveis,
  validações de negócio testadas, gravações compostas atômicas e histórico não
  sobrescrito; nenhuma API de importação ou gestão de usuários presumida no escopo.
- **Validação:** testes unitários, integração HTTP/SQL sintética, contratos e
  matriz de operações dos três perfis existentes.

## 6. Etapa 5F — Construir o frontend mínimo (P1)

- **Objetivo:** viabilizar o fluxo de trabalho confirmado pela equipe.
- **Principais alterações:** login, busca/lista, ficha, formulários e linha do
  tempo; idade calculada com referência visível; identificação de exames trazidos
  e solicitados; retornos e contrarreferências repetíveis; pendências livres;
  ausência do campo funcional `Localizado`.
- **Dependências:** contratos HTTP e autorização da 5E; decisão sobre apresentação
  do desfecho sem perder informações de agendamento.
- **Critérios de aceite:** estados ausente/negativo não se confundem; ano legado
  não aparece como data exata; histórico preservado e operações respeitam perfil.
- **Validação:** testes de componentes e fluxos sintéticos, revisão de usabilidade
  com a equipe e tratamento de erro/autenticação expirada.

## 7. Etapa 5G — Integrar e homologar o MVP sintético (P1)

- **Objetivo:** comprovar o fluxo importação → API → interface com as novas regras.
- **Principais alterações:** cenários integrados D1–D12, revisão de documentação,
  rastreabilidade, recuperação de falhas e roteiro de homologação da equipe.
- **Dependências:** entregas correspondentes da 5B–5F.
- **Critérios de aceite:** cada decisão tem evidência de atendimento ou ressalva
  aceita; nenhuma duplicação clínica em reprocessamento; sem dados reais; pendências
  técnicas e institucionais não apresentadas como funcionalidades concluídas.
- **Validação:** `make project-check`, E2E de importação/backend/interface, CI e
  aceite da equipe com fixture sintética; não reutilizar o aceite antigo como novo.

## 8. Preparar operação segura e autorização institucional (P1 antes de dados reais)

- **Objetivo:** liberar implantação somente mediante controles e autorização próprios.
- **Principais alterações:** ambiente protegido, TLS, logins e gestão/rotação de
  segredos, auditoria, backup/restore, retenção, resposta a incidentes e responsáveis
  por autorizar lotes/revisar inconsistências; avaliar limitação distribuída conforme
  topologia de implantação. Governança pode avançar em paralelo ao MVP sintético.
- **Dependências:** homologação sintética para liberação operacional e decisões
  institucionais; esta documentação não autoriza carga real.
- **Critérios de aceite:** controles verificados, responsáveis e políticas
  aprovados; autorização explícita antes de qualquer tratamento de dados reais.
- **Validação:** revisão de segurança, restore em ambiente isolado e checklist
  institucional; o restore Docker de desenvolvimento não basta para produção.

## 9. Evoluções não bloqueantes (P2/P3)

- **Objetivo:** ampliar o sistema apenas após comprovar necessidade operacional.
- **Principais alterações:** upload de contrarreferência (P2 proposto), com
  armazenamento privado, autorização e política de arquivos; identificação
  permanente de prontuário, vínculo do digitador legado ao usuário, refinamentos
  clínicos aprovados, aba operacional e AIM3 (P3).
- **Dependências:** confirmação do momento do upload pela equipe; se indispensável
  à primeira operação, movê-lo para antes da homologação e rever schema/segurança.
- **Critérios de aceite:** escopo aprovado por incremento, sem inferir regras
  clínicas, sem anexos públicos e sem reconstruir histórico inexistente na fonte.
- **Validação:** testes sintéticos próprios e revisão de segurança dos anexos
  antes da liberação; documentação das decisões efetivamente adotadas.

## Única próxima tarefa técnica

Corrigir somente a reconciliação de `tratamento_benzonidazol` no importador para
duas linhas compatíveis do mesmo paciente. O modelo já determina um tratamento
consolidado por paciente; não é necessário relaxar a unicidade nem criar migration.
Incluir regressão sintética e preservar proveniência e rejeição segura de conflitos.
As demais tarefas acima não fazem parte desse incremento.

Prompt para executar somente essa tarefa:

> Leia os AGENTS.md relevantes e corrija apenas a reconciliação de BZN no
> importador: duas linhas compatíveis do mesmo paciente, em atendimentos distintos,
> devem reutilizar o tratamento consolidado, preservando vínculo existente e
> proveniência; divergências não podem ser sobrescritas silenciosamente. Reutilize
> o modelo e as regras atuais, acrescente regressões sintéticas e atualize somente
> a documentação afetada. Não crie migrations, não altere backend/frontend, não
> use dados reais e não faça commit. Execute as validações pertinentes e relate
> eventuais limitações.

## Validação desta revisão documental

`make docs-check`, `make manifest-check` e `git diff --check`. A execução de
`make project-check` foi deliberadamente excluída deste escopo documental por
incluir testes SQL com escrita, ainda que transacional. Não houve aplicação de
migrations, atualização do dump, carga de dados nem nova homologação funcional.
