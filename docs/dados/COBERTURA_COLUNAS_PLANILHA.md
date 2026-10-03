# Cobertura das Colunas da Planilha pelo Núcleo Físico

Atualizado em: 2026-10-03

## Fonte e critério

A cobertura usa os 136 rótulos distintos das duas abas clínicas e as 37 tabelas
clínicas/de proveniência do schema físico. A 38ª tabela,
`usuario_aplicacao`, trata identidade funcional e não é destino da planilha. As
decisões humanas consolidadas em
`docs/dados/DECISOES_HUMANAS_NOVA_PLANILHA.md` resolvem semânticas, mas não contam como
cobertura física quando a cardinalidade ou obrigatoriedade do banco é incompatível.
O detalhamento por posição, aba e destino está no manifesto oficial
`manifestos/planilha_ambulatorio_v1.json`.

- **Direta:** destino semanticamente equivalente sem decomposição.
- **Com transformação:** destino atual preserva toda a informação após conversão,
  lookup ou transformação coluna-linha.
- **Parcial:** há destino aproximado, mas a estrutura atual viola uma cardinalidade,
  obrigatoriedade ou detalhe confirmado.
- **Não coberta:** não existe destino para a informação normalizada exigida.
- **Dúvida:** a semântica ainda não foi confirmada.

## Classificação declarada no manifesto executável v1.4

| Classificação | Quantidade | Percentual |
| --- | ---: | ---: |
| Coberta diretamente | 8 | 5,88% |
| Coberta com transformação | 118 | 86,76% |
| Parcialmente coberta | 9 | 6,62% |
| Não coberta | 0 | 0,00% |
| Excluída do estruturado | 1 | 0,74% |
| Total | 136 | 100,00% |

Cobertura plena declarada: **126/136 (92,65%)**. Incluindo cobertura parcial:
**135/136 (99,26%)**.

Esses números descrevem o manifesto e a homologação sintética por rótulo, não o
atendimento integral das respostas incorporadas em 2026-09-14. D11 foi promovida
na v1.2.0 do importador; D8 pode estruturar seletivamente um ano inequívoco mesmo
classificado como `parcial`. Preservação em JSONB não equivale a cobertura funcional,
e a matriz abaixo continua sendo a avaliação vigente das novas decisões.

A contagem foi recalculada diretamente dos 136 rótulos físicos distintos do
manifesto. Ela corrige a divergência anterior, que informava quatro parciais
enquanto o artefato executável ainda continha dezoito. Oito foram promovidos com
destino comprovado; a migration 28 acrescenta descoberta do paciente e nove permanecem parciais. `Localizado` é exclusão deliberada,
não dúvida a ser inferida pelo importador.

## Alterações de classificação após confirmação humana

Passaram de dúvida para cobertura com transformação:

- `Responsável pela digitação`, com preservação como texto legado;
- `Caso não, justifique`, no bloco de notificação;
- `observação`, como texto livre genérico do atendimento;
- variantes BenBrasil/EPOCA, preservando o indicador de falha;
- identificação dos nove tipos repetidos pelo bloco, posição e ocorrência.

Passaram de parcial para cobertura com transformação:

- `Se não, descreva o motivo`, confirmado como motivo da não indicação de BZN;
- `ECG` e `ECG solicitado`, consolidados na ocorrência de eletrocardiograma;
- glicemia, HDL, LDL, triglicerídeos e data do colesterol, consolidados na
  ocorrência laboratorial do atendimento.

Continua excluído:

- `Localizado`: significa localização física do prontuário e foi dispensado do
  funcional (D12). A exclusão estruturada já existe; preservar o bruto não implica
  exibir o campo nem excluir `localizacao_prontuario`, que tem outra finalidade.

## Impacto da associação paciente–projeto

Os 15 cabeçalhos de participação, pendência e falha dos projetos passaram de
cobertura parcial para cobertura com transformação. A tabela
`paciente_projeto_estudo` representa o vínculo consolidado por paciente, preserva
os valores originais e registra falhas em BenBrasil e EPOCA sem criar projetos
adicionais.

## Impacto dos exames por paciente

