# Identidade e administração — 8D1D/P-08

**Atualização vigente de02/11:** as [decisões de produto1–31](../dados/DECISOES_PRODUTO_M3_2026_11_02.md)
aprovam as regras sintéticas correspondentes. Perguntas e estados de aprovação
abaixo descrevem a preparação anterior e são sucedidos por essa fonte; contratos
técnicos, implementação, validação e homologação continuam separados.

Atualização documental após a avaliação humana relatada pelo responsável.
**Requisitos mínimos parcialmente definidos; política institucional e contratos
específicos pendentes.** Não é aprovação integral de 8D1D/P-08, implementação,
aceite humano de M3 ou autorização de uso de dados reais.

Fontes normativas: [catálogo 8D1D](../frontend/ENTREGAS_DO_PRODUTO.md#8d1d),
[matriz desejada de perfis](../frontend/VISAO_E_ESPECIFICACAO.md#pessoas-problemas-e-percursos),
[USR/CTA](../frontend/VISAO_E_ESPECIFICACAO.md#usuários-minha-conta-e-erros--usr-cta-err)
e [avaliação/novas decisões](../validacoes/AVALIACAO_HUMANA_EQUIPE_SANTA_CASA_M3.md).
A data exata da reunião e seu ambiente/commit não foram confirmados. A rodada
foi realizada com problemas identificados e sem aceite integral registrado.
Este documento prepara respostas e contratos, preservando o catálogo como fonte
de escopo e critérios por unidade.

## Decisões de produto já determinadas

A Frente 8D é P1, após o P0 de confirmação de atendimento e em conjunto com
cadastro/edição pelo perfil Edição e cobertura frontend. O produto inclui criar
contas, listar/consultar usuários, alterar perfis, ativar/inativar e consultar
histórico auditável. A criação é vinculada a 8D2B.3/8D2U.3 e RQ-USR-20–24; as
unidades oficiais e USR-01–19 são preservados. Não interpretar a antiga ausência
de criação no catálogo como exclusão atual desse requisito.

O responsável estabeleceu como requisitos mínimos:

- Proteger o último administrador ativo, inclusive diante de comandos concorrentes.
- Impedir autoelevação indevida e definir explicitamente autoações; a vedação
  vigente de autoalteração do próprio perfil não foi revogada por autorização
  genérica de gestão. A própria inativação ainda exige regra específica.
- Autorizar ações no backend, auditar ator/instante/resultado e tratar versões
  obsoletas/conflitos. A UI deve revisar e confirmar as operações sensíveis.
- Revalidar sessões após mudanças relevantes; conta inativada não pode manter
  acesso posterior, conforme o contrato de sessão a detalhar.
- Impedir exclusão física indevida, associação automática ao digitador legado e
  publicação de hash ou credenciais; não registrar senhas em texto puro ou logs.
- Não conceder vínculos clínicos, capacidade clínica especial, gestão temporal,
  reprocessamento ou acesso irrestrito por efeito lateral da gestão de contas.

Esses mínimos delimitam o contrato futuro; não selecionam mecanismo de lock,
versão, revogação, storage de credenciais ou fluxo de recuperação institucional.
Nenhuma exceção de emergência para perder o último administrador foi aprovada.
A prioridade permite preparar e desenvolver recortes sintéticos seguros quando
seus contratos estiverem suficientes, sem homologação institucional automática.

## Implementação atual e diferença para o requisito

[AuthController](../../backend/src/auth/auth.controller.ts) publica login,
`me` e verificação mínima de autorização; `me` retorna ID/nome/perfil.
[AuthService](../../backend/src/auth/auth.service.ts) revalida a identidade ativa
nas requisições autenticadas por meio do guard. Não há API administrativa completa
de criação/listagem/alteração/histórico de usuários nesses arquivos nem frontend
administrativo integrado. A ausência de gestão de contas foi relatada pela equipe;
essa avaliação não equivale a reprodução automática ou causa raiz de outro defeito.

O acesso clínico vigente é explícito em
[ClinicalAccessService](../../backend/src/common/security/clinical-access.service.ts).
Edição atualmente escreve com vínculo ativo e `pode_editar`; seu cadastro em
`vinculo_explicito` não foi liberado pelo código. A decisão desejada agora permite
cadastrar e editar dados cadastrais no escopo autorizado, sem poderes de gestão
ou concessão automática de vínculos. O acesso inicial para consultar/editar a
pessoa recém-criada precisa de contrato seguro; não presumir autovínculo ou
ampliar o acesso a todos os pacientes para cumprir esse percurso.

Administração dispensa vínculo individual no comportamento sintético atual;
isso não aprova política institucional de acesso irrestrito a dados reais.
Gestão de contas e gestão de vínculo clínico permanecem operações distintas.

## Pontos institucionais e técnicos ainda necessários

| Tema | Mínimo já estabelecido | Decisão/contrato ainda pendente |
| --- | --- | --- |
| Responsabilidade | Administração é o perfil de gestão de contas; Consulta/Edição não o exercem | Responsável institucional, delegação/recuperação do gestor e eventual aprovação separada por ação |
| Último administrador | Nenhuma alteração pode eliminar o último administrador ativo | Mecanismo transacional/concorrência e recuperação institucional; provar dois comandos sobre a mesma baseline sem escolher algoritmo por este documento |
| Autoações | Sem autoelevação indevida; vedação vigente de alterar o próprio perfil preservada | Regra de auto-inativação e demais autoações, confirmação e encaminhamento institucional |
| Identidade e duplicidade | Campos aprovados, perfil inicial explícito, prevenção de conta duplicada e confirmação/releitura | Dicionário e validação de campos, identificador único/normalização, filtros autorizados e resposta sanitizada de duplicidade |
| Credenciais/provisionamento | Mecanismo seguro; sem senha em texto puro, logs/documentos, hashes ou credenciais na resposta | Forma institucional de provisionar/definir credenciais, canal, expiração, ativação inicial e recuperação; não criar conta com credencial insegura para demonstrar UI |
| Sessão afetada | Revalidação após mudança relevante e recusa de acesso posterior à inativação | Efeito em requisições em andamento, tokens/sessões abertas, rascunhos e necessidade de novo login após mudança de perfil |
| Consulta e conta própria | Listagem paginada, busca/filtros e detalhes mínimos autorizados; `me` atual preservado | Campos além de ID/nome/perfil, capacidades por leitura e informações que não podem aparecer a terceiros |
| Auditoria | Ator, instante, alvo e resultado; histórico das operações de contas | Estado anterior/novo, motivo obrigatório ou opcional, consulta autorizada e retenção institucional; nunca senha/hash/token |
| Suporte | Orientação institucional real quando publicada | Canal, responsável, horário e procedimento; não inventar contato ou promessa de atendimento |
| Recuperação de escrita | Confirmação explícita, conflito compreensível e consulta de resultado antes de repetir envio incerto | Contrato de versão/recibo por ação; IDs seguros, retenção e tratamento de nova sessão |
| Identidade e vínculo | Gestão de conta não concede acesso clínico/temporal por efeito lateral | Contrato de acesso inicial ao paciente criado por Edição e política de concessão/revogação por ação autorizada, sem autovínculo presumido |

## Cenários sintéticos e critérios posteriores

| Situação | Resultado a especificar e demonstrar no contrato B/U |
| --- | --- |
| Administrador cria conta sintética C com os campos aprovados e perfil inicial | Confirmação real, consulta da conta criada, histórico e provisionamento seguro; repetição não cria conta duplicada |
| Consulta/Edição tenta criar, listar administrativamente ou alterar conta de terceiro | Backend recusa; UI não oferece capacidade; sem retorno de credencial ou identidade não autorizada |
| Administradores A e B ativos; A altera perfil/inativa B | Revisão original→novo, versão, confirmação, auditoria e efeito de sessão reais |
| A é o último administrador ativo e tenta rebaixar/inativar a própria conta | Proteção preservada e regra explícita de autoação, sem tornar conta comum um novo gestor automaticamente |
| A e B tentam rebaixar um ao outro com o mesmo estado inicial | Não terminar sem administrador ativo; conflito de versão/concorrência compreensível e recuperação conforme contrato posterior |
| Sessão de C está aberta durante inativação ou mudança para Consulta | Próximas operações revalidadas; não continuar escrevendo com autorização antiga nem expor rascunho a outra identidade |
| Resposta se perde após criação ou alteração de conta | Resultado incerto, sem segundo POST/PATCH cego; verificação autorizada distingue confirmado de não determinado |
| Edição cadastra paciente sob a nova política | Pode consultar e editar o cadastro permitido dentro do contrato inicial aprovado; não ganha vínculo automático, acesso global ou gestão de contas |

## Gate de prontidão por recorte

| Situação | Estado |
| --- | --- |
| Prioridade P1, matriz desejada dos perfis e requisitos mínimos de segurança | Determinados pelo responsável; registrados como requisito de produto |
| Política institucional completa, campos/capacidades, credenciais e suporte | Pendentes; não presumir aprovação |
| Contratos B de consulta, perfil, estado, criação e histórico | Inspeção/especificação necessárias por recorte; não escolher concorrência/permissão implicitamente |
| Frontend administrativo completo e integração real | Planejados; listas/formulários/estados/erros/conflitos/recibos/responsividade/acessibilidade exigidos pelo workflow |
| Testes técnicos e comparação visual | Não executados por esta atualização exclusivamente documental |
| Aceite VD, homologação institucional, aceite 8V2 ou conclusão de M3 | Não registrados |

Para liberar uma unidade independente, documentar seu contrato e os gates
específicos satisfeitos; um ponto institucional bloqueado não bloqueia outras
folhas elegíveis. Não marcar o agregado 8D pronto apenas por backend, rascunho
visual ou requisitos mínimos escritos. Regras permanentes de conclusão no
[workflow](../WORKFLOW_DE_DESENVOLVIMENTO.md); escopo/aceites no catálogo.

## Incremento independente — leitura mínima de 02/11

[Contrato de leitura](CONTRATO_LEITURA_USUARIOS_8D1B.md) delimita listagem e consulta individual no recorte
ID/nome/perfil para Administração, sem publicar login/estado ou comandos.
[Prova B/U](../validacoes/VALIDACAO_8D1_LEITURA_MINIMA.md) inclui paginação real,
negação/revalidação de perfis, API/PostgreSQL/navegador e comparação renderizada.
A ausência de API administrativa completa descrita acima permanece verdadeira;
essa evidência sucede listagem e consulta individual mínimas. Campos adicionais,
busca/filtros, histórico, criação, perfil e estado mantêm seus contratos pendentes.
Não é aprovação integral da política institucional ou das unidades agregadas.
