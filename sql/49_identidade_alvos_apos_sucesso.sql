-- Objetivo: preservar identidade da linha e dos alvos apos um sucesso anterior.
-- Impacto: versao sucessora nao troca paciente nem renomeia alvo para duplicar
-- uma ocorrencia; fontes repetidas exigem ocorrencias semanticas distintas.
-- Reversao: restringir novas aprovacoes, mantendo planos e evidencias.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE FUNCTION revisao_conferir_sucessao_com_efeito(decisao bigint) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE d ambulatorio.importacao_revisao_decisao; anterior record;
BEGIN
  SELECT * INTO STRICT d FROM ambulatorio.importacao_revisao_decisao WHERE decisao_id=decisao;
  IF EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo cp WHERE cp.decisao_id=decisao
    AND cp.operacao='criar' GROUP BY cp.campo_id,cp.chave_semantica,cp.bloco_funcional,cp.ocorrencia
    HAVING count(DISTINCT cp.alvo_chave)>1) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_origem_de_alvo_duplicada'; END IF;
  IF EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo cp WHERE cp.decisao_id=decisao
    AND cp.categoria='nova_visita' AND cp.operacao<>'criar') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_visita_nova_inconsistente'; END IF;
  FOR anterior IN WITH RECURSIVE cadeia AS (
    SELECT de.*,ARRAY[de.decisao_id] caminho FROM ambulatorio.importacao_revisao_decisao de
      WHERE de.decisao_id=d.decisao_anterior_id
    UNION ALL
    SELECT de.*,c.caminho||de.decisao_id FROM ambulatorio.importacao_revisao_decisao de
      JOIN cadeia c ON de.decisao_id=c.decisao_anterior_id WHERE NOT de.decisao_id=ANY(c.caminho)
  ) SELECT c.decisao_id,c.paciente_id,c.atendimento_base_id,ap.aplicacao_id,ap.atendimento_criado_id
    FROM cadeia c JOIN ambulatorio.importacao_revisao_aplicacao ap USING(decisao_id)
    WHERE ap.resultado='aplicada' LOOP
    IF anterior.paciente_id IS DISTINCT FROM d.paciente_id
      OR (d.atendimento_base_id IS NOT NULL
        AND d.atendimento_base_id IS DISTINCT FROM COALESCE(anterior.atendimento_criado_id,anterior.atendimento_base_id)) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_mapeamento_com_efeito_incompativel'; END IF;
    IF EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo cp
      JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE cp.decisao_id=decisao AND cp.operacao='criar'
      AND c.tabela_destino='atendimento' AND NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_alvo a
        WHERE a.aplicacao_id=anterior.aplicacao_id AND a.tabela_destino='atendimento' AND a.alvo_chave=cp.alvo_chave
          AND a.registro_id=anterior.atendimento_criado_id)) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_visita_ja_resolvida'; END IF;
    IF EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo cp
      JOIN ambulatorio.importacao_revisao_campo previa ON previa.decisao_id=anterior.decisao_id
        AND previa.campo_id=cp.campo_id AND previa.chave_semantica=cp.chave_semantica
        AND previa.bloco_funcional=cp.bloco_funcional AND previa.ocorrencia=cp.ocorrencia
      WHERE cp.decisao_id=decisao AND cp.operacao='criar' AND previa.operacao='criar'
        AND cp.alvo_chave<>previa.alvo_chave) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_alvo_criado_renomeado'; END IF;
  END LOOP;
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_conferir_sucessao_com_efeito(bigint) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_conferir_sucessao_com_efeito(bigint)
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
    ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
DO $$ DECLARE definicao text; trecho text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_conferir_criacao(bigint)'::regprocedure);
  trecho:='  IF d.resultado<>''autorizar'' THEN RETURN; END IF;';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Conferencia de sucessao inesperada'; END IF;
  EXECUTE replace(definicao,trecho,trecho||chr(10)||'  PERFORM ambulatorio.revisao_conferir_sucessao_com_efeito(decisao);');
END $$;
COMMIT;
