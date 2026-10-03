-- Objetivo: vincular a prova a linha declarada e fechar escrita sem SET ROLE.
-- Impacto: outra linha da mesma base nao comprova a ocorrencia escolhida;
-- login operacional do importador exige contexto mesmo por privilegio herdado.
-- Reversao: bloquear revisoes, mantendo estas protecoes e todas as evidencias.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$ DECLARE definicao text; trecho text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_cobertura_base(bigint,bigint,bigint,jsonb)'::regprocedure);
  trecho:='AND p.registro_id=registro) INTO cadeia;';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Prova de cobertura inesperada'; END IF;
  EXECUTE replace(definicao,trecho,'AND p.registro_id=registro'
    ||' AND i.aba_ordem=(SELECT b.aba_ordem FROM ambulatorio.importacao_linha b WHERE b.importacao_linha_id=linha_base)'
    ||' AND i.numero_linha=(SELECT b.numero_linha FROM ambulatorio.importacao_linha b WHERE b.importacao_linha_id=linha_base)) INTO cadeia;');
  definicao:=pg_get_functiondef('ambulatorio.auditoria_capturar()'::regprocedure);
  trecho:='IF current_setting(''role'',true)=''ambulatorio_importador'' AND contexto.origem IS DISTINCT FROM ''importacao'' THEN';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Captura de contexto inesperada'; END IF;
  EXECUTE replace(definicao,trecho,'IF (current_setting(''role'',true)=''ambulatorio_importador'''
    ||' OR (pg_has_role(session_user,''ambulatorio_importador'',''MEMBER'')'
    ||' AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=session_user AND rolsuper)))'
    ||' AND contexto.origem IS DISTINCT FROM ''importacao'' THEN');
END $$;
COMMIT;
