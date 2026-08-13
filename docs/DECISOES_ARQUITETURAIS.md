# Decisões Arquiteturais

Atualizado em: 2026-08-06

Este documento registra decisões duradouras do projeto. Mudanças cronológicas continuam em `docs/REGISTRO_DE_ALTERACOES.md`.

## ADR-001

ID: ADR-001

Título: Implementação incremental do modelo físico

Data: 2026-07-01

Status: Aceita

Contexto: O modelo completo da planilha original é amplo e ainda será expandido em fases.

Decisão: Construir o modelo físico por fases, começando pelo núcleo funcional inicial.

Consequências: O núcleo atual pode ser validado antes de cobrir todos os campos da planilha. Novas estruturas entram por migrations incrementais.

Alternativas rejeitadas: Modelar toda a planilha de uma vez antes de validar o banco.

Documentos relacionados: `docs/ESTADO_ATUAL_DO_PROJETO.md`, `docs/PROXIMOS_PASSOS.md`, `docs/VALIDACAO_MODELO_FISICO.md`.

## ADR-002

ID: ADR-002

Título: Migrations antigas não são alteradas

Data: 2026-07-01

Status: Aceita

Contexto: Scripts SQL já foram aplicados ao schema físico atual.

Decisão: Não editar migrations antigas aplicadas. Toda evolução estrutural deve usar nova migration incremental.

Consequências: O histórico permanece auditável e ambientes existentes podem evoluir sem reaplicação destrutiva.

Alternativas rejeitadas: Corrigir scripts antigos diretamente depois de aplicados.

Documentos relacionados: `AGENTS.md`, `sql/AGENTS.md`, `docs/VALIDACAO_MODELO_FISICO.md`.

## ADR-003

ID: ADR-003

Título: Schema físico aplicado é validado por dump de estrutura

Data: 2026-07-01

Status: Aceita

Contexto: A documentação precisa diferenciar estrutura planejada, migrations e estrutura realmente aplicada.

Decisão: Usar `docs/evidencias/schema_atual_ambulatorio.sql` como principal evidência do schema físico aplicado.

Consequências: Comparações futuras devem considerar esse dump estrutural como fonte prioritária para o estado físico aplicado.

Alternativas rejeitadas: Inferir o estado físico somente pelas migrations.

Documentos relacionados: `docs/evidencias/schema_atual_ambulatorio.sql`, `docs/MODELO_FISICO_ATUAL.md`, `docs/VALIDACAO_MODELO_FISICO.md`.

## ADR-004

ID: ADR-004

Título: Testes SQL usam dados temporários e rollback

Data: 2026-07-01

Status: Aceita

Contexto: Testes de integridade devem ser repetíveis e não podem poluir o banco.

Decisão: Testes SQL devem usar dados sintéticos, transação explícita e `ROLLBACK` quando adequado.

Consequências: A validação pode ser repetida sem deixar registros de teste persistidos.

Alternativas rejeitadas: Inserir dados permanentes de validação no banco.

Documentos relacionados: `tests/AGENTS.md`, `tests/sql/01_validar_nucleo_inicial.sql`, `docs/VALIDACAO_DADOS_DE_TESTE.md`.

## ADR-005

ID: ADR-005

Título: Dados reais de pacientes não são versionados

Data: 2026-07-01

Status: Aceita

Contexto: Dados clínicos e identificáveis são sensíveis.

Decisão: Não versionar dados reais de pacientes, planilhas reais, backups, exports com pacientes ou credenciais.

Consequências: Testes e documentação devem usar dados sintéticos ou metadados não sensíveis.

Alternativas rejeitadas: Versionar amostras reais anonimizadas sem processo formal.

Documentos relacionados: `docs/SEGURANCA_DE_DADOS.md`, `.gitignore`, `AGENTS.md`.

## ADR-006

ID: ADR-006

Título: Banco vem antes de importação completa, API e frontend

Data: 2026-07-01

Status: Aceita

Contexto: O projeto ainda não possui backend, frontend ou importação completa versionados.

Decisão: Validar o banco, o núcleo físico e a estratégia incremental antes da importação completa, API e frontend.

Consequências: As próximas fases dependem de validação do modelo físico e dos testes SQL.

Alternativas rejeitadas: Criar API/frontend antes de estabilizar o modelo físico mínimo.

