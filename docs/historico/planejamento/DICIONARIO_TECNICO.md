# Dicionário de Dados Técnico — Sistema Ambulatorial

> Documento histórico, movido de `planejamento/Dicionário de Dados Técnico.md` em 2026-10-23.
> Propostas e comandos abaixo descrevem a origem e não o estado vigente.
> Consulte o [índice atual](../../README.md) e o
> [modelo físico](../../MODELO_FISICO_ATUAL.md) antes de implementar.

## 1. Convenções gerais

Banco recomendado: PostgreSQL.

Padrão de nomes: `snake_case`.

Tipo padrão para chaves primárias: `UUID`.

Campos de data:

- `DATE`: quando importa apenas a data.

- `TIMESTAMP`: quando importa data e hora.


Campos booleanos:

- Usar `BOOLEAN` para respostas do tipo sim/não.

- Quando a planilha tiver valores ambíguos, como “sim”, “não”, “pendente”, “não sabe”, “não informado”, considerar `VARCHAR` ou criar campo de observação complementar.


Campos de auditoria recomendados nas principais tabelas:

|Campo|Tipo|Obrigatório|Descrição|
|---|--:|--:|---|
|criado_em|TIMESTAMP|Sim|Data e hora de criação do registro.|
|atualizado_em|TIMESTAMP|Sim|Data e hora da última atualização.|
|ativo|BOOLEAN|Sim|Indica se o registro está ativo.|

Quando houver necessidade de rastrear usuário:

|Campo|Tipo|Obrigatório|Descrição|
|---|--:|--:|---|
|criado_por_usuario_id|UUID|Não|Usuário que criou o registro.|
|atualizado_por_usuario_id|UUID|Não|Usuário que atualizou o registro.|

---

## 2. Tabela: paciente

### Finalidade

Armazenar os dados principais do paciente. Esta tabela representa a entidade central do sistema.

### Colunas da planilha cobertas

- ID

- Nome

- Data de Nascimento

- Idade

- Sexo

- Raça

- Pertence a comunidade Quilombola ou indígena

- Qual? Indígena ou quilombola?

- Origem da aba: portador ou não portador de DC


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador interno do paciente.|
|codigo_planilha|VARCHAR(100)|Sim|UNIQUE|ID original vindo da planilha.|
|nome_completo|VARCHAR(255)|Sim||Nome do paciente.|
|data_nascimento|DATE|Não||Data de nascimento.|
|idade_importada|INTEGER|Não||Idade informada na planilha no momento da importação.|
|sexo|VARCHAR(30)|Não||Sexo informado na planilha.|
|raca|VARCHAR(50)|Não||Raça/cor informada.|
|pertence_comunidade_tradicional|BOOLEAN|Não||Indica se pertence a comunidade quilombola ou indígena.|
|tipo_comunidade_tradicional|VARCHAR(50)|Não||Indica se é indígena, quilombola ou outro valor registrado.|
|origem_aba|VARCHAR(100)|Sim||Informa se veio da aba de portador ou não portador de DC.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o paciente está ativo.|

### Relacionamentos

- `paciente` 1:N `paciente_endereco`

- `paciente` 1:N `paciente_contato`

- `paciente` 1:N `atendimento`

- `paciente` N:N `programa`, via `paciente_programa`

- `paciente` N:N `comorbidade`, via `paciente_comorbidade`

- `paciente` N:N `classe_medicamento`, via `paciente_medicamento`

- `paciente` 1:N `diagnostico_chagas`

- `paciente` 1:N `sorologia_chagas`

- `paciente` 1:N `exame`

- `paciente` 1:N `exame_complementar`

- `paciente` 1:N `tratamento_benzonidazol`


### Regras

- `codigo_planilha` deve ser preservado para rastreabilidade.

- `idade_importada` não deve substituir o cálculo de idade pelo sistema. Ela serve para auditoria.

- `origem_aba` é obrigatória porque diferencia pacientes portadores e não portadores de DC no arquivo original.


---

## 3. Tabela: paciente_endereco

### Finalidade

Armazenar endereço e cidade do paciente.

### Colunas da planilha cobertas

- Endereço

- Cidade


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do endereço.|
|paciente_id|UUID|Sim|FK|Referência ao paciente.|
|endereco|TEXT|Não||Endereço completo conforme planilha.|
|cidade|VARCHAR(150)|Não||Cidade do paciente.|
|principal|BOOLEAN|Sim||Indica se é o endereço principal.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o endereço está ativo.|

### Relacionamentos

- `paciente_endereco.paciente_id` referencia `paciente.id`.


### Regras

- Um paciente pode ter mais de um endereço.

- Durante a importação da planilha, o endereço importado deve ser marcado como `principal = true`.


---

## 4. Tabela: paciente_contato

### Finalidade

Armazenar dados de contato do paciente.

### Colunas da planilha cobertas

- Telefone de Contato


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do contato.|
|paciente_id|UUID|Sim|FK|Referência ao paciente.|
|tipo_contato|VARCHAR(50)|Sim||Tipo do contato, por exemplo telefone.|
|valor_contato|VARCHAR(100)|Sim||Número ou meio de contato.|
|principal|BOOLEAN|Sim||Indica se é o contato principal.|
|observacao|TEXT|Não||Observações sobre o contato.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o contato está ativo.|

### Relacionamentos

- `paciente_contato.paciente_id` referencia `paciente.id`.


### Regras

- Um paciente pode ter vários contatos.

- O telefone importado da planilha deve ser registrado como `tipo_contato = 'telefone'`.


---

## 5. Tabela: usuario

### Finalidade

