# Catálogo mínimo da demonstração sintética — apoio a 8V2

2026-11-01, Janela1, base1e23448. Fixture implementada e validada; não conclui8V2
nem equivale a ensaio integral/aceite humano.

seed.mjs passa a criar hipertensao_arterial e diabetes, exatamente os nomes
canônicos usados por Importer.comorbidities. Só no banco exclusivo etapa6_frontend_*
validado pelo runner, sem associações a pacientes, dados reais ou novo endpoint.
Isso também prepara --serve sem depender do beforeAll de comorbidades.spec.ts.

Novo E2E real aprovado em /tmp/m3-demo-catalogo.log, artefatos
/tmp/etapa6-frontend-G01GvS: catálogo presente, seleção/revisão/POST e releitura
persistida com negativa. Regressões dos quatro cenários de comorbidades e três
de leitura de importações passaram (7/7) em /tmp/m3-demo-catalogo-regressao.log,
artefatos /tmp/etapa6-frontend-XB8936. Servidor PostgreSQL16.15 tmpfs exclusivo,
localhost55457, identidade/armazenamento confirmados; API e frontend reais.

Total83 E2E cadastrados após esta adição; não foi repetida a suíte integral.
Backend/SQL/importador não mudaram e suas provas foram reutilizadas.
Não foi iniciado dev-sintetico-start nem ensaiada toda a apresentação; a fixture
foi comprovada pelo mesmo runner sintético, em execução automatizada.
