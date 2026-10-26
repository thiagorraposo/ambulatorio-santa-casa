# AGENTS.md

Regras para documentação.

- Evitar duplicação de conteúdo.
- Indicar a fonte de verdade quando houver mais de um documento.
- Registrar incertezas como pendências, não como fatos.
- Atualizar apenas os documentos realmente afetados.
- Manter linguagem técnica, objetiva e verificável.
- Não registrar dados sensíveis.
- Registrar decisões arquiteturais duradouras em `docs/DECISOES_ARQUITETURAIS.md`.
- Registrar mudanças cronológicas em `docs/REGISTRO_DE_ALTERACOES.md`.

## Organização e fontes

- Use `README.md` deste diretório como índice; registre uma fonte principal por
  assunto e substitua resumos repetidos por links.
- `PROXIMOS_PASSOS.md` mantém sequência/marcos; `frontend/ENTREGAS_DO_PRODUTO.md`
  mantém escopos/aceites por ID; a matriz mantém a rastreabilidade por requisito.
- Separe regras de negócio, contratos, implementação, validação e aceite humano.
  Preserve IDs e não apresente fotografia histórica como estado vigente.
- Registros substituídos vão para `historico/`, com data/origem e link para a
  fonte atual. Evidências por execução continuam em `validacoes/`.
- Use nomes novos `MAIUSCULAS_COM_SUBLINHADO.md`, sem espaços ou acentos. Preserve
  caminhos exigidos pelo Makefile; renomeações não justificam alterar configuração.
- Após mover/consolidar, revise links relativos, âncoras, imagens e referências em
  texto. Valide pelo workflow; não adicione suítes da aplicação para mudança textual.
- Evite novos índices para coleções pequenas e não duplique procedimentos de setup.
