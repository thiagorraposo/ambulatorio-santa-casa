# Documento de contrarreferência — proposta 8C3D/P-07

**Atualização vigente de02/11:** as [decisões de produto1–31](../dados/DECISOES_PRODUTO_M3_2026_11_02.md)
aprovam as regras sintéticas correspondentes. Perguntas e estados de aprovação
abaixo descrevem a preparação anterior e são sucedidos por essa fonte; contratos
técnicos, implementação, validação e homologação continuam separados.

2026-11-02, retomada da Janela 1 de M3. **Proposta não aprovada.** Upload está
incluído no produto; representação, estados e política de arquivo continuam
pendentes. Nenhum storage, endpoint, migration ou permissão nova é criado aqui.

Fontes: [catálogo 8C3D/B/U](../frontend/ENTREGAS_DO_PRODUTO.md#8c3d),
[D10](../dados/DECISOES_HUMANAS_NOVA_PLANILHA.md#encaminhamento-e-contrarreferência),
[P-07](../frontend/VISAO_E_ESPECIFICACAO.md#decisões-de-produto-e-limites-ainda-pendentes)
e [modelo do encaminhamento](ESPECIFICACAO_ENCAMINHAMENTO_AMPLIADO.md#contrarreferência-após-d10).
O catálogo vigente inclui upload em M3; a classificação antiga P2 da
especificação é histórica e não retira esse requisito.

## Fronteiras existentes

D10 confirmou múltiplas contrarreferências e a importância de upload, mas não
resolveu a distinção completa entre não realizada, pendente, não se aplica e
ausência. Documento apresentado no encaminhamento é outro fato; retorno ou
upload não prova emissão, entrega, recebimento ou realização do cuidado.

H10 já cria/lê episódios textuais no
[controller](../../backend/src/pacientes/recursos-clinicos.controller.ts),
com [DTO próprio](../../backend/src/clinico/dto/recursos.dto.ts) e vínculo ao
encaminhamento. Não há anexo no contrato atual. A futura associação deve
identificar a contrarreferência correta, preservando resumo, estado clínico e
histórico existentes; não usar um arquivo global por paciente.

## Decisões que desbloqueiam o contrato B

| Tema | Resposta necessária | Opções a avaliar; nenhuma adotada |
| --- | --- | --- |
| Representação | Um ou vários anexos por episódio; se versões/substituições são permitidas; como identificar documento e episódio | Anexos independentes mantêm ocorrências; substituição exige preservar histórico e distinguir arquivo vigente do retirado |
| Estado documental | Definir separadamente anexado, recebido e pendente; decidir o que é informação humana e o que é estado técnico | Arquivo íntegro disponível é observável tecnicamente; recebimento/entrega podem exigir registro humano próprio e não devem ser inferidos do upload |
| Formatos/tamanho | Aprovar tipos, quantidade e limites por arquivo/episódio, inclusive arquivo vazio, protegido por senha ou conteúdo incompatível com extensão | PDF apenas reduz variedade; PDF e imagens cobrem outras fontes, com validação adicional. Nenhum limite numérico é imposto por analogia ao XLSX |
| Armazenamento | Escolher serviço privado e responsável operacional, proteção, backup e recuperação | Diretório privado gerido pelo serviço tem operação local simples, mas exige backup/escalabilidade próprios; objetos privados separam conteúdo do banco, mas exigem lifecycle e acesso geridos |
| Validação de conteúdo | Aprovar verificação de tipo real e política para conteúdo potencialmente perigoso, antes de disponibilizar | Rejeição imediata e quarentena têm fluxos distintos; quarentena exige revisão e estado próprio, não download antecipado |
| Metadados | Definir campos internos e campos exibidos, nome de download e sua sanitização | Tipo/tamanho, ator e horário de confirmação são candidatos; nome original pode conter identidade clínica, não deve virar caminho ou mensagem livre |
| Acesso | Aprovar capacidades de upload, metadados, download e retirada; se há restrição adicional à leitura do episódio | Vínculo do paciente continua necessário; não presumir que todos os leitores clínicos podem baixar todo documento ou que perfil sozinho basta |
| Retirada e retenção | Nomear quem autoriza retirada, o que fica visível/auditável e quando pode ocorrer eliminação física, inclusive backups | Retirada lógica e eliminação física são operações distintas; não definir prazo ou purga automática sem política institucional |
| Falha e recuperação | Definir como consultar o resultado após perda de resposta e reconciliar arquivo/associação incompletos | Conteúdo só pode aparecer como disponível após integridade e associação confirmadas; não transformar erro de transporte em novo envio automático |

Os estados técnicos candidatos de transferência/validação/disponibilidade são
apenas uma proposta de apresentação. Não definem domínio clínico, recebimento
pela APS ou equivalência com `status` do episódio. A decisão deve explicitar o
tratamento dos termos clínicos pendentes em D10 antes de expô-los como opções.

## Percurso sintético e falhas a decidir

1. Abrir contrarreferência sintética A, conferir paciente/encaminhamento/episódio
   e selecionar `contrarreferencia-sintetica.pdf`; cancelar não envia arquivo.
2. Confirmar envio uma vez. Ver metadados e disponibilidade somente após
   confirmação íntegra; texto/resumo e estado clínico anteriores permanecem.
3. Abrir episódio B da mesma pessoa: não deve receber o anexo de A. Trocar IDs
   entre pacientes deve ser recusado sem expor nome/conteúdo do documento.
4. Interromper transferência ou simular falha entre storage e associação:
   nenhum anexo incompleto aparece como disponível; consulta de estado deve
   distinguir resultado confirmado de incerto antes de reenviar.
5. Revogar acesso antes do download: nova leitura/obtenção do arquivo deve
   revalidar autorização, sem reaproveitar URL pública ou cache como permissão.
6. Solicitar retirada e tentar download posterior: comportamento, informação
   preservada, auditoria e eventual eliminação obedecem à política aprovada.

## Gate de prontidão

- [ ] Responsável institucional e decisão datada para todos os temas da tabela.
- [ ] Terminologia documental versus clínica e múltiplos episódios aprovada.
- [ ] Tipos/limites, storage, conteúdo, metadados e acesso definidos.
- [ ] Retirada/retenção e recuperação de falha parcial definidas sem purga implícita.
- [ ] Contrato de upload/metadados/associação separado de download/retirada,
  com critérios sintéticos positivos/negativos e recuperação verificável.

Prontidão: proposta preparada; **8C3D ainda sem aceite VD**, portanto 8C3B/U
continuam bloqueadas. Não foram usados arquivos reais, documentos clínicos ou
testes de escrita; verificações documentais não validam storage ou autorização.
