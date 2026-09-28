# Contratos clínicos da Etapa 5

Atualizado em: 2026-09-27. Escolhas técnicas desta execução, subordinadas às
[decisões humanas](../dados/DECISOES_HUMANAS_NOVA_PLANILHA.md). Este documento não
representa novas respostas clínicas da equipe nem liberação para dados reais.

## Escolhas técnicas resolvidas

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

## Decisões humanas ainda pendentes

D1: referência da idade. D2: titularidade da descoberta de Chagas. D9: aprovação
da representação do planejamento de retorno. D10: aceite da representação mínima
dos estados de contrarreferência. Política de autorização sintética por recurso e
concessão/revogação de revisão: pergunta enviada ao usuário. Funcionalidades
dependentes permanecem sem ativação até resposta explícita.

Upload não foi promovido ao escopo desta entrega; sua posição no roadmap permanece.

## Histórico e fonte física

Migrations novas são validadas exclusivamente em PostgreSQL descartável. O dump
`docs/evidencias/schema_atual_ambulatorio.sql` continua evidência do banco
persistente até migration 20, não das estruturas propostas nesta execução.
