# Avaliação humana do protótipo funcional — equipe Santa Casa, M3

Registro documental:02/11/2026, base `44b106a`, branch
`feat/m3-janela-1-eventos`. Fonte: relato e decisões expressas do responsável
pelo produto nesta conversa. Não é execução automática nem homologação clínica.

## Identificação e alcance

| Campo | Informação comprovada |
| --- | --- |
| Evento | Avaliação humana do protótipo funcional |
| Participantes | Equipe do Centro de Pesquisa em Saúde da Santa Casa e responsável técnico pelo projeto; nomes e cargos individuais não informados |
| Data da sessão | **data exata não informada**; data deste registro não é a data da sessão |
| Atividade | **REALIZADA — COM PROBLEMAS IDENTIFICADOS** |
| Aprovação | **ACEITE INTEGRAL NÃO REGISTRADO**; não há aprovação deM3/8V1/8V2 nesta rodada |
| Ambiente e commit usados pela equipe | **Não confirmados para a sessão relatada** |
| Detalhe de entradas/perfil do P0 | Não informado; a queixa de cadastro identifica Edição, mas não se infere daí o perfil do fluxo que falhou ao confirmar atendimento |

Há evidência anterior de disponibilização de ambiente sintético em4177, código
funcional candidato `a84001a` (checkout191016f mais diff equivalente de código),
conforme [registro de execução](RELATORIO_EXECUCAO_M3_2026_11_02.md). Isso comprova
a disponibilização e o smoke sintético, não que a equipe tenha usado esse mesmo
ambiente/SHA na reunião. Não presumir ambiente real ou sintético para a sessão,
nem transportar IDs, horários ou participantes dos testes automáticos para ela.
Nenhum dado pessoal, clínico real, imagem da reunião ou credencial é registrado.

## Achados humanos abertos

IDs HUM-M3 abaixo identificam achados, não novas frentes ou unidades de entrega.

| Achado e prioridade | Cenário/resultado fornecido pelo responsável | Natureza e situação técnica | Destino oficial e estado |
| --- | --- | --- | --- |
| HUM-M3-01 · P1 | Perfil Edição tentou cadastrar paciente e não conseguiu | Comportamento relatado; nova política de produto passa a exigir cadastro por Edição. Regra restritiva atual confirmada por inspeção, sem reprodução automática desta tentativa | Frente1:7A-U1,7D-R6B.1/U.1; H3/capacidades. **ABERTO**, novo requisito por perfil ainda não validado |
| HUM-M3-02 · P1 | Necessidade de permitir edição dos dados cadastrais pelo perfil Edição | Solicitação explícita; tentativa/erro específico de edição não detalhados. PATCH cadastral já existe; a nova exigência de acesso/uso e aceites por perfil precisa ser comprovada | Frente1:7A e7D-R6B.1/U.1; CAD. **ABERTO**, não confundir com correção de histórico clínico |
| HUM-M3-03 · P0 no percurso | Após cadastro de paciente, tentativa de confirmar atendimento não foi concluída; mensagem genérica orientou conferir campos e tentar novamente | Falha relatada, **aguardando reprodução e diagnóstico**. Payload, HTTP, campos rejeitados e causa raiz não comprovados. P0 mantido até evidência de correção do percurso | Frente1:7D-U1/U2/U4,7D-R6B.2/U.2,7D-A1; H4/ATD/ERR. **ABERTO** |
| HUM-M3-04 · P1 | Interface considerada insuficientemente desenvolvida para o escopo funcional | Avaliação qualitativa e solicitação de cobertura completa; telas/campos individuais da reunião não enumerados. Não significa que toda interface tenha falhado | Unidades U correspondentes, frente9/8V1/8V2 e matriz de cobertura. **ABERTO**, auditoria dirigida e reavaliação obrigatórias |
| HUM-M3-05 · P1 | Ausência de gestão completa de contas pelo administrador | Lacuna relatada e requisito reforçado; comandos individuais testados na reunião não detalhados. Ausência de API/UI administrativa confirmada por leitura | Frente8:8D1D/B/U,8D2B/U, incluindo criação8D2B.3/U.3. **ABERTO** |

Resultado esperado do P0: atendimento válido confirmado/persistido; dado inválido
identificado pelo rótulo do campo e motivo compreensível, sem apagar dados válidos.
Exemplos de datas/opções inválidas fornecidos pelo responsável são ilustrativos,
**não identificam os campos que causaram a falha**. Não atribuir antecipadamente
culpa a DTO, obrigação de campo, SQL, cadastro recente ou regra clínica.

