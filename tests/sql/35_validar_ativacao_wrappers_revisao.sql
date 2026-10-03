-- F05/F16: ativacao restrita dos wrappers operacionais da revisao.
-- Execucao reversivel em qualquer banco apos migrations: nenhum dado clinico e gravado.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE rotina text; estado text; mensagem text;
BEGIN
  FOREACH rotina IN ARRAY ARRAY[
    'revisao_aplicar_aprovada(bigint,bigint)',
    'revisao_finalizar_aprovada(bigint,bigint,text)',
    'revisao_diagnosticar_falha(bigint,bigint,text)'
  ] LOOP
    IF NOT has_function_privilege('ambulatorio_revisao_servico',
        'ambulatorio.'||rotina,'EXECUTE') THEN
      RAISE EXCEPTION 'Wrapper sem concessao para servico: %',rotina;
    END IF;
    FOREACH mensagem IN ARRAY ARRAY[
      'ambulatorio_importador','ambulatorio_aplicacao',
      'ambulatorio_servico_autenticado','ambulatorio_revisao_gestor'
    ] LOOP
      IF has_function_privilege(mensagem,'ambulatorio.'||rotina,'EXECUTE') THEN
        RAISE EXCEPTION 'Wrapper concedido a role indevida: % em %',rotina,mensagem;
      END IF;
    END LOOP;
  END LOOP;
  FOREACH rotina IN ARRAY ARRAY[
    'revisao_aplicar_decisao_interna(bigint,bigint)',
    'revisao_terminar_interna(bigint,bigint,text)',
    'revisao_registrar_falha_interna(bigint,bigint,text)'
  ] LOOP
    IF has_function_privilege('ambulatorio_revisao_servico','ambulatorio.'||rotina,'EXECUTE')
      OR has_function_privilege('ambulatorio_revisao_gestor','ambulatorio.'||rotina,'EXECUTE') THEN
      RAISE EXCEPTION 'Rotina interna exposta: %',rotina;
    END IF;
  END LOOP;
END $$;

-- Uma identidade confiável ausente falha antes de ler qualquer decisão ou autorização.
DO $$
DECLARE estado text; mensagem text;
BEGIN
  SET LOCAL ROLE ambulatorio_revisao_servico;
  BEGIN
    PERFORM revisao_aplicar_aprovada(-910035,-910035);
    RAISE EXCEPTION 'Esperava recusa por identidade ausente';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS estado=RETURNED_SQLSTATE,mensagem=MESSAGE_TEXT;
    IF estado<>'42501' OR mensagem<>'revisao_identidade_nao_autenticada' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM revisao_finalizar_aprovada(-910035,-910035,'encerrar');
    RAISE EXCEPTION 'Esperava recusa por identidade ausente';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS estado=RETURNED_SQLSTATE,mensagem=MESSAGE_TEXT;
    IF estado<>'42501' OR mensagem<>'revisao_identidade_nao_autenticada' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM revisao_diagnosticar_falha(-910035,-910035,'23514');
    RAISE EXCEPTION 'Esperava recusa por identidade ausente';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS estado=RETURNED_SQLSTATE,mensagem=MESSAGE_TEXT;
    IF estado<>'42501' OR mensagem<>'revisao_identidade_nao_autenticada' THEN RAISE; END IF;
  END;
  RESET ROLE;
END $$;

-- Prova de reversibilidade da ACL: REVOKE não toca proveniência nem auditoria;
-- ROLLBACK restaura a concessão feita pela migration 63.
CREATE TEMP TABLE _evidencia_antes ON COMMIT DROP AS
  SELECT (SELECT count(*) FROM auditoria_contexto_transacao) AS contextos,
         (SELECT count(*) FROM importacao_revisao_aplicacao) AS aplicacoes;
SAVEPOINT antes_reversao_acl;
REVOKE EXECUTE ON FUNCTION revisao_aplicar_aprovada(bigint,bigint),
  revisao_finalizar_aprovada(bigint,bigint,text),
  revisao_diagnosticar_falha(bigint,bigint,text) FROM ambulatorio_revisao_servico;
DO $$
BEGIN
  IF has_function_privilege('ambulatorio_revisao_servico',
      'ambulatorio.revisao_aplicar_aprovada(bigint,bigint)','EXECUTE')
    OR has_function_privilege('ambulatorio_revisao_servico',
      'ambulatorio.revisao_finalizar_aprovada(bigint,bigint,text)','EXECUTE')
    OR has_function_privilege('ambulatorio_revisao_servico',
      'ambulatorio.revisao_diagnosticar_falha(bigint,bigint,text)','EXECUTE') THEN
    RAISE EXCEPTION 'REVOKE nao retirou a allowlist operacional';
  END IF;
  IF (SELECT contextos FROM _evidencia_antes)<>(SELECT count(*) FROM auditoria_contexto_transacao)
    OR (SELECT aplicacoes FROM _evidencia_antes)<>(SELECT count(*) FROM importacao_revisao_aplicacao) THEN
    RAISE EXCEPTION 'Reversao de ACL alterou evidencia de auditoria';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT antes_reversao_acl;
DO $$
BEGIN
  IF NOT has_function_privilege('ambulatorio_revisao_servico',
      'ambulatorio.revisao_aplicar_aprovada(bigint,bigint)','EXECUTE')
    OR NOT has_function_privilege('ambulatorio_revisao_servico',
      'ambulatorio.revisao_finalizar_aprovada(bigint,bigint,text)','EXECUTE')
    OR NOT has_function_privilege('ambulatorio_revisao_servico',
      'ambulatorio.revisao_diagnosticar_falha(bigint,bigint,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Rollback nao restaurou a allowlist concedida pela migration';
  END IF;
END $$;
ROLLBACK;
