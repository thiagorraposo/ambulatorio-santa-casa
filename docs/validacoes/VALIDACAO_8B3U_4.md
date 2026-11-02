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
