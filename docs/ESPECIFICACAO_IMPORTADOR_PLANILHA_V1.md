# Especificação Normativa do Importador da Planilha — v1

Atualizado em: 2026-08-24

Status: contrato revisado e pronto para implementação sintética; importador ainda
não implementado e dados reais não autorizados.

## Finalidade, autoridade e escopo

Este documento é a fonte de verdade única para implementar o importador sintético
do layout `planilha_ambulatorio_v1`. Ele normatiza identificação, conciliação,
transformação, conflitos, idempotência, retomada, reprocessamento e proveniência.

Em caso de divergência, aplica-se esta ordem:

1. `manifestos/planilha_ambulatorio_v1.json` para aba, posição, ocorrência,
   bloco, tipo e destino físico de cada coluna;
2. este documento para comportamento operacional do importador;
3. `docs/DECISOES_HUMANAS_NOVA_PLANILHA.md` para semântica clínica aprovada;
4. `docs/evidencias/schema_atual_ambulatorio.sql` para a estrutura aplicada.

Uma incompatibilidade entre essas fontes bloqueia a promoção estruturada afetada;
o importador não escolhe silenciosamente uma interpretação. Esta especificação
não autoriza dados reais, não altera o banco e não define conduta clínica.

O MVP lê somente as abas `Pacientes portadores de DC` e
`Pacientes não portadores de DC`. `P Digitar` e as abas AIM3 ficam fora do fluxo.
`Localizado` é preservado apenas em `importacao_linha.dados_brutos`, com cobertura
`excluido`, e nunca é promovido ao modelo estruturado do MVP.

## Vocabulário operacional

- **vazio:** célula presente cuja representação é nula, string vazia ou contém
  somente espaços; significa não informado;
- **ausente:** posição que não existe naquela aba segundo o manifesto; significa
  não coletado;
- **inválido:** valor não vazio que não satisfaz a conversão fechada desta
  especificação ou um domínio já aprovado;
- **conflito:** evidências válidas apontam para identidades ou fatos incompatíveis
  sem precedência autorizada;
- **linha clínica válida:** linha de dados não vazia, de aba/layout aceitos, com
  nome, data de nascimento e data do atendimento válidos, identidade conciliada
  sem conflito e apta a gerar exatamente um atendimento.

Vazio e ausente resultam em `NULL` ou ausência de registro dependente, nunca em
`FALSE`, zero, string vazia normalizada ou catálogo `nao_informado`. Inválido
preserva o original, não gera valor estruturado e produz pendência ou rejeição
conforme a criticidade descrita abaixo.

## Validação do arquivo e materialização bruta

Antes de qualquer escrita clínica, a execução deve:

1. calcular o SHA-256 dos bytes do arquivo e identificar
   `layout_versao = planilha_ambulatorio_v1`;
2. conferir nomes e ordens das duas abas incluídas, quantidade, posição, texto e
   ocorrência dos cabeçalhos contra o manifesto;
3. rejeitar o lote inteiro se uma aba/cabeçalho esperado faltar, sobrar, mudar de
   ordem ou grafia, ou se houver posição desconhecida;
4. criar as `importacao_linha` das linhas de dados, começando na linha física 2,
   antes de promover qualquer campo estruturado;
5. preservar `dados_brutos` como array posicional, inclusive células vazias,
   cabeçalhos repetidos, `valor_original`, ordem, posição, chave semântica e
   ocorrência; não registrar valores clínicos em logs ou mensagens de erro.

Diferenças estruturais previstas entre as duas abas, descritas pelo mesmo
manifesto, são coluna ausente e não incompatibilidade. Layout incompatível leva o
lote de `validando` para `falhou`, sem registros clínicos e com mensagem técnica
sem conteúdo de célula. Não há adaptação automática, correspondência aproximada
de cabeçalhos nem aceitação de versão parecida.

## Identidade operacional do paciente

### Chave de comparação

A chave operacional é `(nome_comparacao, data_nascimento)`. Ela serve somente
para conciliação e não cria unicidade clínica no banco.

`nome_comparacao` é obtido deterministicamente do nome original por:

1. normalização Unicode NFKD;
2. remoção apenas de marcas combinantes de acento;
3. conversão para minúsculas Unicode;
4. remoção de espaços nas extremidades;
5. substituição de cada sequência de espaços por um espaço ASCII.

Pontuação, ordem dos nomes e letras não são removidas, reordenadas ou corrigidas.
A data de nascimento deve ser convertida pela regra estrita de data deste
documento e comparada por igualdade. Nome e data originais permanecem preservados.

