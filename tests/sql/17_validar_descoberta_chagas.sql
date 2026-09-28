\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE p bigint; a bigint; d bigint;
BEGIN
  INSERT INTO paciente(nome,data_nascimento) VALUES ('Paciente descoberta sintético','1985-01-01') RETURNING paciente_id INTO p;
  INSERT INTO atendimento(paciente_id,data_atendimento,origem_registro) VALUES (p,'2026-01-01','cadastro_sistema') RETURNING atendimento_id INTO a;
  INSERT INTO diagnostico_chagas(atendimento_id,data_descoberta_autorelato,data_resultado_final)
    VALUES(a,'2010-05-03','2026-02-01') RETURNING diagnostico_chagas_id INTO d;
  IF (SELECT data_descoberta_autorelato FROM diagnostico_chagas WHERE diagnostico_chagas_id=d) <> DATE '2010-05-03' THEN
    RAISE EXCEPTION 'data de descoberta não preservada';
  END IF;
  IF (SELECT data_resultado_final FROM diagnostico_chagas WHERE diagnostico_chagas_id=d) <> DATE '2026-02-01' THEN
    RAISE EXCEPTION 'data de sorologia/resultado foi confundida';
  END IF;
  RAISE NOTICE 'OK: descoberta do paciente e resultado laboratorial permanecem distintos';
END $$;
ROLLBACK;
