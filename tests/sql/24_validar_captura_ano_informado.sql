-- D8: ano novo tem historico atribuivel, sem fabricar comparecimento.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE paciente_id_novo bigint; evento_id_novo bigint; campo bigint;
BEGIN
  SELECT campo_id INTO campo FROM auditoria_campo
    WHERE tabela_destino='evento_clinico' AND coluna_destino='ano_evento'
      AND coluna_pk='evento_clinico_id' AND tipo_sql='integer'
      AND serializacao_versao='v1' AND captura_desde IS NOT NULL;
  IF campo IS NULL THEN RAISE EXCEPTION 'D8: captura anual inativa'; END IF;
  INSERT INTO paciente(nome) VALUES('Pessoa D8 sintetica') RETURNING paciente_id INTO paciente_id_novo;
  INSERT INTO evento_clinico(paciente_id,tipo_evento,ano_evento,valor_original_data)
    VALUES(paciente_id_novo,'ultimo_comparecimento_ano_informado',2023,'2023')
    RETURNING evento_clinico_id INTO evento_id_novo;
  UPDATE evento_clinico SET ano_evento=2022,valor_original_data='2022'
    WHERE evento_clinico_id=evento_id_novo;
  UPDATE evento_clinico SET ano_evento=2023,valor_original_data='2023'
    WHERE evento_clinico_id=evento_id_novo;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF (SELECT count(*) FROM auditoria_campo_evento
      WHERE campo_id=campo AND registro_id=evento_id_novo)<>3
    OR NOT EXISTS(SELECT 1 FROM auditoria_campo_evento
      WHERE campo_id=campo AND registro_id=evento_id_novo AND versao_campo=3
        AND depois->>'valor'='2023')
    OR (SELECT count(*) FROM atendimento WHERE paciente_id=paciente_id_novo)<>0
    OR (SELECT count(*) FROM acompanhamento_cuidado a JOIN atendimento t
      ON t.atendimento_id=a.atendimento_id WHERE t.paciente_id=paciente_id_novo)<>0 THEN
    RAISE EXCEPTION 'D8: historia A-B-A ou ausencia de visita divergente';
  END IF;
  RAISE NOTICE 'OK: D8 captura A-B-A, ano sem data ou comparecimento fabricado';
END $$;
ROLLBACK;
