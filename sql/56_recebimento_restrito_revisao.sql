-- Objetivo: receber arquivo revisado conferido e preparar revisão atomicamente.
-- Impacto: reutiliza lote/linha; artefatos continuam cadastrados pelo mantenedor.
-- Não concede execução clínica nem permissões diretas aos papéis operacionais.
-- Reversão: revogar a rotina em migration posterior; preservar bruto e evidências.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE TABLE importacao_revisao_recebimento (
  revisao_id bigint PRIMARY KEY REFERENCES importacao_revisao ON DELETE RESTRICT,
  fonte_id bigint NOT NULL REFERENCES importacao_fonte ON DELETE RESTRICT,
  lote_base_id bigint NOT NULL REFERENCES importacao_lote ON DELETE RESTRICT,
  hash_arquivo_sha256 text NOT NULL CHECK(hash_arquivo_sha256 ~ '^[0-9a-f]{64}$'),
  manifesto_sha256 text NOT NULL REFERENCES revisao_artefato ON DELETE RESTRICT,
  transformacoes_sha256 text NOT NULL REFERENCES revisao_artefato ON DELETE RESTRICT,
  bruto_sha256 text NOT NULL CHECK(bruto_sha256 ~ '^[0-9a-f]{64}$'),
  recebido_por_usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
  autorizacao_id bigint NOT NULL REFERENCES importacao_revisao_autorizacao ON DELETE RESTRICT,
  recebido_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(fonte_id,lote_base_id,hash_arquivo_sha256,manifesto_sha256,transformacoes_sha256)
);
COMMENT ON TABLE importacao_revisao_recebimento IS
  'Recebimento idempotente de XLSX revisado: bruto e preparação atômicos, sem efeitos clínicos.';
CREATE TRIGGER proteger_recebimento BEFORE UPDATE OR DELETE ON importacao_revisao_recebimento
  FOR EACH ROW EXECUTE FUNCTION revisao_artefato_proteger();
CREATE TRIGGER proteger_recebimento_truncate BEFORE TRUNCATE ON importacao_revisao_recebimento
  FOR EACH STATEMENT EXECUTE FUNCTION revisao_artefato_proteger();
REVOKE ALL ON importacao_revisao_recebimento FROM PUBLIC,ambulatorio_importador,
  ambulatorio_aplicacao,ambulatorio_servico_autenticado,ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT SELECT,INSERT ON importacao_revisao_recebimento TO ambulatorio_revisao_owner;
GRANT INSERT ON importacao_lote,importacao_linha TO ambulatorio_revisao_owner;
GRANT USAGE ON SEQUENCE importacao_lote_importacao_lote_id_seq,
  importacao_linha_importacao_linha_id_seq TO ambulatorio_revisao_owner;

