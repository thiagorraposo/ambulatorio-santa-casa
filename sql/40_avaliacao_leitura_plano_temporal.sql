-- Objetivo: avaliar decisao temporal publicada em snapshot somente de leitura.
-- Impacto: dry-run restrito a plano existente, sem ledger, IDs, locks ou DML.
-- Nao habilita executor nem substitui dry-run de proposta/arquivo sem staging.
-- Reversao: revogar EXECUTE em nova migration, preservando planos e evidencias.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE FUNCTION revisao_avaliar_decisao(decisao bigint,autorizacao bigint,ator bigint) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE d ambulatorio.importacao_revisao_decisao; r ambulatorio.importacao_revisao;
  f ambulatorio.importacao_fonte; au ambulatorio.importacao_revisao_autorizacao;
  v ambulatorio.importacao_revisao_campo; c ambulatorio.auditoria_campo;
  ap ambulatorio.importacao_revisao_aplicacao; valor jsonb; evento bigint;
  resposta jsonb; novos integer; quantidade integer; alteracoes integer;
BEGIN
  SELECT * INTO d FROM ambulatorio.importacao_revisao_decisao WHERE decisao_id=decisao;
  IF d.decisao_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_decisao_ausente';
  END IF;
  SELECT * INTO STRICT r FROM ambulatorio.importacao_revisao WHERE revisao_id=d.revisao_id;
  SELECT * INTO STRICT f FROM ambulatorio.importacao_fonte WHERE fonte_id=r.fonte_id;
  SELECT * INTO au FROM ambulatorio.importacao_revisao_autorizacao WHERE autorizacao_id=autorizacao;
  -- Ator vem exclusivamente da camada autenticadora confiavel; nenhum GUC livre.
  IF ator IS NULL OR NOT EXISTS(SELECT 1 FROM ambulatorio.usuario_aplicacao WHERE usuario_id=ator AND ativo)
    OR au.autorizacao_id IS NULL OR au.fonte_id<>r.fonte_id OR au.usuario_id<>ator
    OR au.revogada_em IS NOT NULL OR (au.valida_ate IS NOT NULL AND au.valida_ate<=statement_timestamp()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_autorizacao_invalida';
  END IF;
  SELECT count(*),count(*) FILTER(WHERE operacao IN ('definir','anular','criar')),
    count(DISTINCT alvo_chave) FILTER(WHERE operacao='criar')
    INTO quantidade,alteracoes,novos FROM ambulatorio.importacao_revisao_campo WHERE decisao_id=decisao;
  resposta:=jsonb_build_object('decisaoId',decisao::text,'planoSha256',d.plano_sha256,
    'quantidadeCampos',quantidade,'quantidadeAlteracoes',alteracoes,'quantidadeAlvosNovos',novos,
    'aplicacaoId',NULL,'resultado','apta','codigo','revisao_plano_atual');
  SELECT * INTO ap FROM ambulatorio.importacao_revisao_aplicacao WHERE decisao_id=decisao AND resultado='aplicada';
  IF ap.aplicacao_id IS NOT NULL THEN
    -- Resultado historico, nunca instruir restauracao de valores aprovados antigos.
    IF ap.plano_sha256 IS DISTINCT FROM d.plano_sha256 THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_sucesso_inconsistente';
    END IF;
    RETURN resposta||jsonb_build_object('resultado','ja_aplicada','codigo','revisao_efeito_confirmado',
      'aplicacaoId',ap.aplicacao_id::text);
  END IF;
  IF EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_decisao WHERE decisao_anterior_id=decisao) THEN
    RETURN resposta||'{"resultado":"obsoleta","codigo":"revisao_versao_decisao_obsoleta"}'::jsonb;
  END IF;
  IF d.resultado='bloquear' THEN
    RETURN resposta||'{"resultado":"bloqueada","codigo":"revisao_linha_bloqueada"}'::jsonb;
  END IF;
  IF r.estado NOT IN ('preparada','em_aplicacao')
    OR (r.estado='preparada' AND (f.versao_controle<>r.versao_fonte_esperada
      OR f.revisao_corrente_id IS DISTINCT FROM r.revisao_base_id))
    OR (r.estado='em_aplicacao' AND (f.revisao_corrente_id IS DISTINCT FROM r.revisao_id
      OR f.versao_controle<>r.versao_fonte_esperada+1)) THEN
    RETURN resposta||'{"resultado":"obsoleta","codigo":"revisao_base_obsoleta"}'::jsonb;
  END IF;
  SELECT * INTO au FROM ambulatorio.importacao_revisao_autorizacao WHERE autorizacao_id=d.autorizacao_id;
  IF au.revogada_em IS NOT NULL OR au.usuario_id<>d.decidida_por_usuario_id OR au.fonte_id<>r.fonte_id
    OR (au.valida_ate IS NOT NULL AND au.valida_ate<=statement_timestamp())
    OR NOT EXISTS(SELECT 1 FROM ambulatorio.usuario_aplicacao WHERE usuario_id=d.decidida_por_usuario_id AND ativo) THEN
    RETURN resposta||'{"resultado":"obsoleta","codigo":"revisao_aprovacao_revogada"}'::jsonb;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_preparacao p
    JOIN ambulatorio.revisao_artefato b ON b.sha256=p.manifesto_base_sha256 AND b.tipo='manifesto'
    JOIN ambulatorio.revisao_artefato n ON n.sha256=p.manifesto_revisado_sha256 AND n.tipo='manifesto'
    JOIN ambulatorio.revisao_artefato t ON t.sha256=p.transformacoes_sha256 AND t.tipo='transformacoes'
    JOIN ambulatorio.importacao_lote lb ON lb.importacao_lote_id=r.lote_base_id
    JOIN ambulatorio.importacao_lote ln ON ln.importacao_lote_id=r.lote_revisado_id
    WHERE p.revisao_id=r.revisao_id AND p.manifesto_base_sha256=r.manifesto_base_sha256
      AND p.manifesto_revisado_sha256=r.manifesto_revisado_sha256 AND t.versao=r.transformacoes_versao
      AND lb.manifesto_sha256=r.manifesto_base_sha256 AND ln.manifesto_sha256=r.manifesto_revisado_sha256
      AND ln.importador_versao=r.importador_versao AND ln.revisao_git=r.revisao_git) THEN
    RETURN resposta||'{"resultado":"conflito","codigo":"revisao_artefatos_incompativeis"}'::jsonb;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_linha WHERE importacao_linha_id=d.linha_revisada_id
      AND importacao_lote_id=r.lote_revisado_id)
    OR NOT EXISTS(SELECT 1 FROM ambulatorio.paciente WHERE paciente_id=d.paciente_id)
    OR (d.linha_base_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_registro p
      JOIN ambulatorio.importacao_linha b USING(importacao_linha_id)
      WHERE p.importacao_linha_id=d.linha_base_id AND b.importacao_lote_id=r.lote_base_id
        AND p.tabela_destino='paciente' AND p.registro_id=d.paciente_id))
    OR (d.atendimento_base_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ambulatorio.atendimento a
      JOIN ambulatorio.importacao_registro p ON p.registro_id=a.atendimento_id AND p.tabela_destino='atendimento'
      WHERE a.atendimento_id=d.atendimento_base_id AND a.paciente_id=d.paciente_id AND p.importacao_linha_id=d.linha_base_id)) THEN
    RETURN resposta||'{"resultado":"conflito","codigo":"revisao_mapeamento_incompativel"}'::jsonb;
  END IF;
  FOR v IN SELECT * FROM ambulatorio.importacao_revisao_campo WHERE decisao_id=decisao ORDER BY campo_id,alvo_chave LOOP
    SELECT * INTO STRICT c FROM ambulatorio.auditoria_campo WHERE campo_id=v.campo_id;
    IF v.operacao IN ('definir','anular','criar') AND c.captura_desde IS NULL THEN
      RETURN resposta||'{"resultado":"conflito","codigo":"revisao_captura_nao_habilitada"}'::jsonb;
    END IF;
    IF v.registro_id IS NULL THEN
      -- Apenas contagem de alvos virtuais: nao reserva identidade ou atendimento.
      CONTINUE;
    END IF;
    IF ambulatorio.revisao_alvo_paciente(c.tabela_destino,v.registro_id) IS DISTINCT FROM d.paciente_id THEN
      RETURN resposta||'{"resultado":"conflito","codigo":"revisao_paciente_incompativel"}'::jsonb;
    END IF;
    EXECUTE format('SELECT to_jsonb(%I) FROM ambulatorio.%I WHERE %I=$1',
      c.coluna_destino,c.tabela_destino,c.coluna_pk) INTO valor USING v.registro_id;
    SELECT evento_id INTO evento FROM ambulatorio.auditoria_campo_evento
      WHERE campo_id=v.campo_id AND registro_id=v.registro_id ORDER BY versao_campo DESC LIMIT 1;
    IF evento IS DISTINCT FROM v.ultimo_evento_avaliado_id
      OR ambulatorio.auditoria_envelope(valor,c.tipo_sql) IS DISTINCT FROM v.atual_avaliado THEN
      RETURN resposta||'{"resultado":"obsoleta","codigo":"revisao_alvo_alterado"}'::jsonb;
    END IF;
    IF v.operacao IN ('definir','anular') AND (v.cobertura_historica<>'desde_base'
      OR ambulatorio.revisao_cobertura_base(d.linha_base_id,v.campo_id,v.registro_id,v.base)<>'desde_base') THEN
      RETURN resposta||'{"resultado":"conflito","codigo":"revisao_cobertura_insuficiente"}'::jsonb;
    END IF;
    IF v.operacao='associar' AND (v.proposto->>'estado'<>'valor' OR v.proposto->'valor' IS DISTINCT FROM valor
      OR NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_registro WHERE importacao_linha_id=d.linha_base_id
        AND tabela_destino=c.tabela_destino AND registro_id=v.registro_id)) THEN
      RETURN resposta||'{"resultado":"conflito","codigo":"revisao_associacao_divergente"}'::jsonb;
    END IF;
  END LOOP;
  RETURN resposta;
EXCEPTION WHEN check_violation THEN
  IF SQLERRM='revisao_alvo_ausente' THEN
    RETURN resposta||'{"resultado":"conflito","codigo":"revisao_alvo_ausente"}'::jsonb;
  END IF;
  RAISE;
END $$;

CREATE FUNCTION revisao_simular_decisao(decisao bigint,autorizacao bigint,ator_autenticado bigint) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  -- Acesso so pela camada que pode autenticar o ator; operador nao fornece identidade.
  -- Esta fronteira evita escrever ledger numa transacao READ ONLY.
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_servico','MEMBER')
    OR NOT pg_has_role(session_user,'ambulatorio_servico_autenticado','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_simulacao_nao_autorizada';
  END IF;
  RETURN ambulatorio.revisao_avaliar_decisao(decisao,autorizacao,ator_autenticado);
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_avaliar_decisao(bigint,bigint,bigint) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_simular_decisao(bigint,bigint,bigint) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_avaliar_decisao(bigint,bigint,bigint),revisao_simular_decisao(bigint,bigint,bigint)
  FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,
    ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT EXECUTE ON FUNCTION revisao_simular_decisao(bigint,bigint,bigint) TO ambulatorio_revisao_servico;
COMMIT;
