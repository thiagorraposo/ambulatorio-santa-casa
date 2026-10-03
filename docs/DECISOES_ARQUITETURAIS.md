# Decisões Arquiteturais

Atualizado em: 2026-09-25

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

Documentos relacionados: `docs/ESTADO_ATUAL_DO_PROJETO.md`, `docs/PROXIMOS_PASSOS.md`, `docs/validacoes/VALIDACAO_MODELO_FISICO.md`.

## ADR-002

ID: ADR-002

Título: Migrations antigas não são alteradas

Data: 2026-07-01

Status: Aceita

Contexto: Scripts SQL já foram aplicados ao schema físico atual.

Decisão: Não editar migrations antigas aplicadas. Toda evolução estrutural deve usar nova migration incremental.

Consequências: O histórico permanece auditável e ambientes existentes podem evoluir sem reaplicação destrutiva.

Alternativas rejeitadas: Corrigir scripts antigos diretamente depois de aplicados.

Documentos relacionados: `AGENTS.md`, `sql/AGENTS.md`, `docs/validacoes/VALIDACAO_MODELO_FISICO.md`.

## ADR-003

ID: ADR-003

Título: Schema físico aplicado é validado por dump de estrutura

Data: 2026-07-01

Status: Aceita

Contexto: A documentação precisa diferenciar estrutura planejada, migrations e estrutura realmente aplicada.

Decisão: Usar `docs/evidencias/schema_atual_ambulatorio.sql` como principal evidência do schema físico aplicado.

Consequências: Comparações futuras devem considerar esse dump estrutural como fonte prioritária para o estado físico aplicado.

Alternativas rejeitadas: Inferir o estado físico somente pelas migrations.

Documentos relacionados: `docs/evidencias/schema_atual_ambulatorio.sql`, `docs/MODELO_FISICO_ATUAL.md`, `docs/validacoes/VALIDACAO_MODELO_FISICO.md`.

## ADR-004

ID: ADR-004

Título: Testes SQL usam dados temporários e rollback

Data: 2026-07-01

Status: Aceita

Contexto: Testes de integridade devem ser repetíveis e não podem poluir o banco.

Decisão: Testes SQL devem usar dados sintéticos, transação explícita e `ROLLBACK` quando adequado.

Consequências: A validação pode ser repetida sem deixar registros de teste persistidos.

Alternativas rejeitadas: Inserir dados permanentes de validação no banco.

Documentos relacionados: `tests/AGENTS.md`, `tests/sql/01_validar_nucleo_inicial.sql`, `docs/validacoes/VALIDACAO_DADOS_DE_TESTE.md`.

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

Documentos relacionados: `docs/arquitetura/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md`, `docs/dados/COBERTURA_COLUNAS_PLANILHA.md`, `docs/MODELO_FISICO_ATUAL.md`.

## ADR-010

ID: ADR-010

Título: Notificação como estado consolidado do paciente

Data: 2026-07-18

Status: Aceita e implementada por `sql/11_modulo_notificacao.sql`

Contexto: As entradas `Paciente notificado?`, `Número notificação` e `Caso não, justifique` precisam de destino estruturado, mas não fornecem data, histórico ou vínculo inequívoco com atendimento.

Decisão: Criar na próxima evolução uma única `notificacao` por paciente, com FK obrigatória para `paciente`, sem `atendimento_id` na primeira versão. Preservar os três valores originais e permitir informação normalizada incompleta ou contraditória. Não impor `CHECK`s condicionais nem unicidade global do número sem evidência.

Consequências: O modelo cobre o estado consolidado disponível e evita uma proveniência clínica artificial. Histórico, retificações e atendimento de digitação não serão representados até existir requisito próprio ou rastreabilidade por importação.

Alternativas rejeitadas: uma linha por atendimento sem origem comprovada; múltiplas linhas sem temporalidade; número globalmente único; rejeição no banco de combinações incompletas; campos sanitários ou operacionais não presentes nas fontes.

Documentos relacionados: `docs/arquitetura/ESPECIFICACAO_MODULO_NOTIFICACAO.md`, `docs/dados/COBERTURA_COLUNAS_PLANILHA.md`, `docs/PROXIMOS_PASSOS.md`.

## ADR-011

ID: ADR-011

Título: Importação e proveniência antes das próximas extensões clínicas

Data: 2026-07-19

Status: Aceita e implementada por `sql/12_modulo_importacao_proveniencia.sql`

Contexto: O schema anterior de 30 tabelas cobria plenamente 114 de 140 entradas. As lacunas clínicas restantes tinham ambiguidades próprias, enquanto responsável pela digitação, cabeçalhos repetidos e preservação da linha original dependiam de uma origem auditável comum.

