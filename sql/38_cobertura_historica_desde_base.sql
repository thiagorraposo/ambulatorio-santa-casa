-- Objetivo: comprovar cobertura pela cadeia capturada e proveniencia da base.
-- Impacto: permite aprovar correcoes somente com prova desde a importacao;
-- marco legado/igualdade aparente continuam insuficientes. Executor fechado.
-- Reversao: revogar novas aprovacoes; preservar decisoes, artefatos e historico.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE FUNCTION revisao_cobertura_base(linha_base bigint,campo bigint,registro bigint,base jsonb) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE c ambulatorio.auditoria_campo; primeiro ambulatorio.auditoria_campo_evento;
  lote_base bigint; cadeia boolean; estado_esperado text;
BEGIN
  SELECT * INTO c FROM ambulatorio.auditoria_campo WHERE campo_id=campo;
  SELECT * INTO primeiro FROM ambulatorio.auditoria_campo_evento
    WHERE campo_id=campo AND registro_id=registro ORDER BY versao_campo LIMIT 1;
  IF primeiro.evento_id IS NULL THEN RETURN 'desconhecida'; END IF;
  IF c.captura_desde IS NULL OR primeiro.versao_campo<>1 OR primeiro.origem<>'importacao'
    OR primeiro.antes->>'estado'<>'alvo_ausente' OR linha_base IS NULL THEN RETURN 'posterior_base'; END IF;
  SELECT i.importacao_lote_id INTO lote_base FROM ambulatorio.importacao_linha i WHERE i.importacao_linha_id=linha_base;
  -- Apenas ancestrais reais do lote-base: igualdade de hash nao substitui cadeia.
  WITH RECURSIVE lotes AS (
    SELECT l.importacao_lote_id,l.lote_reprocessado_de_id,ARRAY[l.importacao_lote_id] caminho
      FROM ambulatorio.importacao_lote l WHERE l.importacao_lote_id=lote_base
    UNION ALL
    SELECT l.importacao_lote_id,l.lote_reprocessado_de_id,b.caminho||l.importacao_lote_id
      FROM ambulatorio.importacao_lote l JOIN lotes b ON l.importacao_lote_id=b.lote_reprocessado_de_id
      WHERE NOT l.importacao_lote_id=ANY(b.caminho)
  ) SELECT EXISTS(SELECT 1 FROM lotes l JOIN ambulatorio.importacao_linha i USING(importacao_lote_id)
    JOIN ambulatorio.importacao_registro p USING(importacao_linha_id)
    WHERE i.importacao_linha_id=primeiro.importacao_linha_id AND p.tabela_destino=c.tabela_destino
      AND p.registro_id=registro) INTO cadeia;
  estado_esperado:=CASE base->>'estado' WHEN 'valor' THEN 'valor' WHEN 'celula_vazia' THEN 'nulo' END;
  IF NOT cadeia OR estado_esperado IS NULL OR base->>'tipo_sql' IS DISTINCT FROM c.tipo_sql
    OR primeiro.depois->>'estado' IS DISTINCT FROM estado_esperado
    OR primeiro.depois->'valor' IS DISTINCT FROM base->'valor' THEN RETURN 'posterior_base'; END IF;
  RETURN 'desde_base';
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_cobertura_base(bigint,bigint,bigint,jsonb) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_cobertura_base(bigint,bigint,bigint,jsonb) FROM PUBLIC,
  ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT EXECUTE ON FUNCTION revisao_cobertura_base(bigint,bigint,bigint,jsonb) TO ambulatorio_auditoria_owner;

DO $$ DECLARE definicao text; trecho text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_publicar_decisao_interna(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)'::regprocedure);
  trecho:='IF evento IS NOT NULL THEN cobertura:=''posterior_base''; END IF;';
  IF strpos(definicao,trecho)=0 OR strpos(definicao,'IF item->>''operacao'' IN (''definir'',''anular'') THEN')=0 THEN
    RAISE EXCEPTION 'Publicacao temporal inesperada';
  END IF;
  definicao:=replace(definicao,trecho,'cobertura:=ambulatorio.revisao_cobertura_base(linha_base,c.campo_id,registro,item->''base'');');
  definicao:=replace(definicao,'IF item->>''operacao'' IN (''definir'',''anular'') THEN',
    'IF item->>''operacao'' IN (''definir'',''anular'') AND cobertura<>''desde_base'' THEN');
  EXECUTE definicao;
  definicao:=pg_get_functiondef('ambulatorio.revisao_validar_integridade()'::regprocedure);
  trecho:='IF v.cobertura_historica=''desde_base'' OR v.operacao IN (''definir'',''anular'') THEN';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Integridade temporal inesperada'; END IF;
  EXECUTE replace(definicao,trecho,
    'IF (v.cobertura_historica=''desde_base'' AND ambulatorio.revisao_cobertura_base(d.linha_base_id,v.campo_id,v.registro_id,v.base)<>''desde_base'')'
    ||' OR (v.operacao IN (''definir'',''anular'') AND v.cobertura_historica<>''desde_base'') THEN');
END $$;
COMMIT;
