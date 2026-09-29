-- Objetivo: preparar revisoes com artefatos recuperaveis e bruto conferido.
-- Impacto: somente metadados restritos; sem executor, captura habilitada ou membros.
-- Artefatos sao cadastrados pelo mantenedor, nunca pelo revisor/importador.
-- Reversao: revogar EXECUTE em nova migration; preservar artefatos e preparacoes.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE TABLE revisao_artefato (
  sha256 text PRIMARY KEY CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  tipo text NOT NULL CHECK (tipo IN ('manifesto','transformacoes')),
  versao text NOT NULL CHECK (btrim(versao)<>''),
  conteudo text NOT NULL CHECK (octet_length(conteudo) BETWEEN 1 AND 10485760),
  cadastrado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (sha256=encode(sha256(convert_to(conteudo,'UTF8')),'hex'))
);
CREATE UNIQUE INDEX uq_revisao_transformacoes_versao ON revisao_artefato(versao)
  WHERE tipo='transformacoes';
COMMENT ON TABLE revisao_artefato IS
 'Bytes UTF-8 imutaveis, recuperaveis por hash; cadastro tecnico nao aprova revisao clinica.';
CREATE TABLE importacao_revisao_preparacao (
  revisao_id bigint PRIMARY KEY REFERENCES importacao_revisao ON DELETE RESTRICT,
  manifesto_base_sha256 text NOT NULL REFERENCES revisao_artefato ON DELETE RESTRICT,
  manifesto_revisado_sha256 text NOT NULL REFERENCES revisao_artefato ON DELETE RESTRICT,
  transformacoes_sha256 text NOT NULL REFERENCES revisao_artefato ON DELETE RESTRICT,
  preparada_por_usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
  autorizacao_id bigint NOT NULL REFERENCES importacao_revisao_autorizacao ON DELETE RESTRICT,
  preparada_em timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON revisao_artefato,importacao_revisao_preparacao FROM PUBLIC,
  ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT SELECT ON revisao_artefato,importacao_revisao_preparacao TO ambulatorio_revisao_owner;
GRANT INSERT ON importacao_revisao,importacao_revisao_preparacao TO ambulatorio_revisao_owner;
GRANT USAGE ON SEQUENCE importacao_revisao_revisao_id_seq TO ambulatorio_revisao_owner;

CREATE FUNCTION revisao_artefato_proteger() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_artefato_imutavel';
END $$;
CREATE TRIGGER revisao_artefato_imutavel BEFORE UPDATE OR DELETE ON revisao_artefato
  FOR EACH ROW EXECUTE FUNCTION revisao_artefato_proteger();
CREATE TRIGGER revisao_artefato_nao_truncar BEFORE TRUNCATE ON revisao_artefato
  FOR EACH STATEMENT EXECUTE FUNCTION revisao_artefato_proteger();
CREATE TRIGGER revisao_preparacao_imutavel BEFORE UPDATE OR DELETE ON importacao_revisao_preparacao
  FOR EACH ROW EXECUTE FUNCTION revisao_artefato_proteger();
CREATE TRIGGER revisao_preparacao_nao_truncar BEFORE TRUNCATE ON importacao_revisao_preparacao
  FOR EACH STATEMENT EXECUTE FUNCTION revisao_artefato_proteger();

-- Somente retorna uma autorizacao do ator autenticado para esta fonte.
CREATE FUNCTION revisao_exigir_autorizacao(fonte bigint,autorizacao bigint) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint;
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_servico','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_servico_nao_autorizado';
  END IF;
  ator:=ambulatorio.revisao_ator_autenticado();
  IF NOT EXISTS (SELECT 1 FROM ambulatorio.importacao_revisao_autorizacao a
      WHERE a.autorizacao_id=autorizacao AND a.fonte_id=fonte AND a.usuario_id=ator
        AND a.revogada_em IS NULL AND (a.valida_ate IS NULL OR a.valida_ate>clock_timestamp())) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_autorizacao_invalida';
  END IF;
  RETURN ator;
END $$;

-- Confere cada celula fisica, inclusive as que nao terao destino clinico.
-- Nao presume versao atual quando o lote antigo nao possui metadados.
CREATE FUNCTION revisao_conferir_manifesto(lote bigint,hash_manifesto text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE manifesto jsonb; versao text; layout text; aba jsonb; colunas jsonb; linha record;
BEGIN
  SELECT a.conteudo::jsonb,a.versao INTO manifesto,versao FROM ambulatorio.revisao_artefato a
    WHERE a.sha256=hash_manifesto AND a.tipo='manifesto';
  SELECT l.layout_versao INTO layout FROM ambulatorio.importacao_lote l
    WHERE l.importacao_lote_id=lote AND l.manifesto_sha256=hash_manifesto;
  IF manifesto IS NULL OR layout IS NULL OR manifesto->>'versao' IS DISTINCT FROM versao
    OR manifesto->>'layout_versao' IS DISTINCT FROM layout
    OR jsonb_typeof(manifesto->'sheets') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_manifesto_incompativel';
  END IF;
  IF jsonb_array_length(manifesto->'sheets')=0 OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(manifesto->'sheets') s
    GROUP BY s->>'aba_nome_original' HAVING count(*)<>1
  ) OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(manifesto->'sheets') s
    GROUP BY s->>'aba_ordem' HAVING count(*)<>1
  ) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_manifesto_ambiguo'; END IF;
  FOR aba IN SELECT value FROM jsonb_array_elements(manifesto->'sheets') LOOP
    colunas:=aba->'columns';
    IF jsonb_typeof(colunas) IS DISTINCT FROM 'array' OR jsonb_array_length(colunas)=0
      OR COALESCE(btrim(aba->>'aba_nome_original'),'')='' OR COALESCE((aba->>'aba_ordem')::integer,0)<1 THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_manifesto_invalido';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(colunas) c
      WHERE jsonb_typeof(c) IS DISTINCT FROM 'object' OR NOT c ?& ARRAY[
        'posicao_fisica','cabecalho_original','chave_semantica','ocorrencia','bloco_funcional']
        OR COALESCE(c->>'posicao_fisica','')!~'^[A-Z]+$'
        OR COALESCE(btrim(c->>'chave_semantica'),'')=''
        OR COALESCE(btrim(c->>'bloco_funcional'),'')=''
        OR (c->>'ocorrencia' IS NOT NULL AND (c->>'ocorrencia')::bigint<1))
      OR EXISTS (SELECT 1 FROM jsonb_array_elements(colunas) c GROUP BY c->>'posicao_fisica' HAVING count(*)<>1)
      OR EXISTS (SELECT 1 FROM jsonb_array_elements(colunas) c
        GROUP BY c->>'chave_semantica',c->>'bloco_funcional',COALESCE((c->>'ocorrencia')::bigint,1) HAVING count(*)<>1) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_manifesto_ambiguo';
    END IF;
    FOR linha IN SELECT i.* FROM ambulatorio.importacao_linha i
      WHERE i.importacao_lote_id=lote AND i.aba_nome_original=aba->>'aba_nome_original' LOOP
      IF linha.aba_ordem<>(aba->>'aba_ordem')::integer OR jsonb_typeof(linha.dados_brutos) IS DISTINCT FROM 'array'
        OR jsonb_array_length(linha.dados_brutos)<>jsonb_array_length(colunas) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_bruto_incompativel';
      END IF;
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(linha.dados_brutos) WITH ORDINALITY AS x(c,n)
        JOIN jsonb_array_elements(colunas) WITH ORDINALITY AS y(c,n) USING(n)
        WHERE jsonb_typeof(x.c) IS DISTINCT FROM 'object'
          OR NOT x.c ?& ARRAY['posicao','cabecalho','chave','ocorrencia','bloco','valor']
          OR (x.c-ARRAY['posicao','cabecalho','chave','ocorrencia','bloco','valor'])<>'{}'::jsonb
          OR x.c->'posicao' IS DISTINCT FROM y.c->'posicao_fisica'
          OR x.c->'cabecalho' IS DISTINCT FROM y.c->'cabecalho_original'
          OR x.c->'chave' IS DISTINCT FROM y.c->'chave_semantica'
          OR x.c->'ocorrencia' IS DISTINCT FROM y.c->'ocorrencia'
          OR x.c->'bloco' IS DISTINCT FROM y.c->'bloco_funcional'
          OR jsonb_typeof(x.c->'valor') NOT IN ('string','number','boolean','null')
      ) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_bruto_incompativel'; END IF;
    END LOOP;
  END LOOP;
  IF EXISTS (SELECT 1 FROM ambulatorio.importacao_linha i WHERE i.importacao_lote_id=lote
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(manifesto->'sheets') s
      WHERE s->>'aba_nome_original'=i.aba_nome_original)) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_aba_fora_manifesto';
  END IF;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_manifesto_invalido';
