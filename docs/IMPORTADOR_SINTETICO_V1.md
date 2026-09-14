# Importador Sintético v1

Atualizado em: 2026-09-14

O importador v1.1.0 acrescenta `--dry-run`, `--quality-report` e `--db-role`.
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
make importer-run IMPORT_FILE=tests/fixtures/planilha_importacao_v1_sintetica.xlsx
```

O importador usa Python 3 apenas com biblioteca padrão e uma sessão persistente
do `psql`. O teste E2E cria um banco Docker isolado com sufixo
`_importador_test`, aplica as migrations e remove esse banco ao terminar.

## Fluxo implementado

1. calcula SHA-256 e valida abas e cabeçalhos contra o manifesto;
2. cria ou retoma `importacao_lote` e preserva arrays ordenados em
   `importacao_linha.dados_brutos`;
3. processa portadores antes de não portadores;
4. concilia por nome NFKD sem acentos, caixa/espaços normalizados e nascimento
   exato, com ID de origem apenas auxiliar;
5. abre uma transação por linha, cria/reutiliza paciente e cria exatamente um
   atendimento;
6. grava os 124 destinos plenos: dados demográficos, endereço/contato, projetos,
   diagnóstico/sorologias/solicitação, condição e complicações de Chagas,
   comorbidades, medicamentos, exames, avaliação clínica, eventos, dispositivos,
   BZN, encaminhamento, notificação e óbito;
7. registra todo alvo criado ou associado em `importacao_registro`;
8. confirma a linha inteira ou executa rollback sem escrita clínica parcial.

Campos `parcial` nunca são promovidos. Quando preenchidos, deixam a linha
`importada_com_pendencia` e permanecem em `dados_brutos`. `Localizado` permanece
exclusivamente bruto e, isoladamente, não cria pendência.

## Idempotência, reprocessamento e conflitos

O lote inicial é identificado por SHA-256 e versão do layout. Execução concluída
é um no-op. Em lote `falhou`, somente linhas não terminais são retomadas; linhas
já confirmadas ou rejeitadas não são repetidas. A posição da linha e os vínculos
únicos de proveniência são barreiras adicionais contra duplicação.

`--reprocessar` cria uma execução nova do mesmo hash/layout e liga
`lote_reprocessado_de_id` ao lote imediatamente anterior. Linhas anteriormente
importadas recebem novos vínculos `associado` para os mesmos alvos ainda válidos;
nenhum atendimento ou dependência clínica é recriado. Linhas rejeitadas são
avaliadas novamente. O E2E comprova dois elos consecutivos e preservação das
execuções anteriores.

Múltiplos candidatos, ID auxiliar divergente, duplicidade entre abas, contexto
ambulatorial contraditório, valor inválido ou catálogo ausente rejeitam a linha.
Itens de catálogo de projetos/exames nunca são criados automaticamente; vínculos
e ocorrências clínicas são criados pelos handlers. O original e a mensagem do
conflito permanecem auditáveis.

## Lacunas verificadas em 2026-09-14

As respostas da equipe estão consolidadas nas
[decisões humanas](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md). O código permanece
v1.1.0; os ajustes abaixo são necessários ou dependem do contrato indicado, mas
não foram implementados nesta revisão documental.

| Regra ou decisão | Implementação atual | Problema e alteração recomendada |
| --- | --- | --- |
| Um tratamento BZN consolidado por paciente | `treatment()` insere sem consultar/reconciliar tratamento existente | Duas linhas preenchidas do mesmo paciente podem violar a unicidade e interromper o lote; reconciliar valores compatíveis, preservar proveniência e rejeitar conflito sem sobrescrita. Não relaxar a constraint nem criar migration |
| Reprocessar para resolver pendências | `reuse_predecessor()` aceita `importada_com_pendencia` e retorna antes dos handlers | A simples promoção de um campo no manifesto não atualiza essa linha; permitir promoção controlada sem recriar alvos anteriores |
| Campo secundário inválido pode gerar pendência, conforme contrato | `RowConflict` provoca rollback e rejeição da linha inteira | Delimitar erros críticos/não críticos e alinhar implementação, mensagens e testes ao contrato |
| D8: planilha atualizada guarda último ano visitado | Novo hash/layout inicia outra identidade de lote; linha gera atendimento | Idempotência de arquivo não evita duplicar uma consulta em versões revisadas; definir e implementar política temporal antes de usar esse fluxo |
| D4/D5: identificar o exame | Indicadores agregados permanecem brutos; categorias genéricas podem registrar `tipo_exame_original` como a chave, por exemplo `outros`, e o conteúdo como resultado | Validar identificação inequívoca sem exigir resultado da solicitação; não criar catálogo automaticamente |
| D1–D12: semântica revisada | Onze campos continuam parciais; contagens/allowlists e razões de exclusão são fixadas por gerador, validador e testes | Atualizar contrato executável e handlers em conjunto, incluindo tipos semânticos; não declarar cobertura nova por mera mudança documental |

A fixture E2E atual inclui uma segunda linha de paciente sem BZN preenchido e
não cobre a inserção repetida de tratamento. Os cenários de reprocessamento
comprovam reutilização de alvos, não a resolução de uma pendência. Os retornos
BZN com `sim` e retorno anual com `não` também não comprovam importação de datas
reais ou ano legado. Acrescentar casos sintéticos válidos e preservar casos
inválidos como regressão, conforme a
[matriz de impacto](dados/COBERTURA_COLUNAS_PLANILHA.md).

## Cobertura e limites deliberados

Os 124 rótulos declarados plenos foram verificados no contrato anterior por
checagem contra o manifesto e fixture sintética. Isso não garante todos os
caminhos de conflito nem atendimento das novas respostas. As onze chaves `parcial`
continuam exclusivamente em `dados_brutos`; entre elas, a coluna sobre exames de
familiares não autoriza criar `historico_familiar_chagas`, pois realização de
exame por parente não equivale a histórico familiar da doença. `Localizado`
continua excluído do estruturado, agora também com semântica e exclusão funcional
confirmadas pela equipe. O modelo existente suporta vários dos itens ainda
brutos; não é necessário criar uma migration para cada promoção.

Dados reais permanecem bloqueados pelas decisões institucionais de autoridade,
acesso, retenção e revisão registradas na especificação normativa.
