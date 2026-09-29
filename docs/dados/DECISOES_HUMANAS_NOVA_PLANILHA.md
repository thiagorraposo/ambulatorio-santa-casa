# Decisões Humanas para a Nova Planilha

Atualizado em: 2026-09-28

## Finalidade e precedência

Este documento consolida as decisões humanas confirmadas para a nova planilha
e para a coleta no sistema. Ele é a fonte de verdade para semântica e
cardinalidade. As 12 respostas de `docs/Perguntas pendentes.docx`, lidas
integralmente em 2026-09-14, prevalecem sobre interpretações anteriores dos mesmos
campos; seu conteúdo de negócio está consolidado abaixo para não depender da
disponibilidade do DOCX local. O manifesto executável registra o layout físico;
`docs/historico/IMPACTO_NOVO_LAYOUT_PLANILHA.md` preserva sua análise histórica.
`docs/evidencias/schema_atual_ambulatorio.sql` evidencia as 38 tabelas aplicadas:
37 clínicas/de proveniência e `usuario_aplicacao`, alheia ao contrato da planilha.
A descrição vigente está em `docs/MODELO_FISICO_ATUAL.md`.

As seis respostas de [Perguntas pendentes sobre campos e regras clínicas](../Perguntas%20pendentes%20sobre%20campos%20e%20regras%20cl%C3%ADnicas.md)
são a referência autoritativa desde 2026-09-28. D1–D6 estão confirmadas nesse
arquivo; as decisões anteriores de D7–D12 continuam preservadas. A escolha de
data de referência e das estruturas físicas é técnica e deve ser explícita,
sem apresentar novas respostas da equipe.

Nenhuma decisão deste documento altera o banco por si só. Mudanças físicas deverão
ser especificadas e implementadas em migrations incrementais futuras.

O manifesto executável `manifestos/planilha_ambulatorio_v1.json` representa agora
126 rótulos plenos, nove parciais e `Localizado` excluído. D11 foi promovida na
v1.2.0 do importador para `pendencia_atendimento`, sem classificação automática;
as demais decisões continuam dependendo de evolução explícita.
As regras operacionais e suas divergências de implementação estão em
`docs/ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md` e
`docs/IMPORTADOR_SINTETICO_V1.md`. Incompatibilidades exigem evolução explícita
do contrato, nunca interpretação silenciosa de dados.

## Respostas da equipe incorporadas em 2026-09-14

Os identificadores D1–D12 também são usados na matriz de impacto em
[`COBERTURA_COLUNAS_PLANILHA.md`](COBERTURA_COLUNAS_PLANILHA.md). As prioridades
de entrega são propostas técnicas do roadmap, não respostas adicionais da equipe.

