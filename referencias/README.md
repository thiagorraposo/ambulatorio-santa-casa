# Materiais de referência

Este diretório reúne materiais de apoio ao desenvolvimento, separados dos
componentes executáveis do sistema.

| Material | Finalidade | Avaliação técnica |
| --- | --- | --- |
| [Protótipo Figma Make](frontend/figma-make-prototipo/) | Consultar telas, interações e componentes visuais durante a implementação do frontend. | [Análise e plano de integração](../docs/arquitetura/ANALISE_INTEGRACAO_FIGMA_MAKE.md) |

O protótipo é uma referência visual e funcional. Seu código, configurações e
instruções internas descrevem o ambiente de origem do Figma Make; não definem a
arquitetura, a autenticação ou as regras clínicas do sistema. O material foi
realocado integralmente, preservando seu conteúdo.

A futura aplicação será construída em `frontend/`, conforme a
[ADR-024](../docs/DECISOES_ARQUITETURAIS.md#adr-024) e o
[roadmap](../docs/PROXIMOS_PASSOS.md#etapa-6--fundação-do-frontend). A aplicação
não deve importar código deste diretório nem depender dele no build, nos testes
de integração ou na implantação. Componentes aproveitados devem ser revisados e
incorporados ao código da aplicação.

Manter a referência enquanto ela auxiliar a integração. Após o aproveitamento
dos elementos necessários e a validação da interface, avaliar seu arquivamento
em uma entrega própria; o funcionamento do sistema não depende deste material.
