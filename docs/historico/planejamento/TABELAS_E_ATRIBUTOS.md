# Tabelas e atributos — planejamento original

> Documento histórico, movido de `planejamento/tabelas e atributos.md` em 2026-10-23.
> Propostas e comandos abaixo descrevem a origem e não o estado vigente.
> Consulte o [índice atual](../../README.md) e o
> [modelo físico](../../MODELO_FISICO_ATUAL.md) antes de implementar.

paciente
- id
- codigo_planilha
- nome
- data_nascimento
- sexo
- raca_cor
- situacao_dc
- pertence_comunidade_tradicional
- tipo_comunidade_tradicional
- idade_importada
- ativo
- criado_em
- atualizado_em

paciente_endereco
- id
- paciente_id
- endereco
- cidade
- principal
- criado_em
- atualizado_em

paciente_contato
- id
- paciente_id
- tipo (TELEFONE,  WHATSAPP, EMAIL, OUTRO)
- valor
- principal
- observacao
- criado_em
- atualizado_em

atendimento
- id
- paciente_id
- data_atendimento
- localizacao_prontuario
- responsavel_digitacao_id
- responsavel_digitacao_importado
- origem_aba
- observacao_geral
- criado_em
- atualizado_em

usuario
- id
- nome
- email
- senha_hash
- perfil (ADMIN, MEDICO, ENFERMAGEM, PESQUISADOR, VISUALIZADOR)
- ativo
- ultimo_login
- criado_em
- atualizado_em

programa
- id
- nome
- descricao
- ativo

paciente_programa
- id
- paciente_id
- programa_id
- atendimento_id
- vinculado
- tem_pendencia
- descricao_pendencia
- houve_falha
- descricao_falha
- criado_em
- atualizado_em

encaminhamento
- id
- paciente_id
- atendimento_id
- trouxe_encaminhamento
- origem_encaminhamento
- observacao
- criado_em
- atualizado_em

diagnostico_chagas
- id
- paciente_id
- atendimento_id
- diagnostico_por_sorologia
- resultado_final_sorologia
- data_autorelato_diagnostico
- observacao
- criado_em
- atualizado_em

sorologia_chagas
- id
- diagnostico_chagas_id
- numero_metodo
- metodo
- data_exame
- resultado
- observacao

sorologia_solicitacao
- id
- paciente_id
- atendimento_id
- solicitado
- data_solicitacao
- observacao

historico_familiar_chagas
- id
- paciente_id
- atendimento_id
- familiares_realizaram_exame
- observacao

condicao_chagas
- id
- paciente_id
- atendimento_id
- forma_dc
- classificacao_cardiopatia_chagasica
- observacao
- criado_em
- atualizado_em

complicacao_chagas
- id
- paciente_id
- atendimento_id
- tipo (CARDIACA, DIGESTIVA, OUTRA, GERAL)
- presente
- descricao
- criado_em
- atualizado_em

comorbidade
- id
- nome
- categoria
- ativo

paciente_comorbidade
- id
- paciente_id
- atendimento_id
- comorbidade_id
- presente
- descricao
- criado_em
- atualizado_em

tipo_exame_laboratorial
- id
- nome
- unidade_padrao
- ativo

resultado_laboratorial
- id
- paciente_id
- atendimento_id
- tipo_exame_laboratorial_id
- valor
- unidade
- data_exame
- observacao

evento_clinico
- id
- paciente_id
- atendimento_id
- tipo_evento (AVC, REACAO_ADVERSA, OUTRO)
- data_evento
- ano_evento
- descricao
- criado_em
- atualizado_em

dispositivo_implantado
- id
- paciente_id
- atendimento_id
- tipo_dispositivo (MARCAPASSO, CDI)
- presente
- observacao
- criado_em
- atualizado_em

classe_medicamento
- id
- nome
- ativo

paciente_medicamento
- id
- paciente_id
- atendimento_id
- classe_medicamento_id
- em_uso
- descricao
- criado_em
- atualizado_em

tipo_exame
- id
- nome (ECG, ECO)
- categoria
- ativo

exame
- id
- paciente_id
- atendimento_id
- tipo_exame_id
- realizado
- solicitado
- data_exame
- resultado
- observacao
- criado_em
- atualizado_em

ecocardiograma
- id
- exame_id
- feve_percentual
- observacao

tipo_exame_complementar
- id
- nome
- ativo

exame_complementar
- id
- paciente_id
- atendimento_id
- tipo_exame_complementar_id
- origem (TRAZIDO_PELO_PACIENTE, SOLICITADO_NO_ATENDIMENTO)
- presente
- descricao
- criado_em
- atualizado_em

tratamento_benzonidazol
- id
- paciente_id
- atendimento_id
- usou_benzonidazol
- tratamento_pelo_ambulatorio
- duracao_uso
- ano_uso
- tem_indicacao
- data_prescricao
- motivo_nao_indicacao
- criado_em
- atualizado_em

retorno_tratamento
- id
- tratamento_benzonidazol_id
- tipo_retorno (30_DIAS, FINAL)
- realizado
- data_retorno
- desfecho
- observacao

encaminhamento_projeto
- id
- paciente_id
- atendimento_id
- projeto_destino
- data_encaminhamento
- observacao

contrarreferencia
- id
- paciente_id
- atendimento_id
- realizada
- observacao
- criado_em
- atualizado_em

notificacao
- id
- paciente_id
- atendimento_id
- notificado
- numero_notificacao
- justificativa_nao_notificacao
- criado_em
- atualizado_em

dados_clinicos_atendimento
- id
- atendimento_id
- altura
- peso
- circunferencia_abdominal
- frequencia_cardiaca
- saturacao
- pa_sistolica
- pa_diastolica
- nyha
- criado_em
- atualizado_em

obito
- id
- paciente_id
- atendimento_id
- ocorreu_obito
- data_obito
- causa_obito
- criado_em
- atualizado_em

retorno_anual
- id
- paciente_id
- atendimento_id
- realizado
- data_retorno
- desfecho
- observacao
- criado_em
- atualizado_em

atendimento_observacao
- id
- atendimento_id
- tipo (PENDENCIA, OBSERVACAO_GERAL, AJUSTE_DE_DADOS, IMPORTACAO)
- texto
- criado_por_id
- criado_em

importacao_planilha
- id
- nome_arquivo
- data_importacao
- usuario_id
- total_linhas
- total_linhas_importadas
- total_linhas_com_erro
- status
- observacao

importacao_linha
- id
- importacao_planilha_id
- numero_linha
- nome_aba
- paciente_id
- atendimento_id
- dados_originais_json
- status
- mensagem_erro
- criado_em
