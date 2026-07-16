# Dicionário de Dados — Visão Geral das Tabelas

## 1. Tabelas centrais do sistema

### paciente

Tabela principal para armazenamento dos dados cadastrais básicos dos pacientes acompanhados pelo ambulatório.

Representa uma pessoa atendida ou acompanhada pelo serviço. Deve concentrar apenas informações essenciais e relativamente estáveis do paciente, evitando misturar dados de atendimento, exames, programas, diagnósticos ou histórico clínico detalhado.

Esta tabela funciona como núcleo do banco de dados, pois a maioria das demais tabelas se relaciona direta ou indiretamente com o paciente.

---

### paciente_endereco

Tabela destinada ao armazenamento dos dados de endereço do paciente.

Deve registrar informações de localização residencial ou territorial, como cidade, bairro, comunidade, zona rural ou urbana, e demais dados necessários para identificação geográfica e acompanhamento epidemiológico.

Foi separada da tabela paciente para evitar excesso de campos cadastrais na tabela principal e permitir melhor organização dos dados de localização.

---

### paciente_contato

Tabela destinada ao armazenamento dos meios de contato do paciente.

Deve registrar informações como telefone, telefone alternativo, contato de responsável, familiar ou outro meio utilizado para comunicação com o paciente.

A separação em tabela própria permite que um paciente tenha mais de um contato registrado, se necessário.

---

### atendimento

Tabela destinada ao registro de cada atendimento realizado com o paciente.

Representa um evento assistencial ocorrido em determinada data. Deve funcionar como ponto de ligação entre o paciente e os dados produzidos durante uma consulta, avaliação, retorno ou acompanhamento.

Essa tabela é essencial para preservar o histórico temporal do paciente, permitindo que múltiplos atendimentos sejam registrados ao longo do tempo.

---

### usuario

Tabela destinada ao cadastro dos usuários do sistema.

Representa profissionais ou pessoas autorizadas a acessar o sistema, registrar dados, editar informações, consultar relatórios ou executar tarefas administrativas.

Essa tabela é importante para controle de acesso, segurança, rastreabilidade e auditoria das ações realizadas no sistema.

---

## 2. Programas, projetos e vínculo institucional

### programa

Tabela destinada ao cadastro dos programas, projetos ou iniciativas institucionais relacionados ao acompanhamento do paciente.

Exemplos possíveis incluem projetos de pesquisa, programas assistenciais, ambulatórios específicos ou iniciativas vinculadas à Santa Casa ou parceiros.

Essa tabela evita a repetição textual dos nomes dos programas e permite padronizar os vínculos dos pacientes.

---

### paciente_programa

Tabela associativa entre pacientes e programas.

Deve registrar quais pacientes participam ou participaram de quais programas, projetos ou iniciativas. Essa separação é necessária porque um mesmo paciente pode estar vinculado a mais de um programa, e um programa pode incluir vários pacientes.

Também pode ser usada para controlar situação do vínculo, datas de entrada, pendências ou observações relacionadas à participação.

---

## 3. Encaminhamentos e contrarreferência

### encaminhamento

Tabela destinada ao registro dos encaminhamentos relacionados ao paciente.

Representa a origem ou o destino de encaminhamentos clínicos, assistenciais ou institucionais. Pode registrar se o paciente veio encaminhado de outro serviço, se foi encaminhado para outro setor ou se houve necessidade de continuidade do cuidado em outro local.

---

### encaminhamento_projeto

Tabela destinada ao controle dos encaminhamentos relacionados a projetos específicos.

Deve registrar vínculos entre encaminhamentos e projetos, especialmente quando o paciente é direcionado para iniciativas específicas, estudos, programas assistenciais ou fluxos internos.

Essa tabela ajuda a separar o encaminhamento clínico geral do encaminhamento vinculado a projetos específicos.

---

### contrarreferencia

Tabela destinada ao registro de contrarreferências.

Representa o retorno formal de informações para o serviço de origem ou para outro ponto da rede assistencial após avaliação, atendimento ou acompanhamento do paciente.

Essa tabela é importante para documentar continuidade do cuidado, comunicação entre serviços e fechamento de fluxos de encaminhamento.

---

## 4. Diagnóstico, sorologia e condição relacionada à doença de Chagas

### diagnostico_chagas

Tabela destinada ao registro do diagnóstico relacionado à doença de Chagas.

Deve concentrar a conclusão diagnóstica do paciente quanto à presença, ausência, suspeita ou confirmação da doença de Chagas.

Essa tabela deve representar o estado diagnóstico consolidado, e não cada exame isolado.

---

### sorologia_chagas

Tabela destinada ao armazenamento dos resultados de exames sorológicos relacionados à doença de Chagas.

Representa exames realizados, métodos utilizados e resultados obtidos. Deve ser usada para registrar evidências laboratoriais que sustentam ou descartam o diagnóstico.

