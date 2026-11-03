# Consulta de medicamentos — recorte7B-E5B

2026-11-01, Janela1, base28cb878. Recorte de leitura VALIDADO TECNICAMENTE;
escrita/integração completa E5B e aceite humano pendentes.
[Contrato e pendências](../arquitetura/CONTRATO_MEDICAMENTOS_7B_E5B.md).

Dois GET implementados: catálogo ativo com princípio/classe literais nullable e
itens SQL09 isolados por paciente/atendimento. LEFT JOIN preserva identificação
por FK inativa, sem interpretar nome livre; catálogo atual não é snapshot.
Allowlist exclui valor_original_* e timestamps. Não modifica legado, não oferece
escrita nem calcula prescrição, mesmo quando as datas legadas são invertidas.
Sem migration, alterações de ACL/captura/importador ou protocolo de mutações.

Build/186 unidades: /tmp/ambulatorio-check-m640zhmp/output.log,20 suítes aprovadas.
Integração real: /tmp/m3-medicamentos-http.log,15/15 em catálogo e medicamentos
(11 catálogo,4 por atendimento). Cobriu três perfis, IDs grandes de catálogo,
null/negativa/textos literais, paginação/ordem estável, ativo/inativo, credenciais,
usuário desativado, parâmetros inválidos, separação entre dois pacientes e duas
consultas, revogação e métodos de escrita indisponíveis sem alterar contagens.
Fixture criada pelo owner é explicitamente legado sintético: não comprova POST.

PostgreSQL16.15 tmpfs localhost55457 no container exclusivo
ambulatorio-avc-interacoes-20261101; runner cria/apaga seu banco02–71 e login
restrito real. Nenhum acesso ao persistente. Relatório resume resultados pois
logs /tmp são voláteis. Não repetidos SQL/upgrades/importador/HTTP completo,
pois nenhum desses contratos foi alterado; testes focados incluem dependências
compartilhadas de catálogo e autorização. Frontend não incluído nesta evidência.
