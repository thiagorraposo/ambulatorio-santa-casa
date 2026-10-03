-- Objetivo: eliminar ambiguidade entre registro PL/pgSQL e alias de aplicacao.
-- Impacto: permite conferir sucesso de alvo reutilizado sem alterar a prova.
-- Reversao: restringir aplicacao; preservar evidencias e funcoes anteriores.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$ DECLARE definicao text; trecho text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_conferir_sucesso(bigint)'::regprocedure);
  trecho:='JOIN ambulatorio.importacao_revisao_aplicacao ap ON ap.aplicacao_id=p.aplicacao_anterior';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Alias da prova inesperado'; END IF;
  definicao:=replace(definicao,trecho,
    'JOIN ambulatorio.importacao_revisao_aplicacao predecessora ON predecessora.aplicacao_id=p.aplicacao_anterior');
  trecho:='cp.decisao_id=ap.decisao_id AND cp.alvo_chave=v.alvo_chave';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Campo predecessor inesperado'; END IF;
  EXECUTE replace(definicao,trecho,'cp.decisao_id=predecessora.decisao_id AND cp.alvo_chave=v.alvo_chave');
END $$;
COMMIT;
