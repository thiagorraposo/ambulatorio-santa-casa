# Importador Sintético v1

Atualizado em: 2026-10-01

O importador v1.7.0 usa o manifesto semântico v1.4, registra o ano inequívoco do
último comparecimento (D8) como evento anual e preserva correções temporais ao
reprocessar origem antiga no cenário F13. A v1.5.0 incorporou a data de descoberta
do paciente pela migration 28. Mantém a barreira da v1.4.0: exige finalidade explícita e recusa revisões de conteúdo antes
de qualquer escrita, inclusive em dry-run. A v1.3.0 classifica erros de forma conservadora e implementa a primeira
regra não crítica para catálogo de projeto ausente. A v1.2.0 implementou a
promoção controlada de D11 (`pendencias_observacao`) e a v1.1.1 corrigiu a
reconciliação de BZN por paciente. Os recursos
`--dry-run`, `--quality-report` e `--db-role` foram introduzidos na v1.1.0.
Na fixture da homologação original, o preflight classificou 10 linhas: 6 válidas/importáveis,
2 com pendência, 4 rejeitadas, 1 conflito de identidade, 1 entre abas, 1 valor
inválido, 0 catálogos desconhecidos e 1 outra causa. Dois reports foram idênticos
e as contagens clínicas e de importação antes/depois permaneceram iguais. Esse
resultado histórico não é homologação das respostas incorporadas em 2026-09-14.

## Finalidade

`scripts/importar_planilha.py` é a primeira execução funcional do contrato
`planilha → banco`. O manifesto JSON continua sendo a fonte física de abas,
cabeçalhos, posições, cobertura e aliases; a especificação normativa continua
sendo a fonte das regras operacionais. Esta versão é autorizada somente para
dados sintéticos.

## Execução

```bash
make importer-fixture
make importer-test
make importer-run IMPORT_FILE=tests/fixtures/planilha_importacao_v1_sintetica.xlsx IMPORT_PURPOSE=carga_inicial
make importer-dry-run IMPORT_FILE=tests/fixtures/planilha_importacao_v1_sintetica.xlsx IMPORT_PURPOSE=mesmo_conteudo
```

O importador usa Python 3 apenas com biblioteca padrão e uma sessão persistente
do `psql`. O teste E2E cria um banco Docker isolado com sufixo
`_importador_test`, aplica as migrations e remove esse banco ao terminar.

## Barreira de finalidade — v1.4.0

A CLI exige `--finalidade` exatamente uma vez; os alvos Make exigem
`IMPORT_PURPOSE`, sem valor padrão. Logs e relatórios incluem a declaração no
campo técnico `purpose`; ela não é decisão auditada nem prova de identidade clínica.

| Finalidade | Comportamento |
| --- | --- |
| `carga_inicial` | Permite iniciar um lote sintético. Se o hash/layout já existe, mantém no-op ou retomada, sem duplicar o lote. |
| `mesmo_conteudo` | Exige lote do mesmo hash/layout; retoma o lote ou mantém no-op. Com `--reprocessar`, cria o próximo elo da cadeia existente. |
| `revisao` | Sempre recusada nesta versão, mesmo com hash conhecido, `--reprocessar` ou `--dry-run`. |

Finalidade ausente, inválida, repetida ou incompatível com `--reprocessar` é
recusada antes de ler a fonte ou abrir a conexão. `mesmo_conteudo` sem lote
compatível faz somente consulta, sem criar lote, staging ou dados clínicos.
As recusas preservam também um relatório preexistente. `--reprocessar` exige
`--finalidade mesmo_conteudo`; nunca liga hashes ou layouts diferentes.

Declarar uma revisão como `carga_inicial` ainda pode duplicar ocorrências: esta
barreira reduz uso acidental e não detecta declarações incorretas. Revisão entre
hashes depende da futura linhagem, decisão e história por campo da ADR-022.

## Fluxo implementado

1. valida a finalidade, calcula SHA-256 e valida abas e cabeçalhos contra o manifesto;
2. cria ou retoma `importacao_lote` e preserva arrays ordenados em
   `importacao_linha.dados_brutos`;
