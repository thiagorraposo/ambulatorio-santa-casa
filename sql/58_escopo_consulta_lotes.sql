-- Objetivo: restringir o acompanhamento ordinário de lotes por identidade e proveniência clínica.
-- Impacto: administração mantém leitura global de metadados; consulta/edição só leem lotes
-- inteiramente vinculados a pacientes existentes com acesso ativo. Lotes revisados ficam fora.
-- Reversão: migration posterior pode restaurar leitura global das views; não há perda de dados.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

GRANT SELECT ON importacao_registro, paciente, atendimento, paciente_endereco, paciente_contato,
  paciente_projeto_estudo, atendimento_projeto_estudo, evento_clinico, notificacao, obito,
  dispositivo_implantado, historico_familiar_chagas, paciente_exame_complementar,
  paciente_comorbidade, rastreio_familiar, diagnostico_chagas, sorologia_chagas,
  sorologia_solicitacao, condicao_chagas, complicacao_chagas, dados_clinicos_atendimento,
  atendimento_exame_complementar, exame_complementar_resultado, atendimento_medicamento,
  tratamento_chagas, tratamento_benzonidazol, encaminhamento, acompanhamento_cuidado,
  reacao_adversa_benzonidazol, rastreio_familiar_resultado, pendencia_atendimento,
  procedimento_clinico, acesso_paciente, importacao_revisao
  TO ambulatorio_auditoria_owner;

CREATE FUNCTION importacao_registro_paciente_id(tabela text, registro bigint) RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE paciente bigint;
BEGIN
  CASE tabela
    WHEN 'paciente' THEN
      SELECT p.paciente_id INTO paciente FROM ambulatorio.paciente p WHERE p.paciente_id=registro;
    WHEN 'paciente_endereco' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.paciente_endereco x WHERE x.endereco_id=registro;
    WHEN 'paciente_contato' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.paciente_contato x WHERE x.contato_id=registro;
    WHEN 'paciente_projeto_estudo' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.paciente_projeto_estudo x WHERE x.paciente_projeto_estudo_id=registro;
    WHEN 'paciente_exame_complementar' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.paciente_exame_complementar x WHERE x.paciente_exame_complementar_id=registro;
    WHEN 'paciente_comorbidade' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.paciente_comorbidade x WHERE x.paciente_comorbidade_id=registro;
    WHEN 'evento_clinico' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.evento_clinico x WHERE x.evento_clinico_id=registro;
    WHEN 'notificacao' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.notificacao x WHERE x.notificacao_id=registro;
    WHEN 'obito' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.obito x WHERE x.obito_id=registro;
    WHEN 'dispositivo_implantado' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.dispositivo_implantado x WHERE x.dispositivo_implantado_id=registro;
    WHEN 'historico_familiar_chagas' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.historico_familiar_chagas x WHERE x.historico_familiar_chagas_id=registro;
    WHEN 'rastreio_familiar' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.rastreio_familiar x WHERE x.rastreio_familiar_id=registro;
    WHEN 'rastreio_familiar_resultado' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.rastreio_familiar_resultado r
        JOIN ambulatorio.rastreio_familiar x USING(rastreio_familiar_id)
        WHERE r.rastreio_familiar_resultado_id=registro;
    WHEN 'tratamento_benzonidazol' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.tratamento_benzonidazol x WHERE x.tratamento_benzonidazol_id=registro;
    WHEN 'reacao_adversa_benzonidazol' THEN
      SELECT x.paciente_id INTO paciente FROM ambulatorio.reacao_adversa_benzonidazol r
        JOIN ambulatorio.tratamento_benzonidazol x USING(tratamento_benzonidazol_id)
        WHERE r.reacao_adversa_benzonidazol_id=registro;
    WHEN 'atendimento' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.atendimento a WHERE a.atendimento_id=registro;
    WHEN 'diagnostico_chagas' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.diagnostico_chagas x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.diagnostico_chagas_id=registro;
    WHEN 'sorologia_chagas' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.sorologia_chagas x
        JOIN ambulatorio.diagnostico_chagas d USING(diagnostico_chagas_id)
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.sorologia_chagas_id=registro;
    WHEN 'exame_complementar_resultado' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.exame_complementar_resultado x
        JOIN ambulatorio.atendimento_exame_complementar e USING(atendimento_exame_complementar_id)
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.exame_complementar_resultado_id=registro;
    WHEN 'sorologia_solicitacao' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.sorologia_solicitacao x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.sorologia_solicitacao_id=registro;
    WHEN 'condicao_chagas' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.condicao_chagas x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.condicao_chagas_id=registro;
    WHEN 'complicacao_chagas' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.complicacao_chagas x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.complicacao_chagas_id=registro;
    WHEN 'dados_clinicos_atendimento' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.dados_clinicos_atendimento x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.dados_clinicos_atendimento_id=registro;
    WHEN 'atendimento_exame_complementar' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.atendimento_exame_complementar x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.atendimento_exame_complementar_id=registro;
    WHEN 'atendimento_medicamento' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.atendimento_medicamento x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.atendimento_medicamento_id=registro;
    WHEN 'tratamento_chagas' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.tratamento_chagas x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.tratamento_chagas_id=registro;
    WHEN 'encaminhamento' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.encaminhamento x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.encaminhamento_id=registro;
    WHEN 'acompanhamento_cuidado' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.acompanhamento_cuidado x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.acompanhamento_cuidado_id=registro;
    WHEN 'pendencia_atendimento' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.pendencia_atendimento x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.pendencia_atendimento_id=registro;
    WHEN 'procedimento_clinico' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.procedimento_clinico x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.procedimento_clinico_id=registro;
    WHEN 'atendimento_projeto_estudo' THEN
      SELECT a.paciente_id INTO paciente FROM ambulatorio.atendimento_projeto_estudo x
        JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE x.atendimento_projeto_estudo_id=registro;
    ELSE
      RETURN NULL;
  END CASE;
  RETURN paciente;