### Decisão de associação ou criação

Para cada chave válida, o importador pesquisa pacientes existentes aplicando a
mesma normalização ao nome e igualdade à data de nascimento:

- zero candidatos: cria um paciente, salvo se ID de origem ou outra evidência
  apontar para paciente incompatível;
- um candidato: associa a linha ao paciente;
- mais de um candidato: não escolhe; registra conflito para revisão humana;
- nome ou nascimento vazio/inválido: identidade insuficiente, não cria paciente
  nem atendimento e rejeita a linha;
- ID de origem coincidente com paciente cuja chave nome/nascimento diverge:
  conflito, sem criação, associação ou atualização;
- ID de origem, localização de prontuário e aba são evidências auxiliares. Nunca
  substituem o par nome/nascimento nem autorizam merge automático.

O ID da planilha não é globalmente confiável e não é chave de paciente. A
localização do prontuário não é número permanente de prontuário. Diferença apenas
de representação eliminada pela normalização acima não é conflito; qualquer
outra diferença é.

Campos demográficos existentes nunca são sobrescritos quando ambos os lados têm
valores não nulos distintos. Um campo nulo pode ser preenchido por valor válido da
origem somente na mesma transação da linha, com ação `atualizado` em
`importacao_registro`. Valor igual gera apenas `associado`. Divergência preserva o
registro anterior, mantém o bruto e exige revisão.

### Paciente nas duas abas e precedência

A conciliação avalia primeiro todas as chaves da aba de portadores e depois as da
aba de não portadores. Se a mesma chave aparece nas duas abas:

- `portadores` prevalece para condição de Chagas e grupo de origem;
- a linha de portadores pode prosseguir normalmente;
- a linha de não portadores é `rejeitada`, não gera atendimento nem qualquer
  escrita clínica e registra o conflito para revisão;
- nenhuma linha converte automaticamente um portador em não portador, apaga
  diagnóstico ou altera histórico anterior.

Várias linhas na mesma aba, ou linhas conciliadas do mesmo paciente, representam
atendimentos distintos. Para cada linha clínica válida é criado exatamente um
`atendimento`, com `origem_registro = planilha_portador_dc` ou
`planilha_nao_portador_dc`. Linha vazia não gera atendimento. Data de atendimento
inválida rejeita a linha; data vazia é permitida pelo schema, mas bloqueia o
importador v1 para evitar criar ocorrência clínica sem referência temporal.

## Transformações fechadas

Toda transformação preserva `valor_original`. O importador não corrige grafia,
infere unidade, completa informação ou usa locale do servidor.

### Booleanos triestado

Após remover espaços externos e converter para minúsculas sem distinguir acento:

- `sim`, `s`, `x`, `1`, `verdadeiro` → `TRUE`;
- `não`, `nao`, `n`, `0`, `falso` → `FALSE`;
- vazio → `NULL`;
- qualquer outro token → inválido e pendência, sem valor estruturado.

Não existe token aprovado para desconhecido ou não se aplica.

### Datas e anos

- data textual: somente `dd/mm/aaaa`, com dois dígitos para dia/mês, quatro para
  ano e data real do calendário; célula tipada como data deve produzir o mesmo
  dia sem considerar horário;
- não aceitar formato ambíguo, corrigir data impossível, inferir século ou usar
  data de processamento;
- ano: inteiro de quatro dígitos, sem sinal e sem parte decimal; permanece ano e
  não produz dia/mês artificial;
- vazio → `NULL`; conteúdo não conversível → inválido.

### Números e unidades

- aceitar célula numérica ou texto sem separador de milhar, com sinal opcional e
  no máximo um separador decimal `,` ou `.`;
- rejeitar texto com os dois separadores, notação científica, unidade anexada ou
  caracteres adicionais, salvo regra específica já versionada;
- aplicar as constraints e escalas do campo de destino; valor fora delas é
  inválido, nunca truncado ou limitado automaticamente;
- altura é fornecida em metros e gravada em centímetros por
  `altura_cm = altura_m * 100`;
- peso permanece kg, circunferência abdominal cm, frequência cardíaca bpm,
  saturação percentual e pressões mmHg;
- FEVE e saturação removem somente um sufixo literal `%`, quando presente, e
  preservam o texto original; não dividem por 100;
- duração cumprida de BZN aceita somente inteiro positivo em célula numérica ou
  nos formatos textuais `N`, `N dia`, `N dias`, `N semana` e `N semanas`, após
  aparar e colapsar espaços e sem distinguir maiúsculas;
