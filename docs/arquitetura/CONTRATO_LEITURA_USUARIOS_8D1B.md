# Leitura mínima de usuários — 8D1B.1 / 8D1U.1

Recorte técnico de listagem, conforme os mínimos de
[8D1D](PROPOSTA_IDENTIDADE_ADMINISTRACAO_8D1D.md). Administração é o perfil de
gestão determinado; Consulta/Edição não listam terceiros. O gate de campos
adicionais não impede a projeção mínima de ID/nome/perfil já delimitada na
proposta. Este contrato não aprova provisionamento, autoações ou política
institucional completa. O agregado D1B.1 inclui consulta/histórico ainda pendentes.

`GET /v1/usuarios?limit=20&offset=0` exige identidade ativa e perfil Administração,
revalidados pelos guards H1 existentes em cada requisição. Retorna apenas
`Array<{ usuarioId: string; nome: string; perfil: Perfil }>`, incluindo as contas
existentes sem inferir que estejam ativas. Não há filtro implícito por estado.
Ordenação estável por nome e ID numérico; ID permanece textual na resposta.
Paginação reutiliza PageQuery: limit 1–100, offset 0–100000, valores fora do
contrato e parâmetros desconhecidos retornam 400. Não calcula total nem depende
de acesso clínico, vínculo de paciente ou capacidade temporal.

401 sem identidade válida; 403 para Consulta/Edição; falha interna sanitizada
pelos mecanismos existentes. Não consultar/publicar login, hash, senha, estado,
dados clínicos ou associação ao digitador. Não escrever nem auditar mutações
fictícias. A consulta não concede vínculos, credenciais ou poderes adicionais.

Interface `/usuarios`: navegação somente para Administração, tabela com as três
propriedades, paginação na URL, carga/vazio/erro/repetição de leitura reais.
Acesso direto por outro perfil apresenta orientação sem requisitar a coleção.
Estado de ativação e ações de criação/perfil/ativação só poderão ser apresentados
quando houver contrato correspondente. Minha conta e o `me` atual são preservados.

Aceite do recorte: negar anônimo/Consulta/Edição/inativo; comparar projeção exata
com banco sintético, testar páginas inclusive homônimos/IDs grandes/vazio e
ausência de campos adicionais; navegador/API/PostgreSQL com retorno/recarga,
teclado, 320/390, axe e erro de leitura. Aceite humano e confronto visual com a
referência permanecem próprios de 8V1/8V2, sem declarar a família 8D concluída.

## Proposta de próximo incremento — consulta individual mínima

Preparada em 02/11/2026 na retomada do checkpoint `1abe410`. **Proposta
delimitada, sem implementação ou validação funcional deste incremento.** A
listagem acima conserva seu contrato e suas provas. Esta consulta é um recorte
de D1B.1/U.1, não uma nova unidade nominal nem conclusão do histórico USR-24.

Objetivo: abrir uma conta da página administrativa e reler ID/nome/perfil
diretamente da API. Os três campos e o perfil de gestão já estão delimitados
no contrato mínimo; implementar a leitura não depende de escolher credenciais,
autoações ou campos adicionais. Nenhuma decisão institucional nova é necessária
para essa projeção. O contrato técnico e as provas abaixo ainda precisam ser
materializados antes de afirmar disponibilidade.

### HTTP e capacidades propostas

`GET /v1/usuarios/:usuarioId` retornará um único
`{ usuarioId: string; nome: string; perfil: Perfil }`, com projeção SQL explícita
dos mesmos campos da listagem. ID decimal positivo dentro do intervalo bigint
PostgreSQL, preservado como string da URL à resposta, inclusive acima de 2^53.
Reutilizar a validação de identificadores existente; parâmetros de consulta
não previstos serão recusados com 400. Não aceitar filtros ou paginação nesta
rota individual.

| Identidade requisitante | Leitura individual proposta |
| --- | --- |
| Administração ativa | Consulta qualquer conta existente, inclusive a própria, com os mesmos três campos |
| Consulta ou Edição ativa | 403, inclusive para o próprio ID nesta rota administrativa; a conta própria continua em `me` |
| Anônima, sessão inválida ou conta requisitante inativa | 401 pelo mecanismo H1 existente |

Guards existentes revalidarão identidade ativa/perfil em cada GET, antes de
consultar a conta alvo. Depois da autorização: ID inválido → 400; ID válido
inexistente → 404 sanitizado; conta existente → 200. Conta alvo inativa também
é existente, como na coleção; a resposta não informa nem infere seu estado.
Erro interno usa o tratamento sanitizado atual. A consulta não cria evento
administrativo de mutação ou registros históricos fictícios.

### Interface proposta

O nome na tabela levará a `/usuarios/:usuarioId`, conservando `limit`/`offset`
validados no retorno à coleção. A página fará GET próprio: não usar a linha
em memória como resposta persistida. Acesso direto e recarga devem funcionar;
o link de retorno deve manter a página mesmo após recarga. Identificação textual
e perfil usarão os componentes existentes, sem oferecer comandos de mutação.

Carga, 404, erro de rede/servidor com repetição explícita de GET e perda de
sessão/perfil terão estados distintos. Dados de outra conta não devem permanecer
visíveis durante troca de ID, erro ou perda de autorização. Consulta/Edição
receberão orientação de acesso administrativo sem requisitar o detalhe, como
ocorre na coleção. Repetir uma leitura não exige recibo de escrita.

### Gates e critérios de validação

| Recorte | Situação e condição para avançar |
| --- | --- |
| Consulta individual ID/nome/perfil | Campos/capacidade suficientes pelo contrato mínimo; próxima implementação B/U deve comprovar HTTP, persistência de origem e navegação reais |
| Login, estado, campos adicionais e busca/filtros | Dependem de contrato próprio de campos/normalização/capacidades; não incluir neste incremento |
| Histórico de criação/perfil/ativação | Depende de contrato de eventos/origem, ator/instante/resultado, anterior/novo quando aplicável, autorização, paginação/filtros e retenção; ausência de eventos não comprova ausência de operações |
| Criação, alteração de perfil ou estado | Conservam contratos próprios de provisionamento, concorrência, auditoria, sessão, recuperação e autoações/último administrador em 8D2/P-08 |
| Agregados D1B.1/U.1, 8D e aceites 8V1/8V2 | Permanecem incompletos; consulta mínima não substitui histórico, capacidades ampliadas ou aceite humano |

Aceite técnico do próximo incremento: API/PostgreSQL sintéticos com projeção
exata e ausência de campos adicionais; três perfis, anônimo/inativo, revalidação
do mesmo token após mudança de perfil/estado da identidade requisitante, alvo
inativo, ID grande, inválido e inexistente. Confirmar a ordenação das recusas
sem revelar existência a identidades não autorizadas.

No navegador, provar coleção paginada→detalhe→recarga→retorno à mesma página,
acesso direto, troca de ID, 404, erro/repetição e perda de autorização. Revisar
teclado/foco, Axe, 1440/390/320 e referência visual disponível, registrando
lacunas. Aplicar a matriz de validação para mudança backend/frontend; aproveitar
as provas anteriores apenas nas camadas inalteradas. Esta preparação textual
exige `docs-check`, revisão de links/conteúdo e diff, sem repetir testes da
aplicação ou iniciar banco.
