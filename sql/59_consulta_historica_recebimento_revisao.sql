-- Objetivo: reconhecer reenvios idênticos de XLSX antes de simular uma base já avançada.
-- Impacto: leitura histórica autorizada; não prepara revisão nem grava dados.
-- Reversão: revogar e remover a função em migration posterior.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

GRANT SELECT ON importacao_revisao_recebimento, importacao_revisao, importacao_linha,
  revisao_artefato TO ambulatorio_revisao_owner;

CREATE FUNCTION revisao_consultar_recebimento_historico(fonte bigint,lote_base bigint,autorizacao bigint,
  hash_arquivo text,hash_manifesto text,hash_transformacoes text,versao_parser text,
  versao_git text,linhas jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; manifesto ambulatorio.revisao_artefato; recebido ambulatorio.importacao_revisao_recebimento;
  lote bigint; bruto_hash text; resultado jsonb;
BEGIN
  -- A identidade deriva do ledger; validar novamente sob locks evita retorno após revogação.
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
  SELECT jsonb_agg(l ORDER BY (l->>'abaOrdem')::integer,(l->>'numeroLinha')::bigint)
    INTO linhas FROM jsonb_array_elements(linhas) l;
  bruto_hash:=encode(sha256(convert_to(linhas::text,'UTF8')),'hex');
  SELECT * INTO recebido FROM ambulatorio.importacao_revisao_recebimento x
    WHERE x.fonte_id=fonte AND x.lote_base_id=lote_base
      AND x.hash_arquivo_sha256=hash_arquivo AND x.manifesto_sha256=hash_manifesto
      AND x.transformacoes_sha256=hash_transformacoes;
  IF recebido.revisao_id IS NULL THEN RETURN NULL; END IF;
  IF recebido.bruto_sha256<>bruto_hash THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_recebimento_divergente';
  END IF;
  SELECT lote_revisado_id INTO lote FROM ambulatorio.importacao_revisao WHERE revisao_id=recebido.revisao_id;
  SELECT jsonb_build_object('revisaoId',recebido.revisao_id::text,'loteRevisadoId',lote::text,
    'reutilizada',true,'linhas',(SELECT jsonb_agg(jsonb_build_object(
      'linhaId',i.importacao_linha_id::text,'abaOrdem',i.aba_ordem,'numeroLinha',i.numero_linha)
      ORDER BY i.aba_ordem,i.numero_linha) FROM ambulatorio.importacao_linha i
      WHERE i.importacao_lote_id=lote)) INTO resultado;
  RETURN resultado;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_recebimento_invalido';
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_consultar_recebimento_historico(bigint,bigint,bigint,text,text,text,text,text,jsonb)
  OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_consultar_recebimento_historico(bigint,bigint,bigint,text,text,text,text,text,jsonb)
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
    ambulatorio_revisao_gestor;
GRANT EXECUTE ON FUNCTION revisao_consultar_recebimento_historico(bigint,bigint,bigint,text,text,text,text,text,jsonb)
  TO ambulatorio_revisao_servico;
COMMIT;