END $$;

CREATE FUNCTION revisao_preparar(fonte bigint,lote_base bigint,lote_revisado bigint,
  hash_transformacoes text,autorizacao bigint) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE f ambulatorio.importacao_fonte; b ambulatorio.importacao_lote; n ambulatorio.importacao_lote;
  ator bigint; versao_transformacoes text; id bigint;
BEGIN
  ator:=ambulatorio.revisao_exigir_autorizacao(fonte,autorizacao);
  SELECT * INTO STRICT f FROM ambulatorio.importacao_fonte WHERE fonte_id=fonte FOR UPDATE;
  PERFORM a.autorizacao_id FROM ambulatorio.importacao_revisao_autorizacao a
    WHERE a.autorizacao_id=autorizacao FOR UPDATE;
  PERFORM ambulatorio.revisao_exigir_autorizacao(fonte,autorizacao);
  -- Ordenacao unica; locks dos pais impedem novos filhos durante a conferencia.
  PERFORM l.importacao_lote_id FROM ambulatorio.importacao_lote l
    WHERE l.importacao_lote_id IN (lote_base,lote_revisado) ORDER BY l.importacao_lote_id FOR UPDATE;
  PERFORM i.importacao_linha_id FROM ambulatorio.importacao_linha i
    WHERE i.importacao_lote_id IN (lote_base,lote_revisado) ORDER BY i.importacao_linha_id FOR UPDATE;
  SELECT * INTO b FROM ambulatorio.importacao_lote WHERE importacao_lote_id=lote_base;
  SELECT * INTO n FROM ambulatorio.importacao_lote WHERE importacao_lote_id=lote_revisado;
  SELECT a.versao INTO versao_transformacoes FROM ambulatorio.revisao_artefato a
    WHERE a.sha256=hash_transformacoes AND a.tipo='transformacoes';
  IF b.importacao_lote_id IS NULL OR n.importacao_lote_id IS NULL OR versao_transformacoes IS NULL
    OR b.manifesto_sha256 IS NULL OR n.manifesto_sha256 IS NULL
    OR n.importador_versao IS NULL OR n.revisao_git IS NULL
    OR b.status_lote NOT IN ('concluido','concluido_com_pendencias')
    OR n.status_lote<>'pronto' OR n.lote_reprocessado_de_id IS NOT NULL
    OR NOT EXISTS (SELECT 1 FROM ambulatorio.importacao_linha WHERE importacao_lote_id=lote_revisado)
    OR EXISTS (SELECT 1 FROM ambulatorio.importacao_linha WHERE importacao_lote_id=lote_revisado AND status_linha<>'recebida')
    OR EXISTS (SELECT 1 FROM ambulatorio.importacao_registro p JOIN ambulatorio.importacao_linha i USING(importacao_linha_id)
      WHERE i.importacao_lote_id=lote_revisado) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_preparacao_invalida';
  END IF;
  PERFORM ambulatorio.revisao_conferir_manifesto(lote_base,b.manifesto_sha256);
  PERFORM ambulatorio.revisao_conferir_manifesto(lote_revisado,n.manifesto_sha256);
  INSERT INTO ambulatorio.importacao_revisao(fonte_id,lote_base_id,hash_base,layout_base,lote_revisado_id,
    hash_revisado,layout_revisado,revisao_base_id,versao_fonte_esperada,contrato_versao,
    manifesto_base_sha256,manifesto_revisado_sha256,transformacoes_versao,importador_versao,revisao_git)
    VALUES(fonte,lote_base,b.hash_arquivo_sha256,b.layout_versao,lote_revisado,n.hash_arquivo_sha256,n.layout_versao,
      f.revisao_corrente_id,f.versao_controle,'ADR-022',b.manifesto_sha256,n.manifesto_sha256,
      versao_transformacoes,n.importador_versao,n.revisao_git) RETURNING revisao_id INTO id;
  INSERT INTO ambulatorio.importacao_revisao_preparacao(revisao_id,manifesto_base_sha256,
    manifesto_revisado_sha256,transformacoes_sha256,preparada_por_usuario_id,autorizacao_id)
    VALUES(id,b.manifesto_sha256,n.manifesto_sha256,hash_transformacoes,ator,autorizacao);
  SET CONSTRAINTS ambulatorio.validar_revisao IMMEDIATE;
  RETURN id;
