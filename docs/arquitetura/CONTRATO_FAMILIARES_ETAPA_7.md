# Consulta paginada de familiares por snapshot

Data inicial: 2026-10-14. Atualização: 2026-10-15. Correção de R7-01;
unidades 7B-R1B/7B-R1U do
[roadmap](../PROXIMOS_PASSOS.md#7b-r1b), contrato H5 da
[matriz](../frontend/MATRIZ_FIGMA_FRONTEND.md).

O modelo existente conserva snapshots de rastreio associados à consulta e pares
de identificação/resultado. A correção altera somente consultas HTTP e leitura
da interface, sem migration ou nova escrita de familiares.
O ledger técnico da [ADR-025](../DECISOES_ARQUITETURAIS.md#adr-025) é uma
evolução separada: sua migration 64 não altera o modelo de familiares. A criação
de rastreio e filhos continua na transação composta do atendimento e participa
do recibo atômico daquela criação, sem comando independente de familiares.

## Contrato HTTP

Todas as rotas usam `/v1`, autenticação e autorização do paciente no servidor.
Os perfis consulta, edição e administração podem ler quando autorizados.
Paciente sem vínculo recebe 403; consulta/snapshot de outro paciente ou outra
consulta recebe 404 após a autorização. Não existe busca global de familiares.

| Recurso | Paginação |
| --- | --- |
| `GET /pacientes/:id/atendimentos/:atendimentoId/rastreios-familiares` | `limit`/`offset` dos snapshots, ordenados pelo ID numérico do banco. |
| `GET /pacientes/:id/atendimentos/:atendimentoId/rastreios-familiares/:rastreioFamiliarId/familiares` | `limit`/`offset` somente dos resultados daquele snapshot, ordenados pelo ID numérico do resultado. |

Os dois recursos aceitam `limit` de 1 a 100 (padrão 20) e `offset` de 0 a
100000 (padrão zero). Página fora de faixa retorna coleção vazia, preservando os
metadados do snapshot quando ele existe. IDs são strings decimais positivas na
faixa bigint do PostgreSQL, sem conversão para Number na interface; ordenação SQL
usa as colunas numéricas qualificadas, sem ordenar pelo alias convertido a texto.

O primeiro recurso retorna uma lista de `RastreioFamiliarResponse`; o segundo,
um `RastreioFamiliarResponse` com a página solicitada de `familiares`:

```ts
interface RastreioFamiliarResponse {
  rastreioFamiliarId: string;
  familiaresExaminados: boolean | null;
  familiares: Array<{
    resultadoId: string;
    rastreioFamiliarId: string;
    identificacaoFamiliar: string;
    resultadoSorologia: string;
  }>;
  paginacaoFamiliares: { limit: number; offset: number };
}
```

Na lista de snapshots e no detalhe antigo de atendimento, cada snapshot inclui
uma prévia de até 20 resultados, sempre com `paginacaoFamiliares` igual a
`{ limit: 20, offset: 0 }`. O offset dos snapshots nunca desloca os filhos.
`rastreiosFamiliares` continua a coleção canônica do detalhe;
`rastreioFamiliar` continua o alias do único snapshot **da página**, ou null
quando a página contém zero ou vários. Esses campos não substituem as rotas de
paginação completa. `resultadoId` e `paginacaoFamiliares` são adições ao DTO.

## Navegação

O detalhe identifica paciente/consulta na rota. A interface usa os parâmetros
`familiaresLimit`/`familiaresOffset` para snapshots e
`familiares<rastreioFamiliarId>Limit`/`familiares<rastreioFamiliarId>Offset` para
os filhos de cada snapshot. Os parâmetros existentes de exames/pendências são
preservados. Voltar e reabrir o endereço restauram os scopes; recarregar exige
autenticação novamente, pois o token permanece somente em memória.

Falha de leitura mostra erro e permite nova consulta; não apresenta uma página
anterior como atual nem chama a falha de ausência de família. Paginar familiares
move o foco ao bloco atualizado. Nenhum desses controles emite escrita.

## Evidências

- `backend/test/clinical/familiares.http.spec.ts`: dois snapshots da mesma
  consulta com 30/50 resultados; comparação dos IDs conhecidos, união exata das
  páginas, três perfis, vínculo revogado, hierarquia, paginação independente,
  aliases e limites.
- `frontend/src/features/pacientes/family-pagination.test.tsx`: familiar 30/50,
  dois snapshots simultâneos, parâmetros independentes, voltar, URL direta,
  erro da segunda página, retry e autorização.
- `tests/frontend/familiares.spec.ts`: cenário de navegador/API/PostgreSQL com
  erro de leitura, paginação 30/50, voltar, recarregar, acessibilidade e ausência
  de escrita. A execução integrada fica registrada no relatório de validação.

O [relatório da Etapa 7](../validacoes/VALIDACAO_ETAPA_7.md) registra as execuções
sintéticas e as limitações; este contrato não declara aceite global da etapa ou
revisão de usabilidade com a equipe.