- inteiro isolado ou acompanhado de `dia`/`dias` é gravado como `N` dias;
  `semana`/`semanas` é convertido exatamente por `N × 7` dias;
- zero, negativos, decimais, intervalos, aproximações, datas, meses, anos,
  abreviações e combinações de unidades são ambíguos: não são estimados, ficam
  sem promoção estruturada e exigem revisão;
- `valor_original_duracao` e `dados_brutos` preservam sempre a representação
  recebida, inclusive quando a conversão for bem-sucedida.

NYHA aceita somente `I`, `II`, `III` ou `IV` após espaços externos e conversão
para maiúsculas. Sexo, raça, comunidade, forma clínica, classificação, sorologia,
origem de encaminhamento e outros domínios somente são normalizados por aliases
explicitamente versionados; sem alias aprovado, o original fica no bruto e a
promoção afetada fica pendente.

## Catálogos, aliases e valores consolidados

Lookup é sempre por código oficial existente, nunca por criação automática.

### Projetos

| Chave do manifesto | Código oficial |
| --- | --- |
| `sami_trop_aim3` / `sami_trop_aim3_pendencia` | `sami_trop_aim3` |
| `sami_trop_1_1` | `sami_trop_1_1` |
| `parachute` / `parachute_falha` | `parachute` |
| `benbrasil` / `benbrasil_falha` | `benbrasil` |
| `epoca` / `epoca_falha` | `epoca` |
| `santa_casa_dica` | `santa_casa_dica` |
| `santa_casa_renomica` | `renomica` |
| `santa_casa_archimedes` | `archimedes` |
| `santa_casa_charm` | `charm` |
| `lxe_novartis` / `lxe_novartis_falha` | `lxe_novartis` |

Sufixo/chave de falha grava `houve_falha`, não cria projeto separado. Pendência
de AIM3 grava `possui_pendencia`. Participação, pendência e falha são independentes
e triestado; contradição entre valores não é resolvida por inferência.

### Exames e outros catálogos

`eco` usa `ecocardiograma`; `de_imagem` usa `imagem`; `laboratoriais`, `holter`,
`teste_ergometrico`, `endoscopia`, `colonoscopia` e `mapa` usam códigos homônimos;
`outros` usa `outro` e preserva o tipo original. Vazio não usa `nao_informado`.

O conjunto ECG da mesma linha usa uma ocorrência de
`atendimento_exame_complementar` com tipo `eletrocardiograma`: `ecg` alimenta
`trouxe_exame`, `ecg_solicitado` alimenta `solicitado_exame`, resultado alimenta
`resumo_resultado` e a data alimenta `data_realizacao`. Glicemia, HDL, LDL e
triglicerídeos criam resultados numerados por `nome_campo` em
`exame_complementar_resultado`, sob uma ocorrência `laboratoriais` do atendimento;
a data de colesterol alimenta `data_realizacao` dessa ocorrência. Todos os
valores originais são preservados.

### Medicamentos, comorbidades e demais domínios

Os únicos aliases de medicamento sustentados pelo catálogo físico são:

| Chave do manifesto | Código oficial |
| --- | --- |
| `anti_hipertensivo` | `antihipertensivo_nao_especificado` |
| `diureticos` | `diuretico_nao_especificado` |
| `anti_arritmicos` | `antiarritmico_nao_especificado` |
| `alfa_betabloqueador` | `betabloqueador_nao_especificado` |

As demais colunas de medicamentos não ganham alias de catálogo: usam
`atendimento_medicamento.nome_medicamento_livre` com o rótulo canônico da coluna
e o booleano em `uso_atual`. Isso não cria item em `medicamento`.

Não há aliases de comorbidade aprovados nem catálogo inicial versionado. A chave
da coluna só pode resolver um registro oficial previamente existente por nome
canônico; zero ou múltiplos candidatos geram conflito e nenhuma associação. O
importador nunca cria `comorbidade` automaticamente.

Além dos booleanos aprovados, somente NYHA possui aliases fechados (`I`, `II`,
`III`, `IV`). Sexo, raça, comunidade tradicional, forma/classificação clínica,
sorologia e origem do encaminhamento não possuem variantes de origem aprovadas;
aceitam apenas valor já igual ao domínio físico após normalização de espaços e
caixa quando a comparação for inequívoca. Qualquer variante desconhecida exige
revisão. As tabelas de aliases ficam versionadas em `aliases_versionados` no
manifesto; lista vazia significa deliberadamente “nenhum alias aprovado”.

### Contexto do atendimento

