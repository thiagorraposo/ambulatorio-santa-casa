\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE p bigint; a bigint; n bigint;
BEGIN
  INSERT INTO paciente(nome,data_nascimento) VALUES('Paciente BZN sintético','1980-01-01') RETURNING paciente_id INTO p;
  INSERT INTO atendimento(paciente_id,data_atendimento,origem_registro) VALUES(p,'2026-01-01','cadastro_sistema') RETURNING atendimento_id INTO a;
  INSERT INTO acompanhamento_cuidado(atendimento_id,data_realizada,retorno_programado,compareceu,status_acompanhamento,tipo_acompanhamento,resumo_acompanhamento)
    VALUES(a,'2026-02-01',false,true,'concluido','retorno_bzn_30_dias','retorno sintético'),
          (a,'2026-04-01',false,true,'concluido','retorno_bzn_final','retorno final sintético');
  SELECT count(*) INTO n FROM acompanhamento_cuidado WHERE atendimento_id=a AND tipo_acompanhamento LIKE 'retorno_bzn_%';
  IF n<>2 THEN RAISE EXCEPTION 'Retornos repetíveis não preservados'; END IF;
  BEGIN
    INSERT INTO acompanhamento_cuidado(atendimento_id,tipo_acompanhamento,status_acompanhamento)
      VALUES(999999,'retorno_bzn_final','concluido');
    RAISE EXCEPTION 'Retorno aceitou atendimento inexistente';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  RAISE NOTICE 'OK: retornos BZN repetíveis, datados e vinculados ao atendimento';
END $$;
ROLLBACK;
