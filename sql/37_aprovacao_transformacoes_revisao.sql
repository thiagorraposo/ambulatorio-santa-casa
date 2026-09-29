-- Objetivo: conferir transformacoes e cobertura integral antes da publicacao.
-- Impacto: metadados sem preparacao verificavel nao podem mais ser aprovados.
-- Nao habilita executor nem correcoes sem cobertura historica comprovada.
-- Reversao: revogar publicacao; nao voltar a aceitar planos sem esta conferencia.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE FUNCTION revisao_transformar_v1(estado text,valor jsonb,tipo text,transformacao text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE convertido jsonb; texto text; partes text[]; numero numeric; precisao text:='nao_temporal';
BEGIN
  IF estado NOT IN ('valor','linha_ausente','coluna_ausente','celula_vazia') OR estado IS NULL
    OR transformacao NOT IN ('texto','texto_aparado','data_dd_mm_aaaa','booleano','numero','inteiro','ano')
    OR transformacao IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_transformacao_nao_suportada';
  END IF;
  IF transformacao IN ('texto','texto_aparado') AND tipo NOT IN ('text','character varying') AND tipo!~'^character varying\([0-9]+\)$'
    OR transformacao='data_dd_mm_aaaa' AND tipo<>'date'
    OR transformacao='booleano' AND tipo<>'boolean'
    OR transformacao IN ('inteiro','ano') AND tipo NOT IN ('smallint','integer','bigint')
    OR transformacao='numero' AND tipo NOT IN ('numeric','real','double precision') AND tipo!~'^numeric\([0-9]+,[0-9]+\)$' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_transformacao_tipo_incompativel';
  END IF;
  IF transformacao='data_dd_mm_aaaa' THEN precisao:='data_completa'; END IF;
  IF transformacao='ano' THEN precisao:='ano'; END IF;
  IF estado='valor' THEN
    IF jsonb_typeof(valor) NOT IN ('string','number','boolean') OR valor IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_valor_fonte_invalido';
    END IF;
    texto:=valor#>>'{}';
    CASE transformacao
    WHEN 'texto' THEN convertido:=to_jsonb(texto);
    WHEN 'texto_aparado' THEN convertido:=to_jsonb(btrim(texto));
    WHEN 'data_dd_mm_aaaa' THEN
      partes:=regexp_match(btrim(texto),'^([0-9]{1,2})/([0-9]{1,2})/([0-9]{4})$');
      IF partes IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_data_invalida'; END IF;
      convertido:=to_jsonb(to_char(make_date(partes[3]::integer,partes[2]::integer,partes[1]::integer),'YYYY-MM-DD'));
    WHEN 'booleano' THEN
      texto:=replace(lower(btrim(texto)),'ã','a');
      IF texto IN ('sim','s','x','1','verdadeiro') THEN convertido:='true';
      ELSIF texto IN ('nao','n','0','falso') THEN convertido:='false';
      ELSE RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_booleano_invalido'; END IF;
    ELSE
      texto:=btrim(texto);
      IF texto!~'^[+-]?([0-9]+([.,][0-9]+)?|[.,][0-9]+)$'
        OR (transformacao='ano' AND texto!~'^[0-9]{4}$') THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_numero_invalido';
      END IF;
      numero:=replace(texto,',','.')::numeric;
      IF transformacao IN ('inteiro','ano') AND numero<>trunc(numero) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_numero_invalido';
      END IF;
      convertido:=to_jsonb(numero);
    END CASE;
  ELSE convertido:='null'; END IF;
  RETURN jsonb_build_object('estado',estado,'valor',convertido,'tipo_sql',tipo,
    'precisao',precisao,'serializacao_versao','v1');
EXCEPTION WHEN datetime_field_overflow OR invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_valor_fonte_invalido';
END $$;

CREATE FUNCTION revisao_conferir_plano_preparado(revisao bigint,linha_base bigint,linha_revisada bigint,
  autorizacao bigint,resultado text,campos jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE transformacoes jsonb; comparacao jsonb; item jsonb; celula jsonb; regra jsonb;
  c ambulatorio.auditoria_campo; esperado_base jsonb; esperado_proposto jsonb; quantidade integer;
BEGIN
  transformacoes:=ambulatorio.revisao_recuperar_artefato(revisao,autorizacao,'transformacoes')::jsonb;
  IF transformacoes->>'formato' IS DISTINCT FROM 'revisao-transformacoes/v1'
    OR jsonb_typeof(transformacoes->'regras') IS DISTINCT FROM 'array'
    OR jsonb_typeof(campos) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_transformacoes_invalidas';
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]') INTO comparacao
    FROM ambulatorio.revisao_comparar_linhas(revisao,linha_base,linha_revisada,autorizacao) x;
  -- Toda mudanca de entrada precisa constar do plano, inclusive conservacao.
  -- Campos sem destino/transformacao homologados mantem a linha bloqueada.
  IF resultado='autorizar' AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(comparacao) x WHERE (x->>'alterado')::boolean
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(campos) p
        WHERE p->>'chaveSemantica'=x->>'chave' AND p->>'blocoFuncional'=x->>'bloco'
          AND (p->>'ocorrencia')::bigint=(x->>'ocorrencia')::bigint)
  ) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_campos_alterados_omitidos'; END IF;
  IF resultado='autorizar' AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(comparacao) x
    JOIN jsonb_array_elements(transformacoes->'regras') t ON t->>'chave'=x->>'chave'
      AND t->>'bloco'=x->>'bloco' AND (t->>'ocorrencia')::bigint=(x->>'ocorrencia')::bigint
    WHERE (x->>'alterado')::boolean AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(campos) p JOIN ambulatorio.auditoria_campo a ON a.campo_id=(p->>'campoId')::bigint
      WHERE p->>'chaveSemantica'=x->>'chave' AND p->>'blocoFuncional'=x->>'bloco'
        AND (p->>'ocorrencia')::bigint=(x->>'ocorrencia')::bigint
        AND a.tabela_destino=t->>'tabela' AND a.coluna_destino=t->>'coluna'
    )
  ) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_destinos_derivados_omitidos'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(campos) LOOP
    SELECT x INTO celula FROM jsonb_array_elements(comparacao) x
      WHERE x->>'chave'=item->>'chaveSemantica' AND x->>'bloco'=item->>'blocoFuncional'
        AND (x->>'ocorrencia')::bigint=(item->>'ocorrencia')::bigint;
    SELECT * INTO c FROM ambulatorio.auditoria_campo WHERE campo_id=(item->>'campoId')::bigint;
    IF celula IS NULL OR c.campo_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_campo_sem_fonte';
    END IF;
    SELECT count(*) INTO quantidade FROM jsonb_array_elements(transformacoes->'regras') x
      WHERE x->>'chave'=celula->>'chave' AND x->>'bloco'=celula->>'bloco'
        AND (x->>'ocorrencia')::bigint=(celula->>'ocorrencia')::bigint
        AND x->>'tabela'=c.tabela_destino AND x->>'coluna'=c.coluna_destino;
    IF quantidade<>1 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_transformacao_ambigua'; END IF;
    SELECT x INTO regra FROM jsonb_array_elements(transformacoes->'regras') x
      WHERE x->>'chave'=celula->>'chave' AND x->>'bloco'=celula->>'bloco'
        AND (x->>'ocorrencia')::bigint=(celula->>'ocorrencia')::bigint
        AND x->>'tabela'=c.tabela_destino AND x->>'coluna'=c.coluna_destino;
    esperado_base:=ambulatorio.revisao_transformar_v1(celula->>'estado_base',celula->'valor_base',c.tipo_sql,regra->>'transformacao');
    esperado_proposto:=ambulatorio.revisao_transformar_v1(celula->>'estado_proposto',celula->'valor_proposto',c.tipo_sql,regra->>'transformacao');
    IF item->>'operacao'='anular' AND esperado_proposto->>'estado' IN ('celula_vazia','coluna_ausente') THEN
      esperado_proposto:=esperado_proposto||'{"estado":"nulo_explicito"}'::jsonb;
    END IF;
    IF item->'base' IS DISTINCT FROM esperado_base OR item->'proposto' IS DISTINCT FROM esperado_proposto THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_transformacao_divergente';
    END IF;
    IF resultado='autorizar' AND item->>'operacao'='conservar' AND esperado_proposto->>'estado'='valor'
      AND esperado_base IS DISTINCT FROM esperado_proposto THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_alteracao_nao_resolvida';
    END IF;
  END LOOP;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_transformacoes_invalidas';
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_conferir_plano_preparado(bigint,bigint,bigint,bigint,text,jsonb) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_transformar_v1(text,jsonb,text,text),
  revisao_conferir_plano_preparado(bigint,bigint,bigint,bigint,text,jsonb)
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
    ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT EXECUTE ON FUNCTION revisao_transformar_v1(text,jsonb,text,text) TO ambulatorio_revisao_owner;

-- Insere a conferencia no wrapper fechado da 32, preservando normalizacao/ACL.
DO $$ DECLARE definicao text; trecho text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_publicar_decisao(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)'::regprocedure);
  trecho:='  RETURN ambulatorio.revisao_publicar_decisao_interna(';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Wrapper de publicacao inesperado'; END IF;
  EXECUTE replace(definicao,trecho,
    '  PERFORM ambulatorio.revisao_conferir_plano_preparado(revisao,linha_base,linha_revisada,autorizacao,resultado_decisao,normalizado);'
      ||chr(10)||trecho);
END $$;
COMMIT;