END $$;

CREATE FUNCTION importacao_lote_pode_consultar(lote bigint) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; perfil text; total bigint;
BEGIN
  IF lote IS NULL OR NOT pg_has_role(session_user,'ambulatorio_aplicacao','MEMBER') THEN RETURN false; END IF;
  SELECT c.ator_usuario_id,u.perfil INTO ator,perfil
    FROM ambulatorio.auditoria_contexto_transacao c
    JOIN ambulatorio.usuario_aplicacao u ON u.usuario_id=c.ator_usuario_id AND u.ativo
    WHERE c.transacao_id=pg_current_xact_id_if_assigned()
      AND c.principal_db=session_user AND c.origem='aplicacao';
  IF ator IS NULL THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao r WHERE r.lote_revisado_id=lote) THEN RETURN false; END IF;
  IF NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_lote l WHERE l.importacao_lote_id=lote) THEN RETURN false; END IF;
  IF perfil='administracao' THEN RETURN true; END IF;

  SELECT count(*) INTO total FROM ambulatorio.importacao_linha i WHERE i.importacao_lote_id=lote;
  IF total=0 THEN RETURN false; END IF;
  RETURN NOT EXISTS(
    SELECT 1 FROM ambulatorio.importacao_linha i
    WHERE i.importacao_lote_id=lote AND (
      NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_registro r WHERE r.importacao_linha_id=i.importacao_linha_id)
      OR EXISTS(SELECT 1 FROM ambulatorio.importacao_registro r WHERE r.importacao_linha_id=i.importacao_linha_id
        AND ambulatorio.importacao_registro_paciente_id(r.tabela_destino,r.registro_id) IS NULL)
      OR (SELECT count(DISTINCT ambulatorio.importacao_registro_paciente_id(r.tabela_destino,r.registro_id))
          FROM ambulatorio.importacao_registro r WHERE r.importacao_linha_id=i.importacao_linha_id)<>1
      OR NOT EXISTS(
        SELECT 1 FROM ambulatorio.importacao_registro r
        JOIN ambulatorio.acesso_paciente ac ON ac.paciente_id=
          ambulatorio.importacao_registro_paciente_id(r.tabela_destino,r.registro_id)
          AND ac.usuario_id=ator AND ac.ativo
        WHERE r.importacao_linha_id=i.importacao_linha_id))
  );
END $$;

COMMENT ON FUNCTION importacao_lote_pode_consultar(bigint) IS
  'Autoriza lote ordinário pela identidade ativa no ledger da transação e proveniência integral; lotes revisados são excluídos.';

GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION importacao_registro_paciente_id(text,bigint) OWNER TO ambulatorio_auditoria_owner;
ALTER FUNCTION importacao_lote_pode_consultar(bigint) OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION importacao_registro_paciente_id(text,bigint),importacao_lote_pode_consultar(bigint)
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
    ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT EXECUTE ON FUNCTION importacao_lote_pode_consultar(bigint) TO ambulatorio_aplicacao;

COMMIT;
