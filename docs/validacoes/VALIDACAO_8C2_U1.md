# 8C2U.1 — seleção e simulação mínima de XLSX

Data: 2026-10-27. Implementação e provas locais sintéticas; CI remoto e aceite
humano pendentes. Unidade independente de M3 baseada no H14 existente, sem nova
decisão clínica, confirmação da importação ou relatório ampliado.

## Comportamento e contrato

Edição/administração selecionam arquivo real XLSX de até 10 MiB, finalidade
`carga_inicial`/`mesmo_conteudo` e código. O POST multipart fixa `dryRun=true`.
Revisão entre hashes continua no processo próprio. O resultado mínimo distingue
código solicitado e lote efetivo já existente; não inventa contagens/progresso.
Consulta não recebe o formulário. Cancelar/trocar/saída/identidade invalidam
respostas tardias; duplo submit é bloqueado sincronamente. File vive em memória.

O cliente preserva autenticação/cancelamento/JSON ao aceitar FormData; o browser
define o boundary. O runner usa login próprio do worker e credencial aleatória
somente no banco descartável, removidos ao terminar. Revisão temporal permanece
desabilitada e a configuração de produção não foi alterada.

## Validações executadas

- Build TypeScript/Vite aprovado; 23 arquivos/218 testes unitários passaram.
  Há testes de arquivo/limite, perfil, código, cancelamento/troca, resposta tardia,
  resposta idempotente, segredo sanitizado e transporte JSON/multipart.
- Três E2E `8C2U.1` passaram sem retry/skip em
  `/tmp/etapa6-frontend-xhfU1l/results.json`: simulação real/duplo clique,
  consulta sem formulário e perda da resposta real após HTTP 201, sem reenvio.
  Axe e layout 320 px passaram. As três regressões de consulta de lotes também
  passaram na rodada anterior; não foram repetidas sem mudança no seu fluxo.
- Um quarto cenário recusou XLSX adulterado no worker real (HTTP 400), com erro
  sanitizado/focado e nenhuma alteração nas tabelas; passou em
  `/tmp/etapa6-frontend-0sQ0JL`. Total: quatro cenários novos aprovados em rodadas
  proporcionais; não se declara rodada única de quatro neste estado local.
- Docs, consistência, 30 testes de workflow e `git diff --check` passaram.
  O bootstrap do worker foi refinado para receber sua senha via ambiente/stdin,
  sem argumento de processo; o E2E positivo passou novamente em
  `/tmp/etapa6-frontend-1czONk`. A inspeção após o runner mostrou zero bancos
  `etapa6_frontend_*` e zero logins `etapa6_*` remanescentes no servidor descartável.
- A comparação de contagem e digest do conteúdo de **todas as tabelas** de
  `ambulatorio` antes/depois comprovou ausência de registros persistidos.

O destino SQL foi confirmado como `postgres|ambulatorio_ci|5432` no container
`ambulatorio-m2-focus-20261027`, PostgreSQL 16.15 em tmpfs, publicado em 55459.
Cada execução criou/removeu seu banco/login próprios. Arquivos e dados somente
sintéticos; nenhuma conexão à base persistente.

A primeira rodada encontrou duas falhas de instrumentação: Playwright não
expunha `postData` do upload e `route.fetch` reenviava sem bytes do arquivo (400).
A prova passou a conferir o contrato da resposta real e a interromper a resposta
em seu estágio CDP após o servidor processar o multipart original. A repetição
passou 3/3; o código de produção não foi ajustado para contornar essas falhas.

## Limite comprovado do H14

O dry-run desfaz linhas por transação, mas `nextval` não é transacional. Na prova
positiva avançaram seis sequências: atendimento 21→23, paciente
9007199254826908→9007199254826910, lote 2→3, linha 22→24, registro 22→26 e evento
de auditoria 64→68. Isso não foi ocultado nem tratado como garantia atendida.
C2B.1 exige não consumir sequências e continua pendente, assim como confirmação
U.2, relatório rico U.3, conflitos U.4 e aceites humano/visual.
