# Especificação Normativa do Importador da Planilha — v1

Atualizado em: 2026-10-03

## Preflight, relatório e rastreabilidade

`--dry-run` executa layout, staging, conciliação, transformações, classificação e
promoção pelo mesmo código do modo aplicado. Uma transação externa transforma as
transações por linha em savepoints e executa `ROLLBACK` ao final, sem persistir
lote, linha, paciente, atendimento ou registro clínico.

O JSON determinístico `ambulatorio.import-quality-report/v1` registra totais,
válidas, importáveis, pendências, rejeições, conflitos de identidade/abas, valores
inválidos, catálogos desconhecidos, outras causas, hashes e versões do arquivo,
manifesto, importador e Git, além da finalidade declarada (`purpose`, desde v1.4.0).
O lote aplicado persiste hash do manifesto, versão
do importador e revisão Git. Logs JSON permitem apenas eventos/metadados técnicos
e contadores, nunca valores de células ou mensagens clínicas por linha.

Status: importador v1.7.0 com promoção controlada de D11 e mapeamento seletivo
de datas reais dos retornos BZN, ano inequívoco de D8, negativa inequívoca de
exame familiar D3 e promoção restrita de D2 após prova de captura do `NULL` na
linha-base. O manifesto semântico vigente é v1.4; 34 testes unitários e E2E,
incluindo concorrência de promoção D2 e preservação F13, passaram em banco
descartável. A primeira política não crítica foi implementada na v1.3.0. A
ADR-022 define revisão entre hashes; a CLI mantém a barreira da v1.4.0 e recusa
sua aplicação operacional. A Etapa 5 sintética teve aceite integrado, registrado
em [ACEITE_INTEGRADO_ETAPA_5.md](validacoes/ACEITE_INTEGRADO_ETAPA_5.md); a
ativação HTTP permanece explicitamente opt-in, desabilitada por padrão e recusada
em produção. Dados legados sem evidência de captura não são promovidos.

## Finalidade, autoridade e escopo

Este documento é a fonte normativa operacional para implementar o importador sintético
do layout `planilha_ambulatorio_v1`. Ele normatiza identificação, conciliação,
transformação, conflitos, idempotência, retomada, reprocessamento e proveniência.

As fontes têm responsabilidades distintas:

1. `docs/dados/DECISOES_HUMANAS_NOVA_PLANILHA.md` determina a semântica de negócio,
   incluindo as respostas D1–D12; texto antigo do manifesto não a sobrepõe;
2. este documento define o comportamento operacional pretendido;
   arquivos revisados são detalhados no complemento normativo
   [Contrato Temporal de Revisão da Planilha](arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md);
3. `manifestos/planilha_ambulatorio_v1.json` descreve o contrato físico atualmente
   consumido pelo importador: aba, posição, ocorrência, bloco, tipo e destino;
4. código, migrations, testes e configuração executável comprovam o comportamento
   implementado; `docs/evidencias/schema_atual_ambulatorio.sql` registra o schema
   aplicado, sem substituir a verificação do ambiente.

Uma incompatibilidade entre essas fontes bloqueia a promoção estruturada afetada;
o importador não escolhe silenciosamente uma interpretação. Esta especificação
não autoriza dados reais, não altera o banco e não define conduta clínica.

O MVP lê somente as abas `Pacientes portadores de DC` e
`Pacientes não portadores de DC`. `P Digitar` e as abas AIM3 ficam fora do fluxo.
`Localizado` é preservado apenas em `importacao_linha.dados_brutos`, com cobertura
`excluido`, e nunca é promovido ao modelo estruturado do MVP.

## Evolução confirmada e limites de implementação

As [decisões humanas](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md) são a fonte integral
das respostas; a [matriz de impacto](dados/COBERTURA_COLUNAS_PLANILHA.md) avalia
destinos reutilizáveis, migrations justificadas e testes. Não mais considerar
os dez campos ainda parciais como pós-MVP nem a multiplicidade de contrarreferência
indefinida. A exclusão funcional de `Localizado` foi confirmada.

Rótulos `parcial` continuam preservados no bruto. D11 deixou essa classificação
na v1.2.0; D8 mantém classificação parcial, mas ano inequívoco pode gerar evento
anual pelo handler explícito. Datas reais de retorno BZN também têm handlers
seletivos. Não promover os demais dados por interpretação ad hoc. As respostas
humanas já foram incorporadas; cobertura funcional restante exige implementação
e aceite técnico. Atualização
de uma linha da planilha não comprova nova visita e não permite reconstruir
histórico perdido.

