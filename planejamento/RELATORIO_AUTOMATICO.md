# Relatorio automatico do dicionario validado

## Resumo

- Tabelas: 38
- Campos: 364
- Mapeamentos coluna -> destino: 192
- Colunas originais carregadas: 140
- Fonte das colunas originais: docs/relação de cada tabela com cada coluna da planilha.md
- Valores padronizados: 41
- Duvidas registradas: 15
- Total de categorias com ocorrencias: 3
- Total de ocorrencias: 79

## Avisos

- Arquivo docs/colunas_planilha_originais.md nao encontrado; usando fallback docs/relação de cada tabela com cada coluna da planilha.md.

## Tabelas citadas em campos inexistentes

- Nenhuma ocorrência encontrada.

## Tabelas destino inexistentes

- Nenhuma ocorrência encontrada.

## Campos destino inexistentes

- Nenhuma ocorrência encontrada.

## FKs sem referencia valida

- Nenhuma ocorrência encontrada.

## FKs com tabela referenciada inexistente

- Nenhuma ocorrência encontrada.

## FKs com campo referenciado inexistente

- Nenhuma ocorrência encontrada.

## Colunas originais sem mapeamento

- Nenhuma ocorrência encontrada.

## Mapeamentos sem coluna original conhecida

- Nenhuma ocorrência encontrada.

## Colunas originais duplicadas no mapeamento

- Alfa/Betabloqueador: 2 ocorrencias
- Ambulatório anexo ao projeto: 2 ocorrencias
- Ambulatório unicamente: 2 ocorrencias
- Anti- depressivos: 2 ocorrencias
- Anti- hipertensivo: 2 ocorrencias
- Anti-arritmicos: 2 ocorrencias
- Anti-coagulantes: 2 ocorrencias
- BenBrasil: 2 ocorrencias
- Benbrasil: 2 ocorrencias
- Bloqueador de cálcio: 2 ocorrencias
- Caso seja sorologia: Metodo 1: 2 ocorrencias
- Caso seja sorologia: Metodo 2: 2 ocorrencias
- Caso seja sorologia: Metodo 3: 2 ocorrencias
- Colonoscopia: 2 ocorrencias
- De imagem: 2 ocorrencias
- Diabetes: 2 ocorrencias
- Diuréticos: 2 ocorrencias
- Doença renal: 2 ocorrencias
- Doenças do sistema cardiovascular: 2 ocorrencias
- Doenças do sistema digestório: 2 ocorrencias
- Doenças do sistema endócrino: 2 ocorrencias
- Doenças do sistema imunológico: 2 ocorrencias
- Doenças do sistema nervoso: 2 ocorrencias
- Doenças do sistema respiratório: 2 ocorrencias
- Doenças do sistema tegumentar: 2 ocorrencias
- Doenças psicológicas: 2 ocorrencias
- ECG: 2 ocorrencias
- ECO: 3 ocorrencias
- EPOCA: 2 ocorrencias
- Endoscopia: 2 ocorrencias
- Estatinas: 2 ocorrencias
- Hipertensão arterial: 2 ocorrencias
- Hipoglicemiante: 2 ocorrencias
- Holter: 2 ocorrencias
- IECA/BRA: 2 ocorrencias
- INRA: 2 ocorrencias
- LXE Novartis: 2 ocorrencias
- Laboratoriais: 2 ocorrencias
- Mapa: 2 ocorrencias
- Outras doenças: 2 ocorrencias
- Outros: 2 ocorrencias
- Outros medicamentos: 2 ocorrencias
- Parachute: 2 ocorrencias
- SaMi-Trop 1.1: 2 ocorrencias
- SaMi-Trop AIM3: 2 ocorrencias
- Santa Casa ARCHIMEDES: 2 ocorrencias
- Santa Casa CHARM: 2 ocorrencias
- Santa Casa DICA: 2 ocorrencias
- Santa Casa RENOMICA: 2 ocorrencias
- Teste Ergometrico: 2 ocorrencias
- Vasodilatador: 2 ocorrencias

## Campos obrigatorios sem descricao

- Nenhuma ocorrência encontrada.

## Campos sem tipo de dado

- Nenhuma ocorrência encontrada.

## Campos categoricos sem valores padronizados

- paciente.sexo
- paciente.raca
- paciente.tipo_comunidade_tradicional
- paciente_contato.tipo_contato
- diagnostico_chagas.diagnostico_dc_por_sorologia
- diagnostico_chagas.resultado_final_sorologia
- sorologia_chagas.resultado
- sorologia_solicitacao.status_solicitacao
- condicao_chagas.forma_dc
- condicao_chagas.classificacao_cardiopatia_chagasica
- exame.resultado
- dados_clinicos_atendimento.nyha
- atendimento_observacao.tipo_observacao

## Duvidas pendentes em aberto

- D001: Arquivos fonte - Os arquivos com nomes exatos docs/dicionario_dados_texto.md e docs/colunas_planilha_originais.md não existem no repositório.
- D002: Colunas duplicadas - Como identificar colunas repetidas como Laboratoriais, De imagem, Holter, Mapa e Outros entre blocos trazido/solicitado?
- D003: ECO - A coluna ECO pertence ao bloco de exame geral, exame complementar solicitado ou ambos?
- D004: Pendências/observação - Pendencias/Observação deve ser gravada em atendimento, atendimento_observacao ou ambos?
- D005: Autorrelato diagnóstico - A coluna Autorelato diagnóstico de Chagas do participante (data) indica apenas data ou também booleano?
- D006: Data glicemia - Data do Exame Colesterol deve ser aplicada à glicemia quando não houver data própria?
- D007: Unidades clínicas - Altura, peso, circunferência abdominal, saturação e FEVE vêm com quais unidades/formato?
- D008: Valores ambíguos - Como tratar pendente, não sabe, não informado e células vazias em campos booleanos?
- D009: Usuários - Campos email, senha_hash e perfil devem existir na primeira migration ou só no módulo de autenticação?
- D010: FKs opcionais - atendimento_id deve ser obrigatório em tabelas clínicas derivadas da planilha?
- D011: Campos técnicos - Qual política de valor padrão para ativo, criado_em e atualizado_em?
- D012: Notificação - Caso não, justifique se refere exclusivamente a Paciente notificado?
- D013: Tratamento BZN - Se não, descreva o motivo se refere a não uso, não indicação ou ambos?
- D014: Programas duplicados - Benbrasil/BenBrasil e Falha EPOCA/EPOCA FALHA são duplicatas semânticas?
- D015: Valores categóricos clínicos - Quais valores válidos para forma da DC, cardiopatia, diagnóstico e resultado de sorologia?
