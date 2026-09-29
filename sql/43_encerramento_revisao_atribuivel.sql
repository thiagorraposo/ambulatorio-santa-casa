-- Objetivo: fechar/cancelar revisao somente com linhas contabilizadas e autoria.
-- Impacto: metadado imutavel de encerramento; rotinas privadas sem ativacao.
-- Reversao: bloquear novos encerramentos; preservar fonte, decisoes e evidencias.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE TABLE importacao_revisao_encerramento (
  revisao_id bigint PRIMARY KEY REFERENCES importacao_revisao ON DELETE RESTRICT,
  estado text NOT NULL CHECK(estado IN ('concluida','concluida_com_pendencias','cancelada')),
  encerrada_por_usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
  autorizacao_id bigint NOT NULL REFERENCES importacao_revisao_autorizacao ON DELETE RESTRICT,
  encerrada_em timestamptz NOT NULL
);
REVOKE ALL ON importacao_revisao_encerramento FROM PUBLIC,ambulatorio_importador,
  ambulatorio_aplicacao,ambulatorio_servico_autenticado,ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT SELECT,INSERT ON importacao_revisao_encerramento TO ambulatorio_revisao_owner;
GRANT SELECT ON importacao_revisao_encerramento TO ambulatorio_auditoria_owner;
CREATE TRIGGER proteger_encerramento BEFORE UPDATE OR DELETE ON importacao_revisao_encerramento
  FOR EACH ROW EXECUTE FUNCTION revisao_artefato_proteger();
CREATE TRIGGER proteger_encerramento_truncate BEFORE TRUNCATE ON importacao_revisao_encerramento
  FOR EACH STATEMENT EXECUTE FUNCTION revisao_artefato_proteger();

-- A mudanca terminal exige o registro atribuivel da mesma transacao privada.
DO $$ DECLARE definicao text; trecho text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_proteger_escrita()'::regprocedure);
  trecho:='    IF current_user=''ambulatorio_revisao_owner'' THEN';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Protecao de transicao inesperada'; END IF;
  definicao:=replace(definicao,trecho,trecho||$patch$
      IF TG_TABLE_NAME='importacao_revisao'
        AND to_jsonb(OLD)->>'estado'='em_aplicacao'
        AND to_jsonb(NEW)->>'estado' IN ('concluida','concluida_com_pendencias')
        AND (to_jsonb(NEW)-ARRAY['estado','encerrada_em'])=(to_jsonb(OLD)-ARRAY['estado','encerrada_em'])
        AND EXISTS(SELECT 1 FROM importacao_revisao_encerramento e
          WHERE e.revisao_id=(to_jsonb(OLD)->>'revisao_id')::bigint AND e.estado=to_jsonb(NEW)->>'estado'
            AND e.encerrada_em=(to_jsonb(NEW)->>'encerrada_em')::timestamptz) THEN RETURN NEW; END IF;
$patch$);
  EXECUTE definicao;
  definicao:=pg_get_functiondef('ambulatorio.revisao_validar_integridade()'::regprocedure);
  trecho:='r.estado IN (''preparada'',''cancelada'')';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Validacao de cancelamento inesperada'; END IF;
  -- Cancelar proposta obsoleta nao deve exigir que sua base ainda seja corrente.
  EXECUTE replace(definicao,trecho,'r.estado=''preparada''');
END $$;

