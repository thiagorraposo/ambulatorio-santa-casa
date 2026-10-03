-- Objetivo: recusar criacao de exame/pendencia copiado sem nova identidade.
-- A mesma regra da simulacao pre-staging vale na publicacao e na aplicacao.
-- Reversao: restringir novas publicacoes; preservar os planos/evidencias existentes.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

ALTER FUNCTION revisao_conferir_criacao(bigint) RENAME TO revisao_conferir_criacao_base;
REVOKE ALL ON FUNCTION revisao_conferir_criacao_base(bigint) FROM PUBLIC,
  ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;

CREATE FUNCTION revisao_conferir_criacao(decisao bigint) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE d ambulatorio.importacao_revisao_decisao; r ambulatorio.importacao_revisao;
  base_bruto jsonb; novo_bruto jsonb; alvo record;
BEGIN
  PERFORM ambulatorio.revisao_conferir_criacao_base(decisao);
  SELECT * INTO STRICT d FROM ambulatorio.importacao_revisao_decisao WHERE decisao_id=decisao;
  IF d.resultado<>'autorizar' THEN RETURN; END IF;
  SELECT * INTO STRICT r FROM ambulatorio.importacao_revisao WHERE revisao_id=d.revisao_id;
  SELECT dados_brutos INTO novo_bruto FROM ambulatorio.importacao_linha
    WHERE importacao_linha_id=d.linha_revisada_id AND importacao_lote_id=r.lote_revisado_id;
  IF d.linha_base_id IS NOT NULL THEN
    SELECT dados_brutos INTO base_bruto FROM ambulatorio.importacao_linha
      WHERE importacao_linha_id=d.linha_base_id AND importacao_lote_id=r.lote_base_id;
  END IF;
  IF novo_bruto IS NULL OR (d.linha_base_id IS NOT NULL AND base_bruto IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_linha_de_outro_lote'; END IF;
  FOR alvo IN SELECT DISTINCT cp.alvo_chave,c.tabela_destino
    FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE cp.decisao_id=decisao AND cp.operacao='criar'
      AND c.tabela_destino IN ('paciente_exame_complementar','pendencia_atendimento') LOOP
    IF NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo cp
      JOIN ambulatorio.auditoria_campo c USING(campo_id)
      JOIN ambulatorio.revisao_comparar_brutos_virtuais(base_bruto,novo_bruto) x
        ON x.chave=cp.chave_semantica AND x.bloco=cp.bloco_funcional
          AND x.ocorrencia=cp.ocorrencia
      WHERE cp.decisao_id=decisao AND cp.alvo_chave=alvo.alvo_chave
        AND c.tabela_destino=alvo.tabela_destino AND x.alterado) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_ocorrencia_sem_identidade';
    END IF;
  END LOOP;
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_conferir_criacao(bigint) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_conferir_criacao(bigint) FROM PUBLIC,
  ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
COMMIT;
