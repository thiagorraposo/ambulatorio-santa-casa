-- Objetivo: permitir consultar sucesso anterior durante a avaliacao restrita.
-- Impacto: SELECT somente ao owner NOLOGIN; nao concede acesso a operadores.
-- Reversao: revogar a simulacao; preservar planos, tentativas e isolamento.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
GRANT SELECT ON importacao_revisao_aplicacao TO ambulatorio_revisao_owner;
COMMIT;
