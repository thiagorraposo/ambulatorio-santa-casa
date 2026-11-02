# Erros por campo do atendimento — M3 / HUM-M3-03

Contrato técnico implementado em 02/11/2026; validação integrada pendente.
Escopo: 7D-U1/U2/U4, EST-02/09, ERR-04 e ATD-14. Não determina a causa do
relato humano e não encerra o P0. [Investigação e aceite](RECORTE_CLINICO_ETAPA_7.md#p0--confirmação-de-atendimento-e-contrato-de-erros).

## Envelope e segurança

Mantidos `statusCode`, `error` e `message`. Respostas 400 de validação DTO
acrescentam `errors: Array<{ path: string; code: string }>`; caminhos sem
contrato público resultam em coleção vazia e mensagem geral segura. Não há
valores, objeto validado, mensagens arbitrárias do class-validator, SQL, stack,
credenciais ou identificador de correlação inventado. O filtro reprojeta a
coleção, removendo propriedades extras e caminhos/códigos desconhecidos.

Caminhos publicados: núcleo (`dataAtendimento`, `localizacaoProntuario`,
`ambulatorioUnicamente`, `ambulatorioAnexoProjeto`, `observacoes`), campos
existentes de `dadosClinicos` e `diagnosticoChagas`,
`exames.<0–29>.<campo>`, `pendencias.<0–29>.<campo>`,
`rastreioFamiliar.familiaresExaminados` e
`rastreioFamiliar.familiares.<0–49>.{familiar,resultado}`. Índices começam em zero;
o rótulo legível começa em um. Listas exatas no
[projetor backend](../../backend/src/common/http/field-validation.ts) e no
[mapeamento frontend](../../frontend/src/shared/field-validation.tsx).

Códigos: `date`, `integer`, `number`, `length`, `option`, `invalid` e
`attendance_context`. Rótulo, motivo e orientação de formato são textos locais
fixos do frontend, nunca o texto arbitrário recebido do servidor. O cliente
aceita somente pares reconhecidos em 400, limita a 100 entradas e revalida a
geração da sessão depois da leitura do corpo. JSON inválido mantém erro genérico.

401 mantém encerramento/limpeza de sessão; 403 autorização, 409 conflito e
503/falha de rede continuam distintos e conservam seus mecanismos de recuperação.
Uma rejeição não dispara POST automático. Versão, intenção, transação clínica,
filhos, auditoria e recibo não foram alterados.

## Contexto incompatível já proibido pelo banco

`chk_atendimento_contexto_ambulatorio` já proíbe as duas opções verdadeiras.
Somente essa constraint 23514 é traduzida para `attendance_context` nos dois
campos. Constraints desconhecidas continuam com mensagem geral sanitizada.
Não há migration nem mudança da regra. Na criação/edição, o frontend também
recusa essa combinação sem alterar os valores. Na criação, a recusa ocorre na
primeira etapa e novamente ao preparar o corpo; omissão/null/false são mantidos.

## Interface e limites

O formulário de atendimento opta pelo feedback estruturado do `MutationForm`.
Resumo com foco, links para campo/etapa e controles com `aria-invalid` e
`aria-describedby`; destaque textual e borda usam a paleta de erro existente.
Campos ocultos são revelados pelo link antes do foco. Rejeição conserva valores
válidos e rascunho em memória. Outros formulários não recebem associações de
campo do atendimento por efeito lateral.

Este recorte não converte todos os erros de domínio em erros de campo. Exames
inativos, regras de resolução de pendências, erros de faixa física e demais
constraints ainda podem produzir erro geral. Validações locais anteriores,
fora da combinação de contexto, conservam suas mensagens e seleção de etapa.
Integração navegador/API/PostgreSQL, comparação visual em navegador e reprodução
da entrada humana permanecem obrigatórias; [evidências desta execução](../validacoes/VALIDACAO_P0_ATENDIMENTO_2026_11_02.md).
