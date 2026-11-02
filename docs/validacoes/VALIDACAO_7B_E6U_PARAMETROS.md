# Interface de parâmetros do exame — recorte 7B-E6U

2026-11-02, retomada da Janela 1; backend/base `69c9428` mais diff da interface.
Recorte RQ-EXA-09–13/16 VALIDADO TECNICAMENTE, sem aceite humano.
[Contrato](../arquitetura/CONTRATO_RESULTADOS_7B_E6B.md).
Datas/status do pai (RQ-EXA-07/08), correções e agregado E6U permanecem pendentes.

## Implementação e gates

Lista paginada, formulário de seis campos, revisão integral, rascunho/descarte e
recibos de múltiplas intenções no exame canônico escolhido. Nome obrigatório;
valor, unidade, referência, interpretação humana e observações independentes e
literais, opcionais/null. Nenhuma conversão, diagnóstico ou atualização do pai.
Identificação, ID, bloco e atendimento do exame visíveis; retorno conserva URL
da ficha/consulta, paginação, seleção e hash. Perfis consulta somente leem.

O teste antigo de ausência de qualquer link confundia exame sem atendimento com
ausência de navegação. Continua exigindo ausência de link de atendimento quando
sua FK é null; exige agora link dos parâmetros do próprio exame e retorno exato.
Não houve remoção de uma restrição de autorização nem alteração do contrato H6.

DoD técnico do recorte: formulário/lista/revisão, campos discriminantes,
persistência real, dois IDs, vínculo correto, pai intocado, perfil consulta,
revogação, erro recuperável e recibo após resposta perdida comprovados. Banco
sintético tmpfs conferido antes da escrita; nenhum dado real ou acesso persistente.
Prontidão: integração frontend/API/SQL73 suficiente para esse recorte; bloqueios
do pai/edição e homologação visual permanecem próprios. Mapeamento atualizado
na matriz FM-EXA-09–13/16. EVM não recalculado: não há baseline de esforço/custo
ou valor agregado confiável; contagens de testes não substituem esses dados.

## Validação proporcional

- `make frontend-build frontend-unit-test COMPACT=1`: build e **266/266 unidades**,
  34 arquivos, em `/tmp/ambulatorio-check-etgf9ijv/output.log`.
- Runner `tests/frontend/test_e2e.sh resultados-exame.spec.ts`: **3/3 E2E** finais,
  `/tmp/m3-e6u-e2e-final.log`, artefatos `/tmp/etapa6-frontend-Ki1tHC`.
  API e PostgreSQL16.15 reais, migrations02–73 em banco/login exclusivos;
  container `ambulatorio-avc-interacoes-20261101`, localhost55457, dados em tmpfs.
  Recursos do runner encerrados ao fim. Duas provas iniciais também passaram,
  ampliadas com genérico/descarte/troca de paciente; não substituem a rodada final.
- Nome obrigatório/foco, seis valores na revisão/payload/releitura, rascunho ao
  navegar, retorno exato, Axe/fit320/390/1440, dois parâmetros em IDs distintos,
  COMMIT com resposta perdida recuperado por recibo e **um único POST**, outro
  exame vazio e pai integralmente preservado. Paginação21 em20/1,503, consulta
  sem criação/rota direta recusada, revogação sem conteúdo, genérico identificado,
  Escape/foco/descarte sem persistência e exame de outro paciente recusado.
- Backend/SQL sem mudanças para E6U: preservada regressão188 unidades/137 HTTP/
  44 SQL/upgrade72→73 do [backend](VALIDACAO_7B_E6B_PARAMETROS.md).
  Não repetida por mudança só de interface. Logs `/tmp` são voláteis.

## Comparação visual técnica

Referência original renderizada em localhost8445: login sintético → Pacientes →
Paciente Sintético001 → Exames → expandir ECG → Adicionar resultado. A tabela
mostra parâmetro/valor/unidade/referência/interpretação; o botão não abre campos
nem altera o estado. Não existe formulário equivalente para comparar.
Fonte `PatientRecord.tsx`, SHA256
`37b7943c03203a382a9a27c0cb9b5ae76a14e67961799f35eb857578bd9a4ac1`;
cópia temporária servida tem hash idêntico. Roteiro reproduzível acima;
log `/tmp/m3-parametros-referencia.log`.

| Viewport | Referência de parâmetros | Formulário implementado |
| --- | --- | --- |
| 1440 | [Original](../frontend/visuais/parametros-exame-referencia-1440.png) | [Atual](../frontend/visuais/parametros-exame-formulario-1440.png) |
| 390 | [Original](../frontend/visuais/parametros-exame-referencia-390.png) | [Atual](../frontend/visuais/parametros-exame-formulario-390.png) |
| 320 | [Original](../frontend/visuais/parametros-exame-referencia-320.png) | [Atual](../frontend/visuais/parametros-exame-formulario-320.png) |

Confronto real da composição: tabela embutida no accordion da referência versus
lista paginada e formulário dedicado acessível na aplicação. Campos humanos do
contrato preservados e observações adicionais; datas/status do protótipo ainda
sem destino aprovado. Cartões e densidade diferem do wizard;320px sem overflow
no formulário. Não declarar 8V1 integral, ensaio completo ou homologação humana.