CREATE FUNCTION revisao_terminar_interna(revisao bigint,autorizacao bigint,acao text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE fonte bigint; ator bigint; r ambulatorio.importacao_revisao; f ambulatorio.importacao_fonte;
  linha record; encerramento text; instante timestamptz; pendencias boolean:=false;
BEGIN
  IF acao NOT IN ('encerrar','cancelar') OR acao IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_acao_terminal_invalida'; END IF;
  SELECT fonte_id INTO fonte FROM ambulatorio.importacao_revisao WHERE revisao_id=revisao;
  IF fonte IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_ausente'; END IF;
  SELECT * INTO STRICT f FROM ambulatorio.importacao_fonte WHERE fonte_id=fonte FOR UPDATE;
  SELECT * INTO STRICT r FROM ambulatorio.importacao_revisao WHERE revisao_id=revisao FOR UPDATE;
  PERFORM autorizacao_id FROM ambulatorio.importacao_revisao_autorizacao WHERE autorizacao_id=autorizacao FOR UPDATE;
  ator:=ambulatorio.revisao_exigir_autorizacao(fonte,autorizacao);
  PERFORM usuario_id FROM ambulatorio.usuario_aplicacao WHERE usuario_id=ator FOR SHARE;
  IF r.estado IN ('concluida','concluida_com_pendencias','cancelada') THEN
    IF (r.estado='cancelada') IS DISTINCT FROM (acao='cancelar') THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_estado_terminal'; END IF;
    RETURN r.estado;
  END IF;
  IF acao='cancelar' THEN
    IF r.estado<>'preparada' OR EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_aplicacao ap
      JOIN ambulatorio.importacao_revisao_decisao d USING(decisao_id) WHERE d.revisao_id=revisao AND ap.resultado='aplicada') THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_com_efeito_nao_cancelavel'; END IF;
    encerramento:='cancelada';
  ELSE
    IF r.estado<>'em_aplicacao' OR f.revisao_corrente_id IS DISTINCT FROM revisao
      OR f.versao_controle<>r.versao_fonte_esperada+1 THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_sem_aplicacao_corrente'; END IF;
    PERFORM importacao_linha_id FROM ambulatorio.importacao_linha WHERE importacao_lote_id=r.lote_revisado_id
      ORDER BY importacao_linha_id FOR UPDATE;
    PERFORM d.decisao_id FROM ambulatorio.importacao_revisao_decisao d WHERE d.revisao_id=revisao
      ORDER BY d.decisao_id FOR UPDATE;
    FOR linha IN SELECT i.importacao_linha_id,d.decisao_id,d.resultado,ap.aplicacao_id
      FROM ambulatorio.importacao_linha i
      LEFT JOIN ambulatorio.importacao_revisao_decisao d ON d.linha_revisada_id=i.importacao_linha_id AND d.revisao_id=revisao
        AND NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_decisao n WHERE n.decisao_anterior_id=d.decisao_id)
      LEFT JOIN ambulatorio.importacao_revisao_aplicacao ap ON ap.decisao_id=d.decisao_id AND ap.resultado='aplicada'
      WHERE i.importacao_lote_id=r.lote_revisado_id ORDER BY i.importacao_linha_id LOOP
      IF linha.decisao_id IS NULL OR (linha.resultado='autorizar' AND linha.aplicacao_id IS NULL) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_linhas_nao_contabilizadas'; END IF;
      IF linha.resultado='autorizar' THEN
        PERFORM ambulatorio.revisao_conferir_sucesso(linha.aplicacao_id);
      ELSE
        pendencias:=true;
        IF EXISTS(SELECT 1 FROM ambulatorio.importacao_registro WHERE importacao_linha_id=linha.importacao_linha_id) THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_linha_bloqueada_com_efeito'; END IF;
      END IF;
    END LOOP;
    encerramento:=CASE WHEN pendencias THEN 'concluida_com_pendencias' ELSE 'concluida' END;
  END IF;
  instante:=clock_timestamp();
  INSERT INTO ambulatorio.importacao_revisao_encerramento(revisao_id,estado,encerrada_por_usuario_id,autorizacao_id,encerrada_em)
    VALUES(revisao,encerramento,ator,autorizacao,instante);
  IF acao='encerrar' THEN
    UPDATE ambulatorio.importacao_linha i SET status_linha='ignorada',mensagem_processamento='revisao_linha_bloqueada'
      WHERE i.importacao_lote_id=r.lote_revisado_id AND EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_decisao d
        WHERE d.revisao_id=revisao AND d.linha_revisada_id=i.importacao_linha_id AND d.resultado='bloquear'
          AND NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_decisao n WHERE n.decisao_anterior_id=d.decisao_id));
    UPDATE ambulatorio.importacao_lote SET status_lote=CASE WHEN pendencias THEN 'concluido_com_pendencias' ELSE 'concluido' END,
      finalizado_em=instante WHERE importacao_lote_id=r.lote_revisado_id;
  END IF;
  UPDATE ambulatorio.importacao_revisao SET estado=encerramento,encerrada_em=instante WHERE revisao_id=revisao;
  SET CONSTRAINTS ALL IMMEDIATE;
  RETURN encerramento;
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_terminar_interna(bigint,bigint,text) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_terminar_interna(bigint,bigint,text) FROM PUBLIC,ambulatorio_importador,
  ambulatorio_aplicacao,ambulatorio_servico_autenticado,ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
COMMIT;
