# Interface de complicações — 7B-E2U.2

Data: 2026-10-31. Base `e128f43`, branch `feat/continuidade-m2-condicao`.
Recorte CON-07–11 sobre o [contrato 7B-E2B.2](../arquitetura/CONTRATO_COMPLICACOES_CHAGAS_7B_E2B_2.md).
**Implementada e validada tecnicamente em ambiente sintético.**
Aceite humano, fidelidade integral e encerramento de M3 são separados.

## Implementação

Ficha na aba Chagas e detalhe do histórico abrem a coleção do atendimento
selecionado. Lista paginada, formulário e revisão dos quatro campos, confirmação
única, nova ocorrência explícita, rascunho e recibos usam a infraestrutura clínica
existente. Tipo livre não tem enum; descrição não altera presença ou diagnóstico.

Formulário vazio envia quatro null explícitos após revisão; false e
`nao_informado` permanecem distintos. Texto vazio de novo formulário equivale a
null, conforme padrão das interfaces de condição/sorologia; espaços e quebras
de linha são literais. Leitura distingue texto vazio legado de null.
Cada confirmação grava uma ocorrência separada do núcleo do atendimento; não
há gravação em lote ou atomicidade entre os dois formulários. Tipos/conteúdos
iguais podem ter IDs diferentes. Iniciar outra ocorrência não apaga recibos.

Consulta apenas lê; o backend revalida perfil/vínculo/contexto a cada operação.
Erro/carga não mostra dados de leitura anteriores. O retorno limita-se ao mesmo
paciente/atendimento, conservando parâmetros da origem. Edição/remoção de
registros persistidos e interpretação de sintomas específicos não foram criadas.

## Ambiente e provas focadas

PostgreSQL 16 exclusivo em tmpfs, container `ambulatorio-complicacoes-20261031`,
localhost 55467, identidade `postgres|ambulatorio_ci|5432` conferida antes do
bootstrap; API 6071/web 4186. Runner criou/removeu banco e logins próprios,
aplicando 02–67. Nenhuma fixture real ou migration em base persistente.

- Quatro testes novos de componentes aprovados com transporte simulado; não
  são prova de persistência. Revisão/payload, false/null/nao_informado, descrição
  preservada, recibo repetível, bloqueio/recuperação incerta e leitura recusada.
- `tests/frontend/test_e2e.sh complicacoes-chagas.spec.ts`: **3/3 passaram**,
  zero retry/skip, 9,4 s; log `/tmp/complicacoes-ui-focado-20261031.log`,
  artefatos `/tmp/etapa6-frontend-hloHPe`.
- UI/API/PostgreSQL reais: quatro campos revistos, correção isolada, rascunho
  ao navegar, Escape/foco no descarte, dois cliques com um POST, mesmo tipo com
  UUIDs/IDs distintos, duas consultas isoladas e nenhum diagnóstico/condição
  criado por inferência. Página 20/1, consulta sem escrita e falha de leitura
  ocultando dados anteriores também passaram.
- Perda real da entrega após COMMIT: POST foi aplicado, resposta abortada,
  intenção ficou bloqueada, GET do protocolo recuperou ID e houve um POST
  clínico. Não se deduziu o resultado procurando conteúdo na coleção.
- Axe WCAG A/AA, 320/390 px, teclado e zoom CSS 200% passaram nos estados
  exercitados. Screenshot de recibos no diretório temporário; zoom CSS não
  substitui revisão humana com zoom nativo e leitores de tela.

O primeiro `frontend-check` parou na compilação por imports/variável não usados
no teste novo. Foram removidos somente esses identificadores; nenhuma
expectativa, timeout ou código funcional foi alterado por essa correção.

## Limites

Sem aceite humano deste incremento ou CI remoto nesta sessão. Sem fidelidade
integral 8V1/8V2, edição, remoção, revisão temporal, sintomas estruturados novos
ou liberação de produção. M2 mantém seu aceite oficial; não se transfere esse
aceite às extensões clínicas de M3. Logs em `/tmp` são sujeitos à limpeza.

## Regressão final sobre a árvore da entrega

`make frontend-check COMPACT=1` com `SYNTHETIC_PG_HOST=127.0.0.1`, porta 55467,
usuário `ambulatorio_ci`, API 6071/web 4186 e senha sintética recebida pelo ambiente:
**build aprovado, 256/256 testes de componentes/cliente em 27 arquivos e 76/76
E2E aprovados**, zero skips/retries/flaky. Duração navegador: 14,7 min.
Log `/tmp/ambulatorio-check-e8x02p4b/output.log`; JSON/screenshot final em
`/tmp/etapa6-frontend-uDvjb8`. Fontes congeladas durante a execução; não houve
redução de limites ou expectativas. Esta é a nova baseline desta árvore, sem
reescrever as evidências históricas 252/73. Os cenários novos passaram também
na suíte completa, junto de condição, sorologia, CSV, M2 e acompanhamentos.

Backend/SQL/importador/upgrade já aprovados em `e128f43` não foram repetidos sem
mudança dessas camadas. Documentação, consistência e diff revisados ao finalizar.

No cenário final de recuperação, a anotação do runner identifica paciente
sintético `9007199254788460`, atendimento `25`, complicação `24` e intenção
`677c7254-d8e1-4637-83e2-26e527909920`. O ID foi recuperado pelo protocolo sem
segundo POST clínico. Esses IDs não são resultados de revisão humana.
