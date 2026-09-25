# Contrato Temporal de Revisão da Planilha

Atualizado em: 2026-09-25

Status: barreira de finalidade implementada na v1.4.0; extensão física especificada,
ainda sem migration ou aplicação de revisões.

## Autoridade e limite

Este documento complementa a
[especificação normativa do importador](../ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md)
para arquivos revisados de conteúdo diferente. A decisão arquitetural é a
[ADR-022](../DECISOES_ARQUITETURAIS.md#adr-022). A semântica de negócio continua
definida nas [decisões humanas](../dados/DECISOES_HUMANAS_NOVA_PLANILHA.md).

D8 confirma que a planilha atualiza a linha do paciente e guarda o ano do último
comparecimento, não necessariamente seu histórico. Portanto, hash diferente
identifica outro conteúdo, não outra consulta. Este contrato não escolhe o destino
do ano legado, não aprova novos tipos de retorno e não autoriza dados reais.

A v1.4.0 exige finalidade explícita e recusa revisões antes de qualquer escrita,
inclusive em dry-run. As regras de mapeamento, decisão e aplicação abaixo são
requisitos futuros. A barreira não verifica a veracidade da declaração de carga
inicial e não implementa reconciliação entre hashes.

## Identidades distintas

| Identidade | Evidência exigida | O que não comprova |
| --- | --- | --- |
| Conteúdo importado | SHA-256 dos bytes e versão do layout | Identidade de paciente, consulta ou ordem clínica dos fatos |
| Paciente | Conciliação sem conflito e `paciente_id` validado | Nome/nascimento não identificam uma ocorrência e não são unicidade clínica |
| Linha de origem | Lote, aba e posição dentro daquele conteúdo | Posição, aba ou ID legado não são chave estável entre arquivos |
| Ocorrência clínica | Alvo existente e proveniência inequívoca, ou evidência explícita de nova ocorrência | Data igual não prova duplicidade; data diferente não prova nova visita |
| Revisão | Relação explícita com a versão-base e decisões auditadas por linha/campo | Nome do arquivo, data de upload ou ordem de execução não estabelecem precedência |

Um identificador estável de ocorrência da fonte somente poderá substituir o
mapeamento revisado após contrato próprio e verificação de unicidade/estabilidade.
O layout atual não fornece essa garantia. Coincidência de nome/nascimento, ID
legado, data ou conteúdo pode sugerir candidatos, nunca aprovar o vínculo sozinha.
Não criar `UNIQUE(paciente_id, data_atendimento)` para resolver essa ausência.

## Entrada e mapeamento obrigatório

Antes de qualquer escrita clínica, declarar a finalidade do arquivo: carga
inicial, repetição/retomada do mesmo conteúdo ou revisão de uma fonte já
importada. Hash desconhecido não seleciona automaticamente carga inicial.
Finalidade ausente ou ambígua bloqueia a aplicação até esclarecimento.

Na CLI v1.4.0, `--finalidade carga_inicial` declara a carga sintética;
`--finalidade mesmo_conteudo` exige lote existente do mesmo hash/layout e preserva
retomada, no-op e `--reprocessar`; `--finalidade revisao` é sempre recusada.
Repetir a opção é ambíguo, mesmo com valores iguais. Combinar carga inicial e
`--reprocessar` também é recusado. A repetição de uma carga inicial declarada
continua idempotente quando o conteúdo já foi processado. Nenhum desses modos
autoriza vincular conteúdos diferentes.

Para revisão, exigir:

1. identificação da fonte lógica e do lote-base terminal, com hash/layout
   verificáveis, além do hash/layout exatos do novo arquivo;
2. correspondência explícita de cada linha não vazia com a linha da versão-base
   e seus alvos, ou decisão justificada de que se trata de ocorrência nova;
3. classificação da operação e escopo de cada campo alterado: paciente/fato
   consolidado, atendimento existente ou nova ocorrência;
4. validação dos pacientes, alvos, proveniência e versões do contrato/manifesto;
5. decisão de revisão atribuível ao responsável autorizado, com justificativa,
   instante da decisão e evidências restritas, sem substituir essa identidade pelo
   texto legado de quem digitou a planilha.

O lote-base pode estar `concluido_com_pendencias`, mas somente linhas com âncoras
válidas podem sustentar reutilização. Linha anteriormente rejeitada não fornece
atendimento: sua correção não autoriza criar um sem nova conciliação e evidência
de ocorrência. Lote em andamento ou falho não é base estável para revisão.

Reordenação, inserção, remoção de linhas e troca de aba não transportam posições
automaticamente. Mapeamento com múltiplos candidatos, alvo órfão ou paciente
incompatível bloqueia a linha. Duas linhas novas apontando para a mesma linha-base
também exigem revisão explícita; não duplicar nem mesclar silenciosamente.
Ausência de correspondência não é evidência suficiente de nova visita.

No escopo inicial, cada linha revisada utiliza no máximo um atendimento como
âncora. Dividir uma linha em várias visitas ou fundir visitas exige contrato
próprio; não reconstruir episódios a partir de datas dispersas na linha.

## Decisão e efeitos permitidos

Os nomes da primeira coluna são categorias do contrato, não novos valores de
`status_linha` nem opções de CLI já disponíveis.

| Categoria | Condição necessária | Efeito permitido |
| --- | --- | --- |
| Sem mudança clínica | Correspondência aprovada; campos estruturados equivalentes segundo transformações versionadas | Preservar novo bruto e associar alvos existentes; nenhuma escrita clínica |
| Correção da mesma ocorrência | Evidência de erro na representação anterior, mesmo paciente/atendimento e campos delimitados | Corrigir somente campos aprovados no mesmo alvo, com antes/depois; não criar outra visita |
| Nova visita | Comparecimento distinto explicitamente comprovado, paciente conciliado e data real completa válida | Criar um atendimento e somente seus dependentes comprovados; preservar todos os anteriores |
| Atualização consolidada | Fato do paciente identificado e reconciliação específica do destino aprovada | Associar ou alterar somente o fato delimitado; não criar atendimento como efeito colateral |
| Revisão necessária | Evidência insuficiente, conflito ou destino sem contrato | Preservar bruto e diagnóstico técnico; nenhuma escrita clínica da linha |

Uma linha pode combinar correção da ocorrência com atualização consolidada, desde
que o plano discrimine os alvos e campos. A aplicação é atômica por linha: conflito
temporal em qualquer parte desfaz todas as suas novas escritas clínicas. A
política não crítica de catálogo da v1.3.0 não torna um conflito temporal aceitável.

Na nova visita, campos carregados da versão anterior não viram novas ocorrências
de exame, reação, pendência ou encaminhamento apenas por aparecerem novamente.
Para destino repetível, exigir identidade/evidência de ocorrência ou reutilizar o
alvo comprovado quando o vínculo for compatível. Se não for possível distinguir
repetição de ocorrência nova, bloquear a linha, sem copiar todos os handlers.
Fatos consolidados, como BZN, continuam sujeitos à cardinalidade e às regras
próprias; não criar outro tratamento nem deslocar seu atendimento de registro.

Revisão de dados de identidade exige conciliação humana explícita com o paciente
existente; não usar correção de nome/nascimento para criar outro paciente ou fazer
merge. Troca de aba não autoriza reversão automática de diagnóstico. A precedência
da aba de portadores no v1 não substitui a revisão entre versões da fonte.

## Precedência e proteção de alterações manuais

Comparar três estados por campo: valor da fonte-base, valor estruturado atual e
valor proposto pela nova fonte. Comparações devem usar a mesma transformação
versionada e distinguir coluna ausente, célula vazia e valor efetivo. Também é
necessário conhecer o histórico do campo desde a base, não apenas sua igualdade
atual: um valor pode ter sido alterado e depois restaurado manualmente.

- Proposta equivalente ao valor atual: somente associação, sem sobrescrita.
- Fonte nova equivalente à base e banco alterado depois: preservar o banco;
  revisão da planilha não restaura valor antigo nem desfaz edição manual.
- Fonte mudou e o banco conserva comprovadamente o estado-base: candidato a
  correção, não autorização automática. Exigir a decisão por campo e seu histórico.
- Fonte mudou e o banco também mudou de forma divergente: conflito; o responsável
  deve decidir novamente com os estados atuais. Nenhum lado vence por data de carga.
- Campo atual `NULL` sem histórico de propriedade: não preencher automaticamente;
  pode representar remoção manual, não ausência original.
- Célula agora vazia, coluna ausente ou linha removida: não apagar, anular nem
  inativar registro. Retificação para ausência exige decisão explícita por campo,
  histórico e suporte do destino; exclusão física fica fora deste fluxo.

Antes de confirmar a transação, reler e proteger os alvos contra alterações
concorrentes, verificando os estados usados na decisão. Se divergirem, invalidar
a aplicação e exigir nova revisão, sem sobrescrita baseada em decisão obsoleta.
Revisões concorrentes da mesma base não ganham prioridade por chegar primeiro:
a segunda deve ser reconciliada com a revisão já aplicada, sem aplicação cega.

Versão do arquivo, instante de processamento, maior ano de retorno ou contrato
mais recente não concedem autoridade para substituir fatos. Uma correção legítima
pode inclusive reduzir um ano incorreto; isso depende de evidência e decisão, não
da regra automática de escolher o maior valor.

## Precisão temporal e histórico ausente

O ano do último comparecimento não é a data de um novo atendimento. Mantê-lo no
bruto até aprovar a representação anual de D8; `evento_clinico.ano_evento` continua
sendo apenas uma possibilidade. Mudar de 2023 para 2025 não prova dois retornos,
um retorno em 2024 nem a data exata de qualquer visita. Ano inalterado também não
exclui vários comparecimentos no mesmo ano.

Não completar dia/mês, gerar visitas intermediárias, usar o dia da importação como
data clínica ou criar retrospectivamente uma série anual. A mudança de
`data_do_atendimento` pode ser correção ou nova visita: requer classificação e
evidência, não inferência pela diferença. No escopo deste contrato, criação de
atendimento mantém a exigência v1 de data real completa; informação somente anual
não satisfaz esse requisito.

D6/D7 continuam sendo datas efetivas de comparecimento, não prescrição mais 30/60
dias. D9 é planejamento/orientação, não prova de visita realizada. Não inferir
contrarreferência, documento entregue ou encerramento de tratamento desses campos.
Se uma versão anterior da fonte não foi importada/preservada, não afirmar que o
histórico perdido foi recuperado pela revisão atual.

## Proveniência, auditoria e idempotência

`lote_reprocessado_de_id` continua exclusivo para o mesmo hash/layout, conforme a
FK composta de `sql/12_modulo_importacao_proveniencia.sql`. Não alterá-la nem usar
essa coluna para ligar hashes diferentes. Cada novo conteúdo inicia sua própria
cadeia; a relação de revisão entre conteúdos precisa de representação separada.

O schema atual preserva bruto por linha e associações N:N por alvo, suficientes
para o reprocessamento homologado. Ele não registra de forma estruturada a
linhagem entre hashes, o mapeamento revisado, a decisão humana e o histórico de
campo necessários para autorizar correções. `acao = atualizado` e mensagens
livres não substituem essa auditoria. A extensão mínima está especificada abaixo;
sua implementação exige nova migration e homologação antes de habilitar escritas
de revisão. Nenhuma migration aplicada ou evidência física muda nesta tarefa.

A evidência persistente de cada decisão deve conter no mínimo:

- fonte, lotes/hashes/layouts base e revisado, linhas e alvos envolvidos;
- categoria, chaves semânticas e operações autorizadas, inclusive não alteração;
- valores base, atual avaliado e proposto, antes/depois efetivos e precisão temporal;
- responsável autorizado, justificativa, instante, versão da decisão e versões
  das transformações/manifesto/importador utilizadas;
- resultado da aplicação, proveniência efetiva e referência à decisão anterior
  quando substituída por outra revisão, sem apagar a decisão antiga.

Essas evidências podem conter dados sensíveis e pertencem ao ambiente protegido;
não devem ir para Git, logs, relatório público ou API genérica. Logs e diagnósticos
devem conter somente códigos técnicos, identificadores internos e contagens. O
contrato de identidade do revisor deverá respeitar o isolamento atual: não ampliar
por conveniência o acesso do importador à tabela `usuario_aplicacao`.

A unidade idempotente é a decisão aprovada para a linha do conteúdo revisado.
Reexecutar decisão já aplicada verifica o resultado, sem repetir seus efeitos.
Retomada não repete linhas confirmadas; decisão, mutação clínica e proveniência
devem confirmar juntas. Reprocessar o mesmo hash não reaplica correções já feitas
nem contorna revisão pendente. Decisão alterada exige nova versão auditável e
revalidação; conteúdo alterado exige nova revisão vinculada ao novo hash.

Reprocessamento ou promoção de uma versão antiga deve verificar decisões de
revisão posteriores dos mesmos alvos. Não promover um valor antigo que tenha sido
corrigido ou substituído; conflito de precedência exige revisão, mesmo que a
cadeia local de mesmo hash pareça válida.

O futuro dry-run deverá avaliar o mesmo plano e conflitos, sem persistir decisão,
lote ou dados clínicos. Seu resultado não reserva alvos nem autoriza aplicar um
plano cujo estado-base tenha mudado depois da simulação.

Não adicionar estados físicos por inferência: revisão necessária é um diagnóstico
do contrato. Finalidade/base ausente bloqueia o preflight antes da escrita clínica;
após staging, falha crítica de identidade temporal pode ser registrada como
`rejeitada`, mantendo o bruto e o motivo técnico. Não usar
`importada_com_pendencia` para afirmar que existe atendimento validado quando não
existe. O fluxo auditado de aprovação/reaplicação ainda precisa ser implementado.

## Extensão física mínima proposta

Esta seção é o contrato técnico para implementação futura, não a descrição de
objetos já existentes. Mantém a semântica da ADR-022 e separa armazenamento,
captura de histórico e aplicação clínica em incrementos verificáveis.

### Evidência do estado vigente

| Fonte inspecionada | Garantia atual e consequência para a extensão |
| --- | --- |
| `docs/evidencias/schema_atual_ambulatorio.sql`: `importacao_lote` e `fk_importacao_lote_reprocessamento` | PK `bigint`, identidade única `(importacao_lote_id, hash_arquivo_sha256, layout_versao)` e FK do predecessor com os mesmos hash/layout. A nova linhagem deve usar outra relação. |
| Mesmo dump: `importacao_linha` | Posição única `(importacao_lote_id, aba_ordem, numero_linha)`, bruto em array JSONB e FK ao lote. Posição identifica somente a linha daquele arquivo. |
| Mesmo dump: `importacao_registro` | Vínculo único `(importacao_linha_id, schema_destino, tabela_destino, registro_id)`. O alvo heterogêneo não tem FK polimórfica; sua existência é verificada operacionalmente. |
| `scripts/importar_planilha.py`: `prepare_lot`, `predecessor_line`, `provenance`, `reconcile` | Procura lotes pelo mesmo conteúdo; resolve predecessor por aba/posição; pode atualizar `acao` do vínculo; preenche nulos sem história de campo. Essas rotinas não autorizam correção entre hashes. |
| `process_row` e `scripts/importador/psql.py` | Sessão persistente, transação clínica por linha e savepoints no dry-run. Staging e alguns estados operacionais ficam fora dessa transação; isso não basta para a nova aprovação auditável. |
| `sql/17_hardening_operacional.sql`, `18_identidade_aplicacao.sql` e `20_isolar_identidade_do_importador.sql` | Importador recebe DML também por privilégios padrão em novas tabelas/sequências; aplicação tem DML clínico e leitura da identidade. A migration 20 retira todo acesso do importador a `usuario_aplicacao` e sua sequência. |

O dump é gerado sem ACLs; migrations de permissões complementam a evidência
estrutural. `criado_em`/`atualizado_em`, a última `acao` de proveniência e igualdade
de valores não comprovam a ausência de uma edição manual intermediária.

### Entidades, campos e relacionamentos

Todos os nomes abaixo pertencem ao schema `ambulatorio`. Novas PKs são `bigint`
geradas por identidade; instantes novos usam `timestamptz`, sem converter as
colunas antigas. FKs e contadores usam `bigint`; nomes, códigos e versões técnicas
usam `text` com domínio/validação explícitos. Campos são obrigatórios salvo
indicação de nulabilidade.
Textos identificadores/justificativas exigem conteúdo não vazio; hashes exigem
64 caracteres hexadecimais minúsculos. FKs usam `ON DELETE RESTRICT`, sem cascata.
Instantes de concessão, decisão, evento e execução vêm do servidor; datas enviadas
pelo cliente não podem simular aprovação anterior à expiração/revogação.

| Entidade proposta | Campos principais | Chaves e regras locais |
| --- | --- | --- |
| `importacao_fonte` | `fonte_id`, `codigo`, `lote_inicial_id`, `registrada_por_usuario_id`, `criado_em`, `revisao_corrente_id` anulável, `versao_controle` | PK; `UNIQUE(codigo)`; FKs ao lote inicial, usuário e revisão corrente da mesma fonte; versão não negativa. Identifica uma fonte lógica declarada, não um nome de arquivo. |
| `importacao_revisao` | `revisao_id`, `fonte_id`, `lote_base_id`, `hash_base`, `layout_base`, `lote_revisado_id`, `hash_revisado`, `layout_revisado`, `revisao_base_id` e `revisao_substituida_id` anuláveis; `versao_fonte_esperada`, `contrato_versao`, `manifesto_base_sha256`, `manifesto_revisado_sha256`, `transformacoes_versao`, `importador_versao`, `revisao_git`, `estado`, `criada_em`, `encerrada_em` anulável | Duas FKs compostas à identidade existente de `importacao_lote`; lotes e hashes diferentes. FKs autorreferentes restritas à mesma fonte, sem autorreferência. Estados: `preparada`, `em_aplicacao`, `concluida`, `concluida_com_pendencias`, `cancelada`. Índice único parcial por `(fonte_id, hash_revisado, layout_revisado)` nos estados com aplicação iniciada ou concluída. |
| `importacao_revisao_autorizacao` | `autorizacao_id`, `fonte_id`, `usuario_id`, `concedida_por_usuario_id`, `concedida_em`, `valida_ate` anulável, `revogada_em` e `revogada_por_usuario_id` anuláveis | FKs à fonte e às identidades; datas ordenadas; revogação com ator e instante juntos. Concessão é imutável, revogação é irreversível; nova concessão gera outro ID. Nenhuma concessão automática por perfil. |
| `importacao_revisao_decisao` | `decisao_id`, `revisao_id`, `linha_revisada_id`, `linha_base_id` anulável, `paciente_id` e `atendimento_base_id` anuláveis; `versao_decisao`, `decisao_anterior_id` anulável, `resultado`, `autorizacao_id`, `decidida_por_usuario_id`, `justificativa`, `decidida_em`, `plano_sha256` | FKs às linhas, paciente, atendimento, autorização e decisão anterior. `UNIQUE(revisao_id, linha_revisada_id, versao_decisao)` e `UNIQUE(decisao_anterior_id)` para impedir bifurcação da mesma decisão; versão positiva. Resultado: `autorizar` ou `bloquear`. Mapeamento e decisão ficam juntos e imutáveis. |
| `auditoria_campo` | `campo_id`, `tabela_destino`, `coluna_destino`, `coluna_pk`, `tipo_sql`, `serializacao_versao`, `captura_desde` anulável | `UNIQUE(tabela_destino, coluna_destino)`; catálogo técnico fechado de destinos físicos. Só o mantenedor altera seu contrato; `captura_desde` nulo significa que não existe cobertura operacional habilitada. Não cadastra automaticamente todas as colunas do banco. |
| `importacao_revisao_campo` | `revisao_campo_id`, `decisao_id`, `campo_id`, `alvo_chave`, `registro_id` anulável; `chave_semantica`, `bloco_funcional`, `ocorrencia`; `categoria`, `operacao`, `base`, `atual_avaliado`, `proposto` em JSONB; `ultimo_evento_avaliado_id` anulável, `cobertura_historica` | FKs à decisão, catálogo e evento avaliado; `UNIQUE(decisao_id, alvo_chave, campo_id)`; ocorrência positiva. Categorias são as cinco categorias deste contrato. Operações: `conservar`, `associar`, `definir`, `anular`, `criar`; nenhuma operação de exclusão. Campos de uma decisão autorizada são imutáveis. |
| `importacao_revisao_aplicacao` | `aplicacao_id`, `decisao_id`, `numero_tentativa`, `resultado`, `codigo_resultado`, `executor_db`, `executada_em`, `plano_sha256`, `atendimento_criado_id` anulável | FK à decisão e, quando criado, ao atendimento; `UNIQUE(decisao_id, numero_tentativa)`; índice único parcial por decisão para `resultado = aplicada`. Resultados: `aplicada`, `obsoleta`, `conflito`, `falha_operacional`. Tentativas são anexadas, nunca sobrescritas. |
| `importacao_revisao_alvo` | `revisao_alvo_id`, `aplicacao_id`, `alvo_chave`, `tabela_destino`, `registro_id`, `importacao_registro_id`, `acao` | FKs à aplicação e proveniência; `UNIQUE(aplicacao_id, alvo_chave)`; ID de registro positivo e ação no domínio vigente de proveniência. Resolve cada alvo lógico do plano para um único registro efetivo, inclusive IDs gerados durante a aplicação. |
| `auditoria_campo_evento` | `evento_id`, `campo_id`, `registro_id`, `versao_campo`, `evento_anterior_id` anulável; `origem`, `antes`, `depois` em JSONB, `ocorrido_em`, `principal_db`, `ator_usuario_id`, `importacao_linha_id`, `revisao_alvo_id` e `revisao_campo_id` anuláveis | FKs ao catálogo, usuário, linha, evento anterior, alvo aplicado e campo aprovado; `UNIQUE(campo_id, registro_id, versao_campo)` e `UNIQUE(evento_anterior_id)` para uma cadeia sem bifurcação. Origem: `marco_atual`, `importacao`, `revisao`, `aplicacao`, `operacao_tecnica`. Eventos são imutáveis. |

Essas nove relações evitam duplicar bruto, pacientes, atendimentos, identidades e
proveniência. O catálogo limita a escrita genérica; o histórico é compartilhado
com os demais escritores para detectar mudanças fora da revisão. O vínculo de
alvo separa IDs ainda inexistentes no plano dos IDs gerados na aplicação.

Não existe FK SQL que aponte dinamicamente para qualquer tabela. As referências
`tabela_destino/registro_id` exigem catálogo permitido, validação de existência e
de pertencimento ao paciente/atendimento, além de proteção do alvo contra remoção.
Não aceitar identificadores SQL livres da planilha ou do cliente. Criar índices
nas FKs usadas em procura/bloqueio e em `(campo_id, registro_id, versao_campo)`;
não criar unicidade clínica nova para paciente/data ou fato consolidado.

### Invariantes de linhagem e mapeamento

As verificações entre tabelas exigem rotinas restritas e gatilhos de integridade;
um `CHECK` local não consulta com segurança o estado de outras linhas. A futura
migration deve explicitar e testar cada mecanismo, inclusive com DML direto pelo
papel técnico que realmente receberá a permissão.

Checagens de completude entre cabeçalho/filhos e aplicação/alvos/eventos devem
ocorrer ao final da transação, permitindo inserir as partes sem aceitar estado
incompleto no commit. A nulabilidade de cada referência é condicionada à sua
operação/origem; não basta todas as FKs isoladas serem válidas.

1. A fonte inicial é cadastrada explicitamente a partir de lote terminal e
   proveniência conferida. O cadastrador institucional ainda precisa ser definido;
   usuário de teste não representa autorização de produção. Não inferir a fonte
   pelo hash, nome de arquivo ou identificador legado.
2. Uma revisão sem `revisao_base_id` parte do conteúdo inicial da fonte. As demais
   partem do conteúdo de uma revisão terminal da mesma fonte. O lote-base escolhido
   deve ser terminal e pertencer à cadeia comprovada de mesmo hash/layout desse
   conteúdo, não apenas ter bytes coincidentes. A revisão aponta para o lote-base
   exato usado no plano, inclusive quando ele é um reprocessamento.
3. O lote revisado inicia uma cadeia própria, sem usar
   `lote_reprocessado_de_id` para a base diferente. Snapshot de hash/layout deve
   satisfazer a FK composta existente. Validar ancestralidade e rejeitar ciclos,
   incluindo retorno ao conteúdo inicial da fonte. Não usar maior ID como ordem
   de ocorrência ou como autorização. Reutilizar bytes ancestrais como uma nova
   revisão fica fora deste recorte; não confundir essa restrição com a proibição
   de corrigir um campo para um valor anterior mediante nova evidência.
4. `revisao_corrente_id` e `versao_controle` da fonte são alterados somente pelo
   protocolo transacional abaixo. A FK da revisão corrente deve comprovar a mesma
   fonte, com chave composta auxiliar. Primeira aplicação exige base corrente e
   versão esperada; uma revisão parcialmente aplicada impede avanço de outra.
5. Propostas concorrentes podem permanecer `preparada`. Uma proposta sem efeitos
   pode ser cancelada e substituída por outra revisão, com `revisao_substituida_id`
   e nova base; nunca editar sua base ou suas decisões. Revisão com sucesso clínico
   ou associação confirmada não pode ser cancelada nem retornar a `preparada`.
   O índice parcial impede reaplicar o mesmo conteúdo por outro lote/revisão.
   Estado terminal impede novas decisões/efeitos; versões sucessoras são aceitas
   apenas enquanto a revisão estiver aberta. Uma correção posterior ao fechamento
   exige outro fluxo autorizado, sem reabrir silenciosamente uma base já utilizada.
6. `linha_revisada_id` deve pertencer exatamente ao lote revisado; `linha_base_id`,
   quando presente, ao lote-base. Validar a linha e a cadeia de proveniência que
   sustenta cada âncora; eventual consulta a um predecessor não muda a identidade
   da linha declarada. Bruto e identidades de lotes/linhas usados em decisões
   tornam-se protegidos contra alteração quando a fonte entrar no fluxo auditado.
7. Uma decisão `autorizar` exige paciente conciliado, autorização vigente e pelo
   menos um campo comparado. Correção de ocorrência exige atendimento existente
   do mesmo paciente; nova visita não exige linha-base, mas exige evidência
   explícita e data completa. `bloquear` pode conservar âncoras nulas e nenhum
   campo aplicável, sem permitir escrita clínica.
8. Há no máximo uma decisão efetiva por linha: versão 1 não tem anterior; as
   seguintes apontam à versão imediatamente anterior da mesma revisão/linha.
   A versão efetiva é verificada sob bloqueio, não por horário. Não aprovar duas
   linhas distintas para a mesma linha-base/ocorrência por aproximação. No recorte
   inicial, o revisor deve resolver a duplicidade ou bloquear; divisão/fusão
   permanece fora do escopo.
9. Os alvos de todos os campos precisam concordar com o mapeamento e sua categoria.
   Nova visita permite somente um atendimento novo por linha/conteúdo; versões
   posteriores da decisão reutilizam o criado. A rotina deve conferir aplicações
   anteriores de toda a cadeia da decisão, não somente o ID atual, antes de criar.
   Alvo dependente repetível exige identidade própria; não copiar handlers em bloco.
10. Decisão, campos e hash do plano são publicados juntos. A função de aprovação
    calcula o hash sobre representação canônica versionada, incluindo mapeamento,
    campos, valores, tokens de histórico e versões técnicas; o hash não autentica
    o revisor. Cabeçalho sem campos obrigatórios ou alteração posterior é inválido.
    Não omitir campos alterados para fazer um plano passar: destino sem contrato
    ou conflito temporal permanece bloqueado. Artefatos das transformações e dos
    manifestos devem ser recuperáveis e verificáveis; metadado legado ausente não
    pode ser preenchido presumindo a versão atual.

### Valores comparáveis e cobertura de histórico

Os JSONB `base` e `proposto` usam envelope fechado com `estado`, `tipo_sql`,
`valor`, `precisao` e `serializacao_versao`. Estados da fonte: `linha_ausente`,
`coluna_ausente`, `celula_vazia`, `valor`; anulação aprovada usa `nulo_explicito`.
No snapshot do banco e nos eventos, estados
são `valor`, `nulo`, `alvo_ausente`, `desconhecido`. `valor` exige valor JSON do
tipo esperado; os demais exigem JSON null. O envelope inteiro nunca é SQL NULL.
Precisão pode ser `nao_temporal`, `data_completa`, `ano`, `instante` ou
`desconhecida`; registrar `ano` não habilita o destino de D8. Nomes de tipos e
regras de serialização vêm do catálogo, não de conversão arbitrária fornecida pelo
cliente. Ausência, vazio e nulo não se tornam iguais por normalização. Contrato
de catálogo já referenciado não pode ser reinterpretado em lugar; evolução exige
migration e preservação da serialização das evidências anteriores.

`operacao = criar` usa um `alvo_chave` estável dentro do plano e `registro_id`
nulo antes da aplicação. As demais operações exigem ID existente. Todos os campos
do mesmo alvo lógico resolvem para a mesma tabela/registro; diferentes alvos
lógicos não podem disfarçar alteração duplicada do mesmo campo físico. `anular`
exige coluna anulável, decisão explícita e contrato do destino. `conservar` ou
`associar` não escreve no campo. `revisao_necessaria` só admite conservação e
decisão bloqueada.

Histórico completo exige captura transacional de todo INSERT/UPDATE/DELETE
relevante, inclusive importador, aplicação e manutenção técnica. A captura deve
usar os valores reais anteriores/posteriores e avançar `versao_campo` sob
bloqueio do registro. A FK do evento anterior precisa assegurar o mesmo
campo/registro; versões avançam exatamente um, sem ramificações. Alterar A→B→A
produz dois eventos mesmo que o valor final coincida com a base. IDs de sequência,
`xmin`, timestamps ou comparação de valor sozinhos não são esse token.

Um marco inicial registra apenas o estado observado naquele instante. Não
reconstrói autoria, valor original ou ausência de edição anterior. A ligação
`ultimo_evento_avaliado_id` deve corresponder ao mesmo campo/registro e à última
versão observada; `cobertura_historica` distingue `desde_base`, `posterior_base`,
`desconhecida` e `alvo_novo`. `desde_base` exige vínculo verificável com a linha-base
ou sua cadeia auditada de proveniência e continuidade de captura, não apenas
comparação de datas. Só `desde_base` comprovado permite aplicação da correção
do campo previamente aprovado; igualdade não promove outra condição para ela.
Para base legada sem cobertura, bloquear correção/anulação/preenchimento e exigir
conciliação explícita para estabelecer uma nova base homologada, em incremento
próprio; associação sem mudança continua possível com mapeamento aprovado.

Eventos de importação exigem `importacao_linha_id` e conferência, no commit, de
proveniência para o mesmo alvo; os demais escritores não podem simular essa origem.
Eventos de revisão exigem referências ao campo aprovado e ao alvo da aplicação
bem-sucedida. Outros escritores não podem usar essa origem. Para escrita técnica
sem identidade funcional verificável, guardar o principal do banco e ator humano
nulo, sem inventar identidade; a ausência de atribuição bloqueia reutilização
automática desse estado como evidência de autoria. Triggers não concedem
permissão clínica e não podem ser desabilitados pelos papéis operacionais.
Remoção de alvo com revisão/histórico referenciado deve ser recusada no recorte
inicial; futuras políticas de eliminação/retenção exigem decisão própria. Vínculos
de proveniência já usados em decisões/aplicações também devem ser protegidos
contra alteração ou remoção que invalidaria a evidência.

### Autoria, permissões e portas de ativação

| Papel | Permissão pretendida |
| --- | --- |
| `ambulatorio_importador` | Mantém o fluxo v1 permitido; sem acesso direto às nove novas tabelas/sequências, a decisões ou a `usuario_aplicacao`. Antes de processar fonte auditada, deverá passar por verificação restrita de precedência. |
| `ambulatorio_aplicacao` | Mantém as permissões atuais; não recebe por herança acesso ao novo histórico ou aprovação. A leitura atual de identidade não autoriza revisão. |
| Futuro `ambulatorio_revisao_servico` | Papel NOLOGIN sem associação automática aos dois anteriores; somente execução das funções específicas de consulta, proposta, aprovação e aplicação que forem homologadas. Sem SQL clínico genérico ou DML direto nas novas relações. |
| Dono restrito das funções de revisão/captura | NOLOGIN, sem superusuário; somente privilégios necessários aos destinos homologados e a colunas de identificação/estado de usuário, sem leitura de `senha_hash`. Não pode ser assumido pelos papéis operacionais. |
| Mantenedor de migrations | Cria objetos, define catálogo e permissões; não representa um revisor clínico. Acesso de owner/superusuário exige governança externa e não é contido por estas FKs. |

Na mesma transação que criar as novas tabelas/sequências, revogar os privilégios
herdados da migration 17 para o importador e qualquer acesso de `PUBLIC` ou da
aplicação. Não alterar migrations antigas nem abrir leitura de identidade ao
importador. A primeira migration entrega armazenamento fechado, sem criar login,
conceder revisão a usuário existente ou publicar funções de aplicação clínica.

Futuras funções privilegiadas devem ter objetos qualificados, `search_path`
restrito a schemas confiáveis com `pg_temp` por último, parâmetros sem nomes SQL
livres e `EXECUTE` revogado de `PUBLIC` na transação de criação. A orientação
técnica é a de [funções SECURITY DEFINER no PostgreSQL 16](https://www.postgresql.org/docs/16/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY).

A autorização referencia `usuario_aplicacao` sem copiar senha, login ou perfil.
Um serviço confiável deverá extrair a identidade da sessão autenticada, nunca de
um campo livre da requisição, da planilha ou de um GUC configurável pelo cliente.
As funções revalidam usuário ativo, autorização da mesma fonte/usuário, vigência
e revogação na aprovação e na aplicação. Só a camada autenticadora confiável pode
afirmar o ator; uma FK ou o papel compartilhado do pool não prova quem decidiu.
Definir institucionalmente quem concede/revoga é pendência anterior à ativação.

Os dois papéis atuais ainda têm DML clínico. Por isso, armazenamento e permissões
das novas relações não bastam: antes da primeira revisão, instalar e testar
captura e proteção de precedência em todos os caminhos que escrevem nos campos
habilitados. Reprocessamento/promoção v1 de uma fonte antiga deve consultar
revisões posteriores e bloquear dado superado, inclusive se acessar o banco por
caminho alternativo. Se um caminho não puder ser coberto, a revisão daquele
destino permanece desabilitada. Não habilitar o executor para compensar essa lacuna.

### Atomicidade, concorrência e retomada

O cabeçalho e o staging restrito podem existir antes da aprovação. Publicar uma
decisão e todos os seus campos é outra transação atômica, sem escrita clínica.
Uma decisão bloqueada preserva evidência/motivo; não é uma aplicação parcial.
Aprovação, substituição de decisão, cancelamento e encerramento usam os mesmos
bloqueios de fonte/revisão/decisão da aplicação, impedindo troca concorrente da
versão efetiva depois de sua verificação.

Para aplicar uma linha autorizada, o futuro executor deve:

1. Iniciar uma única transação na mesma conexão. Bloquear a fonte, revisão,
   autorização/identidade e decisão efetiva; depois bloquear pacientes,
   atendimentos e demais alvos em ordem determinística. Para criação, bloquear
   também a âncora existente e a decisão, pois o registro novo ainda não existe.
2. Consultar aplicação já confirmada. Se existir, verificar os vínculos e eventos
   registrados, informar o resultado histórico e não repetir efeitos. Mudança
   legítima posterior pode ser reportada como divergência atual, sem restaurar o
   valor aprovado antigo ou declarar que o primeiro sucesso desapareceu.
3. Na primeira linha, comparar base e versão da fonte com o plano. Se outra revisão
   avançou, registrar obsolescência e exigir novo plano após ela terminar. Na
   retomada, a revisão corrente deve ser a própria revisão em aplicação. Isso
   serializa a fonte sem dar precedência clínica ao primeiro upload.
4. Reler dados, estado das autorizações, mapeamento, proveniência, versões do
   contrato e tokens de histórico. Verificar a cobertura e os valores com as
   transformações aprovadas. Divergência ou revogação invalida a linha inteira;
   `NULL` continua sendo valor a comparar, não autorização para preenchimento.
5. Executar somente o plano autorizado. Gravar aplicação de sucesso, resolução
   dos alvos, proveniência e eventos reais antes/depois na mesma transação. Os
   eventos devem coincidir com os efeitos efetivos, incluindo mudanças produzidas
   por triggers; nenhuma ação clínica pode ficar sem evidência correspondente.
   Associação sem alteração usa a comparação aprovada e o alvo resolvido, sem
   inventar evento de mudança de valor.
6. Atualizar estado da linha usando os estados existentes e, na primeira aplicação,
   avançar a revisão corrente e a versão da fonte no mesmo commit. A FK antiga
   continua intocada. Só encerrar revisão/lote quando todas as linhas estiverem
   contabilizadas como aplicadas ou bloqueadas/rejeitadas; pendências não criam
   âncoras fictícias. Encerramento com pendências permite futura base somente para
   linhas cuja proveniência foi efetivamente validada.

Se todas as linhas estiverem bloqueadas e nenhuma tiver aplicação confirmada,
não avançar a fonte nem declarar a revisão concluída. Ela permanece preparada
para novas decisões ou é cancelada sem efeitos. O encerramento, quando permitido,
também bloqueia a fonte/revisão e impede aprovação tardia sobre a base congelada.

Qualquer falha antes do commit reverte mutações, eventos, vínculos e sucesso da
linha. Depois do rollback, uma transação separada pode anexar tentativa de falha
com código técnico e decisão, sem valores clínicos e sem afirmar sucesso parcial.
Falha de registro desse diagnóstico não autoriza sucesso. Deadlock ou erro
transitório permite nova tentativa após revalidação; conflito de conteúdo exige
nova versão de decisão. A decisão por linha e o índice único de sucesso evitam
duplicação por dois executores; bloqueios da fonte e dos alvos cobrem concorrência
com outras revisões e edições clínicas. Revogação usa os mesmos bloqueios, dando
ordem definida à autorização e ao commit.

O futuro dry-run compara o mesmo plano em snapshot de leitura, com alvos novos
virtuais, sem reservar IDs, consumir sequências ou persistir aprovação, staging,
tentativa ou dado clínico. Não mantém locks após terminar nem substitui a releitura
transacional na aplicação. A implementação v1.4.0 continua recusando revisão,
inclusive em dry-run; esta especificação não altera seu comportamento atual.

### Aceite da extensão e das portas de ativação

Todos os cenários abaixo usam fontes, identidades e valores sintéticos. A coluna
de etapa distingue o que a migration de armazenamento precisa provar do que
continua obrigatório antes de habilitar o fluxo completo. Testes SQL de integridade
devem usar `BEGIN`/`ROLLBACK`; concorrência exige duas sessões coordenadas e limpeza
no banco descartável. Testes de constraints adiadas devem forçar sua verificação
antes do rollback, para não omitir o erro que ocorreria no commit. Nenhum caso foi
executado nesta tarefa documental.

| Caso | Cenário e resultado exigido | Etapa |
| --- | --- | --- |
| F01 | A→B com hashes diferentes entra apenas na nova linhagem; tentativa de usar a FK antiga falha; mesmo hash/layout mantém reprocessamento v1. | Armazenamento |
| F02 | Base não terminal, outra fonte, hash/layout incoerente, ciclo A→B→A ou lote sem cadeia comprovada são recusados. | Armazenamento |
| F03 | Linha de outro lote, paciente/atendimento incompatível e duas decisões efetivas conflitantes não podem produzir plano autorizado; versão sucessora válida preserva a anterior. | Armazenamento |
| F04 | Vazio, ausente, nulo e valor permanecem distintos; envelope inválido, alvo/campo fora do catálogo, operação de exclusão e plano sem campos exigidos são recusados. | Armazenamento |
| F05 | Importador/aplicação/PUBLIC não leem nem alteram novas relações/sequências; importador continua sem acesso à identidade, inclusive após os privilégios padrão da migration 17. | Armazenamento |
| F06 | Decisão sem autorização atribuível, de outra fonte/usuário, revogada ou expirada falha; tentativa de alterar decisão/campo/evento já publicado falha. | Armazenamento e aprovação futura |
| F07 | Eventos com predecessor de outro alvo, versão repetida/saltada, origem revisão sem aplicação/campo aprovado ou resolução inconsistente de alvo são recusados. | Armazenamento |
| F08 | UPDATE manual A→B→A muda o token duas vezes; decisão antiga é obsoleta. Caminhos v1, API e manutenção também geram histórico ou são bloqueados. | Captura/ativação |
| F09 | Marco de registro legado não prova cobertura desde a base; mesmo valor ou NULL não autoriza correção. Associação equivalente não produz alteração clínica. | Captura/aplicação |
| F10 | Falha depois de alterar um de vários campos reverte todos, inclusive eventos/proveniência/sucesso; diagnóstico posterior contém somente código técnico. | Aplicação |
| F11 | Dois executores da mesma decisão produzem um sucesso; retomada e versão posterior não criam outro atendimento para a mesma linha/conteúdo. | Aplicação |
| F12 | Duas revisões da mesma base, edição depois da aprovação e revogação concorrente têm ordem de bloqueio verificável; plano obsoleto não sobrescreve nada. | Aplicação, duas sessões |
| F13 | Reprocessar/promover origem antiga depois de correção não restaura valor superado; linha removida/vazia não exclui nem anula dados. | Integração v1/revisão |
| F14 | Alvo novo recebe ID uma vez, todos os campos/vínculos apontam a ele; auditoria e proveniência não podem referenciar outro paciente ou campo. | Aplicação |
| F15 | Dry-run de revisão não muda tabelas/sequências; aplicação posterior revalida. Logs/erros não contêm valores clínicos, hashes de senha ou snapshots restritos. | Aplicação |
| F16 | Aplicar a migration em banco limpo e atualizado mantém os dez testes SQL, manifesto e regressões do importador/backend, inclusive recusa v1.4.0 de revisão. Reversão não elimina evidências existentes. | Armazenamento |

## Casos de aceite sintéticos obrigatórios

Esta matriz define o aceite completo do contrato. A v1.4.0 cobre T01 e a parte
de T02 relativa à finalidade ausente/ambígua e à recusa integral de revisão, em
execução normal e dry-run. Os demais fluxos continuam futuros; as regressões de
retomada/reprocessamento do mesmo conteúdo não homologam revisão entre hashes.

| Caso | Entrada/cenário sintético | Resultado exigido |
| --- | --- | --- |
| T01 | Mesmo hash/layout já concluído | Preservar idempotência v1 e não exigir vínculo entre hashes |
| T02 | Finalidade ausente, ou revisão declarada sem base definida | Bloquear aplicação; zero escrita clínica; não assumir carga inicial por novo hash |
| T03 | Arquivo regravado/reordenado, mesmos fatos e mapeamento válido | Novo bruto, mesmos alvos; zero paciente/atendimento/dependente criado |
| T04 | Posição reutilizada, ID legado repetido ou múltiplos candidatos | Bloquear vínculo ambíguo, sem associação por aproximação |
| T05 | Correção comprovada de data/texto do mesmo atendimento | Mesmo ID; só campos autorizados alterados; antes/depois auditáveis |
| T06 | Comparecimento distinto com paciente existente e data completa | Exatamente um novo atendimento; anteriores intactos; não copiar dependentes antigos |
| T07 | Dois comparecimentos distintos comprovados na mesma data | Não fundir por paciente/data; exigir decisões distintas |
| T08 | Apenas fato consolidado mudou | Nenhum novo atendimento/BZN; reconciliar o alvo específico ou bloquear divergência |
| T09 | Último ano 2023 passa a 2025, permanece igual ou diminui | Não fabricar data nem quantidade de visitas; ano permanece bruto enquanto não mapeado |
| T10 | Célula esvaziada, coluna não coletada ou linha removida | Preservar os dados anteriores; nenhuma exclusão ou nulificação implícita |
| T11 | Edição manual divergente, `NULL` sem histórico ou alteração revertida | Não sobrescrever/preencher pela igualdade aparente; exigir revisão com histórico |
| T12 | Nome/nascimento conflitante, troca de aba ou proveniência órfã | Não criar substituto, mesclar paciente ou reverter diagnóstico |
| T13 | Linha mistura correção, fato consolidado e conflito tardio | Rollback de todas as novas escritas clínicas e nenhuma auditoria de sucesso parcial |
| T14 | Mesmo plano aplicado duas vezes, retomada ou reprocessamento de origem antiga | Efeito clínico único; não restaurar valor superado por revisão posterior |
| T15 | Duas revisões concorrentes ou mudança após dry-run/aprovação | Estado obsoleto bloqueado e reenviado à revisão, sem perda da edição confirmada |
| T16 | Ano isolado, data futura de D9 ou retorno BZN sem comparecimento informado | Não produzir atendimento/retorno/documento por inferência |
| T17 | Dry-run, falha operacional e diagnóstico de conflito | Sem persistência no dry-run; rollback atômico na falha; nenhum valor clínico em logs |
| T18 | Nova visita com exame/pendência copiado e identidade de ocorrência ausente | Bloquear a linha em vez de duplicar os destinos repetíveis |

## Sequência de implementação e pendências

Primeiro incremento concluído na v1.4.0: barreira explícita de finalidade do
arquivo e recusa do modo revisão antes de qualquer escrita, com testes unitários
e E2E sintéticos. Isso reduz o uso acidental do caminho v1 como atualização, mas
não implementa reconciliação nem prova que a declaração de carga inicial é verdadeira.

Especificação física concluída em 2026-09-25: nove relações, invariantes,
fronteiras de autorização, histórico e protocolo de aplicação definidos acima.
São proposta normativa para os próximos incrementos, ainda sem objetos aplicados.

Próximo incremento: migration incremental de armazenamento fechado e testes de
integridade/permissões F01–F07 e F16, cobrindo as partes verificáveis sem executor.
Incluir chaves compostas auxiliares e gatilhos de integridade necessários, sem
habilitar revisão, conceder autorização institucional ou instalar escrita clínica.
O catálogo nasce sem captura ativa. Não popular a extensão inferindo linhagem ou
autoria de dados antigos. Registrar reversão por nova migration que desabilite o
fluxo e preserve evidências; não prever DROP CASCADE de histórico como rollback.

Depois, implementar captura/precedência em todos os escritores dos destinos
homologados e testar F08/F09/F13. Só então implementar autenticação/autorização,
aprovação, aplicação seletiva e dry-run, comprovando F10–F15 e os casos T01–T18.
Revisões permanecem bloqueadas até esse aceite integrado; criar tabelas não
conclui a Etapa 5B. A validação documental atual não substitui testes executáveis.

Permanecem em aberto: responsável institucional pela revisão, representação anual
de D8, tipos/vínculos D6/D7 e demais contratos clínicos ainda não resolvidos em 5A.
Essas decisões não impedem implementar a barreira conservadora, mas impedem
habilitar os fluxos clínicos dependentes. A Etapa 5B não está concluída.
