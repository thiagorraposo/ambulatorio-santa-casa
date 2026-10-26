# Documentação do Ambulatório Santa Casa

Este é o ponto de entrada da documentação vigente. Para conhecer o projeto,
leia **estado → roadmap → visão de produto**. Para executar uma tarefa, use a
fonte temática abaixo; relatórios registram provas e histórico preserva contexto.

## Produto e andamento

| Pergunta | Fonte principal |
| --- | --- |
| O que está implementado e o que falta? | [Estado atual](ESTADO_ATUAL_DO_PROJETO.md) |
| Em que ordem trabalhar e quando o produto estará concluído? | [Roadmap e marcos M1–M5](PROXIMOS_PASSOS.md) |
| Como deve ser o produto completo? | [Visão e especificação](frontend/VISAO_E_ESPECIFICACAO.md) |
| Qual elemento do protótipo corresponde a qual requisito? | [Matriz Figma → requisito → implementação → lacuna → entrega → aceite](frontend/MATRIZ_FIGMA_FRONTEND.md) |
| Qual é o escopo e o aceite de cada entrega? | [Catálogo de entregas](frontend/ENTREGAS_DO_PRODUTO.md) |
| Onde estão as comparações de telas? | [Capturas e propostas visuais](frontend/visuais/README.md) |

## Desenvolver e operar localmente

| Necessidade | Fonte principal |
| --- | --- |
| Preparar ambiente, escolher banco e executar verificações | [Workflow de desenvolvimento](WORKFLOW_DE_DESENVOLVIMENTO.md) |
| Abrir a demonstração, entender sessão e contratos de interface | [Frontend](FRONTEND.md) |
| Executar o importador sintético | [Guia do importador implementado](IMPORTADOR_SINTETICO_V1.md) |
| Validar o navegador com API/PostgreSQL descartáveis | [Runner de testes](../tests/frontend/README.md) |
| Fazer backup e testar recuperação do Docker | [Recuperação local e limites](RECUPERACAO_POSTGRESQL_DOCKER.md) |
| Trabalhar com agentes e registrar commits | [Regras gerais](../AGENTS.md), [regras documentais](AGENTS.md) e [padrão de commits](PADRAO_DE_COMMITS.md) |

## Arquitetura, dados e contratos

| Assunto | Fonte principal |
| --- | --- |
| Decisões de arquitetura | [ADRs](DECISOES_ARQUITETURAIS.md) |
| Semântica e cardinalidade clínicas | [Decisões D1–D12 e respostas originais](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md) |
| Cobertura funcional da planilha | [Matriz de cobertura](dados/COBERTURA_COLUNAS_PLANILHA.md) |
| Layout e metadados seguros | [Manifesto humano](MANIFESTO_FISICO_PLANILHA_V1.md), [manifesto executável](../manifestos/planilha_ambulatorio_v1.json) e [metadados](dados/METADADOS_SEGUROS_LAYOUT_PLANILHA.md) |
| Estrutura física aplicada e incrementos sintéticos | [Modelo físico](MODELO_FISICO_ATUAL.md) e [dump aplicado](evidencias/schema_atual_ambulatorio.sql) |
| Regras normativas de importação | [Especificação do importador](ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md) |
| API e autorização | [Arquitetura do backend](ARQUITETURA_BACKEND.md) e [contratos clínicos](arquitetura/CONTRATOS_CLINICOS_ETAPA_5.md) |
| Formulários e limites HTTP | [Recorte clínico](arquitetura/RECORTE_CLINICO_ETAPA_7.md) e [catálogos](arquitetura/CONTRATOS_CATALOGOS_ETAPA_7.md) |
| Recuperação de escrita e paginação de familiares | [Operações](arquitetura/RECUPERACAO_OPERACOES_ETAPA_7.md) e [familiares](arquitetura/CONTRATO_FAMILIARES_ETAPA_7.md) |
| Revisão entre versões da planilha | [Contrato temporal](arquitetura/ESPECIFICACAO_REVISAO_TEMPORAL_PLANILHA.md) |

Especificações por módulo em `arquitetura/`: [avaliação clínica](arquitetura/ESPECIFICACAO_MODULO_AVALIACAO_CLINICA.md),
[notificação](arquitetura/ESPECIFICACAO_MODULO_NOTIFICACAO.md),
[proveniência](arquitetura/ESPECIFICACAO_MODULO_IMPORTACAO_PROVENIENCIA.md),
[projetos](arquitetura/ESPECIFICACAO_ASSOCIACAO_PACIENTE_PROJETO.md),
[exames](arquitetura/ESPECIFICACAO_EVOLUCAO_EXAMES_COMPLEMENTARES.md),
[BZN](arquitetura/ESPECIFICACAO_TRATAMENTO_BENZONIDAZOL.md) e
[encaminhamentos](arquitetura/ESPECIFICACAO_ENCAMINHAMENTO_AMPLIADO.md).
São contratos específicos, não duplicatas do modelo físico ou dos relatórios.

## Segurança, evidências e memória

- [Política de dados](SEGURANCA_DE_DADOS.md) e [modelo de ameaças](THREAT_MODEL.md):
  regras e limites; nenhuma revisão documental autoriza dados reais.
- [Índice de validações](validacoes/README.md): resultados por escopo/data,
  limites e roteiro da revisão humana.
- [Registro de alterações](REGISTRO_DE_ALTERACOES.md): cronologia oficial.
- [Histórico documental](historico/README.md): análises substituídas e planejamento
  original, preservados com identificação de origem.
- [Materiais de referência](../referencias/README.md): protótipo preservado;
  suas instruções internas não configuram a aplicação atual.

## Organização e manutenção

As fontes principais na raiz de `docs/` mantêm os caminhos exigidos pelo Makefile
e pelas instruções do repositório. As coleções têm uma função cada:
`arquitetura/` contratos, `dados/` semântica/layout, `frontend/` produto e entregas,
`validacoes/` provas, `evidencias/` artefatos estruturais e `historico/` memória.
Os únicos índices adicionais são os necessários para localizar as numerosas
validações, os arquivos históricos e as imagens.

Atualize a fonte responsável pelo assunto; nas outras páginas, use links.
Separe escopo aprovado, proposta pendente, implementação, prova técnica e aceite
humano. Datas e números de uma rodada pertencem ao relatório dessa rodada.
Nomes novos usam `MAIUSCULAS_COM_SUBLINHADO.md`, sem espaços/acentos; caminhos
históricos ou exigidos pelas ferramentas não são renomeados apenas por estética.
Veja [as regras de manutenção](AGENTS.md) e o
[diagnóstico desta reorganização](historico/REORGANIZACAO_DOCUMENTAL_2026_10_23.md).
