# Materiais de referência

Este diretório preserva a referência visual/funcional do produto completo,
separada dos componentes executáveis do sistema. A [visão vigente](../docs/frontend/VISAO_E_ESPECIFICACAO.md)
e a [matriz de requisitos](../docs/frontend/MATRIZ_FIGMA_FRONTEND.md) orientam sua
implementação com as regras clínicas aprovadas.

| Material | Finalidade | Avaliação técnica |
| --- | --- | --- |
| [Protótipo Figma Make](frontend/figma-make-prototipo) | Consultar telas, interações e componentes visuais durante a implementação do frontend. | [Análise e plano de integração](../docs/historico/ANALISE_FIGMA_MAKE_2026_10_03.md) |

O protótipo é uma referência visual e funcional. Seu código, configurações e
instruções internas descrevem o ambiente de origem do Figma Make; não definem a
arquitetura, a autenticação ou as regras clínicas do sistema. O material foi
realocado integralmente, preservando seu conteúdo.

A fundação da aplicação própria está implementada e validada em
[`frontend/`](../frontend), conforme a
[ADR-024](../docs/DECISOES_ARQUITETURAIS.md#adr-024) e o
[roadmap](../docs/PROXIMOS_PASSOS.md#etapa-6--fundação-do-frontend). A aplicação
não deve importar código deste diretório nem depender dele no build, nos testes
de integração ou na implantação. Componentes aproveitados devem ser revisados e
incorporados ao código da aplicação.

Setup e contratos vigentes estão em [FRONTEND.md](../docs/FRONTEND.md); a
[validação da Etapa 6](../docs/validacoes/VALIDACAO_ETAPA_6.md) registra os
cenários executados. A análise do Figma Make preserva a avaliação estática de
2026-10-03 e não substitui o estado atual da aplicação.

Manter a referência disponível até o aceite funcional e visual integral
(8V1/8V2). Seu eventual arquivamento exige preservar os requisitos e as provas
de comparação; o build da aplicação continua independente deste material.
As instruções internas do protótipo pertencem ao ambiente de origem; elas não
se aplicam à aplicação própria nem aos agentes fora daquele diretório.
