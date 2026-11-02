# Atalhos por pessoa — 8B3U.4

2026-11-02, retomada da Janela1; base69c9428/5ee274d com diff da unidade.
Recorte de navegação VALIDADO TECNICAMENTE; testes e comparação abaixo. Não conclui
8B3U.1–.3, suas novas colunas/filtros, P-05 ou aceite humano de M3/8V1.
Fonte de escopo: [catálogo8B3U](../frontend/ENTREGAS_DO_PRODUTO.md#8b3u).

## Comportamento e autorização

Cada linha da busca H2 oferece Editar e Novo atendimento diretamente aos
perfis edição/administração, mantendo Ver ficha para os três perfis. Nome e
ID compõem o nome acessível de cada atalho, distinguindo homônimos e preservando
IDs grandes como texto. O destino usa o ID daquela linha, sem GET de ficha por
linha ou novas consultas de capacidade. A seleção por perfil segue a referência
Patients.tsx e os controles existentes da ficha; não representa autorização
antecipada de escrita por paciente. Vínculo e autorização continuam revalidados
pelos serviços existentes quando houver gravação; este incremento não altera
RBAC, API, PostgreSQL ou regras clínicas.

Os formulários identificam a pessoa por nome/ID e oferecem retorno explícito
à busca com filtros, limite e deslocamento originais. O retorno aceita somente
a rota local /pacientes e sua query; recusa URLs externas, ficha, hash e barras
invertidas. A navegação e o bloqueio de saída de rascunho existentes permanecem
ativos. O sucesso de gravação continua levando ao registro salvo conforme o
contrato já vigente; não há nova gravação nesta unidade.

## Provas

- Unitários dirigidos de atalhos e leitura:22 aprovados (2 arquivos), incluindo
  homônimos/IDs grandes, edição/administração/consulta, os dois destinos, retorno
  aos filtros/página e recusas de retorno inválido. Comando: `cd frontend && npm
  run test:unit -- src/features/pacientes/patient-shortcuts.test.tsx
  src/features/pacientes/reading.test.tsx`.
- `make frontend-build COMPACT=1` aprovado; log temporário
  /tmp/ambulatorio-check-rn6orp0h/output.log.
- E2E real em navegador/API/PostgreSQL:2/2 aprovados inicialmente em5.8s,
  /tmp/etapa6-frontend-XiXKhS. `tests/frontend/test_e2e.sh
  patient-shortcuts.spec.ts` confirma ambos os destinos e identificação real nos
  formulários, retorno à busca, perfil consulta sem escrita, teclado e viewport
  320px sem overflow horizontal da página. Nenhuma escrita HTTP clínica ocorreu;
  os dados clínicos da fixture vieram do runner sintético.
- Após ajustar somente a quebra dos links de ação, repetidos os2 E2E:
  2/2 aprovados em5.9s, /tmp/etapa6-frontend-LMnW3k; portas6063/4178.
- Ambiente conferido antes do runner: container exclusivo
  ambulatorio-avc-interacoes-20261101, PostgreSQL16.15 em tmpfs,
  localhost55457. Runner cria banco e logins exclusivos, aplica02–73 e remove
  seus recursos ao terminar. Nenhum acesso ao banco persistente.

Backend/SQL/importador não foram alterados por esta unidade. Não repetir suas
regressões aprovadas para validar somente navegação. Logs /tmp são voláteis;
resultados e limitações ficam resumidos aqui.

## Comparação visual e limites

Referência renderizada no servidor local8445 com dados sintéticos, login
administrativo do protótipo e navegação Pacientes; fonte
referencias/frontend/figma-make-prototipo/src/components/Patients.tsx.
Confronto da lista a320px: referência usa sidebar fixa que corta a área de
conteúdo; aplicação usa menu compacto, filtros identificados e ações por links
na tabela. Na referência, Editar abre a ficha; a aplicação abre efetivamente
edição, como exige o catálogo, e acrescenta Novo atendimento. Busca ampliada,
origem, projetos e demais colunas da referência dependem das folhas próprias;
não foram simulados aqui. Não houve homologação visual ou aceite humano.

Capturas confrontadas: [aplicação320px](../frontend/visuais/atalhos-pacientes-320.png)
e [referência320px](../frontend/visuais/atalhos-pacientes-referencia-320.png).
Os links de ação preservam palavras completas; células de nome/ID ainda têm
quebra densa a320px, limite de legibilidade da tabela a tratar na avaliação
visual ampla. O foco e o nome acessível completo identificam cada ação/pessoa.


Prontidão/DoD do recorte: rotas/camadas existentes suficientes, destinos e retorno
reais, perfis/identificação e interação estreita comprovados. Não há mudança de
schema ou contrato clínico. RQ-LIS-09/10 mapeados na matriz. EVM sem baseline
confiável de esforço/custo/valor, não recalculado por contagem de entregas.

## Retorno da ficha à busca — estabilização de 02/11

Base `bd3d58c`; alterações locais preexistentes revisadas e preservadas. O link
Ver ficha passa a transportar os mesmos filtros/limite/deslocamento dos atalhos;
o breadcrumb da ficha valida esse destino local e o conserva entre abas e após
relogin na recarga. URLs externas, de outra ficha e barras invertidas são
recusadas. Sem alteração de API, RBAC ou persistência clínica.

- Build frontend aprovado: `/tmp/ambulatorio-check-yvemigul/output.log`.
- Leitura dirigida: **16/16 unidades** (`reading.test.tsx`),
  `/tmp/m3-retomada-reading.log`.
- Três E2E por perfil aprovados na rodada dirigida:
  `/tmp/m3-retomada-percurso.log`, artefatos `/tmp/etapa6-frontend-UP1wFw`.
  Busca filtrada/paginada, teclado, abas, recarga com novo login, retorno exato,
  Axe e capturas1440/390/320. A inspeção da captura320 confirma breadcrumb
  alcançável e menu/abas sem sobreposição.

Mantida a identidade/paleta e a adaptação acessível já comparada acima. As
capturas deste incremento não constituem nova homologação visual do protótipo.
FM-NAV-12/RQ-NAV-12 e 7D-R1 recebem prova apenas desse percurso; agregado e
aceite humano permanecem abertos.

### Retorno pelo atendimento

Sobre `acfc9ae`, reproduzida em componente a perda da busca ao percorrer
ficha→detalhe→ficha: o sanitizador removia qualquer `retorno`, incluindo o
destino válido da lista. Dois casos novos falharam antes da correção
(`/tmp/m3-retomada-navigation-before.log`,18 aprovados/2 falhos). Agora mantém
somente retorno validado à lista e remove encadeamentos dentro da própria
lista. Destinos externos, outra ficha/detalhe e controles continuam recusados;
IDs, seleção, páginas e hash da ficha são preservados.

- Três arquivos dirigidos:46 unidades aprovadas; build aprovado.
- Suíte frontend em série: **36 arquivos/306 testes aprovados**,
  `/tmp/m3-retomada-unit-final.log`.
- Nove E2E: seis aprovados; três novos identificaram reordenação desnecessária
  de query ao sanitizar retorno. Ajustado para conservar a posição original do
  parâmetro; teste de componente agora cobre essa ordem. Após ajuste, **20/20
  unidades** e build passaram (`/tmp/m3-retomada-navigation-order.log`).
- Três afetados repetidos: **3/3 aprovados**,
  `/tmp/m3-retomada-navigation-final.log`, `/tmp/etapa6-frontend-I8f6L3`;
  último atendimento e histórico→detalhe→ficha→abas→recarga→busca, três perfis,
  teclado e1440/390/320 com Axe. Os seis anteriores em
  `/tmp/m3-retomada-navigation-e2e.log` cobrem últimos registros, atalhos,
  histórico/exames e revogação; não somar como uma única execução9/9.

FM-FIC-11/HIS-12 e7D-R1 recebem essa prova de navegação. Sem alteração de
contratos clínicos ou permissões e sem homologação do agregado.

## Legibilidade da tabela em telas menores

Sobre `fdc251c`, reutilizado `TableScroll wide`, já aplicado ao histórico.
Nomes e IDs ficam inteiros; a rolagem ocorre na região da tabela, sem alargar
a página. Orientação visível informa como alcançar ações. Desktop mantém
tabela com as mesmas colunas, cores e tipografia. Nenhuma coluna ou capacidade
backend pendente foi simulada.

Comparadas as capturas oficiais acima com [desktop1440](../frontend/visuais/pacientes-legiveis-1440.png),
[mobile390](../frontend/visuais/pacientes-legiveis-390.png),
[mobile320](../frontend/visuais/pacientes-legiveis-320.png) e
[ações320](../frontend/visuais/pacientes-acoes-320.png). A quebra densa de nomes
registrada na rodada inicial foi substituída pela rolagem local. Em320, as
ações exigem rolagem; foco por teclado as revela e ambas abrem a pessoa
correta, preservando a busca. A referência320 ainda sobrepõe navegação; essa
limitação não foi reproduzida no produto. Sem novo aceite humano/visual integral.

Build final aprovado, `/tmp/ambulatorio-check-wechiy4p/output.log`.
`tests/frontend/test_e2e.sh patient-shortcuts.spec.ts --grep 8B3U.4` com as
mesmas variáveis sintéticas anteriores: **2/2 aprovados**,
`/tmp/m3-retomada-tabela-final.log`, `/tmp/etapa6-frontend-Ca31aJ`.
Cobre1440/390/320, Axe, foco/ArrowRight, abertura dos dois formulários reais
e retorno; Consulta sem atalhos de escrita. Rodada anterior2/2 também passou
antes da orientação textual (`/tmp/m3-retomada-tabela-e2e.log`).
Sem alteração lógica que justifique repetir unidades backend/SQL/importador.
