# Cobertura das Colunas da Planilha pelo Núcleo Físico

Atualizado em: 2026-09-14

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

## Classificação declarada no manifesto executável v1

| Classificação | Quantidade | Percentual |
| --- | ---: | ---: |
| Coberta diretamente | 8 | 5,88% |
| Coberta com transformação | 116 | 85,29% |
| Parcialmente coberta | 11 | 8,09% |
| Não coberta | 0 | 0,00% |
| Excluída do estruturado | 1 | 0,74% |
| Total | 136 | 100,00% |

Cobertura plena declarada: **124/136 (91,18%)**. Incluindo cobertura parcial:
**135/136 (99,26%)**.

Esses números descrevem o manifesto e a homologação sintética anteriores, não o
atendimento integral das respostas incorporadas em 2026-09-14. O manifesto não foi
alterado nesta revisão. Preservação em JSONB não equivale a cobertura funcional;
a matriz abaixo é a avaliação vigente das novas decisões.

A contagem foi recalculada diretamente dos 136 rótulos físicos distintos do
manifesto. Ela corrige a divergência anterior, que informava quatro parciais
enquanto o artefato executável ainda continha dezoito. Sete foram promovidos com
destino comprovado; onze permanecem parciais. `Localizado` é exclusão deliberada,
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
significa importador ou API implementados. Não há frontend nem DTOs clínicos
dessas funcionalidades. P0 bloqueia o fluxo afetado; P1 é necessário ao MVP;
P2 é importante, não bloqueante; P3 é pós-MVP. Prioridades são propostas técnicas.

| Decisão | Situação atual | Banco | Importador | Backend | Frontend | Migration? | Prioridade |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 — idade por nascimento | Parcialmente atendida; referência temporal precisa de decisão | `paciente.data_nascimento` já basta | Idade legada continua bruta; corrigir metadado semântico e não usá-la como valor atual | Calcular com referência aprovada | Exibir idade e referência | Não | P1 |
| D2 — data de descoberta de Chagas | Não atendida | Falta data própria; `data_resultado_final` é outra informação | Novo destino/transformação após contrato | Validar e expor data sem derivar da sorologia | Campo próprio | Sim, incremental após definir titularidade | P1 |
| D3 — familiares examinados, quais e resultado | Não atendida | Histórico de doença familiar não representa rastreio; extensão mínima a definir | Preservar flag, identificação e resultado sem inventar detalhes | Contrato mínimo; não exigir data ou cadastro civil completo | Flag e detalhes dos examinados | Sim, incremental; formato ainda não decidido | P1 |
| D4 — identificar exames trazidos | Parcialmente atendida | `paciente_exame_complementar` e catálogo suportam ocorrências | Indicador agregado está bruto; categoria genérica precisa de identificação textual inequívoca | Exigir identificação quando afirmativo | Seleção/descrição do exame | Não; reutilizar modelo | P1 |
| D5 — identificar exames solicitados | Parcialmente atendida | Bloco `solicitado` já existe; resultado pode faltar | Associar solicitação ao exame, sem exigir resultado | Validar identificação, não resultado | Formulário próprio de solicitação | Não | P1 |
| D6 — data efetiva do retorno de 30 dias BZN | Parcialmente atendida | `acompanhamento_cuidado.data_realizada` reutilizável; vínculo via atendimento/paciente | Coluna apenas bruta; criar mapeamento após decidir tipo/vínculo | Registrar retorno efetivo, não somar 30 dias | Data real e contexto BZN | Não para o mínimo; FK direta ao BZN é escolha técnica opcional | P1 |
| D7 — data efetiva do retorno final BZN | Parcialmente atendida | Mesma estrutura de acompanhamento | Importar data real, sem confundir com fim do medicamento | Não impor 60 dias de duração | Retorno final distinto do fim do tratamento | Não para o mínimo | P1 |
| D8 — histórico de retornos; legado contém último ano | Parcialmente atendida; política temporal precisa de decisão | Acompanhamento é repetível; `evento_clinico.ano_evento` é opção para ano legado, ainda não adotada | Não fabricar dia/mês nem converter toda atualização em nova visita | Histórico por ocorrência; ano aproximado explicitado | Linha do tempo sem precisão falsa | Não necessariamente; decidir representação antes | P1; política temporal P0 do fluxo de atualização |
| D9 — possível retirada do desfecho | Precisa de decisão técnica e confirmação da intenção de retirada | Não existe coluna dedicada a eliminar; data prevista/texto já têm destinos possíveis | Preservar legado até aprovar mapeamento de agendamento/instrução | Separar visita realizada de orientação futura | Não definir remoção definitiva sem confirmação | Não para retirar campo inexistente; eventual extensão depende do contrato | P2; preservar informação no MVP |
| D10 — múltiplas contrarreferências e upload | Parcialmente atendida; representação e momento do upload precisam de decisão | Acompanhamento/encaminhamento permitem repetição; documento não tem representação canônica definida | Indicador legado bruto; não criar documentos/eventos inexistentes | Registrar múltiplos episódios; anexos são fluxo futuro próprio | Histórico; upload somente após contrato | Não pela multiplicidade isolada; possível para documento/metadados de anexos | P1 registro; P2 upload proposto, a confirmar |
| D11 — pendências textuais, sobretudo notificação/BZN | Parcialmente atendida | `pendencia_atendimento.descricao` e cardinalidade múltipla já atendem | Coluna mista está bruta; mapear sem classificar automaticamente todo texto legado | Operações de pendência textual | Texto livre; não substituir observação clínica geral | Não | P1 |
| D12 — excluir funcionalmente `Localizado` | Já atendida quanto à exclusão estruturada; não aplicável às telas ainda inexistentes | Não criar campo nem remover localização do prontuário | Já excluído; razão textual no gerador está desatualizada | Não incluir nos novos contratos | Não incluir nas novas telas | Não | P2 alinhamento documental/metadados |