| ID | Decisão de negócio confirmada | Limites e incertezas restantes |
| --- | --- | --- |
| D1 | Idade deve ser calculada pelo sistema a partir da data de nascimento. | A ficha calcula a idade na data atual do banco e expõe essa referência como escolha técnica; não criar idade manual independente. Preservação da célula original como proveniência continua possível. |
| D2 | Data do autorrelato é quando o paciente descobriu que possui Chagas; pode diferir da data da sorologia. | Escolha técnica: snapshot por atendimento em `diagnostico_chagas.data_descoberta_autorelato` (migration 28), sem consolidar relatos divergentes silenciosamente. Não usar data de resultado como substituta nem inferir confirmação laboratorial. |
| D3 | Registrar sim/não para familiares examinados; se sim, identificar o familiar e o resultado da sorologia. A data do exame do familiar não é necessária. | Não foi exigido cadastro civil de parentes nem definido domínio fechado de resultados. A migration 25 registra avaliações e pares familiar–resultado; ausência legada não equivale a não. |
| D4 | Identificar obrigatoriamente os exames complementares trazidos. | Indicador agregado sozinho não identifica exame. Detalhar tipos genéricos quando não identificarem o exame efetivo; não inventar interpretação de texto legado. |
| D5 | Identificar obrigatoriamente os exames complementares solicitados. | Identificação não implica resultado disponível, realização ou data não informada. |
| D6 | Retorno de 30 dias é sempre de BZN; registrar a data em que o paciente compareceu. | Não calcular comparecimento por prescrição mais 30 dias nem impor intervalo exato. A API usa acompanhamento vinculado ao atendimento e confere a existência do tratamento canônico do paciente. |
| D7 | Retorno final é o retorno após finalizar BZN; registrar a data efetiva desse comparecimento. | A menção a geralmente 60 dias não fixa duração nem data de retorno. Não confundir retorno final, fim do uso e duração cumprida. |
| D8 | Manter um registro por retorno, inclusive o de rotina anual. Na planilha, o campo guarda o ano do último comparecimento e a linha do paciente é atualizada. | A fonte não contém necessariamente o histórico anterior. Não completar dia/mês nem tratar automaticamente toda alteração da linha como nova consulta. Os demais dados obrigatórios de cada retorno não foram detalhados. |
| D9 | Desfecho refere-se ao último retorno e informa a data futura ou a orientação de voltar quando os exames estiverem prontos. | A exclusão do campo foi sugerida, não definitivamente aprovada. Confirmar retirada e destino da informação de planejamento; não descartar legado. |
| D10 | Há múltiplas contrarreferências por paciente com Chagas, entregues após os retornos, com a conduta do ambulatório e a orientação à APS. Upload é importante. | A distinção completa entre não realizada, pendente, não se aplica e ausência não foi respondida. Definir representação documental e momento de entrega do upload; não inferir documento entregue de um retorno registrado. |
| D11 | O campo misto pode ficar apenas como pendências, preferencialmente textuais, relativas principalmente a notificação ou solicitação de BZN. Segundo a equipe, as observações desse campo repetem informações do desfecho do retorno. | Não há resposta explícita sobre quantidade por atendimento nem autorização para classificar automaticamente todo texto antigo. A coluna separada `observação` e observações clínicas gerais não foram abolidas. |
| D12 | `Localizado` pode ser excluído; indica se a equipe encontrou o prontuário físico. | Exclusão funcional não é purga da proveniência nem exclusão de `atendimento.localizacao_prontuario`, que é outro campo. |

### Consequências técnicas

- Reutilizar nascimento para idade; exames por paciente para D4/D5 e
  acompanhamento para datas/tipos de retorno. D11 já reutiliza
  `pendencia_atendimento` na promoção controlada do importador v1.2.0.
- Acrescentar representação própria da data de descoberta e do rastreio familiar
  por migrations incrementais após definir seu contrato. Não reinterpretar
  `historico_familiar_chagas.possui_historico_familiar` como exame realizado.
- Acompanhamento já admite várias ocorrências. Multiplicidade de retornos ou
  contrarreferências, isoladamente, não justifica novas tabelas. Uma FK direta
  de BZN e uma entidade documental própria dependem de decisão técnica.
- Escolha técnica documentada nos
  [contratos da Etapa 5](../arquitetura/CONTRATOS_CLINICOS_ETAPA_5.md): reutilizar
  `evento_clinico.ano_evento` com tipo `ultimo_comparecimento_ano_informado` e
  precisão anual. A implementação permanece pendente; isso não é nova resposta
  clínica nem autoriza criar uma visita a partir do ano.
- O [contrato temporal de revisão](../arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md)
  foi definido tecnicamente na ADR-022, sem nova resposta clínica da equipe.
  A v1.4.0 implementa somente a barreira de finalidade e recusa de revisões;
  aplicação auditada segue pendente. Não escolhe a representação anual de D8
  nem autoriza inferir visitas.
- As escolhas técnicas de referência da idade, autorrelato e familiares estão
  registradas em `arquitetura/CONTRATOS_CLINICOS_ETAPA_5.md`. Preservar o legado
  nas demais promoções até haver implementação e aceite técnico.

## Legenda da classificação

1. apenas regra de manifesto/importação;
2. atualização documental;
3. nova migration incremental necessária antes do MVP;
4. pendência que pode ficar no backlog;
5. bloqueio para importação de dados reais.

