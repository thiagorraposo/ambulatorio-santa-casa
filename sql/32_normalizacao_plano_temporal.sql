-- Objetivo: canonizar os identificadores do plano antes do hash da migration 31.
-- Impacto: entrada numerica/textual equivalente produz representacao tipada
-- unica; nenhuma escrita clinica, habilitacao ou membro automatico.
-- Reversao: revogar EXECUTE do wrapper, preservando decisoes e hashes existentes.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

ALTER FUNCTION revisao_publicar_decisao(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)
  RENAME TO revisao_publicar_decisao_interna;
REVOKE ALL ON FUNCTION revisao_publicar_decisao_interna(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)
  FROM PUBLIC,ambulatorio_revisao_servico,ambulatorio_revisao_gestor,ambulatorio_aplicacao,
    ambulatorio_importador,ambulatorio_servico_autenticado;

CREATE FUNCTION revisao_publicar_decisao(
  revisao bigint,linha_revisada bigint,linha_base bigint,paciente bigint,atendimento_base bigint,
  autorizacao bigint,resultado_decisao text,justificativa_decisao text,campos jsonb,decisao_anterior bigint DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE item jsonb; normalizado jsonb:='[]';
BEGIN
  IF jsonb_typeof(campos) IS DISTINCT FROM 'array' OR jsonb_array_length(campos)>256 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_plano_invalido';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(campos) LOOP
    IF jsonb_typeof(item)<>'object' OR (item-ARRAY['campoId','alvoChave','registroId','chaveSemantica',
      'blocoFuncional','ocorrencia','categoria','operacao','base','proposto'])<>'{}'::jsonb THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_campo_invalido';
    END IF;
    normalizado:=normalizado||jsonb_build_array(jsonb_build_object(
      'campoId',(item->>'campoId')::bigint,'alvoChave',item->>'alvoChave','registroId',(item->>'registroId')::bigint,
      'chaveSemantica',item->>'chaveSemantica','blocoFuncional',item->>'blocoFuncional',
      'ocorrencia',(item->>'ocorrencia')::bigint,'categoria',item->>'categoria','operacao',item->>'operacao',
      'base',item->'base','proposto',item->'proposto'));
  END LOOP;
  RETURN ambulatorio.revisao_publicar_decisao_interna(revisao,linha_revisada,linha_base,paciente,
    atendimento_base,autorizacao,resultado_decisao,justificativa_decisao,normalizado,decisao_anterior);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_campo_invalido';
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_publicar_decisao(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)
  OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_publicar_decisao(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)
  FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,ambulatorio_revisao_gestor;
GRANT EXECUTE ON FUNCTION revisao_publicar_decisao(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)
  TO ambulatorio_revisao_servico;
COMMIT;
