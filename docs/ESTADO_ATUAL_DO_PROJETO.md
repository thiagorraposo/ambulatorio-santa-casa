# Estado atual do projeto

Atualizado em: 2026-10-26. Síntese de implementação e evidências existentes;
esta atualização documental não reexecuta as suítes da aplicação.

## Escopo e estágio

O objetivo aprovado é entregar o protótipo como produto completo, incluindo
funcionalidades, experiência de uso e fidelidade visual. Os antigos destinos VP
estão incluídos como PC. O [roadmap](PROXIMOS_PASSOS.md) define M1–M5; o
[catálogo](frontend/ENTREGAS_DO_PRODUTO.md) define cada entrega e seu aceite.
As estimativas anteriores de 65% e aproximadamente 20 entregas não medem esse
escopo. Detalhes clínicos/operacionais ainda abertos não são decisões aprovadas.

| Parte | Estado comprovado | Limite |
| --- | --- | --- |
| Etapas 1–4 | Contratos de dados, importador original, fundação do backend e núcleo físico entregues. | Aceites históricos não implicam operação real. |
| Etapa 5 | 5A–5E concluídas em ambiente sintético em 03/10. | [Matriz de aceite](validacoes/ACEITE_INTEGRADO_ETAPA_5.md); incrementos não aplicados ao persistente nesta entrega. |
| Etapa 6 | 6A–6B concluídas em ambiente sintético em 04/10. | [Relatório](validacoes/VALIDACAO_ETAPA_6.md). |
| Etapa 7 original | Implementação e validação técnica sintética concluídas em 15/10, com correções R7-01–07; M1 aprovado em 26/10 conforme confirmação do responsável do projeto. | [Relatório vigente](validacoes/VALIDACAO_ETAPA_7.md) e [registro do parecer](validacoes/ROTEIRO_REVISAO_CLINICA_ETAPA_7.md). |
| M2 — 7A-U1 | Cadastro precedido por busca implementado e validado tecnicamente em 26/10. | [Evidência](validacoes/VALIDACAO_7A_U1.md); aceite da VU1, etapas/revisão e percurso integrado permanecem pendentes. |
| Melhorias U3.1/U3.2/U3.3/U4.1 | Implementação e validação técnica próprias. | [Índice de evidências](validacoes/README.md); não concluem automaticamente U3/U4, VU1 ou fidelidade integral. |
| Produto completo e Etapas 8–10 | Escopo planejado e critérios definidos. | Implementações adicionais, decisões específicas, implantação e homologação pendentes. |

O próximo trabalho é fechar as escolhas necessárias para M2 e entregar seus
pacotes. A sequência detalhada pertence
ao [roadmap](PROXIMOS_PASSOS.md#próximo-trabalho).

## Componentes e ambientes

- **PostgreSQL:** schema `ambulatorio`. A evidência persistente versionada cobre
  migrations 00–20 e 38 tabelas; incrementos posteriores foram validados em bancos
  descartáveis, incluindo a migration 64 de correlação de operações. O
  [modelo físico](MODELO_FISICO_ATUAL.md) separa os ambientes; o
  [dump aplicado](evidencias/schema_atual_ambulatorio.sql) é a prova estrutural.
- **Importador Python:** v1.7.0, manifesto semântico v1.4; reconciliação BZN,
  promoção seletiva, proveniência, idempotência e reprocessamento encadeado.
  [Implementação](IMPORTADOR_SINTETICO_V1.md) e
  [regras normativas](ESPECIFICACAO_IMPORTADOR_PLANILHA_V1.md) têm papéis distintos.
- **Backend NestJS/TypeScript:** API `/v1`, autenticação JWT, autorização clínica
  por perfil/vínculo, SQL parametrizado, transações e controle de versão.
  [Arquitetura](ARQUITETURA_BACKEND.md) e [contratos](arquitetura/CONTRATOS_CLINICOS_ETAPA_5.md).
- **Frontend React/TypeScript:** sessão/token em memória, busca, ficha/histórico,
  formulários 7A–7D, rascunhos, conflitos explícitos e recuperação por operação.
  Recibos/rascunhos têm limites de sessão; não há garantia geral de idempotência
  de POST entre sessões. [Guia técnico](FRONTEND.md) e
  [protocolo de recuperação](arquitetura/RECUPERACAO_OPERACOES_ETAPA_7.md).
- **CI:** Quality, Database, Backend e Frontend passaram no GitHub Actions na
  `main` (`40411698727`, commit `9c98595`); a execução inclui Chromium/API e
  PostgreSQL descartável. A branch atual pode conter trabalho posterior ainda
  não integrado.

## Regras e limites vigentes

As [decisões clínicas D1–D12 e respostas originais](dados/DECISOES_HUMANAS_NOVA_PLANILHA.md)
são autoritativas. Dados ambíguos e ausência legada não autorizam inferência;
`Localizado` fica fora do funcional. D9 não produz comparecimento efetivo.
A [cobertura da planilha](dados/COBERTURA_COLUNAS_PLANILHA.md) distingue promoção,
preservação e lacunas; armazenamento no banco/importador não comprova suporte HTTP.

A política clínica é desabilitada por padrão. Administração não concede por si
só gestão temporal ou autorização por fonte. Importação/revisão HTTP exigem opt-in
sintético e recusam produção. Dados reais dependem de 9D; TLS, segredos,
backup/retenção e homologação institucional seguem pendentes.

O recorte original não inclui toda a experiência e todos os módulos do produto
completo. Upload, extensões clínicas, gestão de usuários, dashboard e ferramentas
operacionais têm implementação/decisões/aceites próprios. A preparação da
migração pode avançar com ensaios sintéticos, conforme o roadmap.

## Evidências e histórico

Resultados e limitações por rodada estão no [índice de validações](validacoes/README.md).
A [fotografia anterior à reorganização](historico/ESTADO_2026_10_23.md) preserva
integralmente as continuidades e contagens antes misturadas a esta síntese.
O [registro de alterações](REGISTRO_DE_ALTERACOES.md) mantém a cronologia oficial.
