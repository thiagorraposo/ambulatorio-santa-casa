# Especificação Inicial do Módulo de Importação e Proveniência

Atualizado em: 2026-07-19

Status: direção arquitetural definida; ainda não pronta para migration.

## Objetivo

Preservar a origem de cada linha importada, seu conteúdo bruto e o valor legado de `Responsavel pela digitacao`, permitindo relacionar futuramente a origem aos registros estruturados sem confundir proveniência com vínculo clínico ou autenticação.

## Justificativa de prioridade

O módulo possui ganho direto modesto na contagem de colunas, mas é dependência transversal para a importação segura das 30 tabelas atuais e das próximas extensões. Implementá-lo antes de importar reduz o risco de:

- perder aba, posição e cabeçalho necessários para distinguir exames repetidos;
- atribuir ao atendimento a origem de fatos consolidados do paciente;
- confundir o nome legado do digitador com usuário autenticado;
- retroajustar rastreabilidade em muitas tabelas já preenchidas;
- descartar valores que ainda não possuem normalização segura.

## Escopo inicial proposto

### `importacao_lote`

Representa uma execução ou unidade controlada de importação.

Campos candidatos:

- `importacao_lote_id BIGSERIAL`, PK;
- `identificador_origem VARCHAR`, obrigatório e único no contexto a definir;
- `nome_arquivo_original TEXT`, opcional e sujeito a regra de segurança;
- `hash_arquivo VARCHAR`, opcional;
- `status_importacao VARCHAR`, com domínio ainda a definir;
- contadores de linhas lidas, processadas, rejeitadas e pendentes, preferencialmente derivados enquanto não houver requisito de snapshot;
- `iniciado_em`, `finalizado_em`, `criado_em` e `atualizado_em`;
- `observacoes TEXT`.

### `importacao_linha`

Preserva a unidade de origem antes de qualquer normalização clínica.

Campos candidatos:

- `importacao_linha_id BIGSERIAL`, PK;
- `importacao_lote_id BIGINT NOT NULL`, FK;
- `aba_origem TEXT`;
- `numero_linha INTEGER` ou outra posição original não negativa;
- `dados_brutos JSONB NOT NULL`;
- `responsavel_digitacao_original TEXT`;
- `status_processamento VARCHAR`, com domínio ainda a definir;
- `mensagem_processamento TEXT` e `observacoes TEXT`;
- `criado_em` e `atualizado_em`.

Uma constraint de unicidade por lote, aba e posição é candidata, mas depende de confirmar como planilhas, arquivos e reprocessamentos serão identificados.

### Vínculo com registros gerados

É necessário rastrear quais registros estruturados foram produzidos por cada linha. A forma física ainda não está decidida:

1. associação explícita com tipo de entidade e identificador, mais flexível, porém sem FK relacional completa; ou
2. `importacao_linha_id` opcional nas tabelas de destino, com integridade forte, porém muitas alterações e limitação para múltiplas origens; ou
3. associações específicas por agregado clínico, com mais tabelas e maior custo de manutenção.

Essa escolha bloqueia a migration porque determina cardinalidade, integridade e estratégia de deleção. Não será adotada associação polimórfica apenas por conveniência sem documentar suas limitações.

## Responsável pela digitação

`Responsavel pela digitacao` deve inicialmente ser preservado como texto original na linha importada. Não há evidência de identificador estável, cadastro único ou equivalência com usuário do sistema.

Uma futura entidade de identidade poderá normalizar responsáveis depois de inventariar os valores e definir regras de correspondência. Autenticação e autorização permanecem fora deste módulo inicial.

## Fronteiras

- Não importar dados reais nesta fase.
- Não definir regras clínicas de normalização.
- Não mover campos clínicos para as tabelas de importação.
- Não usar `atendimento_id` como substituto genérico de proveniência.
- Não armazenar credenciais, caminho local sensível ou cópia de arquivo clínico no repositório.
- Não decidir retenção ou deleção de conteúdo bruto sem requisito de segurança e auditoria.

## Relação com lacunas clínicas

- Duração, ano, prescrição, execução pelo ambulatório e motivo do tratamento continuam exigindo extensão própria de `tratamento_chagas`.
- Documento trazido, encaminhamento para projeto e contrarreferência continuam exigindo confirmação e eventual extensão do fluxo assistencial.
- `Pendencias/Observação` poderá ser preservada integralmente antes de uma regra separar observação livre e pendência estruturada.
- Cabeçalhos repetidos de exames poderão ser distinguidos por aba, posição e chave original, sem novas tabelas clínicas.

## Validação esperada de uma futura migration

- inserção de lote e múltiplas linhas sintéticas;
- preservação exata de `JSONB`, aba, posição e responsável original;
- FK de linha para lote e cardinalidades escolhidas para registros gerados;
- unicidade de posição, se aprovada;
- reprocessamento e status, conforme regras futuras;
- deleção e retenção explicitamente definidas;
- testes transacionais com `ROLLBACK` e confirmação pós-transação.

## Pendências que bloqueiam a migration

1. Obter a lista canônica ordenada das colunas e abas, somente como metadados seguros.
2. Definir unidade de lote, identidade de arquivo e comportamento de reprocessamento.
3. Escolher o vínculo físico entre linha de origem e registros gerados.
4. Definir retenção, acesso e eventual descarte de `dados_brutos` considerando dados clínicos sensíveis.
5. Definir domínios mínimos de status e semântica dos contadores.
6. Inventariar, sem versionar dados reais, o formato dos valores de responsável pela digitação.

Até essas decisões serem resolvidas, esta especificação orienta o próximo trabalho, mas não autoriza criar ou aplicar migration.