O [estado da implementação](IMPORTADOR_SINTETICO_V1.md) registra a reconciliação
BZN corrigida na v1.1.1, a promoção controlada de D11 na v1.2.0, a primeira
política não crítica na v1.3.0, D8/F13 na v1.6.0 e a promoção segura de D2
descrita abaixo. Revisões temporais entre hashes são suportadas pelo fluxo
separado da ADR-022 no backend sintético aceito; a CLI do importador mantém sua
recusa. Outras promoções e a classificação individual de erros secundários
continuam limitadas aos handlers e contratos já aprovados.

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

A associação linha → atendimento acima descreve o contrato v1. Para versões
revisadas, o fluxo da ADR-022 implementa o contrato temporal complementar no
backend sintético; não estender a regra de carga inicial automaticamente a toda
atualização do registro de origem. A CLI do importador continua isolada e recusa
revisões entre hashes. O ano isolado de D8 tem representação estruturada, sem
inventar dia ou visita.

Vazio e ausente resultam em `NULL` ou ausência de registro dependente, nunca em
`FALSE`, zero, string vazia normalizada ou catálogo `nao_informado`. Inválido
preserva o original, não gera valor estruturado e produz pendência ou rejeição
conforme a criticidade descrita abaixo.

## Validação do arquivo e materialização bruta

Antes de qualquer escrita, exigir `--finalidade` exatamente uma vez:
`carga_inicial`, `mesmo_conteudo` ou `revisao`. Finalidade ausente, inválida,
repetida ou revisão ainda não suportada bloqueia antes da leitura da fonte e da
conexão. Reprocessar exige `mesmo_conteudo`, cujo hash/layout deve existir antes
de qualquer escrita. A barreira vale também para dry-run e não autoriza criar
relatório de sucesso. Carga inicial declarada de conteúdo conhecido preserva
idempotência/retomada; de conteúdo desconhecido não comprova nova ocorrência clínica.

Após validar a declaração, a execução deve:

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

No BZN, a reconciliação compara os atributos clínicos, preservando o atendimento
original, inclusive quando nulo. O atendimento da nova linha é rastreado por
`importacao_registro`, sem substituir esse vínculo. A v1.1.1 implementa essa regra
com bloqueio da linha de tratamento existente, proveniência e rollback de toda
a linha de importação quando encontra divergência consolidada.

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

### Criticidade explícita dos erros

A classificação é conservadora: todo erro de regra continua crítico e causa
rollback da linha, salvo quando existir uma entrada explícita e versionada no
registro de políticas não críticas do código. A entrada deve informar código
técnico, handler, destino, âncora e estratégia de nova tentativa. Alterar somente
uma mensagem ou capturar genericamente `RowConflict` não muda a criticidade.

São críticos: falha de identidade; nome, nascimento ou data do atendimento
inválidos; conflito entre abas; contexto do atendimento impossível; divergência
de fato consolidado; proveniência inválida; layout/destino incompatível; e falha
operacional. Valores opcionais inválidos e catálogos ausentes também permanecem
críticos até aprovação individual, porque handlers distintos possuem efeitos e
cardinalidades diferentes.

A primeira regra não crítica é `catalogo_projeto_ausente`, restrita ao handler
`projects()` e ao destino `paciente_projeto_estudo`. Paciente e atendimento são
confirmados, os demais destinos continuam sendo processados e apenas a associação
do projeto ausente deixa de ser criada. O catálogo não é criado nem substituído;
o valor de origem permanece em `dados_brutos`; a linha termina
`importada_com_pendencia`. O código da mensagem contém somente a regra e o código
técnico do projeto, nunca o conteúdo da célula.

No reprocessamento do mesmo conteúdo/layout, essa regra executa novamente somente
o projeto registrado como pendente, usando o paciente da proveniência. Se o
catálogo já existir, cria ou reconcilia o vínculo e remove a pendência; se ainda
faltar, mantém o mesmo estado. Nenhum atendimento é criado. Conflito consolidado
durante a nova tentativa não sobrescreve o vínculo e permanece pendente; erro de
banco continua operacional e interrompe o lote.

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

### Promoção controlada de pendências

A promoção é um modo restrito do reprocessamento do mesmo conteúdo e layout. Ela
se aplica quando a linha válida mais recente da cadeia está
`importada_com_pendencia` e uma versão posterior do contrato passou a suportar
uma ou mais chaves antes preservadas somente no bruto. Ela não se aplica a arquivo
com outro hash, não cria uma nova visita e não reexecuta o fluxo completo da linha.

