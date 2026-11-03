# Alteração administrativa de perfil — 8D2B.1/U.1

Contrato técnico de 03/11/2026, decisões 3–10 da
[fonte de produto](../dados/DECISOES_PRODUTO_M3_2026_11_02.md).
Implementação e provas: [validação](../validacoes/VALIDACAO_8D2_PERFIL.md).
Escopo exclusivamente sintético; sem homologação ou política institucional nova.

## Comando e consumidores

GETs administrativos de coleção/detalhe preservam URL e campos e acrescentam
`versao: string` decimal positiva, opaca para o cliente. Consumidores identificados:
UsuariosPage, contrato TypeScript e testes de projeção HTTP/unidades/E2E.
Nenhum campo interno de sessão é exposto no me ou nos GETs administrativos.

`POST /v1/usuarios/:usuarioId/perfil` recebe exatamente
`{ operacaoId: UUIDv4, versao: string, perfil: consulta|edicao|administracao,
justificativa: string }`. Justificativa aparada de 10–1000 caracteres; versão
bigint positiva textual. Administração ativa, alvo existente, perfil diferente,
versão vigente e autoação proibida. Não altera nome/login/estado/vínculos ou
capacidades específicas. Mudança para Administração tem os efeitos do perfil
já existente; não modifica o escopo clínico legado nem concede capacidades novas.

Resposta 201: recibo `{ operacaoId, usuarioId, atorUsuarioId, operacao: 'perfil',
instante, resultado, anterior, novo, versaoAnterior, versaoNova, justificativa }`.
Resultados: `aplicada`, `versao_obsoleta`, `autoacao_proibida`,
`ultimo_administrador`, `perfil_inalterado`, `alvo_inexistente`.
Recusas confirmadas guardam recibo na mesma transação, sem alterar a conta:
409 versão/último administrador/perfil igual, 403 autoação, 404 alvo ausente.
400 entrada inválida; 401 sessão inválida; 403 capacidade ausente. Estes últimos
são recusados antes do comando e não simulam evento de mutação. Falha técnica
usa 503 sanitizado e pode deixar resultado indeterminado ao cliente.

## Atomicidade, concorrência e sessão

Migration incremental 75 adiciona versão da conta, geração de sessão e recibos
imutáveis. Função restrita com contexto autenticado revalida ator/perfil/geração
sob exclusão transacional comum aos comandos e às atualizações de contas.
READ COMMITTED é obrigatório; outros níveis são recusados para não usar snapshot
anterior ao bloqueio na proteção do último administrador. Trigger de statement adquire o mesmo advisory lock antes dos row locks; trigger
de linha impede retirar o último administrador ativo, inclusive por UPDATE de
infraestrutura. A proibição de autoação é verificada antes da proteção do último
administrador; ambas são invariantes independentes. Não excluir contas pela API.

Perfil/estado/hash efetivamente alterados incrementam a geração; qualquer UPDATE
incrementa a versão sem permitir atribuição manual. Login emite JWT com geração;
cada requisição compara com a geração atual. Tokens legados sem geração só são
aceitos enquanto ela for zero. Após mudança não voltam a funcionar nem com
retorno ao perfil anterior/reativação. Nova autenticação é necessária. Requisições
já admitidas podem terminar; operações confirmadas não são desfeitas. O comando
administrativo revalida também a geração do ator dentro da transação.

## Auditoria e recuperação

UUID identifica uma intenção imutável. Reenvio com o mesmo UUID/ator/alvo/payload
retorna o recibo original sem nova escrita; reutilização divergente retorna409.
Recibos guardam autoria, alvo, instante, anterior/novo, versões, resultado e
justificativa, sem senha/hash/token. Sem expiração automática no protótipo;
retenção institucional e histórico geral de contas são escopos separados.

`GET /v1/usuarios/:usuarioId/operacoes/:operacaoId` consulta o recibo com
Administração vigente, inclusive por outro administrador após novo login.
404 significa recibo ainda não disponível, nunca prova rollback ou autoriza
repetição. Código na URL da interface permite recuperação após recarga/login;
nenhuma credencial é persistida. Consulta do alvo e recibo são independentes:
um perfil atual coincidente não prova o resultado de uma intenção específica.

UI existente oferece seleção, justificativa, revisão anterior→novo/versão e aviso
de encerramento de sessões; cancelar/X/fundo/Escape não envia. Confirmação envia uma vez.
Resposta incerta bloqueia novo comando e oferece somente consulta do recibo.
Recusa comprovada preserva escolha/justificativa, relê o estado e exige nova revisão
explícita para outra intenção. Recibo aplicado mostra resultado histórico e relê
o estado atual separadamente; falha de releitura permanece erro, sem inventar
persistência. Autoação tem orientação de procurar outro administrador. Carga,
vazio/404, 400/401/403/409/503 e falha de rede têm tratamento seguro.

## Extensão integrada — estado 8D2B.2/U.2

Unidade posterior ao commit18e209b; [validação própria](../validacoes/VALIDACAO_8D2_ESTADO.md).
POST `/v1/usuarios/:usuarioId/estado` recebe `{operacaoId, versao, ativo: boolean,
justificativa}` com as mesmas restrições de UUID/versão/justificativa do perfil.
Autoativação/autoinativação proibidas; último administrador ativo protegido;
409 se estado igual ou versão obsoleta. Recibo `operacao: 'estado'`, anterior/novo
booleanos, demais campos iguais; resultado `estado_inalterado` acrescentado.
Consulta de recibo mantém endpoint/autorização; códigos globais entre os comandos.

Migration76 generaliza o armazenamento de recibos em usuario_conta_operacao,
preservando recibos existentes e wrapper SQL/API de perfil. A view de leitura
usuario_perfil_operacao conserva os consumidores antigos, filtrada por perfil. Nenhuma migration
aplicada será editada. Alteração de estado incrementa versão/geração; inativação
usa a revogação de vínculos da74 na mesma transação e reativação não os restaura.
Identidade inativa não autentica; sessão anterior permanece inválida após reativar.

UI reutiliza AlterarConta, editor administrativo/revisão/recuperação, com aviso de perda de
acesso e vínculos na inativação, e de não restauração na reativação. Justificativa
obrigatória em ambos os comandos para manter uma trilha explícita. Falhas e
recuperação seguem o perfil. Aceite: API/UI/SQL, duas versões, JWT antigo,
concorrência cruzada/perfil×estado, vínculo revogado e cancelamento sem escrita.

Recibo confirmado permite preparar explicitamente outra intenção, relendo a conta,
sem repetir a anterior. A URL inclui comando=estado para recuperar o recibo no
editor correto após login; URLs antigas de perfil sem comando permanecem válidas.
A troca entre os comandos conserva a paginação e separa rascunhos por conta/ação.
