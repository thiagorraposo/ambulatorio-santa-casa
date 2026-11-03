# Dashboard básico — 8B1

Contrato técnico do protótipo sintético, decisões 17 e 26 da
[fonte de produto](../dados/DECISOES_PRODUTO_M3_2026_11_02.md).
Não registra homologação institucional ou aceite humano.

## Projeção e período

`GET /v1/dashboard?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` exige sessão ativa dos
perfis Consulta, Edição ou Administração e política clínica habilitada.
Datas civis inclusivas, ordem crescente, no máximo 367 dias. O padrão é início
do mês até a data UTC corrente; campos ausentes recebem os respectivos padrões.
Datas impossíveis, horários, parâmetros extras e intervalos invertidos retornam
400. Sem sessão: 401. Serviço clínico desabilitado ou falha técnica: 503 sanitizado.

Resposta contém `periodo {inicio,fim,limites:'inclusivos',tempoLotes:
'timestamp_sem_fuso'}`, `atualizadoEm` e `indicadores {pacientes,atendimentos,
pendencias,lotes}`. Cada indicador contém `estado`, `valor`, `definicao` e
`periodoAplicado`. `estado:'disponivel'` permite valor numérico, inclusive zero;
`estado:'sem_permissao'` exige `valor:null`. Erro nunca produz contagem zero.

| Indicador | População e fonte | Período |
| --- | --- | --- |
| Pacientes autorizados | Linhas distintas de `paciente`, escopo clínico vigente aplicado antes de contar; filtros opcionais descritos abaixo, sem multiplicar pacientes por projetos | Não aplicado |
| Atendimentos realizados | Linhas persistidas de `atendimento` dos pacientes autorizados, pela `data_atendimento` efetiva; não soma pessoas, acompanhamentos planejados ou datas ausentes | Datas inclusivas |
| Pendências abertas | Linhas de `pendencia_atendimento` dos pacientes autorizados com estado atual literal `aberta` ou `em_andamento`; não interpreta texto, null, `nao_informado` ou inconsistência de importação | Não aplicado |
| Lotes concluídos | Lotes com capacidade nominal ativa **e** autorização individual de SQL58; estados `concluido` e `concluido_com_pendencias`, pela `finalizado_em` | Desde início 00:00 até o dia seguinte ao fim, exclusivo |

`atendimento` é o recurso existente de registro de consulta, separado de retorno
planejado. Não se infere comparecimento da data de cadastro/importação ou de ano
isolado. `finalizado_em` físico é timestamp sem fuso: o filtro usa seu calendário
registrado, sem converter nem atribuir fuso à informação histórica. Reenvio
idempotente reaproveita o lote; reprocessamento explícito concluído é outro lote.
A autorização individual existente exclui lotes revisados; a projeção mantém esse
recorte ordinário, sem conceder gestão temporal.

Os quatro agregados são calculados por um único statement e snapshot PostgreSQL.
Identidade revalidada e contexto auditado da transação precedem a consulta.
As regras clínicas já existentes de Administração e `todos_sinteticos` são
preservadas; novos perfis e vínculos não são criados pelo dashboard.

## Capacidade de importação

Migration incremental 78 cria `dashboard_importacao_leitor`, provisionado fora
da API por infraestrutura, com principal e instante de concessão/revogação.
Nenhum perfil recebe capacidade automaticamente. A role de aplicação não pode
ler/provisionar/alterar a tabela. Histórico não aceita exclusão, truncate,
reescrita ou restauração; nova concessão cria nova linha e apenas uma pode estar
ativa por pessoa. O helper `dashboard_pode_consultar_importacoes()` verifica
identidade ativa e contexto autenticado do principal/transação. A capacidade não
concede autorização sobre lote, execução de importação ou revisão temporal.
Endpoints de importação anteriores conservam seus contratos; este gate pertence
à nova projeção de indicadores.

Sem capacidade o indicador apresenta ausência de permissão; com capacidade e
nenhum lote autorizado/concluído no período, apresenta zero. A nova conta não
recebe essa capacidade como efeito da criação.