Uma decisão pode receber mais de uma classe quando, por exemplo, exige migration e
também uma regra do importador. A classe 3 nas decisões anteriores registra a
necessidade estrutural original, já atendida onde indicado; não exige refazer
migrations. Para D1–D12, usar a matriz de impacto específica vinculada acima.

## Escopo, linha e precedência

| Decisão confirmada | Classes | Consequência |
| --- | --- | --- |
| As duas abas clínicas representam portadores e não portadores | 1, 2 | a aba define `atendimento.origem_registro` e a condição de Chagas |
| O contrato executável v1 cria um atendimento por linha válida | 1 | D8 exige revisar sua aplicação a linhas atualizadas e arquivos de conteúdo diferente; não deduzir histórico completo nem novo atendimento apenas pela mudança do arquivo |
| Um paciente não deve existir nas duas abas; portadores prevalece | 1, 5 | detectar conflito antes da carga estruturada; não converter automaticamente uma linha conflitante em não portador |
| Coluna ausente significa não coletado, nunca negativo | 1 | ausência estrutural e célula vazia geram `NULL`/sem registro, nunca `FALSE` |
| O MVP importa somente as duas abas clínicas | 1, 2 | `P Digitar` e as duas abas AIM3 ficam fora do manifesto executável do MVP |
| AIM3 é outro fluxo de projeto e não possui cabeçalhos | 2, 4 | avaliar em fase própria; não inferir colunas nem criar tabela agora |

## Identificação de paciente e atendimento

A chave de comparação da origem é nome normalizado + data de nascimento. Essa é
uma chave operacional de conciliação, não uma constraint de unicidade clínica.

Regras obrigatórias do importador:

- procurar candidatos pelo par nome/data de nascimento;
- usar prontuário permanente como evidência adicional quando existir, nunca como
  substituto silencioso para dados conflitantes;
- não mesclar automaticamente quando nome, nascimento, prontuário, ID de origem ou
  aba produzirem candidatos contraditórios;
- encaminhar conflitos para revisão e manter a linha bruta e o motivo;
- o v1 cria atendimentos distintos para linhas distintas do mesmo paciente;
  antes de importar atualizações, implementar e homologar o contrato temporal
  complementar; o fluxo revisado não herda automaticamente essa regra do v1;
- não inventar datas de criação/atualização da origem; timestamps do banco
  representam processamento, não datas da planilha.

O schema atual permite pacientes com o mesmo nome/data e prontuário ausente, o que
é adequado para evitar falsa unicidade. Porém não possui número de prontuário
permanente: `atendimento.localizacao_prontuario` é localização física, não
identificador. Adicionar `paciente.numero_prontuario` opcional e único é classe 4
enquanto a fonte não oferecer esse identificador; torna-se classe 3 antes de o
sistema cadastrar ou reconciliar prontuários reais.

## Projetos

Decisões:

- existe uma lista oficial de projetos;
- BenBrasil e EPOCA são projetos diferentes;
- variantes `BenBrasil falha` e `EPOCA falha` pertencem ao respectivo projeto e
  preservam `houve_falha`;
- um paciente pode participar de vários projetos;
- o vínculo é do paciente, não do atendimento;
- cada encaminhamento admite no máximo um projeto da lista oficial.

Impacto: `projeto_estudo` e seus códigos atuais são reutilizáveis, e
`atendimento_projeto_estudo.houve_falha` demonstra que a variante de falha já foi
modelada. A associação, entretanto, possui `atendimento_id NOT NULL` e unicidade
por atendimento. Essa lacuna motivou a associação paciente–projeto,
com participação, pendência, falha, textos originais e proveniência. A tabela
atual não deve ser apagada nesta fase; sua transição e eventual obsolescência
precisam ser especificadas. Classes 1, 2 e 3.

