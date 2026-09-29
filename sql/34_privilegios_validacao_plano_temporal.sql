-- Objetivo: permitir ao dono restrito executar o CHECK de envelopes do plano.
-- Impacto: EXECUTE apenas ao owner NOLOGIN; nenhum acesso de operadores ou PUBLIC.
-- Reversao: bloquear publicacao em migration futura, preservando metadados.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
GRANT EXECUTE ON FUNCTION revisao_envelope_valido(jsonb,boolean) TO ambulatorio_revisao_owner;
COMMIT;