CREATE FUNCTION revisao_receber_arquivo(fonte bigint,lote_base bigint,autorizacao bigint,
  hash_arquivo text,hash_manifesto text,hash_transformacoes text,versao_parser text,
  versao_git text,linhas jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; manifesto ambulatorio.revisao_artefato; recebido ambulatorio.importacao_revisao_recebimento;
  lote bigint; revisao bigint; bruto_hash text; codigo text; reutilizada boolean:=false;
BEGIN
  -- A identidade é obtida do ledger transacional; não recebe ator do cliente.
  ator:=ambulatorio.revisao_exigir_autorizacao(fonte,autorizacao);
  PERFORM fonte_id FROM ambulatorio.importacao_fonte WHERE fonte_id=fonte FOR UPDATE;
  PERFORM autorizacao_id FROM ambulatorio.importacao_revisao_autorizacao
    WHERE autorizacao_id=autorizacao FOR UPDATE;
  PERFORM ambulatorio.revisao_exigir_autorizacao(fonte,autorizacao);
  PERFORM usuario_id FROM ambulatorio.usuario_aplicacao WHERE usuario_id=ator FOR SHARE;
  IF hash_arquivo IS NULL OR hash_arquivo!~'^[0-9a-f]{64}$'
    OR versao_parser IS NULL OR versao_parser!~'^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$'
    OR versao_git IS NULL OR versao_git!~'^[0-9a-f]{7,40}$'
    OR jsonb_typeof(linhas) IS DISTINCT FROM 'array'
    OR octet_length(linhas::text)>33554432 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_recebimento_invalido';
  END IF;
  IF jsonb_array_length(linhas) NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_recebimento_invalido';
  END IF;
  SELECT * INTO manifesto FROM ambulatorio.revisao_artefato
    WHERE sha256=hash_manifesto AND tipo='manifesto';
  IF manifesto.sha256 IS NULL OR NOT EXISTS(SELECT 1 FROM ambulatorio.revisao_artefato
      WHERE sha256=hash_transformacoes AND tipo='transformacoes') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_artefato_nao_cadastrado';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(linhas) l
      WHERE jsonb_typeof(l) IS DISTINCT FROM 'object'
        OR NOT l ?& ARRAY['abaNomeOriginal','abaOrdem','numeroLinha','dadosBrutos']
        OR (l-ARRAY['abaNomeOriginal','abaOrdem','numeroLinha','dadosBrutos'])<>'{}'::jsonb
        OR COALESCE(btrim(l->>'abaNomeOriginal'),'')=''
        OR COALESCE((l->>'abaOrdem')::integer,0)<1
        OR COALESCE((l->>'numeroLinha')::bigint,0)<2
        OR jsonb_typeof(l->'dadosBrutos') IS DISTINCT FROM 'array')
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(linhas) l
      GROUP BY l->>'abaNomeOriginal',l->>'numeroLinha' HAVING count(*)>1)
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(linhas) l
      GROUP BY l->>'abaOrdem',l->>'numeroLinha' HAVING count(*)>1) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_linhas_recebidas_invalidas';
  END IF;
  -- Ordem física determinística: repetir uma lista reordenada não muda o bruto.
  SELECT jsonb_agg(l ORDER BY (l->>'abaOrdem')::integer,(l->>'numeroLinha')::bigint)
    INTO linhas FROM jsonb_array_elements(linhas) l;
  bruto_hash:=encode(sha256(convert_to(linhas::text,'UTF8')),'hex');
  SELECT * INTO recebido FROM ambulatorio.importacao_revisao_recebimento x
    WHERE x.fonte_id=fonte AND x.lote_base_id=lote_base
      AND x.hash_arquivo_sha256=hash_arquivo AND x.manifesto_sha256=hash_manifesto
      AND x.transformacoes_sha256=hash_transformacoes;
  IF recebido.revisao_id IS NOT NULL THEN
    IF recebido.bruto_sha256<>bruto_hash THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_recebimento_divergente';
    END IF;
    revisao:=recebido.revisao_id;
    SELECT lote_revisado_id INTO lote FROM ambulatorio.importacao_revisao WHERE revisao_id=revisao;
    reutilizada:=true;
  ELSE
    codigo:='revisao-'||fonte||'-'||encode(sha256(convert_to(
      lote_base::text||hash_arquivo||hash_manifesto||hash_transformacoes,'UTF8')),'hex');
    INSERT INTO ambulatorio.importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,
      status_lote,manifesto_sha256,importador_versao,revisao_git)
      VALUES(codigo,hash_arquivo,manifesto.conteudo::jsonb->>'layout_versao','pronto',
        hash_manifesto,versao_parser,versao_git) RETURNING importacao_lote_id INTO lote;
    INSERT INTO ambulatorio.importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,
      numero_linha,dados_brutos,status_linha)
      SELECT lote,l->>'abaNomeOriginal',(l->>'abaOrdem')::integer,(l->>'numeroLinha')::integer,
        l->'dadosBrutos','pendente' FROM jsonb_array_elements(linhas) l;
    -- Confere cada célula e a base sob os locks do protocolo existente.
    revisao:=ambulatorio.revisao_preparar(fonte,lote_base,lote,hash_transformacoes,autorizacao);
    INSERT INTO ambulatorio.importacao_revisao_recebimento(revisao_id,fonte_id,lote_base_id,
      hash_arquivo_sha256,manifesto_sha256,transformacoes_sha256,bruto_sha256,
      recebido_por_usuario_id,autorizacao_id)
      VALUES(revisao,fonte,lote_base,hash_arquivo,hash_manifesto,hash_transformacoes,
        bruto_hash,ator,autorizacao);
  END IF;
  RETURN jsonb_build_object('revisaoId',revisao::text,'loteRevisadoId',lote::text,
    'reutilizada',reutilizada,'linhas',(SELECT jsonb_agg(jsonb_build_object(
      'linhaId',i.importacao_linha_id::text,'abaOrdem',i.aba_ordem,'numeroLinha',i.numero_linha)
      ORDER BY i.aba_ordem,i.numero_linha) FROM ambulatorio.importacao_linha i
      WHERE i.importacao_lote_id=lote));
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_recebimento_invalido';
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_receber_arquivo(bigint,bigint,bigint,text,text,text,text,text,jsonb)
  OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_receber_arquivo(bigint,bigint,bigint,text,text,text,text,text,jsonb)
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,ambulatorio_revisao_gestor;
GRANT EXECUTE ON FUNCTION revisao_receber_arquivo(bigint,bigint,bigint,text,text,text,text,text,jsonb)
  TO ambulatorio_revisao_servico;
COMMIT;
