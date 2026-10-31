# Complicações por atendimento — proposta 7B-E2B.2

Preparado em: 2026-10-31, branch `feat/continuidade-m2-condicao`, base `dd82150`.
**Estado: contrato técnico proposto para revisão; API, migration e interface não
implementadas por esta entrega.** A preparação não aprova o DTO/semântica nem
concede aceite clínico. Não altera o contrato publicado 7B-E2B.1.

## Fontes e limites do recorte

RQ-CON-07–10 correspondem a tipo, presença, descrição e gravidade. A
[SQL06](../../sql/06_tabelas_condicoes_comorbidades.sql) e a
[evidência física](../evidencias/schema_atual_ambulatorio.sql) já possuem
`complicacao_chagas`, com FK direta obrigatória para `atendimento`. Não há FK
para condição/diagnóstico nem unicidade de tipo ou conteúdo. Reutilizar essa
tabela e seus índices; não criar tabela, FK obrigatória para condição ou domínio
clínico novo para publicar este recorte.

D1–D12 não acrescentam uma resposta clínica específica para esses quatro
campos. A multiplicidade é requisito do [catálogo](../frontend/ENTREGAS_DO_PRODUTO.md#7b-e2b)
e da [matriz CON](../frontend/MATRIZ_FIGMA_FRONTEND.md#con--condição-clínica-e-complicações).
As escolhas de nomes HTTP, paginação, limites de texto e protocolo abaixo são
propostas técnicas, não novas respostas da equipe clínica.

O importador já pode produzir registros `geral`, `cardiaca`, `digestiva` e
`outra` em `Importer.chagas_condition`. Esses valores são convenções de origem,
não catálogo fechado para o novo formulário. Não reclassificar nem interpretar
registros existentes, converter descrições em presença ou deduzir condição,
diagnóstico, descoberta ou sintomas específicos.

## Recurso HTTP proposto

Prefixo `/v1`, JWT e política clínica existentes. `:id` identifica paciente;
`:atendimentoId` identifica o atendimento autorizado desse paciente.

| Método/caminho | Resposta prevista |
| --- | --- |
| `GET /pacientes/:id/atendimentos/:atendimentoId/complicacoes-chagas?limit=20&offset=0` | 200, array de registros desta página; `[]` quando vazia. |
| `POST /pacientes/:id/atendimentos/:atendimentoId/complicacoes-chagas` | 201, `{ complicacaoChagasId: string }`. Um registro por intenção. |

Cada registro de leitura contém `complicacaoChagasId`, `atendimentoId` e os
quatro campos abaixo. IDs são strings decimais, sem conversão para Number.
Não publicar `valor_original_*`, conteúdo bruto, autoria interna ou dados de
outras consultas. Nenhuma linha é criada por GET.

Usar `PageQuery`: limit padrão 20, entre 1 e 100; offset padrão 0, entre 0 e
100000. Ordenar por `complicacao_chagas_id DESC`, ordem de registro, não data ou
gravidade clínica. Cada coleção tem paginação própria. Não prometer total ou
snapshot estável entre páginas durante inserções concorrentes; página vazia não
comprova inexistência global nem não aplicação de uma operação.

## DTO proposto e semântica preservada

| RQ | Propriedade JSON | Persistência e validação proposta |
| --- | --- | --- |
| CON-07 | `tipoComplicacao` | `tipo_complicacao`: texto livre até 80 caracteres ou null. Sem enum/sugestão classificatória obrigatória. |
| CON-08 | `possuiComplicacao` | `possui_complicacao`: booleano ou null. Sem conversão de string/número para booleano. |
| CON-09 | `descricao` | `descricao`: texto até 10000 caracteres ou null, limite técnico coerente com as APIs clínicas existentes. |
| CON-10 | `gravidade` | `gravidade`: `leve`, `moderada`, `grave`, `nao_informado` ou null; somente domínio já existente na SQL06. |

Todos opcionais e anuláveis. Recusar corpo vazio e propriedades desconhecidas;
ao menos uma propriedade explícita é exigida, inclusive null. Texto vazio e
espaços são literais e não são normalizados pela API, como no contrato de
condição. Omissão/null não vira false ou `nao_informado`.

Ausência de registro, registro com presença desconhecida e presença false são
estados distintos. False/null não apagam tipo, descrição ou gravidade. Não
inferir presença a partir de uma descrição nem exigir gravidade por presença.
Não interpretar descrição ou tipo livre como diagnóstico/condição confirmados.

Exemplo exclusivamente sintético de corpo válido proposto:

```json
{
  "tipoComplicacao": "Tipo livre sintético",
  "possuiComplicacao": false,
  "descricao": "Relato sintético preservado independentemente da presença",
  "gravidade": null
}
```

Dois POST intencionais, com UUIDs distintas, podem registrar conteúdo/tipo
iguais e devem retornar IDs distintos. Não fazer upsert, deduplicação clínica,
substituição do registro anterior ou consolidar visitas.

## Autorização, transação e falhas

Reutilizar `ClinicalAccessService.patient` e a política vigente. Consulta só
lê; edição/administração escrevem somente quando autorizadas pelo servidor.
Autorizar o paciente antes de verificar o atendimento; conferir na mesma
transação que pertence ao paciente da rota. Não exigir diagnóstico positivo ou
registro prévio de condição; não criar âncora técnica desnecessária.

Para criação, adotar lock do atendimento e transação do padrão 7B-E2B.1; para
leitura, o padrão de lock compartilhado existente. Inserção, autoria, eventos
de auditoria e recibo devem ter o mesmo COMMIT. Falha reverte essa operação,
sem afetar outras ocorrências já confirmadas. Não acrescentar complicações ao
POST composto de atendimento nesta unidade: gravações são separadas.

Erros previstos: 401 sem sessão, 403 sem capacidade/vínculo, 404 para atendimento
inexistente ou de outro paciente após autorização do paciente; 400 para IDs,
paginação, DTO ou valores incompatíveis. Política desabilitada segue o erro
vigente do serviço. Não expor SQL, nomes internos de constraints, bruto ou
existência de pacientes não autorizados. Não criar 409 de unicidade clínica,
pois múltiplos registros são permitidos; conflitos do protocolo são separados.

## Auditoria, permissões e recuperação — trabalho necessário

Antes de habilitar o POST, criar nova migration incremental após a 66, com
numeração conferida na implementação. Não editar migrations aplicadas nem
atualizar o dump persistente. Escopo mínimo:

- Captura prospectiva dos quatro campos usando a infraestrutura vigente de
  auditoria e a PK `complicacao_chagas_id`; nenhuma alteração/backfill do legado.
- Preservar autoria de aplicação e proveniência de importação, owner/ACL e
  configurações das funções atuais. Não copiar definições antigas que apaguem
  patches de auditoria/revisão temporal posteriores.
- Conceder somente SELECT/INSERT e uso da sequência necessários à aplicação;
  não conceder UPDATE/DELETE ou novas permissões à revisão temporal.
- Como o catálogo de auditoria é compartilhado, bloquear explicitamente alvos
  `complicacao_chagas` em `importacao_revisao_campo` antes de registrar os campos.
  Manter os guards existentes de sorologia/condição e as proteções de TRUNCATE.

Integrar a rota ao [protocolo de operações](RECUPERACAO_OPERACOES_ETAPA_7.md):
registrar UUID/método/caminho canônico/hash antes do POST, usar `X-Operacao-Id` e
confirmar recibo `{ complicacaoChagasId }` atomicamente com a inserção. UUID
confirmada não reaplica; responder 409 conforme protocolo. Resposta perdida
exige consulta autorizada da intenção, nunca busca por conteúdo ou POST
repetido. Falha comprovada registra não aplicação; estado incerto bloqueia
reenvio. Não prometer recuperação/idempotência geral entre sessões.

## Critérios de revisão e implementação posterior

A revisão deve confirmar explicitamente as escolhas técnicas propostas: nomes
da rota/propriedades, limite 10000 de descrição, corpo com null explícito,
ordenação/paginação e unidade de gravação. Não há proposta de novo enum de tipo,
escala de gravidade ou regra de inferência clínica.

Depois da aprovação de DTO/semântica exigida no catálogo, implementar somente
GET/POST e captura/recuperação deste recorte. Critérios de conclusão técnica:

1. Duas ocorrências de mesmo tipo/conteúdo, duas consultas e dois pacientes:
   IDs distintos, vinculação correta e ausência de mistura no histórico.
2. Ausência `[]`, null, false, `nao_informado`, texto vazio/espaços e limites
   preservados; inválidos/propriedades extras recusados sem escrita.
3. Três perfis, vínculo ausente/revogado, IDs fora da faixa e atendimento de
   outro paciente exercitados com API/PostgreSQL sintéticos reais.
4. Paginação 20/1, ordenação por ID e ausência de informação bruta verificadas.
5. Duas intenções concorrentes criam dois registros; mesma UUID não reaplica.
   Resposta perdida recupera o ID correto, sem segundo POST clínico.
6. Falha transacional desfaz registro/auditoria/recibo confirmado; guard temporal,
   autoria, proveniência e proteção de TRUNCATE comprovados por SQL/HTTP.
7. Upgrade da migration sem backfill e instalação limpa aprovados em banco
   descartável; legado/importador e guards anteriores preservados.

A validação futura deve combinar SQL/upgrade, backend clínico e importador pelo
[workflow proporcional](../WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional).
Isso é plano de prova, não resultado executado nesta entrega documental.

CON-11 e interface de complicações são incremento 7B-E2U posterior, com lista,
formulário, revisão, erro, rascunho e recibo; não oferecer campo sem destino HTTP
publicado. Edição/remoção, gravação em lote, nova FK, revisão temporal, sintomas
específicos, M3/8V2 e liberação institucional permanecem fora deste recorte.
