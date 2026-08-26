# Threat Model Pré-Dados Reais

Atualizado em: 2026-08-26

## Escopo e premissas

Este modelo cobre o PostgreSQL local/Docker, migrations, manifesto seguro,
importador XLSX sintético e artefatos operacionais. Backend, frontend,
autenticação da aplicação, produção, observabilidade completa e políticas
institucionais ainda não aprovadas estão fora do escopo. O ambiente continua
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

## Decisões de risco

O hardening reduz risco técnico e operacional, mas não autoriza dados reais. A
autorização depende no mínimo de ambiente protegido, TLS, gestão de segredos,
backup/restore institucional, retenção, auditoria de acesso, responsáveis por
autorizar lotes e revisar pendências e processo formal de resposta a incidentes.

Este documento deve ser revisto ao iniciar backend, mudar o formato de entrada,
criar infraestrutura não local ou aprovar qualquer uso de dados reais.
