# Decisões de produto M3 — 02/11/2026

Fonte: comando expresso do responsável nesta conversa, intitulado
“DECISÕES M3 — DEFINIÇÕES DE PRODUTO PARA IMPLEMENTAÇÃO AUTÔNOMA”.
Registro iniciado na base `074c62b`, branch `feat/m3-janela-1-eventos`.
Esta é a fonte principal das respostas 1–31; referências temáticas apontam para
ela sem reproduzir as decisões. O [catálogo](../frontend/ENTREGAS_DO_PRODUTO.md)
conserva os escopos/aceites por ID e o [plano M3](../execucao/PLANO_M3_2026_11_03.md)
conserva a ordem e o checkpoint.

**Situação: regras de produto aprovadas para implementação e validação no
protótipo sintético. Não são funcionalidades entregues, homologação clínica ou
institucional, aceite 8V1/8V2 ou autorização para dados reais.** M1/M2 e provas
anteriores permanecem nos seus recortes. Somente a operação afetada deve ficar
bloqueada se faltar informação indispensável à integridade ou ao significado
clínico; decisões técnicas suficientes são resolvidas autonomamente.

## Cadastro e acesso por Edição — decisões 1–2

1. Edição recebe vínculo automático, específico, auditável e revogável com o
   paciente que cadastrar. Permite consultar/editar cadastro e registrar
   atendimentos, respeitando as demais permissões. Sem expiração automática:
   permanece até revogação por Administração ou inativação da conta. Não concede
   acesso a outros pacientes. O contrato de implementação deve explicitar o
   efeito da inativação sobre o vínculo, sem presumir sua restauração em eventual
   reativação; registro desta decisão não define esse mecanismo técnico.
2. Somente Administração concede, transfere ou revoga vínculos com outros
   pacientes. Cadastros sem profissional autorizado terão fila administrativa de
   atribuição, com minimização de dados clínicos. Essa fila é requisito pendente,
   não consequência automática de liberar o cadastro por Edição.

## Identidade e gestão de contas — decisões 3–10 / P-08

3. Nome completo, nome de usuário único e perfil inicial explícito. Login não
   precisa ser e-mail; normalização para unicidade sem distinção de caixa;
   e-mail opcional. Nenhuma associação automática a digitadores das planilhas.
4. Credencial temporária forte gerada pelo sistema, para uso inicial com troca
   obrigatória. Expiração configurável, padrão sintético de 24 horas. Exibição
   única ao administrador que cria a conta; sem persistência em texto puro ou
   logs. Entrega fora do aplicativo por canal seguro, sem envio automático de
   e-mail nesta etapa.
5. Administração recupera contas não administrativas emitindo nova credencial
   temporária; nunca visualiza senha de outra pessoa. Recuperação excepcional
   quando nenhum administrador consegue entrar será fora da aplicação, restrita
   à infraestrutura e auditada, sem rota pública. Implementação excepcional
   somente sintética até processo operacional aprovado para produção.
6. Impedir alteração do próprio perfil e da própria situação ativa/inativa;
   exigir outro administrador. Proteger o último administrador ativo contra
   inativação ou perda de privilégios, inclusive sob concorrência.
7. Mudança de perfil, redefinição de credenciais ou inativação revoga efetivamente
   as sessões. Backend revalida autorização e impede operações posteriores com
   permissões antigas mesmo com JWT ainda válido. Operações confirmadas são
   preservadas.
8. Administração consulta ID/nome/login/perfil/estado e auditoria autorizada.
   Cada usuário consulta os próprios dados e altera senha mediante verificação
   segura da credencial atual. Mudanças de nome/login/perfil são administrativas.
9. Histórico de criação, perfil, ativação, inativação e recuperação com ator,
   alvo, instante, operação, resultado e anterior/novo pertinentes. Sem senhas ou
   tokens. Justificativa obrigatória para perfil, inativação e recuperação
   administrativa; opcional na criação.
10. Responsabilidade funcional do perfil Administração. Texto de suporte:
    “Procure um administrador autorizado da unidade”. Sem nome, telefone ou
    contato institucional inventados.

## Correções e conflitos — decisões 11–12 / P-03

11. Preservar histórico/autoria e exigir justificativa e concorrência otimista.
    Nenhuma sobrescrita silenciosa de alteração de outro usuário. Mostrar
    conflito, versão anterior e recuperação segura conforme permissão. Não
    apagar fatos clínicos históricos. Cada recurso ainda exige contrato técnico
    de versão/auditoria; regra de produto aprovada não altera contratos aplicados.
12. Seleção explícita de “Desconhecido” somente em campos que tenham esse estado
    semântico. Omissão significa não alterar; vazio não significa desconhecido
    automaticamente. Preservar valor anterior, exigir motivo nas correções e
    distinguir desconhecido de não informado.

## Central operacional — decisões 13–16 / P-04

13. Dois grupos: pendências assistenciais e inconsistências de importação.
    Navegação compartilhada, contratos/autorização/identidade/origem independentes.
    Nunca unir por semelhança textual.
