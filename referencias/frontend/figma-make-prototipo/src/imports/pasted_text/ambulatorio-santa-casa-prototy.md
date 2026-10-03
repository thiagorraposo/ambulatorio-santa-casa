Crie um protótipo web completo, realista, funcional e altamente interativo para o sistema **Ambulatório Santa Casa**, destinado ao **Centro de Pesquisa em Saúde do Hospital Santa Casa**.

O protótipo deve representar o **MVP operacional futuro** do projeto `ambulatorio-santa-casa`: a menor versão da aplicação capaz de substituir a planilha no trabalho cotidiano da equipe, permitindo localizar pacientes, registrar atendimentos, consultar histórico clínico, importar dados históricos de forma controlada, revisar pendências, consultar indicadores básicos, controlar acesso e realizar exportações autorizadas.

IMPORTANTE: este é um protótipo do produto que ainda será construído. Não apresente as funcionalidades visuais como se já estivessem implementadas no software atual.

# 1. CONTEXTO DO PRODUTO

Hoje as informações do ambulatório estão concentradas em uma planilha extensa que mistura:

* cadastro de pacientes;
* atendimentos;
* informações clínicas;
* diagnóstico de doença de Chagas;
* sorologias;
* condições e complicações;
* comorbidades;
* exames;
* medicamentos;
* tratamento com benzonidazol;
* projetos de pesquisa;
* encaminhamentos;
* acompanhamento;
* notificação;
* observações e pendências.

O sistema não deve ser uma reprodução visual da planilha.

A proposta é transformar os dados em uma aplicação organizada por paciente, atendimento e módulos clínicos, criando uma ficha longitudinal que concentre o histórico do paciente.

A estrutura técnica atual possui 38 tabelas internas, mas essas tabelas NÃO devem aparecer para o usuário. A interface deve apresentar conceitos clínicos e operacionais compreensíveis.

O fluxo conceitual deve ser:

Entrar
→ localizar paciente
→ cadastrar caso não exista
→ abrir ficha
→ registrar atendimento
→ preencher módulos clínicos
→ validar
→ salvar
→ acompanhar histórico
→ revisar pendências
→ consultar indicadores
→ exportar quando autorizado.

A busca deve ocorrer antes da criação de um novo paciente para reduzir duplicidades.

# 2. LIMITES OBRIGATÓRIOS DO MVP

Respeite rigorosamente estes limites.

O MVP considera somente dados provenientes das abas:

* `Pacientes portadores de DC`
* `Pacientes não portadores de DC`

Não criar funcionalidades específicas para:

* `P Digitar`;
* abas AIM3;
* fluxo operacional AIM3;
* campo `Localizado`;
* múltiplas contrarreferências;
* relatórios analíticos avançados;
* dashboards sofisticados;
* aplicativo mobile;
* integração automática entre o antigo “Responsável pela digitação” e usuários autenticados.

Existem 136 rótulos físicos distintos nas duas abas clínicas.

Destes:

* 124 possuem cobertura estruturada plena;
* 11 possuem significado ainda parcialmente definido e são preservados durante a importação sem interpretação clínica definitiva;
* `Localizado` permanece exclusivamente como conteúdo bruto e fora do modelo estruturado.

Não invente regras para esses campos pendentes.

Quando alguma informação ainda não possuir definição institucional ou clínica, use visualmente estados como:

* “Aguardando definição”
* “Regra ainda não validada”
* “Informação preservada na importação”
* “Necessita revisão”

Não transforme incerteza em regra automática.

# 3. DADOS

Use EXCLUSIVAMENTE dados sintéticos e claramente fictícios.

Nunca usar:

* nomes reais de pacientes;
* telefones reais;
* endereços reais;
* prontuários reais;
* números reais de notificação;
* informações clínicas provenientes de pessoas reais.

Use exemplos claramente artificiais, como:

* Paciente Sintético 001
* Paciente Sintético 002
* código `PAC-SINT-0001`
* lote `IMP-SINT-2026-001`

Os dados precisam parecer plausíveis visualmente, mas devem ser inequivocamente fictícios.