`ambulatorio_unicamente` grava `atendimento.ambulatorio_unicamente` e
`ambulatorio_anexo_ao_projeto` grava
`atendimento.ambulatorio_anexo_projeto`. Ambos são booleanos triestado e não são
projetos. Se os dois forem `TRUE`, a linha viola a decisão física, não cria o
atendimento e é `rejeitada`; nenhum valor é escolhido por precedência.

Classes de medicamentos e comorbidades só usam códigos oficiais já existentes e
explicitamente associados à chave do manifesto. Encaminhamento só aceita projeto
oficial. Se o código esperado não existir no catálogo, a operação dependente não
é criada nem substituída por `outro`: a linha fica `importada_com_pendencia`, ou
`rejeitada` quando o catálogo ausente impedir o atendimento principal. A ausência
é conflito técnico registrado; o importador não insere catálogo.

## Escrita clínica e conflitos

Cada linha é processada em uma transação própria. A ordem é: conciliar paciente,
criar/associar paciente, criar atendimento, promover dependências e gravar todos
os vínculos de proveniência. Falha operacional desfaz a transação inteira.

Para entidades consolidadas únicas por paciente ou paciente–catálogo:

- inexistente: criar;
- existente com mesmo valor: associar sem `UPDATE`;
- campo existente nulo e origem válida: preencher e registrar `atualizado`;
- valores não nulos iguais: manter e registrar `associado`;
- valores não nulos divergentes: não sobrescrever; preservar ambos na
  proveniência e encaminhar à revisão;
- jamais converter ausência em negação ou usar a precedência de aba para apagar
  fato clínico já registrado.

Entidades de ocorrência, como atendimento, exame e reação, não são deduplicadas
por paciente/tipo/data. A identidade de origem e a cadeia de proveniência impedem
recriação no mesmo conteúdo; sem evidência de que duas ocorrências são a mesma,
ambas permanecem distintas. Histórico clínico nunca é sobrescrito ou removido
silenciosamente.

Exigem revisão humana: múltiplos candidatos de paciente; evidências auxiliares
contraditórias; presença nas duas abas; divergência de valor consolidado; token
inválido; alias/domínio ausente; catálogo oficial ausente; relação condicional
contraditória; e qualquer destino incompatível entre manifesto e schema. O
registro usa `mensagem_processamento` com código técnico, campos envolvidos e
ação necessária, sem copiar valores clínicos. Os valores permanecem somente em
`dados_brutos` e campos `valor_original_*` autorizados.

## Idempotência e cadeia de reprocessamento

### Mesmo lote

`UNIQUE(importacao_lote_id, aba_ordem, numero_linha)` impede duplicar a linha.
Antes de escrever, o processo consulta `importacao_registro` da linha:

- vínculo já existente e alvo válido: reutilizar, nunca recriar;
- operação ainda não vinculada: executar uma vez e criar o vínculo na mesma
  transação;
- vínculo para alvo inexistente: conflito técnico; não criar substituto
  silencioso.

Reexecutar um lote concluído é somente leitura/verificação e não altera registros
clínicos. Lote não terminal retoma apenas linhas não terminais.

### Novo lote encadeado

O primeiro lote de `(hash_arquivo_sha256, layout_versao)` não tem predecessor.
Nova tentativa do mesmo conteúdo/layout cria lote com
`lote_reprocessado_de_id` apontando para a execução imediatamente anterior da
mesma cadeia; nunca altera ou reutiliza as linhas anteriores. Ciclos e saltos de
cadeia são proibidos pelo processo.

A identidade de origem entre reprocessamentos é
`(hash_arquivo_sha256, layout_versao, aba_ordem, numero_linha)`. Para cada nova
linha, o processo percorre a cadeia do predecessor mais recente para trás:

- se encontrar linha importada para a mesma posição, associa os mesmos alvos
  ainda existentes e não repete criação/atualização clínica;
- se encontrar linha pendente/rejeitada, reaplica as regras vigentes e registra
  somente operações faltantes, sem apagar decisões anteriores;
- qualquer resultado diferente é nova evidência auditável no novo lote;
- alteração de bytes ou layout inicia outra identidade de conteúdo e não pode ser
  tratada como reprocessamento pela FK existente.

## Retomada após falha

O MVP opera com um único executor por lote, garantido por bloqueio exclusivo da
aplicação. O fluxo persiste cada linha em transação independente:

1. lote `pronto → processando` e linha `pendente → processando`;
2. sucesso confirma registros, `importacao_registro` e estado terminal juntos;
3. erro de regra confirma apenas `rejeitada` ou `importada_com_pendencia`, com
   mensagem segura;
