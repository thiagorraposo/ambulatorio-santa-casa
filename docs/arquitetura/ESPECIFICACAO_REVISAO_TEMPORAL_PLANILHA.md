# Contrato Temporal de Revisão da Planilha

Atualizado em: 2026-09-22

Status: barreira de finalidade implementada na v1.4.0; aplicação de revisões pendente.

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
livres não substituem essa auditoria. Antes de habilitar escritas de revisão,
especificar a extensão mínima e implementá-la em nova migration, sem editar
migrations aplicadas ou regenerar o dump nesta tarefa documental.

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

Depois, especificar a extensão física mínima de linhagem/decisão/histórico e seu
controle de acesso; implementá-la e validar com dados sintéticos. Só então
habilitar mapeamento e aplicação seletiva, com os casos acima e regressões do v1.
A validação documental atual não substitui esses testes executáveis.

Permanecem em aberto: responsável institucional pela revisão, representação anual
de D8, tipos/vínculos D6/D7 e demais contratos clínicos ainda não resolvidos em 5A.
Essas decisões não impedem implementar a barreira conservadora, mas impedem
habilitar os fluxos clínicos dependentes. A Etapa 5B não está concluída.
