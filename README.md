# Ambulatório Santa Casa

Sistema para organizar o trabalho do ambulatório: pacientes, atendimentos,
acompanhamento clínico e importação controlada de planilhas. Usa PostgreSQL,
importador Python, API NestJS/TypeScript e frontend React/TypeScript.

O objetivo é entregar o protótipo como produto completo, incluindo cobertura
funcional, experiência de uso e fidelidade visual. O fluxo clínico original foi
implementado e validado com dados sintéticos; a revisão clínica e a operação
institucional ainda estão pendentes. Consulte o [estado atual](docs/ESTADO_ATUAL_DO_PROJETO.md)
e o [roadmap](docs/PROXIMOS_PASSOS.md).

## Experimentar no navegador

Requer Docker em execução, Python 3.9+ em Linux com pidfd, Node.js 24/npm 11,
clientes PostgreSQL e GNU Make. [Preparação detalhada](docs/WORKFLOW_DE_DESENVOLVIMENTO.md#preparar-o-ambiente).

```bash
make backend-install frontend-install backend-build
make dev-sintetico-start
make dev-sintetico-status
```

Abra [http://127.0.0.1:4177](http://127.0.0.1:4177). Os perfis e as credenciais
exclusivamente sintéticas estão no [guia da demonstração](docs/FRONTEND.md#demonstração-sintética-isolada).
Para encerrar, execute `make dev-sintetico-stop`; os dados da demonstração são
descartados. Esse ambiente não usa o banco persistente nem o `.env` local.

## Documentação

Comece pelo [índice da documentação](docs/README.md), organizado por tarefa.

| Necessidade | Fonte |
| --- | --- |
| Entender o estágio e o próximo trabalho | [Estado atual](docs/ESTADO_ATUAL_DO_PROJETO.md) e [roadmap](docs/PROXIMOS_PASSOS.md) |
| Entender o produto completo | [Visão](docs/frontend/VISAO_E_ESPECIFICACAO.md), [matriz de requisitos](docs/frontend/MATRIZ_FIGMA_FRONTEND.md) e [entregas](docs/frontend/ENTREGAS_DO_PRODUTO.md) |
| Preparar o ambiente, desenvolver e validar | [Workflow](docs/WORKFLOW_DE_DESENVOLVIMENTO.md) e [regras para agentes](AGENTS.md) |
| Consultar contratos e evidências | [Índice técnico](docs/README.md#arquitetura-dados-e-contratos) e [validações](docs/validacoes/README.md) |
| Entender segurança e recuperação | [Política de dados](docs/SEGURANCA_DE_DADOS.md), [ameaças](docs/THREAT_MODEL.md) e [backup/restore](docs/RECUPERACAO_POSTGRESQL_DOCKER.md) |
| Consultar a origem do projeto | [Histórico documental](docs/historico/README.md), [alterações](docs/REGISTRO_DE_ALTERACOES.md) e [protótipo](referencias/README.md) |

## Cuidados do projeto

Dados clínicos reais, planilhas reais, backups e credenciais não entram no Git.
Use dados sintéticos. A suíte SQL completa exige banco descartável novo;
[selecione as verificações pelo escopo](docs/WORKFLOW_DE_DESENVOLVIMENTO.md#validação-proporcional).
O schema principal é `ambulatorio`; a [evidência estrutural aplicada](docs/evidencias/schema_atual_ambulatorio.sql)
não se confunde com migrations validadas apenas em ambientes descartáveis.
Mudanças físicas usam migrations incrementais; a aplicação não as executa no
startup. Commit e push somente quando solicitados.