A separação em relação ao diagnóstico permite manter o histórico dos exames, inclusive quando há resultados divergentes ou repetidos.

---

### sorologia_solicitacao

Tabela destinada ao registro de solicitações de sorologia para doença de Chagas.

Deve armazenar pedidos de exames sorológicos, independentemente de o resultado já estar disponível ou não.

Essa tabela é útil para controlar exames solicitados, pendentes, realizados ou aguardando resultado.

---

### historico_familiar_chagas

Tabela destinada ao registro de histórico familiar relacionado à doença de Chagas.

Deve armazenar informações sobre familiares com diagnóstico, suspeita, óbito relacionado ou outros dados relevantes para avaliação epidemiológica e clínica.

Essa tabela permite separar antecedentes familiares dos dados diagnósticos individuais do paciente.

---

### condicao_chagas

Tabela destinada ao registro da condição clínica do paciente relacionada à doença de Chagas.

Deve representar manifestações, formas clínicas ou classificações do paciente dentro do contexto da doença, como forma indeterminada, cardíaca, digestiva ou outras classificações clínicas relevantes.

Essa tabela deve ser usada para caracterizar a situação clínica do paciente após avaliação médica.

---

### complicacao_chagas

Tabela destinada ao registro de complicações associadas à doença de Chagas.

Deve armazenar eventos ou consequências clínicas relacionadas à doença, como alterações cardíacas, digestivas, neurológicas ou outras complicações relevantes.

A separação em tabela própria permite registrar múltiplas complicações para um mesmo paciente e acompanhar sua evolução.

---

## 5. Comorbidades

### comorbidade

Tabela destinada ao cadastro padronizado de comorbidades.

Representa uma lista de condições clínicas possíveis, como hipertensão, diabetes, dislipidemia, doença renal, entre outras.

Essa tabela funciona como tabela de referência, evitando repetição textual e variações de escrita.

---

### paciente_comorbidade

Tabela associativa entre pacientes e comorbidades.

Deve registrar quais comorbidades estão presentes em cada paciente.

É necessária porque um paciente pode ter várias comorbidades, e uma mesma comorbidade pode estar presente em vários pacientes.

---

## 6. Exames laboratoriais

### tipo_exame_laboratorial

Tabela destinada ao cadastro dos tipos de exames laboratoriais.

Representa a lista padronizada de exames laboratoriais possíveis, como hemograma, creatinina, TGO, TGP, bilirrubinas, entre outros.

Essa tabela evita a repetição de nomes de exames e facilita filtros, relatórios e análises estatísticas.

---

### resultado_laboratorial

Tabela destinada ao armazenamento dos resultados de exames laboratoriais realizados pelo paciente.

Deve registrar os resultados obtidos para os exames laboratoriais, vinculando o paciente, o atendimento e o tipo de exame correspondente.

Essa tabela permite manter histórico laboratorial ao longo do tempo.

---

## 7. Eventos clínicos e dispositivos

### evento_clinico

Tabela destinada ao registro de eventos clínicos relevantes na história do paciente.

Pode incluir intercorrências, internações, arritmias, eventos cardiovasculares, procedimentos, sintomas importantes ou outras ocorrências clínicas relevantes.

Essa tabela deve permitir registrar fatos clínicos com data, contexto e vínculo ao paciente ou atendimento.

---

### dispositivo_implantado

Tabela destinada ao registro de dispositivos médicos implantados no paciente.

Pode incluir marca-passo, cardiodesfibrilador implantável, ressincronizador cardíaco ou outros dispositivos relevantes.

Essa tabela deve permitir documentar presença, tipo e histórico de dispositivos implantados.

---

## 8. Medicamentos

### classe_medicamento

Tabela destinada ao cadastro das classes ou tipos de medicamentos.

Representa uma lista padronizada de grupos medicamentosos, como anti-hipertensivos, anticoagulantes, antiarrítmicos, antiparasitários, entre outros.

Essa tabela permite organizar medicamentos por categoria e evitar inconsistências de escrita.

---

### paciente_medicamento

Tabela destinada ao registro dos medicamentos utilizados pelo paciente.

Deve armazenar os medicamentos em uso, suspensos ou previamente utilizados, podendo estar vinculada à classe do medicamento.

Essa tabela é importante para histórico terapêutico, segurança clínica e acompanhamento do tratamento.

---

## 9. Exames gerais e ecocardiograma

### tipo_exame

Tabela destinada ao cadastro dos tipos gerais de exames.

Representa exames clínicos, de imagem, cardiológicos ou outros exames que não sejam classificados especificamente como laboratoriais ou complementares em outra tabela.

Deve funcionar como tabela de referência para padronização dos exames registrados na tabela exame.

---

### exame

Tabela destinada ao registro dos exames realizados ou solicitados para o paciente.

Representa a ocorrência de um exame específico vinculado a um paciente, atendimento e tipo de exame.

