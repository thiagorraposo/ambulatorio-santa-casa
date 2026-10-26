# Contratos clínicos da Etapa 5

Atualizado em: 2026-09-28. Escolhas técnicas desta execução, subordinadas às
[respostas clínicas vigentes](../dados/DECISOES_HUMANAS_NOVA_PLANILHA.md#respostas-clínicas-originais-de-28092026)
e às [decisões humanas anteriores](../dados/DECISOES_HUMANAS_NOVA_PLANILHA.md). Este documento não
representa novas respostas clínicas da equipe nem liberação para dados reais.

## Escolhas técnicas resolvidas

- **D1:** a ficha calcula idade por nascimento na data atual do PostgreSQL e
  retorna `idade` e `dataReferenciaIdade`. Essa referência é escolha técnica
  explícita; não é uma resposta adicional da equipe nem um backfill de idade.
- **D2:** o relato é um snapshot associado ao atendimento em
  `diagnostico_chagas.data_descoberta_autorelato` (migration 28). O mesmo paciente
  pode informar relatos diferentes em consultas distintas, sem consolidação
  silenciosa. A carga inicial importa a data e registra proveniência; a promoção
  em lotes antigos ainda precisa de implementação e aceite próprio.

- **D3:** uma avaliação de rastreio familiar pertence ao paciente, com atendimento
  de registro opcional e consistente. É um snapshot explícito, preservando várias
  avaliações. `familiares_examinados` distingue verdadeiro, falso e desconhecido;
  quando verdadeiro exige ao menos um par de identificação textual do familiar e
  resultado textual da sorologia. Não exige data nem cadastro civil. Resultado
  não é diagnóstico de doença familiar. Não separar automaticamente texto legado
  ambíguo em pessoas/resultados: nesses casos a promoção fica pendente.
- **D4/D5:** cada exame trazido/solicitado deve possuir identificação inequívoca.
  Tipos específicos do catálogo identificam o exame; categorias genéricas exigem
  descrição. Solicitação não exige resultado nem data de realização. Indicadores
  agregados não autorizam criar exames não identificados.
- **D6/D7:** reutilizar `acompanhamento_cuidado`, com tipos técnicos
  `retorno_bzn_30_dias` e `retorno_bzn_final`, data efetiva e vínculo ao paciente
  pelo atendimento. O tratamento canônico único do paciente é a âncora BZN;
  sua existência deve ser conferida. Não somar dias à prescrição nem atribuir
  data de fim do medicamento ao retorno. Ocorrências são repetíveis.
- **D8:** representar o ano legado como fato informado em `evento_clinico`, tipo
  `ultimo_comparecimento_ano_informado`. É um snapshot de informação anual,
  não uma visita criada, nem uma contagem de retornos. Não fabricar dia/mês,
  preencher lacunas ou escolher automaticamente o maior ano. Revisões desse
  fato dependem da ADR-022. Visitas novas exigem data completa e decisão explícita.
- **D11/D12:** manter pendências livres por atendimento e observações clínicas
  separadas; não classificar texto automaticamente. `Localizado` permanece fora
  dos contratos estruturados, preservado na proveniência bruta.

## Consulta operacional de importações

O backend consulta `importacao_lote_consulta` e `importacao_linha_consulta`, views
sanitizadas criadas pela migration 27. Elas expõem estado, contagens e
identificadores operacionais, sem hash, JSON bruto ou mensagens de processamento.
O importador continua sendo o único escritor; a API oferece somente consulta de
lotes e linhas.
O detalhe pagina linhas por `limit`/`offset` e retorna `paginacaoLinhas`.
O upload multipart usa worker real com credenciais do importador e ambiente
restrito, sem repassar credenciais da aplicação ou segredo JWT. Eventos técnicos
de conclusão identificam o lote efetivo, inclusive no-op com outro código
solicitado; a API retorna somente a allowlist operacional da view. `codigoLote`
é o código efetivo e `codigoLoteSolicitado` preserva o código da requisição.

## Cadastro BZN

`POST /pacientes/:id/tratamento-bzn` registra explicitamente o estado canônico
único do paciente e suas reações, numa transação atribuída ao usuário. Aceita
indicadores triestado, duração cumprida, ano aproximado, data de prescrição e
textos separados. Nenhum campo implica indicação, início, data completa ou
comparecimento; ano não produz atendimento. Quando informado, o atendimento
deve pertencer ao paciente. Reações mantêm gravidade e consequência em texto
livre, sem classificação clínica automática.

O fluxo bloqueia o paciente antes de conferir unicidade. Tratamento existente
retorna 409 e não é recriado ou sobrescrito; edição do estado existente permanece
pendente de contrato HTTP. Consulta não registra tratamento, e edição precisa
de vínculo com permissão. A existência do registro canônico sustenta o fluxo de
retorno BZN já previsto, sem afirmar valores clínicos não informados.

## Edição e coleções clínicas

`PATCH /pacientes/:id` exige versão atual do paciente, inclusive quando a mudança
envolve somente endereço ou contatos. O endereço informado gera novo snapshot,
preservando os anteriores; campos omitidos do endereço mantêm o último valor.
`telefonesAdicionar` acrescenta contatos sem remover os legados e ignora números
iguais já existentes ou repetidos na requisição. Não há remoção implícita de
contatos. Todas as gravações compartilham a transação e o contexto do usuário;
versão desatualizada impede também os filhos. Esta semântica é escolha técnica.

`PATCH /pacientes/:id/atendimentos/:atendimentoId` altera data, localização,
contexto do ambulatório e observações, exigindo versão do atendimento. Não altera
implicitamente seus recursos clínicos. Consulta não pode editar; edição exige
vínculo com permissão; administração segue a política sintética configurada.
Atendimento de outro paciente retorna 404 para usuário autorizado ao paciente
da rota; versão desatualizada retorna 409; restrição SQL retorna 400 sanitizado.

As coleções de atendimentos, exames, projetos, retornos BZN e pendências usam
`limit=20&offset=0` por padrão, máximo 100 itens e offset até 100000. Retornam
arrays, mantendo o formato anterior. Ordenações possuem desempate por ID; a
paginação por offset não promete snapshot entre requisições concorrentes.
`GET /pacientes/:id/pendencias` aceita status e retorna somente `pendenciaId`,
`atendimentoId`, `descricao`, `status`, `dataIdentificacao` e `dataResolucao`. Recursos omitidos
dessas operações permanecem pendentes conforme o roadmap integral.

Extensões da Etapa 7: pendências resolvidas exigem `dataResolucao` explícita
também no POST e na criação composta do atendimento. Outros status recusam data
preenchida; omissão cria `aberta`, enquanto `null` preserva o desconhecido.
Retornos BZN e anuais exigem data efetiva não futura, validada contra
`CURRENT_DATE` na transação do servidor. Consulta de catálogos ativos e capacidade
de cadastro estão documentadas no
[recorte HTTP da Etapa 7](RECORTE_CLINICO_ETAPA_7.md#extensões-http-necessárias).

O detalhe do atendimento retorna `rastreiosFamiliares`, preservando todos os
snapshots existentes e associando resultados somente ao respectivo ID. O campo
singular `rastreioFamiliar` permanece preenchido apenas quando existe exatamente
um snapshot; com vários, é nulo e a coleção fornece as avaliações. Nenhuma
avaliação é escolhida ou consolidada implicitamente por ID/data.

## Decisões humanas incorporadas

As respostas de [respostas clínicas originais](../dados/DECISOES_HUMANAS_NOVA_PLANILHA.md#respostas-clínicas-originais-de-28092026)
são a referência autoritativa para estes campos:

- **Idade:** é calculada pelo sistema a partir da data de nascimento. A API deve
  deixar explícita a data de referência usada no cálculo; idade não é persistida
  como fato clínico independente.
- **Autorelato de Chagas:** a data representa quando o paciente descobriu que tem
  a doença e pode ser diferente da data da sorologia. A distinção semântica está
  resolvida; a migration 28 e o DTO de diagnóstico fornecem campo próprio.
- **Familiares diretos:** registra-se sim/não; quando sim, identificam-se o
  familiar e o resultado da sorologia. A data da sorologia do familiar não é
  necessária. O modelo triestado existente preserva também ausência/desconhecido.
- **Exames trazidos e solicitados:** cada exame deve ser identificado, sem
  substituir a lista por um indicador agregado.
- **Retorno de 30 dias:** é sempre retorno do tratamento com benznidazol e
  registra a data em que o paciente compareceu. O vínculo técnico existente usa
  `retorno_bzn_30_dias`.

Não há resposta humana pendente neste conjunto. Permanecem como trabalho técnico
a promoção de contratos nos lotes antigos, o executor e a ativação controlada
da revisão temporal. Upload de contrarreferência continua fora do
escopo desta entrega.

## Histórico e fonte física

Migrations novas são validadas exclusivamente em PostgreSQL descartável. O dump
`docs/evidencias/schema_atual_ambulatorio.sql` continua evidência do banco
persistente até migration 20, não das estruturas propostas nesta execução.
