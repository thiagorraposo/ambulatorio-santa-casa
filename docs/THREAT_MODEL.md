# Modelo de ameaças e riscos residuais

Avaliação de origem: 2026-09-22. Organização revisada em: 2026-10-23.

## Leitura vigente e limite da avaliação

A política obrigatória está em [segurança de dados](SEGURANCA_DE_DADOS.md).
Este documento preserva a matriz de riscos de 22/09; as afirmações “pendente”
ou “não implementado” abaixo descrevem aquela avaliação e não são um inventário
atual de funcionalidades. Revisão temporal, autorização clínica, frontend e
recuperação de operações evoluíram depois dela; consulte a
[arquitetura](ARQUITETURA_BACKEND.md), o [frontend](FRONTEND.md), o
[protocolo de recuperação](arquitetura/RECUPERACAO_OPERACOES_ETAPA_7.md) e os
[aceites](validacoes/VALIDACAO_ETAPA_7.md) para os controles efetivamente comprovados.

A inclusão de upload/gestão/fluxos completos no roadmap não implementa controles.
Reavaliar ameaças e riscos residuais por módulo e antes da liberação 9D, incluindo
transporte, identidade, segredos, anexos, retenção e operação institucional.
Esta reorganização não é nova auditoria de segurança nem aceite desses controles.

## Avaliação histórica de 22/09/2026

As seções seguintes são preservadas no contexto dessa data.

## Escopo e premissas

Este modelo cobre o PostgreSQL local/Docker, migrations, manifesto seguro,
importador XLSX sintético, backend local e autenticação mínima. Frontend,
produção, observabilidade completa e políticas institucionais estão fora do escopo. O ambiente continua
autorizado exclusivamente para dados sintéticos.

## Ativos

- conteúdo clínico e identificadores que futuramente existam no PostgreSQL;
- `importacao_linha.dados_brutos` e valores originais de proveniência;
- integridade e disponibilidade do schema, catálogos e registros clínicos;
- manifesto v1, código do importador e cadeia Git usada na execução;
- credenciais locais, backups, volumes Docker, relatórios e logs;
- rastreabilidade de lote, linha, reprocessamento e registro promovido.

## Fronteiras de confiança e agentes

O arquivo XLSX é entrada não confiável. O importador valida estrutura e valores
antes de promover registros. PostgreSQL é a fronteira persistente. O operador de
migrations conserva privilégios de owner; importador e backend usam roles sem
ownership. GitHub Actions recebe somente código,
manifesto e fixture sintética e cria credenciais descartáveis não institucionais.

## Ameaças e controles atuais

