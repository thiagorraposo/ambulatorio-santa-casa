# Roadmap do Projeto

Atualizado em: 2026-10-27

**Continuidade de 2026-10-15:** as sete lacunas da reauditoria de 05/10 receberam
correções de código e novas provas sintéticas. O percurso integrado original 7D
passou pela interface e a regressão técnica foi concluída. A revisão clínica com
a equipe continua necessária ao aceite integral. Evidências atuais estão no
[relatório da Etapa 7](validacoes/VALIDACAO_ETAPA_7.md); o
[relatório de 05/10](historico/RELATORIO_ETAPA_7_2026_10_05.md) preserva a
fotografia anterior. Pacotes adicionais de UX/VU1 mantêm decisões e aceites próprios.

Este é o roadmap oficial do projeto. Em 2026-10-23, o responsável pelo
produto definiu como objetivo chegar ao **protótipo como produto completo**.
O recorte enxuto anterior deixa de ser a referência de conclusão. O objetivo
inclui funcionalidades, experiência de uso e fidelidade visual, com persistência,
autorização e comportamento real nos lugares em que o protótipo usa simulação.

A numeração das dez etapas e os IDs de pacotes são preservados. Etapas 1–6
mantêm seus aceites históricos sintéticos; 7A–7D mantêm a validação técnica do
recorte original, sem aceite clínico. A ampliação não declara código entregue,
não reabre esses aceites e não libera dados reais.

As decisões de negócio vigentes estão em
[`dados/DECISOES_HUMANAS_NOVA_PLANILHA.md`](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md),
as lacunas por camada em
[`dados/COBERTURA_COLUNAS_PLANILHA.md`](dados/COBERTURA_COLUNAS_PLANILHA.md) e o
estado técnico em [`ESTADO_ATUAL_DO_PROJETO.md`](ESTADO_ATUAL_DO_PROJETO.md).
Prioridades P0–P3 indicam ordem/criticidade, não retirada do produto completo:
P0 bloqueia o fluxo afetado, P1 é necessária ao marco inicial, P2 é importante
e P3 pode vir depois desse marco, mas antes da conclusão quando incluída abaixo.

## Referência de conclusão — produto completo

A [matriz Figma/frontend](frontend/MATRIZ_FIGMA_FRONTEND.md) é o inventário
ponto a ponto; a [visão de produto](frontend/VISAO_E_ESPECIFICACAO.md) descreve
os comportamentos pretendidos. Todo requisito não excluído deve ter pacote,
contrato quando necessário, implementação, evidência e aceite. Campos e fluxos
pedidos no texto original e inventariados também entram, mesmo quando não foram
gerados no protótipo executável. Ausência de API é trabalho a realizar.

**Destinos:** VU1 é um marco intermediário sintético; MVP identifica a antiga
fatia operacional; PC substitui o antigo VP e significa **produto completo,
obrigatório antes da entrega final**. VU1, MVP e PC estão todos incluídos no
objetivo atual. EX permanece exclusão justificada por regra clínica, segurança
ou limite explícito do produto, não por custo ou falta de contrato.

P-01/P-03–P-09 continuam identificando decisões de comportamento, dados,
segurança e desenho. A inclusão das famílias de recursos está decidida nesta
revisão; não depende mais de promoção de VP ao MVP. As escolhas específicas
não respondidas continuam abertas e bloqueiam somente a implementação afetada.
Nenhuma semântica clínica é inferida pela autorização de escopo.

### Marcos e dependências de entrega

| Marco | Conteúdo e critério de saída | Estado em 27/10 |
| --- | --- | --- |
| M1 — Fluxo original revisado | Executar roteiro clínico, registrar parecer, corrigir impedimentos e validar novamente os pontos afetados. | Aprovado em 2026-10-26, conforme confirmação do responsável do projeto; sem impedimentos reportados. |
| M2 — VU1 sintética | Entregar 7A-U1, 7D-U1/U2/U4.2, verificar evidências U3/U4.1 e recuperação nas operações usadas; aceitar 7D-A1 com a equipe. | 7A-U1, 7D-U1/U2 e o cenário positivo 7D-A1 validados tecnicamente; CI dos quatro jobs do PR A1 aprovado (run `40442560575`). U4.2 tem implementação/validação parcial e comparação visual pendente. Aceite humano permanece pendente. Recorte de trabalho definido em 26/10; escolhas fora desse recorte permanecem abertas. |
| M3 — Produto completo em ambiente sintético | Concluir todas as famílias 7B-E/7C-E e 8A–8D incluídas, correção 7C-R2B/U, comparação visual 8V1 e aceite integral 8V2. | Implementações adicionais, decisões e aceites pendentes. |
| M4 — Operação institucional | Concluir 9A–9D: implantação, segurança, continuidade e liberação explícita para dados reais. | Futuro; não é consequência automática de M3. |
| M5 — Produto completo entregue | Concluir 10A–10D, reconciliar migração autorizada, resolver defeitos impeditivos e registrar release/aceite final. | Futuro; conclusão do objetivo depende de M3, M4 e M5. |