3. processa portadores antes de não portadores;
4. concilia por nome NFKD sem acentos, caixa/espaços normalizados e nascimento
   exato, com ID de origem apenas auxiliar;
5. abre uma transação por linha, cria/reutiliza paciente e cria exatamente um
   atendimento;
6. grava os 126 destinos plenos: dados demográficos, endereço/contato, projetos,
   diagnóstico/sorologias/solicitação, condição e complicações de Chagas,
   comorbidades, medicamentos, exames, avaliação clínica, eventos, dispositivos,
   BZN, encaminhamento, notificação e óbito;
7. registra todo alvo criado ou associado em `importacao_registro`;
8. confirma a linha inteira ou executa rollback sem escrita clínica parcial.

Os nove rótulos `parcial` permanecem no manifesto e no bruto. Valores que não
passam por handler explícito deixam a linha `importada_com_pendencia`; retornos
BZN com data real e D8 com ano inequívoco podem ser mapeados seletivamente, sem
alterar a contagem declarada do manifesto. D11 agora é destino
pleno e cria uma pendência textual vinculada ao atendimento, sem inferir tipo,
status, responsável ou datas. `Localizado` permanece exclusivamente bruto e,
isoladamente, não cria pendência.

## Idempotência, reprocessamento e conflitos

O lote inicial é identificado por SHA-256 e versão do layout. Execução concluída
é um no-op. Em lote `falhou`, somente linhas não terminais são retomadas; linhas
já confirmadas ou rejeitadas não são repetidas. A posição da linha e os vínculos
únicos de proveniência são barreiras adicionais contra duplicação.

`--finalidade mesmo_conteudo --reprocessar` cria uma execução nova do mesmo hash/layout e liga
`lote_reprocessado_de_id` ao lote imediatamente anterior. Linhas anteriormente
importadas recebem novos vínculos `associado` para os mesmos alvos ainda válidos;
nenhum atendimento ou dependência clínica é recriado. Linhas rejeitadas são
avaliadas novamente. O E2E comprova dois elos consecutivos e preservação das
execuções anteriores.

O contrato da promoção controlada foi definido e implementado em 2026-09-21. O
fluxo trata `importada_com_pendencia` separadamente: reutiliza âncoras e alvos
anteriores, executa somente handlers registrados por chave, usa savepoint para as
novas escritas e recalcula as pendências. D11 é a primeira entrada do registro.
No destino repetível, uma pendência equivalente já vinculada por proveniência é
associada; ausência cria o registro; outra pendência preexistente sem proveniência
é tratada como edição manual ambígua e permanece intacta para revisão. O registro
também inclui data de descoberta, retornos BZN com data real e ano D8. As demais
chaves ainda dependem de contrato clínico, manifesto, handler e testes próprios.

Múltiplos candidatos, ID auxiliar divergente, duplicidade entre abas, contexto
ambulatorial contraditório e valor inválido rejeitam a linha. Catálogos ausentes
também são críticos, salvo a regra explícita de projeto descrita abaixo. Itens de
catálogo nunca são criados automaticamente; vínculos e ocorrências clínicas são
criados pelos handlers. O original e a mensagem do conflito permanecem auditáveis.

## Ano do último comparecimento — D8 na v1.6.0

`retorno_anual_realizado` continua classificado como `parcial` no manifesto v1.4.
O handler aceita somente um ano inequívoco e registra
`evento_clinico.ano_evento` do tipo `ultimo_comparecimento_ano_informado`, com
`valor_original_data`, vínculo ao paciente e proveniência. Não cria atendimento,
retorno realizado nem dia/mês. Texto como `sim`, data completa ou ano ambíguo
permanece apenas no bruto, com pendência. A associação de evento existente exige
proveniência da mesma fonte/hash e layout; igualdade de ano em outro arquivo ou
edição manual não autoriza associação silenciosa.

