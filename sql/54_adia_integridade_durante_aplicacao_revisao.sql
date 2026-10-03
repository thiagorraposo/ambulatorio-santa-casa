-- Objetivo: validar a transicao da revisao e da fonte como uma unica unidade.
-- Impacto: adia somente validar_revisao no ramo que marca a revisao em aplicacao;
-- o executor ja a valida imediatamente ao fim, depois de atualizar a fonte.
-- Reversao: uma migration posterior pode restaurar a definicao anterior do
-- executor; nao remover decisoes, aplicacoes ou evidencias existentes.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE definicao text; trecho text; substituto text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_aplicar_decisao_interna(bigint,bigint)'::regprocedure);
  trecho:=$patch$  IF r.estado='preparada' THEN$patch$;
  substituto:=$patch$  IF r.estado='preparada' THEN
    -- Validacao diferida ate que revisao e fonte estejam ambas atualizadas.
    SET CONSTRAINTS ambulatorio.validar_revisao DEFERRED;$patch$;
  IF strpos(definicao,trecho)=0 THEN
    RAISE EXCEPTION 'Ponto de transicao do executor temporal inesperado';
  END IF;
  IF strpos(definicao,substituto)>0 THEN
    RAISE EXCEPTION 'A constraint temporal ja foi adiada neste ramo';
  END IF;
  definicao:=replace(definicao,trecho,substituto);
  EXECUTE definicao;
END $$;

COMMENT ON FUNCTION revisao_aplicar_decisao_interna(bigint,bigint) IS
  'Executor privado; adia validar_revisao somente durante a transicao atomica entre revisao e fonte e valida imediatamente ao final.';
COMMIT;