Cadastrar usuários do sistema, especialmente responsáveis por digitação, importação e manutenção dos dados.

### Colunas da planilha cobertas

- Responsavel pela digitacao


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do usuário.|
|nome|VARCHAR(255)|Sim||Nome do usuário ou responsável pela digitação.|
|email|VARCHAR(255)|Não|UNIQUE|E-mail de acesso, se houver.|
|senha_hash|TEXT|Não||Senha criptografada, se o sistema tiver autenticação própria.|
|perfil|VARCHAR(50)|Sim||Perfil de acesso: admin, digitador, pesquisador, consulta etc.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o usuário está ativo.|

### Relacionamentos

- `usuario` pode ser referenciado por `atendimento`.

- `usuario` pode ser referenciado por `importacao_planilha`.


### Regras

- Quando a planilha trouxer apenas o nome do responsável, o sistema deve criar ou reaproveitar um usuário com aquele nome.

- `email` pode ser nulo na importação inicial, mas deve ser obrigatório para usuários que acessarem o sistema.


---

## 6. Tabela: atendimento

### Finalidade

Registrar cada atendimento realizado com o paciente.

### Colunas da planilha cobertas

- Data do atendimento

- Localização do prontuário

- Responsavel pela digitacao

- Pendencias/Observação


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do atendimento.|
|paciente_id|UUID|Sim|FK|Paciente atendido.|
|usuario_digitacao_id|UUID|Não|FK|Usuário responsável pela digitação.|
|data_atendimento|DATE|Sim||Data do atendimento.|
|localizacao_prontuario|VARCHAR(255)|Não||Localização do prontuário.|
|pendencias_observacao|TEXT|Não||Pendências ou observações gerais do atendimento.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o atendimento está ativo.|

### Relacionamentos

- `atendimento.paciente_id` referencia `paciente.id`.

- `atendimento.usuario_digitacao_id` referencia `usuario.id`.

- `atendimento` pode estar ligado a exames, dados clínicos, observações, encaminhamentos e notificações.


### Regras

- Todo atendimento deve estar vinculado a um paciente.

- A data do atendimento deve ser obrigatória quando existir na planilha.

- `pendencias_observacao` também pode ser replicado em `atendimento_observacao` para tratamento estruturado de observações.


---

## 7. Tabela: programa

### Finalidade

Cadastrar os programas, projetos ou grupos institucionais associados aos pacientes.

### Colunas da planilha cobertas como cadastro

- SaMi-Trop AIM3

- SaMi-Trop 1.1

- Parachute

- BenBrasil

- Ambulatório unicamente

- Ambulatório anexo ao projeto

- EPOCA

- Santa Casa DICA

- Santa Casa RENOMICA

- Santa Casa ARCHIMEDES

- Santa Casa CHARM

- LXE Novartis


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do programa.|
|nome|VARCHAR(150)|Sim|UNIQUE|Nome do programa/projeto.|
|descricao|TEXT|Não||Descrição do programa.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o programa está ativo.|

### Relacionamentos

- `programa` N:N `paciente`, via `paciente_programa`.


### Regras

Devem existir registros iniciais para:

- SaMi-Trop AIM3

- SaMi-Trop 1.1

- Parachute

- BenBrasil

- Ambulatório unicamente

- Ambulatório anexo ao projeto

- EPOCA

- Santa Casa DICA

- Santa Casa RENOMICA

- Santa Casa ARCHIMEDES

- Santa Casa CHARM

- LXE Novartis


---

## 8. Tabela: paciente_programa

### Finalidade

Registrar o vínculo entre paciente e programa/projeto.

### Colunas da planilha cobertas

- SaMi-Trop AIM3

- SaMi-Trop AIM3 PENDÊNCIA

- SaMi-Trop 1.1

- Parachute

- Parachute falha

- Benbrasil

- BenBrasil

- BenBrasil FALHA

- Ambulatório unicamente

- Ambulatório anexo ao projeto

- EPOCA

- Falha EPOCA

- EPOCA FALHA

- Santa Casa DICA

- Santa Casa RENOMICA

- Santa Casa ARCHIMEDES

- Santa Casa CHARM

- LXE Novartis

- LXE Novartis falha


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do vínculo.|
|paciente_id|UUID|Sim|FK|Paciente vinculado.|
|programa_id|UUID|Sim|FK|Programa relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento em que o vínculo foi registrado.|
|participa|BOOLEAN|Não||Indica se o paciente participa do programa.|
|possui_pendencia|BOOLEAN|Não||Indica se há pendência relacionada ao programa.|
|possui_falha|BOOLEAN|Não||Indica se houve falha relacionada ao programa.|
|descricao_pendencia|TEXT|Não||Detalhamento da pendência.|
|descricao_falha|TEXT|Não||Detalhamento da falha.|
|valor_original_planilha|TEXT|Não||Valor bruto importado da célula da planilha.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o vínculo está ativo.|

### Relacionamentos

- `paciente_programa.paciente_id` referencia `paciente.id`.

- `paciente_programa.programa_id` referencia `programa.id`.

- `paciente_programa.atendimento_id` referencia `atendimento.id`.


### Regras

- Um paciente pode participar de vários programas.

- Um programa pode ter vários pacientes.

- Deve existir restrição de unicidade preferencial: `paciente_id + programa_id + atendimento_id`.

- Campos duplicados como `Benbrasil` e `BenBrasil` devem ser normalizados para o mesmo programa: `BenBrasil`.

- `Falha EPOCA` e `EPOCA FALHA` devem alimentar o mesmo programa, com `possui_falha = true`.


---

## 9. Tabela: encaminhamento

### Finalidade

Registrar informações de encaminhamento do paciente.