Decisão: Priorizar como próximo módulo incremental a infraestrutura de importação e proveniência, com lote por execução, linha bruta posicional em array JSONB, responsável legado em texto e associação genérica N:N `importacao_registro`. Reprocessamentos formam cadeia explícita pelo mesmo hash e layout. Não criar entidade `usuario` apenas a partir do nome informado na planilha e não usar FKs clínicas opcionais como substituto de proveniência.

Consequências: A estrutura foi aplicada. O bloqueio técnico original foi encerrado
com o manifesto físico v1 e a especificação normativa do importador v1; o
importador sintético pode ser implementado. O vínculo genérico não possui FK para
alvos heterogêneos; existência do alvo será validada transacionalmente e
associações órfãs exigirão auditoria futura. Conteúdo bruto não terá purga
automática até política institucional de retenção, o que bloqueia dados reais.

Alternativas rejeitadas: iniciar por campos clínicos isolados; tratar responsável legado como usuário autenticado; atribuir toda origem a atendimento; importar antes de definir rastreabilidade; adicionar FK de origem a todas as tabelas; usar triggers dinâmicas para simular FK genérica; guardar cabeçalhos duplicados em objeto JSON.

Documentos relacionados: `docs/arquitetura/ESPECIFICACAO_MODULO_IMPORTACAO_PROVENIENCIA.md`, `docs/dados/COBERTURA_COLUNAS_PLANILHA.md`, `docs/PROXIMOS_PASSOS.md`.

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
`docs/arquitetura/ESPECIFICACAO_ASSOCIACAO_PACIENTE_PROJETO.md`,
`docs/dados/DECISOES_HUMANAS_NOVA_PLANILHA.md`,
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
`docs/arquitetura/ESPECIFICACAO_EVOLUCAO_EXAMES_COMPLEMENTARES.md`,
`docs/dados/DECISOES_HUMANAS_NOVA_PLANILHA.md`,
`docs/dados/COBERTURA_COLUNAS_PLANILHA.md`.

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
`docs/arquitetura/ESPECIFICACAO_TRATAMENTO_BENZONIDAZOL.md`,
`docs/dados/DECISOES_HUMANAS_NOVA_PLANILHA.md`,
`docs/dados/COBERTURA_COLUNAS_PLANILHA.md`.

## ADR-015

ID: ADR-015

Título: Ampliação incremental da entidade existente de encaminhamento

Data: 2026-08-13

Status: Aceita e implementada por `sql/16_encaminhamento_ampliado.sql`

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
`docs/arquitetura/ESPECIFICACAO_ENCAMINHAMENTO_AMPLIADO.md`,
`docs/dados/DECISOES_HUMANAS_NOVA_PLANILHA.md`,
`docs/dados/COBERTURA_COLUNAS_PLANILHA.md`.

# ADR-016

ID: ADR-016

Título: Hardening operacional antes de dados reais

Data: 2026-08-26

Status: Aceita e implementada por `sql/17_hardening_operacional.sql`

Decisão: manter owner apenas para manutenção; usar roles sem login para
importador e aplicação; negar DDL/DELETE ao importador e conteúdo bruto à
aplicação; executar preflight no pipeline real sob rollback; versionar
manifesto/importador/Git; emitir logs JSON de allowlist; validar em CI sintético.

Consequências: há menor privilégio, rastreabilidade e revisão antes da escrita,
mas dados reais continuam bloqueados até decisões de ambiente protegido, TLS,
segredos, retenção, backup, auditoria e responsáveis institucionais.

## ADR-017

ID: ADR-017

Título: Fundação NestJS como monólito modular com SQL explícito

Data: 2026-08-26

Status: Aceita e implementada na Etapa 4A

Decisão: estruturar o backend como monólito modular NestJS; separar controller,
service, repository e DTO; usar `pg` com SQL parametrizado contra o schema
existente; manter migrations exclusivamente fora da API; conectar por login
técnico que assume obrigatoriamente `ambulatorio_aplicacao`.

Consequências: o fluxo HTTP até PostgreSQL fica comprovado com baixo acoplamento
e sem autoridade de schema duplicada. Identidade e autorização foram adicionadas
incrementalmente na Etapa 4B; endpoints clínicos de escrita continuam ausentes.

Alternativas rejeitadas: ORM com sincronização automática; microserviços antes
de existirem fronteiras operacionais; uso do owner; SQL em controllers/services.

Documento relacionado: `docs/ARQUITETURA_BACKEND.md`.

## ADR-018

