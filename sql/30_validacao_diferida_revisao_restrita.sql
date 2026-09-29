-- Objetivo: executar a integridade diferida sob dono tecnico restrito.
-- Impacto: permite commit das funcoes da migration 29 sem expor metadados ao
-- gestor; mesmas invariantes, executor clinico ainda fechado e sem backfill.
-- Reversao: bloquear EXECUTE das funcoes de gestao em migration futura,
-- preservando a validacao e evidencias. Nao conceder SELECT aos operadores.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

-- A validacao usa locks da fonte/revisao/autorizacao. UPDATE de coluna e
-- necessario para FOR UPDATE; nenhum operador herda estes privilegios.
GRANT SELECT ON importacao_revisao_autorizacao TO ambulatorio_auditoria_owner;
GRANT UPDATE(estado) ON importacao_revisao TO ambulatorio_auditoria_owner;
GRANT UPDATE(revogada_em) ON importacao_revisao_autorizacao TO ambulatorio_auditoria_owner;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION revisao_validar_integridade() OWNER TO ambulatorio_auditoria_owner;
ALTER FUNCTION revisao_validar_integridade() SECURITY DEFINER;
ALTER FUNCTION revisao_validar_integridade() SET search_path TO pg_catalog,ambulatorio,pg_temp;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION revisao_validar_integridade() FROM PUBLIC,ambulatorio_aplicacao,
  ambulatorio_importador,ambulatorio_revisao_gestor,ambulatorio_revisao_servico,ambulatorio_servico_autenticado;
COMMIT;
