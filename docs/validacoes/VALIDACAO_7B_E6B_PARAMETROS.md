# Parâmetros do exame canônico — recorte7B-E6B

2026-11-01, Janela1; base2495895. Recorte RQ-EXA-09–13/16 VALIDADO TECNICAMENTE;
datas/status/correções do pai e aceite humano separados.
[Contrato](../arquitetura/CONTRATO_RESULTADOS_7B_E6B.md).

SQL73 cria filho do paciente_exame_complementar, sem usar identidade da tabela
legada SQL07. Seis campos textuais humanos independentes, captura prospectiva,
resolução por FK canônica e guard temporal específico. Nome obrigatório, valores
não convertidos/arredondados, sem interpretação automática ou alteração do pai.
GET de identificação do exame; GET paginado/POST de um parâmetro com autorização
e recibo. Sem PATCH/DELETE, novas regras clínicas, segundo exame ou backfill.

Provas aprovadas em PostgreSQL16.15 tmpfs localhost55457, container exclusivo
ambulatorio-avc-interacoes-20261101, base nova m3_resultados_validacao e runners
próprios02–73; nenhum banco persistente ou dado real:

- Build/188 unidades: /tmp/ambulatorio-check-178rgxjh/output.log.
-5 HTTP focados: /tmp/m3-resultados-http.log, incluindo dois exames/consultas,
  solicitado sem resultado, canônico sem atendimento, seis textos literais/null,
  concorrência/IDs/replay, pai intocado,12 eventos com ator, perfis/vínculos,
  troca de paciente/exame, rollback de parâmetro/captura/recibo e erro sanitizado.
-137 HTTP completos/22 suítes: /tmp/ambulatorio-check-gc0l7ruo/output.log,
  ampliados porque o resolver compartilhado recebeu um destino.
-44 SQL completos: /tmp/ambulatorio-check-qbkv0eh6/output.log.
- Upgrade72→73 final: /tmp/ambulatorio-check-ubiji98d/output.log. Pai e resultado
  legado SQL07 criados antes, intactos após migração, nova tabela vazia sem
  backfill; seis eventos por nova ocorrência, FK correta, ACLs antigas/capturador
  preservados e escrita restrita (importador sem INSERT, aplicação sem UPDATE).
-31 testes workflow: /tmp/ambulatorio-check-49xqip94/output.log; actionlint
  aprovado sem saída em /tmp/m3-resultados-actionlint.log.

Sem falha de implementação nesta rodada. Upgrade foi ampliado e repetido para
provar explicitamente coexistência com resultado legado, sem repetir workflow.
Importador/fundação inalterados: provas anteriores72 preservadas, não repetidas;
nova tabela não é escrita pelo importador. Não houve CI remoto, push/deploy.
Logs /tmp voláteis; frontend/capturas e homologação não comprovados aqui.