ID: ADR-018

Título: JWT curto com identidade ativa relida e autorização global por perfil

Data: 2026-08-30

Status: Aceita e implementada na Etapa 4B

Decisão: modelar usuário funcional independente; usar bcrypt para credenciais e
JWT Bearer HS256 expirável com secret obrigatório do ambiente; não persistir
tokens; reler usuário ativo e perfil em cada requisição; aplicar guards globais
com negação por padrão e exceções públicas explícitas.

Consequências: inativação e mudança de perfil são imediatas, e o backend pode ser
consumido pelo futuro React sem impor armazenamento no navegador. Revogação
individual fica adiada até existir encerramento antecipado de sessão como
requisito; TLS e rate limit distribuído pertencem à implantação futura.

Alternativas rejeitadas: sessão persistida prematuramente; mecanismo criptográfico
próprio; perfil ligado a role PostgreSQL; autenticação opt-in por controller.

Documento relacionado: `docs/ARQUITETURA_BACKEND.md`.

## ADR-019

ID: ADR-019

Título: Isolamento transacional do contexto PostgreSQL da aplicação

Data: 2026-08-31

Status: Aceita e implementada na Etapa 4C

Decisão: executar cada operação de repository em transação com `SET LOCAL ROLE
ambulatorio_aplicacao` e `SET LOCAL search_path`; finalizar por `COMMIT` ou
`ROLLBACK` e destruir a conexão se a limpeza falhar.

Consequências: role e `search_path` não permanecem na sessão devolvida ao pool;
falhas de consulta não permitem reutilizar conexão em estado transacional
incerto. A API continua sem ownership, DDL, proveniência ou elevação.

Alternativas rejeitadas: confiar apenas em `RESET ROLE` no `finally`, que não
limpa todo estado de sessão e poderia devolver conexão após falha de limpeza.

Documento relacionado: `docs/validacoes/VALIDACAO_ETAPA_4C.md`.

## ADR-020

ID: ADR-020

Título: Promoção controlada de pendências por chave semântica

Data: 2026-09-21

Status: Aceita e implementada para D11 na v1.2.0

Contexto: o reprocessamento do mesmo conteúdo e layout reutiliza corretamente os
alvos de linhas importadas, mas também encerra `importada_com_pendencia` antes dos
handlers. Assim, uma evolução aprovada do contrato não consegue promover campos
antes preservados somente no bruto.

Decisão: separar a reutilização integral de `importada` da promoção de
`importada_com_pendencia`. Cada chave promovível terá registro versionado e
validado contra o manifesto, handler específico, destinos permitidos, âncora e
política de reconciliação. A promoção reutilizará paciente, atendimento e alvos
da proveniência, executará somente esses handlers e isolará as novas escritas em
savepoint. Valor divergente, edição manual não distinguível ou destino repetível
sem identidade aprovada permanecerá pendente, sem sobrescrita ou duplicação.

Consequências: evoluções do contrato podem completar uma linha do mesmo arquivo
sem criar outra visita nem repetir seus demais destinos. Manifesto sozinho não
habilita promoção. D11 é a primeira chave registrada e dez chaves continuam
parciais até aprovação individual. A auditoria mínima usa proveniência por alvo e
nomes técnicos em `mensagem_processamento`; auditoria por campo poderá exigir
evolução futura.

Alternativas rejeitadas: reexecutar todos os handlers; criar outro atendimento;
habilitar automaticamente toda chave que mudar de cobertura; reconciliar destinos
repetíveis por texto; sobrescrever valor clínico divergente.

Documento relacionado: `docs/ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md`.

## ADR-021

ID: ADR-021

Título: Criticidade conservadora e explícita por regra do importador

Data: 2026-09-22

Status: Aceita e implementada inicialmente na v1.3.0

Contexto: `RowConflict` trata de forma idêntica falhas que invalidam a identidade
da linha e ausências em destinos dependentes. O contrato já permite preservar um
atendimento válido quando somente um destino secundário requer revisão, mas uma
captura genérica poderia confirmar escrita parcial indevida.

Decisão: erros são críticos por padrão. Uma falha somente pode gerar
`importada_com_pendencia` quando constar de registro versionado com handler,
destino, âncora e estratégia de nova tentativa. A primeira regra é
`catalogo_projeto_ausente`: mantém paciente, atendimento e demais destinos, não
cria catálogo e tenta novamente apenas a associação afetada no reprocessamento.

Consequências: o comportamento não é flexibilizado em bloco; identidade, datas
primárias, contexto, divergências consolidadas, proveniência e erros operacionais
continuam causando rollback. Cada nova regra não crítica exige contrato e testes
próprios. Mensagens persistem somente códigos técnicos; valores permanecem no
bruto e fora dos logs.