### Cobertura obrigatória e ordem de trabalho

| Frente | Pacotes preservados | Entrega obrigatória e dependências |
| --- | --- | --- |
| Experiência clínica inicial | 7A-U1; 7D-U1/U2/U3/U4; 7D-A1 | Busca antes do cadastro, etapas, revisão, ficha temporal, navegação e acessibilidade. Concluir M1/M2; reaproveitar provas técnicas existentes sem presumir aceite humano. |
| Correção de pendência | 7C-R2B/U | Permitir retorno ao estado desconhecido com contrato PATCH explícito; depende da semântica e auditoria de 8A3B. Pode ocorrer após M2, obrigatório em M3. |
| Cobertura clínica completa | 7B-E1B/U a 7B-E7B/U | Sorologias, condições/complicações, comorbidades, eventos/dispositivos/óbito, medicamentos, resultados de exames e correções dos filhos do atendimento. Cada contrato/persistência precede sua interface. |
| Tratamento e acompanhamento | 7C-E1B/U, E2B/U, E4B/U, E5D/B/U | Correção de BZN/reações e encaminhamentos; concorrência de projeto/notificação; planejamento/desfecho D9 separado de visitas. E5 depende da decisão semântica P-06. |
| Exportação e pendências | 8A1; 8A2D/B/U; 8A3B/U | CSV autorizado, fila global e revisão auditável. Definir grupos/responsáveis em P-04 antes dos contratos e telas. |
| Início, dashboard e busca | 8B1D/B/U; 8B2B/U; 8B3D/B/U | Indicadores, atividade recente, séries, origem/projetos, timeline, filtros e colunas. Incluir todas as unidades; P-05 define fórmulas, população, períodos e semântica de origem antes do backend. |
| Importação e documentos | 8C1; 8C2B/U; 8C3D/B/U; 8C4D/B/U; 8C5B/U | Lotes, simulação/relatório, confirmação, conflitos autorizados, anexos, reprocessamento e revisão temporal. Incluir todas as unidades; decisões P-04/P-05/P-07/P-09 e autorização por fonte precedem os comandos afetados. |
| Identidade e administração | 8D1D/B/U; 8D2B/U | Usuários, conta ampliada, perfil e ativação/inativação com auditoria, concorrência e revalidação de sessão. P-08 define política antes dos comandos. |
| Fidelidade e integração integral | 8V1; 8V2 | Comparar todas as telas/estados com a referência e aceitar percursos completos com API/PostgreSQL sintéticos; concluir antes de M3. |
| Implantação e entrega | 9A–9D; 10A–10D | Ambiente, HTTPS/segredos, restore, governança, migração autorizada, homologação e release do produto completo. |

Dentro de cada frente, executar decisões → contrato/dados → backend → interface
→ prova integrada → aceite. Frentes independentes podem avançar após suas
próprias dependências; a tabela não exige um pacote monolítico. As extensões
clínicas devem integrar formulário, revisão, ficha e histórico, não apenas
adicionar endpoints ou telas isoladas. Controles compartilhados e recuperação
devem cobrir também os novos módulos.

### Medição de avanço

Os antigos 65% e a referência de aproximadamente 20 entregas não medem este
escopo ampliado. Não há novo percentual ou total de unidades fechado nesta
revisão: pacotes agregam unidades e decisões ainda precisam delimitar seus
contratos. Acompanhar por marco e por requisito/unidade: planejado, decisão
pendente, implementado, validado tecnicamente e aceito. A matriz conserva a
fotografia histórica; novas evidências devem citar IDs e atualizar o estado
pertinente. Quantidade de etapas não equivale a esforço nem a prazo.

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

**Evolução posterior:** a homologação original não cobria integralmente as novas
respostas D1–D12. A Etapa 5 acrescentou reconciliação BZN, promoções controladas,
contratos aprovados e revisão temporal. A política não crítica continua restrita
ao catálogo explicitamente permitido; outros erros permanecem críticos por
padrão. Isso não reabre a Etapa 2 concluída nem autoriza inferir valores ambíguos.

## Etapa 3 — Fundação do backend — concluída

**Objetivo:** deixar de manipular o banco diretamente.

**Entrega realizada:** projeto NestJS, Docker, configuração por ambiente,
camada SQL parametrizada, migrations fora da API, autenticação, usuários,
perfis, erros padronizados, logging sem dados clínicos sensíveis e healthcheck.

