# 7D-U4.1 — navegação, login, conta e erros em telas menores

Data: 2026-10-21. Estado: implementação e validação técnica aprovadas no recorte descrito.

Unidade do [roadmap](../PROXIMOS_PASSOS.md#7d-u4), após o fechamento técnico de
[U3.3](VALIDACAO_7D_U3_3.md). U4.1 usa as rotas e a sessão existentes e não
introduz diálogos. Por isso não depende da decisão P-03 sobre novos diálogos
ou atendimento guiado. Cadastro/etapas, U4.2 e revisão clínica mantêm seus
próprios critérios e decisões. Alterações anteriores foram preservadas; a
fotografia inicial dos arquivos compartilhados foi guardada em
`/tmp/ambulatorio-u41-baseline`.

## Plano e critérios de aceite

1. Navegação lateral no desktop e menu compacto recolhido até 800 px, liberando
   espaço para o conteúdo. Links reais e perfil/identidade do servidor.
2. Controle com `aria-expanded`/`aria-controls`, teclado, Escape com retorno de
   foco e fechamento somente após navegação efetiva. Menu sem comportamento
   modal: Tab pode avançar para fora dele.
3. Ao mudar o breakpoint, não manter foco num link recolhido ou botão oculto.
   Link de salto e navegação levam ao conteúdo; voltar preserva a URL anterior.
4. Login legível em 320/390 px, rótulos/mascaramento/autocomplete, vazio sem
   envio, carregamento anunciado e bloqueio de autenticação repetida. Erros
   públicos permanecem sanitizados, com foco e limite do servidor.
5. Minha conta mantém nome/ID/perfil reais e saída explícita; nenhuma edição ou
   dado de identidade que não esteja publicado no contrato.
6. Endereço desconhecido oferece início/busca. Falha transitória de identidade
   oculta o conteúdo, foca orientação e permite retomar o mesmo destino por
   leitura ou sair; recuperação devolve foco ao conteúdo.
7. Conferir desktop, 320/390 px, zoom 200%, teclado/foco, Axe e regressão de
   sessão, rascunhos, autorização e recursos clínicos.

## Implementação

`AppNavigation` separa a navegação do layout e mantém Início/Pacientes/Minha
conta. Em tela menor, o botão controla links e saída; fechado, esses controles
não ocupam espaço nem entram na ordem de Tab. Em desktop permanecem visíveis.
Escape atua somente dentro da navegação aberta, sem capturar os diálogos
clínicos existentes. Mudança de rota fecha o menu após a navegação; navegação
bloqueada por rascunho não é confirmada por esse controle.

O cabeçalho apresenta nome/perfil retornados por `/auth/me`. Minha conta explica
como solicitar alteração à equipe responsável, sem fabricar endereço de suporte
ou operação de redefinição de senha. Canal institucional nominal continua a
cargo da implantação/gestão de identidade; a orientação não é um fluxo de
suporte implementado.

A página de endereço desconhecido oferece dois destinos úteis. Falha de
identidade ganha título/orientação, foco e saída explícita; Tentar novamente
continua a revalidação de leitura já existente. Ao recuperar, o foco volta ao
mesmo conteúdo; ao sair, não rouba foco do login novo. Cache, rascunhos e recibos
continuam sob a política vigente. Não foram criados API, migration ou escrita
clínica. Login/perfis/regras clínicas não foram modificados.

## Rastreabilidade e limites

Recorte de RQ-NAV-01/02/08–10/13, RQ-CTA-01/02/06, RQ-ERR-03/07 e apresentação
operável de RQ-LOG-01–03/05. Testes anteriores de 401/429/503/rede continuam
verificando as mensagens e o foco do login. RQ-CTA-05 tem orientação genérica,
sem novo canal institucional definido. Avatar é opcional e não foi acrescentado.

RQ-LIS-12, RQ-ATD-15 e controles/diálogos compartilhados pertencem ao recorte
U4.2. Não há aceite agregado U4/VU1 nem homologação da identidade visual da
instituição. Sem novo teste de bloqueio de usuário: a recusa 401 uniforme é
preservada pelo cliente/contrato, sem alteração do backend.

## Evidências

- `AppNavigation.test.tsx`: controle/conteúdo, URLs/estado ativo, teclado/Escape,
  rota/voltar, logout e mudança de breakpoint com foco/limpeza do listener.
  JSDOM não certifica visibilidade por media query; essa prova é do navegador.
- `shell.test.tsx`: conta, orientação/saída, erro de identidade/ocultação, foco
  na falha e após recuperação, retry somente de leitura e destino desconhecido.
- `App.test.tsx`: campos vazios sem login, senha mascarada, estado ocupado,
  bloqueio de autenticação repetida e senha vazia após saída, além da regressão
  de destino protegido e erros 401/429/503/rede.
- `tests/frontend/shell-navigation.spec.ts`: três cenários com login/API e
  PostgreSQL reais sintéticos, sem criar paciente ou escrever clínica. Percorre
  menu por teclado, Escape, Tab fora do menu, links, voltar e mudança de largura,
  conta/logout, endereço desconhecido e recuperação de identidade. A falha 503
  de `/auth/me` é **resposta de leitura interceptada**; recuperação usa API real.
  Não é uma indisponibilidade real do servidor nem prova de escrita.

Build e 201 testes de componentes passaram na rodada inicial:
`/tmp/ambulatorio-check-_ecc34ge/output.log`. Após acrescentar a prova de
login ocupado/vazio, os quatro arquivos de aplicação passaram com 27 testes:
`/tmp/ambulatorio-u41-final-app-unit.log`.

Falhas intermediárias e correções:

1. A primeira prova de componentes encontrou perda de foco ao remontar o conteúdo
   após recuperar identidade. Corrigido o retorno ao main ainda conectado, sem
   interferir no foco inicial do login; a regressão de aplicação passou.
2. A rodada completa de navegador terminou com **46/47 cenários aprovados**;
   somente o novo percurso de breakpoint falhou: `.button` sobrepunha o display
   do controle Menu e o mantinha visível no desktop. Corrigida a especificidade.
   Log `/tmp/ambulatorio-check-zogl3wxt/output.log`, artefatos
   `/tmp/etapa6-frontend-BLDT6B`. Não é uma rodada integral aprovada.
3. Na repetição focada, a ocultação por CSS removia foco antes do listener de
   `matchMedia`. O menu agora acompanha `focusin` e recupera o último foco nesse
   caso. A regressão unitária simula blur antes de notificar o breakpoint.
   Falha: `/tmp/ambulatorio-check-f6be34yr/output.log`; componentes finais:
   `/tmp/ambulatorio-u41-final-resize-unit.log`, 27 testes aprovados.
4. Os três novos cenários passaram após essas correções em
   `/tmp/ambulatorio-check-rws3ov3x/output.log`. A revisão visual encurtou o texto
   visível de fechamento, preservando o nome acessível, e impediu quebra de Sair.
   Foram novamente aprovados em `/tmp/ambulatorio-check-rcost3o8/output.log`.
5. Capturas de páginas curtas revelaram espaço vazio excessivo no cabeçalho por
   distribuição de altura do grid móvel. O shell usa coluna flex no modo compacto,
   sem limitar artificialmente o conteúdo; conta/erro e histórico recebem provas
   de altura do cabeçalho. A validação final inclui também regressão móvel dos
   percursos anteriores, sem repetir as provas clínicas não afetadas.

Build final aprovado: `/tmp/ambulatorio-check-a6ta120g/output.log`.
As [capturas finais revisadas](../frontend/visuais/README.md#continuidade-de-2026-10-21--navegação-e-erros-da-unidade-u41)
usam a execução `/tmp/etapa6-frontend-jXkZXY` e distinguem a resposta 503
interceptada de leituras reais. O menu fechado ocupa menos de 110 px em ficha,
página desconhecida e erro de identidade. Navegação, conta, marca e ações não
ficam cortadas nas larguras inspecionadas.

**Limitação visual concreta:** o histórico ainda quebra palavras em colunas
muito estreitas a 320/390 px. Isso está registrado nas capturas e pertence à
revisão de tabelas/controles U4.2; ausência de overflow da página não aceita a
legibilidade da tabela nem a ficha móvel inteira. O primeiro pacote posterior
sem decisão de produto necessária é U4.2, começando por essa revisão.

Rodada final no estado entregue: **11/11 cenários de navegador aprovados**,
sem retry, log `/tmp/ambulatorio-check-fa1467ui/output.log`, artefatos
`/tmp/etapa6-frontend-jXkZXY`. Combina os três cenários novos, leitura/Axe/zoom,
último atendimento, seleção clínica/revogação, rascunho móvel e os três percursos
U3.3. API em 6063, frontend em 4178, servidor exclusivamente sintético em
127.0.0.1:55457, com banco/logins exclusivos do runner. Os demais casos aprovados
da rodada completa foram reaproveitados conforme a validação proporcional;
não se declara uma nova execução integral de 47 casos no estado final.

Os alvos `frontend-build frontend-unit-test`, `frontend-e2e` e a rodada focada
cobrem as partes pertinentes de `frontend-check`, sem repetir suítes aprovadas
sobre o mesmo estado. Documentação, links locais, diff e status revisados.
Sem execução SQL/importador/backend clínico adicional: esta entrega não altera
contratos ou persistência. O runner removeu seus próprios banco/logins/fixture;
a demonstração separada foi preservada. Sem migration, dado real, commit ou push.

Aceite clínico e fidelidade visual integral permanecem pendentes.
