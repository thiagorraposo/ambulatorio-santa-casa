-- Ativa somente as tres entradas operacionais controladas da revisao.
-- Escopo: role dedicada ambulatorio_revisao_servico; rotinas internas permanecem privadas.
-- Reversao: REVOKE EXECUTE nos tres wrappers; manter revisoes e evidencias existentes.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

GRANT EXECUTE ON FUNCTION revisao_aplicar_aprovada(bigint,bigint),
  revisao_finalizar_aprovada(bigint,bigint,text),
  revisao_diagnosticar_falha(bigint,bigint,text)
  TO ambulatorio_revisao_servico;

REVOKE ALL ON FUNCTION revisao_aplicar_aprovada(bigint,bigint),
  revisao_finalizar_aprovada(bigint,bigint,text),
  revisao_diagnosticar_falha(bigint,bigint,text)
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,
    ambulatorio_servico_autenticado,ambulatorio_revisao_gestor;

COMMIT;
