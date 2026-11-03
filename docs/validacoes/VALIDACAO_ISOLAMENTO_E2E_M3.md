# Isolamento das contagens E2E clínicas após novos módulos M3

2026-11-02, continuação da Janela1; base55f82b5 com diff em
[clinical.spec.ts](../../tests/frontend/clinical.spec.ts).
Correção de instrumentação da suíte, sem alteração do produto, banco,
seed global ou permissões.

## Reprodução e causa

Os specs novos usam seedPatient, que cria pessoas com prefixo Etapa 7 e vínculos
para consulta/edição no banco descartável compartilhado pela execução E2E.
clinical.spec.ts pressupunha que existiam somente as 24 pessoas autorizadas da
fixture original para consulta e 2 para edição. Executado depois de um cenário
AVC que cria outra pessoa, seus contadores falhavam corretamente: segunda página
esperava 4 e recebeu 5; edição esperava 2 e recebeu 3. Não era quebra de RBAC; o paciente
novo tinha os vínculos concedidos conscientemente pelo setup do cenário anterior.

Reprodução dirigida: runner tests/frontend/test_e2e.sh, arquivos avcs.spec.ts e
clinical.spec.ts, filtro `AVC: consulta pagina|consulta: busca|edicao consulta`.
Resultado inicial: 1 aprovado/2 falhas em/tmp/etapa6-frontend-nEvUOx/results.json.
Não foi executada a suíte completa para reproduzir esse efeito.

## Ajuste e preservação da cobertura

As verificações de contagem da fixture original agora usam o filtro real de
nome Paciente, compartilhado pelos nomes do seed global e distinto dos nomes
Etapa 7 criados pelo helper dos módulos. As expectativas não foram ampliadas
ou removidas:20/4 na paginação da consulta; 2 pessoas na edição; filtros por
sexo/nome, IDs grandes, pessoa reservada invisível e recusas HTTP 403 preservados.
O primeiro carregamento/estado de carga, ausência de GET de ficha por linha e
navegação da ficha continuam exercitados. A expectativa do cabeçalho Ações
acompanha os atalhos reais entregues em 8B3U.4.

A prova de troca de identidade usa a mesma URL/chave filtrada para consulta e
edição. A resposta antiga de consulta é retida antes de logout, e o teste
confere que contém uma pessoa não autorizada à edição. Depois do novo login,
edição apresenta somente 2 pessoas antes e depois de liberar aquela resposta;
a pessoa exclusiva da consulta permanece ausente. Usar consultas com chaves
diferentes enfraqueceria essa prova; por isso o filtro é igual nas duas sessões.

O isolamento é por domínio de nomes da fixture. Novos testes que pretendam
compartilhar exatamente esse domínio deverão criar seu próprio namespace ou
revisar explicitamente o conjunto esperado. Não há exclusão/desativação de
pessoas para esconder contaminação nem flexibilização da autorização.

## Validação

Composição dirigida após o ajuste: cenário AVC anterior, consulta/paginação,
leitura de edição e saída/troca de identidade. Ambiente sintético exclusivo,
PostgreSQL 16.15 tmpfs localhost55457, container
ambulatorio-avc-interacoes-20261101 confirmado antes do runner. Banco/logins
aleatórios do runner, migrations 02–73, portas 6063/4178; sem acesso persistente.
**4 cenários aprovados em 12,6s**, sem retry/skip, em
/tmp/etapa6-frontend-ert5GE/results.json. Comando: runner com os dois arquivos e
`--grep 'AVC: consulta pagina|consulta: busca|edicao consulta|saída e troca de identidade'`.
Não houve mudança de produto, build ou suíte backend/importador a repetir.
Logs /tmp são voláteis; resultado e limites ficam resumidos neste relatório.