A estrutura foi implementada conforme
`docs/arquitetura/ESPECIFICACAO_ASSOCIACAO_PACIENTE_PROJETO.md`: associação consolidada
`paciente_projeto_estudo`, única por paciente e projeto, sem atendimento e sem
alteração retroativa de `atendimento_projeto_estudo`, aplicada por
`sql/13_associacao_paciente_projeto.sql`. Aliases, conflitos e consolidação entre linhas estão
normatizados na especificação do importador v1.

## Condição e complicações de Chagas

- a aba determina a condição de Chagas;
- as quatro colunas exclusivas dos portadores são complicações relacionadas à
  Chagas;
- ausência dessas colunas nos não portadores significa não coletado;
- complicações podem ocorrer várias vezes e precisam ser associáveis a data ou
  atendimento.

`complicacao_chagas` já aceita múltiplas linhas e possui `atendimento_id NOT NULL`.
Como a exigência é data **ou** atendimento, o vínculo atual atende ao MVP. A data
específica permanece classe 4 até existir fonte/requisito que não possa usar a data
do atendimento. As demais decisões são classes 1 e 2.

## Exames

Existem dois blocos: trazidos e solicitados. Cada ocorrência deve ser identificada
por aba, posição, ocorrência, bloco e tipo. ECO, laboratoriais, imagem, Holter,
endoscopia, colonoscopia, teste ergométrico, MAPA e outros são tipos de exame.
Célula vazia significa ausência de informação. Um paciente pode ter vários exames
do mesmo tipo, resultados são textos livres e o exame não deve depender
obrigatoriamente do atendimento em que foi digitado.

O catálogo `tipo_exame_complementar` e os campos de origem, status e texto podem
ser reutilizados. A lacuna estrutural anterior era:
`atendimento_exame_complementar.atendimento_id` é obrigatório e o registro não
possui `paciente_id`. A evolução já aplicada tornou o paciente o vínculo obrigatório
e o atendimento opcional na nova tabela canônica, assegurando, quando ambos existirem,
que o atendimento pertença ao mesmo paciente. Não deve haver unicidade por tipo,
pois múltiplas ocorrências são válidas. Classes 1, 2 e 3.

A estrutura foi especificada em
`docs/arquitetura/ESPECIFICACAO_EVOLUCAO_EXAMES_COMPLEMENTARES.md`: nova tabela canônica
`paciente_exame_complementar`, com paciente obrigatório, atendimento opcional com
consistência por FK composta, bloco único `trazido` ou `solicitado`, resultado
livre e preservação das tabelas legadas sem backfill, implementada por
`sql/14_exames_por_paciente.sql`. D4/D5 exigem revisar identificação
e validação funcional, não refazer essa migration. O manifesto e a
reconciliação de reprocessamentos estão normatizados na especificação do
importador v1.

## Benzonidazol e reação adversa

Decisões confirmadas:

- `Por quanto tempo foi usado?` é duração efetivamente cumprida, normalizada em
  dias; texto original permanece preservado;
- cada paciente possui no máximo um tratamento com benzonidazol;
- o ano de uso é aproximado e não deve virar uma data artificial;
- `Prescrição do BZN` é a data da prescrição;
- tratamento pelo ambulatório inclui prescrição e acompanhamento;
- `Se não, descreva o motivo` responde à indicação de BZN;
- reação adversa refere-se ao BZN e pertence ao histórico do paciente, admitindo
  descrição, gravidade, data e consequência.

`tratamento_chagas` hoje é obrigatório por atendimento, não impõe máximo por
paciente, não possui duração em dias, ano aproximado, data de prescrição ou
indicador de tratamento pelo ambulatório. Seus campos de evento adverso não
armazenam gravidade, data e consequência nem múltiplas ocorrências.

A migration incremental 15 já implementou os requisitos estruturais de:

- associar inequivocamente o tratamento ao paciente e impor no máximo um
  tratamento de BZN por paciente;
- manter atendimento de registro opcional, se útil à proveniência clínica;
- adicionar `duracao_cumprida_dias` inteiro positivo opcional e valor original;
- adicionar ano aproximado, data de prescrição e indicador de tratamento pelo
  ambulatório;
