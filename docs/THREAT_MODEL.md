# Threat Model Pré-Dados Reais

Atualizado em: 2026-08-31

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
migrations conserva privilégios de owner; processos de importação e futura
aplicação devem assumir roles sem ownership. GitHub Actions recebe somente código,
manifesto e fixture sintética e cria credenciais descartáveis não institucionais.

## Ameaças e controles atuais

| Ameaça | Impacto | Controles implementados | Risco residual / pendência |
| --- | --- | --- | --- |
| Planilha adulterada ou layout divergente | interpretação errada e corrupção | SHA-256, manifesto versionado, validação exata de abas/cabeçalhos, transformações fechadas e dry-run | assinatura/autoria institucional da fonte não definida |
| Identidade ambígua ou conflito entre abas | associação clínica indevida | conciliação determinística, rejeição de múltiplos candidatos, precedência documentada e métricas de conflito | revisão humana e responsável formal pendentes |
| Privilégio excessivo ou comprometimento do importador | leitura/alteração ampla, DDL ou exclusão | role sem login, sem ownership/CREATE/DELETE; DML e sequências estritamente necessários | provisionamento de login/segredo e rotação dependem do ambiente protegido |
| Aplicação futura acessando conteúdo bruto | exposição de dados sensíveis | role da aplicação sem privilégio sobre tabelas de importação | autorização por perfil/linha e API ainda não existem |
| Vazamento por logs ou CI | exposição de identificadores/conteúdo clínico | log JSON com allowlist, sem valores de célula; CI somente sintética e sem segredos reais | coleta, retenção e acesso a logs de produção não definidos |
| Dry-run persistindo dados | criação clínica antes da revisão | pipeline real dentro de transação externa com rollback; teste compara contagens antes/depois | falhas de conexão abruptas são protegidas pela atomicidade do PostgreSQL |
| Reprocessamento duplicando ocorrências | histórico clínico duplicado | hash/layout, predecessor encadeado, proveniência e reutilização idempotente | política operacional para autorizar reprocessamento pendente |
| Execução não reproduzível ou repudiável | auditoria inconclusiva | versão/hash do manifesto, versão do importador, revisão Git e hash do arquivo no lote/report | árvore Git suja não é persistida; releases assinados não definidos |
| Backup, volume ou planilha local expostos | vazamento em repouso | bind local, `.gitignore`, dumps fora do Git e proibição explícita de dados reais | criptografia, retenção, descarte, acesso institucional e backup de produção pendentes |
| SQL malformado por conteúdo de origem | alteração/injeção | literais escapados pelo adaptador, domínios fechados e role sem DDL/DELETE | migrar futuramente para driver parametrizado é recomendável antes de produção |
| Perda ou alteração de proveniência | auditoria incompleta | FKs `RESTRICT`, vínculos N:N, raw posicional e ausência de DELETE na role importadora | auditoria de acesso e detector de alvo polimórfico órfão pendentes |
| Força bruta ou enumeração no login | comprometimento de conta | resposta uniforme, bcrypt inclusive para conta ausente e limite por IP/instância | contador distribuído, proxy confiável e bloqueio adaptativo pendentes |
| Roubo ou reutilização de token | acesso até expiração | JWT HS256 curto, secret externo, token fora dos logs e usuário ativo relido | TLS e armazenamento frontend pendentes; revogação individual somente quando houver requisito de encerrar sessão específica |
| Escalada por perfil | acesso indevido | guards globais, negação por padrão, perfis explícitos e 401/403 separados | autorização por recurso/linha e auditoria institucional pendentes |
| Estado privilegiado residual no pool | consulta posterior com contexto indevido | transação por operação, `SET LOCAL ROLE/search_path`, rollback e descarte se a limpeza falhar | revisar se futuras operações multiquery exigirem unidade transacional maior |

## Decisões de risco

O hardening reduz risco técnico e operacional, mas não autoriza dados reais. A
autorização depende no mínimo de ambiente protegido, TLS, gestão de segredos,
backup/restore institucional, retenção, auditoria de acesso, responsáveis por
autorizar lotes e revisar pendências e processo formal de resposta a incidentes.

Este documento deve ser revisto ao iniciar backend, mudar o formato de entrada,
criar infraestrutura não local ou aprovar qualquer uso de dados reais.

## Revisão das Etapas 4A e 4B

O backend amplia a superfície local com HTTP e dependências Node. Controles atuais:
bind em loopback, container não-root, dependências travadas por `package-lock`,
validação de entrada, SQL parametrizado, DTO reduzido, erro sanitizado, logging sem
body e role sem DDL/proveniência. A 4B adicionou identidade independente, bcrypt,
JWT expirável, validação ativa por requisição, autorização global por perfil e
limitação básica do login. TLS, rotação institucional de secrets, revogação
individual sem caso concreto e rate limit distribuído permanecem fora do ambiente sintético.