Os tipos repetidos usam `paciente_exame_complementar`. ECG, resultado e data são
consolidados em `atendimento_exame_complementar` do tipo
`eletrocardiograma`. Glicemia, HDL, LDL e triglicerídeos usam
`exame_complementar_resultado`, e a data de colesterol usa a ocorrência
laboratorial do atendimento. Os indicadores agregados dos dois blocos continuam
parciais porque não identificam uma ocorrência exigida pelo modelo canônico.

## Impacto do tratamento com benzonidazol

Os cabeçalhos `teve reação adversa?`, `tratamento pelo ambulatorio?`, `Em qual
ano tomou a medicação (Benzonidazol)?`, `Prescrição do BZN (data)` e `Por quanto
tempo foi usado?` passaram para cobertura com transformação. As tabelas
`tratamento_benzonidazol` e `reacao_adversa_benzonidazol` fornecem cardinalidade
por paciente, atendimento opcional, duração em dias, ano aproximado, prescrição,
indicadores triestados, motivos separados e reações repetíveis.

## Impacto do encaminhamento ampliado

`Trouxe encaminhamento` e `Encaminhado a qual projeto?` passaram de cobertura
parcial para cobertura com transformação. `encaminhamento` agora preserva o
booleano triestado, o projeto oficial opcional e os dois valores originais, sem
criar projetos ou duplicar o vínculo com paciente.

## Matriz de impacto das respostas D1–D12

Fonte de negócio: [decisões humanas](DECISOES_HUMANAS_NOVA_PLANILHA.md). As
classificações avaliam o sistema completo: um destino físico disponível não
significa importador ou API implementados. Não há frontend; a API já possui DTOs de entrada para diagnóstico, exames e rastreio familiar. P0 bloqueia o fluxo afetado; P1 é necessário ao MVP;
P2 é importante, não bloqueante; P3 é pós-MVP. Prioridades são propostas técnicas.

| Decisão | Situação atual | Banco | Importador | Backend | Frontend | Migration? | Prioridade |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 — idade por nascimento | Semântica incorporada; data de referência da consulta deve ficar explícita | `paciente.data_nascimento` já basta | Idade legada permanece bruta e não é usada como valor atual | Calcular com referência explícita | Exibir idade e referência | Não | P1 |
| D2 — data de descoberta de Chagas | Contrato clínico confirmado; migrations 28/61 | `diagnostico_chagas.data_descoberta_autorelato`, distinta da sorologia | Carga inicial; promoção segura com proveniência e NULL capturado desde a base, sem edição posterior; legado desconhecido preservado | Campo na criação/consulta do atendimento | Campo próprio e captura prospectiva | Sim, migrations 28/61 | P1 |
| D3 — familiares examinados, quais e resultado | Contrato/migration 25 implementados; negativa legada seletiva em teste | Rastreio triestado e resultados repetíveis | Negativa inequívoca pode criar `familiares_examinados = false`; afirmativa sem parente/resultado e texto ambíguo ficam brutos | DTO de rastreio familiar | Flag e detalhes dos examinados | Sim, migration 25 | P1 |
| D4 — identificar exames trazidos | Parcialmente atendida | `paciente_exame_complementar` e catálogo suportam ocorrências | Indicador agregado está bruto; categoria genérica precisa de identificação textual inequívoca | Exigir identificação quando afirmativo | Seleção/descrição do exame | Não; reutilizar modelo | P1 |
| D5 — identificar exames solicitados | Parcialmente atendida | Bloco `solicitado` já existe; resultado pode faltar | Associar solicitação ao exame, sem exigir resultado | Validar identificação, não resultado | Formulário próprio de solicitação | Não | P1 |
| D6 — data efetiva do retorno de 30 dias BZN | Mapeamento seletivo implementado e validado | `acompanhamento_cuidado.data_realizada`, tipo `retorno_bzn_30_dias`, vínculo via atendimento/paciente e tratamento canônico conferido | Data válida cria ocorrência com proveniência; valores sem data permanecem no bruto | Registra data efetiva, sem somar 30 dias | Data real e contexto BZN | Não para o mínimo; estrutura existente reutilizada | P1 |
| D7 — data efetiva do retorno final BZN | Mapeamento seletivo implementado e validado | Mesma estrutura de acompanhamento | Data efetiva permanece distinta do fim do medicamento e não duplica reprocessamentos | Não impor 60 dias de duração | Retorno final distinto do fim do tratamento | Não para o mínimo | P1 |
| D8 — histórico de retornos; legado contém último ano | Ano inequívoco validado em E2E com manifesto v1.4; revisão operacional segue bloqueada | `evento_clinico.ano_evento` com tipo `ultimo_comparecimento_ano_informado` e original; migration 52 captura novos fatos, sem conferir cobertura retroativa | Handler seletivo preserva texto ambíguo no bruto e usa proveniência; E2E cobriu no-op, reprocessamento e fonte superada | Ocorrência anual com precisão explícita; revisão entre hashes ainda privada | Linha do tempo sem precisão falsa | Não para representar o ano; auditoria temporal possui extensão própria | P1; implementação temporal P0 do fluxo de atualização |
| D9 — possível retirada do desfecho | Fora das seis respostas; legado preservado sem inferência | Não existe coluna dedicada a eliminar; dados existentes permanecem | Preservar legado até contrato técnico de destino | Separar visita realizada de orientação futura | Não remover informação sem contrato | Não | P2; preservar informação no MVP |
| D10 — múltiplas contrarreferências e upload | Registro múltiplo HTTP implementado; upload segue backlog técnico | Acompanhamento/encaminhamento permitem repetição; documento não tem representação canônica | Indicador legado bruto; não criar documentos/eventos inexistentes | Cria e lista episódios distintos ligados ao encaminhamento do paciente | Histórico; upload é fluxo futuro | Não pela multiplicidade isolada | P1 registro; P2 upload |
| D11 — pendências textuais, sobretudo notificação/BZN | Importador e operações HTTP sintéticas implementados | `pendencia_atendimento.descricao` e cardinalidade múltipla atendem | Cria ou associa pendência textual por proveniência, sem classificar automaticamente o texto legado | Criação, consulta paginada e atualização de status/resolução por vínculo implementadas | Texto livre; não substituir observação clínica geral | Não | P1 |
| D12 — excluir funcionalmente `Localizado` | Já atendida quanto à exclusão estruturada; não aplicável às telas ainda inexistentes | Não criar campo nem remover localização do prontuário | Já excluído; razão textual no gerador está desatualizada | Não incluir nos novos contratos | Não incluir nas novas telas | Não | P2 alinhamento documental/metadados |