Cada chave promovível deve constar de um registro versionado no código, validado
contra o manifesto, contendo: chave semântica, cobertura declarada compatível, handler
específico, tabelas de destino permitidas, âncora (`paciente` ou `atendimento`) e
política de reconciliação. Mudar apenas `situacao_cobertura` no manifesto não
habilita promoção. A lista inicial da v1.2.0 continha somente
`pendencias_observacao`, com handler `pending_note`, destino
`pendencia_atendimento`, âncora `atendimento` e política
`repeatable_by_provenance`. A lista atual também inclui data de descoberta,
datas reais dos retornos BZN e ano D8. Esses handlers não tornam os rótulos
parciais integralmente cobertos; valores sem conversão inequívoca continuam
brutos e pendentes. As outras chaves requerem aprovação e implementação próprias.

O processamento deve seguir estas regras, na mesma transação da nova linha:

1. localizar na cadeia a linha válida mais recente da mesma posição e validar
   todos os alvos de sua proveniência;
2. copiar os vínculos válidos para a nova linha com ação `associado` e resolver
   exatamente um `paciente` e um `atendimento` já existentes como âncoras;
3. para linha anterior `importada`, encerrar pela reutilização normal; para
   `importada_com_pendencia`, calcular a interseção entre células não vazias,
   chaves hoje plenas e o registro explícito de promoção;
4. executar somente os handlers dessa interseção, sem chamar `patient()`, sem
   criar outro atendimento e sem repetir os demais handlers;
5. recalcular as chaves ainda parciais e concluir como `importada` apenas quando
   nenhuma pendência permanecer; caso contrário, manter
   `importada_com_pendencia`.

Um handler de promoção pode criar um registro dependente ausente quando o contrato
define uma identidade inequívoca e a âncora já validada. Em alvo consolidado já
existente, igualdade apenas associa; valor não nulo divergente gera pendência e
nunca é sobrescrito. Preencher `NULL` exige regra explícita por campo e evidência
de que o importador possui esse campo. Sem histórico de campo capaz de distinguir
ausência original de uma remoção manual, a promoção não atualiza esse alvo e o
encaminha para revisão. Destino repetível sem chave de reconciliação aprovada
também permanece pendente, pois coincidência textual não autoriza associação nem
criação possivelmente duplicada.

Para D11, a identidade segura é a proveniência do próprio alvo. Um registro
equivalente já vinculado na cadeia é associado; se nenhum existir e o atendimento
não tiver outra pendência, o handler cria uma nova ocorrência textual. Qualquer
pendência já existente sem esse vínculo torna a situação ambígua: o registro
manual fica intacto e a chave permanece pendente. O handler preserva o texto em
`descricao` e `valor_original_pendencia` e não infere tipo, status, responsável,
datas ou classificação clínica.

As operações novas ficam em savepoint posterior à associação dos alvos antigos.
Conflito ou ambiguidade desfaz tudo que o handler de promoção tentou gravar,
preserva as associações válidas na nova linha e a encerra
`importada_com_pendencia`. Alvo anterior inexistente, âncora ausente ou múltipla e
tabela fora da lista permitida são inconsistências técnicas: nenhum substituto é
criado e a linha permanece pendente para revisão. Uma falha operacional conserva
o comportamento de retomada da seção seguinte.

`importacao_registro` continua registrando a ação efetiva por alvo: `criado` para
novo dependente, `atualizado` para preenchimento permitido e `associado` para alvo
reutilizado ou equivalente. `mensagem_processamento` pode listar somente IDs de
lote e chaves semânticas promovidas, remanescentes ou conflitantes; valores das
células não podem aparecer. Esse nível de auditoria é suficiente para o MVP sem
migration. Auditoria futura por campo exigirá contrato e estrutura próprios.

Casos de aceite obrigatórios para a implementação:

- reprocessar uma linha `importada` continua sem qualquer escrita clínica;
- promover uma única chave cria ou reconcilia somente seu destino e reutiliza o
  mesmo paciente e atendimento;
- promover parte das chaves mantém as demais pendentes e expõe somente seus nomes
  técnicos na mensagem;
- dois elos consecutivos reutilizam o resultado promovido sem duplicação;
- valor equivalente associa, `NULL` autorizado é preenchido e divergência não
  sobrescreve o alvo;
