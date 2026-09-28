-- Objetivo: D3, avaliacoes de rastreio familiar e pares familiar/resultado.
-- Impacto: duas tabelas aditivas, sem inferir dados de historico_familiar_chagas.
-- Reversao: nova migration restritiva; preservar avaliacoes e seus resultados.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
CREATE TABLE rastreio_familiar (
  rastreio_familiar_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paciente_id bigint NOT NULL REFERENCES paciente ON DELETE RESTRICT,
  atendimento_id bigint,
  familiares_examinados boolean,
  valor_original_examinados text,
  criado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(atendimento_id,paciente_id) REFERENCES atendimento(atendimento_id,paciente_id) ON DELETE RESTRICT
);
CREATE TABLE rastreio_familiar_resultado (
  rastreio_familiar_resultado_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rastreio_familiar_id bigint NOT NULL REFERENCES rastreio_familiar ON DELETE RESTRICT,
  identificacao_familiar text NOT NULL CHECK(btrim(identificacao_familiar)<>''),
  resultado_sorologia text NOT NULL CHECK(btrim(resultado_sorologia)<>''),
  criado_em timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_rastreio_paciente ON rastreio_familiar(paciente_id);
CREATE INDEX idx_rastreio_atendimento ON rastreio_familiar(atendimento_id);
CREATE INDEX idx_rastreio_resultado ON rastreio_familiar_resultado(rastreio_familiar_id);
CREATE FUNCTION validar_rastreio_familiar() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE id bigint; flag boolean; quantidade bigint;
BEGIN
  id:=COALESCE(NEW.rastreio_familiar_id,OLD.rastreio_familiar_id);
  SELECT familiares_examinados INTO flag FROM ambulatorio.rastreio_familiar WHERE rastreio_familiar_id=id FOR UPDATE;
  SELECT count(*) INTO quantidade FROM ambulatorio.rastreio_familiar_resultado WHERE rastreio_familiar_id=id;
  IF (flag IS TRUE AND quantidade=0) OR (flag IS DISTINCT FROM TRUE AND quantidade>0) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='rastreio_familiar_detalhes_incompativeis';
  END IF;
  IF TG_OP='UPDATE' AND TG_TABLE_NAME='rastreio_familiar_resultado'
    AND NEW.rastreio_familiar_id<>OLD.rastreio_familiar_id THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='rastreio_familiar_vinculo_imutavel';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER rastreio_completo AFTER INSERT OR UPDATE ON rastreio_familiar
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_rastreio_familiar();
CREATE CONSTRAINT TRIGGER rastreio_completo AFTER INSERT OR UPDATE OR DELETE ON rastreio_familiar_resultado
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validar_rastreio_familiar();
COMMENT ON TABLE rastreio_familiar IS 'D3: snapshot informado de rastreio, sem equivalencia com historico de doenca familiar.';
COMMENT ON TABLE rastreio_familiar_resultado IS 'D3: identificacao e resultado livres; sem cadastro civil nem data obrigatoria.';
REVOKE ALL ON rastreio_familiar,rastreio_familiar_resultado FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON rastreio_familiar,rastreio_familiar_resultado TO ambulatorio_aplicacao,ambulatorio_importador;
GRANT USAGE,SELECT ON SEQUENCE rastreio_familiar_rastreio_familiar_id_seq,
  rastreio_familiar_resultado_rastreio_familiar_resultado_id_seq TO ambulatorio_aplicacao,ambulatorio_importador;
REVOKE ALL ON FUNCTION validar_rastreio_familiar() FROM PUBLIC;
COMMIT;