Não exibir JSON bruto da importação para usuários normais.

# 4. ESTILO VISUAL

Criar uma aplicação institucional de saúde, sóbria, limpa e profissional.

Não usar estética de startup exagerada.

Evitar:

* gradientes chamativos;
* elementos decorativos excessivos;
* gamificação;
* ilustrações infantis;
* excesso de cards;
* fotos de pacientes;
* interfaces parecidas com aplicativos financeiros.

Priorizar:

* fundo claro;
* boa hierarquia tipográfica;
* alto contraste;
* espaçamento generoso;
* tabelas legíveis;
* formulários organizados;
* cards apenas quando facilitarem leitura;
* cores discretas para status;
* vermelho somente para erros ou situações críticas;
* amarelo/âmbar para pendências;
* verde para operações concluídas;
* azul ou tonalidade institucional neutra como cor principal.

Usar no cabeçalho:

“Centro de Pesquisa em Saúde”
“Ambulatório Santa Casa”

Não inventar nem reproduzir um logotipo oficial se nenhum arquivo de identidade visual tiver sido fornecido.

Aplicação desktop-first.

Não criar um aplicativo mobile separado.

# 5. ESTRUTURA GLOBAL

Após login, usar:

* sidebar lateral;
* cabeçalho superior;
* breadcrumb nas páginas internas;
* identificação do usuário e perfil no canto superior direito;
* botão de logout;
* área principal de conteúdo.

Menu principal proposto:

Início
Pacientes
Pendências
Importações
Dashboard
Usuários — apenas Administração

Não mostrar opções sem sentido para determinado perfil.

# 6. PERFIS

Existem três perfis funcionais:

## Consulta

Pode visualizar as informações permitidas.

A interface deve permitir:

* consultar pacientes;
* buscar;
* abrir ficha;
* visualizar histórico;
* visualizar dados clínicos;
* visualizar indicadores permitidos.

Não permitir operações de edição.

Botões de edição devem ficar ocultos ou desabilitados com explicação clara.

## Edição

Possui todas as capacidades de consulta e pode:

* cadastrar paciente;
* editar informações permitidas;
* criar atendimento;
* registrar informações clínicas;
* corrigir registros dentro do escopo permitido;
* trabalhar com pendências de revisão.

## Administração

Além das funções anteriores, deve ter acesso à área administrativa.

Permitir no protótipo:

* visualizar usuários;
* ativar/inativar usuários;
* alterar perfil entre Consulta, Edição e Administração;
* acessar operações administrativas propostas.

Não criar exclusão definitiva de usuário.

IMPORTANTE:

A regra que determinará QUAIS pacientes ou atendimentos cada usuário poderá acessar ainda não foi definida institucionalmente.

Portanto:

NÃO inventar regras de acesso por projeto, paciente, médico, unidade ou equipe.

Simular somente autorização por tipo de operação.

# 7. LOGIN

Criar tela dedicada de login.

Campos:

Login
Senha

Ações:

Entrar

Estados:

* login válido;
* credenciais inválidas;
* campo obrigatório vazio;
* carregamento;
* usuário inativo;
* excesso de tentativas;
* sessão expirada.

Após login válido:

→ carregar identidade
→ redirecionar para Início.

Não usar e-mail como campo obrigatório de autenticação. O contrato atual utiliza `login` e `senha`.

# 8. TELA INICIAL

Criar dashboard inicial simples e operacional.

Não criar analytics avançado.

Exibir quatro indicadores básicos de exemplo:

* pacientes cadastrados;
* atendimentos registrados;
* pendências para revisão;
* importações recentes.

Esses indicadores devem ser apresentados como proposta inicial, pois os KPIs definitivos ainda precisam ser validados pela equipe.

Adicionar:

“Atendimentos recentes”

com:

* paciente;
* data;
* origem;
* status.

Adicionar:

“Pendências recentes”

com:

* tipo;
* origem;
* data;
* status;
* ação “Revisar”.

Adicionar atalhos:

Buscar paciente
Novo atendimento
Nova importação — somente quando permitido
Revisar pendências

# 9. LISTA E BUSCA DE PACIENTES

