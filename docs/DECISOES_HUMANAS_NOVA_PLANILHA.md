# Decisões Humanas para a Nova Planilha

Atualizado em: 2026-08-06

## Finalidade e precedência

Este documento consolida as decisões humanas confirmadas para o MVP da nova
planilha. Ele é a fonte de verdade para semântica, cardinalidade e regras de
importação. `docs/IMPACTO_NOVO_LAYOUT_PLANILHA.md` continua sendo a fonte da
estrutura física observada e `docs/evidencias/schema_atual_ambulatorio.sql`, a
fonte do schema aplicado de 33 tabelas.

Nenhuma decisão deste documento altera o banco por si só. Mudanças físicas deverão
ser especificadas e implementadas em migrations incrementais futuras.

## Legenda da classificação

1. apenas regra de manifesto/importação;
2. atualização documental;
3. nova migration incremental necessária antes do MVP;
4. pendência que pode ficar no backlog;
5. bloqueio para importação de dados reais.

Uma decisão pode receber mais de uma classe quando, por exemplo, exige migration e
também uma regra do importador.

## Escopo, linha e precedência

| Decisão confirmada | Classes | Consequência |
| --- | --- | --- |
| As duas abas clínicas representam portadores e não portadores | 1, 2 | a aba define `atendimento.origem_registro` e a condição de Chagas |
| Cada linha é um atendimento; o mesmo paciente pode ocupar várias linhas | 1 | criar um `atendimento` por linha válida, sem duplicar o paciente |
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
- criar atendimentos distintos para linhas distintas do mesmo paciente;
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
por atendimento. É necessária antes do MVP uma nova associação paciente–projeto,
com participação, pendência, falha, textos originais e proveniência. A tabela
atual não deve ser apagada nesta fase; sua transição e eventual obsolescência
precisam ser especificadas. Classes 1, 2 e 3.

A estrutura futura foi fechada em
`docs/ESPECIFICACAO_ASSOCIACAO_PACIENTE_PROJETO.md`: associação consolidada
`paciente_projeto_estudo`, única por paciente e projeto, sem atendimento e sem
alteração retroativa de `atendimento_projeto_estudo`. A especificação está pronta
para migration incremental; aliases, conflitos e consolidação entre linhas
continuam como regras do futuro importador.

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
ser reutilizados. O conflito é estrutural:
`atendimento_exame_complementar.atendimento_id` é obrigatório e o registro não
possui `paciente_id`. Antes do MVP é necessária migration que torne o paciente o
vínculo obrigatório e o atendimento opcional, assegurando, quando ambos existirem,
que o atendimento pertença ao mesmo paciente. Não deve haver unicidade por tipo,
pois múltiplas ocorrências são válidas. Classes 1, 2 e 3.

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

Antes do MVP é necessária migration incremental para:

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

## Encaminhamento e contrarreferência

- `Trouxe encaminhamento` significa apresentação do documento, é booleano e pode
  ser registrado em qualquer atendimento;
- cada encaminhamento aponta para no máximo um projeto oficial;
- contrarreferência é a devolução de informações ao serviço de origem e aceita
  `sim`, `não` ou sem dados;
- a multiplicidade de contrarreferências continua indefinida.

`encaminhamento` exige atendimento, o que é compatível, mas não possui indicador
de documento apresentado nem FK para projeto. Esses dois campos exigem migration
antes do MVP para representação estruturada. A contrarreferência pode permanecer
no backlog como estado consolidado em `acompanhamento_cuidado` até sua
multiplicidade ser decidida. Classes 1 e 3 para encaminhamento; classes 2 e 4 para
contrarreferência.

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
O suporte físico básico existe. Definir idempotência, retomada e auditoria de
decisões é classe 1 e, antes de dados reais, classe 5.

Dados brutos serão acessíveis somente com permissão; usuários sem permissão verão
apenas dados estruturados; o JSONB será mantido para auditoria. Antes de importar
dados reais, são bloqueios classe 5:

1. prazo institucional de retenção;
2. responsável autorizado a aprovar importações;
3. responsável por revisar erros e contradições;
4. roles e privilégios operacionais;
5. política de auditoria e acesso ao JSONB;
6. semântica de `Localizado`, caso esse campo entre no MVP.

Como a primeira versão será disponibilizada em servidor com dados reais, também
devem estar operacionais antes da carga: ambiente protegido, transporte seguro,
backup/restauração testados, gestão de segredos e registro de acesso. Isso não
altera a cobertura de colunas, mas é bloqueio de implantação real.

## Matriz consolidada de impacto

| Impacto | Classificação | Situação para o MVP |
| --- | ---: | --- |
| aba, linha=atendimento, precedência e vazio | 1 | obrigatório no manifesto/importador |
| identificação nome+nascimento e conflitos sem merge | 1, 5 | regra obrigatória; revisão humana precisa ter responsável |
| prontuário permanente opcional | 4; futuramente 3 | não bloqueia enquanto ausente na fonte |
| paciente–projeto e variante de falha | 3 | migration antes do MVP |
| complicações repetíveis ligadas ao atendimento | 1, 2 | schema atual atende; data própria no backlog |
| exame por paciente com atendimento opcional | 3 | migration antes do MVP |
| duração, cardinalidade e detalhes do tratamento BZN | 3 | migration antes do MVP |
| documento apresentado e projeto do encaminhamento | 3 | migration antes do MVP |
| múltiplas contrarreferências | 4 | backlog |
| conversões, datas, anos e booleanos | 1 | obrigatório no manifesto/importador |
| responsável legado–usuário | 4 | sem associação automática no MVP |
| cadeia histórica de reprocessamento | 1 | estrutura atual reutilizada |
| governança e acesso ao bruto | 5 | bloqueia dados reais |
| `Localizado` | 4 e 5 se incluído | excluir do estruturado no MVP ou definir semântica |
| `observação` genérica | 1, 2 | pode ir para `atendimento.observacoes`, preservando bruto |

## Sequência recomendada até o MVP

1. Aprovar este consolidado e declarar `Localizado` fora do mapeamento estruturado
   do MVP enquanto sua semântica não for definida.
2. Especificar as quatro migrations incrementais: paciente–projeto; exames por
   paciente; tratamento/reação adversa; encaminhamento/projeto.
3. Implementar e validar essas migrations com dados sintéticos, sem alterar
   migrations antigas.
4. Formalizar manifesto versionado das duas abas clínicas, incluindo posição,
   ocorrência, bloco, tipo, aliases, conversões e regras de vazio.
5. Especificar identificação, precedência entre abas, conflitos, idempotência,
   retomada e cadeia de reprocessamento.
6. Definir retenção, autoridades, revisão, roles, privilégios e auditoria do JSONB.
7. Implementar o importador e testes exclusivamente com planilha sintética.
8. Preparar servidor seguro, segredos, backup/restauração e observabilidade.
9. Homologar uma carga controlada com revisão formal de erros antes da importação
   real completa.

## Validação desta atualização

`make project-check` foi executado. As verificações documentais passaram, mas
`db-check` não pôde validar o banco porque o PostgreSQL local esperado não estava
disponível/configurado. Como fallback, `make docs-check` e `git diff --check`
foram executados com sucesso.