- edição manual não comprovadamente distinguível permanece intacta e exige revisão;
- conflito tardio reverte todas as escritas novas do handler, mantendo os alvos
  anteriores associados;
- proveniência ausente, órfã ou ambígua não leva à criação de paciente,
  atendimento ou substituto;
- `--dry-run` exercita o mesmo caminho e reverte inclusive a promoção;
- arquivo de hash diferente fica fora deste contrato e depende da política
  temporal de arquivos revisados.

## Arquivos revisados com novo hash

O [contrato temporal complementar](arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md)
define identidade entre versões, correção da mesma ocorrência, nova visita,
atualização consolidada, precedência, auditoria e casos de aceite. A v1.4.0
implementa a barreira de finalidade e recusa revisões. A reconciliação entre hashes
foi implementada e aceita no fluxo HTTP separado da Etapa 5; a CLI mantém essa
recusa. Declarar carga inicial indevidamente ainda pode duplicar visitas. Não usar
`--reprocessar` nem a FK de predecessor do mesmo hash para representar revisão.

A aplicação HTTP exige finalidade explícita, mapeamento revisado e histórico
por campo antes de qualquer correção. Sem evidência de ocorrência nova, não criar
visita; sem identidade/proveniência inequívoca, preservar o bruto e bloquear a
linha. Auditoria mínima por alvo da promoção D11 não basta para esse fluxo.

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

O contrato sintético antigo pode ser exercitado em seu escopo homologado, mas
não equivale a prontidão para o MVP revisado. Bloqueiam seus fluxos afetados:

- expandir a promoção controlada somente para chaves com contrato, manifesto,
  handler e testes aprovados; D11 já está implementada;
- a CLI do importador não executa revisões entre hashes e mantém recusa antes de
  qualquer escrita. Atualizações temporais devem usar o fluxo próprio da ADR-022,
  aprovado no ambiente sintético integrado; não contornar essa separação via
  `--reprocessar`;
- promover apenas campos com contrato humano resolvido e proteção técnica
  específica; D2 agora tem uma prova restrita de promoção de `NULL` capturado,
  enquanto D3 e outros campos permanecem sujeitos às suas próprias condições.

As nove chaves `parcial` continuam preservadas no bruto. Quando preenchidas sem
handler/conversão válida, tornam a linha `importada_com_pendencia`; ano D8 válido
e datas reais de retorno BZN podem ser estruturados seletivamente. As respostas
já confirmadas dispensam rediscutir sua
semântica, mas não dispensam atualização coordenada de manifesto, handlers e testes.

Autoridade de importação, responsável por revisão, provisionamento institucional
dos logins/segredos, retenção e auditoria de acesso continuam bloqueando dados
reais. As roles e o isolamento técnico já existem; não são uma etapa a refazer.

### 2. Podem ser tratadas durante a implementação

- ampliar a política de erros críticos/não críticos somente por handler e com
  testes; `catalogo_projeto_ausente` é a primeira regra não crítica;
- mecanismo concreto de bloqueio exclusivo por lote e detecção de executor ativo;
- lista de tabelas permitidas derivada do manifesto e verificação de alvos órfãos;
- testes sintéticos de concorrência para outros fluxos, queda e retomada; D2 já
  comprova especificamente a serialização da promoção diante de edição concorrente;
- forma de aplicar as normalizações sem depender de locale.

Esses itens não autorizam alterar as regras normativas deste documento.

### 3. Podem ficar para depois do MVP

- prontuário permanente e sua futura unicidade;
- fluxo das abas operacional e AIM3;
- upload de contrarreferência, provisoriamente P2 e sujeito à confirmação da equipe;
  registro múltiplo não integra mais o adiamento genérico;
- histórico temporal de participação em projetos e backfills legados;
- domínio clínico de gravidade/consequência de reação adversa;
- associação do responsável legado a usuário;
- busca/indexação ampla no JSONB e auditoria automática de órfãos;
- prazo de purga, desde que nenhum dado real seja carregado antes da política
  institucional de retenção e acesso.

## Critério de prontidão

