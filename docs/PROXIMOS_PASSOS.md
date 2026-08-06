# Próximos Passos

Atualizado em: 2026-08-06

## Escopo confirmado do MVP

- importar somente `Pacientes portadores de DC` e
  `Pacientes não portadores de DC`;
- tratar cada linha como atendimento e reconciliar pacientes por nome/data de
  nascimento, sem merge automático de conflitos;
- manter as 25 primeiras tabelas como núcleo indispensável e reutilizar os módulos
  de avaliação clínica, notificação e proveniência já aplicados;
- deixar a aba operacional, as abas AIM3 e campos parcialmente estruturados não
  críticos no backlog;
- manter `Localizado` apenas no conteúdo bruto enquanto sua semântica não existir.

A fonte detalhada das decisões é
`docs/DECISOES_HUMANAS_NOVA_PLANILHA.md`.

## 1. Especificar migrations mínimas

1. Exame com paciente obrigatório e atendimento opcional, mantendo múltiplas
   ocorrências e resultados textuais.
2. Tratamento BZN por paciente, no máximo um, com duração cumprida em dias, ano
   aproximado, prescrição, tratamento pelo ambulatório e reações adversas
   detalhadas/repetíveis.
3. Encaminhamento com documento apresentado e projeto oficial opcional.

As migrations serão incrementais e não devem alterar scripts já aplicados.

## 2. Formalizar manifesto e regras de importação

1. Configuração distinta por aba, posição, ocorrência, bloco e tipo.
2. Precedência de portadores em conflito entre abas.
3. Coluna ausente e célula vazia como não informado.
4. Normalização de booleanos, datas `dd/mm/aaaa`, anos e NYHA.
5. Conversão documentada de altura: metros × 100 para centímetros.
6. Identificação de paciente sem mesclar candidatos conflitantes.
7. Criação de um atendimento por linha válida.
8. Responsável pela digitação preservado como legado, sem vínculo automático.
9. Campos ambíguos somente no JSONB bruto.
10. Reprocessamentos como novos lotes encadeados, sem sobrescrever histórico.

## 3. Resolver bloqueios para dados reais

1. Prazo institucional de retenção.
2. Responsável por autorizar importações.
3. Responsável por revisar erros e contradições.
4. Roles e privilégios operacionais.
5. Política de auditoria e acesso ao JSONB.
6. Semântica de `Localizado`, somente se incluído no MVP.
7. Servidor protegido, transporte seguro, segredos, backup/restauração e registro
   de acesso.

## 4. Implementar e homologar

1. Implementar e testar as migrations com dados sintéticos.
2. Implementar o importador somente depois das migrations e do manifesto.
3. Criar planilha sintética para testar repetição de pacientes, conflitos de abas,
   múltiplos exames, falhas de projetos, tratamento e reprocessamento.
4. Validar idempotência, retomada, rejeições e rastreabilidade.
5. Homologar carga controlada em servidor seguro antes da carga real completa.

## 5. Backlog permitido

- prontuário permanente opcional, enquanto não houver identificador na fonte;
- data própria da complicação quando o atendimento não bastar;
- múltiplas contrarreferências;
- autorrelato, exame de familiares, idade original e separação avançada de
  pendência/observação;
- vínculo entre responsável legado e usuário autenticado;
- constraints adicionais de unidades e NYHA;
- aba operacional e fluxo AIM3;
- API e frontend além do mínimo necessário à operação segura do servidor.

## Validação padrão

Executar `make project-check`. Se o PostgreSQL estiver indisponível, registrar a
limitação e executar `make docs-check` e `git diff --check`.