4. erro operacional desfaz a linha e marca o lote `falhou` em transação separada;
5. após confirmar que não existe executor ativo, retomada do mesmo lote muda
   linhas residuais `processando` para `pendente` e processa `pendente` em ordem
   `(aba_ordem, numero_linha)`; linhas terminais são verificadas, não repetidas.

Como a transação da linha inclui a proveniência, não pode existir criação clínica
confirmada sem `importacao_registro` correspondente. Se essa invariável falhar por
intervenção externa, a retomada para e exige revisão técnica.

## Estados e critérios de conclusão

### Linha

- `pendente`: materializada no bruto e ainda não iniciada;
- `processando`: transação da linha em andamento;
- `importada`: atendimento e todos os destinos aplicáveis foram criados ou
  associados, sem conflito ou valor inválido;
- `importada_com_pendencia`: atendimento válido foi preservado, mas ao menos um
  campo/destino não crítico ficou sem promoção ou requer revisão;
- `rejeitada`: identidade, data do atendimento, layout da linha ou outra condição
  crítica impediu criar um atendimento válido; não há escrita clínica da linha;
- `ignorada`: linha fisicamente vazia. Não é usada para esconder erro, aba fora do
  escopo ou duplicidade.

### Lote

- `recebido → validando → pronto → processando` é o fluxo normal;
- `concluido`: todas as linhas são `importada` ou `ignorada`;
- `concluido_com_pendencias`: todas são terminais e existe ao menos uma
  `importada_com_pendencia` ou `rejeitada`;
- `falhou`: layout incompatível ou falha operacional interrompeu a execução;
- `cancelado`: encerramento operacional explícito; não é resultado de validação.

`mensagem_erro` resume falha de lote; `mensagem_processamento` resume decisão da
linha. Contagens são sempre derivadas das linhas.

## Uso obrigatório da proveniência

- `importacao_lote`: uma execução, hash/layout, estado e predecessor;
- `importacao_linha`: posição original, bruto integral, responsável legado e
  decisão da linha;
- `importacao_registro`: todo registro criado, alterado ou associado pela linha,
  com ação real `criado`, `atualizado` ou `associado`.

O alvo heterogêneo deve existir e ser permitido pelo manifesto no momento de
gravar `importacao_registro`. Uma linha pode apontar para vários registros e um
registro pode receber proveniência de várias linhas. Responsável legado nunca é
associado automaticamente a usuário autenticado; seu texto é copiado exatamente
para `responsavel_digitacao_original`, inclusive quando for string vazia, além de
permanecer no bruto. Dados brutos ficam no
PostgreSQL controlado, fora de logs, Git, APIs genéricas e dumps compartilhados.

## Pendências classificadas

### 1. Bloqueiam o importador

Nenhuma pendência técnica bloqueia o importador sintético do MVP. As onze chaves
com cobertura `parcial` possuem comportamento fechado: ficam no bruto, não são
promovidas e tornam uma linha clínica válida `importada_com_pendencia`. Elas só
podem ganhar destino pleno após decisão humana específica e atualização
versionada do contrato.

Autoridade de importação, responsável por revisão, roles, privilégios, retenção e
auditoria de acesso continuam bloqueando exclusivamente dados reais.

### 2. Podem ser tratadas durante a implementação

- códigos estáveis das mensagens técnicas e formato do relatório de execução;
- mecanismo concreto de bloqueio exclusivo por lote e detecção de executor ativo;
- lista de tabelas permitidas derivada do manifesto e verificação de alvos órfãos;
- testes sintéticos de concorrência, queda e retomada;
- forma de aplicar as normalizações sem depender de locale.

Esses itens não autorizam alterar as regras normativas deste documento.

### 3. Podem ficar para depois do MVP

- prontuário permanente e sua futura unicidade;
- fluxo das abas operacional e AIM3;
- multiplicidade de contrarreferência;
- histórico temporal de participação em projetos e backfills legados;
- domínio clínico de gravidade/consequência de reação adversa;
- associação do responsável legado a usuário;
- busca/indexação ampla no JSONB e auditoria automática de órfãos;
- prazo de purga, desde que nenhum dado real seja carregado antes da política
  institucional de retenção e acesso.

## Critério de prontidão

Estas regras e o manifesto formam contrato fechado para implementar o importador
sintético do MVP. “Fechado” inclui o tratamento determinístico das onze chaves
parciais somente no bruto; não significa cobertura estruturada artificial. Dados
reais continuam bloqueados pela governança institucional. Alterar uma regra
normativa exige atualização explícita deste documento e, quando afetar
layout/destino, revisão versionada do manifesto.
