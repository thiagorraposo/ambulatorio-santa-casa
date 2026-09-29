# Importador Sintético v1

Atualizado em: 2026-09-28

O importador v1.5.0 incorpora a data de descoberta do paciente pela migration 28,
com manifesto semântico v1.2. Mantém a barreira da v1.4.0: exige finalidade explícita e recusa revisões de conteúdo antes
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

Os nove campos `parcial`, quando preenchidos, deixam a linha
`importada_com_pendencia` e permanecem em `dados_brutos`. D11 agora é destino
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
é tratada como edição manual ambígua e permanece intacta para revisão. As outras
dez chaves dependem do respectivo contrato clínico, manifesto, handler e testes.

Múltiplos candidatos, ID auxiliar divergente, duplicidade entre abas, contexto
ambulatorial contraditório e valor inválido rejeitam a linha. Catálogos ausentes
também são críticos, salvo a regra explícita de projeto descrita abaixo. Itens de
catálogo nunca são criados automaticamente; vínculos e ocorrências clínicas são
criados pelos handlers. O original e a mensagem do conflito permanecem auditáveis.

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
| D8: planilha atualizada guarda último ano visitado | v1.4.0 exige finalidade e bloqueia revisão; novo hash somente inicia lote com carga inicial declarada | Declaração não comprova nova ocorrência; mapeamento, linhagem e auditoria da ADR-022 ainda não implementados |
| D4/D5: identificar o exame | Indicadores agregados permanecem brutos; categorias genéricas podem registrar `tipo_exame_original` como a chave, por exemplo `outros`, e o conteúdo como resultado | Validar identificação inequívoca sem exigir resultado da solicitação; não criar catálogo automaticamente |
| D1–D12: semântica revisada | D11 foi promovida; dez campos continuam parciais e suas contagens/allowlists são fixadas por gerador, validador e testes | Atualizar contrato executável e handlers em conjunto, incluindo tipos semânticos; não declarar cobertura nova por mera mudança documental |

O [contrato de revisão entre hashes](arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md)
tem somente a barreira inicial implementada. T01 e a parte de T02 relativa à
recusa de finalidade/revisão estão cobertos; os demais fluxos de revisão ainda
dependem de implementação. A cobertura do manifesto permanece igual.

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
novas respostas. As dez chaves `parcial` continuam exclusivamente em
`dados_brutos`; entre elas, a coluna sobre exames de
familiares não autoriza criar `historico_familiar_chagas`, pois realização de
exame por parente não equivale a histórico familiar da doença. `Localizado`
continua excluído do estruturado, agora também com semântica e exclusão funcional
confirmadas pela equipe. O modelo existente suporta vários dos itens ainda
brutos; não é necessário criar uma migration para cada promoção.

Dados reais permanecem bloqueados pelas decisões institucionais de autoridade,
acesso, retenção e revisão registradas na especificação normativa.
