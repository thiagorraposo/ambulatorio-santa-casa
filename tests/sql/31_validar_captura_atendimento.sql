-- Captura atribuível dos campos de atendimento habilitados pela migration 60.
-- Dados exclusivamente sintéticos; toda mutação desta prova termina em ROLLBACK.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE
  ator bigint; paciente bigint; v_atendimento bigint; campo_data bigint; campo_obs bigint;
  campo_ano bigint; eventos_data bigint; eventos_obs bigint;
BEGIN
  SELECT campo_id INTO campo_data FROM auditoria_campo WHERE tabela_destino='atendimento'
    AND coluna_destino='data_atendimento' AND coluna_pk='atendimento_id'
    AND tipo_sql='date' AND serializacao_versao='v1' AND captura_desde IS NOT NULL;
  SELECT campo_id INTO campo_obs FROM auditoria_campo WHERE tabela_destino='atendimento'
    AND coluna_destino='observacoes' AND coluna_pk='atendimento_id'
    AND tipo_sql='text' AND serializacao_versao='v1' AND captura_desde IS NOT NULL;
  SELECT campo_id INTO campo_ano FROM auditoria_campo WHERE tabela_destino='evento_clinico'
    AND coluna_destino='ano_evento' AND coluna_pk='evento_clinico_id'
    AND tipo_sql='integer' AND serializacao_versao='v1' AND captura_desde IS NOT NULL;
  IF campo_data IS NULL OR campo_obs IS NULL OR campo_ano IS NULL
    OR (SELECT count(*) FROM auditoria_campo WHERE captura_desde IS NOT NULL)<>3 THEN
    RAISE EXCEPTION 'Catálogo ativo deve conter somente D8, data e observações do atendimento';
  END IF;

  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil)
    VALUES('Ator SQL31 sintético','sql31-'||txid_current()||'@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao')
    RETURNING usuario_id INTO ator;
  INSERT INTO paciente(nome) VALUES('Paciente SQL31 sintético') RETURNING paciente_id INTO paciente;

  -- A identidade do importador não pode gravar sem auditoria_iniciar_importacao.
  BEGIN
    SET LOCAL ROLE ambulatorio_importador;
    INSERT INTO atendimento(paciente_id,data_atendimento,observacoes)
      VALUES(paciente,'2026-02-01','Importador sem contexto sintético');
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_importador_aceito';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM<>'auditoria_importador_sem_contexto' THEN RAISE; END IF;
  END;
  RESET ROLE;

  -- Simula escritor autenticado da API: INSERT de valor e NULL gera um evento
  -- por campo, com ator, origem e envelope corretos.
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  INSERT INTO atendimento(paciente_id,data_atendimento,observacoes)
    VALUES(paciente,'2026-02-03',NULL) RETURNING atendimento_id INTO v_atendimento;
  RESET ROLE;

  IF (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=campo_data
      AND registro_id=v_atendimento AND versao_campo=1 AND origem='aplicacao'
      AND ator_usuario_id=ator AND importacao_linha_id IS NULL
      AND antes->>'estado'='alvo_ausente' AND depois->>'valor'='2026-02-03')<>1
    OR (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=campo_obs
      AND registro_id=v_atendimento AND versao_campo=1 AND origem='aplicacao'
      AND ator_usuario_id=ator AND importacao_linha_id IS NULL
      AND antes->>'estado'='alvo_ausente' AND depois->>'estado'='nulo')<>1 THEN
    RAISE EXCEPTION 'INSERT da API não capturou data/texto nulo com ator e envelopes corretos';
  END IF;

  -- A->B->A muda os dois tokens mesmo que o valor final volte ao original.
  SET LOCAL ROLE ambulatorio_aplicacao;
  UPDATE atendimento SET data_atendimento='2026-03-04',observacoes='Observação B sintética'
    WHERE atendimento_id=v_atendimento;
  UPDATE atendimento SET data_atendimento='2026-02-03',observacoes=NULL
    WHERE atendimento_id=v_atendimento;
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT count(*) INTO eventos_data FROM auditoria_campo_evento
    WHERE campo_id=campo_data AND registro_id=v_atendimento;
  SELECT count(*) INTO eventos_obs FROM auditoria_campo_evento
    WHERE campo_id=campo_obs AND registro_id=v_atendimento;
  IF eventos_data<>3 OR eventos_obs<>3
    OR EXISTS(SELECT 1 FROM auditoria_campo_evento WHERE campo_id IN (campo_data,campo_obs)
      AND registro_id=v_atendimento AND versao_campo NOT IN (1,2,3))
    OR (SELECT data_atendimento FROM atendimento WHERE atendimento_id=v_atendimento)<>'2026-02-03'
    OR (SELECT observacoes FROM atendimento WHERE atendimento_id=v_atendimento) IS NOT NULL
    OR (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id IN (campo_data,campo_obs)
      AND registro_id=v_atendimento AND origem='aplicacao' AND ator_usuario_id=ator
      AND importacao_linha_id IS NULL)<>6 THEN
    RAISE EXCEPTION 'A-B-A não avançou ambos os tokens ou perdeu a autoria';
  END IF;

  -- Falha posterior à captura reverte em conjunto valores e eventos.
  SET LOCAL ROLE ambulatorio_aplicacao;
  BEGIN
    UPDATE atendimento SET data_atendimento='2026-04-05',observacoes='Mutação revertida sintética'
      WHERE atendimento_id=v_atendimento;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='rollback_sintetico';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;
  RESET ROLE;
  IF (SELECT data_atendimento FROM atendimento WHERE atendimento_id=v_atendimento)<>'2026-02-03'
    OR (SELECT observacoes FROM atendimento WHERE atendimento_id=v_atendimento) IS NOT NULL
    OR (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=campo_data AND registro_id=v_atendimento)<>eventos_data
    OR (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=campo_obs AND registro_id=v_atendimento)<>eventos_obs THEN
    RAISE EXCEPTION 'Rollback composto deixou valor ou evento temporal parcial';
  END IF;

  -- Campos com história protegem a identidade do atendimento contra DELETE.
  BEGIN
    DELETE FROM atendimento WHERE atendimento_id=v_atendimento;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='delete_temporal_aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'auditoria_alvo_protegido' THEN RAISE; END IF;
  END;
  IF NOT EXISTS(SELECT 1 FROM atendimento WHERE atendimento_id=v_atendimento)
    OR (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=campo_data AND registro_id=v_atendimento)<>3
    OR (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=campo_obs AND registro_id=v_atendimento)<>3 THEN
    RAISE EXCEPTION 'Proteção de DELETE removeu alvo ou trilha';
  END IF;

  RAISE NOTICE 'OK: captura atendimento data/observações + D8; INSERT API, A-B-A, rollback composto, DELETE protegido e importador sem contexto recusado';
END $$;

ROLLBACK;
