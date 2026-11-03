# Simulação XLSX com totais e códigos — recorte 8C2U.1

2026-11-02, continuação da Janela1; backend1c0f6a2 e diff próprio da interface.
Recorte VALIDADO TECNICAMENTE. Integração do [relatório básico H14](../arquitetura/CONTRATO_RELATORIO_IMPORTACAO_8C2B_1.md)
na simulação existente. Não libera confirmação8C2U.2, metadados ampliados de
P-05, relatório rico integral8C2U.3 ou conflitos8C2U.4. Escopo e dependências
continuam no [catálogo](../frontend/ENTREGAS_DO_PRODUTO.md#8c2u).

## Comportamento

Depois da resposta real de simulação, a interface exibe total de linhas,
importáveis sem pendência, com pendência e rejeitadas, mais quantidade de
ocorrências por código fechado e rótulo legível. As categorias são disjuntas e
somam o total. No no-op, o texto explica que os números descrevem o lote
existente, com seu código/ID efetivo, sem prometer novas gravações.

O cliente valida presença/tipo do relatório, inteiros seguros não negativos,
soma das categorias, vocabulário fechado, códigos sem duplicata/zero e soma de
ocorrências. Resposta ausente/inconsistente não anuncia sucesso ou zeros nem
mostra códigos/texto arbitrários. Zero explícito válido é exibido normalmente.
Arquivo/finalidade/código alterados invalidam o resultado, conforme o fluxo U.1
já vigente. A interface informa que a simulação não salva os registros da
planilha, mas pode avançar a numeração interna; não afirma ausência total de
efeitos. Não há botão de confirmação ou novo POST efetivo nesse fluxo.

## Evidências proporcionais

- 18 unitários dirigidos aprovados em ImportacaoSimulacaoPage.test.tsx,
  incluindo contagens6/3/2/1, relatório ausente/inconsistente, código arbitrário,
  duplicata, soma inválida, zero e no-op. Comando: `cd frontend && npm run
  test:unit -- src/features/importacoes/ImportacaoSimulacaoPage.test.tsx`.
- `make frontend-build COMPACT=1` aprovado,
  /tmp/ambulatorio-check-nt9lop23/output.log.
- Quatro regressões E2E existentes de U.1 aprovadas em composição dirigida:
  simulação única/sem persistência de registros, consulta sem formulário,
  XLSX adulterado recusado e perda de resposta sem reenvio/falso sucesso.
  /tmp/etapa6-frontend-PRuLym/results.json.
- Dois cenários novos aprovados em4.4s em/tmp/etapa6-frontend-rJ26GX:
  XLSX sintético com6linhas,3sem pendência,2com pendência e1rejeitada por data
  de atendimento inválida; API real retorna os códigos data_invalida1 e
  pendencia_nao_promovida2 e a UI reproduz os valores. No-op de mesmo conteúdo
  aponta ao lote original, com código solicitado diferente; lote relido pela
  API e números preservados. A aplicação efetiva usada somente no setup do
  segundo cenário ocorreu no banco exclusivo descartável do runner; não existe
  confirmação da importação na interface. Primeiro cenário cobre Axe e320px.

Ambiente conferido por identidade antes de cada execução: container exclusivo
ambulatorio-avc-interacoes-20261101, PostgreSQL16.15 tmpfs localhost55457.
Runners próprios usam portas6063/4178, migrations02–73 e bancos/logins aleatórios,
removidos no término. Arquivos/dados exclusivamente sintéticos. Nenhuma conexão
ou escrita no banco persistente. Logs /tmp são voláteis; resumo durável aqui.

## Defeito encontrado e preservado

A primeira fixture usava nascimento inválido na linha rejeitada: dry-run retornou
400, enquanto aplicação efetiva do mesmo arquivo retornou relatório6/3/2/1.
Não foi uma expectativa de teste relaxada. A investigação identificou leitura
do nascimento antes do savepoint da linha e tentativa de rollback sem savepoint
no adaptador rollback_only. Evidência inicial:
/tmp/etapa6-frontend-PRuLym/results.json. O gerador agora permite as duas falhas:
data de atendimento inválida ou opção --nascimento-invalido. Um terceiro cenário
E2E específico preserva a reprodução de nascimento inválido. A correção Python
estabelece o savepoint antes dessa validação e recusa comandos de encerramento
sem savepoint no modo rollback_only. Após a correção, os3novos E2E passaram
em5.6s, /tmp/etapa6-frontend-zHGtXK/results.json: as duas falhas de data e o no-op
retornam os totais/códigos corretos na API e na UI. A prova do adaptador e dos
efeitos em tabelas pertence ao relatório específico da correção do importador;
esta prova da interface não garante ausência de avanço de sequências.

## Comparação visual

Referência Imports.tsx renderizada no servidor local8445: login administrativo
sintético → Importações → Nova importação → Validar e simular → Relatório.
Confronto1440/320px verifica os totais e sua hierarquia, a explicação da
simulação e os estados do resultado. A aplicação mantém o formulário de seleção
junto do relatório básico; a referência apresenta etapas separadas, cards,
logs/fatos fixos, indicadores de conflito e botão de confirmação. A adaptação
usa somente resposta H14, rótulos/totais reais e códigos fechados, sem copiar
logs, indicadores ou controle de confirmação ainda bloqueados. O aviso de
efeitos da simulação é mais restrito que o texto do protótipo. Não houve aceite
humano ou conclusão visual integral8V1.

Capturas confrontadas: aplicação [1440px](../frontend/visuais/importacao-relatorio-1440.png)
e [320px](../frontend/visuais/importacao-relatorio-320.png); referência
[1440px](../frontend/visuais/importacao-relatorio-referencia-1440.png) e
[320px](../frontend/visuais/importacao-relatorio-referencia-320.png). A referência
320px apresenta corte pela sidebar fixa; a aplicação apresenta reflow sem
overflow de página e mantém os valores/rótulos acessíveis.


Prontidão/DoD do recorte: contrato disponível, resultado real discriminante,
validação defensiva, perfis/cancelamento/recuperação de erro, lote efetivo e
comparação técnica comprovados. FM-IMP-32/42 avançam somente em contagens/códigos;
P-05,8C2U.3 integral e aceite humano não são concluídos. EVM sem baseline de
esforço/custo/valor confiável, não calculado. Dependência da correção transacional
em [7d6c3d6](VALIDACAO_DRY_RUN_REJEICAO_PRECOCE.md), sem prometer rollback de sequências.
