-- Objetivo: continuar a prova da base por aplicacoes confirmadas, sem inferencia.
-- Impacto: base de revisao encerrada pode sustentar novo plano do mesmo alvo;
-- igualdade isolada, marco legado e linha sem campo aprovado nao bastam.
-- Reversao: restringir novas aprovacoes; preservar cadeia e sucessos anteriores.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

ALTER FUNCTION revisao_cobertura_base(bigint,bigint,bigint,jsonb) RENAME TO revisao_cobertura_importacao;

CREATE FUNCTION revisao_cobertura_cadeia(linha_base bigint,campo bigint,registro bigint,base jsonb,caminho bigint[]) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE cobertura text; c ambulatorio.auditoria_campo; anterior record; inicio ambulatorio.auditoria_campo_evento;
  esperado jsonb;
BEGIN
  cobertura:=ambulatorio.revisao_cobertura_importacao(linha_base,campo,registro,base);
  IF cobertura='desde_base' OR linha_base IS NULL THEN RETURN cobertura; END IF;
  IF linha_base=ANY(caminho) THEN RETURN 'posterior_base'; END IF;
  SELECT * INTO STRICT c FROM ambulatorio.auditoria_campo WHERE campo_id=campo;
  IF c.captura_desde IS NULL THEN RETURN cobertura; END IF;
  -- Reprocessamento so usa ancestrais reais do mesmo conteudo e a mesma linha.
  WITH RECURSIVE lotes AS (
    SELECT l.importacao_lote_id,l.lote_reprocessado_de_id,ARRAY[l.importacao_lote_id] visitados
      FROM ambulatorio.importacao_lote l JOIN ambulatorio.importacao_linha i USING(importacao_lote_id)
      WHERE i.importacao_linha_id=linha_base
    UNION ALL
    SELECT l.importacao_lote_id,l.lote_reprocessado_de_id,b.visitados||l.importacao_lote_id
      FROM ambulatorio.importacao_lote l JOIN lotes b ON l.importacao_lote_id=b.lote_reprocessado_de_id
      WHERE NOT l.importacao_lote_id=ANY(b.visitados)
  ) SELECT cp.*,d.linha_base_id AS predecessora,d.paciente_id,ap.aplicacao_id,a.revisao_alvo_id,a.registro_id AS efetivo
    INTO anterior FROM lotes l JOIN ambulatorio.importacao_linha i USING(importacao_lote_id)
    JOIN ambulatorio.importacao_revisao_decisao d ON d.linha_revisada_id=i.importacao_linha_id
    JOIN ambulatorio.importacao_revisao r ON r.revisao_id=d.revisao_id AND r.lote_revisado_id=l.importacao_lote_id
    JOIN ambulatorio.importacao_revisao_aplicacao ap ON ap.decisao_id=d.decisao_id AND ap.resultado='aplicada'
    JOIN ambulatorio.importacao_revisao_alvo a ON a.aplicacao_id=ap.aplicacao_id
    JOIN ambulatorio.importacao_revisao_campo cp ON cp.decisao_id=d.decisao_id AND cp.alvo_chave=a.alvo_chave
    WHERE cp.campo_id=campo AND a.tabela_destino=c.tabela_destino AND a.registro_id=registro
      AND r.estado IN ('concluida','concluida_com_pendencias')
      AND i.aba_ordem=(SELECT b.aba_ordem FROM ambulatorio.importacao_linha b WHERE b.importacao_linha_id=linha_base)
      AND i.numero_linha=(SELECT b.numero_linha FROM ambulatorio.importacao_linha b WHERE b.importacao_linha_id=linha_base)
    ORDER BY d.versao_decisao DESC LIMIT 1;
  IF NOT FOUND THEN RETURN cobertura; END IF;
  IF ambulatorio.revisao_alvo_paciente(c.tabela_destino,registro) IS DISTINCT FROM anterior.paciente_id THEN
    RETURN 'posterior_base'; END IF;
  esperado:=anterior.proposto;
  -- Nulo explicito pertence a aprovacao; na nova fonte a celula continua vazia/ausente.
  IF anterior.operacao='anular' AND base->>'estado' IN ('celula_vazia','coluna_ausente') THEN
    esperado:=esperado||jsonb_build_object('estado',base->>'estado');
  END IF;
  IF esperado IS DISTINCT FROM base THEN RETURN 'posterior_base'; END IF;
  PERFORM ambulatorio.revisao_conferir_sucesso(anterior.aplicacao_id);
  IF anterior.operacao='criar' THEN
    SELECT * INTO inicio FROM ambulatorio.auditoria_campo_evento
      WHERE campo_id=campo AND registro_id=registro ORDER BY versao_campo LIMIT 1;
    IF inicio.versao_campo=1 AND inicio.origem='revisao' AND inicio.antes->>'estado'='alvo_ausente'
      AND inicio.revisao_alvo_id=anterior.revisao_alvo_id AND inicio.revisao_campo_id=anterior.revisao_campo_id
      AND inicio.depois=ambulatorio.auditoria_envelope(base->'valor',c.tipo_sql) THEN RETURN 'desde_base'; END IF;
    RETURN 'posterior_base';
  END IF;
  -- Conservacao/associacao tambem precisam de prova anterior: nao homologar legado.
  RETURN ambulatorio.revisao_cobertura_cadeia(anterior.predecessora,campo,registro,anterior.base,caminho||linha_base);
END $$;

CREATE FUNCTION revisao_cobertura_base(linha_base bigint,campo bigint,registro bigint,base jsonb) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
  SELECT ambulatorio.revisao_cobertura_cadeia(linha_base,campo,registro,base,ARRAY[]::bigint[])
$$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_cobertura_cadeia(bigint,bigint,bigint,jsonb,bigint[]) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_cobertura_base(bigint,bigint,bigint,jsonb) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_cobertura_cadeia(bigint,bigint,bigint,jsonb,bigint[]),
  revisao_cobertura_base(bigint,bigint,bigint,jsonb),revisao_cobertura_importacao(bigint,bigint,bigint,jsonb)
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
    ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT EXECUTE ON FUNCTION revisao_cobertura_base(bigint,bigint,bigint,jsonb) TO ambulatorio_auditoria_owner;

-- O instante registrado e o instante do cabecalho precisam coincidir no cancelamento.
DO $$ DECLARE definicao text; trecho text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_proteger_escrita()'::regprocedure);
  trecho:='      NEW.encerrada_em:=clock_timestamp(); RETURN NEW;';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Cancelamento atribuivel inesperado'; END IF;
  EXECUTE replace(definicao,trecho,$patch$
      IF current_user='ambulatorio_revisao_owner' AND EXISTS(SELECT 1 FROM importacao_revisao_encerramento e
        WHERE e.revisao_id=(to_jsonb(OLD)->>'revisao_id')::bigint AND e.estado='cancelada'
          AND e.encerrada_em=(to_jsonb(NEW)->>'encerrada_em')::timestamptz) THEN RETURN NEW; END IF;
      NEW.encerrada_em:=clock_timestamp(); RETURN NEW;$patch$);
END $$;
COMMIT;