Criar página “Pacientes”.

Elemento principal:

barra grande de busca.

Permitir busca proposta por:

* nome;
* código de origem/planilha;
* data de nascimento.

Pode haver filtros simples relacionados a informações já modeladas, como projeto ou período, mas não criar uma busca avançada excessiva.

Tabela:

Paciente
Código
Data de nascimento
Origem
Último atendimento
Projetos
Ações

Ações:

Ver ficha

Para Edição/Administração:

Editar
Novo atendimento

Adicionar paginação.

Criar estados:

* carregando;
* sem resultados;
* erro;
* lista vazia.

# 10. PREVENÇÃO DE DUPLICIDADE

Ao clicar em “Novo paciente”, NÃO abrir imediatamente um cadastro vazio.

Abrir primeiro um fluxo:

“Verificar se o paciente já existe”

Solicitar:

* nome;
* data de nascimento.

Mostrar possíveis correspondências.

Para cada resultado:

nome
data de nascimento
código
último atendimento

Ações:

“Abrir paciente”

ou:

“Nenhum destes pacientes”

Somente depois permitir continuar ao cadastro.

Nunca realizar merge automaticamente.

Se houver possível conflito de identidade, deixar explícito que é necessária decisão humana.

# 11. CADASTRO DE PACIENTE

Criar formulário em grupos.

## Identificação

Nome
Data de nascimento
Sexo
Raça/cor

Campo calculado de idade pode ser mostrado apenas de forma informativa.

A regra definitiva para idade importada ainda não está fechada; não criar lógica clínica definitiva baseada nela.

## Comunidade tradicional

Pertence a comunidade tradicional?

Sim
Não
Não informado

Se Sim:

Tipo:

Indígena
Quilombola

## Contato

Telefone

## Endereço

Endereço
Cidade

## Origem

Indicar quando aplicável:

Portador de DC
Não portador de DC
Cadastro pelo sistema

A origem deve ser informativa e visualmente discreta.

Ações:

Cancelar
Salvar paciente

Criar:

* validação;
* loading;
* erro;
* sucesso.

# 12. FICHA DO PACIENTE

Esta deve ser uma das principais telas do sistema.

Cabeçalho:

nome do paciente
código
data de nascimento
idade calculada apenas para exibição quando possível
origem
projetos associados

Ações:

Novo atendimento
Editar paciente

conforme permissão.

Criar navegação interna por abas ou sidebar secundária:

Resumo
Atendimentos
Chagas e Sorologia
Projetos
Exames
Tratamentos
Avaliação Clínica
Encaminhamentos
Notificação

Não transformar cada tabela do banco em uma aba.

# 13. RESUMO DO PACIENTE

Mostrar visão rápida:

Identificação
Contato
Último atendimento
Diagnóstico de Chagas
Projetos
Tratamento com BZN
Exames recentes
Pendências

Adicionar timeline resumida:

2026 — Atendimento
2025 — Exame
2025 — Projeto
2024 — Atendimento

Tudo com dados sintéticos.

# 14. ATENDIMENTOS

Na aba Atendimentos mostrar tabela/timeline com:

Data
Contexto
Origem do registro
Resumo
Pendências

Ação:

Abrir atendimento

Para Edição/Administração:

Novo atendimento

Ao abrir atendimento, mostrar visualização consolidada dos dados registrados naquela consulta.

# 15. NOVO ATENDIMENTO

Criar um formulário extenso, mas organizado por seções compreensíveis.

Evitar uma página com dezenas de campos simultaneamente.

Usar stepper, abas internas ou accordions.

Cabeçalho persistente:

Paciente Sintético 001
Novo atendimento

Seções:

1. Atendimento
2. Chagas e Sorologia
3. Condição Clínica
4. Comorbidades
5. Avaliação Clínica
6. Eventos e Dispositivos
7. Projetos
8. Exames
9. Medicamentos e BZN
10. Encaminhamentos
11. Notificação
12. Observações

Permitir navegar entre seções sem perder dados preenchidos no protótipo.

Botões finais:

Cancelar
Revisar dados
Salvar atendimento

