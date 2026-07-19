# Especificação do Módulo de Importação e Proveniência

Atualizado em: 2026-07-19

Status: implementada por migration incremental e validada; importador e importação de dados reais permanecem bloqueados.

## Objetivo e fronteiras

O módulo deve identificar cada execução de importação, preservar cada linha de origem sem perda, registrar o valor legado de `Responsavel pela digitacao` e relacionar uma linha aos registros estruturados gerados.

Esta especificação não autoriza:

- implementar ou executar o importador;
- acessar, copiar ou versionar planilhas ou dados clínicos reais;
- tratar o responsável legado como usuário autenticado;
- definir normalizações clínicas ainda pendentes;
- armazenar credenciais, caminhos locais sensíveis ou arquivos clínicos no repositório.

## Metadados canônicos seguros

A fonte canônica disponível para os nomes semânticos é `planejamento/tabelas dicionário de dados/03_coluna_planilha_destino.csv`. Ela contém 140 nomes únicos usados pela cobertura, mas deriva de um fallback e não comprova nomes de abas, ordem física nem ocorrências repetidas. Portanto:

- o inventário semântico v1 é canônico para nomes conhecidos e mapeamentos planejados;
- não é um manifesto físico apto a dirigir importação;
- os termos `portador de DC` e `não portador de DC` são grupos lógicos conhecidos, não nomes físicos de abas comprovados;
- cabeçalhos repetidos como `ECO`, `Laboratoriais` e `Outros` não podem ser identificados apenas pelo nome.

O manifesto físico seguro futuro deverá conter exclusivamente metadados, sem valores de células:

| Campo | Regra |
| --- | --- |
| `layout_versao` | identificador versionado e imutável, por exemplo `planilha_ambulatorio_v1` |
| `aba_chave` | chave técnica estável definida pelo projeto |
| `aba_nome_original` | nome exato da aba, sem conteúdo clínico |
| `aba_ordem` | posição da aba no arquivo |
| `coluna_chave` | chave estável, distinta mesmo para cabeçalhos iguais |
| `cabecalho_original` | texto exato do cabeçalho |
| `coluna_ordem` | posição física da coluna na aba |
| `ocorrencia_cabecalho` | ordinal entre cabeçalhos iguais na mesma aba |

A combinação `(layout_versao, aba_ordem, coluna_ordem)` e a `coluna_chave` dentro da versão deverão ser únicas. A criação desse manifesto é pré-requisito do importador, mas não da migration genérica deste módulo.

## Identificação e reprocessamento de lotes

Cada `importacao_lote` representa uma execução, não apenas um arquivo. A identidade funcional é:

- `codigo_lote`, valor opaco fornecido pelo processo, globalmente único;
- `hash_arquivo_sha256`, hash hexadecimal do conteúdo, sem guardar caminho local;
- `layout_versao`, versão do manifesto físico usado;
- `lote_reprocessado_de_id`, referência opcional à execução anterior do mesmo conteúdo e layout.

O primeiro processamento de cada par `(hash_arquivo_sha256, layout_versao)` não possui predecessor e é protegido por índice único parcial. Reprocessamentos criam novo lote e devem referenciar um lote anterior com o mesmo hash e layout por FK composta. Assim, tentativas permanecem auditáveis e o mesmo conteúdo não entra novamente como lote inicial por engano.

Reprocessamento não altera nem reutiliza linhas de uma execução anterior. Ele cria novas `importacao_linha`. Idempotência clínica, comparação de resultados e retomada parcial pertencem ao futuro importador.

## Estrutura proposta

### `importacao_lote`

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `importacao_lote_id` | `BIGSERIAL` | sim | PK |
| `codigo_lote` | `VARCHAR(100)` | sim | identificador opaco e `UNIQUE` |
| `hash_arquivo_sha256` | `VARCHAR(64)` | sim | hexadecimal minúsculo, `CHECK` de formato e comprimento |
| `layout_versao` | `VARCHAR(80)` | sim | versão do manifesto seguro |
| `lote_reprocessado_de_id` | `BIGINT` | não | predecessor do mesmo hash e layout |
| `status_lote` | `VARCHAR(40)` | sim | default `recebido`, domínio fechado |
| `iniciado_em` | `TIMESTAMP` | não | preenchido pelo processo |
| `finalizado_em` | `TIMESTAMP` | não | preenchido pelo processo |
| `mensagem_erro` | `TEXT` | não | resumo técnico sem despejar conteúdo clínico |
| `observacoes` | `TEXT` | não | complemento operacional sem dados clínicos desnecessários |
| `criado_em` | `TIMESTAMP` | sim | default `CURRENT_TIMESTAMP` |
| `atualizado_em` | `TIMESTAMP` | sim | default `CURRENT_TIMESTAMP` |

