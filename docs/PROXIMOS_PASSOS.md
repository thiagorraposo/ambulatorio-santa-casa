# Próximos Passos

Atualizado em: 2026-08-24

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

## 1. Migrations mínimas concluídas

1. Tratamento BZN e reações adversas: implementados e validados por
   `sql/15_tratamento_benzonidazol.sql` e pelo teste SQL correspondente.
2. Encaminhamento ampliado: implementado por
   `sql/16_encaminhamento_ampliado.sql` e validado nos 23 cenários previstos.

As quatro evoluções mínimas do MVP estão implementadas. Evoluções posteriores
continuarão incrementais e não alterarão scripts já aplicados.

## 2. Resolver bloqueios delimitados da especificação do importador

O manifesto físico e as regras operacionais foram consolidados em
`manifestos/planilha_ambulatorio_v1.json` e
`docs/ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md`. Antes da implementação completa,
resta resolver os bloqueios classificados nessa especificação:

1. Corrigir ou confirmar os dois destinos de contexto ambulatorial no manifesto.
2. Fechar mapeamentos `parcial`, aliases de domínios e unidades textuais de BZN.
3. Definir o fluxo humano de revisão antes de qualquer dado real.

## 3. Resolver bloqueios para dados reais

1. Prazo institucional de retenção.
2. Responsável por autorizar importações.
3. Responsável por revisar erros e contradições.
4. Roles e privilégios operacionais.
5. Política de auditoria e acesso ao JSONB.
6. Semântica de `Localizado`, somente se incluído no MVP.
7. Servidor protegido, transporte seguro, segredos, política institucional de
   backup/retenção e registro de acesso. O restore Docker validado cobre apenas
   desenvolvimento e não substitui esses controles de produção.

## 4. Implementar e homologar

1. Implementar primeiro o importador sintético limitado aos mapeamentos fechados,
   seguindo a especificação normativa v1 e recusando promoções pendentes.
2. Criar planilha sintética para testar repetição de pacientes, conflitos de abas,
   múltiplos exames, falhas de projetos, tratamento e reprocessamento.
3. Validar idempotência, retomada, rejeições e rastreabilidade.
4. Homologar carga controlada em servidor seguro antes da carga real completa.

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