Essa tabela pode registrar informações gerais como data, situação do exame, resultado resumido ou observações, conforme a modelagem posterior dos campos.

---

### ecocardiograma

Tabela destinada ao armazenamento de dados específicos de ecocardiograma.

Foi separada da tabela exame porque o ecocardiograma costuma possuir muitos dados próprios, parâmetros estruturados e medidas específicas.

Essa tabela deve ser vinculada a um exame ou atendimento, permitindo registrar dados detalhados desse tipo de avaliação.

---

## 10. Exames complementares

### tipo_exame_complementar

Tabela destinada ao cadastro dos tipos de exames complementares.

Representa exames adicionais que podem ser trazidos pelo paciente, solicitados durante o atendimento ou registrados como parte da investigação clínica.

Essa tabela deve padronizar os nomes dos exames complementares para evitar duplicidade e inconsistência.

---

### exame_complementar

Tabela destinada ao registro dos exames complementares associados ao paciente.

Deve armazenar exames complementares trazidos, solicitados, pendentes ou realizados, permitindo diferenciar a origem e a situação de cada exame.

Essa tabela é importante para controlar a investigação complementar e evitar perda de informações que antes ficavam espalhadas em várias colunas da planilha.

---

## 11. Tratamento com benzonidazol

### tratamento_benzonidazol

Tabela destinada ao registro do tratamento específico com benzonidazol.

Deve armazenar informações sobre indicação, início, término, adesão, suspensão, eventos adversos e situação geral do tratamento.

Essa tabela foi separada porque o tratamento com benzonidazol possui importância clínica própria no contexto da doença de Chagas.

---

### retorno_tratamento

Tabela destinada ao registro dos retornos relacionados ao acompanhamento do tratamento.

Deve armazenar avaliações feitas durante ou após o uso de benzonidazol, incluindo evolução, tolerância, efeitos adversos, pendências ou continuidade do acompanhamento.

Essa tabela permite registrar múltiplos retornos associados a um mesmo tratamento.

---

## 12. Notificação, dados clínicos, óbito e acompanhamento

### notificacao

Tabela destinada ao registro de notificações relacionadas ao paciente.

Pode incluir notificações epidemiológicas, compulsórias, institucionais ou administrativas relacionadas à doença de Chagas ou a outros eventos relevantes.

Essa tabela permite acompanhar se a notificação foi realizada, pendente ou não aplicável.

---

### dados_clinicos_atendimento

Tabela destinada ao armazenamento de dados clínicos registrados durante um atendimento.

Deve conter informações clínicas específicas coletadas em consulta, como sintomas, sinais, classificações clínicas, avaliações médicas ou achados relevantes.

Foi separada da tabela atendimento para manter o atendimento como evento principal e os dados clínicos como conteúdo detalhado do atendimento.

---

### obito

Tabela destinada ao registro de óbito do paciente, quando aplicável.

Deve armazenar informações relacionadas à ocorrência do óbito, causa conhecida ou presumida, data e relação possível com a condição clínica acompanhada.

Essa tabela deve existir separadamente porque óbito é um evento específico e não deve ser tratado apenas como observação textual.

---

### retorno_anual

Tabela destinada ao controle dos retornos anuais do paciente.

Deve registrar informações de acompanhamento periódico, revisão clínica ou controle anual do paciente dentro do fluxo do ambulatório.

Essa tabela é útil para monitorar continuidade do cuidado e acompanhamento longitudinal.

---

### atendimento_observacao

Tabela destinada ao registro de observações associadas ao atendimento.

Deve armazenar comentários, anotações livres, pendências, justificativas ou informações complementares que não se encaixam nos campos estruturados das demais tabelas.

Essa tabela ajuda a preservar informações textuais da planilha sem comprometer a estrutura normalizada do banco de dados.

---

## 13. Importação e rastreabilidade da planilha

### importacao_planilha

Tabela destinada ao registro de cada processo de importação de dados vindo da planilha original.

Deve armazenar informações sobre o arquivo importado, data da importação, usuário responsável, status do processamento e possíveis observações gerais.

Essa tabela é importante para rastreabilidade, auditoria e controle de versões dos dados importados.

---

### importacao_linha

Tabela destinada ao registro das linhas importadas da planilha original.

Deve armazenar o vínculo entre uma linha da planilha e os registros gerados no banco de dados.

Essa tabela é essencial para auditoria da migração, identificação de erros, conferência de dados e rastreamento da origem de cada informação importada.

---

# Observação geral sobre a modelagem

O conjunto de tabelas proposto segue uma lógica normalizada, separando dados cadastrais, atendimentos, exames, diagnósticos, tratamentos, programas, eventos clínicos e informações de importação.

A principal vantagem dessa estrutura é evitar que a nova aplicação reproduza a planilha original como uma única tabela enorme. Em vez disso, os dados passam a ser organizados por assunto, permitindo histórico, filtros avançados, dashboards, auditoria, controle de usuários e expansão futura do sistema.