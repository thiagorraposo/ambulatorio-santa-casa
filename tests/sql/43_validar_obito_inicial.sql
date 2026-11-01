\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio,public;
DO $$
DECLARE campo bigint;
BEGIN
 IF (SELECT count(*) FROM auditoria_campo WHERE tabela_destino='obito'
   AND coluna_destino IN ('houve_obito','data_obito','causa_obito','observacoes') AND captura_desde IS NOT NULL)<>4 THEN
   RAISE EXCEPTION 'Óbito: quatro campos precisam captura prospectiva';
 END IF;
 FOR campo IN SELECT campo_id FROM auditoria_campo WHERE tabela_destino='obito'
  AND coluna_destino IN ('houve_obito','data_obito','causa_obito','observacoes') LOOP
  BEGIN
   INSERT INTO importacao_revisao_campo(campo_id) VALUES(campo);
   RAISE EXCEPTION 'Revisão de óbito habilitada sem contrato';
  EXCEPTION WHEN check_violation THEN
   IF SQLERRM<>'revisao_campos_obito_nao_habilitada' THEN RAISE; END IF;
  END;
 END LOOP;
 RAISE NOTICE 'OK: captura prospectiva de óbito e guard temporal específico';
END $$;
ROLLBACK;
