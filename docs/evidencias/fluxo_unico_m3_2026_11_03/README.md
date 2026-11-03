# Fluxo único M3 — capturas sintéticas de 03/11/2026

Fonte de resultados e limites: [relatório do P0](../../validacoes/FLUXO_UNICO_ATENDIMENTO_M3_2026_11_03.md).
Capturas após o ajuste de alinhamento, produzidas por `attendance-unified.spec.ts`
com Chromium, API e PostgreSQL16 descartável, execução `/tmp/etapa6-frontend-PP4LDr`.
As 12 seções contêm valores sintéticos no mesmo rascunho. Inspeção técnica;
não constitui revisão humana, homologação ou aceite 8V1/8V2.

| Seção | 1440 px | 390 px |
| --- | --- | --- |
| 1 Atendimento | [Captura](secao-01-1440.png) | [Captura](secao-01-390.png) |
| 2 Chagas e Sorologia | [Captura](secao-02-1440.png) | [Captura](secao-02-390.png) |
| 3 Condição Clínica | [Captura](secao-03-1440.png) | [Captura](secao-03-390.png) |
| 4 Comorbidades | [Captura](secao-04-1440.png) | [Captura](secao-04-390.png) |
| 5 Avaliação Clínica | [Captura](secao-05-1440.png) | [Captura](secao-05-390.png) |
| 6 Eventos e Dispositivos | [Captura](secao-06-1440.png) | [Captura](secao-06-390.png) |
| 7 Projetos | [Captura](secao-07-1440.png) | [Captura](secao-07-390.png) |
| 8 Exames | [Captura](secao-08-1440.png) | [Captura](secao-08-390.png) |
| 9 Medicamentos e BZN | [Captura](secao-09-1440.png) | [Captura](secao-09-390.png) |
| 10 Encaminhamentos | [Captura](secao-10-1440.png) | [Captura](secao-10-390.png) |
| 11 Notificação | [Captura](secao-11-1440.png) | [Captura](secao-11-390.png) |
| 12 Observações | [Captura](secao-12-1440.png) | [Captura](secao-12-390.png) |

[Revisão em 320 px](revisao-320.png), [manifesto SHA256](SHA256SUMS.txt).

Comparação com a [referência documental](../frontend_referencia_2026_11_03/README.md)
e o [protótipo oficial](../../../referencias/frontend/figma-make-prototipo/src/components/NewAppointment.tsx):
mesma ordem das 12 seções, índice lateral, painel branco, títulos/contador,
cores e agrupamentos. Em 390 px, o índice horizontal e a coluna única conservam
conteúdo e seleção visíveis; o corte da referência móvel não é reproduzido.
Os campos triestado, a adição explícita de registros e a revisão central seguem
os contratos clínicos, preservando desconhecido, histórico e confirmação única.

Defeito corrigido: seletor vizinho ao catálogo esticava verticalmente para
acompanhar a paginação ([antes](antes-projetos-1440.png), [depois](secao-07-1440.png)).
`align-items: start` na grade do atendimento mantém altura normal dos campos;
assert de navegador verifica seletores visíveis menores que 60 px em 1440/390/320.
Sem redesign, alteração de referência ou homologação visual integral.