## Impactos transversais e conflitos executáveis

- **Banco/modelagem:** D2 e D3 agora têm extensões físicas incrementais; D6–D11
  exigem avaliar estruturas já disponíveis,
  não criar automaticamente uma tabela por pergunta. Todas as mudanças futuras
  devem ser incrementais; as quatro migrations mínimas antigas estão concluídas.
- **Importador:** o manifesto v1.4 declara nove parciais; gerador, validador e
  testes fixam conjuntamente as contagens e allowlists. A detecção de tipo por
  transformação ainda classifica idade como data e mantém D3/D8 como texto
  parcial. Handlers convertem seletivamente datas BZN, ano e negativa familiar
  inequívocos; o manifesto v1.4 mantém valores ambíguos fora da estrutura clínica.
- **Integridade:** a v1.1.1 corrige a reconciliação BZN com regressões sintéticas;
  a v1.2.0 implementa registro explícito de promoção, âncoras da proveniência,
  handlers seletivos e rollback das novas escritas para D11. A v1.3.0 mantém
  `RowConflict` crítico por padrão e permite somente catálogo de projeto ausente
  como pendência não crítica, com nova tentativa seletiva. Outros handlers ainda
  exigem classificação individual. Esses limites estão no
  [estado do importador](../IMPORTADOR_SINTETICO_V1.md).
- **Temporalidade:** o [contrato complementar](../arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md)
  define revisão entre hashes e seus casos de aceite. A CLI mantém a barreira de
  finalidade e recusa revisões, inclusive em dry-run. O fluxo HTTP separado tem
  linhagem, decisão seletiva, dry-run, captura e aplicação; o aceite integrado
  F01–F16/T01–T18 foi aprovado. Migrations 61–63 completam promoção D2 segura,
  simulação de criação com coluna ausente e permissões operacionais dedicadas.
  Execução exige opt-in sintético fora de produção e permanece desligada por padrão.
  Isso não altera cobertura de colunas nem justifica tabelas clínicas por retorno.
