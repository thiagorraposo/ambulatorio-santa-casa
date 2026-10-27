# Validação de 7B-E1B — episódios individuais de sorologia

Data: 2026-10-27. Implementação e validação técnica sintética do recorte de
episódios; sem aceite humano nem interface 7B-E1U. O
[contrato](../arquitetura/CONTRATO_SOROLOGIAS_7B_E1B.md) define campos e limites.
Resultados remotos: [CI da branch](https://github.com/thiagorraposo/ambulatorio-santa-casa/actions?query=branch%3Afeat%2Fsorologias-episodios).

## Evidências locais

- Build e 142 testes unitários de backend passaram em 19 arquivos
  (`/tmp/ambulatorio-check-ym1dalp8/output.log`); 47 testes focados anteriores
  cobriram serviço/DTO/allowlist/recibo.
- Instalação limpa 00–65 e 36 scripts SQL, incluindo SQL37, passaram
  (`/tmp/ambulatorio-check-fp3lqk_2/output.log`). Provam sete eventos por episódio,
  autoria, proveniência, datas independentes, métodos repetidos, null distinto
  de não informado, rollback, privilégios mínimos e revisão temporal fechada.
- `make db-sorologia-upgrade-test COMPACT=1` passou
  (`/tmp/ambulatorio-check-5smv17xa/output.log`). Cria banco novo com 02–64,
  insere uma sorologia legada, aplica 65 e compara a linha completa e zero eventos
  retroativos; alteração posterior inicia marco atual sem inventar passado.
  O alvo também integra o job Database do workflow.
- Seis novos testes HTTP passaram
  (`/tmp/ambulatorio-check-10flclrj/output.log`). Cobrem dois episódios/paginação,
  preservação da descoberta/resultado final, âncora null concorrente, autorização,
  dados inválidos, falha SQL com rollback da âncora/recibo e recuperação sem replay.
- A suíte clínica completa passou 76 testes em 13 arquivos
  (`/tmp/ambulatorio-check-f5o8cibk/output.log`), sem ignorar as regressões existentes.
- `make importer-test COMPACT=1` passou
  (`/tmp/ambulatorio-check-lxko3yna/output.log`), incluindo escritores Python reais,
  promoção, proveniência, rollback e concorrência D2/D8 com captura ativa.
- `make docs-check repository-check workflow-test COMPACT=1`, `git diff --check`
  e actionlint 1.7.12 passaram. O binário actionlint teve o checksum fixado no
  workflow verificado antes da execução. Revisão cruzada de backend e SQL não
  encontrou bloqueios; as revisões foram somente de leitura.

## Ambiente e ocorrências

Todos os testes de escrita usaram o container novo
`ambulatorio-sorologias-e1b-postgres-1`, PostgreSQL 16.15 com armazenamento tmpfs,
publicado em `127.0.0.1:55457`. Antes do bootstrap, a conexão foi confirmada como
`ambulatorio_santa_casa|ambulatorio_ci|5432`. HTTP e upgrade criam/removem seus
bancos aleatórios próprios; SQL37 usa BEGIN/ROLLBACK. Somente dados sintéticos.
Nenhuma migration foi aplicada à base persistente e seu dump não foi atualizado.

A primeira tentativa de executar diretamente o runner HTTP foi recusada por
permissão do arquivo; o alvo usa Bash. Depois, o teste novo precisou corrigir o
tipo TypeScript do helper de envio (`unknown` não é aceito pelo Supertest).
Quatro cenários funcionais passaram, mas os dois de correlação usavam URLs sem
`/v1`, incompatíveis com o caminho canônico registrado. Corrigidas as URLs dos
testes, passaram seis de seis; o protocolo de produção não foi flexibilizado.

## Continuidade

Próxima unidade: 7B-E1U, integrando formulário/revisão/lista por episódio e
recuperação ao atendimento/ficha. Solicitação geral e correções persistidas
continuam pendentes de suas unidades/contratos; não se declara o pacote clínico
completo nem aceite de M3. P-03 de projeto/notificação/pendências permanece aberto.