### Colunas da planilha cobertas

- Trouxe encaminhamento

- Origem encaminhamento


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do encaminhamento.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|trouxe_encaminhamento|BOOLEAN|Não||Indica se o paciente trouxe encaminhamento.|
|origem_encaminhamento|VARCHAR(255)|Não||Origem do encaminhamento.|
|observacao|TEXT|Não||Observações sobre o encaminhamento.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Relacionamentos

- `encaminhamento.paciente_id` referencia `paciente.id`.

- `encaminhamento.atendimento_id` referencia `atendimento.id`.


---

## 10. Tabela: encaminhamento_projeto

### Finalidade

Registrar para qual projeto o paciente foi encaminhado.

### Colunas da planilha cobertas

- Encaminhado a qual projeto?


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do encaminhamento ao projeto.|
|paciente_id|UUID|Sim|FK|Paciente encaminhado.|
|atendimento_id|UUID|Não|FK|Atendimento em que o encaminhamento foi registrado.|
|programa_id|UUID|Não|FK|Projeto/programa de destino, se cadastrado.|
|projeto_nome_original|TEXT|Não||Nome do projeto conforme escrito na planilha.|
|observacao|TEXT|Não||Observações adicionais.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Relacionamentos

- `encaminhamento_projeto.paciente_id` referencia `paciente.id`.

- `encaminhamento_projeto.atendimento_id` referencia `atendimento.id`.

- `encaminhamento_projeto.programa_id` referencia `programa.id`.


---

## 11. Tabela: contrarreferencia

### Finalidade

Registrar se a contrarreferência foi realizada.

### Colunas da planilha cobertas

- Paciente com contrarreferencia realizada?


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador da contrarreferência.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|contrarreferencia_realizada|BOOLEAN|Não||Indica se foi realizada.|
|observacao|TEXT|Não||Observações sobre a contrarreferência.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

---

## 12. Tabela: diagnostico_chagas

### Finalidade

Registrar o diagnóstico consolidado de doença de Chagas.

### Colunas da planilha cobertas

- Diagnóstico da DC por sorologia

- Resultado final da sorologia

- Autorelato diagnóstico de Chagas do participante (data)


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do diagnóstico.|
|paciente_id|UUID|Sim|FK|Paciente diagnosticado ou avaliado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|diagnostico_dc_por_sorologia|VARCHAR(100)|Não||Diagnóstico da DC por sorologia.|
|resultado_final_sorologia|VARCHAR(100)|Não||Resultado final consolidado da sorologia.|
|autorrelato_diagnostico_chagas|BOOLEAN|Não||Indica se houve autorrelato de diagnóstico.|
|data_autorrelato_diagnostico|DATE|Não||Data informada para o autorrelato.|
|observacao|TEXT|Não||Observações diagnósticas.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Relacionamentos

- `diagnostico_chagas.paciente_id` referencia `paciente.id`.

- `diagnostico_chagas.atendimento_id` referencia `atendimento.id`.


### Regras

- Esta tabela representa o diagnóstico consolidado, não cada teste sorológico individual.

- Os métodos e datas das sorologias ficam em `sorologia_chagas`.


---

## 13. Tabela: sorologia_chagas

### Finalidade

Registrar os métodos e datas das sorologias realizadas para doença de Chagas.

### Colunas da planilha cobertas

- Caso seja sorologia: Metodo 1

- Data da Sorologia 01

- Caso seja sorologia: Metodo 2

- Data sorologia 2

- Caso seja sorologia: Metodo 3

- Data sorologia 3


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador da sorologia.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|numero_sorologia|INTEGER|Sim||Ordem da sorologia: 1, 2 ou 3.|
|metodo|VARCHAR(150)|Não||Método utilizado na sorologia.|
|data_sorologia|DATE|Não||Data da sorologia.|
|resultado|VARCHAR(100)|Não||Resultado individual, se disponível.|
|observacao|TEXT|Não||Observações sobre a sorologia.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Relacionamentos

- `sorologia_chagas.paciente_id` referencia `paciente.id`.

- `sorologia_chagas.atendimento_id` referencia `atendimento.id`.


### Regras

- Cada método da planilha deve virar um registro separado.

- `numero_sorologia` deve aceitar preferencialmente os valores 1, 2 e 3.

- A combinação `paciente_id + atendimento_id + numero_sorologia` deve ser única, quando houver atendimento vinculado.


---

## 14. Tabela: sorologia_solicitacao

### Finalidade

Registrar solicitações de sorologia ainda que o exame não tenha resultado informado.

### Colunas da planilha cobertas

- Ou solicitado sorologia

- Se sim, data solicitada


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador da solicitação.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento em que a sorologia foi solicitada.|
|sorologia_solicitada|BOOLEAN|Não||Indica se a sorologia foi solicitada.|
|data_solicitacao|DATE|Não||Data da solicitação.|
|status_solicitacao|VARCHAR(50)|Não||Status: solicitada, realizada, pendente, cancelada etc.|
|observacao|TEXT|Não||Observações da solicitação.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

---

## 15. Tabela: historico_familiar_chagas

### Finalidade

Registrar histórico familiar relacionado à doença de Chagas.

### Colunas da planilha cobertas

- Familiares diretos (mãe, pai, irmãos) realizaram o exame de Chagas?


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do histórico familiar.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|familiares_diretos_realizaram_exame|BOOLEAN|Não||Indica se familiares diretos realizaram exame de Chagas.|
|detalhe|TEXT|Não||Detalhes sobre mãe, pai, irmãos ou outros familiares.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

---

## 16. Tabela: condicao_chagas

### Finalidade