A homologação do importador comprova 126 rótulos plenos declarados, preservação
determinística dos nove rótulos parciais, promoção de D11, mapeamento seletivo
de D8 e a promoção restrita de D2 com captura atribuível e concorrência coberta
no cenário sintético. A Etapa 5 sintética foi aceita após validação integrada
(ver [registro de aceite](validacoes/ACEITE_INTEGRADO_ETAPA_5.md)). A ativação
HTTP permanece opt-in, desabilitada por padrão e recusada em produção.
A prontidão para o MVP revisado depende
dos critérios do [roadmap](PROXIMOS_PASSOS.md), regressões das lacunas conhecidas e
cenários sintéticos das novas decisões; não decorre apenas da contagem de 126
rótulos. Dados reais continuam bloqueados pela governança institucional. Alterar
uma regra normativa exige revisão explícita deste documento e, quando afetar
layout/destino, atualização coordenada e versionada do manifesto e implementação.

## Data de descoberta do paciente — v1.5.0 sintética

A chave `autorelato_diagnostico_de_chagas_do_participante_data` é convertida
explicitamente para `diagnostico_chagas.data_descoberta_autorelato`. A presença
somente dessa data pode criar o registro de diagnóstico do atendimento, sem
inferir resultado de sorologia ou confirmação da doença. O original permanece
no bruto e o alvo é registrado na proveniência. A migration 61 habilita captura
prospectiva de `diagnostico_chagas.data_descoberta_autorelato`, sem backfill de
`NULL` legado. Na promoção de mesmo conteúdo/layout, o importador exige um único
diagnóstico associado pela proveniência da linha-base. Um valor igual gera
somente `associado`, sem `UPDATE`; uma divergência permanece pendente para revisão.

O preenchimento de `NULL` só é permitido quando a própria linha-base prova o
`INSERT` inicial do diagnóstico com evento de auditoria versão 1, origem
`importacao`, antes `alvo_ausente`, depois `nulo`, e nenhum evento posterior para
o campo e alvo. A função restrita
`auditoria_d2_null_captura_comprovada(linha_atual, linha_base, diagnostico)`
verifica cadeia de reprocessamento, hash/layout, posição, bruto e proveniência,
retornando apenas booleano; o importador é seu único executor autorizado e não
consulta nem expõe os eventos brutos. `NULL` legado sem essa evidência, valor
divergente e ciclo de edição A→B→A (mesmo que o valor atual volte a `NULL`) não
são promovidos. A suíte sintética `tests/importador/test_descoberta_chagas.py`
e `tests/sql/34_validar_captura_descoberta_chagas.sql` cobrem esses casos, a
associação sem escrita e a preservação da trilha. A prova de concorrência em
`tests/importador/test_concorrencia_promocao_d2.py` mantém o alvo bloqueado em
uma sessão, executa NULL→data→NULL antes da retomada e confirma a recusa sem
efeito clínico ou auditoria parcial. A barreira da CLI a revisões entre hashes
continua isolada; o aceite integrado da Etapa 5 não habilita essa funcionalidade
na CLI. A ativação HTTP é opt-in, default off e recusada em produção.

## Ano do último comparecimento — D8 na v1.6.0 sintética

O texto legado de `retorno_anual_realizado` permanece no bruto. Se representar
um único ano válido, o importador registra `evento_clinico.ano_evento` com tipo
`ultimo_comparecimento_ano_informado`, original preservado, paciente e
proveniência. O ano informa precisão anual; não prova atendimento, retorno
realizado, quantidade de visitas nem dia/mês. Texto livre ou ambíguo conserva a
pendência, sem fabricar um evento.

No reprocessamento do mesmo hash, associação de evento existente exige vínculo
de proveniência da mesma fonte e layout; alvo divergente ou múltiplo é conflito.
Igualdade de ano em outra fonte não comprova identidade. O E2E sintético aprovado
com manifesto v1.4 em `/tmp/ambulatorio-check-hsao0uvy/output.log` cobriu carga
de 2023, texto ambíguo preservado, no-op, reprocessamento sem duplicação,
correção privada 2023→2022 e bloqueio da origem superada após a correção. O teste
de precedência estende F13 a data e observações do atendimento. A CLI continua
recusando revisão entre hashes mesmo após o aceite integrado da ADR-022; a revisão
é uma operação isolada no backend.

## Exame familiar legado — D3 com manifesto v1.4

O rótulo `familiares_diretos_mae_pai_irmaos_realizaram_o_exame_de_chagas`
continua parcial e preservado no bruto. Uma negativa booleana inequívoca permite
registrar `rastreio_familiar.familiares_examinados = false`, com original,
atendimento e proveniência. Uma afirmativa sem parente e resultado identificados
não autoriza inventar exame individual; texto ambíguo permanece pendente. O
handler e o metadado v1.4 foram validados em banco descartável: carga negativa,
preservação do bruto, promoção de lote legado e proveniência sem duplicação.