END $$;

CREATE FUNCTION revisao_recuperar_artefato(revisao bigint,autorizacao bigint,tipo_artefato text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE fonte bigint; hash text; conteudo text;
BEGIN
  SELECT r.fonte_id INTO fonte FROM ambulatorio.importacao_revisao r WHERE r.revisao_id=revisao;
  PERFORM ambulatorio.revisao_exigir_autorizacao(fonte,autorizacao);
  SELECT CASE tipo_artefato WHEN 'manifesto_base' THEN p.manifesto_base_sha256
    WHEN 'manifesto_revisado' THEN p.manifesto_revisado_sha256
    WHEN 'transformacoes' THEN p.transformacoes_sha256 END INTO hash
    FROM ambulatorio.importacao_revisao_preparacao p WHERE p.revisao_id=revisao;
  IF hash IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_artefato_indisponivel'; END IF;
  SELECT a.conteudo INTO STRICT conteudo FROM ambulatorio.revisao_artefato a WHERE a.sha256=hash;
  RETURN conteudo;
END $$;

-- Diff de entrada exaustivo, sem inferir identidade de linha pela posicao.
-- Nao normaliza ausencia/vazio e nao concede aprovacao pela igualdade.
CREATE FUNCTION revisao_comparar_linhas(revisao bigint,linha_base bigint,linha_revisada bigint,autorizacao bigint)
RETURNS TABLE(chave text,bloco text,ocorrencia bigint,estado_base text,valor_base jsonb,
  estado_proposto text,valor_proposto jsonb,alterado boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE r ambulatorio.importacao_revisao; bruto_base jsonb:='[]'; bruto_novo jsonb;
BEGIN
  SELECT * INTO r FROM ambulatorio.importacao_revisao WHERE revisao_id=revisao;
  PERFORM ambulatorio.revisao_exigir_autorizacao(r.fonte_id,autorizacao);
  IF NOT EXISTS (SELECT 1 FROM ambulatorio.importacao_revisao_preparacao p WHERE p.revisao_id=revisao) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_preparacao_ausente';
  END IF;
  SELECT i.dados_brutos INTO bruto_novo FROM ambulatorio.importacao_linha i
    WHERE i.importacao_linha_id=linha_revisada AND i.importacao_lote_id=r.lote_revisado_id;
  IF bruto_novo IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_linha_de_outro_lote'; END IF;
  IF linha_base IS NOT NULL THEN
    SELECT i.dados_brutos INTO bruto_base FROM ambulatorio.importacao_linha i
      WHERE i.importacao_linha_id=linha_base AND i.importacao_lote_id=r.lote_base_id;
    IF bruto_base IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_linha_de_outro_lote'; END IF;
  END IF;
  RETURN QUERY WITH b AS (
    SELECT c->>'chave' k,c->>'bloco' bl,COALESCE((c->>'ocorrencia')::bigint,1) oc,c->'valor' v
      FROM jsonb_array_elements(bruto_base) c
  ), n AS (
    SELECT c->>'chave' k,c->>'bloco' bl,COALESCE((c->>'ocorrencia')::bigint,1) oc,c->'valor' v
      FROM jsonb_array_elements(bruto_novo) c
  ), estados AS (
    SELECT COALESCE(b.k,n.k) k,COALESCE(b.bl,n.bl) bl,COALESCE(b.oc,n.oc) oc,
      CASE WHEN linha_base IS NULL THEN 'linha_ausente' WHEN b.k IS NULL THEN 'coluna_ausente'
        WHEN b.v='null'::jsonb OR b.v='""'::jsonb THEN 'celula_vazia' ELSE 'valor' END eb,b.v vb,
      CASE WHEN n.k IS NULL THEN 'coluna_ausente'
        WHEN n.v='null'::jsonb OR n.v='""'::jsonb THEN 'celula_vazia' ELSE 'valor' END en,n.v vn
      FROM b FULL JOIN n USING(k,bl,oc)
  ) SELECT e.k,e.bl,e.oc,e.eb,COALESCE(e.vb,'null'::jsonb),e.en,COALESCE(e.vn,'null'::jsonb),
    e.eb IS DISTINCT FROM e.en OR e.vb IS DISTINCT FROM e.vn FROM estados e ORDER BY e.k,e.bl,e.oc;
END $$;

GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_exigir_autorizacao(bigint,bigint) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_conferir_manifesto(bigint,text) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_preparar(bigint,bigint,bigint,text,bigint) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_recuperar_artefato(bigint,bigint,text) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_comparar_linhas(bigint,bigint,bigint,bigint) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_artefato_proteger(),revisao_exigir_autorizacao(bigint,bigint),
  revisao_conferir_manifesto(bigint,text),revisao_preparar(bigint,bigint,bigint,text,bigint),
  revisao_recuperar_artefato(bigint,bigint,text),revisao_comparar_linhas(bigint,bigint,bigint,bigint)
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
    ambulatorio_revisao_gestor,ambulatorio_revisao_servico;
GRANT EXECUTE ON FUNCTION revisao_preparar(bigint,bigint,bigint,text,bigint),
  revisao_recuperar_artefato(bigint,bigint,text),revisao_comparar_linhas(bigint,bigint,bigint,bigint)
  TO ambulatorio_revisao_servico;

-- O conjunto de linhas tambem e parte do bruto congelado. Novos elos de
-- reprocessamento possuem outro lote e continuam permitidos.
CREATE FUNCTION revisao_proteger_inclusao_bruto() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM ambulatorio.importacao_fonte WHERE lote_inicial_id=NEW.importacao_lote_id)
    OR EXISTS (SELECT 1 FROM ambulatorio.importacao_revisao
      WHERE lote_base_id=NEW.importacao_lote_id OR lote_revisado_id=NEW.importacao_lote_id) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_conjunto_linhas_congelado';
  END IF;
  RETURN NEW;
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_proteger_inclusao_bruto() OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_proteger_inclusao_bruto() FROM PUBLIC,ambulatorio_importador,
  ambulatorio_aplicacao,ambulatorio_servico_autenticado,ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
CREATE TRIGGER revisao_inclusao_bruto BEFORE INSERT ON importacao_linha
  FOR EACH ROW EXECUTE FUNCTION revisao_proteger_inclusao_bruto();
COMMIT;
