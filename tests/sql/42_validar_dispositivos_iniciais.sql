\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio,public;
DO $$
DECLARE campo bigint;
BEGIN
 IF (SELECT count(*) FROM auditoria_campo WHERE tabela_destino='dispositivo_implantado'
   AND coluna_destino IN ('tipo_dispositivo','possui_dispositivo','observacoes') AND captura_desde IS NOT NULL)<>3 THEN
   RAISE EXCEPTION 'Dispositivo: três campos precisam captura prospectiva';
 END IF;
 FOR campo IN SELECT campo_id FROM auditoria_campo WHERE tabela_destino='dispositivo_implantado'
  AND coluna_destino IN ('tipo_dispositivo','possui_dispositivo','observacoes') LOOP
  BEGIN
   INSERT INTO importacao_revisao_campo(campo_id) VALUES(campo);
   RAISE EXCEPTION 'Revisão de dispositivo habilitada sem contrato';
  EXCEPTION WHEN check_violation THEN
   IF SQLERRM<>'revisao_campos_dispositivo_implantado_nao_habilitada' THEN RAISE; END IF;
  END;
 END LOOP;
 RAISE NOTICE 'OK: captura prospectiva de dispositivo e guard temporal específico';
END $$;
ROLLBACK;