O E2E em banco descartável testou ano 2023 na carga inicial, no-op e
reprocessamento do mesmo hash sem duplicação. Depois, uma revisão sintética
privada corrigiu a mesma ocorrência para 2022; tentar reprocessar a origem
superada foi recusado e preservou o evento corrigido (F13). O teste também
comprovou bruto original, captura atribuível e ausência de visita inventada.
`make manifest-check importer-test COMPACT=1` passou com 32 testes unitários e
E2E usando manifesto v1.4 em `/tmp/ambulatorio-check-lvoqpa3u/output.log`.
A CLI ainda recusa revisão entre hashes; o E2E não a habilita operacionalmente.

## Negativa inequívoca de exame familiar — D3

O manifesto v1.4 aponta o rótulo legado para
`rastreio_familiar.familiares_examinados`, mantendo cobertura `parcial` e tipo
`texto`. O handler implementado aceita somente negativa inequívoca e registra
`familiares_examinados = false` com original e proveniência; afirmativa sem
identificação/resultado e texto ambíguo ficam brutos e pendentes. A regressão
integrada passou em banco descartável, cobrindo carga, proveniência, promoção de
lote anterior e reprocessamento sem duplicação.

## Criticidade de erros — v1.3.0

`NONCRITICAL_POLICY` é a allowlist executável das exceções à regra de rollback.
Fora dela, `RowConflict` continua rejeitando a linha inteira. A primeira entrada,
`catalogo_projeto_ausente`, pertence exclusivamente a `projects()`: confirma
paciente, atendimento e outros destinos, não cria catálogo e registra somente o
código técnico em `nao_criticas`.

Se o catálogo for corrigido, `--reprocessar` lê a pendência técnica da linha
anterior, reutiliza o paciente da proveniência e tenta somente o projeto afetado.
O vínculo é criado ou reconciliado sem novo atendimento; o elo seguinte apenas o
associa. `--dry-run` percorre o mesmo caminho e reverte vínculo e proveniência.
Catálogos de exames, medicamentos e comorbidades não foram flexibilizados por
analogia e continuam críticos até contrato individual.

## Reconciliação BZN — v1.1.1

`treatment()` consulta o tratamento pelo paciente e bloqueia a linha existente
com `FOR UPDATE` durante a transação. Quando não existe, cria o tratamento com
o atendimento da origem. Quando existe, utiliza `reconcile()`: igualdade associa,
campos nulos são preenchidos e valores clínicos divergentes geram `RowConflict`.
O tratamento mantém o vínculo de atendimento já registrado, inclusive `NULL`;
os atendimentos posteriores ficam rastreáveis pela proveniência de cada linha.

Textos originais não nulos são preservados, mesmo quando outra grafia representa
o mesmo valor, como `8 semanas` e `56 dias`. Os novos textos permanecem no bruto.
Uma linha sem informações de BZN não cria nem associa tratamento. A proveniência
registra `criado`, `atualizado` ou `associado` conforme a operação efetiva.

Conflito rejeita a linha inteira e reverte também atualizações feitas antes dele,
sem interromper o restante do lote. Não houve mudança de schema, unicidade ou
regras clínicas. Concorrência entre executores criando o primeiro BZN do mesmo
paciente não foi homologada; o bloqueio protege tratamentos já existentes.

Validação em 2026-09-15: dez testes unitários e E2E com 13 linhas, oito importáveis
(duas com pendência) e cinco rejeitadas esperadas. A regressão reproduziu a violação
de unicidade antes da correção. Após a correção, comprovou aliases equivalentes,
preenchimento de nulos, preservação do vínculo/originais, conflito tardio com
rollback de tratamento/endereço/atendimento/proveniência, continuidade do lote,
dry-run sem alterar BZN preexistente e dois elos de reprocessamento sem duplicação.

## Lacunas verificadas em 2026-09-14

As respostas da equipe estão consolidadas nas
[decisões humanas](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md). A reconciliação BZN
foi corrigida na v1.1.1; as demais lacunas abaixo permanecem abertas.