- manter o motivo de não indicação sem confundi-lo com não início;
- criar estrutura de reações adversas vinculada ao tratamento/paciente, com
  descrição, gravidade, data, consequência e valores originais.

Classes 1, 2 e 3. A duração é explicitamente indispensável ao MVP.

A estrutura foi especificada em
`docs/arquitetura/ESPECIFICACAO_TRATAMENTO_BENZONIDAZOL.md`: nova tabela canônica
`tratamento_benzonidazol`, única por paciente, com atendimento opcional
consistente, indicação, início, realização pelo ambulatório, duração cumprida,
ano aproximado, prescrição e motivos separados. Reações repetíveis usam
`reacao_adversa_benzonidazol`, sem domínio inventado de gravidade ou consequência.
`tratamento_chagas` permaneceu intacta, sem backfill ou escrita dupla. A estrutura
foi implementada por `sql/15_tratamento_benzonidazol.sql`; conversões, conflitos e
reprocessamento estão normatizados na especificação do importador v1.

## Encaminhamento e contrarreferência

- `Trouxe encaminhamento` significa apresentação do documento, é booleano e pode
  ser registrado em qualquer atendimento;
- cada encaminhamento aponta para no máximo um projeto oficial;
- contrarreferência é a devolução de informações ao serviço de origem e aceita
  `sim`, `não` ou sem dados;
- D10 confirma múltiplas contrarreferências por paciente e a importância de
  upload; os estados detalhados e a representação documental ainda precisam de
  definição. Não há exclusividade por paciente aprovada.

`encaminhamento` exige atendimento, o que é compatível. O indicador de documento
apresentado e a FK para projeto foram adicionados pela última migration mínima do
MVP. Embora `acompanhamento_cuidado.status_acompanhamento` aceite um estado
consolidado, ele não distingue fielmente a resposta negativa dos demais estados e
a representação documental permanece pendente. No contrato executável v1, a
contrarreferência ainda fica somente no bruto e a linha recebe pendência; não há
promoção aproximada. A multiplicidade não é mais uma dúvida de negócio, e a
prioridade proposta para registro/upload está em `docs/PROXIMOS_PASSOS.md`.

A evolução foi fechada em
`docs/arquitetura/ESPECIFICACAO_ENCAMINHAMENTO_AMPLIADO.md`: `encaminhamento` foi ampliada
por `sql/16_encaminhamento_ampliado.sql` com booleano anulável, projeto oficial opcional e valores
originais separados. O atendimento obrigatório continuará determinando o
paciente, sem FK redundante; não haverá nova tabela, backfill, escrita dupla,
dedução ou criação automática de projetos. A migration foi validada em 23
cenários. Contrarreferência permanece fora dela.

## Medidas, datas e valores

Regras de manifesto/importação, classe 1:

- altura da fonte em metros: converter para `dados_clinicos_atendimento.altura_cm`
  por `altura_cm = altura_m × 100`, preservando o texto original;
- peso em kg, circunferência em cm, frequência em bpm, saturação em percentual e
  pressão em mmHg;
- NYHA somente `I`, `II`, `III` ou `IV`;
- datas no formato `dd/mm/aaaa` e anos como ano, sem completar dia/mês;
- positivos: `sim`, `S`, `x`, `1`, `verdadeiro`;
- negativos: `não`, `N`, `0`, `falso`;
- não há token padronizado de desconhecido;
- célula vazia significa não informado, nunca não ou não se aplica;
- conteúdo ambíguo permanece somente no JSONB bruto e gera pendência/rejeição
  conforme criticidade.

Os destinos numéricos e os campos `valor_original_*` do módulo clínico suportam a
conversão. A validação de NYHA e unidades deve ocorrer no importador; endurecer
constraints pode ficar no backlog (classe 4).

## Responsável legado, reimportação e acesso bruto

