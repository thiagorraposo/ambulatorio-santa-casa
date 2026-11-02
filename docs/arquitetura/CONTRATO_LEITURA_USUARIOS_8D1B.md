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
