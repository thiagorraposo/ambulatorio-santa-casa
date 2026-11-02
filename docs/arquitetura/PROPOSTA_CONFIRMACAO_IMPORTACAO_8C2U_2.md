# Confirmação e recuperação da importação — proposta para 8C2U.2

2026-11-02, retomada da Janela1. **Proposta não aprovada; unidade BLOQUEADA
pela recuperação autoritativa ausente.** Nenhum endpoint, concorrência,
permissão ou regra clínica nova foi implementado por este documento.

Fonte normativa: [catálogo8C2U](../frontend/ENTREGAS_DO_PRODUTO.md#8c2u),
H14 na [matriz](../frontend/MATRIZ_FIGMA_FRONTEND.md#suporte-http-e-persistência-efetivos),
[recuperação da Etapa7](RECUPERACAO_OPERACOES_ETAPA_7.md) e
[ADR-025](../DECISOES_ARQUITETURAIS.md#adr-025). O protocolo clínico existente
não autoriza automaticamente sua extensão à importação multipart/processo worker.

## Lacuna observada no código

O [controller](../../backend/src/importacoes/importacoes.controller.ts) recebe
arquivo/finalidade/código/dryRun. A confirmação efetiva é tecnicamente possível
via POST com dryRun=false, mas não há identificação durável da intenção nesse
contrato. O [serviço](../../backend/src/importacoes/importacoes.service.ts)
executa o worker Python por processo externo, espera seu término e descobre o
ID efetivo pelos eventos técnicos de conclusão. Essa resposta é entregue apenas
ao solicitante original. Falha após o COMMIT do worker e antes da resposta perde
no cliente o vínculo entre tentativa e resultado.

A consulta H14 lista lotes paginados ou lê um ID conhecido, com escopo próprio
por perfil/vínculos. Não consulta uma intenção de importação. O
[contrato de operações](../../backend/src/operacoes/operacoes.contract.ts)
limita a recuperação clínica aos seus caminhos permitidos; POST /importacoes
não integra esse protocolo. O corpo multipart também não corresponde ao JSON
canônico que fundamenta o recibo da Etapa7. Acrescentar X-Operacao-Id somente na
interface não produziria recibo do COMMIT ocorrido no processo worker.

O [importador](../../scripts/importar_planilha.py), em prepare_lot, resolve
conteúdo por hash/layout. Se o conteúdo já tiver lote concluído, o no-op retorna
esse lote, cujo código pode ser diferente do código solicitado agora. Portanto:

- Procurar pelo código solicitado pode não encontrar o lote efetivo.
- Uma página vazia não comprova ausência de aplicação.
- Encontrar um lote antigo não comprova que a tentativa atual terminou.
- Idempotência por conteúdo não constitui prova da intenção nem autoriza
  reenvio cego para descobrir o resultado.
- Consultar lote exige autorização própria; ser capaz de enviar não comprova
  capacidade de consultar todos os resultados operacionais.

A simulação atual continua disponível. Seu limite histórico de consumo de
sequências está documentado em [8C2U.1](../validacoes/VALIDACAO_8C2_U1.md);
a correção em desenvolvimento de C2B.1 não deve ser presumida antes das provas.
A ausência de recuperação impede liberar a confirmação U.2 na interface.

## Reprodução sintética dirigida a executar após contrato aprovado

Este roteiro é proposto, **não executado nesta investigação documental**:

1. Criar runner exclusivo em PostgreSQL tmpfs com XLSX sintético e importação
   habilitada. Simular arquivo A com código A; guardar a resposta mínima.
2. Confirmar A e interromper somente a resposta HTTP após o worker efetivamente
   concluir. Usar interceptação da resposta do browser/CDP; abortar o request
   antes de o worker executar não reproduz a janela de falha pertinente.
3. Conferir pelo owner sintético que lote/linhas foram commitados, sem expor
   dados brutos na interface. O cliente deve permanecer incerto, sem outro POST.
4. Repetir com arquivo A já importado e código solicitado B, finalidade
   mesmo_conteudo. O evento de no-op aponta ao lote A; pesquisar código B não
   recupera a tentativa. GET do lote A comprova o lote, não o novo envio.
5. Exercitar sessão expirada/revogação de consulta, resposta inválida,
   indisponibilidade de verificação e término concorrente do worker. Erros e
   ausência de acesso devem manter estado incerto, sem falsa não aplicação.

## Requisito mínimo proposto para decisão

A interface precisa registrar uma intenção antes do envio efetivo e consultar
seu resultado sem reaplicar o worker. A identidade dessa intenção deve ligar
arquivo selecionado, finalidade, código solicitado, ator e lote efetivo
(inclusive no-op), sem publicar hash/arquivo/conteúdo bruto sem contrato próprio.
O vínculo entre confirmação e conclusão do worker deve sobreviver à janela
COMMIT/resposta. A prova terminal deve distinguir confirmada, ainda em curso e
não aplicação comprovada; falta de prova continua indeterminada. Encerramento,
expiração, alterações de arquivo e autorização de consulta exigem decisões
explícitas, assim como a retenção técnica do recibo.

As seguintes alternativas precisam de revisão técnica e de produto:

| Alternativa | Consequência a avaliar |
| --- | --- |
| Estender o ledger clínico com contrato próprio multipart/worker | Reutiliza consulta e estados conhecidos; requer ligação atômica entre worker e ledger, identidade de arquivo e autorização próprias. Não basta whitelist ou recibo posterior no backend. |
| Criar recibo específico de importação associado à transação do worker | Mantém o processo existente e identifica lote/no-op; exige contrato de registro, consulta, retomada, retenção, falha e concorrência. |
| Criar job durável de importação com consulta por ID | Permite acompanhar execução depois da resposta inicial; amplia arquitetura e exige definição de fila, ownership, transições e concorrência. |

Não é recomendável usar listagem/busca de código como prova de operação nem
executar novamente POST para verificar a anterior. Nenhuma das alternativas
acima está selecionada ou aprovada por esta proposta.

**Decisão necessária:** qual mecanismo durável de intenção/recibo deve ligar o
worker ao lote efetivo e permitir sua verificação autorizada após perda da
resposta? Definir também quais perfis/vínculos podem registrar, consultar e
encerrar essa intenção; como retomar após perda da sessão; e quais condições
comprovam não aplicação antes de admitir uma nova confirmação consciente.

Após decisão e backend comprovado, U.2 poderá acrescentar revisão de
arquivo/finalidade/código, confirmação única, recibo/lote efetivo e recuperação
incerta, com testes de persistência e falha descritos acima. Relatório rico,
metadados de P-05 e conflitos autorizados continuam nas folhas próprias.