- **Backend/frontend:** DTOs de entrada/saída e fluxos clínicos do roadmap estão
  concluídos e validados por HTTP, com autorização por recurso, paginação e
  transações compostas. Não há frontend. A cobertura sintética e seus limites
  constam da [matriz de aceite](../validacoes/ACEITE_INTEGRADO_ETAPA_5.md).

## Critérios clínicos e evidências

Os critérios abaixo foram implementados e validados no escopo sintético da
Etapa 5. A matriz de aceite associa provas SQL, importador real e HTTP; não
confunde classificação semântica do manifesto com implementação de cada fluxo.

- D1: aniversário, nascimento ausente e referência aprovada; idade legada divergente
  não sobrepõe nascimento.
- D2/D3: data de descoberta diferente da sorologia; familiares não examinados,
  informação ausente e múltiplos examinados com resultados; não inferir doença.
- D4/D5: positivo sem identificação, exame genérico identificado, exames repetidos
  e solicitação válida sem resultado.
- D6/D7: datas reais positivas e ausentes; os valores legados `sim` das fixtures
  não comprovam cobertura de datas; nenhum cálculo automático de 30/60 dias.
- D8/D9: ano sem dia/mês, várias visitas, planilha atualizada sem nova visita e
  orientação futura não transformada em retorno realizado; preservar histórico.
  A matriz T01–T18 do contrato temporal detalha revisão, precedência, concorrência
  e auditoria. A matriz temporal integral foi aprovada, incluindo precisão anual,
  precedência dos escritores, dry-run, staging, rollback e concorrência.
- D10/D11/D12: contrarreferências múltiplas, estados desconhecidos, pendência livre,
  observação clínica preservada e ausência funcional de `Localizado` com bruto intacto.
- Transversais: BZN repetido compatível/conflitante, preenchimento de nulos e
  atomicidade foram cobertos na v1.1.1; promoção de D11, conflito manual, dry-run e
  dois elos foram cobertos na v1.2.0; catálogo de projeto ausente, correção e nova
  tentativa seletiva foram cobertos na v1.3.0. As promoções aprovadas restantes
  e acessos negados por operação/recurso têm provas na suíte final; NULL legado
  sem cobertura e valores ambíguos continuam preservados, não promovidos por suposição.

Não alterar os testes SQL históricos apenas por conterem o modelo anterior: o
teste de encaminhamento que evita colunas específicas de contrarreferência só
precisa evoluir se o desenho aprovado efetivamente mudar essa estrutura. Acrescentar
regressões sintéticas às garantias existentes; nunca usar dados clínicos reais.

## Documentação e evidências

### Impacto da decisão de governança da 5A

Em 2026-10-03, por delegação expressa do responsável, foi decidido que gestão
de fonte e de autorizações temporais exige entitlement nominal separado do
perfil funcional, provisionado fora da API. Isso não altera a classificação
semântica ou física das 136 colunas da planilha e não concede autorização clínica
por fonte. O impacto está na fronteira de segurança da ADR-022: migration 55 e
rotas específicas aplicam a regra. O aceite integrado F01–F16/T01–T18 foi
concluído; a ativação operacional sintética validada não concede autorização
por fonte automaticamente nem designa pessoas em produção.

As referências vigentes afetadas são as decisões humanas, este mapa, o estado
atual, o roadmap, a especificação/implementação do importador, o manifesto físico,
as especificações de BZN/encaminhamento e os limites do backend/segurança. Os
relatórios de homologação, ADRs históricos, migrations e dump preservam o estado
em que foram produzidos. Dicionários e planos antigos em `planejamento/` não
sobrepõem código, schema nem respostas confirmadas da equipe.

O número “não coberta = 0” no manifesto significa sua classificação de
rótulos com preservação possível, não ausência de lacunas funcionais. As onze
parciais originais não podem mais ser relegadas em bloco ao pós-MVP; nove continuam
nessa classificação após D11 e a carga inicial de D2. Esses totais não comprovam
promoção histórica. D2 agora exige a prova restrita de captura/proveniência da
migration 61; NULL legado sem prova permanece bloqueado. A ordem vigente é o
[roadmap](../PROXIMOS_PASSOS.md), sem recalcular cobertura antes da implementação.