Documentos relacionados: `docs/PROXIMOS_PASSOS.md`, `docs/ESTADO_ATUAL_DO_PROJETO.md`.

## ADR-007

ID: ADR-007

Título: Documentação obrigatória para mudanças relevantes

Data: 2026-07-01

Status: Aceita

Contexto: O projeto depende de documentação para manter rastreabilidade do modelo e das decisões.

Decisão: Mudanças relevantes devem atualizar documentação afetada e `docs/REGISTRO_DE_ALTERACOES.md`.

Consequências: A definição de pronto inclui documentação atualizada.

Alternativas rejeitadas: Documentar apenas em commits ou deixar documentação para etapa posterior.

Documentos relacionados: `docs/REGISTRO_DE_ALTERACOES.md`, `docs/AGENTS.md`, `AGENTS.md`.

## ADR-008

ID: ADR-008

Título: Conventional Commits em português

Data: 2026-07-01

Status: Aceita

Contexto: O histórico Git precisa ser legível e padronizado.

Decisão: Usar Conventional Commits em português conforme `docs/PADRAO_DE_COMMITS.md`.

Consequências: Commits futuros devem usar prefixos aceitos e mensagem curta em português.

Alternativas rejeitadas: Mensagens livres sem padronização.

Documentos relacionados: `docs/PADRAO_DE_COMMITS.md`, `docs/WORKFLOW_DE_DESENVOLVIMENTO.md`.

## ADR-009

ID: ADR-009

Título: Separação entre avaliação por atendimento e fatos longitudinais do paciente

Data: 2026-07-16

Status: Aceita e implementada por `sql/10_modulo_avaliacao_clinica.sql`

Contexto: O próximo módulo precisa representar medidas coletadas em consulta, AVC prévio, reação adversa, dispositivos implantados e óbito sem duplicar tabelas atuais nem criar atendimentos artificiais para fatos históricos.

Decisão: Vincular `dados_clinicos_atendimento` obrigatória e unicamente a `atendimento`. Vincular `evento_clinico`, `dispositivo_implantado` e `obito` somente a `paciente` na primeira versão. Manter reações adversas atribuídas ao tratamento exclusivamente em `tratamento_chagas`.

Consequências: Medidas preservam sua temporalidade por atendimento; fatos longitudinais podem ser registrados sem atendimento correspondente. A proveniência do atendimento de digitação desses fatos não será armazenada até existir mecanismo próprio de importação/auditoria.

Delimitação adicional: incertezas de unidade, NYHA, formato do ano e semântica de reação adversa serão tratadas na futura importação. Elas não serão convertidas em `CHECK`s ou regras clínicas na migration; campos normalizados permanecem opcionais e os valores originais são preservados.

Alternativas rejeitadas: duplicar `paciente_id` em dados clínicos; tornar `atendimento_id` obrigatório para fatos históricos; adicionar FK opcional de atendimento sem garantia de pertencer ao mesmo paciente; duplicar reações do tratamento em evento clínico.

Documentos relacionados: `docs/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md`, `docs/COBERTURA_COLUNAS_PLANILHA.md`, `docs/MODELO_FISICO_ATUAL.md`.

## ADR-010

ID: ADR-010

Título: Notificação como estado consolidado do paciente

Data: 2026-07-18

Status: Aceita e implementada por `sql/11_modulo_notificacao.sql`

Contexto: As entradas `Paciente notificado?`, `Número notificação` e `Caso não, justifique` precisam de destino estruturado, mas não fornecem data, histórico ou vínculo inequívoco com atendimento.

Decisão: Criar na próxima evolução uma única `notificacao` por paciente, com FK obrigatória para `paciente`, sem `atendimento_id` na primeira versão. Preservar os três valores originais e permitir informação normalizada incompleta ou contraditória. Não impor `CHECK`s condicionais nem unicidade global do número sem evidência.

Consequências: O modelo cobre o estado consolidado disponível e evita uma proveniência clínica artificial. Histórico, retificações e atendimento de digitação não serão representados até existir requisito próprio ou rastreabilidade por importação.

Alternativas rejeitadas: uma linha por atendimento sem origem comprovada; múltiplas linhas sem temporalidade; número globalmente único; rejeição no banco de combinações incompletas; campos sanitários ou operacionais não presentes nas fontes.