Registrar a forma clínica e a classificação da cardiopatia chagásica.

### Colunas da planilha cobertas

- Forma da DC

- Classificacao da cardiopatia chagasica


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador da condição clínica.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|forma_dc|VARCHAR(100)|Não||Forma clínica da doença de Chagas.|
|classificacao_cardiopatia_chagasica|VARCHAR(150)|Não||Classificação da cardiopatia chagásica.|
|observacao|TEXT|Não||Observações clínicas.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

---

## 17. Tabela: complicacao_chagas

### Finalidade

Registrar complicações relacionadas à doença de Chagas.

### Colunas da planilha cobertas

- Complicações relacionadas a DC

- Complicações cardiacas relacioadas a DC

- Complicações do trato digestivo relacioadas a DC

- Outras complicações relacionadas a DC, qual?


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador da complicação.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|possui_complicacao_dc|BOOLEAN|Não||Indica se há complicação relacionada à DC.|
|complicacao_cardiaca|TEXT|Não||Descrição de complicações cardíacas.|
|complicacao_digestiva|TEXT|Não||Descrição de complicações digestivas.|
|outra_complicacao|TEXT|Não||Outras complicações relacionadas à DC.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

---

## 18. Tabela: comorbidade

### Finalidade

Cadastrar tipos de comorbidades não relacionadas diretamente à doença de Chagas.

### Colunas da planilha cobertas como cadastro

- Doenças do sistema cardiovascular

- Hipertensão arterial

- Doenças do sistema imunológico

- Doenças do sistema nervoso

- Doenças psicológicas

- Doenças do sistema respiratório

- Doenças do sistema digestório

- Doenças do sistema endócrino

- Doenças do sistema tegumentar

- Diabetes

- Doença renal

- Outras doenças


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador da comorbidade.|
|nome|VARCHAR(150)|Sim|UNIQUE|Nome da comorbidade ou grupo de doença.|
|categoria|VARCHAR(100)|Não||Categoria clínica.|
|descricao|TEXT|Não||Descrição complementar.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se a comorbidade está ativa.|

### Regras

Devem existir registros iniciais para:

- Doenças do sistema cardiovascular

- Hipertensão arterial

- Doenças do sistema imunológico

- Doenças do sistema nervoso

- Doenças psicológicas

- Doenças do sistema respiratório

- Doenças do sistema digestório

- Doenças do sistema endócrino

- Doenças do sistema tegumentar

- Diabetes

- Doença renal

- Outras doenças


---

## 19. Tabela: paciente_comorbidade

### Finalidade

Registrar quais comorbidades o paciente possui.

### Colunas da planilha cobertas

- Comorbidades não relacionadas a DC?

- Doenças do sistema cardiovascular

- Hipertensão arterial

- Doenças do sistema imunológico

- Doenças do sistema nervoso

- Doenças psicológicas

- Doenças do sistema respiratório

- Doenças do sistema digestório

- Doenças do sistema endócrino

- Doenças do sistema tegumentar

- Diabetes

- Doença renal

- Outras doenças


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do vínculo.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|comorbidade_id|UUID|Sim|FK|Comorbidade relacionada.|
|possui_comorbidade|BOOLEAN|Não||Indica se o paciente possui a comorbidade.|
|detalhe|TEXT|Não||Detalhamento da comorbidade, especialmente para “Outras doenças”.|
|valor_original_planilha|TEXT|Não||Valor bruto importado da célula.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Relacionamentos

- `paciente_comorbidade.paciente_id` referencia `paciente.id`.

- `paciente_comorbidade.comorbidade_id` referencia `comorbidade.id`.

- `paciente_comorbidade.atendimento_id` referencia `atendimento.id`.


### Regras

- Um paciente pode ter várias comorbidades.

- Uma comorbidade pode estar associada a vários pacientes.

- A coluna “Comorbidades não relacionadas a DC?” pode ser usada como indicador geral, enquanto as demais detalham quais são.


---

## 20. Tabela: tipo_exame_laboratorial

### Finalidade

Cadastrar tipos de exames laboratoriais.

### Colunas da planilha cobertas como cadastro

- Glicemia

- Colesterol HDL

- Colesterol LDL

- Triglicerídeos


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do tipo de exame.|
|nome|VARCHAR(150)|Sim|UNIQUE|Nome do exame laboratorial.|
|unidade_padrao|VARCHAR(50)|Não||Unidade esperada, por exemplo mg/dL.|
|descricao|TEXT|Não||Descrição do exame.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o tipo está ativo.|

### Regras

Devem existir registros iniciais para:

- Glicemia

- Colesterol HDL

- Colesterol LDL

- Triglicerídeos


---

## 21. Tabela: resultado_laboratorial

### Finalidade

Registrar resultados de exames laboratoriais do paciente.

### Colunas da planilha cobertas

- Valor da glicemia

- Valor de colesterol HDL

- Valor de colesterol LDL

- Triglicerideos

- Data do Exame Colesterol


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do resultado.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|tipo_exame_laboratorial_id|UUID|Sim|FK|Tipo de exame laboratorial.|
|valor|NUMERIC(10,2)|Não||Valor numérico do resultado.|
|valor_texto|TEXT|Não||Valor textual, caso não seja possível converter para número.|
|unidade|VARCHAR(50)|Não||Unidade do exame.|
|data_exame|DATE|Não||Data do exame.|
|observacao|TEXT|Não||Observações sobre o resultado.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Relacionamentos

- `resultado_laboratorial.paciente_id` referencia `paciente.id`.

- `resultado_laboratorial.atendimento_id` referencia `atendimento.id`.

