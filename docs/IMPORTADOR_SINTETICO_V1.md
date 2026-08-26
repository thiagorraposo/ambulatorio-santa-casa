# Importador Sintético v1

Atualizado em: 2026-08-26

O importador v1.1.0 acrescenta `--dry-run`, `--quality-report` e `--db-role`.
Na fixture homologada, o preflight classificou 10 linhas: 6 válidas/importáveis,
2 com pendência, 4 rejeitadas, 1 conflito de identidade, 1 entre abas, 1 valor
inválido, 0 catálogos desconhecidos e 1 outra causa. Dois reports foram idênticos
e as contagens clínicas e de importação antes/depois permaneceram iguais.

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
Projetos e exames nunca são criados automaticamente. O original e a mensagem do
conflito permanecem auditáveis.

## Cobertura e limites deliberados

Os 124 rótulos com cobertura plena estão homologados por checagem executável
contra o manifesto e por fixture sintética ampla. As onze chaves `parcial`
continuam exclusivamente em `dados_brutos`; entre elas, a coluna sobre exames de
familiares não autoriza criar `historico_familiar_chagas`, pois realização de
exame por parente não equivale a histórico familiar da doença. `Localizado`
continua excluído do estruturado.

Dados reais permanecem bloqueados pelas decisões institucionais de autoridade,
acesso, retenção e revisão registradas na especificação normativa.