# 16. DADOS DO ATENDIMENTO

Campos:

Data do atendimento
Localização do prontuário
Contexto do atendimento
Origem do registro
Observações

Representar os contextos já existentes sem permitir combinação inválida entre:

“Ambulatório unicamente”
“Ambulatório anexo ao projeto”

# 17. CHAGAS E SOROLOGIA

Criar seção:

## Diagnóstico

Possui diagnóstico de Chagas?
Status do diagnóstico
Resultado final
Data do resultado
Critério de confirmação
Observações

## Sorologias

Permitir múltiplos registros.

Cada sorologia:

Método
Data da solicitação
Data da coleta
Data do resultado
Resultado
Laboratório
Observação

Ação:

“Adicionar sorologia”

## Solicitação de sorologia

Solicitada?
Data
Tipo
Status

Não usar o campo parcialmente definido de autorrelato como informação clínica automática.

Quando ele aparecer em contexto de importação, mostrar:

“Informação de origem preservada — interpretação ainda não validada.”

# 18. CONDIÇÃO CLÍNICA E COMPLICAÇÕES

Campos:

Forma clínica
Fase da doença
Classificação clínica
Possui sintomas?
Descrição dos sintomas
Observações

Complicações devem aceitar múltiplas ocorrências:

Tipo
Presença
Descrição
Gravidade

Botão:

Adicionar complicação

Não criar listas clínicas novas que não estejam definidas.

# 19. COMORBIDADES

Criar lista de comorbidades com seleção múltipla.

Mostrar categorias já existentes no projeto, como:

* doenças cardiovasculares;
* hipertensão arterial;
* diabetes;
* doença renal;
* doenças respiratórias;
* doenças digestórias;
* doenças endócrinas;
* doenças do sistema nervoso;
* doenças psicológicas;
* outras.

Permitir detalhamento para “Outras”.

# 20. AVALIAÇÃO CLÍNICA

Criar formulário organizado:

Altura
Peso
Circunferência abdominal
Frequência cardíaca
Saturação
PA sistólica
PA diastólica
NYHA
Observações

Usar unidades visuais correspondentes aos campos modelados, mas evitar criar regras rígidas adicionais de validação clínica que ainda não estejam aprovadas.

Não calcular diagnóstico ou risco automaticamente.

# 21. EVENTOS CLÍNICOS E DISPOSITIVOS

Criar cards/seções:

## Eventos

AVC
Ano do último AVC
Outros eventos registrados

## Dispositivos

Marcapasso
CDI

Permitir Sim/Não/Não informado.

## Óbito

Óbito registrado?
Data do óbito
Causa

Mostrar esta área de forma sóbria, sem alertas dramáticos desnecessários.

# 22. PROJETOS

Criar aba própria dentro da ficha.

Mostrar projetos associados ao paciente.

Dados:

Projeto
Participa?
Pendência?
Descrição da pendência
Falha?
Descrição da falha

Usar os projetos documentados, entre eles:

SaMi-Trop
Parachute
BenBrasil
EPOCA
Santa Casa DICA
Santa Casa RENOMICA
Santa Casa ARCHIMEDES
Santa Casa CHARM
LXE Novartis

Não criar uma interface específica para o fluxo AIM3.

Permitir associar vários projetos ao mesmo paciente.

# 23. EXAMES

Criar aba “Exames”.

Permitir múltiplos exames do mesmo tipo.

Organizar por:

Trazidos pelo paciente
Solicitados

Cada exame pode mostrar:

Tipo
Bloco/origem
Data
Status
Resultado resumido
Observações

Exemplos de tipos existentes:

ECG
Ecocardiograma
Holter
Teste ergométrico
MAPA
Radiografia
Tomografia
Ressonância
Exames laboratoriais
Outros

Ao abrir um exame:

mostrar detalhes.

Quando houver resultados estruturados:

Nome do campo
Valor
Unidade
Referência
Interpretação

Permitir “Adicionar resultado”.

Não utilizar o indicador genérico “Paciente trouxe outros exames?” ou “Solicitado exames complementares?” como se sua semântica definitiva estivesse aprovada. Esses campos estão entre os pontos que precisam de validação.

