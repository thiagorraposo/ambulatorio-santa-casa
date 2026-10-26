# Estrutura esperada do dicionário de dados

> Documento histórico, movido de `planejamento/Estrutura Esperada do Dicionário de Dados.md` em 2026-10-23.
> Propostas e comandos abaixo descrevem a origem e não o estado vigente.
> Consulte o [índice atual](../../README.md) e o
> [modelo físico](../../MODELO_FISICO_ATUAL.md) antes de implementar.

O dicionário final deve ser validado como se fosse uma planilha com 6 abas:

## Aba 1: Tabelas
Deve listar todas as tabelas do banco, com nome, finalidade, tipo da tabela, entidade principal relacionada e observações.

Colunas esperadas:
- tabela
- finalidade
- tipo_tabela
- tabela_principal_relacionada
- observacao

## Aba 2: Campos
Deve listar todos os campos de todas as tabelas.

Colunas esperadas:
- tabela
- campo
- tipo_dado
- obrigatorio
- chave
- referencia
- valor_padrao
- descricao
- observacao

## Aba 3: Coluna da planilha -> destino
Deve mapear cada coluna original da planilha para tabela e campo de destino.

Colunas esperadas:
- coluna_original
- tabela_destino
- campo_destino
- tipo_transformacao
- observacao

## Aba 4: Regras de transformação
Deve descrever como os dados da planilha serão convertidos para o banco.

Colunas esperadas:
- regra_id
- coluna_origem
- tabela_destino
- campo_destino
- regra
- exemplo
- observacao

## Aba 5: Valores padronizados
Deve listar valores aceitos para campos categóricos e conversões de valores da planilha.

Colunas esperadas:
- campo
- valor_original
- valor_padronizado
- significado
- observacao

## Aba 6: Dúvidas pendentes
Deve listar dúvidas que ainda impedem ou afetam a modelagem definitiva.

Colunas esperadas:
- duvida_id
- tema
- duvida
- impacto
- decisao_recomendada
- status
