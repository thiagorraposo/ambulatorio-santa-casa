-- AVC sintético longitudinal: multiplicidade, autoria, captura e isolamento de D8.
-- Não é migration; somente fixtures sintéticas em transação revertida.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE ator bigint; pessoa bigint; outra bigint; primeiro bigint; segundo bigint;
  desconhecido bigint; anual bigint; tentativa bigint; campo bigint; campo_ano bigint; eventos bigint;
BEGIN
  SELECT campo_id INTO STRICT campo_ano FROM auditoria_campo
    WHERE tabela_destino='evento_clinico' AND coluna_destino='ano_evento' AND captura_desde IS NOT NULL;
  IF (SELECT count(*) FROM auditoria_campo WHERE tabela_destino='evento_clinico'
      AND coluna_destino IN ('tipo_evento','ocorreu','descricao','observacoes')
      AND coluna_pk='evento_clinico_id' AND captura_desde IS NOT NULL AND serializacao_versao='v1')<>4
    OR EXISTS(SELECT 1 FROM auditoria_campo WHERE tabela_destino='evento_clinico'
      AND coluna_destino LIKE 'valor_original_%' AND captura_desde IS NOT NULL) THEN
    RAISE EXCEPTION 'AVC: captura dos quatro campos não corresponde ao recorte';
  END IF;
  IF NOT has_table_privilege('ambulatorio_aplicacao','evento_clinico','SELECT')
    OR NOT has_table_privilege('ambulatorio_aplicacao','evento_clinico','INSERT')
    OR NOT has_table_privilege('ambulatorio_aplicacao','evento_clinico','UPDATE')
    OR has_table_privilege('ambulatorio_aplicacao','evento_clinico','DELETE')
    OR has_table_privilege('ambulatorio_aplicacao','evento_clinico','TRUNCATE')
    OR NOT has_sequence_privilege('ambulatorio_aplicacao','evento_clinico_evento_clinico_id_seq','USAGE')
    OR NOT has_table_privilege('ambulatorio_importador','evento_clinico','UPDATE')
    OR has_table_privilege('ambulatorio_aplicacao','auditoria_campo_evento','INSERT')
    OR has_function_privilege('ambulatorio_aplicacao','revisao_bloquear_campos_evento_clinico()','EXECUTE')
    OR has_function_privilege('ambulatorio_importador','revisao_bloquear_campos_evento_clinico()','EXECUTE')
    OR has_function_privilege('ambulatorio_revisao_servico','revisao_bloquear_campos_evento_clinico()','EXECUTE')
    OR has_function_privilege('ambulatorio_revisao_gestor','revisao_bloquear_campos_evento_clinico()','EXECUTE') THEN
    RAISE EXCEPTION 'AVC: privilégios indevidos ou importador enfraquecido';
  END IF;
  IF (SELECT count(*) FROM pg_trigger WHERE tgrelid='ambulatorio.evento_clinico'::regclass
      AND NOT tgisinternal AND tgenabled<>'D'
      AND tgname IN ('auditoria_captura','auditoria_protecao','auditoria_protecao_truncate'))<>3 THEN
    RAISE EXCEPTION 'AVC: gatilhos anteriores não foram preservados';
  END IF;
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil)
    VALUES('Ator AVC SQL41 sintético','sql41-'||txid_current()||'@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO ator;
  INSERT INTO paciente(nome) VALUES('Paciente AVC SQL41 sintético') RETURNING paciente_id INTO pessoa;
  INSERT INTO paciente(nome) VALUES('Outro paciente AVC SQL41 sintético') RETURNING paciente_id INTO outra;
  BEGIN
    SET LOCAL ROLE ambulatorio_importador;
    INSERT INTO evento_clinico(paciente_id,tipo_evento,ocorreu) VALUES(pessoa,'avc',false);
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_importador_sem_contexto_aceito';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM<>'auditoria_importador_sem_contexto' THEN RAISE; END IF;
  END;
  RESET ROLE;
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  INSERT INTO evento_clinico(paciente_id,tipo_evento,ocorreu,ano_evento,descricao,observacoes)
    VALUES(pessoa,'avc',false,2020,'  Descrição literal sintética  ','Observação independente') RETURNING evento_clinico_id INTO primeiro;
  INSERT INTO evento_clinico(paciente_id,tipo_evento,ocorreu,ano_evento,descricao,observacoes)
    VALUES(pessoa,'avc',false,2020,'  Descrição literal sintética  ','Observação independente') RETURNING evento_clinico_id INTO segundo;
  INSERT INTO evento_clinico(paciente_id,tipo_evento,ocorreu,ano_evento)
    VALUES(outra,'avc',NULL,NULL) RETURNING evento_clinico_id INTO desconhecido;
  INSERT INTO evento_clinico(paciente_id,tipo_evento,ano_evento)
    VALUES(pessoa,'ultimo_comparecimento_ano_informado',2023) RETURNING evento_clinico_id INTO anual;
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF primeiro=segundo OR (SELECT count(*) FROM evento_clinico WHERE paciente_id=pessoa AND tipo_evento='avc')<>2
    OR NOT EXISTS(SELECT 1 FROM evento_clinico WHERE evento_clinico_id=primeiro AND ocorreu=false
      AND ano_evento=2020 AND descricao='  Descrição literal sintética  ' AND observacoes='Observação independente')
    OR NOT EXISTS(SELECT 1 FROM evento_clinico WHERE evento_clinico_id=desconhecido AND ocorreu IS NULL AND ano_evento IS NULL)
    OR revisao_alvo_paciente('evento_clinico',primeiro)<>pessoa
    OR revisao_alvo_paciente('evento_clinico',desconhecido)<>outra
    OR EXISTS(SELECT 1 FROM atendimento WHERE paciente_id IN (pessoa,outra)) THEN
    RAISE EXCEPTION 'AVC: perdeu multiplicidade/triestado/texto/paciente ou fabricou atendimento';
  END IF;
  IF (SELECT count(*) FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='evento_clinico' AND e.registro_id IN (primeiro,segundo,desconhecido))<>15
    OR EXISTS(SELECT 1 FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='evento_clinico' AND e.registro_id IN (primeiro,segundo,desconhecido)
        AND (e.origem<>'aplicacao' OR e.ator_usuario_id IS DISTINCT FROM ator
          OR e.versao_campo<>1 OR e.antes->>'estado'<>'alvo_ausente')) THEN
    RAISE EXCEPTION 'AVC: captura ou autoria de criação divergente';
  END IF;
  SELECT campo_id INTO STRICT campo FROM auditoria_campo WHERE tabela_destino='evento_clinico' AND coluna_destino='ocorreu';
  IF NOT EXISTS(SELECT 1 FROM auditoria_campo_evento WHERE campo_id=campo AND registro_id=primeiro AND depois->'valor'='false'::jsonb)
    OR NOT EXISTS(SELECT 1 FROM auditoria_campo_evento WHERE campo_id=campo AND registro_id=desconhecido AND depois->>'estado'='nulo') THEN
    RAISE EXCEPTION 'AVC: envelopes confundem false com null';
  END IF;
  -- A captura adicional não altera a cadeia anual nem exige os campos novos
  -- no plano temporal D8. A prova completa do executor já existe nas regressões D8.
  UPDATE evento_clinico SET ano_evento=2022 WHERE evento_clinico_id=anual;
  UPDATE evento_clinico SET ano_evento=2023 WHERE evento_clinico_id=anual;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=campo_ano AND registro_id=anual)<>3 THEN
    RAISE EXCEPTION 'AVC: cadeia anual A-B-A alterada';
  END IF;
  FOR campo IN SELECT campo_id FROM auditoria_campo WHERE tabela_destino='evento_clinico'
      AND coluna_destino IN ('tipo_evento','ocorreu','descricao','observacoes') LOOP
    BEGIN
      INSERT INTO importacao_revisao_campo(campo_id) VALUES(campo);
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_revisao_campos_novos_aceita';
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM<>'revisao_campos_evento_clinico_nao_habilitada' THEN RAISE; END IF;
    END;
  END LOOP;
  BEGIN
    -- Se o guard anual fosse bloqueado, a exceção seria 23514 antes do guard
    -- vigente, que exige plano e pode levantar no_data_found ou NOT NULL.
    INSERT INTO importacao_revisao_campo(campo_id) VALUES(campo_ano);
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_revisao_anual_incompleta_aceita';
  EXCEPTION WHEN not_null_violation OR no_data_found THEN NULL; END;
  SET LOCAL ROLE ambulatorio_aplicacao;
  UPDATE evento_clinico SET ano_evento=2024,valor_original_data='2024' WHERE evento_clinico_id=anual;
  RESET ROLE;
  IF (SELECT ano_evento FROM evento_clinico WHERE evento_clinico_id=anual)<>2024 THEN
    RAISE EXCEPTION 'D8 perdeu UPDATE de ano_evento pela aplicação';
  END IF;
  BEGIN
    DELETE FROM evento_clinico WHERE evento_clinico_id=primeiro;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_delete_aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'auditoria_alvo_protegido' THEN RAISE; END IF;
  END;
  BEGIN
    TRUNCATE evento_clinico;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_truncate_aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'auditoria_alvo_protegido' THEN RAISE; END IF;
  END;
  SELECT count(*) INTO eventos FROM auditoria_campo_evento;
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    INSERT INTO evento_clinico(paciente_id,tipo_evento,ocorreu) VALUES(pessoa,'avc',true) RETURNING evento_clinico_id INTO tentativa;
    RAISE EXCEPTION USING ERRCODE='P9999',MESSAGE='falha_sintetica';
  EXCEPTION WHEN SQLSTATE 'P9999' THEN NULL; END;
  RESET ROLE;
  IF EXISTS(SELECT 1 FROM evento_clinico WHERE evento_clinico_id=tentativa)
    OR (SELECT count(*) FROM auditoria_campo_evento)<>eventos THEN
    RAISE EXCEPTION 'AVC: rollback deixou fato/auditoria parcial';
  END IF;
  RAISE NOTICE 'OK: AVC longitudinal repetível, triestado, autoria, rollback, privilégios e D8 preservado';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