# 24. MEDICAMENTOS

Mostrar lista de medicamentos associados ao atendimento.

Campos:

Medicamento
Nome livre quando necessário
Dose
Via
Frequência
Data de início
Data de fim
Uso atual
Prescrito neste atendimento?
Status
Motivo
Observações

Permitir adicionar vários.

# 25. TRATAMENTO COM BENZONIDAZOL

Criar área específica “Benzonidazol”.

Campos:

Usou benzonidazol?
Tratamento pelo ambulatório?
Tempo de uso
Ano de uso
Possui indicação?
Data da prescrição
Motivo quando não utilizado/não indicado
Observações

Não subdividir automaticamente o campo de motivo em significados clínicos diferentes quando a origem não permitir essa conclusão.

# 26. REAÇÕES ADVERSAS AO BENZONIDAZOL

Permitir múltiplas reações adversas associadas ao tratamento.

Mostrar lista com:

data quando disponível
descrição
status/contexto quando disponível

Botão:

Adicionar reação adversa

Evitar criar escalas ou classificações de gravidade não documentadas.

# 27. RETORNOS

Não construir ainda um fluxo clínico definitivo para:

* retorno de 30 dias;
* retorno final;
* retorno anual;
* desfecho do retorno.

Esses campos fazem parte das informações cuja semântica clínica precisa ser validada.

Caso apareçam em registros importados, usar um componente discreto:

“Informação histórica preservada”
“Estruturação pendente de validação clínica”

# 28. ENCAMINHAMENTOS

Criar área de encaminhamentos.

Campos:

Documento apresentado?
Origem
Tipo
Destino
Serviço
Especialidade
Data do encaminhamento
Data do agendamento
Data da realização
Status
Prioridade
Motivo
Conduta
Projeto oficial relacionado — opcional
Observações

Permitir múltiplos encaminhamentos.

Não criar múltiplas contrarreferências.

Não inventar fluxo de contrarreferência enquanto essa cardinalidade não estiver definida.

# 29. ACOMPANHAMENTO E PENDÊNCIAS

Dentro de encaminhamento ou atendimento, mostrar acompanhamento quando houver:

Data prevista
Data realizada
Retorno programado
Compareceu
Status
Tipo
Resumo
Conduta

Criar ainda uma lista de pendências:

Tipo
Descrição
Status
Data de identificação
Data de resolução
Responsável, somente se existir
Observação

# 30. NOTIFICAÇÃO

Criar seção:

Paciente notificado?
Número da notificação
Justificativa quando não notificado

Criar comportamento condicional:

Se Sim:
mostrar número.

Se Não:
mostrar justificativa.

Não criar validações clínicas adicionais além disso.

# 31. OBSERVAÇÕES

Criar campo amplo para observações do atendimento.

A fonte histórica mistura “Pendência/Observação”.

Como essa separação ainda precisa ser validada, não fingir que existe uma taxonomia definitiva.

Pode haver dois componentes visuais:

Observação
Pendência

mas identificar a separação como proposta de interface a ser validada.

# 32. FILA DE PENDÊNCIAS

Criar página global “Pendências”.

Objetivo:

concentrar registros que precisam de revisão humana.

Tabela:

Tipo
Origem
Paciente
Data
Motivo
Status
Ação

Filtros:

Status
Origem
Período

Estados:

Pendente
Em revisão
Resolvida

Ao clicar:

“Abrir revisão”

mostrar:

* contexto;
* motivo;
* informação estruturada existente;
* aviso quando a origem possuir valor sem interpretação segura.

Nunca sugerir automaticamente uma decisão clínica.

A interface deve deixar claro:

“O sistema identifica a inconsistência; a decisão continua humana.”

# 33. IMPORTAÇÕES

Criar área administrativa “Importações”.

A importação é uma ponte para trazer o histórico da planilha; ela NÃO é a interface diária de cadastro.

Tela principal:

Histórico de importações.

Tabela:

Lote
Arquivo
Data
Status
Total de linhas
Importadas
Pendências
Rejeitadas
Ação