Documentos relacionados: `docs/ESPECIFICACAO_MODULO_NOTIFICACAO.md`, `docs/COBERTURA_COLUNAS_PLANILHA.md`, `docs/PROXIMOS_PASSOS.md`.

## ADR-011

ID: ADR-011

Título: Importação e proveniência antes das próximas extensões clínicas

Data: 2026-07-19

Status: Aceita e implementada por `sql/12_modulo_importacao_proveniencia.sql`

Contexto: O schema anterior de 30 tabelas cobria plenamente 114 de 140 entradas. As lacunas clínicas restantes tinham ambiguidades próprias, enquanto responsável pela digitação, cabeçalhos repetidos e preservação da linha original dependiam de uma origem auditável comum.

Decisão: Priorizar como próximo módulo incremental a infraestrutura de importação e proveniência, com lote por execução, linha bruta posicional em array JSONB, responsável legado em texto e associação genérica N:N `importacao_registro`. Reprocessamentos formam cadeia explícita pelo mesmo hash e layout. Não criar entidade `usuario` apenas a partir do nome informado na planilha e não usar FKs clínicas opcionais como substituto de proveniência.

Consequências: A estrutura foi aplicada, mas o importador permanece bloqueado até existir manifesto físico seguro e regras operacionais. O vínculo genérico não possui FK para alvos heterogêneos; existência do alvo será validada transacionalmente e associações órfãs exigirão auditoria futura. Conteúdo bruto não terá purga automática até política institucional de retenção.

Alternativas rejeitadas: iniciar por campos clínicos isolados; tratar responsável legado como usuário autenticado; atribuir toda origem a atendimento; importar antes de definir rastreabilidade; adicionar FK de origem a todas as tabelas; usar triggers dinâmicas para simular FK genérica; guardar cabeçalhos duplicados em objeto JSON.

Documentos relacionados: `docs/ESPECIFICACAO_MODULO_IMPORTACAO_PROVENIENCIA.md`, `docs/COBERTURA_COLUNAS_PLANILHA.md`, `docs/PROXIMOS_PASSOS.md`.

## ADR-012

ID: ADR-012

Título: Associação consolidada entre paciente e projeto

Data: 2026-08-06

Status: Aceita e implementada por `sql/13_associacao_paciente_projeto.sql`

Contexto: A planilha representa participação, pendência e falha em projetos como
estado do paciente. A associação existente `atendimento_projeto_estudo` exige
atendimento e não atende essa cardinalidade sem atribuir o vínculo a uma consulta
específica.

Decisão: Criar futuramente `paciente_projeto_estudo`, única pelo par paciente e
projeto, com estados booleanos anuláveis, detalhes e valores originais. Reutilizar
`projeto_estudo`; mapear variantes de falha para BenBrasil ou EPOCA e registrar a
falha separadamente. Preservar `atendimento_projeto_estudo` sem alteração,
backfill automático ou remoção no MVP.

Consequências: Participação em vários projetos passa a ser representável sem
atendimento artificial. A associação será consolidada, e várias linhas de origem
poderão apontar para o mesmo registro por `importacao_registro`. Reconciliação de
conflitos pertence ao futuro importador.

Alternativas rejeitadas: alterar retroativamente a FK da associação antiga;
duplicar BenBrasil/EPOCA em projetos específicos de falha; vincular a nova relação
a um atendimento opcional; executar backfill sem regra de reconciliação.

Documentos relacionados:
`docs/ESPECIFICACAO_ASSOCIACAO_PACIENTE_PROJETO.md`,
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`,
`docs/MODELO_FISICO_ATUAL.md`.

## ADR-013

ID: ADR-013

Título: Exame canônico por paciente com atendimento opcional

Data: 2026-08-06

Status: Aceita e implementada por `sql/14_exames_por_paciente.sql`

Contexto: O registro atual de exame exige atendimento e não possui paciente. O
novo layout define o paciente como proprietário do exame, aceita atendimento
opcional, múltiplas ocorrências do mesmo tipo e blocos distintos de exames
trazidos e solicitados.

Decisão: Criar `paciente_exame_complementar`, reutilizando o catálogo
de tipos, com paciente obrigatório, atendimento opcional consistente por FK
composta, bloco obrigatório, resultado textual e valores originais. Preservar as
tabelas de exame por atendimento sem backfill ou escrita dupla automática.

Consequências: Novos exames deixam de depender do atendimento de digitação e
podem repetir tipo e bloco. A tabela `atendimento` recebe somente uma chave única
composta redundante para suportar a consistência do vínculo opcional. Manifesto,
aliases, vazio, idempotência e ambiguidades permanecem no importador.

Alternativas rejeitadas: alterar diretamente a tabela legada e exigir backfill;
adicionar apenas uma associação paciente–exame; permitir duas FKs independentes
sem verificar que atendimento pertence ao paciente; deduplicar paciente e tipo;
criar tipos automaticamente a partir de texto livre.

Documentos relacionados:
`docs/ESPECIFICACAO_EVOLUCAO_EXAMES_COMPLEMENTARES.md`,
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`,
`docs/COBERTURA_COLUNAS_PLANILHA.md`.

