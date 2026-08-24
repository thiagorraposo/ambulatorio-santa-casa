# Importador Sintético v1

Atualizado em: 2026-08-24

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
6. grava paciente, atendimento, projetos, exames trazidos/solicitados, ECG,
   resultados laboratoriais, BZN e encaminhamento;
7. registra todo alvo criado ou associado em `importacao_registro`;
8. confirma a linha inteira ou executa rollback sem escrita clínica parcial.

Campos `parcial` nunca são promovidos. Quando preenchidos, deixam a linha
`importada_com_pendencia` e permanecem em `dados_brutos`. `Localizado` permanece
exclusivamente bruto e, isoladamente, não cria pendência.

## Idempotência, retomada e conflitos

O lote inicial é identificado por SHA-256 e versão do layout. Execução concluída
é um no-op. Em lote `falhou`, somente linhas não terminais são retomadas; linhas
já confirmadas ou rejeitadas não são repetidas. A posição da linha e os vínculos
únicos de proveniência são barreiras adicionais contra duplicação.

Múltiplos candidatos, ID auxiliar divergente, duplicidade entre abas, contexto
ambulatorial contraditório, valor inválido ou catálogo ausente rejeitam a linha.
Projetos e exames nunca são criados automaticamente. O original e a mensagem do
conflito permanecem auditáveis.

## Limitações desta primeira versão

Os demais destinos estruturados do manifesto — endereço/contato, diagnóstico e
sorologia, condição/complicações, comorbidades, medicamentos, avaliação clínica,
evento/dispositivo, notificação e óbito — permanecem como incrementos da Semana
2. A fixture não preenche esses campos. Antes de dados reais, cada handler deve
ser implementado e homologado, além dos bloqueios institucionais já registrados.

Reprocessamento intencional em novo lote encadeado também permanece pendente;
esta versão cobre reexecução e retomada segura do lote inicial.
