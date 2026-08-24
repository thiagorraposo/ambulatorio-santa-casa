# Próximos Passos

Atualizado em: 2026-08-13

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

## 2. Especificar regras do importador a partir do manifesto v1

O manifesto físico foi concluído em `manifestos/planilha_ambulatorio_v1.json`.
Restam as regras operacionais abaixo antes de implementar o importador sintético:

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
7. Servidor protegido, transporte seguro, segredos, política institucional de
   backup/retenção e registro de acesso. O restore Docker validado cobre apenas
   desenvolvimento e não substitui esses controles de produção.

## 4. Implementar e homologar

1. Implementar o importador somente depois de especificar identificação,
   conflitos, idempotência e retomada a partir do manifesto v1.
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