Alternativas rejeitadas: capturar qualquer `RowConflict` e continuar; classificar
todos os catálogos ausentes da mesma forma; criar catálogo automaticamente; ou
reexecutar a linha completa e gerar outro atendimento.

Documento relacionado: `docs/ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md`.

## ADR-022

ID: ADR-022

Título: Revisão entre hashes com identidade explícita e correção auditada

Data: 2026-09-22

Status: Barreira de finalidade implementada na v1.4.0; extensão física
especificada em 2026-09-25, ainda não aplicada; reconciliação pendente

Contexto: D8 confirma que a planilha atualiza a linha do paciente e guarda apenas
o último ano de comparecimento. A v1.3.0 identifica conteúdo por hash/layout e
pode criar outra visita para um arquivo revisado; o predecessor existente aceita
somente o mesmo hash/layout, e a proveniência por alvo não registra história de
campo suficiente para autorizar correções.

Decisão: separar finalidade do arquivo, identidade do paciente, ocorrência e
revisão. Exigir relação com a base, mapeamento explícito e decisão auditada por
campo; distinguir correção, nova visita e atualização consolidada. Novo hash,
posição, nome/nascimento ou data isolada não autorizam criar ocorrência. Comparar
base, estado atual e proposta, preservar edições manuais e bloquear ambiguidades.
Manter a FK de reprocessamento inalterada e representar revisão entre conteúdos
separadamente, com evolução incremental de auditoria antes de permitir correções.

Detalhamento de 2026-09-25: a especificação relacionada define nove relações
para fonte, linhagem, autorização por fonte, decisão/mapeamento versionado,
campos aprovados, tentativas, alvos resolvidos e catálogo/histórico de campos.
Manter aprovação separada dos papéis de importação/aplicação, revogar privilégios
padrão nas novas relações e revalidar autoria e estado sob bloqueio. Histórico
deve cobrir todos os escritores; marco atual não reconstrói história legada nem
permite sobrescrita por igualdade aparente. Entregar armazenamento fechado antes
da captura e do executor. As entidades, invariantes e aceites têm uma única
fonte na seção “Extensão física mínima proposta” do contrato temporal.

Consequências: a v1.4.0 exige finalidade explícita, recusa revisão antes de escrita
e preserva carga sintética declarada, no-op, retomada e reprocessamento do mesmo
hash/layout. A declaração não comprova nova ocorrência e não muda a cobertura do
manifesto. A reconciliação depende de linhagem, decisões e
histórico de campo persistentes. Ano legado continua bruto até contrato próprio,
sem datas artificiais ou reconstrução de visitas.

Decisão de governança, 2026-10-03, delegada pelo responsável do projeto para
fechar a 5A: competência para registrar fontes e conceder/revogar autorizações
será um entitlement nominal separado do perfil funcional. O perfil
`administração` não concede gestão por si só. O entitlement será provisionado e
revogado fora da API por operador de banco designado; toda concessão/revogação
preserva principal e instante. Ser gestor não concede automaticamente
autorização clínica por fonte: essa continua explícita, atribuível e revogável.
Não foi definida uma lista de pessoas nem uma concessão para dados reais.
O mecanismo se aplica aos testes e à operação sintética; qualquer provisionamento
real continua sujeito ao processo institucional de implantação.

Alternativas rejeitadas: tratar novo hash como nova consulta; vincular versões por
número de linha; impor unicidade por paciente/data; aplicar o arquivo mais recente
por cima do banco; preencher `NULL` sem história de campo; inferir visitas de um
intervalo de anos; usar a FK de mesmo conteúdo ou mensagem livre como auditoria de
revisão entre hashes.

Implementação sintética incremental: migrations 29–30 separam gestão de
autorização em papel NOLOGIN sem membros automáticos. O ator é obtido do ledger
autenticado da transação, não de parâmetro do gestor. A integridade diferida usa
dono técnico restrito para validar commits sem expor tabelas aos operadores;
privilégios de identidade excluem `senha_hash`. Esse mecanismo não atribui
responsabilidade institucional por perfil nem habilita revisão clínica. Concessão
de papéis e aceite integrado continuam portas distintas da implementação.
Migrations 31–34 publicam plano/decisão atomicamente, com hash canônico do
servidor, snapshots/tokens observados e entrada normalizada. Mantêm as barreiras
de correção/anulação até haver prova de cobertura, sem habilitar executor.
Migrations 35–39 acrescentam `revisao_artefato` e
`importacao_revisao_preparacao`: os bytes originais são preservados, não apenas
um hash impossível de recuperar. Versão de transformação é única e imutável,
para impedir executáveis diferentes sob o mesmo identificador. Um catálogo
fechado de transformações verifica os envelopes e todos os destinos derivados
dos campos alterados; não interpreta SQL fornecido por operadores. A prova desde
a base exige evento inicial de importação e proveniência da linha/registro; um
marco posterior permanece insuficiente. Essas escolhas são técnicas, compatíveis
com a ADR-022, e não são novas respostas humanas. Ainda faltam aplicação integral,
continuidade da prova através das revisões aplicadas e aceite de todos os casos.

