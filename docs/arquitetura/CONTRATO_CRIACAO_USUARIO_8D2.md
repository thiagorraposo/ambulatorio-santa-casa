# Criação e credenciais — 8D2B.3/U.3

Contrato técnico sintético de 03/11/2026. Fonte de produto: decisões 3–10 de
[Identidade/P-08](../dados/DECISOES_PRODUTO_M3_2026_11_02.md#identidade-e-gestão-de-contas--decisões-310--p-08).
Preserva [perfil e estado](CONTRATO_PERFIL_USUARIO_8D2.md).

## Criação e recuperação de resposta

Administração ativa envia `POST /v1/usuarios` com `operacaoId` UUIDv4,
`nome` aparado (3–160 caracteres), `login` (3–254, ASCII alfanumérico inicial,
seguido de alfanuméricos/ponto/sublinhado/@/mais/hífen), `perfil` explícito e
`justificativa` opcional (até 1.000 caracteres). Login é aparado e convertido para
minúsculas; índice único existente protege duplicidade inclusive concorrente.
Não cria vínculos, capacidades específicas ou associações com responsáveis legados.

201 contém `recibo`, `credencialTemporaria` e `expiraEm` somente na primeira
resposta aplicada. Credencial tem 192 bits aleatórios e categorias adicionais,
hash bcrypt custo 12. `AUTH_TEMPORARY_CREDENTIAL_HOURS` configura validade:
24 horas por padrão, intervalo positivo até 168 horas; configuração inválida
retorna ao padrão. Segredo permanece apenas em memória transitória e resposta
inicial, sem storage, recibo, auditoria ou logs. Entrega pelo administrador por
canal seguro externo, sem envio automático. Encerrar a exibição remove o campo.

Recibo inclui código, alvo textual, ator, instante, operação, resultado e
nome/login/perfil da criação. Duplicidade retorna409 e grava recibo
`login_duplicado`, sem conta criada. Código divergente retorna409.
`GET /v1/usuarios/criacoes/:operacaoId` consulta exclusivamente recibo autorizado,
sem segredo. Replay idêntico retorna recibo sem credencial. Após falha de rede,
a UI consulta somente o recibo;404 é indeterminado e não autoriza repetir.
Resultado aplicado sem segredo exige recuperação administrativa; nunca reexibição.

## Primeiro acesso e troca de senha

`POST /v1/auth/login` conserva campos e acrescenta `trocaObrigatoria: true`
somente quando necessário. Uma transação consome a credencial inicial mediante
comparação do hash e geração; logins concorrentes têm um único vencedor.
Credencial consumida, expirada ou conta inativa recebe401 sanitizado.
Sessão inicial permite apenas `GET /v1/auth/me` e `POST /v1/auth/senha`;
qualquer outra rota protegida recebe403, inclusive consultas e comandos de gestão.
Backend revalida consumo, validade, estado e geração em cada requisição.

Troca recebe `senhaAtual` e `novaSenha` (12–72 caracteres, até72 bytes UTF-8,
maiúscula, minúscula, número e símbolo). Exige bcrypt da atual e senha diferente;
CAS transacional de hash/geração impede troca sobre credencial substituída.
Atualiza hash, remove restrição e registra auditoria sem hash/segredo.
201 `{alterada:true}` invalida todos os JWT anteriores pela geração existente.
Usuário autentica novamente com a nova senha. Troca voluntária usa a mesma rota,
com verificação da senha atual. Expiração do token mantém o prazo JWT vigente.

## Recuperação administrativa

`POST /v1/usuarios/:usuarioId/credencial` recebe UUID, versão e justificativa
obrigatória de10–1.000 caracteres. Somente outra conta ativa não administrativa
pode ser recuperada; não reativa contas nem restaura vínculos. Nova credencial
substitui a anterior, reinicia prazo/uso único e revoga sessões na mesma transação.
Versão obsoleta409; alvo administrativo/inativo/ausente ou próprio403.
Recusas têm recibo. `GET /v1/usuarios/credenciais/:operacaoId` permite verificação
administrativa sem segredos. Replay não revela nova credencial. Recuperação de
administradores fica fora da aplicação, conforme decisão5; não há rota pública
ou mecanismo excepcional de infraestrutura implementado nesta unidade.

## Banco, auditoria e limites

Migration77 adiciona metadados de credencial e tabela de recibos sem segredos,
com privilégios mínimos de escrita por funções SECURITY DEFINER. Escritas
serializam no lock comum à gestão de contas, revalidando ator/geração dentro da
transação; criação/recuperação exigem READ COMMITTED. Recibo e mutação são
atômicos. Sem UPDATE/DELETE de recibos para roles de aplicação/importador/serviço.
Reversão deve revogar comandos por migration futura, preservando histórico.
Não altera dump do banco persistente; evidência incremental é a migration77 e
sua validação em PostgreSQL descartável. Retenção institucional e recuperação
excepcional de infraestrutura continuam fora deste protótipo.