Constraints e índices:

- PK em `importacao_lote_id`;
- `uq_importacao_lote_codigo UNIQUE(codigo_lote)`;
- `uq_importacao_lote_identidade UNIQUE(importacao_lote_id, hash_arquivo_sha256, layout_versao)`, chave candidata para a FK composta;
- FK `(lote_reprocessado_de_id, hash_arquivo_sha256, layout_versao)` para `(importacao_lote_id, hash_arquivo_sha256, layout_versao)` com `ON DELETE RESTRICT`;
- `CHECK (lote_reprocessado_de_id IS NULL OR lote_reprocessado_de_id <> importacao_lote_id)`; ciclos indiretos permanecem responsabilidade do processo, que só pode apontar para execução anterior;
- índice único parcial em `(hash_arquivo_sha256, layout_versao)` quando `lote_reprocessado_de_id IS NULL`;
- índice em `(hash_arquivo_sha256, layout_versao)` para localizar a cadeia de execuções;
- `CHECK` de SHA-256 com expressão regular `^[0-9a-f]{64}$`;
- `CHECK (finalizado_em IS NULL OR iniciado_em IS NULL OR finalizado_em >= iniciado_em)`;
- não criar contadores persistidos: totais serão derivados das linhas para evitar divergência.

### `importacao_linha`

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `importacao_linha_id` | `BIGSERIAL` | sim | PK |
| `importacao_lote_id` | `BIGINT` | sim | FK para lote |
| `aba_nome_original` | `TEXT` | sim | texto exato do metadado de origem |
| `aba_ordem` | `INTEGER` | sim | maior que zero |
| `numero_linha` | `INTEGER` | sim | posição física maior que zero |
| `dados_brutos` | `JSONB` | sim | array ordenado de células |
| `responsavel_digitacao_original` | `TEXT` | não | valor legado sem normalização |
| `status_linha` | `VARCHAR(40)` | sim | default `pendente`, domínio fechado |
| `mensagem_processamento` | `TEXT` | não | resumo técnico/revisão |
| `criado_em` | `TIMESTAMP` | sim | default `CURRENT_TIMESTAMP` |
| `atualizado_em` | `TIMESTAMP` | sim | default `CURRENT_TIMESTAMP` |

`dados_brutos` deve ser um array JSONB na ordem física. Cada item deve preservar `coluna_ordem`, `cabecalho_original`, `ocorrencia_cabecalho`, `coluna_chave` quando conhecida e `valor_original`. Um objeto JSON simples é proibido porque descartaria cabeçalhos duplicados.

Constraints e índices:

- FK `importacao_lote_id` com `ON DELETE RESTRICT`;
- `UNIQUE(importacao_lote_id, aba_ordem, numero_linha)`;
- `CHECK (aba_ordem > 0)` e `CHECK (numero_linha > 0)`;
- `CHECK (btrim(aba_nome_original) <> '')`;
- `CHECK (jsonb_typeof(dados_brutos) = 'array')`;
- índice em `(importacao_lote_id, status_linha)`;
- nenhum índice GIN ou índice sobre valores clínicos do JSONB nesta fase.

### `importacao_registro`

Associação genérica N:N entre linhas e registros estruturados.

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `importacao_registro_id` | `BIGSERIAL` | sim | PK |
| `importacao_linha_id` | `BIGINT` | sim | FK para linha |
| `schema_destino` | `VARCHAR(63)` | sim | default `ambulatorio` e `CHECK` igual a `ambulatorio` |
| `tabela_destino` | `VARCHAR(63)` | sim | nome exato da tabela permitida pelo importador |
| `registro_id` | `BIGINT` | sim | ID positivo do registro gerado ou associado |
| `acao` | `VARCHAR(20)` | sim | `criado`, `atualizado` ou `associado` |
| `criado_em` | `TIMESTAMP` | sim | default `CURRENT_TIMESTAMP` |

Cardinalidade: uma linha pode gerar vários registros e um registro pode consolidar várias linhas; a associação é N:N. A constraint `UNIQUE(importacao_linha_id, schema_destino, tabela_destino, registro_id)` evita repetição do mesmo vínculo, e um índice em `(schema_destino, tabela_destino, registro_id)` permite rastreio inverso. `CHECK (registro_id > 0)`, `CHECK (btrim(tabela_destino) <> '')` e o domínio fechado de `acao` completam as validações locais.