| Regra ou decisão | Implementação atual | Problema e alteração recomendada |
| --- | --- | --- |
| Um tratamento BZN consolidado por paciente | Corrigido na v1.1.1: consulta por paciente e reconcilia valores preservando o vínculo existente | Regressões unitárias e E2E cobrem associação, preenchimento de nulos e rejeição atômica de divergências; unicidade preservada |
| Reprocessar para resolver pendências | Corrigido na v1.2.0 para D11: registro explícito por chave, âncoras vindas da proveniência, handler seletivo, savepoint e reconciliação conservadora | E2E cobre promoção parcial, edição manual ambígua, rollback, dry-run e dois elos; expandir somente após aprovar cada contrato |
| Campo secundário inválido pode gerar pendência, conforme contrato | v1.3.0 mantém rollback como padrão e permite apenas `catalogo_projeto_ausente` na allowlist não crítica | Expandir somente por handler, com contrato de efeitos, nova tentativa e testes; demais `RowConflict` continuam críticos |
| D8: planilha atualizada guarda último ano visitado | v1.6.0 mapeia ano inequívoco com proveniência; v1.7.0 foi validada com manifesto v1.4 e captura SQL52 | Texto ambíguo permanece bruto; a CLI ainda bloqueia revisão operacional e o aceite global T01–T18 segue pendente |
| D4/D5: identificar o exame | Indicadores agregados permanecem brutos; categorias genéricas podem registrar `tipo_exame_original` como a chave, por exemplo `outros`, e o conteúdo como resultado | Validar identificação inequívoca sem exigir resultado da solicitação; não criar catálogo automaticamente |
| D1–D12: semântica revisada | D11 foi promovida; nove rótulos continuam parciais no manifesto v1.4, alguns com tratamento seletivo no código | Atualizar contrato executável e handlers em conjunto, incluindo tipos semânticos; não declarar cobertura plena por tratamento seletivo |

O [contrato de revisão entre hashes](arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md)
tem barreira da CLI, armazenamento e executor privados parciais. T01 e a parte
de T02 relativa à recusa de finalidade/revisão estão cobertos; D8/F13 tem prova
privada específica, sem aceite global de T01–T18. A cobertura declarada do
manifesto permanece 126 plenos, nove parciais e um excluído.

Validação da v1.4.0: 26 testes unitários e E2E sintético com recusas em execução
normal e dry-run, ausência de efeitos em todas as tabelas e sequências, relatório
preservado, regravação dos mesmos fatos com novo hash e layout divergente. As
regressões mantêm carga declarada, idempotência, retomada, BZN, promoção D11,
catálogo não crítico e dois elos de reprocessamento.

A fixture anterior não preenchia BZN na segunda linha do mesmo paciente. A
fixture atual cobre essa repetição e os casos da seção v1.1.1. Os cenários de
reprocessamento também comprovam a promoção de D11, a preservação de uma pendência
manual ambígua, a resolução seletiva de catálogo de projeto e o rollback em
dry-run. Os retornos
BZN com `sim` e retorno anual com `não` também não comprovam importação de datas
reais ou ano legado. Acrescentar casos sintéticos válidos e preservar casos
inválidos como regressão, conforme a
[matriz de impacto](dados/COBERTURA_COLUNAS_PLANILHA.md).

## Cobertura e limites deliberados

Os 126 rótulos declarados plenos são verificados contra o manifesto e a fixture
sintética. Isso não garante todos os caminhos de conflito nem atendimento das
novas respostas. Os nove rótulos `parcial` preservam o bruto; somente valores
aceitos pelos handlers explícitos também geram destino estruturado. Entre eles,
a coluna sobre exames de
familiares não autoriza criar `historico_familiar_chagas`, pois realização de
exame por parente não equivale a histórico familiar da doença. `Localizado`
continua excluído do estruturado, agora também com semântica e exclusão funcional
confirmadas pela equipe. O modelo existente suporta vários dos itens ainda
brutos; não é necessário criar uma migration para cada promoção.

Dados reais permanecem bloqueados pelas decisões institucionais de autoridade,
acesso, retenção e revisão registradas na especificação normativa.
