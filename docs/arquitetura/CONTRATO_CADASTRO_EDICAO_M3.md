# Cadastro integrado por Edição — decisões 1–2

Contrato técnico de03/11, fonte de produto:
[decisões1–2](../dados/DECISOES_PRODUTO_M3_2026_11_02.md#cadastro-e-acesso-por-edição--decisões-1–2).
Escopo: 7A-U1/7D-R6B.1/U.1, HUM-M3-01/02. Sem aceite humano.

Objetivo e critérios: Edição cadastra pela busca prévia e API real, recebe acesso
somente ao recém-criado, relê/edita seu cadastro e registra atendimento. Consulta
continua sem escrita; pacientes não vinculados permanecem recusados. Administração
mantém concessão/revogação exclusiva dos demais vínculos. Validar persistência,
PATCH versionado, revogação, recuperação e estados de carga/erro/vazio existentes.

GET /pacientes/capacidades passa a retornar podeCadastrar=true para Edição nas
políticas habilitadas. POST /pacientes conserva DTO, retorno e recibo de operação;
PATCH /pacientes/:id conserva whitelist, versão, auditoria e conflitos. Nenhuma
rota nova. Formulário existente informa o vínculo e mantém busca prévia limitada
ao escopo autorizado, sem afirmar inexistência global ou deduplicar homônimos.

Migration74 adiciona gatilho AFTER INSERT: somente contexto confiável de aplicação
com ator Edição ativo gera vínculo editável e evento com ator/principal. Paciente,
contatos/endereço, auditoria, vínculo e recibo pertencem à mesma transação; falha
em qualquer parte desfaz tudo. Não usa função administrativa nem permite escolher
outro paciente/usuário. Cadastro administrativo/importação não gera vínculo.
Sem backfill e sem permissão SQL direta adicional à role operacional.

A criação do vínculo bloqueia a linha do ator FOR SHARE em função restrita,
serializando com inativação. A função administrativa existente também bloqueia
a identidade alvo antes da concessão, impedindo vínculo ativo após inativação
concorrente. Perda da identidade durante criação retorna401 sanitizado. Inativação revoga fisicamente os vínculos ativos,
registrando eventos; reativação não os restaura. Nova concessão exige Administração.
Eventos de infraestrutura registram principal_db e ator nulo quando não há contexto
confiável de aplicação; eventos antigos preservam seus atores, sem backfill de
principal. Essa mudança aditiva interna não altera payloads HTTP. Gestão de contas
8D e fila administrativa de atribuição continuam unidades próprias pendentes.

Validação: migration limpa e testes SQL transacionais; backend/HTTP e navegador
com PostgreSQL descartável; comparação visual proporcional do formulário existente.
A evidência física aplicada permanece no dump vigente até atualização explicitamente
necessária; migration74 descreve a evolução validada apenas nos bancos descartáveis.
