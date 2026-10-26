# Mapeamento original de tabelas e colunas

> Documento histórico, movido de `planejamento/relação de cada tabela com cada coluna da planilha.md` em 2026-10-23.
> Propostas e comandos abaixo descrevem a origem e não o estado vigente.
> Consulte o [índice atual](../../README.md) e o
> [modelo físico](../../MODELO_FISICO_ATUAL.md) antes de implementar.

paciente
Cobre:
ID
Nome
Data de Nascimento
Idade
Sexo
Raça
Pertence a comunidade Quilombola ou indígena
Qual? Indígena ou quilombola?
Origem da aba: portador ou não portador de DC

paciente_endereco
Cobre:
Endereço
Cidade

paciente_contato
Cobre:
Telefone de Contato

atendimento
Cobre:
Data do atendimento
Localização do prontuário
Responsavel pela digitacao
Pendencias/Observação

usuario
Cobre:
Responsavel pela digitacao

programa
Cobre como cadastro:
SaMi-Trop AIM3
SaMi-Trop 1.1
Parachute
BenBrasil
Ambulatório unicamente
Ambulatório anexo ao projeto
EPOCA
Santa Casa DICA
Santa Casa RENOMICA
Santa Casa ARCHIMEDES
Santa Casa CHARM
LXE Novartis

paciente_programa
Cobre:
SaMi-Trop AIM3
SaMi-Trop AIM3 PENDÊNCIA
SaMi-Trop 1.1
Parachute
Parachute falha
Benbrasil
BenBrasil
BenBrasil FALHA
Ambulatório unicamente
Ambulatório anexo ao projeto
EPOCA
Falha EPOCA
EPOCA FALHA
Santa Casa DICA
Santa Casa RENOMICA
Santa Casa ARCHIMEDES
Santa Casa CHARM
LXE Novartis
LXE Novartis falha

encaminhamento
Cobre:
Trouxe encaminhamento
Origem encaminhamento

diagnostico_chagas
Cobre:
Diagnóstico da DC por sorologia
Resultado final da sorologia
Autorelato diagnóstico de Chagas do participante (data)

sorologia_chagas
Cobre:
Caso seja sorologia: Metodo 1
Data da Sorologia 01
Caso seja sorologia: Metodo 2
Data sorologia 2
Caso seja sorologia: Metodo 3
Data sorologia 3

sorologia_solicitacao
Cobre:
Ou solicitado sorologia
Se sim, data solicitada

historico_familiar_chagas
Cobre:
Familiares diretos (mãe, pai, irmãos) realizaram o exame de Chagas?

condicao_chagas
Cobre:
Forma da DC
Classificacao da cardiopatia chagasica

complicacao_chagas
Cobre:
Complicações relacionadas a DC
Complicações cardiacas relacioadas a DC
Complicações do trato digestivo relacioadas a DC
Outras complicações relacionadas a DC, qual?

comorbidade
Cobre como cadastro:
Doenças do sistema cardiovascular
Hipertensão arterial
Doenças do sistema imunológico
Doenças do sistema nervoso
Doenças psicológicas
Doenças do sistema respiratório
Doenças do sistema digestório
Doenças do sistema endócrino
Doenças do sistema tegumentar
Diabetes
Doença renal
Outras doenças

paciente_comorbidade
Cobre:
Comorbidades não relacionadas a DC?
Doenças do sistema cardiovascular
Hipertensão arterial
Doenças do sistema imunológico
Doenças do sistema nervoso
Doenças psicológicas
Doenças do sistema respiratório
Doenças do sistema digestório
Doenças do sistema endócrino
Doenças do sistema tegumentar
Diabetes
Doença renal
Outras doenças

tipo_exame_laboratorial
Cobre como cadastro:
Glicemia
Colesterol HDL
Colesterol LDL
Triglicerídeos

resultado_laboratorial
Cobre:
Valor da glicemia
Valor de colesterol HDL
Valor de colesterol LDL
Triglicerideos
Data do Exame Colesterol

evento_clinico
Cobre:
teve AVC
Ano do ultimo AVC
teve reação adversa?

dispositivo_implantado
Cobre:
portador de marcapasso?
portador de CDI?

classe_medicamento
Cobre como cadastro:
Anti- hipertensivo
Diuréticos
Anti-coagulantes
Anti-arritmicos
Anti- depressivos
IECA/BRA
INRA
Alfa/Betabloqueador
Vasodilatador
Hipoglicemiante
Estatinas
Bloqueador de cálcio
Outros medicamentos

paciente_medicamento
Cobre:
Anti- hipertensivo
Diuréticos
Anti-coagulantes
Anti-arritmicos
Anti- depressivos
IECA/BRA
INRA
Alfa/Betabloqueador
Vasodilatador
Hipoglicemiante
Estatinas
Bloqueador de cálcio
Outros medicamentos

tipo_exame
Cobre como cadastro:
ECG
ECO

exame
Cobre:
ECG
Resultado ecg
Data do ecg
ECG solicitado
ECO

ecocardiograma
Cobre:
FEVE%

tipo_exame_complementar
Cobre como cadastro:
Laboratoriais
De imagem
Holter
Endoscopia
Colonoscopia
Teste Ergometrico
Mapa
ECO
Outros

exame_complementar
Cobre:
Paciente trouxe outros exames complementares?
Laboratoriais
De imagem
Holter
Endoscopia
Colonoscopia
Teste Ergometrico
Mapa
Outros
Solicitado exames complementares?
Laboratoriais
ECO
De imagem
Holter
Endoscopia
Colonoscopia
Teste Ergometrico
Mapa
Outros

tratamento_benzonidazol
Cobre:
Uso do benzonidazol para tratamento da DC?
tratamento pelo ambulatorio?
Por quanto tempo foi usado?
Em qual ano tomou a medicação (Benzonidazol)?
Tem indicação de BZN?
Prescrição do BZN (data)
Se não, descreva o motivo

retorno_tratamento
Cobre:
Retorno 30 dias de tratamento
Retorno final de tratamento

encaminhamento_projeto
Cobre:
Encaminhado a qual projeto?

contrarreferencia
Cobre:
Paciente com contrarreferencia realizada?

notificacao
Cobre:
Paciente notificado?
Número notificação
Caso não, justifique

dados_clinicos_atendimento
Cobre:
Altura
Peso
Circunferencia Abdominal
Frequencia cardiaca
Saturacao
PA sistolica
PA diastolica
NYHA

obito
Cobre:
Óbito
Data do óbito
causa do óbito

retorno_anual
Cobre:
Retorno anual realizado
Desfecho do retorno

atendimento_observacao
Cobre:
Pendencias/Observação

importacao_planilha
Cobre:
Controle da importação como processo.

importacao_linha
Cobre:
Todas as colunas originais da planilha em formato bruto para auditoria.
