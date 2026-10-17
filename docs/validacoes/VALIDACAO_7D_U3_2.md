# 7D-U3.2 — diagnóstico e avaliação por consulta selecionada

Data: 2026-10-17. Estado: implementação e validação técnica aprovadas.

Unidade do [roadmap](../PROXIMOS_PASSOS.md#7d-u3), usando os contratos de leitura
já existentes. Não acrescenta regra clínica, escrita independente, consolidação
entre consultas ou preenchimento por último valor não nulo.

Plano e critérios de aceite:

1. Oferecer abas Chagas e Avaliação clínica com seleção explícita de atendimento.
2. Representar a seleção textual em `atendimentoId` na URL; preservar consulta,
   aba e paginação das opções ao navegar, voltar e avançar.
3. Paginar opções com `consultaLimit/consultaOffset`, independentemente dos
   dados cadastrais/histórico; não trocar a seleção ao mudar a página.
4. Reutilizar os painéis do detalhe, com data/ID como fonte; manter NULL, falso,
   zero e NUMERIC textual sem inferência ou perda de precisão.
5. Sem seleção, orientar escolha. ID inválido não gera leitura de detalhe;
   consulta sem dados não herda diagnóstico/avaliação de outra visita.
6. Carga/falha da leitura do detalhe e 403/404 das opções ocultam o detalhe
   anterior. A seleção continua na URL para recuperação consciente.
7. Verificar componentes, leitura HTTP real, revogação, teclado e 320 px, com
   zero escrita clínica feita pela interface desse percurso.

O detalhe usa `limit=1&offset=0` para limitar coleções incidentais; avaliação e
diagnóstico são objetos escalares completos. A API existente verifica tanto
vínculo do paciente quanto pertencimento do atendimento. Uma resposta com ID
divergente não é exibida como a consulta selecionada.

Falha 503 somente nas opções não invalida por si só o detalhe retornado com
sucesso por sua própria leitura. O erro permanece no seletor. Recusa 403/404
das opções oculta o detalhe e requer restabelecimento do contexto de leitura.

Evidências iniciais:

- Build e unitários frontend completos aprovados: 163 testes em 16 arquivos,
  log `/tmp/ambulatorio-check-mf04240x/output.log`.
- Regressões incluem A preenchida → B sem dados, objetos ausentes
  independentemente, falso/zero/precisão, bigint, URL/histórico/página vazia,
  seleção fora da página, foco e falhas/reconsulta sem dados antigos.
- Cenários novos de navegador usam API/PostgreSQL sintéticos com duas visitas
  distintas, seleção/paginação/abas e revogação real. Incluem regressão das telas
  de leitura existentes e do detalhe que passou a reutilizar os painéis.
  Log `/tmp/ambulatorio-check-_nvaxdv3/output.log`: quatro cenários aprovados,
  incluindo os dois novos e as regressões de leitura/acessibilidade e link direto
  do atendimento. Axe, teclado e reflow em 320 px passaram no novo percurso.
- Revisão independente não encontrou defeitos materiais no recorte.

Sem migration nem API nova. Aceite clínico e unidades U3.3/VU1 permanecem fora
do aceite técnico desta unidade. As outras provas aprovadas da continuidade
não são repetidas sem mudança que afete seu comportamento.

Limite de navegação: Voltar do navegador conserva a URL de seleção e página;
a breadcrumb do detalhe continua abrindo o histórico padrão. Retorno explícito
ao contexto da ficha pertence à próxima unidade U3.3.
