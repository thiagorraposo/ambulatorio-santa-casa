# Próximos Passos

Atualizado em: 2026-08-25

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

## 2. Contrato do importador sintético concluído

O manifesto físico e as regras operacionais foram reconciliados em
`manifestos/planilha_ambulatorio_v1.json` e
`docs/ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md`. Destinos de contexto, aliases e
duração de BZN estão fechados. As onze coberturas parciais possuem regra
determinística de preservação bruta e não bloqueiam o importador sintético.

## 3. Resolver bloqueios para dados reais

1. Prazo institucional de retenção.
2. Responsável por autorizar importações.
3. Responsável por revisar erros e contradições.
4. Roles e privilégios operacionais.
5. Política de auditoria e acesso ao JSONB.
6. Servidor protegido, transporte seguro, segredos, política institucional de
   backup/retenção e registro de acesso. O restore Docker validado cobre apenas
   desenvolvimento e não substitui esses controles de produção.

## 4. Homologação sintética concluída

Os handlers dos módulos estruturados, os 124 destinos plenos e dois elos de
reprocessamento foram homologados com dados exclusivamente sintéticos. O próximo
passo técnico-operacional é homologar carga controlada em servidor seguro, após
resolver todos os bloqueios institucionais para dados reais.

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
