\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio,public;
DO $$
DECLARE campo bigint;
BEGIN
 IF (SELECT count(*) FROM auditoria_campo WHERE tabela_destino='reacao_adversa_benzonidazol'
   AND coluna_destino IN ('descricao','gravidade','data_reacao','consequencia','observacoes') AND captura_desde IS NOT NULL)<>5 THEN
   RAISE EXCEPTION 'Reações: cinco campos precisam captura prospectiva';
 END IF;
 FOR campo IN SELECT campo_id FROM auditoria_campo WHERE tabela_destino='reacao_adversa_benzonidazol'
  AND coluna_destino IN ('descricao','gravidade','data_reacao','consequencia','observacoes') LOOP
  BEGIN
   INSERT INTO importacao_revisao_campo(campo_id) VALUES(campo);
   RAISE EXCEPTION 'Revisão de reação habilitada sem contrato';
  EXCEPTION WHEN check_violation THEN
   IF SQLERRM<>'revisao_reacoes_bzn_nao_habilitada' THEN RAISE; END IF;
  END;
 END LOOP;
 RAISE NOTICE 'OK: captura prospectiva de reações BZN e guard temporal específico';
END $$;
ROLLBACK;