- `resultado_laboratorial.tipo_exame_laboratorial_id` referencia `tipo_exame_laboratorial.id`.


### Regras

- Cada resultado laboratorial deve virar uma linha.

- A coluna “Data do Exame Colesterol” deve ser aplicada aos exames de colesterol HDL, LDL e triglicerídeos quando for a única data disponível.

- Para glicemia, se não houver data própria na planilha, `data_exame` pode ficar nulo ou receber a data do atendimento, conforme regra decidida pelo projeto.


---

## 22. Tabela: evento_clinico

### Finalidade

Registrar eventos clínicos relevantes.

### Colunas da planilha cobertas

- teve AVC

- Ano do ultimo AVC

- teve reação adversa?


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do evento clínico.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|tipo_evento|VARCHAR(100)|Sim||Tipo do evento: AVC, reação adversa etc.|
|ocorreu|BOOLEAN|Não||Indica se o evento ocorreu.|
|ano_evento|INTEGER|Não||Ano do evento, quando disponível.|
|descricao|TEXT|Não||Descrição do evento.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o evento está ativo.|

### Regras

- “teve AVC” deve gerar registro com `tipo_evento = 'AVC'`.

- “Ano do ultimo AVC” deve preencher `ano_evento`.

- “teve reação adversa?” deve gerar registro com `tipo_evento = 'Reação adversa'`.

- Se houver mais detalhes futuramente, devem entrar em `descricao`.


---

## 23. Tabela: dispositivo_implantado

### Finalidade

Registrar dispositivos implantados no paciente.

### Colunas da planilha cobertas

- portador de marcapasso?

- portador de CDI?


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do dispositivo.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|tipo_dispositivo|VARCHAR(100)|Sim||Tipo: marcapasso, CDI etc.|
|possui_dispositivo|BOOLEAN|Não||Indica se o paciente possui o dispositivo.|
|observacao|TEXT|Não||Observações sobre o dispositivo.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Regras

- “portador de marcapasso?” deve gerar registro com `tipo_dispositivo = 'Marcapasso'`.

- “portador de CDI?” deve gerar registro com `tipo_dispositivo = 'CDI'`.


---

## 24. Tabela: classe_medicamento

### Finalidade

Cadastrar classes de medicamentos.

### Colunas da planilha cobertas como cadastro

- Anti- hipertensivo

- Diuréticos

- Anti-coagulantes

- Anti-arritmicos

- Anti- depressivos

- IECA/BRA

- INRA

- Alfa/Betabloqueador

- Vasodilatador

- Hipoglicemiante

- Estatinas

- Bloqueador de cálcio

- Outros medicamentos


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador da classe.|
|nome|VARCHAR(150)|Sim|UNIQUE|Nome da classe medicamentosa.|
|descricao|TEXT|Não||Descrição da classe.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se a classe está ativa.|

### Regras

Devem existir registros iniciais para todas as classes listadas.

---

## 25. Tabela: paciente_medicamento

### Finalidade

Registrar medicamentos ou classes de medicamentos em uso pelo paciente.

### Colunas da planilha cobertas

- Anti- hipertensivo

- Diuréticos

- Anti-coagulantes

- Anti-arritmicos

- Anti- depressivos

- IECA/BRA

- INRA

- Alfa/Betabloqueador

- Vasodilatador

- Hipoglicemiante

- Estatinas

- Bloqueador de cálcio

- Outros medicamentos


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do medicamento do paciente.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|classe_medicamento_id|UUID|Sim|FK|Classe medicamentosa.|
|em_uso|BOOLEAN|Não||Indica se o paciente usa medicamento daquela classe.|
|nome_medicamento|VARCHAR(255)|Não||Nome do medicamento, se informado.|
|detalhe|TEXT|Não||Detalhes, especialmente para “Outros medicamentos”.|
|valor_original_planilha|TEXT|Não||Valor bruto importado da célula.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Relacionamentos

- `paciente_medicamento.paciente_id` referencia `paciente.id`.

- `paciente_medicamento.classe_medicamento_id` referencia `classe_medicamento.id`.

- `paciente_medicamento.atendimento_id` referencia `atendimento.id`.


---

## 26. Tabela: tipo_exame

### Finalidade

Cadastrar tipos gerais de exames.

### Colunas da planilha cobertas como cadastro

- ECG

- ECO


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do tipo de exame.|
|nome|VARCHAR(100)|Sim|UNIQUE|Nome do tipo de exame.|
|descricao|TEXT|Não||Descrição do exame.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o tipo está ativo.|

### Regras

Devem existir registros iniciais para:

- ECG

- ECO


---

## 27. Tabela: exame

### Finalidade

Registrar exames gerais realizados ou solicitados.

### Colunas da planilha cobertas

- ECG

- Resultado ecg

- Data do ecg

- ECG solicitado

- ECO


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do exame.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|tipo_exame_id|UUID|Sim|FK|Tipo do exame.|
|realizado|BOOLEAN|Não||Indica se o exame foi realizado.|
|solicitado|BOOLEAN|Não||Indica se o exame foi solicitado.|
|data_exame|DATE|Não||Data de realização do exame.|
|resultado|TEXT|Não||Resultado textual do exame.|
|valor_original_planilha|TEXT|Não||Valor bruto importado da planilha.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o exame está ativo.|

### Relacionamentos

- `exame.paciente_id` referencia `paciente.id`.

- `exame.atendimento_id` referencia `atendimento.id`.

- `exame.tipo_exame_id` referencia `tipo_exame.id`.


### Regras

- `ECG` deve gerar exame do tipo ECG.

- `Resultado ecg` deve preencher `resultado`.

