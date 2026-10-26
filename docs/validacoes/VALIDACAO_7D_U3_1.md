# 7D-U3.1 — cabeçalho e último atendimento da ficha

Data: 2026-10-17. Estado: implementação e validação técnica aprovadas.

Escopo derivado da [unidade U3.1 do roadmap](../PROXIMOS_PASSOS.md#7d-u3):
identificar paciente, nascimento, idade/referência e último atendimento por data
registrada, sem depender da página de telefones/atendimentos dos dados cadastrais.
Não inclui diagnóstico/avaliação selecionados (U3.2), reorganização completa do
histórico (U3.3), métricas, código de negócio ou inferência de completude.

Plano e aceite técnico:

1. Usar a leitura autorizada existente `GET /v1/pacientes/:id/atendimentos`
   com `limit=1&offset=0`, sem varrer páginas ou alterar a API.
2. Preservar IDs como texto e distinguir nascimento, idade calculada e data da
   consulta. Paginar dados cadastrais não deve selecionar outra consulta.
3. Respeitar a ordenação do backend: data decrescente, nulos ao final e ID
   decrescente no empate. Um registro sem data não comprova cronologia.
4. Exibir carga, vazio e falha próprios; reconsulta/403 não deixam dados antigos.
5. Provar tipos nullable, ordenação e paginação em HTTP/PostgreSQL sintético;
   provar componente e percurso pela interface, incluindo teclado e 320 px.
6. Executar validações proporcionais e revisão independente antes do commit.

`data_atendimento` admite NULL no schema aplicado e nas migrations seguintes.
As consultas já preservam NULL; tipos de resposta e de linhas SQL incorretamente
declarados como `string` são ajustados para `string | null`, sem migration nem
alteração de persistência.

A regressão encontrou um defeito adicional nas duas leituras: a projeção
`atendimento_id::text` conserva o nome `atendimento_id`, e o `ORDER BY` sem
qualificador usava o texto projetado. IDs de larguras diferentes empatados na
mesma data podiam ser ordenados lexicalmente. As consultas passam a ordenar
explicitamente pelas colunas originais `a.data_atendimento` e
`a.atendimento_id`, mantendo a resposta textual e o desempate numérico.

Resultados obtidos:

- Build frontend aprovado: `/tmp/ambulatorio-check-be2pi344/output.log`.
- Unitários frontend completos aprovados, 145 testes em 15 arquivos:
  `/tmp/ambulatorio-check-xyp8hiki/output.log`.
- Build backend aprovado e 23 testes clínicos do arquivo `clinical.http.spec.ts`
  aprovados: `/tmp/ambulatorio-u31-clinical.log`. A nova regressão usa cinco
  registros com datas repetidas/nulas e IDs textuais grandes em ambos os lados
  de uma mudança de largura decimal, sem alterar sequências. Verifica histórico,
  coleção embutida, detalhes e páginas nos três perfis.
- O cenário de navegador próprio compara a consulta fixa com o contrato real,
  pagina os dados cadastrais, abre o detalhe com teclado e volta à página de
  origem em 320 px. Executado no conjunto frontend com log
  `/tmp/ambulatorio-check-0wheumog/output.log`: build, unitários e 38/39 cenários
  passaram. O cenário de resposta perdida falhou por localizar a mesma observação
  no novo resumo e na tabela do histórico. A asserção foi delimitada à linha do
  atendimento confirmado pelo ID, preservando a verificação exata da observação.
  Regressão focada mais o cenário U3.1: 2/2 aprovados, log
  `/tmp/ambulatorio-check-zo3f45yy/output.log`. Os demais cenários não foram
  repetidos sobre o mesmo código de produção.
- Unitários backend: 121 aprovados, log
  `/tmp/ambulatorio-check-dmnv9_og/output.log`. Documentação/diff/status passaram
  com reaproveitamento explícito dos 35 testes SQL sintéticos já aprovados:
  `/tmp/ambulatorio-check-pgto9_ob/output.log`.
- Revisão independente não encontrou defeitos materiais no recorte. O painel
  também foi conferido no Chromium da demonstração recompilada, em 390 px,
  navegando pelo teclado até o detalhe; captura
  `/tmp/ambulatorio-goal-20261017/u31-demo.png`.

O aceite técnico desta unidade não equivale a aceite agregado de U3, VU1 ou
revisão da equipe. Os testes de carga/403 do componente usam consultas
simuladas; os cenários reais existentes de revogação verificam a ficha que
contém o painel, sem uma nova prova isolada de revogação exclusiva do painel.

## Ocorrência na seleção do ambiente de validação

O comando `make -o db-test project-check COMPACT=1` foi usado incorretamente
para reaproveitar a suíte SQL já aprovada. A opção GNU Make `-o` não é propagada
à chamada recursiva do wrapper compacto. Sem seleção explícita nesse comando,
os testes SQL 01 e 02 rodaram no PostgreSQL Docker padrão, banco
`ambulatorio_santa_casa`. O SQL01 terminou com ROLLBACK; SQL02 falhou dentro da
transação e a conexão encerrada a reverteu. Não houve migration nem COMMIT de
linhas clínicas; sequências podem ter avançado, pois nextval não é transacional.
Não se tentou reajustá-las. Log: `/tmp/ambulatorio-check-fkx8i56z/output.log`.

As verificações seguintes selecionam explicitamente o servidor sintético em
55457. O reaproveitamento do SQL aprovado usa o wrapper de log diretamente,
passando `-o db-test` ao Make interno com `_COMPACT_RUNNING=1`, em vez de
presumir propagação por recursão. Essa ocorrência impede afirmar que nenhuma
operação de validação tocou o ambiente persistente nesta continuidade.