## Fixture verificável e limites de validação

Fixture sintética HTTP: A/B/D autorizados ao leitor L, C não autorizado; A com
consultas em 28/10,30/10,31/10,01/11/2026; B em 31/10; C em 30/10; D sem consulta.
No período 30–31/10, L deve obter pacientes=3 e atendimentos=3; em 01/11,
pacientes=3 e atendimentos=1. Pendências A aberta, B em andamento, A resolvida,
B não informado, D null e C aberta: L conta 2, sem alteração pelo período.
Consulta e Edição sem capacidade recebem lotes=null; Administração tampouco ganha
capacidade por perfil. Após concessão explícita, lotes concluídos em 30/10 e
31/10 entram, falhou/processando/data ausente e conclusão em 01/11 não entram.
Revogação da capacidade ou do vínculo deve valer na requisição seguinte.

Testes próprios: `backend/test/unit/dashboard.spec.ts`,
`backend/test/clinical/dashboard.spec.ts` e
`tests/sql/50_validar_capacidade_dashboard.sql`. O contrato não afirma execução
aprovada, integração visual ou conclusão de 8B1: as provas e seus SHAs devem ser
registrados no relatório da unidade após execução.

## Extensão de estabilização — filtros, série e CSV em 03/11/2026

O comando do responsável para a sprint final autoriza este recorte analítico
mínimo. `GET /v1/dashboard` aceita também `nome` (1–120 caracteres, busca parcial),
`pacienteId`, `sexo` (feminino/masculino/outro/nao_informado), `projetoId`
e `statusPendencia` (aberta/em_andamento/resolvida). Filtros combinados por AND
selecionam a população autorizada **antes** das contagens. Projeto exige
participação registrada verdadeira; status exige ao menos uma pendência daquele
paciente, de qualquer data. Não se infere origem, fila ou comparecimento.
Pacientes/pendências atuais conservam sua definição temporal; lotes recebem
somente período e autorização própria, sem filtros clínicos.

Ordenação: `data_desc` (padrão), `data_asc`, `nome_asc`, com desempate determinístico
por identificadores. `limit` padrão20, máximo100; `offset` padrão0, máximo100000.
Resposta acrescenta `resultados [{pacienteId,nome,atendimentoId,dataAtendimento,
pendenciasAbertas}]`, `paginacao {limit,offset,total}`, `serieAtendimentos
[{mes,total}]` e `projetos [{projetoId,nome}]`. A série mensal considera os mesmos
atendimentos do resultado; meses sem registros não são fabricados. O catálogo
mostra apenas projetos com participação em pacientes autorizados, independente
dos filtros da análise. Indicadores, série, total e página compartilham statement
e snapshot; navegação para registros revalida autorização na API de destino.

`GET /v1/dashboard/export.csv` usa os mesmos filtros e ordenação, ignora paginação
e exporta todas as linhas autorizadas até **5.000 atendimentos**. Excesso retorna
400 JSON sanitizado, sem arquivo truncado. Cabeçalho:
`paciente_id,nome,atendimento_id,data_atendimento,pendencias_abertas`.
Reutiliza `csvCell` para quoting e neutralização de fórmulas. Resposta de sucesso
`text/csv`, attachment, `Cache-Control: no-store`; erros mantêm JSON.

A nova migration incremental79 registra cada exportação concluída no ledger
`dashboard_exportacao_evento`: ator/contexto autenticados, instante, ordenação,
volume e filtros minimizados (presença de busca nominal, sem seu texto). Aplicação
não escreve diretamente no ledger, nem altera/apaga/trunca eventos. Não concede
acesso clínico ou capacidade de importação. Evidência estrutural desta extensão:
[SQL79](../../sql/79_auditoria_exportacao_dashboard.sql); dump persistente preservado.
Limites: auditoria comprova a geração no servidor, não recebimento humano; dados
podem mudar entre a visualização e a exportação, que revalida o escopo corrente.