Migrations 40–42 compartilham a avaliação de decisão com o executor privado.
A simulação recebe identidade apenas da camada autenticadora confiável em vez
de escrever contexto, permitindo READ ONLY sem consumo de sequências. Aplicação
usa o ledger real e revalida sob bloqueios. EXECUTE do executor não é concedido
antes do aceite integrado; testes do mantenedor em fixtures não ativam revisão
para os papéis operacionais. Resolução de alvos existentes não homologa criação,
fechamento ou simulação de arquivo novo. Trata-se de escolha técnica, não clínica.

Documento relacionado:
[`arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md`](arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md).

## ADR-023

Data: 2026-10-03

Decisão: versionar os contratos HTTP em `/v1`, mantendo as rotas atuais como
aliases dos mesmos controllers/DTOs/guards. O monitoramento de lotes reutiliza
os vínculos clínicos existentes, sem criar uma ACL concorrente à de pacientes:
administração lê metadados sanitizados ordinários; consulta/edição exigem
proveniência íntegra e vínculo ativo com todos os pacientes do lote. Lotes
revisados são excluídos da consulta ordinária. A política de paciente
`todos_sinteticos` não amplia o escopo dos lotes.

Justificativa: manter compatibilidade dos clientes e aplicar autorização por
recurso antes da paginação. Cabeçalho/linhas são projetados em uma consulta SQL
para preservar o mesmo snapshot. O resolvedor privado usa destinos permitidos;
o ator vem do ledger autenticado, sem leitura operacional direta da proveniência.
São escolhas técnicas para 5D/5E, sem nova resposta clínica ou designação real.

Consequências: versões não publicadas retornam 404; lote existente fora do
escopo retorna 403. Linhas sem âncora suficiente, lote misto inacessível e
vínculo revogado impedem o acesso ao lote inteiro para consulta/edição.
Lotes com erro sem proveniência permanecem consultáveis pela administração.

## ADR-024

ID: ADR-024

Título: Protótipo Figma Make como referência de interface subordinada aos contratos

Data: 2026-10-03

Status: Diretriz definida no planejamento; integração não implementada

Decisão: usar o código do Figma Make como referência visual e funcional,
reaproveitando apresentação após revisão e adaptando fluxos aos contratos `/v1`.
Preservar o monólito modular, as fronteiras clínicas, a autorização por recurso,
as transações, versões e proveniência. O modelo e o contexto local do protótipo
não constituem contrato de API, persistência ou mecanismo de autorização.

Construir uma aplicação React/TypeScript própria em `frontend/`, com sessão,
consultas por recurso e rascunhos de formulário separados. O frontend usa somente
contratos públicos, sem importar entidades SQL ou classes internas do backend.
Autorização, transformações clínicas e atomicidade permanecem no servidor.

O protótipo fica em `referencias/frontend/figma-make-prototipo/`, como material de
apoio à integração. Não integra o build ou a implantação da aplicação; elementos
aproveitados devem ser revisados e incorporados ao código de `frontend/`.

Justificativa: o protótipo simula operações, omite recursos já suportados e exibe
ações sem contrato HTTP. Sua reprodução integral introduziria perda de dados,
classificações indevidas e divergências das regras vigentes.

Consequências: a fundação React deve começar por sessão, busca e ficha com APIs
existentes. Recursos sem suporte ficam como pendência explícita; evolução de API
exige necessidade funcional e justificativa própria, e evolução estrutural segue
migration incremental. A organização de `frontend/`, as bibliotecas e o fluxo de
implementação detalhados na análise orientam a Etapa 6; bibliotecas, versões e
toolchain ainda serão escolhidos na 6A. Nenhuma dessas alterações foi implementada.

Documentos relacionados:
[análise e planejamento da integração](arquitetura/ANALISE_INTEGRACAO_FIGMA_MAKE.md)
e [sequência oficial de execução](PROXIMOS_PASSOS.md#etapa-6--fundação-do-frontend).
