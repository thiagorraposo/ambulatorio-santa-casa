\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio,public;
DO $$
DECLARE campo bigint;
BEGIN
 IF (SELECT count(*) FROM auditoria_campo WHERE tabela_destino='paciente_exame_resultado'
   AND coluna_destino IN ('nome_parametro','valor_informado','unidade_informada','referencia_informada','interpretacao_informada','observacoes') AND captura_desde IS NOT NULL)<>6 THEN
   RAISE EXCEPTION 'Resultados: seis campos precisam captura prospectiva';
 END IF;
 FOR campo IN SELECT campo_id FROM auditoria_campo WHERE tabela_destino='paciente_exame_resultado'
  AND coluna_destino IN ('nome_parametro','valor_informado','unidade_informada','referencia_informada','interpretacao_informada','observacoes') LOOP
  BEGIN
   INSERT INTO importacao_revisao_campo(campo_id) VALUES(campo);
   RAISE EXCEPTION 'Revisão de resultado habilitada sem contrato';
  EXCEPTION WHEN check_violation THEN
   IF SQLERRM<>'revisao_resultados_canonicos_nao_habilitada' THEN RAISE; END IF;
  END;
 END LOOP;
 RAISE NOTICE 'OK: captura prospectiva de resultados canônicos e guard temporal específico';
END $$;
ROLLBACK;