## ADR-014

ID: ADR-014

Título: Tratamento canônico de BZN por paciente e reações adversas repetíveis

Data: 2026-08-13

Status: Aceita e implementada por `sql/15_tratamento_benzonidazol.sql`

Contexto: `tratamento_chagas` exige atendimento, não limita o BZN a uma linha por
paciente, mistura motivos de não tratamento e resume eventos adversos em uma única
descrição. Alterá-la exigiria reinterpretar registros legados e ainda manteria
semânticas distintas na mesma identidade.

Decisão: Criar `tratamento_benzonidazol`, única por paciente, com atendimento
opcional consistente por FK composta, campos triestados, duração cumprida em dias,
ano aproximado, data de prescrição, motivos separados e valores originais. Criar
`reacao_adversa_benzonidazol` como detalhe repetível, com descrição, gravidade,
data, consequência e valores originais livres. Preservar `tratamento_chagas` sem
alteração, backfill, escrita dupla ou consolidação silenciosa.

Consequências: O MVP terá uma identidade inequívoca do tratamento de BZN por
paciente e poderá registrar reações repetidas sem inventar domínios clínicos.
Conversão, conciliação de várias linhas e contradições permanecem sob
responsabilidade do futuro importador. A estrutura legada continuará consultável
até decisão de transição específica.

Alternativas rejeitadas: alterar diretamente `tratamento_chagas`; inferir e
consolidar registros antigos; usar `medicamento_id` opcional para definir se uma
linha é BZN; armazenar todas as reações em texto único; misturar motivo de não
indicação com motivo de não início; impor domínios de gravidade ou consequência
sem evidência.

Documentos relacionados:
`docs/ESPECIFICACAO_TRATAMENTO_BENZONIDAZOL.md`,
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`,
`docs/COBERTURA_COLUNAS_PLANILHA.md`.

## ADR-015

ID: ADR-015

Título: Ampliação incremental da entidade existente de encaminhamento

Data: 2026-08-13

Status: Aceita e pronta para migration incremental

Contexto: `encaminhamento` já possui identidade própria e atendimento obrigatório,
mas não registra se o documento foi apresentado nem o projeto oficial relacionado.
Cada encaminhamento admite no máximo um projeto, e o projeto é opcional.

Decisão: Alterar incrementalmente `encaminhamento` para adicionar
`documento_apresentado`, `projeto_estudo_id` e valores originais separados. Manter
o atendimento como vínculo obrigatório e único caminho ao paciente. Referenciar
`projeto_estudo` com `ON DELETE RESTRICT`, sem criar tabela canônica paralela,
associação N:N ou `UNIQUE` por atendimento/projeto.

Consequências: A evolução preserva todas as linhas e estruturas atuais; os novos
campos começam nulos e não haverá backfill ou escrita dupla. BenBrasil e EPOCA
continuam projetos distintos. Catálogo, aliases, vazio, ambiguidades, identidade
de reprocessamento e proveniência permanecem sob regras do futuro importador.
Contrarreferência fica fora da migration.

Alternativas rejeitadas: nova tabela canônica para duplicar a ocorrência já
existente; associação N:N para uma cardinalidade máxima de um projeto; adicionar
`paciente_id` redundante; reutilizar um único texto original genérico; deduzir
projeto de campos legados; criar projetos automaticamente.

Documentos relacionados:
`docs/ESPECIFICACAO_ENCAMINHAMENTO_AMPLIADO.md`,
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`,
`docs/COBERTURA_COLUNAS_PLANILHA.md`.