A FK para `importacao_linha` usa `ON DELETE RESTRICT`. Não existe FK relacional genérica para `registro_id` apontar a tabelas heterogêneas. O importador deverá validar o alvo na mesma transação em que criar a associação. Essa limitação é aceita e documentada; triggers dinâmicas e uma FK opcional em todas as tabelas foram rejeitadas por complexidade e acoplamento.

## Status

### Lote

- `recebido`: identificado, ainda não validado;
- `validando`: metadados e estrutura em validação;
- `pronto`: apto a processar;
- `processando`: transformação em andamento;
- `concluido`: todas as linhas chegaram a estado terminal sem pendências;
- `concluido_com_pendencias`: processamento terminou com revisão necessária;
- `falhou`: execução interrompida por erro;
- `cancelado`: encerrado intencionalmente sem conclusão.

### Linha

- `pendente`: ainda não processada;
- `processando`: transformação em andamento;
- `importada`: processada sem pendência conhecida;
- `importada_com_pendencia`: registros gerados, mas exige revisão;
- `rejeitada`: não gerou importação válida;
- `ignorada`: vazia ou excluída por regra documentada.

As migrations devem limitar os valores com `CHECK`, mas não impor transições por trigger. Regras de transição e consistência agregada entre lote e linhas pertencem ao importador. Estados terminais de linha são `importada`, `importada_com_pendencia`, `rejeitada` e `ignorada`.

## Responsável pela digitação

`responsavel_digitacao_original` preserva exatamente o texto legado, inclusive vazio significativo, grafia variante ou conteúdo ambíguo. Não haverá FK para `usuario`, catálogo, unicidade, normalização automática ou índice isolado nesta versão.

Uma futura normalização deverá manter o valor original e depender de inventário autorizado. Autenticação, autorização e autoria das ações do sistema são conceitos distintos e ficam fora deste módulo.

## Retenção, proteção e deleção

- `dados_brutos` contém dados clínicos sensíveis e deve permanecer somente no PostgreSQL controlado; não pode aparecer em repositório, logs, mensagens de erro ou dumps compartilhados.
- A migration cria estrutura, não permissões operacionais nem roles ainda inexistentes. A implantação futura deverá aplicar menor privilégio: leitura do JSONB apenas ao processo de importação e perfis explicitamente autorizados.
- Não haverá GIN no JSONB, busca textual ampla ou exposição direta por API nesta fase.
- Não haverá expiração ou purga automática até existir política aprovada de retenção. A ausência de política fica delimitada como risco operacional, não bloqueio estrutural.
- Deleções de lote e linha usam `RESTRICT`; proveniência não desaparece em cascata.
- `importacao_registro` só pode ser removida por ação explícita e auditada. A remoção de um registro clínico não é propagada por falta de FK genérica e pode deixar associação órfã; uma rotina futura de integridade deverá detectar isso.
- Reversão estrutural futura será destrutiva e deverá exigir autorização explícita, começando por `importacao_registro`, depois `importacao_linha` e por último `importacao_lote`.

## Validação da migration

O teste SQL sintético e transacional cobre:

- lote inicial e reprocessamento com mesmo hash/layout;
- bloqueio de segundo lote inicial duplicado;
- bloqueio de predecessor com hash ou layout diferente;
- domínios de status, SHA-256, timestamps e posições;
- preservação de array JSONB com cabeçalhos duplicados;
- `UNIQUE` de linha por lote/aba/posição;
- vínculo N:N e ações permitidas;
- FKs e regras `ON DELETE RESTRICT`;
- `ROLLBACK` e ausência de dados sintéticos persistidos.

## Pendências delimitadas que não bloqueiam a migration

1. O manifesto físico seguro de abas e colunas ainda não existe; bloqueia o importador, não as tabelas genéricas.
2. Os valores reais de responsável não foram inventariados; serão preservados sem normalização.
3. A política institucional de prazo de retenção ainda precisa ser aprovada; até lá não haverá purga automática.
4. A associação genérica não possui FK ao registro heterogêneo; validação transacional e auditoria de órfãos pertencem ao importador/operação futura.
5. Transições de status, retomada, idempotência clínica e tratamento de erro ainda serão implementados no importador.
6. Permissões específicas dependem da definição futura de roles operacionais.

## Prontidão

As decisões necessárias para identidade, reprocessamento, formato bruto, status, responsável legado, vínculo genérico, cardinalidades, constraints, índices e deleção estão implementadas por `sql/12_modulo_importacao_proveniencia.sql`. `tests/sql/04_validar_modulo_importacao_proveniencia.sql` aprovou os cenários previstos e confirmou o `ROLLBACK`. O módulo físico está **implementado e validado**, mas não está pronto para importar dados reais nem autoriza implementar o importador.
