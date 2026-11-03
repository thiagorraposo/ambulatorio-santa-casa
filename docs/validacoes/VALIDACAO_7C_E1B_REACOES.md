# Reações isoladas BZN — 7C-E1B, recorteE1.2

2026-11-01, Janela1, base2e426b8. Implementado e VALIDADO TECNICAMENTE no recorte;
E1.1 correção do tratamento e aceite humano separados.
[Contrato](../arquitetura/CONTRATO_REACOES_BZN_7C_E1B.md).

GET paginado/POST de ocorrência no canônico existente; reutiliza BznReactionDto,
sem escala, segundo tratamento, alteração de indicadores ou vínculo inventado.
UUID confirmado não executa novo POST(409); GET recupera recibo. SQL72 captura
cinco campos prospectivamente, resolve paciente por FK do tratamento e bloqueia
revisão temporal. Nenhum backfill/mudança de ACLs preexistentes/migration antiga.

Evidências aprovadas em PostgreSQL16.15 tmpfs exclusivo localhost55457,
container ambulatorio-avc-interacoes-20261101, runners/base m3_reacoes_validacao:

- Build/187 unidades: /tmp/ambulatorio-check-zdg924vn/output.log.
-5 HTTP focados: /tmp/m3-reacoes-bzn-http-final.log; dois UUID concorrentes,
  IDs distintos, canônico intocado, cinco eventos por criação e ator, paginação,
  null/literal/precisão, vínculo/perfil, rollback captura/recibo e erro sanitizado.
-132 HTTP completos em21 suítes: /tmp/ambulatorio-check-zcxgofef/output.log.
-43 scripts SQL completos: /tmp/ambulatorio-check-pbp39tx8/output.log; guard novo
  e regressões de destinos existentes após estender resolução compartilhada.
- Upgrade71→72 e31 testes workflow: /tmp/ambulatorio-check-c4hflute/output.log.
  Legado intocado sem backfill, privilégios por operação de aplicação/importador
  preservados, capturador compartilhado idêntico e marco_atual em mudança tardia.
- Importador completo: /tmp/ambulatorio-check-3j4k_ce6/output.log.
- actionlint local aprovado, /tmp/m3-reacoes-actionlint.log sem erros.

Falhas iniciais documentadas: teste de replay esperava201, mas protocolo vigente
recusa segundo POST com409; corrigida expectativa, sem mudar protocolo. SQL07
esperava CASCADE em reação recém-criada: SQL72 agora produz histórico e o guard
existente impede apagá-lo. Cenários16/22 atualizados para exigir o erro exato
auditoria_alvo_protegido e preservação de pai/filha; FKs SQL15 continuam CASCADE.
Não foram desabilitados gatilhos nem alterada a captura compartilhada.

Nenhum acesso ao banco persistente, dado real, push ou CI remoto desta janela.
Captura também cobre reações criadas por H8/importador; regressões ampliadas por
esse motivo. Fundação8 anterior inalterada não repetida. Interface/visual/aceite
não são comprovados por esta evidência. Logs /tmp são temporários.