14. Estados aberta, em andamento e resolvida. Trabalho pendente inclui os dois
    primeiros; resolvidas permanecem no histórico. Valores clínicos desconhecidos
    não geram pendência automaticamente; legado não será reclassificado por texto.
15. Edição assume/trabalha em pendências assistenciais de pacientes autorizados.
    Administração atribui, redistribui e organiza; não ganha habilitação clínica.
    Validação clínica final exige capacidade específica de revisor clínico;
    inconsistências exigem capacidade de gestão de importação. Itens sem
    responsável ficam na atribuição administrativa. Consulta somente lê o que
    estiver autorizado.
16. Decisões possíveis: confirmar informação, solicitar esclarecimento, resolver
    e reabrir pendência quando justificado. Todas com autoria, instante e
    justificativa. Revisão operacional não altera automaticamente o fato original.

## Indicadores, busca e exportação — decisões 17–21 / P-05

17. Pacientes: total distinto autorizado, independente do filtro temporal.
    Atendimentos: efetivamente realizados no período selecionado. Pendências:
    abertas/em andamento no estado atual, sem período aplicado por padrão.
    Lotes: importações efetivamente concluídas no período, sem duplicar reenvios
    idempotentes. Respeitar capacidades; informação de importação não é concedida
    automaticamente aos três perfis. Mostrar período/definição/carga/erro;
    falha ou ausência de autorização nunca vira zero.
18. Prioridade da lista: nome, identificador interno autorizado, nascimento/idade,
    último atendimento efetivamente realizado, projetos e ações por permissão.
    Idade tem data de referência explícita. Múltiplos projetos não duplicam pessoa.
19. Não inventar código institucional: usar identificador interno com rótulo
    correto enquanto não houver código de negócio comprovado. Origem geográfica,
    serviço/unidade encaminhadora e origem técnica/importação são conceitos
    distintos, sem preenchimento derivado entre eles. Ausente na origem continua
    sem informação.
20. Filtros de participação atual/histórica separados somente quando houver dados
    que permitam distingui-las. Caso contrário, apresentar “participação
    registrada”, sem afirmar atividade atual.
21. Preservar CSV atual. Acrescentar exportação dos resultados autorizados pelos
    filtros; volume configurável, inicialmente 5.000 linhas por arquivo. Campos
    cadastrais selecionados e dados operacionais autorizados, sem novos dados
    clínicos sensíveis por padrão. Backend verifica permissão, separada da mera
    visualização quando necessário; auditar exportação e proteger contra fórmulas.
    Três perfis exportam somente o conjunto explicitamente autorizado a cada um.
    Allowlist e tratamento do limite terão contrato verificável antes da entrega.

## Retorno planejado — decisão 22 / P-06/D9

22. Separar planejamento com data/precisão conhecida, orientação condicionada a
    exames e atendimento/retorno efetivamente realizado. Plano jamais conta como
    comparecimento. Preservar desfecho legado para consulta/proveniência. Retirar
    esse campo dos novos formulários apenas após substituição validada. Não
    converter ano isolado em data completa.

## Documentos de contrarreferência — decisões 23–25 / P-07

23. Parâmetros iniciais sintéticos: PDF/JPG/PNG, até 10 MB por arquivo e cinco
    anexos por episódio, múltiplos anexos permitidos. Recusar protegidos por senha;
    validar conteúdo e extensão; varrer quando houver mecanismo seguro disponível.
    Substituição preserva versão anterior/histórico. Limites não são política
    institucional de conservação.
24. Edição com vínculo pode anexar. Consulta/Edição consultam/baixam somente com
    autorização explícita para documentos daquele paciente. Administração de
    contas não concede capacidade clínica irrestrita. Upload significa apenas
    arquivo anexado, não envio, recebimento, contrarreferência concluída ou cuidado.
25. Armazenamento privado, sem URL pública, com autorização backend/auditoria de
    acesso. Usuário autorizado solicita retirada lógica; capacidade administrativa
    documental específica executa com justificativa, preservando versão/histórico.
    Anexos sintéticos podem ser descartados com a infraestrutura de teste. Para
    dados reais, eliminação automática e prazos presumidos permanecem desabilitados
    até política formal aplicável.

## Importação e revisão temporal — decisões 26–27 / P-09

26. Capacidades explícitas independentes dos perfis gerais: consultar importações,
    executar importação autorizada, solicitar reprocessamento, consultar cadeia de
    proveniência, propor revisão temporal, aprovar revisão e executar revisão
    aprovada. Separar proponente/aprovador em operações sensíveis; Administração
    de contas não concede essas capacidades. Testes sintéticos com usuários
    distintos para comprovar separação de funções.
27. Recuperação por recibo/consulta autoritativa, inclusive após novo login, sob
    autorização vigente. Outro operador autorizado assume verificação com
    auditoria. Não repetir escrita para descobrir resultado. Reenvio idempotente,
    reprocessamento explícito e correção temporal são operações distintas.

