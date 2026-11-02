# Identidade e administração — proposta 8D1D/P-08

2026-11-02, retomada da Janela 1 de M3. **Proposta não aprovada.** A unidade
8D1D e os B/U dependentes continuam bloqueados pelas decisões institucionais
abaixo. Este documento não cria capacidades, endpoints ou regras de concorrência.

Fontes normativas: [catálogo 8D1D](../frontend/ENTREGAS_DO_PRODUTO.md#8d1d),
[visão USR/CTA](../frontend/VISAO_E_ESPECIFICACAO.md#usuários-minha-conta-e-erros--usr-cta-err)
e [P-08](../frontend/VISAO_E_ESPECIFICACAO.md#decisões-de-produto-e-limites-ainda-pendentes).
O catálogo continua sendo a fonte dos critérios de aceite; este texto prepara
as respostas necessárias, sem substituí-las por uma política presumida.

## Limites já estabelecidos e implementação atual

O escopo de produto inclui listagem administrativa de nome/login/perfil/status,
perfil e ativação/inativação. A visão já exclui autoalteração de perfil,
exclusão definitiva e vinculação automática ao digitador legado. Gestão de conta
não concede vínculo clínico ou entitlement de revisão temporal por efeito lateral.

Hoje, [AuthController](../../backend/src/auth/auth.controller.ts) publica login,
`me` e verificação mínima de autorização; `me` retorna ID/nome/perfil.
[AuthService](../../backend/src/auth/auth.service.ts) resolve identidade ativa
novamente em cada requisição autenticada, por meio do guard. Não há API de
listagem ou alteração de usuários nesses arquivos. O acesso clínico atual tem
política explícita em [ClinicalAccessService](../../backend/src/common/security/clinical-access.service.ts);
o comportamento sintético do administrador não aprova acesso irrestrito a dados
reais. A política institucional futura não será inferida dos testes.

## Respostas institucionais necessárias

| Tema | Decisão a registrar | Alternativas e consequência |
| --- | --- | --- |
| Responsável pela gestão | Identificar quem autoriza e quem executa cada alteração de perfil/estado; como ocorre substituição/recuperação do responsável | Gestão por administrador designado ou fluxo institucional com aprovação separada; a segunda opção exige representação da aprovação, não apenas outro botão |
| Último administrador | Definir o conjunto protegido: por exemplo, administradores ativos e aptos a gerir identidade, e a regra de recuperação se nenhum estiver disponível | Impedir a perda do último gestor preserva continuidade; exceção de emergência exige responsável e procedimento externo explícitos, não bypass escondido na API |
| Autoações | Manter a proibição já descrita de autoalteração de perfil; decidir se a própria inativação também é vedada e como solicitar correção | Proibir a própria inativação reduz perda acidental da sessão; permitir mediante fluxo institucional exige regras de continuidade e recuperação |
| Sessão afetada | Definir efeito da alteração de perfil e da inativação sobre requisições correntes, próximas requisições e sessões abertas | A identidade já é relida por requisição; exigir novo login ao trocar perfil é requisito adicional e precisa ser aprovado antes de modelar revogação |
| Conta própria | Aprovar quais campos além de ID/nome/perfil serão publicados por `me` | Login/status próprios são candidatos do catálogo; não publicar nem deduzir estado ativo localmente antes de contrato |
| Suporte | Nomear canal institucional, responsável, horário e conteúdo da orientação | Não inventar telefone, endereço, promessa de atendimento ou fluxo de redefinição de senha |
| Auditoria | Definir ator, alvo, estado anterior/novo, motivo exigido ou opcional, consulta autorizada e retenção | Histórico mínimo e motivo institucional têm custos e escopos diferentes; nenhum deles inclui senha/hash/token em resposta ou log |
| Identidade e vínculo | Confirmar política de concessão/revogação de vínculo clínico e sua relação com mudança de perfil | Manter comandos separados evita permissões por efeito lateral; eventual coordenação requer autorização explícita e não pode herdar entitlement temporal |

As opções acima não estão selecionadas. Não se propõe permitir autoalteração de
perfil como alternativa, pois isso contraria a visão vigente. A proteção de
último administrador deve valer também quando dois comandos diferentes chegam
simultaneamente; esta é uma condição a especificar e provar após a decisão,
não um contrato de lock/versão escolhido neste documento.

## Cenários sintéticos para a decisão e validação posterior

| Situação | Pergunta/resultado que a regra aprovada deve resolver |
| --- | --- |
| Administradores sintéticos A e B ativos; A tenta inativar B | Quem pode autorizar; quais efeitos sobre a sessão de B; qual histórico é visível a A |
| B já inativo; A é o último gestor e tenta rebaixar/inativar a própria conta | Recusa e recuperação institucional explícitas, sem tornar conta comum um novo gestor automaticamente |
| A e B tentam rebaixar um ao outro com o mesmo estado inicial | A proteção deve impedir terminar sem gestor; versão obsoleta deve gerar conflito compreensível, conforme contrato posterior |
| Sessão de edição C continua aberta após sua inativação | Próxima requisição não pode continuar usando identidade inativa; definir comportamento e comunicação sobre trabalho em andamento |
| Perfil de C muda de edição para consulta enquanto há rascunho clínico | Sessão/rascunho e efeito de uma tentativa posterior de escrita devem obedecer à política aprovada, sem sobrescrever dados |
| Consulta C solicita listagem de usuários ou conta de terceiro | Não obtém listagem administrativa nem dados de identidade de terceiros; a própria conta usa somente campos publicados |

## Gate para 8D1B/U e 8D2B/U

- [ ] Responsável institucional, data e respostas a cada tema acima registrados.
- [ ] Matriz por ação/capacidade, autoações e regra de último gestor aprovadas.
- [ ] Campos de listagem e conta própria, suporte e auditoria/retenção definidos.
- [ ] Efeitos de sessão, conflitos e recuperação de resultado incerto especificados.
- [ ] Cenários sintéticos de dois gestores, revogação, três perfis e paginação
  convertidos em critérios do contrato B correspondente.

Prontidão: preparação documental disponível; **não há aceite VD nem desbloqueio
de runtime**. Não é política de produção nem liberação da Etapa 9D. Validação
documental de links não substitui aprovação ou testes dos endpoints futuros.
