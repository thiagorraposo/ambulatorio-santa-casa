# Isolamento da simulação de importação — proposta técnica 8C2B.1

2026-11-02, Janela 1 retomada. **Investigação e proposta, sem ativação de runtime.**
Fonte de escopo: [catálogo C2B.1](../frontend/ENTREGAS_DO_PRODUTO.md#8c2b).
Preserva [relatório HTTP já validado](CONTRATO_RELATORIO_IMPORTACAO_8C2B_1.md) e
[a correção da rejeição precoce](../validacoes/VALIDACAO_DRY_RUN_REJEICAO_PRECOCE.md).
Não altera clínica, concorrência, permissões, migrations ou decisão humana.

## Conclusão de viabilidade

Tabelas/sequências temporárias de sessão **não isolam o pipeline atual mantendo
suas garantias**. Trocar somente o adaptador `psql.py` não basta. O caminho
compatível com os nomes qualificados e as funções restritas é um banco/servidor
descartável separado, com o mesmo schema, funções, propriedade e ACLs. O
repositório já executa o importador contra endpoints sintéticos separados nos
runners de testes, mas **não possui serviço de isolamento de simulações H14**
nem preparação de estado de origem apropriada a esse uso.

Não foi instalado serviço privilegiado nem desviado o dry-run de H14. A folha
C2B.1 permanece sem validação completa enquanto o worker atuar em
`rollback_only` sobre as sequências do banco de origem.

## Prova sintética das tabelas temporárias

PoC em PostgreSQL 16.15, tmpfs confirmado, servidor exclusivamente sintético
`ambulatorio-avc-interacoes-20261101`, `127.0.0.1:55457`. Banco novo com migrations
02–73, removido ao terminar. Dados literais artificiais; nenhuma cópia de dados
persistentes ou reais. Log final `/tmp/m3-dryrun-temp-probe.log`; roteiro
volátil `/tmp/m3-dryrun-temp-probe.sql` e runner de mesmo prefixo `.py`.

A sessão executou os três casos abaixo sob `SET LOCAL ROLE
ambulatorio_importador`, dentro de `BEGIN`/`ROLLBACK`:

1. `CREATE TEMP TABLE atendimento (LIKE ambulatorio.atendimento INCLUDING ALL)`:
   dependência do default da PK continua apontando ao OID da sequência original.
   Inserção temporária avança essa sequência, inclusive após `ROLLBACK`.
   `LIKE` não copiou FKs nem triggers: a tabela temporária aceitou atendimento
   para paciente inexistente, sem a captura exigida no destino real.
2. Sequência temporária própria e default **apenas da tabela temporária**:
   inserção deixa de avançar a sequência original, mas não recompõe as FKs ou
   captura. A role não possui `EXECUTE` em `auditoria_capturar()`; a tentativa
   de recriar o trigger protegido na tabela temporária foi recusada (42501).
   Não foram concedidos privilégios para contornar essa recusa.
3. `importacao_linha` temporária com uma linha `processando`, PK explícita:
   `auditoria_iniciar_importacao(id)` recusa com
   `auditoria_contexto_importacao_invalido`. A função consulta explicitamente
   `ambulatorio.importacao_linha`; não resolve a tabela de `pg_temp`.

Asserções finais comprovaram tabela principal vazia e sequência principal
alterada após rollback do primeiro caso. O objetivo da PoC é provar a lacuna,
sem apresentar esse experimento como solução. Primeiro setup foi corrigido
para configurar o `search_path` do banco, como os runners oficiais; a asserção
de default foi ajustada para verificar dependência por OID (a representação
textual pode omitir o schema). A execução final passou os três casos.

## Por que um overlay simples perde garantias

| Alternativa | Limite concreto |
| --- | --- |
| Copiar só tabelas temporárias | Defaults mantêm sequências reais; faltam FKs e triggers |
| Dar IDs explícitos em todos os INSERTs do Python | Captura e funções restritas ainda escrevem eventos/contexto nos destinos reais |
| Trocar `search_path` da conexão | Funções têm `SECURITY DEFINER`, caminho fixo e referências explícitas ao schema `ambulatorio` |
| Recriar tudo em `pg_temp` | Exige reescrever/clonar FKs e funções confiáveis, propriedade/ACLs e resolução dinâmica; produz outro pipeline sem prova de equivalência |
| Restaurar sequências com `setval` | Inseguro diante de escritores concorrentes; proibido nesta entrega |
| Só validar planilha em memória | Pode ser uma pré-validação, mas não reproduz identidade, proveniência, precedência, constraints/captura e resultados reais do pipeline |
| Reutilizar SQL50 de revisão | É simulação específica de proposta temporal, com autorização/estado próprios; não substitui carga inicial/reprocessamento do importador |

As referências executáveis são
[adaptador](../../scripts/importador/psql.py),
[pipeline](../../scripts/importar_planilha.py),
[captura SQL23](../../sql/23_captura_historico_clinico.sql),
[contexto SQL24](../../sql/24_contexto_auditoria_proveniencia.sql),
[proteção SQL39](../../sql/39_vinculo_cobertura_e_contexto_importador.sql) e
[simulação específica SQL50](../../sql/50_simulacao_proposta_sem_staging.sql).

## Incremento proposto e requisitos antes da implementação

Separar o provisionamento do processo do importador: um supervisor cria e
encerra o ambiente isolado; o worker recebe somente credencial de importador
desse ambiente e executa o mesmo código. Não conceder `CREATEDB`, superusuário,
propriedade de tabelas ou acesso ao socket Docker à aplicação/worker.

O candidato mais forte é **instância descartável separada**, pois impede que
uma credencial de teste com os mesmos nomes de roles alcance o banco de origem.
Apenas outro banco no mesmo servidor exige demonstrar isolamento de conexão e
credenciais; não deve ser tratado como equivalente sem essa prova.

Antes de integrar H14, faltam componentes e contratos técnicos verificáveis:

- preparação de estado consistente que preserve catálogos, identidades,
  proveniência, fontes correntes e histórico necessário às regras existentes;
  uma base vazia não reproduz conflitos contra registros existentes;
- definição da origem/autorização desse estado, minimização de conteúdo,
  retenção e limpeza; esta proposta **não autoriza copiar dados clínicos reais**;
- preservar schema/funções/propriedade/ACLs e os contextos restritos, sem remover
  triggers ou guards para que a simulação passe;
- supervisor com TTL, limites de recurso, cancelamento/timeout, limpeza em
  falha e credencial restrita ao ambiente descartável; indisponibilidade deve
  recusar a simulação, sem fallback para escrita no banco de origem;
- semântica do estado observado e da confirmação posterior, sem inventar um
  recibo de confirmação, autorização, versão ou contrato de concorrência;
- decidir como executar os limites transacionais por linha no isolamento: o
  modo normal do pipeline avalia constraints diferidas no COMMIT, enquanto
  `rollback_only` usa savepoints e descarta o contexto externo ao terminar.
  Equivalência desses caminhos precisa de prova, não só igualdade de contadores.

## Critérios de saída do próximo incremento

Começar por uma PoC com origem **inteiramente sintética** e estado discriminante:
identidade existente, catálogo ausente, proveniência/correção e lote interrompido.
Comparar relatório da simulação isolada com aplicação no mesmo estado inicial,
usando o mesmo worker. Confirmar durante sucesso, erro de linha, erro operacional,
cancelamento e concorrência pertinente que **todas as tabelas e sequências da
origem** permanecem idênticas. Incluir sequência da captura prospectiva, no-op,
reprocessamento, rejeição precoce e constraints diferidas.

Só então integrar o supervisor autorizado ao H14, preservando o contrato de
relatório sanitizado e o limite de capacidades. Não concluir C2B.1 com uma
simulação sobre base vazia, um overlay sem triggers ou apenas restauração de
contadores. Aceite humano e liberação de dados reais permanecem separados.