## Impactos transversais e conflitos executáveis

- **Banco/modelagem:** somente D2/D3 justificam lacunas estruturais certas; formato
  mínimo ainda depende de contrato. D6–D11 exigem avaliar estruturas já disponíveis,
  não criar automaticamente uma tabela por pergunta. Todas as mudanças futuras
  devem ser incrementais; as quatro migrations mínimas antigas estão concluídas.
- **Importador:** o manifesto ainda declara onze parciais, enquanto gerador,
  validador e teste fixam contagens/allowlists antigas. A detecção de tipo por
  transformação classifica idade como data e deixa retornos/ano como texto. A
  promoção deve atualizar esses artefatos conjuntamente, não apenas a documentação.
- **Integridade:** `treatment()` tenta inserir novo BZN sem reconciliar o existente;
  `reuse_predecessor()` reutiliza também linhas com pendência antes dos handlers;
  `RowConflict` rejeita toda a linha para erros que o contrato admite tratar como
  não críticos. Esses achados e seus limites estão no
  [estado do importador](../IMPORTADOR_SINTETICO_V1.md).
- **Backend/frontend:** os campos não estão “errados” em DTOs ou telas clínicas
  existentes: eles ainda não existem. Implementar apenas os contratos aprovados,
  com autorização por operação/recurso e transações de escrita compostas.

## Testes necessários

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
- D10/D11/D12: contrarreferências múltiplas, estados desconhecidos, pendência livre,
  observação clínica preservada e ausência funcional de `Localizado` com bruto intacto.
- Transversais: BZN repetido compatível/conflitante, reprocessamento que resolve
  pendência, proveniência, atomicidade e acesso negado por operação/recurso.

Não alterar os testes SQL históricos apenas por conterem o modelo anterior: o
teste de encaminhamento que evita colunas específicas de contrarreferência só
precisa evoluir se o desenho aprovado efetivamente mudar essa estrutura. Acrescentar
regressões sintéticas às garantias existentes; nunca usar dados clínicos reais.

## Documentação e evidências

As referências vigentes afetadas são as decisões humanas, este mapa, o estado
atual, o roadmap, a especificação/implementação do importador, o manifesto físico,
as especificações de BZN/encaminhamento e os limites do backend/segurança. Os
relatórios de homologação, ADRs históricos, migrations e dump preservam o estado
em que foram produzidos. Dicionários e planos antigos em `planejamento/` não
sobrepõem código, schema nem respostas confirmadas da equipe.

O número “não coberta = 0” no manifesto antigo significa sua classificação de
rótulos com preservação possível, não ausência de lacunas funcionais. As onze
parciais não podem mais ser relegadas em bloco ao pós-MVP. A ordem vigente é o
[roadmap](../PROXIMOS_PASSOS.md), sem recalcular cobertura antes da implementação.
