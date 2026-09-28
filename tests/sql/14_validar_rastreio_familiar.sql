\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE p bigint; p2 bigint; a bigint; r bigint; flag boolean;
BEGIN
  INSERT INTO paciente(nome) VALUES('Familia sintetica') RETURNING paciente_id INTO p;
  INSERT INTO paciente(nome) VALUES('Outra familia sintetica') RETURNING paciente_id INTO p2;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(p,DATE '2026-01-10') RETURNING atendimento_id INTO a;
  INSERT INTO rastreio_familiar(paciente_id,atendimento_id,familiares_examinados) VALUES(p,a,true) RETURNING rastreio_familiar_id INTO r;
  INSERT INTO rastreio_familiar_resultado(rastreio_familiar_id,identificacao_familiar,resultado_sorologia)
    VALUES(r,'Mae sintetica','Negativo informado'),(r,'Irmao sintetico','Resultado nao conhecido');
  SET CONSTRAINTS ALL IMMEDIATE;
  IF (SELECT count(*) FROM rastreio_familiar_resultado WHERE rastreio_familiar_id=r)<>2 THEN
    RAISE EXCEPTION 'Pares familiares perdidos';
  END IF;
  FOREACH flag IN ARRAY ARRAY[false,NULL] LOOP
    INSERT INTO rastreio_familiar(paciente_id,familiares_examinados) VALUES(p,flag);
  END LOOP;
  BEGIN
    INSERT INTO rastreio_familiar(paciente_id,familiares_examinados) VALUES(p,true);
    RAISE EXCEPTION 'Sim sem identificacao/resultado aceito';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE rastreio_familiar SET familiares_examinados=false WHERE rastreio_familiar_id=r;
    RAISE EXCEPTION 'Negativo com familiares examinados aceito';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO rastreio_familiar(paciente_id,atendimento_id,familiares_examinados) VALUES(p2,a,false);
    RAISE EXCEPTION 'Atendimento de outro paciente aceito';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  IF EXISTS(SELECT 1 FROM historico_familiar_chagas h WHERE h.paciente_id=p) THEN
    RAISE EXCEPTION 'Sorologia foi convertida em historico de doenca';
  END IF;
  RAISE NOTICE 'OK: D3 verdadeiro/falso/desconhecido, varios familiares, par obrigatorio e paciente consistente';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