- `Data do ecg` deve preencher `data_exame`.

- `ECG solicitado` deve preencher `solicitado`.

- `ECO` deve gerar exame do tipo ECO.

- Detalhes específicos do ecocardiograma devem ser registrados em `ecocardiograma`.


---

## 28. Tabela: ecocardiograma

### Finalidade

Registrar dados específicos do ecocardiograma.

### Colunas da planilha cobertas

- FEVE%


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do ecocardiograma.|
|exame_id|UUID|Sim|FK|Exame ECO relacionado.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|feve_percentual|NUMERIC(5,2)|Não||Fração de ejeção do ventrículo esquerdo em percentual.|
|feve_texto_original|TEXT|Não||Valor bruto caso não seja possível converter para número.|
|observacao|TEXT|Não||Observações do ecocardiograma.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Relacionamentos

- `ecocardiograma.exame_id` referencia `exame.id`.

- `ecocardiograma.paciente_id` referencia `paciente.id`.

- `ecocardiograma.atendimento_id` referencia `atendimento.id`.


### Regras

- `exame_id` deve apontar para um exame do tipo ECO.

- `feve_percentual` deve receber apenas valor numérico.

- Caso a planilha tenha texto, símbolo ou anotação ambígua, preservar em `feve_texto_original`.


---

## 29. Tabela: tipo_exame_complementar

### Finalidade

Cadastrar tipos de exames complementares.

### Colunas da planilha cobertas como cadastro

- Laboratoriais

- De imagem

- Holter

- Endoscopia

- Colonoscopia

- Teste Ergometrico

- Mapa

- ECO

- Outros


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do tipo de exame complementar.|
|nome|VARCHAR(150)|Sim|UNIQUE|Nome do tipo de exame complementar.|
|descricao|TEXT|Não||Descrição complementar.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o tipo está ativo.|

### Regras

Devem existir registros iniciais para:

- Laboratoriais

- De imagem

- Holter

- Endoscopia

- Colonoscopia

- Teste Ergométrico

- MAPA

- ECO

- Outros


---

## 30. Tabela: exame_complementar

### Finalidade

Registrar exames complementares trazidos ou solicitados.

### Colunas da planilha cobertas

- Paciente trouxe outros exames complementares?

- Laboratoriais

- De imagem

- Holter

- Endoscopia

- Colonoscopia

- Teste Ergometrico

- Mapa

- Outros

- Solicitado exames complementares?

- Laboratoriais

- ECO

- De imagem

- Holter

- Endoscopia

- Colonoscopia

- Teste Ergometrico

- Mapa

- Outros


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do exame complementar.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|tipo_exame_complementar_id|UUID|Sim|FK|Tipo de exame complementar.|
|origem_registro|VARCHAR(30)|Sim||Indica se foi trazido ou solicitado.|
|informado|BOOLEAN|Não||Indica se o exame foi marcado/informado na planilha.|
|detalhe|TEXT|Não||Detalhe do exame, especialmente para “Outros”.|
|valor_original_planilha|TEXT|Não||Valor bruto importado da célula.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Relacionamentos

- `exame_complementar.paciente_id` referencia `paciente.id`.

- `exame_complementar.atendimento_id` referencia `atendimento.id`.

- `exame_complementar.tipo_exame_complementar_id` referencia `tipo_exame_complementar.id`.


### Regras

- `origem_registro` deve aceitar preferencialmente: `trazido`, `solicitado`.

- As colunas de exames trazidos devem gerar registros com `origem_registro = 'trazido'`.

- As colunas de exames solicitados devem gerar registros com `origem_registro = 'solicitado'`.

- A coluna “Paciente trouxe outros exames complementares?” funciona como indicador geral.

- A coluna “Solicitado exames complementares?” funciona como indicador geral.

- Como os nomes de exames aparecem tanto no bloco de trazidos quanto no bloco de solicitados, a distinção deve ser feita por `origem_registro`.


---

## 31. Tabela: tratamento_benzonidazol

### Finalidade

Registrar tratamento com benzonidazol para doença de Chagas.

### Colunas da planilha cobertas

- Uso do benzonidazol para tratamento da DC?

- tratamento pelo ambulatorio?

- Por quanto tempo foi usado?

- Em qual ano tomou a medicação (Benzonidazol)?

- Tem indicação de BZN?

- Prescrição do BZN (data)

- Se não, descreva o motivo


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do tratamento.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|usou_benzonidazol|BOOLEAN|Não||Indica se usou benzonidazol.|
|tratamento_pelo_ambulatorio|BOOLEAN|Não||Indica se o tratamento foi feito pelo ambulatório.|
|tempo_uso|VARCHAR(100)|Não||Tempo de uso informado.|
|ano_uso|INTEGER|Não||Ano em que tomou a medicação.|
|tem_indicacao_bzn|BOOLEAN|Não||Indica se há indicação de BZN.|
|data_prescricao_bzn|DATE|Não||Data da prescrição do BZN.|
|motivo_nao_uso_ou_nao_indicacao|TEXT|Não||Motivo quando não usou ou não há indicação.|
|observacao|TEXT|Não||Observações gerais do tratamento.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o tratamento está ativo.|

### Relacionamentos

- `tratamento_benzonidazol.paciente_id` referencia `paciente.id`.

- `tratamento_benzonidazol.atendimento_id` referencia `atendimento.id`.


---

## 32. Tabela: retorno_tratamento

### Finalidade

Registrar retornos relacionados ao tratamento com benzonidazol.

### Colunas da planilha cobertas

- Retorno 30 dias de tratamento

