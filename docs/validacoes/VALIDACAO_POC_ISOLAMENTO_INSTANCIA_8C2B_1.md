# PoC sintética de instância isolada — 8C2B.1

2026-11-02. **Recorte técnico aprovado, sem integração H14 ou conclusão de
C2B.1.** Implementa parte dos [critérios da proposta de isolamento](../arquitetura/PROPOSTA_ISOLAMENTO_DRY_RUN_8C2B_1.md#critérios-de-saída-do-próximo-incremento).

## Reprodução e fronteira

```bash
TMPDIR=/dev/shm python3 tests/importador/test_isolamento_instancia_sintetica.py
```

O [harness](../../tests/importador/test_isolamento_instancia_sintetica.py) exige
usuário não root e binários PostgreSQL 16 em `/usr/lib/postgresql/16/bin`.
Não recebe endpoints externos, não lê `.env` e limpa configuração PostgreSQL
herdada. Cria dois clusters `initdb` próprios em um diretório temporário, com
portas altas livres distintas e sockets locais próprios. Nunca usa clusters
existentes. Todos os dados são sintéticos; dump, roles, senhas efêmeras distintas,
planilhas e relatórios ficam apenas nesse diretório. `finally` encerra ambos
os clusters e remove os arquivos; falha de inicialização também tenta encerrar
exclusivamente o diretório recém-criado. Sem migration ou runtime alterados.

Supervisor conecta por socket local; TCP exige SCRAM, sem regra `trust`.
O login do worker existe apenas no isolado e recebe somente
`ambulatorio_importador`, sem superusuário, CREATEDB, CREATEROLE, replicação,
BYPASSRLS ou propriedade de objetos. A prova verifica atributos/membership e
recusas reais de `SET ROLE` para supervisor, `CREATE DATABASE` e conexão TCP à
origem com a credencial do worker. O supervisor administra os próprios clusters;
sua credencial não é entregue ao worker.

## Estado e comparações

A origem aplica migrations 02–73 e reutiliza a regressão F13 do importador real
para produzir identidade existente, proveniência, eventos de captura e correção
temporal aprovada de `2026-01-01` para `2026-01-02`. A regressão também demonstra a
recusa do reprocessamento da fonte superada antes do snapshot. O harness prepara
um lote interrompido, com quatro linhas, sem processá-lo: nascimento inválido,
identidade já existente, referência a catálogo ausente e identidade nova.

`pg_dumpall --roles-only` e `pg_dump -Fc`/`pg_restore --exit-on-error` copiam
exclusivamente esse estado sintético. O PostgreSQL 16 exige preservar a
identidade bootstrap do grantor de memberships: no clone, uma role administrativa
transitória renomeia o bootstrap para o nome original e recria o supervisor
separado; depois é removida. Filtra-se somente o `CREATE ROLE` já existente,
com assertiva de exatamente uma ocorrência. `ALTER ROLE` e `GRANTED BY` são
restaurados sem reescrita. O worker não recebe essas roles administrativas.

A PoC compara dados/sequências iniciais, owners, ACLs efetivas, atributos de
colunas/defaults, funções, triggers de aplicação habilitados, atributos de roles,
memberships/grantors, privilégios padrão e inventário/flags de constraints.
ACL owner-only explícita e ACL `NULL` são comparadas usando `acldefault`, sem
alterar permissões. O restore preserva CHECKs; expressões CHECK não são comparadas
textualmente, pois o deparser PG16 distribui casts de arrays de maneira diferente
após restore. Não se apresenta essa comparação como equivalência formal de todas
as expressões. Triggers internos de FKs são recriados pelo restore; suas
constraints são comparadas, sem exigir igualdade de nomes internos com OIDs.

A cada execução relevante, fingerprints de todas as **61 tabelas e 54 sequências**
da origem permanecem iguais ao baseline, incluindo captura prospectiva.
A PoC também verifica ausência de tabelas/sequências de usuário fora do schema
`ambulatorio`. O clone é restaurado do mesmo snapshot antes de comparar:

- Mesmo worker de produção em `--dry-run` e aplicação normal: relatórios iguais,
  exceto `mode`; quatro linhas, três importáveis, uma pendência de catálogo e
  uma rejeição por `data_invalida`. Constraints diferidas estão presentes;
  aplicação normal confirma suas transações. Nenhuma regra clínica foi adaptada.
- A identidade existente não duplica e a ocorrência corrigida mantém
  `2026-01-02`. O dry-run avança sequências **apenas no clone**, tornando
  observável a lacuna do rollback sem afetar a origem.
- No-op de conteúdo conhecido preserva todas as tabelas/sequências do clone;
  reprocessamento usa o mesmo worker e a finalidade `mesmo_conteudo`.
- Endpoint indisponível recusa a execução sem relatório/fallback. Cancelamento
  encerra o grupo worker/psql enquanto ele aguarda lock de tabela **do clone**;
  a origem é verificada durante a contenção e após o cancelamento.

Validação: comando acima aprovado com PostgreSQL 16.15; log volátil em
`/tmp/m3-poc-isolamento-execucao.log`. Revisão de diff e compilação Python do
harness também executadas. Na retomada de estabilização, revisão independente
e reexecução em tmpfs com o comando acima passaram, exit0, preservando61 tabelas
e54 sequências. Log `/tmp/m3-estabilizacao-poc-review-tmpfs.log`; diretórios
temporários removidos e ambos os clusters exclusivos encerrados. Use `TMPDIR`
explícito para manter os dados dos clusters em memória. O teste não depende
de banco persistente, Docker, credenciais reais ou serviço remoto.

## Limites e próximos critérios

Não é supervisor de produção: não prova TTL/quotas, confinamento do sistema
operacional, limpeza após SIGKILL do supervisor, autorização/minimização de
estado real, coleta consistente diante de escritores da origem ou confirmação
posterior sobre versão concorrente. Os processos compartilham usuário local;
a separação de credenciais TCP não constitui sandbox contra código hostil
capaz de acessar sockets/arquivos administrativos do mesmo usuário.

Erro operacional aqui é indisponibilidade de conexão; cancelamento ocorre na
espera de lock anterior ao processamento, não em todos os pontos após DML.
Não foi induzida uma violação diferida distinguindo savepoint de COMMIT, nem
comparadas simulação/aplicação em todos os caminhos de revisão, concorrência e
reprocessamento. A igualdade dos relatórios vale para este estado discriminante,
sem generalizar equivalência transacional. Faltam esses testes, o supervisor
autorizado e a integração H14 antes de concluir C2B.1. Dados reais, aceite humano
e decisões de produto continuam fora deste recorte.
