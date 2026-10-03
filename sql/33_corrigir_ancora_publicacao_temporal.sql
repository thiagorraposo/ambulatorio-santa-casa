-- Objetivo: remover ambiguidade entre parametro paciente e nome da tabela.
-- Impacto: corrige exclusivamente a referencia do lock na funcao da migration 31.
-- Nao altera plano/hash/permissoes nem habilita executor clinico.
-- Reversao: revogar EXECUTE do fluxo em nova migration; preservar evidencias.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$ DECLARE definicao text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_publicar_decisao_interna(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)'::regprocedure);
  IF strpos(definicao,'WHERE paciente_id=paciente FOR SHARE')=0 THEN
    RAISE EXCEPTION 'Definicao da publicacao temporal diverge da migration 31';
  END IF;
  EXECUTE replace(definicao,'WHERE paciente_id=paciente FOR SHARE','WHERE paciente_id=$4 FOR SHARE');
END $$;
REVOKE ALL ON FUNCTION revisao_publicar_decisao_interna(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)
  FROM PUBLIC,ambulatorio_revisao_servico,ambulatorio_revisao_gestor,ambulatorio_aplicacao,
    ambulatorio_importador,ambulatorio_servico_autenticado;
COMMIT;