- Retorno final de tratamento


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do retorno de tratamento.|
|tratamento_benzonidazol_id|UUID|Sim|FK|Tratamento relacionado.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado ao retorno.|
|tipo_retorno|VARCHAR(50)|Sim||Tipo: 30_dias ou final.|
|realizado|BOOLEAN|Não||Indica se o retorno foi realizado.|
|observacao|TEXT|Não||Observações do retorno.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Regras

- “Retorno 30 dias de tratamento” deve gerar `tipo_retorno = '30_dias'`.

- “Retorno final de tratamento” deve gerar `tipo_retorno = 'final'`.


---

## 33. Tabela: notificacao

### Finalidade

Registrar notificação do paciente.

### Colunas da planilha cobertas

- Paciente notificado?

- Número notificação

- Caso não, justifique


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador da notificação.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|paciente_notificado|BOOLEAN|Não||Indica se o paciente foi notificado.|
|numero_notificacao|VARCHAR(100)|Não||Número da notificação.|
|justificativa_nao_notificacao|TEXT|Não||Justificativa quando não foi notificado.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Regras

- Se `paciente_notificado = true`, preferencialmente `numero_notificacao` deve ser preenchido.

- Se `paciente_notificado = false`, preferencialmente `justificativa_nao_notificacao` deve ser preenchida.


---

## 34. Tabela: dados_clinicos_atendimento

### Finalidade

Registrar dados clínicos objetivos coletados no atendimento.

### Colunas da planilha cobertas

- Altura

- Peso

- Circunferencia Abdominal

- Frequencia cardiaca

- Saturacao

- PA sistolica

- PA diastolica

- NYHA


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador dos dados clínicos.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Sim|FK|Atendimento relacionado.|
|altura_cm|NUMERIC(5,2)|Não||Altura em centímetros.|
|peso_kg|NUMERIC(5,2)|Não||Peso em quilogramas.|
|circunferencia_abdominal_cm|NUMERIC(5,2)|Não||Circunferência abdominal em centímetros.|
|frequencia_cardiaca_bpm|INTEGER|Não||Frequência cardíaca em batimentos por minuto.|
|saturacao_percentual|NUMERIC(5,2)|Não||Saturação de oxigênio em percentual.|
|pa_sistolica_mmhg|INTEGER|Não||Pressão arterial sistólica.|
|pa_diastolica_mmhg|INTEGER|Não||Pressão arterial diastólica.|
|nyha|VARCHAR(20)|Não||Classificação funcional NYHA.|
|observacao|TEXT|Não||Observações sobre os dados clínicos.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Relacionamentos

- `dados_clinicos_atendimento.paciente_id` referencia `paciente.id`.

- `dados_clinicos_atendimento.atendimento_id` referencia `atendimento.id`.


### Regras

- Deve existir no máximo um registro de dados clínicos por atendimento, salvo se o sistema futuramente permitir múltiplas medições.

- Sugestão de restrição única: `atendimento_id`.


---

## 35. Tabela: obito

### Finalidade

Registrar óbito do paciente.

### Colunas da planilha cobertas

- Óbito

- Data do óbito

- causa do óbito


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do óbito.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado, se houver.|
|houve_obito|BOOLEAN|Não||Indica se houve óbito.|
|data_obito|DATE|Não||Data do óbito.|
|causa_obito|TEXT|Não||Causa do óbito.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Regras

- Um paciente deve ter no máximo um óbito ativo.

- Se `houve_obito = true`, idealmente `data_obito` ou `causa_obito` deve ser preenchido quando a informação existir.


---

## 36. Tabela: retorno_anual

### Finalidade

Registrar retorno anual do paciente.

### Colunas da planilha cobertas

- Retorno anual realizado

- Desfecho do retorno


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador do retorno anual.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|atendimento_id|UUID|Não|FK|Atendimento relacionado.|
|retorno_anual_realizado|BOOLEAN|Não||Indica se o retorno anual foi realizado.|
|ano_referencia|INTEGER|Não||Ano de referência do retorno.|
|desfecho_retorno|TEXT|Não||Desfecho do retorno.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se o registro está ativo.|

### Regras

- Se a planilha não trouxer ano específico, `ano_referencia` pode ser derivado da data do atendimento.

- Um paciente pode ter vários retornos anuais ao longo do tempo.


---

## 37. Tabela: atendimento_observacao

### Finalidade

Registrar observações e pendências associadas ao atendimento.

### Colunas da planilha cobertas

- Pendencias/Observação


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador da observação.|
|atendimento_id|UUID|Sim|FK|Atendimento relacionado.|
|paciente_id|UUID|Sim|FK|Paciente relacionado.|
|tipo_observacao|VARCHAR(50)|Não||Tipo: pendência, observação, alerta etc.|
|texto|TEXT|Sim||Texto da observação.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|
|ativo|BOOLEAN|Sim||Indica se a observação está ativa.|

### Relacionamentos

- `atendimento_observacao.atendimento_id` referencia `atendimento.id`.

- `atendimento_observacao.paciente_id` referencia `paciente.id`.


### Regras

- A coluna “Pendencias/Observação” também pode aparecer em `atendimento.pendencias_observacao`.

- Para evitar perda de informação, recomenda-se salvar o texto em `atendimento_observacao`.

- A tabela `atendimento` pode manter uma cópia resumida, mas a fonte estruturada de observações deve ser esta tabela.


---

## 38. Tabela: importacao_planilha

### Finalidade

Controlar cada processo de importação da planilha.

### Colunas cobertas