**Limite da entrega original:** escrita clínica HTTP, importação e autorização
por paciente/atendimento foram acrescentadas na Etapa 5. A fundação não foi refeita.

## Etapa 4 — CRUD clínico — concluída na camada física, não na API

**Objetivo original:** refletir os fluxos clínicos necessários, sem criar um
endpoint por tabela.

**Entrega realizada:** núcleo físico e migrations até `sql/20`, incluindo
pacientes, atendimentos, dados clínicos, projetos, exames, BZN, reações,
encaminhamentos e notificações.

**Esclarecimento de escopo:** a entrega original concluía a camada física.
A implementação HTTP desses fluxos foi concluída na Etapa 5, sem atribuí-la
retroativamente à Etapa 4.

## Etapa 5 — Recursos funcionais e backend clínico do MVP

**Status:** 5A–5E concluídas no ambiente sintético em 2026-10-03. Provas,
limites e ativação controlada estão na [matriz de aceite](validacoes/ACEITE_INTEGRADO_ETAPA_5.md).

**Objetivo:** fechar o backend utilizável, incorporando as regras confirmadas e
os recursos necessários para a interface.

### 5A — Fechar contratos funcionais e invariantes (P0/P1)

**Avanço em 2026-09-22:** definido o
[contrato temporal de revisão entre hashes](arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md)
(ADR-022), distinguindo correção, nova visita e atualização consolidada. Em
2026-09-28, as respostas de [respostas clínicas originais](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md#respostas-clínicas-originais-de-28092026)
foram incorporadas como referência autoritativa para idade, Chagas, familiares,
exames e retorno de 30 dias. A implementação técnica desses contratos continua
separada da decisão clínica.

**Situação de aceite:** concluída para o ambiente sintético em 2026-10-03.
Respostas clínicas D1–D6, invariantes da ADR-022 e impactos foram conferidos
contra as fontes autoritativas e documentados. Por delegação expressa do
responsável, a competência de gestão foi definida como entitlement explícito por
usuário, provisionado externamente e independente do perfil `administração`;
gerir não concede autorização clínica por fonte. Migration 55, rotas e testes
sintéticos implementam e comprovam essa regra. Não resta decisão humana para
desbloquear a implementação sintética. Designar pessoas em ambiente real pertence
ao processo institucional de implantação e não habilita a revisão nesta etapa.

- **Objetivo:** congelar o escopo e resolver somente as ambiguidades que afetam implementação.
- **Principais alterações:** consolidar as respostas de idade, descoberta de Chagas, familiares, exames e retorno BZN; implementar as invariantes sem inferir fatos ausentes; manter ADR-022 e o backlog de contrarreferência nos limites aprovados.
- **Dependências:** schema/código existentes, implementação física restante e aceite técnico da ADR-022.
- **Critérios de aceite:** contratos decididos ou explicitamente adiados; nenhuma data inventada; nenhuma regra clínica inferida; modelo existente avaliado antes de propor migration.
- **Validação:** revisão com a equipe, matriz de impacto atualizada e `make docs-check`.

### 5B — Corrigir importador e reprocessamento (P0/P1)

**Status:** concluída no ambiente sintético; aceite integrado aprovado.
BZN consolidado é reconciliado sem duplicação, promoções aprovadas têm âncoras
explícitas e rollback, e dois elos de reprocessamento preservam proveniência.
D2 só preenche NULL capturado desde a base sem edição posterior, sob lock do
alvo; legado desconhecido/divergência/A→B→A são preservados. D3/D8 e retornos BZN
mantêm conversão seletiva e precisão correta. Manifesto, gerador, validador e
fixtures permanecem coerentes; valores ambíguos ficam no bruto.

A revisão entre hashes tem fluxo HTTP separado: fonte/autorização, dry-run sem
persistência, XLSX inteiro, aprovação seletiva, aplicação única e encerramento.
Não transforma hash novo em consulta. Migrations 21–62 completam armazenamento,
integridade, captura/proteção, criação de alvos e consistência do simulador.
A 63 concede somente três wrappers à role dedicada após o aceite integrado.
Código, casos F01–F16/T01–T18, logs e limites constam da
[matriz de aceite](validacoes/ACEITE_INTEGRADO_ETAPA_5.md).

- **Objetivo:** eliminar duplicação e perda de promoção nos fluxos já suportados.
- **Principais alterações:** reconciliar BZN consolidado por paciente; promover pendências resolvidas sem recriar alvos; separar erros críticos de não críticos; aplicar a política aprovada a arquivos revisados; atualizar metadados semânticos do gerador/manifesto/validador em conjunto.
- **Dependências:** a reconciliação BZN usa a unicidade existente; os demais itens dependem de 5A.
- **Critérios de aceite:** duas linhas compatíveis não violam unicidade nem duplicam tratamento; conflitos não sobrescrevem fatos; proveniência permanece íntegra; novo hash não é tratado automaticamente como nova consulta.
- **Validação:** testes unitários, fixture e E2E sintéticos com BZN repetido, conflito, pendência promovida e dois elos de reprocessamento.

### 5C — Completar modelagem indispensável (P1)

**Status:** concluída no ambiente sintético; aceite integrado aprovado.
Migrations 25/28 representam rastreio familiar triestado com resultados
identificados e data própria de descoberta de Chagas. A 61 habilita somente
captura prospectiva da descoberta, sem preencher legado ou inventar história.
Retornos, pendências e contrarreferências reutilizam estruturas existentes;
nenhuma tabela foi criada apenas pela palavra usada na pergunta. FKs,
permissões e integridade são comprovadas pelas suites SQL e instalação
limpa/incremental descritas na matriz de aceite.

- **Objetivo:** estruturar apenas fatos que o modelo atual não consegue representar.
- **Principais alterações:** migration incremental mínima para data de descoberta de Chagas e rastreio familiar, após 5A; não criar tabelas próprias para retornos, pendências ou contrarreferências apenas pela existência dessas palavras.
- **Dependências:** contratos de 5A; migrations antigas permanecem imutáveis.
- **Critérios de aceite:** ausência, negativo e desconhecido distinguíveis; resultado de familiar não vira histórico de doença; FKs, permissões e histórico preservados; nenhuma alteração física sem justificativa documentada.
- **Validação:** testes SQL sintéticos com `BEGIN`/`ROLLBACK`, `make db-test`, `make project-check` e dump somente se o schema mudar.

### 5D — Implementar recursos de consulta e importação (P1)

**Status:** concluída no ambiente sintético; aceite integrado aprovado.
Cadastro/consulta/edição de paciente completo e atendimentos, diagnóstico,
familiares, exames, BZN/reações/retornos, projetos, notificação, encaminhamentos,
contrarreferências múltiplas, fatos anuais e pendências têm fluxos de negócio.
Busca/filtros, coleções aninhadas e CSV seguem autorização por recurso e vínculo.
Importação multipart com worker separado e acompanhamento sanitizado de
lotes/erros estão implementados. Revisão XLSX passa por simulação, recebimento,
aprovação, aplicação e encerramento, sem acesso direto do usuário ao banco.
Artefatos técnicos são previamente registrados pelo mantenedor.
DTOs explícitos, SQL parametrizado, paginação e transações foram validados por
HTTP/SQL com os três perfis. A matriz de aceite relaciona os cenários e logs.

- **Objetivo:** entregar o backend funcional previsto na etapa original.
- **Principais alterações:** busca e filtros de pacientes; histórico de atendimentos; consultas de exames, projetos, tratamento, notificações e pendências; endpoint de importação; acompanhamento de lote e erros; exportação CSV; DTOs clínicos; autorização explícita por operação e recurso; transações compostas quando uma operação fizer várias gravações.
- **Dependências:** 5A–5C e fundação da Etapa 3. Não expor JSONB bruto nem criar API genérica de todas as tabelas.
- **Critérios de aceite:** cadastrar/consultar paciente completo por fluxo de negócio; filtros respeitam autorização; erros não vazam dados clínicos; importação e API preservam proveniência e histórico.
- **Validação:** testes unitários, contratos HTTP e integração API/SQL sintética, incluindo os três perfis existentes.

### 5E — Encerrar o backend do MVP (P1)

**Status:** concluída no ambiente sintético; aceite integrado aprovado.
Contratos HTTP `/v1`, DTOs de entrada/saída, paginação, erros sanitizados,
observabilidade técnica, controle de versão e autorização explícita por
operação/recurso estão consolidados. Operações compostas compartilham transação;
identidade, aplicação, importador e revisão mantêm capacidades separadas.
A 63 concede apenas os wrappers aprovados à role de revisão. Execução exige
opt-in sintético, staging e Git válido em development/test; padrão desligado e
produção recusada. O runner valida as permissões da migration, sem GRANT manual.
As provas incluem 401/403, revogação, rollback, duplicações, proveniência,
concorrência e paciente completo importado/consultável.

- **Objetivo:** consolidar a API antes do frontend.
- **Principais alterações:** revisão de DTOs, paginação, erros, autorização por paciente/atendimento, observabilidade técnica e documentação de contratos; endpoint de importação e CSV estabilizados.
- **Dependências:** 5D e decisões institucionais aplicáveis ao ambiente sintético.
- **Critérios de aceite:** backend cobre os fluxos do MVP sem acesso direto ao banco; operações indevidas retornam 401/403; contratos versionados e testes passam em banco descartável.
- **Validação:** `make backend-check`, integração HTTP/SQL, `make project-check` e revisão de diff.

**Marco da Etapa 5:** backend do MVP concluído no ambiente sintético, com planilha
processada sem duplicações indevidas, paciente completo consultável e aceite
integrado F01–F16/T01–T18 comprovado. Não equivale a implantação ou homologação real.

## Etapa 6 — Fundação do frontend

A [análise do Figma Make e plano de integração](historico/ANALISE_FIGMA_MAKE_2026_10_03.md)
foi concluída em 2026-10-03. A fundação foi implementada e validada em
2026-10-04: aplicação própria em `frontend/`, com React/TypeScript, usando o
protótipo como referência visual e funcional. Sessão, rotas e consultas seguem
os contratos `/v1`. Bibliotecas e toolchain adotados estão em
[FRONTEND.md](FRONTEND.md) e no lockfile; a
[ADR-024](DECISOES_ARQUITETURAIS.md#adr-024) registra as fronteiras.

Este roadmap é a fonte da sequência e dos critérios de aceite. A análise mantém
a fotografia histórica e os detalhes técnicos de integração. O inventário atual
está na [matriz ponto a ponto](frontend/MATRIZ_FIGMA_FRONTEND.md) e a experiência
pretendida na [visão de produto](frontend/VISAO_E_ESPECIFICACAO.md).
A evidência da execução está no
[relatório da Etapa 6](validacoes/VALIDACAO_ETAPA_6.md).

### 6A — Base técnica, sessão e navegação

**Status:** concluída no ambiente sintético em 2026-10-04; aceite documentado.

- **Objetivo:** criar a fundação do frontend consumindo somente a API existente.
- **Principais alterações:** diretório próprio, toolchain/lockfile, layout e
  componentes revisados, rotas reais, cliente HTTP `/v1`, login, `/auth/me`, saída
  e estados de erro. Separar sessão, consultas do servidor e rascunhos locais;
  preferir proxy de desenvolvimento e mesma origem na implantação.
- **Dependências:** Etapa 5E; ambiente sintético com schema compatível e política
  de acesso explícita. Não aplicar migrations no startup do frontend/backend.
- **Critérios de aceite:** login e identidade vêm do servidor; saída/401 limpam
  sessão e cache clínico; 403/429/503 têm tratamento compreensível; links diretos,
  voltar e recarregar funcionam. A interface não simula persistência ou autorização.
- **Validação:** acrescentar alvos de build/check do frontend ao Makefile e CI;
  executar build, testes dos fluxos de sessão e revisão manual de teclado/foco.
  Combinar verificações de outras camadas somente se forem alteradas.

### 6B — Busca e ficha em leitura

**Status:** concluída no ambiente sintético em 2026-10-04; aceite documentado.

- **Objetivo:** localizar pacientes e consultar os recursos já publicados.
- **Principais alterações:** busca por nome/sexo, paginação `limit`/`offset`,
  listagem com ID/nome, ficha carregada por recurso/aba, histórico de atendimento,
  Minha conta básica e início com atalhos. Reduzir a tabela ampla do protótipo aos
  campos disponíveis, sem consultas individuais para preencher cada linha.
- **Dependências:** 6A e contratos de leitura da Etapa 5E.
- **Critérios de aceite:** os três perfis consultam somente seu escopo; vazio,
  carregamento e erro são distintos; filtros/página ficam na URL; não inventar
  totais nem interpretar ausência na página como inexistência global.
- **Validação:** testes de componentes e integração sintética de busca/ficha,
  paginação, expiração e recusa por vínculo; revisão manual da navegação.

## Etapa 7 — Fluxos clínicos

**Estado:** 7A–7D têm implementação e evidências sintéticas de 04/10 e 15/10.
O [relatório da Etapa 7](validacoes/VALIDACAO_ETAPA_7.md) reúne provas dos cenários
executados. As sete lacunas receberam correções e o percurso integrado passou;
M1 foi aprovado em 26/10 conforme o registro no roteiro clínico. Os pacotes de
produto abaixo mantêm suas dependências e aceites próprios, sem aceite implícito pela inclusão no escopo.

**Objetivo:** tornar utilizáveis as telas efetivamente usadas pela equipe.

Antes de cada formulário, conferir a matriz da análise: existir no schema ou no
importador não significa possuir contrato HTTP de consulta/escrita. Campos sem
suporte permanecem pendências explícitas; nenhuma entrada preenchida pode ser
silenciosamente descartada. Catálogos e extensões estritamente necessárias devem
ter contrato, autorização e validação próprios antes de integrar o fluxo afetado.

### 7A — Cadastro e atendimentos

- **Objetivo:** permitir localizar pacientes e registrar atendimentos básicos.
- **Principais alterações:** busca prévia, cadastro/edição de paciente,
  criação/edição versionada de atendimento, dados demográficos, contatos/endereço,
  idade calculada com referência visível e histórico básico.
- **Dependências:** 6A–6B, Etapa 5E e contratos de 5A.
- **Critérios de aceite:** paciente pode ser consultado e editado conforme perfil;
  cadastro também respeita a política clínica do ambiente. Nome é obrigatório;
  nascimento/sexo seguem a opcionalidade da API. Idade não é digitada como fato
  independente; contatos/endereço anteriores são preservados; PATCH usa a versão
  original e 409 não provoca sobrescrita automática. Não fundir possíveis duplicados.
- **Validação:** testes de componentes e integração sintética de paciente/atendimento,
  incluindo validação, recusa por vínculo e edição concorrente.

### 7B — Dados clínicos e exames

- **Objetivo:** registrar os dados clínicos e exames necessários ao atendimento.
- **Principais alterações:** avaliação clínica, diagnóstico/descoberta de Chagas,
  exames trazidos e solicitados, familiares identificados e resultados, pendências
  da criação e preservação de ausências/estados desconhecidos. Criar núcleo e
  filhos aceitos do atendimento na mesma requisição transacional.
- **Dependências:** 7A; contratos e migrations da Etapa 5C já validados, aplicados
  no ambiente sintético apropriado; consulta de catálogos ativos antes dos selects.
  Definir o recorte de sorologias, condições/comorbidades, dispositivos/eventos/óbito,
  medicamentos e resultados detalhados ainda sem HTTP; não prometer cobertura total
  do protótipo antes dessa avaliação.
- **Critérios de aceite:** descoberta não vira data de sorologia; exame solicitado
  não exige resultado; exame genérico é identificado; familiar examinado não vira
  histórico de doença; nenhum campo preenchido se perde. Edição do núcleo não é
  apresentada como edição de filhos que o PATCH atual não suporta.
- **Validação:** testes de formulário/API com casos positivos, negativos, vazios e
  ambíguos, usando somente dados sintéticos.

### 7C — Tratamento, retornos e encaminhamentos

- **Objetivo:** implementar os fluxos clínicos de BZN e comunicação assistencial.
- **Principais alterações:** BZN/reações na criação do tratamento, retornos de
  30 dias/final efetivamente realizados, retornos anuais, ano informado separado
  de visita, projetos, notificação, encaminhamento, contrarreferências repetíveis
  e pendências por paciente. Operações posteriores ao atendimento têm confirmação
  própria, com indicação do que já foi salvo e do que permanece em rascunho.
- **Dependências:** 7A–7B, contrato temporal de D6–D11, APIs da Etapa 5 e catálogos
  ativos de projetos/tipos de encaminhamento. Edição de BZN existente, reação
  isolada, exame/encaminhamento existente e observação/responsável de revisão de
  pendência exigem contratos específicos; não improvisar com criação duplicada.
  Contrarreferência avançada e upload permanecem fora do escopo atual.
- **Critérios de aceite:** datas são comparecimentos efetivos; 30/60 dias não são
  calculados automaticamente; ano isolado não fabrica visita; histórico não é
  substituído; BZN permanece único; projetos/notificação respeitam o contexto do
  paciente e os estados desconhecidos. Pendência resolvida exige data;
  `Localizado` não aparece funcionalmente.
- **Validação:** testes de componentes e integração com múltiplos retornos,
  contrarreferências e conflitos de autorização.

### 7D — Integração do fluxo clínico

- **Objetivo:** comprovar que os módulos formam um atendimento utilizável.
- **Principais alterações:** navegação entre ficha, atendimento, exames, BZN,
  encaminhamento, notificação e histórico; mensagens de erro, estados de carga,
  proteção de rascunhos e recuperação após falha entre operações.
- **Dependências:** 7A–7C e contratos HTTP estabilizados.
- **Critérios de aceite:** fluxo principal completo sem acesso direto ao banco;
  dados permanecem rastreáveis e o usuário não perde alterações válidas.
  Consulta não escreve; 401/403/409 não produzem sucesso fictício; falha de rede
  após escrita exige verificação, sem retry automático nem duplicação do atendimento.
- **Validação:** fluxo UI/API/PostgreSQL sintético, revisão com a equipe e
  `make frontend-check docs-check COMPACT=1`; combinar backend/SQL somente se
  alterados, conforme a matriz do workflow e os pacotes abaixo.

## Etapa 8 — Dashboard e funcionalidades complementares

- **Objetivo:** completar as funcionalidades clínicas/operacionais e a experiência
do produto inventariado; concluir as famílias 8A–8D e os aceites 8V1/8V2.
A lista original abaixo é parte desse objetivo, ampliado pela referência de
conclusão vigente e pela tabela de cobertura obrigatória.
- **Principais alterações:** CSV de pacientes, acompanhamento sanitizado de lotes,
  upload/simulação e reenvio idempotente sintéticos, inconsistências efetivamente
  expostas e ajustes de UX. Indicadores e filtros adicionais entram somente após
  definição e contrato agregado; até lá, o início da 6B pode oferecer atalhos.
- **Dependências:** Etapas 5–7; métricas e população autorizada aprovadas; habilitação
  sintética explícita das portas operacionais. Fila global de pendências, gestão
  de usuários e relatório rico de simulação não possuem contrato atual e exigem
  priorização própria. Criar novo elo de reprocessamento usa `--reprocessar` na CLI;
  `POST /importacoes` não expõe essa opção. Um botão para esse fluxo exigiria
  evolução HTTP justificada; revisão entre arquivos alterados continua separada.
- **Critérios de aceite:** indicadores têm definição verificável e não são
  calculados de páginas parciais; CSV explicita filtros/página e respeita os três
  perfis autorizados; lotes respeitam seu escopo e não expõem JSONB bruto.
  Simulação não grava; confirmação revalida; reenvio mostra o lote efetivo;
  progresso/contagens não são inventados.
- **Validação:** testes de interface/API, revisão com dados sintéticos e análise
  de permissões, exportação, simulação e idempotência.

## Etapa 9 — Produção

**Objetivo:** executar a aplicação fora do notebook com controles institucionais.

### 9A — Ambiente e implantação

- **Objetivo:** disponibilizar instalação reproduzível de produção.
- **Principais alterações:** servidor, Docker Compose/configuração equivalente,
  configuração por ambiente, roles PostgreSQL, permissões e healthchecks.
- **Dependências:** Etapa 8 e arquitetura de implantação escolhida.
- **Critérios de aceite:** aplicação sobe em ambiente controlado sem comandos
  privados do autor; migrations seguem o procedimento incremental correto,
  distinguindo evidência persistente 00–20 dos incrementos validados em descartáveis.
- **Validação:** `make docker-project-check` e teste de reinício/recuperação.

### 9B — Segurança de transporte e segredos

- **Objetivo:** proteger comunicação, credenciais e dados estruturados/brutos.
- **Principais alterações:** HTTPS, gestão/rotação de segredos, roles mínimas,
  permissões, proteção do JSONB e revisão da exposição da API/frontend. Planejar
  evolução explícita e testada dos bloqueios atuais de produção para acesso
  clínico/importação/revisão; não contorná-los alterando `NODE_ENV`.
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
  E2E sintético, plano de migração e decisão formal de liberação.
- **Dependências:** 9A–9C e governança institucional aprovada.
- **Critérios de aceite:** controles verificados, autorização explícita registrada
  e nenhum dado real processado prematuramente, inclusive em simulação.
  Arquivos, backups e credenciais permanecem fora do Git; acesso, retenção,
  recuperação e responsáveis estão definidos antes do piloto autorizado.
- **Validação:** `make docker-project-check`, E2E, restore e revisão operacional.

## Etapa 10 — Homologação e estabilização

**Objetivo:** homologar e entregar o produto completo de M3 no ambiente
institucional liberado em M4, corrigindo defeitos sem deixar famílias PC para
depois da release. As subetapas históricas abaixo passam a abranger todo esse
escopo; o nome MVP não limita a cobertura da entrega final.

### 10A — Homologação funcional

- **Objetivo:** testar com usuários os fluxos definidos nas Etapas 5–8.
- **Principais alterações:** roteiro de uso, piloto e importação completa autorizados,
  pacientes, atendimentos, exames, BZN, retornos, encaminhamentos, dashboard e CSV.
- **Dependências:** Etapas 5–9 e dados sintéticos ou autorizados conforme 9D.
- **Critérios de aceite:** usuários completam o fluxo principal e registram
  evidências sem acessar o banco diretamente. Reconciliar contagens, amostras,
  campos promovidos, conteúdo preservado e pendências antes de ampliar o piloto;
  dados importados não são declarados consultáveis/editáveis sem suporte HTTP.
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

- **Objetivo:** formalizar a versão do produto completo e seu estado conhecido;
  exigir cobertura M3/8V2 e homologação institucional, além dos critérios abaixo.
- **Principais alterações:** revisão final de segurança, changelog, tag/release,
  lista de limitações e aceite formal da equipe.
- **Dependências:** 10A–10C e aprovação institucional.
- **Critérios de aceite:** versão identificada, documentação e limitações publicadas,
  aceite registrado e nenhum trabalho fora do escopo apresentado como concluído.
- **Validação:** regressão final, `make project-check`, checklist de release e
  conferência de `git status` antes do commit/tag.

## Limites preservados do produto completo

A referência visual e funcional não autoriza reproduzir dados fictícios como
resultado real, timers de progresso inventados, credenciais de demonstração em
produção, inferências clínicas, fusão automática de pessoas ou o campo
`Localizado` como funcionalidade. AIM3, P Digitar, aplicativo mobile nativo,
relatórios analíticos avançados e dashboards além dos requisitos inventariados
continuam fora do escopo. Preservação de conteúdo legado não significa promoção
semântica automática.

Upload de contrarreferência, módulos clínicos adicionais, fila global, gestão de
usuários e revisão/reprocessamento estão incluídos no produto completo; as
respectivas decisões definem implementação, retenção, autorização e semântica.
Nenhuma dessas famílias pode ser considerada entregue por uma simulação local.
A política clínica vigente prevalece quando a referência divergir; registrar a
diferença e sua justificativa no aceite visual/funcional.

O compromisso histórico de dez semanas/24 horas semanais pertencia ao recorte
anterior e não é previsão para o produto completo. Reestimar esforço e prazo
após detalhar as decisões e unidades, sem converter contagem de pacotes em horas.

## Pacotes verificáveis do produto frontend

O [catálogo de entregas](frontend/ENTREGAS_DO_PRODUTO.md) contém os IDs estáveis,
escopos, dependências, critérios e validações de cada unidade. Este roadmap
mantém a sequência, os marcos e o próximo trabalho; não duplicar aqui as fichas.

## Próximo trabalho

M1 foi aprovado em 26/10 conforme registro do responsável. A sequência de M2
foi delimitada pelo responsável para 7A-U1, 7D-U1/U2/U4.2, verificação de
U3/U4.1 e 7D-A1, sem excluir famílias não EX do produto completo. A instrução
de M2 adota cinco etapas, revisão antes da confirmação e acompanhamento como
operação separada; alterações de concorrência dos PUT de projeto/notificação e
revisão de pendências continuam bloqueadas até contrato aprovado.

Preparar as decisões específicas e o detalhamento das frentes obrigatórias de
M3, incluindo todos os antigos destinos VP. Manter o inventário ligado aos
pacotes e evidências; iniciar 8V1 junto às entregas de telas, sem acumular toda a
fidelidade visual para o fim. Etapas 9/10 e 8V2 encerram operação e produto;
nenhuma família incluída pode ser postergada além de M5 sem nova mudança
explícita de escopo pelo responsável pelo produto.

### Preparação da migração da planilha real

A preparação pode ocorrer em paralelo à construção do frontend, sem exigir a
reprodução completa do protótipo. A importação utiliza o importador existente;
o frontend consulta as projeções publicadas pela API. Executar a carga real
continua condicionado a 9D e à homologação controlada de 10A.

- **Mapeamento:** produzir uma matriz `campo da planilha → manifesto/importador →
  destino estruturado ou proveniência → API → tela`, partindo da
  [cobertura de colunas](dados/COBERTURA_COLUNAS_PLANILHA.md). Distinguir campos
  promovidos, preservados sem interpretação, excluídos funcionalmente e sem HTTP;
  não alterar regra clínica ou schema apenas para preencher uma tela do protótipo.
- **Ensaio sintético:** validar layout, formatos, ambiguidades, identidade,
  duplicações, idempotência, proveniência e conciliação em ambiente descartável
  compatível. Definir resultados esperados e roteiro de recuperação antes do piloto.
- **Prontidão operacional:** definir ambiente e plano incremental de migrations,
  responsáveis, acessos, segredos, localização dos arquivos fora do Git,
  retenção/auditoria e backup/restore conforme a
  [política de dados](SEGURANCA_DE_DADOS.md). Registrar a liberação explícita.
- **Execução posterior:** após 9D, simular e executar piloto autorizado, verificar
  resultados e ampliar somente após aceite. Não usar portas HTTP sintéticas ou
  flags de desenvolvimento como atalho para dados reais.

Entregas esperadas desta preparação: matriz de cobertura, roteiro sintético de
migração/conciliação, plano operacional e lista de lacunas HTTP priorizadas.
Nenhuma planilha real é lida ou importada nesta revisão documental.

## Validação da revisão documental de 2026-09-14

Esta atualização altera somente documentação. Foram lidos os AGENTS.md relevantes,
o workflow de desenvolvimento, as respostas integrais do DOCX e o estado executável
do repositório. Validar com `make docs-check`, `make manifest-check` e
`git diff --check`; `make project-check` não foi executado naquela revisão por
incluir testes SQL com escrita transacional. No incremento BZN de 2026-09-15,
`make project-check` foi executado antes e depois da implementação, além de
`make importer-test` e `make manifest-check`.
