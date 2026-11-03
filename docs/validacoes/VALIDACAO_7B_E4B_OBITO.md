# Óbito consolidado inicial — recorte E4B

2026-11-01, Janela1, base0f7edec. Backend implementado no contrato SQL10,
sem resolver precisão parcial ou correção de estado. [Contrato](../arquitetura/CONTRATO_EVENTOS_7B_E4B.md).

Build e185 unidades em /tmp/ambulatorio-check-7y6a_zwt/output.log; build final
após remover parâmetro de atendimento que não pertence à rota passou em
/tmp/ambulatorio-check-8hkbu9q8/output.log. Os seis novos HTTP passaram em
/tmp/m3-obito-http-focado.log: JSON null, positivo sem data/causa, negativa e
campos independentes, paciente sem atendimento artificial, datas inválidas/
parciais recusadas, RBAC/revogação, duas intenções→201/409, recibo/replay e
rollback SQL de estado/captura/recibo com erro sanitizado.

42 scripts SQL completos, upgrade70→71, importador e31 workflow passaram em
/tmp/ambulatorio-check-7xz8ucx3/output.log. Upgrade compara legado/ACLs e captura
compartilhada e prova ausência de backfill e marco_atual em mudança posterior.
SQL43 prova quatro campos ativos e guard temporal específico. Não houve falha
na composição focada/SQL; suíte completa HTTP121/121 (19 suítes) e fundação8/8 passaram em
/tmp/ambulatorio-check-lq77ztay/output.log, com DB_*/APP_DB_* explícitos no
servidor sintético confirmado e base m3_obito_validacao. Recorte de backend
validado tecnicamente; agregado E4B não concluído.

PostgreSQL16.15 tmpfs exclusivo localhost55457, ambulatorio-avc-interacoes-20261101,
identidade/armazenamento confirmados; nova base m3_obito_validacao com02–71,
HTTP/upgrade em bases próprias. Nenhum dado real ou acesso ao persistente.
Sem alteração de migrations antigas, ACLs ou comportamento de outros fluxos;
POST só cria estado inicial, sem preencher precisão/data/causa/diagnóstico.
Interface, comparação visual, CI remoto próprio e aceite humano separados.