- Controle da importação como processo.


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador da importação.|
|nome_arquivo|VARCHAR(255)|Sim||Nome do arquivo importado.|
|hash_arquivo|VARCHAR(255)|Não||Hash para identificar versão do arquivo.|
|data_importacao|TIMESTAMP|Sim||Data e hora da importação.|
|usuario_id|UUID|Não|FK|Usuário responsável pela importação.|
|status_importacao|VARCHAR(50)|Sim||Status: iniciada, concluida, concluida_com_erros, falhou.|
|total_linhas|INTEGER|Não||Total de linhas processadas.|
|total_linhas_sucesso|INTEGER|Não||Linhas importadas com sucesso.|
|total_linhas_erro|INTEGER|Não||Linhas com erro.|
|observacao|TEXT|Não||Observações gerais da importação.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|

### Relacionamentos

- `importacao_planilha.usuario_id` referencia `usuario.id`.

- `importacao_planilha` 1:N `importacao_linha`.


---

## 39. Tabela: importacao_linha

### Finalidade

Guardar cada linha original da planilha em formato bruto para auditoria e rastreabilidade.

### Colunas cobertas

- Todas as colunas originais da planilha em formato bruto para auditoria.


### Campos

|Campo|Tipo|Obrigatório|Chave|Descrição|
|---|--:|--:|--:|---|
|id|UUID|Sim|PK|Identificador da linha importada.|
|importacao_planilha_id|UUID|Sim|FK|Importação relacionada.|
|numero_linha|INTEGER|Sim||Número da linha no arquivo original.|
|paciente_id|UUID|Não|FK|Paciente gerado a partir da linha.|
|atendimento_id|UUID|Não|FK|Atendimento gerado a partir da linha.|
|dados_originais|JSONB|Sim||Todas as colunas originais da linha em formato bruto.|
|status_linha|VARCHAR(50)|Sim||Status: importada, ignorada, erro, parcial.|
|mensagem_erro|TEXT|Não||Erro ocorrido durante a importação.|
|criado_em|TIMESTAMP|Sim||Data de criação.|
|atualizado_em|TIMESTAMP|Sim||Data de atualização.|

### Relacionamentos

- `importacao_linha.importacao_planilha_id` referencia `importacao_planilha.id`.

- `importacao_linha.paciente_id` referencia `paciente.id`.

- `importacao_linha.atendimento_id` referencia `atendimento.id`.


### Regras

- `dados_originais` deve armazenar a linha inteira da planilha.

- Essa tabela é a principal garantia contra perda de dados.

- Mesmo que uma coluna ainda não tenha campo estruturado definitivo, ela permanece preservada em `dados_originais`.


---

## 40. Matriz de cobertura das colunas da planilha

|Grupo de colunas da planilha|Tabela destino|
|---|---|
|ID, Nome, nascimento, idade, sexo, raça, comunidade tradicional, origem da aba|paciente|
|Endereço, cidade|paciente_endereco|
|Telefone de contato|paciente_contato|
|Data do atendimento, prontuário, responsável pela digitação, pendências|atendimento|
|Responsável pela digitação|usuario|
|Nomes dos programas/projetos|programa|
|Participação, pendência ou falha em programas/projetos|paciente_programa|
|Encaminhamento e origem|encaminhamento|
|Encaminhado a qual projeto|encaminhamento_projeto|
|Contrarreferência realizada|contrarreferencia|
|Diagnóstico da DC e resultado final|diagnostico_chagas|
|Métodos e datas de sorologia|sorologia_chagas|
|Solicitação de sorologia|sorologia_solicitacao|
|Histórico familiar de exame de Chagas|historico_familiar_chagas|
|Forma da DC e classificação da cardiopatia|condicao_chagas|
|Complicações relacionadas à DC|complicacao_chagas|
|Cadastro de comorbidades|comorbidade|
|Comorbidades do paciente|paciente_comorbidade|
|Cadastro de exames laboratoriais|tipo_exame_laboratorial|
|Resultados laboratoriais|resultado_laboratorial|
|AVC e reação adversa|evento_clinico|
|Marcapasso e CDI|dispositivo_implantado|
|Cadastro de classes medicamentosas|classe_medicamento|
|Medicamentos do paciente|paciente_medicamento|
|Cadastro de ECG e ECO|tipo_exame|
|ECG, resultado, data, solicitação e ECO|exame|
|FEVE%|ecocardiograma|
|Cadastro de exames complementares|tipo_exame_complementar|
|Exames complementares trazidos ou solicitados|exame_complementar|
|Uso, indicação e prescrição de benzonidazol|tratamento_benzonidazol|
|Retorno de 30 dias e retorno final de tratamento|retorno_tratamento|
|Notificação, número e justificativa|notificacao|
|Altura, peso, circunferência abdominal, FC, saturação, PA, NYHA|dados_clinicos_atendimento|
|Óbito, data e causa|obito|
|Retorno anual e desfecho|retorno_anual|
|Pendências e observações textuais|atendimento_observacao|
|Processo de importação|importacao_planilha|
|Linha original completa da planilha|importacao_linha|

---

## 41. Observação final sobre garantia de não perda de dados

Este modelo cobre todas as colunas listadas na relação fornecida.

A garantia prática contra perda de informação depende de duas decisões técnicas:

1. Toda coluna original deve ter destino estruturado em uma das tabelas acima.

2. Toda linha da planilha deve ser salva integralmente em `importacao_linha.dados_originais` como `JSONB`.


Com isso, o sistema permite duas camadas de segurança:

- Camada estruturada: dados normalizados para CRUD, busca, relatórios e dashboards.

- Camada bruta: dados originais preservados para auditoria, conferência e correção futura.


A tabela `importacao_linha` não substitui a modelagem normalizada, mas impede perda definitiva de dados durante a migração.