O cabeçalho canônico é `Responsável pela digitação`. O valor identifica quem
digitou a planilha e permanece em
`importacao_linha.responsavel_digitacao_original`. Não haverá associação automática
com usuário. Uma ligação futura só poderá ocorrer após identidade confirmada e
deverá preservar o texto legado. Classes 1, 2 e 4.

`importacao_lote` já forma uma cadeia de reprocessamento por conteúdo/layout,
`importacao_linha` preserva cada linha em JSONB e `importacao_registro` rastreia os
destinos estruturados. Reimportações devem criar nova execução encadeada, nunca
sobrescrever o lote anterior; conflitos e decisões também precisam ser auditáveis.
O suporte físico básico existe. Idempotência, retomada e auditoria de decisões
estão definidas na especificação do importador v1; sua implementação é classe 1 e,
antes de dados reais, classe 5.

Dados brutos serão acessíveis somente com permissão; usuários sem permissão verão
apenas dados estruturados; o JSONB será mantido para auditoria. Antes de importar
dados reais, são bloqueios classe 5:

1. prazo institucional de retenção;
2. responsável autorizado a aprovar importações;
3. responsável por revisar erros e contradições;
4. provisionamento institucional de logins/segredos para as roles e privilégios
   técnicos já implementados;
5. política de auditoria e acesso ao JSONB;

`Localizado` deixou de ser pendência semântica: D12 confirmou sua exclusão
funcional. Isso não remove os demais bloqueios para dados reais.

Uma disponibilização futura em servidor com dados reais exige, antes da carga,
ambiente protegido, transporte seguro,
backup/restauração testados, gestão de segredos e registro de acesso. Isso não
altera a cobertura de colunas, mas é bloqueio de implantação real.

## Matriz consolidada de impacto

| Impacto | Classificação | Situação para o MVP |
| --- | ---: | --- |
| aba, precedência, vazio e temporalidade da linha | 1, 2 | regras existentes preservadas; D8 exige revisar linhas atualizadas antes de nova promoção |
| identificação nome+nascimento e conflitos sem merge | 1, 5 | regra obrigatória; revisão humana precisa ter responsável |
| prontuário permanente opcional | 4; futuramente 3 | não bloqueia enquanto ausente na fonte |
| paciente–projeto e variante de falha | 3 | migration implementada e validada |
| complicações repetíveis ligadas ao atendimento | 1, 2 | schema atual atende; data própria no backlog |
| exame por paciente com atendimento opcional | 3 | migration implementada e validada |
| duração, cardinalidade e detalhes do tratamento BZN | 3 | migration implementada e validada |
| documento apresentado e projeto do encaminhamento | 3 | migration implementada e validada |
| múltiplas contrarreferências | 1, 2 | confirmadas em D10; representação e prioridade de upload no roadmap |
| conversões, datas, anos e booleanos | 1 | obrigatório no manifesto/importador |
| responsável legado–usuário | 4 | sem associação automática no MVP |
| cadeia histórica de reprocessamento | 1 | estrutura atual reutilizada |
| governança e acesso ao bruto | 5 | bloqueia dados reais |
| `Localizado` | 2 | exclusão funcional confirmada; preservar apenas proveniência |
| `observação` genérica | 1, 2 | pode ir para `atendimento.observacoes`, preservando bruto |

## Sequência de implementação

O importador sintético e a fundação backend já existem. As quatro migrations
mínimas anteriores estão aplicadas; não são trabalho a repetir. A sequência
vigente, incluindo correções de importação, extensões justificadas, backend,
frontend, integração e homologação, tem uma única fonte em
[`../PROXIMOS_PASSOS.md`](../PROXIMOS_PASSOS.md).

## Validação desta atualização

As 12 respostas foram conferidas com o DOCX, migrations, código, testes,
manifesto e metadados físicos consultados somente em leitura na análise de
2026-09-14. A edição é documental; as escolhas técnicas acima não foram aplicadas.
Validação: `make docs-check`, `make manifest-check` e `git diff --check`.
`make project-check` foi dispensado nesta tarefa para não executar escrita de
testes no banco. Nenhum dado clínico real foi utilizado.