| Ameaça | Impacto | Controles implementados | Risco residual / pendência |
| --- | --- | --- | --- |
| Planilha adulterada ou layout divergente | interpretação errada e corrupção | SHA-256, manifesto versionado, validação exata de abas/cabeçalhos, transformações fechadas e dry-run | assinatura/autoria institucional da fonte não definida |
| Identidade ambígua ou conflito entre abas | associação clínica indevida | conciliação determinística, rejeição de múltiplos candidatos, precedência documentada e métricas de conflito | revisão humana e responsável formal pendentes |
| Privilégio excessivo ou comprometimento do importador | leitura/alteração ampla, DDL ou exclusão | role sem login, sem ownership/CREATE/DELETE; DML e sequências estritamente necessários | provisionamento de login/segredo e rotação dependem do ambiente protegido |
| Aplicação acessando conteúdo bruto | exposição de dados sensíveis | role da aplicação sem privilégio sobre tabelas de importação; API mínima e RBAC já existem | autorização por recurso/linha e auditoria de acesso pendentes; não criar exposição genérica de JSONB |
| Vazamento por logs ou CI | exposição de identificadores/conteúdo clínico | log JSON com allowlist, sem valores de célula; CI somente sintética e sem segredos reais | coleta, retenção e acesso a logs de produção não definidos |
| Dry-run persistindo dados | criação clínica antes da revisão | pipeline real dentro de transação externa com rollback; teste compara contagens antes/depois | falhas de conexão abruptas são protegidas pela atomicidade do PostgreSQL |
| Reprocessamento duplicando ocorrências ou mantendo pendência resolvível | histórico duplicado ou desatualizado | hash/layout, predecessor encadeado, proveniência, reutilização e promoção D11; v1.4.0 exige finalidade e lote do mesmo conteúdo para reprocessar | declaração indevida de carga inicial ainda pode duplicar visita; mapeamento e auditoria entre hashes não implementados; outras dez promoções pendentes |
| Revisão da fonte sobrescrevendo edição manual ou usando decisão obsoleta | perda de histórico e alteração clínica indevida | v1.4.0 recusa revisão e finalidade ausente/ambígua antes de escrita, inclusive em dry-run; E2E compara todas as tabelas e sequências | declaração de finalidade não prova identidade clínica; implementar comparação base/atual/proposta, história por campo, decisão atribuível e proteção concorrente antes de habilitar revisões |
| Erro secundário descartando atendimento válido ou confirmação parcial indevida | perda de dado válido ou inconsistência clínica | v1.3.0 mantém rollback como padrão; somente catálogo de projeto ausente está em allowlist não crítica, com bruto, mensagem técnica, proveniência e nova tentativa seletiva | demais handlers exigem classificação individual; falha operacional e divergência consolidada continuam críticas |
| BZN repetido em linhas do mesmo paciente | violação de unicidade ou sobrescrita indevida | v1.1.1 consulta por paciente, bloqueia tratamento existente, reconcilia nulos/igualdades e rejeita divergências com rollback; unicidade física preservada | concorrência na primeira criação por executores distintos não homologada |
| Execução não reproduzível ou repudiável | auditoria inconclusiva | versão/hash do manifesto, versão do importador, revisão Git e hash do arquivo no lote/report | árvore Git suja não é persistida; releases assinados não definidos |
| Backup, volume ou planilha local expostos | vazamento em repouso | bind local, `.gitignore`, dumps fora do Git e proibição explícita de dados reais | criptografia, retenção, descarte, acesso institucional e backup de produção pendentes |
| SQL malformado por conteúdo de origem | alteração/injeção | literais escapados pelo adaptador, domínios fechados e role sem DDL/DELETE | migrar futuramente para driver parametrizado é recomendável antes de produção |
| Perda ou alteração de proveniência | auditoria incompleta | FKs `RESTRICT`, vínculos N:N, raw posicional e ausência de DELETE na role importadora | auditoria de acesso e detector de alvo polimórfico órfão pendentes |
| Força bruta ou enumeração no login | comprometimento de conta | resposta uniforme, bcrypt inclusive para conta ausente e limite por IP/instância | contador distribuído, proxy confiável e bloqueio adaptativo pendentes |
| Roubo ou reutilização de token | acesso até expiração | JWT HS256 curto, secret externo, token fora dos logs e usuário ativo relido | TLS e armazenamento frontend pendentes; revogação individual somente quando houver requisito de encerrar sessão específica |
| Escalada por perfil | acesso indevido | autenticação global, `@Perfis` nas operações delimitadas e 401/403 separados | sem `@Perfis`, o guard de perfis permite usuário autenticado; exigir matriz explícita nos módulos clínicos, autorização por recurso/linha e auditoria |
| Estado privilegiado residual no pool | consulta posterior com contexto indevido | transação por chamada de consulta, `SET LOCAL ROLE/search_path`, rollback e descarte se a limpeza falhar | escrita clínica com várias consultas exige unidade transacional maior |

## Decisões de risco

O hardening reduz risco técnico e operacional, mas não autoriza dados reais. A
autorização depende no mínimo de ambiente protegido, TLS, gestão de segredos,
backup/restore institucional, retenção, auditoria de acesso, responsáveis por
autorizar lotes e revisar pendências e processo formal de resposta a incidentes.

Este documento deve ser revisto ao adicionar módulos clínicos, mudar o formato de
entrada, introduzir upload, criar infraestrutura não local ou aprovar qualquer
uso de dados reais.

## Evolução de contrarreferência e arquivos

D10 confirma multiplicidade e importância do upload, mas não define sua entrega
no MVP nem a arquitetura de armazenamento. Ao especificar anexos, prever acesso
privado e autorizado por recurso, limites de tamanho/tipo, tratamento seguro de
conteúdo, auditoria e retenção/descarte institucionais. Não criar bucket público,
expor caminhos internos ou incluir documentos reais em fixtures. São requisitos
de análise da evolução, não controles de upload já implementados.

A [matriz de impacto](dados/COBERTURA_COLUNAS_PLANILHA.md) e o
[roadmap](PROXIMOS_PASSOS.md) registram os contratos ainda pendentes, inclusive
preservação do histórico e proibição de inventar datas a partir do ano legado.

## Revisão das Etapas 4A e 4B

O backend amplia a superfície local com HTTP e dependências Node. Controles atuais:
bind em loopback, container não-root, dependências travadas por `package-lock`,
validação de entrada, SQL parametrizado, DTO reduzido, erro sanitizado, logging sem
body e role sem DDL/proveniência. A 4B adicionou identidade independente, bcrypt,
JWT expirável, validação ativa por requisição, autorização global por perfil e
limitação básica do login. TLS, rotação institucional de secrets, revogação
individual sem caso concreto e rate limit distribuído permanecem fora do ambiente sintético.