Botão:

Nova importação

# 34. NOVA IMPORTAÇÃO

Fluxo em etapas:

1. Selecionar arquivo
2. Validar estrutura
3. Executar simulação
4. Revisar relatório
5. Confirmar importação
6. Resultado

Aceitar visualmente arquivo `.xlsx`.

Informar que o MVP processa apenas:

Pacientes portadores de DC
Pacientes não portadores de DC

Mostrar como fora do escopo:

P Digitar
AIM3

# 35. PREFLIGHT / DRY-RUN

Esta é uma tela importante.

Após selecionar o arquivo, executar visualmente:

“Simular importação”

Mostrar estado de carregamento:

Validando arquivo...
Validando abas...
Analisando cabeçalhos...
Conciliando pacientes...
Validando registros...
Gerando relatório...

Depois mostrar:

RELATÓRIO DE QUALIDADE

Exemplo sintético:

502 linhas
491 importáveis
7 com pendência
4 rejeitadas
2 conflitos de identidade
3 valores inválidos

Mostrar claramente:

“Nenhuma alteração foi persistida durante esta simulação.”

Botões:

Cancelar
Ver detalhes
Confirmar importação

Confirmar importação deve aparecer apenas no cenário em que o usuário esteja autorizado.

# 36. DETALHES DA IMPORTAÇÃO

Mostrar metadados:

ID do lote
Nome do arquivo
Hash resumido
Versão do layout
Versão do manifesto
Versão do importador
Revisão do sistema
Data
Status

Mostrar tabela de linhas:

Linha
Aba
Status
Motivo
Paciente conciliado
Ação

Status:

Importada
Importada com pendência
Rejeitada
Conflito

Não mostrar JSON bruto.

Quando houver dados brutos:

mostrar apenas:

“Conteúdo original armazenado em área restrita.”

# 37. CONFLITO DE IDENTIDADE

Criar uma tela/modal específica.

Exemplo:

Linha 127
possível correspondência com dois pacientes.

Mostrar somente dados sintéticos necessários para comparação:

nome
data de nascimento
código

Ações:

Abrir paciente A
Abrir paciente B
Manter conflito para revisão

Não realizar merge automaticamente.

# 38. REPROCESSAMENTO

Na tela de lote importado, permitir:

“Criar reprocessamento”

Explicar:

“O reprocessamento cria uma nova execução relacionada à anterior.”

Mostrar histórico:

IMP-SINT-001
↓
IMP-SINT-002
↓
IMP-SINT-003

Não substituir silenciosamente o lote anterior.

# 39. DASHBOARD

Criar dashboard básico.

O projeto ainda não definiu indicadores clínicos obrigatórios.

Portanto, priorizar métricas operacionais e claramente apresentadas como propostas para validação:

Pacientes cadastrados
Atendimentos no período
Pendências abertas
Importações realizadas

Criar gráficos simples:

Atendimentos por período
Pacientes por origem
Distribuição por projetos

Evitar:

* prognósticos;
* scores clínicos;
* risco calculado;
* recomendações médicas;
* gráficos excessivos;
* dezenas de KPIs.

Adicionar filtro de período.

# 40. EXPORTAÇÃO CSV

Criar interação “Exportar CSV”.

A regra institucional sobre quem pode exportar quais dados ainda precisa ser definida.

Portanto, criar dois estados da interface:

AUTORIZADO

botão ativo
→ abre confirmação
→ informa escopo da exportação
→ gera arquivo sintético
→ mensagem “Exportação concluída”

NÃO AUTORIZADO

botão desabilitado ou ação negada
→ “Você não possui permissão para exportar estes dados.”

Não definir permanentemente qual dos três perfis possui essa permissão.

A interface deve ser capaz de suportar ambos os cenários.

# 41. USUÁRIOS

Página exclusiva para Administração.

Tabela:

Nome
Login
Perfil
Status
Ações

Perfis:

Consulta
Edição
Administração

Ações:

Alterar perfil
Ativar
Inativar

Ao mudar perfil:

abrir modal de confirmação.

Ao inativar:

abrir modal explicando que o usuário perderá acesso.

Não criar:

* exclusão definitiva;
* vínculo automático com o responsável pela digitação da planilha;
* MFA;
* SSO;
* fluxos avançados de recuperação de conta.

Essas decisões não estão fechadas.

# 42. PERFIL DO USUÁRIO

No canto superior direito:

Nome
Perfil

Menu:

Minha conta
Sair

Tela “Minha conta” simples:

Nome
Login
Perfil
Status

Não permitir que o próprio usuário altere seu perfil.

# 43. ESTADOS DE AUTORIZAÇÃO

Criar páginas/estados:

401 — Sessão inválida ou expirada
403 — Você não possui permissão
404 — Registro não encontrado
500 — Não foi possível concluir a operação

Mensagens devem ser humanas e não revelar:

SQL
estrutura do banco
stack trace
tokens
credenciais
detalhes internos.

# 44. ESTADOS DE FORMULÁRIO

Todos os formulários devem possuir:

* campo normal;
* foco;
* preenchido;
* obrigatório;
* inválido;
* desabilitado;
* leitura;
* loading;
* erro;
* sucesso.

Criar confirmação quando o usuário tentar sair de formulário alterado sem salvar.

# 45. FEEDBACK

Usar feedback discreto:

toast de sucesso:
“Atendimento salvo com sucesso.”

erro:
“Não foi possível salvar. Revise os campos destacados.”

permissão:
“Seu perfil não permite esta operação.”

pendência:
“Este registro possui informação que precisa de revisão.”

# 46. FUNCIONALIDADE DO PROTÓTIPO

Não criar apenas telas estáticas.

Implementar navegação e estado local simulados.

Os seguintes fluxos precisam funcionar de ponta a ponta:

FLUXO 1 — Consulta

Login
→ Início
→ Pacientes
→ busca
→ ficha
→ atendimento
→ voltar
→ logout

Tentar editar:
→ mostrar bloqueio de permissão.

FLUXO 2 — Novo paciente

Login como Edição
→ Pacientes
→ Novo paciente
→ verificar duplicidade
→ nenhum resultado correspondente
→ cadastro
→ salvar
→ abrir ficha.

FLUXO 3 — Novo atendimento

Ficha
→ Novo atendimento
→ preencher seções
→ Revisar dados
→ Salvar
→ atendimento aparecer no histórico.

FLUXO 4 — Exame

Ficha
→ Exames
→ adicionar exame
→ selecionar tipo
→ definir trazido/solicitado
→ preencher resultado
→ salvar
→ aparecer na lista.

FLUXO 5 — BZN

Ficha
→ Tratamentos
→ adicionar/editar BZN
→ registrar reação adversa
→ salvar
→ reação aparecer associada.

FLUXO 6 — Pendência

Pendências
→ selecionar item
→ abrir revisão
→ visualizar contexto
→ atualizar somente quando permitido
→ concluir revisão.

FLUXO 7 — Importação

Importações
→ Nova importação
→ selecionar XLSX fictício
→ validar
→ dry-run
→ relatório de qualidade
→ detalhes
→ confirmação
→ lote concluído
→ visualizar linhas.

FLUXO 8 — Reprocessamento

Importação concluída
→ Criar reprocessamento
→ nova execução
→ mostrar vínculo com lote anterior.

FLUXO 9 — Administração

Usuários
→ selecionar usuário
→ trocar perfil
→ confirmar
→ status atualizado.

FLUXO 10 — Exportação

Cenário autorizado:
Dashboard ou busca
→ Exportar CSV
→ confirmar
→ sucesso.

Cenário sem autorização:
→ bloquear exportação.

# 47. DADOS DE DEMONSTRAÇÃO

Criar aproximadamente:

12 pacientes sintéticos
20–30 atendimentos sintéticos
5 projetos diferentes
10–15 exames
3 tratamentos BZN
5 reações adversas
6 encaminhamentos
8 pendências
3 lotes de importação
6 usuários distribuídos entre os três perfis

Usar variação suficiente para demonstrar:

* paciente sem Chagas;
* paciente com diagnóstico confirmado;
* paciente com múltiplas sorologias;
* paciente em projeto;
* paciente em vários projetos;
* paciente com exame trazido;
* exame solicitado;
* paciente com BZN;
* reação adversa;
* encaminhamento;
* pendência;
* registro vindo da importação;
* paciente cadastrado diretamente no sistema.

Tudo precisa ser sintético.

# 48. PRINCÍPIOS DE UX

O usuário principal não é da área de TI.

Portanto:

Não usar na interface:

* nomes de tabelas SQL;
* UUID como informação principal;
* migrations;
* JSONB;
* JWT;
* PostgreSQL;
* endpoints;
* IDs técnicos longos;
* termos de infraestrutura.

Usar linguagem do trabalho cotidiano:

Paciente
Atendimento
Exame
Projeto
Tratamento
Encaminhamento
Pendência
Importação
Notificação

Priorizar clareza sobre densidade de informação.

Campos técnicos devem permanecer invisíveis quando não forem necessários ao usuário.

# 49. NÃO TOMAR DECISÕES CLÍNICAS

Este sistema organiza informações; ele não substitui profissionais de saúde.

Não criar:

* recomendações terapêuticas;
* alertas de diagnóstico automático;
* cálculo de indicação de BZN;
* interpretação automática de sorologia;
* classificação automática da doença;
* recomendação baseada em sinais vitais;
* prognósticos;
* IA clínica.

Validação clínica permanece responsabilidade humana.

# 50. QUESTÕES AINDA ABERTAS QUE A INTERFACE NÃO DEVE “RESOLVER”

Não inventar resposta para:

* regra definitiva de idade importada;
* interpretação da data de autorrelato;
* significado clínico de familiares terem realizado exame de Chagas;
* significado isolado dos indicadores gerais “trouxe exames” e “solicitou exames”;
* retorno de 30 dias;
* retorno final;
* retorno anual;
* desfecho do retorno;
* significado de `Localizado`;
* múltiplas contrarreferências;
* separação definitiva entre pendência e observação;
* existência ou uso de um prontuário permanente;
* filtros considerados indispensáveis pela instituição;
* KPIs clínicos definitivos;
* política definitiva de exportação;
* política de acesso por paciente/atendimento/projeto;
* política de exclusão ou histórico de correções;
* vínculo entre digitador legado e usuário autenticado.

Sempre que necessário, mostrar essas situações como “A definir”, sem bloquear a exploração do restante do protótipo.

# 51. RESULTADO ESPERADO

O resultado deve parecer um software hospitalar real em estágio avançado de design e não um wireframe.

Preciso conseguir utilizar o protótipo em uma reunião com profissionais que não são da área de TI e demonstrar:

1. como seria entrar no sistema;
2. como encontrar um paciente;
3. como evitar cadastro duplicado;
4. como é a ficha longitudinal;
5. como registrar um atendimento;
6. como consultar diagnóstico e sorologias;
7. como registrar avaliações clínicas;
8. como consultar projetos;
9. como registrar e acompanhar exames;
10. como acompanhar tratamento com BZN;
11. como visualizar encaminhamentos;
12. como revisar pendências;
13. como importar a planilha histórica com dry-run;
14. como tratar conflitos sem decisão automática;
15. como visualizar um dashboard básico;
16. como funcionaria uma exportação autorizada;
17. como os três perfis alteram o comportamento da interface;
18. como a Administração gerencia ativação e perfil de usuários.

O protótipo deve transmitir claramente a transformação:

PLANILHA EXTENSA E FRAGMENTADA
→
FICHA ÚNICA DO PACIENTE
→
ATENDIMENTOS ORGANIZADOS
→
HISTÓRICO LONGITUDINAL
→
DADOS CONSULTÁVEIS
→
IMPORTAÇÃO RASTREÁVEL
→
PENDÊNCIAS EXPLÍCITAS
→
ACESSO CONTROLADO.

Não adicionar funcionalidades apenas para deixar o produto mais sofisticado. Priorizar fidelidade ao escopo, clareza operacional, segurança e facilidade de demonstração.