## Regras clínicas conservadoras — decisões 28–30

28. Medicamentos: distinguir classe, medicamento identificado quando informado,
    uso relatado, prescrição no atendimento e tratamento BZN. Uso relatado exige
    ao menos classe ou nome, e estado de uso quando disponível no contrato.
    Nome livre preserva exatamente a informação. Apresentação/dose/unidade/
    frequência/via/início/término opcionais quando desconhecidos. Não derivar dose
    ou demais campos da classe. Com duas datas completas, término não pode
    anteceder início; preservar informação histórica incompleta. Não transformar
    uso em prescrição. BZN separado, com vínculo explícito quando pertinente,
    evitando duplicação. Sem aconselhamento ou validação de adequação médica.
29. Solicitação geral de sorologia separada de episódios/resultados, conforme
    modelo. Campos conforme disponibilidade: paciente, atendimento de origem
    quando informado, estado, data conhecida, observação, histórico/proveniência.
    Solicitar não implica realizar ou obter resultado. Sintomas sem classificação
    contratada usam observação textual por atendimento, identificada como não
    estruturada. Sem lista/código/negativa automática; estruturar somente após
    significado e domínio definidos.
30. Dispositivos: distinguir marcapasso, CDI e ressincronizador; CRT-P/CRT-D somente
    com informação suficiente, senão “ressincronizador — tipo não informado”. Não
    inferir CRT-D da existência de CDI nem duplicar dispositivo combinado.
    Óbito: data completa, mês/ano ou ano, precisão explícita, sem completar partes;
    causa não obrigatória quando desconhecida; preservar histórico e impedir
    duplicação do mesmo evento ativo. Exames: estados operacionais, quando
    suportados pelo contrato, não informado/solicitado/agendado/realizado/resultado
    disponível/cancelado; datas de solicitação/realização/resultado separadas.
    Validar contradições comprováveis sem fabricar eventos/datas intermediárias
    ou invalidar/reinterpretar histórico incompleto. Reação adversa legada não
    presume BZN; contexto não identificado quando a origem não especifica.
    Vincular medicamento/BZN só por fonte explícita; ocorrência/ausência/
    desconhecimento distintos.

## Falha humana — decisão 31

31. Campos, perfil e ambiente originais não são conhecidos e não serão inventados.
    Investigar cenários equivalentes sintéticos em frontend/payload/API/contratos/
    persistência. Se não reproduzida, registrar limite e manter HUM-M3-03 aberto.
    Esta decisão não concede aceite ou encerra qualquer achado humano.

## Divergências e condição de implementação

| Registro anterior | Decisão vigente e efeito delimitado |
| --- | --- |
| Cadastro por Edição sem vínculo automático, com escopo inicial pendente | Decisão 1 autoriza expressamente vínculo automático específico/auditável/revogável. Substitui a vedação de produto; SQL26 e código atuais permanecem intactos até contrato/migration incremental e provas |
| Propostas P-03–P-09 pediam definições de produto | Respostas acima aprovam regras sintéticas. Contratos técnicos, implementação e aceites VD/B/U não são concluídos por associação; detalhes técnicos suficientes ficam com o agente |
| Leitura de contas só ID/nome/perfil e sem publicar credenciais | Decisões 4/8 autorizam futura ampliação contratada e exibição única de credencial temporária na criação. Não ampliar GETs já validados nem publicar senha/hash/token em listagens/históricos |
| Administração dispensa vínculo clínico no runtime sintético atual | Novas capacidades documental/importação/revisão e validação clínica não decorrem do perfil de contas. Auditar divergências por recurso antes de alterar o legado; não declarar isolamento implementado por registrar política |
| E4/E5/E6 e solicitação geral tinham semântica residual pendente | Decisões 28–30 delimitam produto; não converter legado, alterar significado ou inferir campos por mudança de documentação |

Prioridade: estabilidade e fidelidade do frontend demonstrável; fila M3 vigente.
Preservar contratos/evidências/migrations aplicados. Novas estruturas somente por
migration incremental, exclusivamente em ambiente descartável. Sem push, merge,
deploy ou banco persistente; commits locais autorizados. Não pedir decisões
técnicas resolvíveis autonomamente. Revisão humana visual/funcional e operação
real continuam separadas.

## Encerramento desta unidade documental

Encerrada a pedido do responsável após o registro das decisões, sem iniciar
alterações de aplicação/SQL. `make docs-check repository-check COMPACT=1` e
`git diff --check` aprovados; log `/tmp/ambulatorio-check-cstjk31k/output.log`.
Conferidas numeração1–31, rastreabilidade P-03–P-09 e17 links locais novos ou
revisados, incluindo âncoras. Revisão de conteúdo distingue política aprovada,
parâmetro sintético e implementação pendente; checks documentais não provam
funcionalidade. HEAD e próxima ação no checkpoint; nenhuma suíte da aplicação
repetida por mudança textual.