## Inspeção documental posterior, sem reprodução funcional

Em02/11, leitura do código da base acima confirmou:

- `ClinicalAccessService.canCreate` permite Edição somente em `todos_sinteticos`;
  `GET /pacientes/capacidades` e POST revalidam a mesma regra. Na política de
  vínculos explícitos, não atende à nova política de cadastro por Edição.
- Criar paciente não insere vínculo em `acesso_paciente`; só liberar o booleano
  não garante criar→consultar→editar→atender. O contrato de acesso inicial precisa
  resolver esse percurso **sem autoconceder vínculo ou acesso global**.
- PATCH cadastral já tem versão, autorização, transação, auditoria e recibo;
  a P-03 de projetos/notificação não impede reutilizar esse contrato existente.
- O cliente HTTP transforma erros apenas pelo status e descarta o corpo; os
  controles não recebem erros estruturados por campo. É lacuna de feedback
  confirmada por inspeção, **não reprodução nem causa provada do P0 humano**.

Fontes técnicas e plano de investigação:
[recorte clínico vigente](../arquitetura/RECORTE_CLINICO_ETAPA_7.md#planejamento-após-avaliação-humana-m3),
[contratos clínicos](../arquitetura/CONTRATOS_CLINICOS_ETAPA_5.md#edição-e-coleções-clínicas).
A hipótese histórica de erro400 no [parecer M2](VALIDACAO_7D_A1.md#aceite-humano-oficial-de-m2--31102026)
é de outro registro e não se torna causa deste achado por semelhança de mensagem.

## Decisões de produto recebidas e suas fontes normativas

O responsável aprovou como **requisitos desejados**, não como funções entregues:
Edição cadastra e edita cadastro dentro do escopo; Consulta permanece sem escrita;
Administração cria/consulta/altera perfil/ativa/inativa contas e consulta auditoria,
sem capacidades clínicas especiais implícitas. A
[matriz desejada dos perfis](../frontend/VISAO_E_ESPECIFICACAO.md#pessoas-problemas-e-percursos)
e o [catálogo](../frontend/ENTREGAS_DO_PRODUTO.md) são as fontes normativas.

Prioridades: P0 confirmação de atendimento e validação por campo; P1 cadastro/
edição por Edição, gestão8D e cobertura frontend; P2 continuidade restante.
Frontend completo passa a integrar obrigatoriamente a conclusão de toda função
humana, conforme [workflow](../WORKFLOW_DE_DESENVOLVIMENTO.md#entrega-integrada-de-funcionalidades-humanas).
Mínimos de proteção de identidade estão aprovados como requisitos; decisões
institucionais específicas de P-08 continuam explícitas na proposta8D1D.

## Revalidação e aceites

Não houve nova execução funcional nesta entrega documental. Cenários de correção,
perfis ampliados, erros por campo e contas administrativas **ainda não testados
sob o novo contrato**. Provas técnicas anteriores continuam válidas nos seus
recortes; não reproduzem automaticamente as entradas da equipe.

M1/26-10 e M2/31-10 mantêm seus pareceres históricos. Nenhuma aprovação nova de
M3, tela, requisito individual, assinatura ou participante é inferida desta rodada.
Cada achado só fecha com evidência técnica apropriada; aceite humano requer nova
avaliação dos cenários afetados, com resultado e escopo efetivamente informados.
P0 exige navegador/API/PostgreSQL sintético e persistência, não só mensagem melhor.
Fila e próxima ação: [plano M3](../execucao/PLANO_M3_2026_11_03.md#5-fila-dinâmica-e-regra-de-seleção).


## Validação desta entrega documental

`make docs-check repository-check COMPACT=1` e `git diff --check` aprovados.
Conferência local de links/âncoras:1.961 referências nos15 documentos alterados,
sem destino ausente. IDs conferidos:57 destinos operacionais preservados,
USR-19 continuaEX, USR-20–24 acrescentados; inventário nominal98=57−23+64,
sem interpretação como percentual ou trabalho restante. Revisão do diff e
revisão independente corrigiram rastreabilidade do histórico administrativo,
posição do aceite8D2U.3, bloqueio8D histórico e pendência obsoleta de parâmetros.

Essas verificações validam documentação/consistência, **não reproduzem o P0,
não testam as capacidades novas e não concedem aceite humano**. Alterações
restritas a arquivosMarkdown emdocs; nenhuma suíte clínica, banco, runtime ou
migration foi executada/modificada nesta entrega. Log documental de referência:
`/tmp/ambulatorio-check-rsduympe/output.log` (volátil); revisão final antes do commit.
