-- Episódios individuais: captura atribuível e revisão temporal fechada.
-- Dados somente sintéticos; registros e eventos terminam em ROLLBACK.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE ator bigint; paciente bigint; consulta bigint; diagnostico bigint;
  primeira bigint; segunda bigint; tentativa bigint; campo_resultado bigint;
  diagnostico_antes jsonb; eventos bigint;
BEGIN
  IF (SELECT count(*) FROM auditoria_campo WHERE tabela_destino='sorologia_chagas'
      AND captura_desde IS NOT NULL AND coluna_pk='sorologia_chagas_id' AND serializacao_versao='v1')<>7
    OR EXISTS(SELECT 1 FROM auditoria_campo WHERE tabela_destino='sorologia_chagas'
      AND coluna_destino LIKE 'valor_original_%') THEN
    RAISE EXCEPTION 'Sorologia: captura deve cobrir somente os sete campos publicados';
  END IF;
  IF NOT has_table_privilege('ambulatorio_aplicacao','sorologia_chagas','SELECT')
    OR NOT has_table_privilege('ambulatorio_aplicacao','sorologia_chagas','INSERT')
    OR has_table_privilege('ambulatorio_aplicacao','sorologia_chagas','UPDATE')
    OR has_table_privilege('ambulatorio_aplicacao','sorologia_chagas','DELETE')
    OR has_table_privilege('ambulatorio_aplicacao','sorologia_chagas','TRUNCATE')
    OR NOT has_sequence_privilege('ambulatorio_aplicacao','sorologia_chagas_sorologia_chagas_id_seq','USAGE')
    OR has_sequence_privilege('ambulatorio_aplicacao','sorologia_chagas_sorologia_chagas_id_seq','SELECT')
    OR NOT has_table_privilege('ambulatorio_importador','sorologia_chagas','UPDATE')
    OR has_table_privilege('ambulatorio_aplicacao','auditoria_campo_evento','INSERT')
    OR has_table_privilege('ambulatorio_importador','auditoria_campo_evento','INSERT')
    OR has_function_privilege('ambulatorio_aplicacao','revisao_bloquear_sorologia()','EXECUTE')
    OR has_function_privilege('ambulatorio_importador','revisao_bloquear_sorologia()','EXECUTE') THEN
    RAISE EXCEPTION 'Sorologia: fronteira de privilégios foi ampliada indevidamente';
  END IF;
  IF (SELECT count(*) FROM pg_trigger WHERE tgrelid='ambulatorio.sorologia_chagas'::regclass
      AND NOT tgisinternal AND tgenabled<>'D'
      AND tgname IN ('auditoria_captura','auditoria_protecao','auditoria_protecao_truncate'))<>3
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ambulatorio.importacao_revisao_campo'::regclass
      AND tgname='bloquear_revisao_sorologia' AND NOT tgisinternal AND tgenabled<>'D') THEN
    RAISE EXCEPTION 'Sorologia: captura/proteção/fechamento temporal ausentes';
  END IF;

  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil)
    VALUES('Ator sorologia SQL37 sintético','sql37-'||txid_current()||'@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao')
    RETURNING usuario_id INTO ator;
  INSERT INTO paciente(nome) VALUES('Paciente sorologia SQL37 sintético') RETURNING paciente_id INTO paciente;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-02-03') RETURNING atendimento_id INTO consulta;
  INSERT INTO diagnostico_chagas(atendimento_id,data_descoberta_autorelato,resultado_final)
    VALUES(consulta,'2020-01-01','inconclusivo') RETURNING diagnostico_chagas_id INTO diagnostico;
  SELECT to_jsonb(d) INTO diagnostico_antes FROM diagnostico_chagas d WHERE diagnostico_chagas_id=diagnostico;

  BEGIN
    SET LOCAL ROLE ambulatorio_importador;
    INSERT INTO sorologia_chagas(diagnostico_chagas_id,metodo_sorologico)
      VALUES(diagnostico,'Importador sem contexto sintético');
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_sorologia_sem_contexto_aceita';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM<>'auditoria_importador_sem_contexto' THEN RAISE; END IF;
  END;
  RESET ROLE;

  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  INSERT INTO sorologia_chagas(diagnostico_chagas_id,metodo_sorologico,data_solicitacao,
      data_coleta,data_resultado,resultado,laboratorio,observacoes)
    VALUES(diagnostico,'Método livre sintético','2026-02-04','2026-01-01','2025-12-31',NULL,
      'Laboratório sintético','Observação do primeiro episódio') RETURNING sorologia_chagas_id INTO primeira;
  INSERT INTO sorologia_chagas(diagnostico_chagas_id,metodo_sorologico,resultado)
    VALUES(diagnostico,'Método livre sintético','nao_informado') RETURNING sorologia_chagas_id INTO segunda;
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;

  IF primeira=segunda OR (SELECT count(*) FROM sorologia_chagas WHERE diagnostico_chagas_id=diagnostico
      AND metodo_sorologico='Método livre sintético' AND numero_metodo_planilha IS NULL)<>2 THEN
    RAISE EXCEPTION 'Sorologia: métodos repetidos foram fundidos ou receberam posição de planilha';
  END IF;
  IF revisao_alvo_paciente('sorologia_chagas',primeira) IS DISTINCT FROM paciente
    OR revisao_alvo_paciente('diagnostico_chagas',diagnostico) IS DISTINCT FROM paciente
    OR revisao_alvo_paciente('atendimento',consulta) IS DISTINCT FROM paciente
    OR revisao_alvo_paciente('paciente',paciente) IS DISTINCT FROM paciente THEN
    RAISE EXCEPTION 'Sorologia: vínculo ao paciente ou destinos anteriores perderam integridade';
  END IF;
  IF (SELECT to_jsonb(d) FROM diagnostico_chagas d WHERE diagnostico_chagas_id=diagnostico)
      IS DISTINCT FROM diagnostico_antes THEN
    RAISE EXCEPTION 'Sorologia alterou diagnóstico/descoberta/resultado final da consulta';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM sorologia_chagas WHERE sorologia_chagas_id=primeira
      AND data_solicitacao='2026-02-04' AND data_coleta='2026-01-01' AND data_resultado='2025-12-31'
      AND resultado IS NULL)
    OR NOT EXISTS(SELECT 1 FROM sorologia_chagas WHERE sorologia_chagas_id=segunda AND resultado='nao_informado') THEN
    RAISE EXCEPTION 'Sorologia interpretou datas próprias ou confundiu NULL com não informado';
  END IF;
  SELECT count(*) INTO eventos FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
    WHERE c.tabela_destino='sorologia_chagas' AND e.registro_id IN (primeira,segunda);
  IF eventos<>14 OR EXISTS(SELECT 1 FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='sorologia_chagas' AND e.registro_id IN (primeira,segunda)
        AND (e.origem<>'aplicacao' OR e.ator_usuario_id IS DISTINCT FROM ator
          OR e.importacao_linha_id IS NOT NULL OR e.principal_db<>session_user
          OR e.versao_campo<>1 OR e.antes->>'estado'<>'alvo_ausente')) THEN
    RAISE EXCEPTION 'Sorologia perdeu eventos, autoria ou envelopes de criação';
  END IF;
  SELECT campo_id INTO campo_resultado FROM auditoria_campo
    WHERE tabela_destino='sorologia_chagas' AND coluna_destino='resultado';
  IF NOT EXISTS(SELECT 1 FROM auditoria_campo_evento WHERE campo_id=campo_resultado AND registro_id=primeira
      AND depois->>'estado'='nulo')
    OR NOT EXISTS(SELECT 1 FROM auditoria_campo_evento WHERE campo_id=campo_resultado AND registro_id=segunda
      AND depois->>'estado'='valor' AND depois->>'valor'='nao_informado') THEN
    RAISE EXCEPTION 'Sorologia perdeu a diferença auditável entre NULL e não informado';
  END IF;

  -- Uma falha posterior deve desfazer a nova ocorrência junto com seus eventos.
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    INSERT INTO sorologia_chagas(diagnostico_chagas_id,metodo_sorologico)
      VALUES(diagnostico,'Ocorrência revertida sintética') RETURNING sorologia_chagas_id INTO tentativa;
    RAISE EXCEPTION USING ERRCODE='P9999',MESSAGE='falha_composta_sintetica';
  EXCEPTION WHEN SQLSTATE 'P9999' THEN NULL;
  END;
  RESET ROLE;
  IF EXISTS(SELECT 1 FROM sorologia_chagas WHERE sorologia_chagas_id=tentativa)
    OR EXISTS(SELECT 1 FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='sorologia_chagas' AND e.registro_id=tentativa) THEN
    RAISE EXCEPTION 'Sorologia: rollback deixou ocorrência ou histórico parcial';
  END IF;
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    UPDATE sorologia_chagas SET resultado='reagente' WHERE sorologia_chagas_id=primeira;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_edicao_sorologia_aceita';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  BEGIN
    DELETE FROM sorologia_chagas WHERE sorologia_chagas_id=primeira;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_delete_sorologia_aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'auditoria_alvo_protegido' THEN RAISE; END IF;
  END;

  -- O catálogo compartilhado não transforma captura em homologação temporal.
  BEGIN
    INSERT INTO importacao_revisao_campo(campo_id) VALUES(campo_resultado);
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_plano_sorologia_aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'revisao_sorologia_nao_habilitada' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'OK: sorologias distintas, datas/NULL preservados, autoria, rollback, privilégios e revisão temporal fechada';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;

-- Importador conserva seu contrato e a proveniência por linha; não recebe
-- os privilégios de identidade humana ou leitura/escrita direta do ledger.
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE paciente bigint; consulta bigint; diagnostico bigint; lote bigint; linha bigint; sorologia bigint;
BEGIN
  INSERT INTO paciente(nome) VALUES('Paciente importação sorologia SQL37 sintético') RETURNING paciente_id INTO paciente;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-02-03') RETURNING atendimento_id INTO consulta;
  INSERT INTO diagnostico_chagas(atendimento_id) VALUES(consulta) RETURNING diagnostico_chagas_id INTO diagnostico;
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
    VALUES('sorologia-sql37-'||txid_current(),repeat('7',64),'sintetico-v1','processando') RETURNING importacao_lote_id INTO lote;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote,'Sintética',1,2,'[]','processando') RETURNING importacao_linha_id INTO linha;
  SET LOCAL ROLE ambulatorio_importador;
  PERFORM auditoria_iniciar_importacao(linha);
  INSERT INTO sorologia_chagas(diagnostico_chagas_id,metodo_sorologico,resultado)
    VALUES(diagnostico,'Método importado sintético','inconclusivo') RETURNING sorologia_chagas_id INTO sorologia;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha,'sorologia_chagas',sorologia,'criado');
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF (SELECT count(*) FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='sorologia_chagas' AND e.registro_id=sorologia
        AND e.origem='importacao' AND e.importacao_linha_id=linha AND e.ator_usuario_id IS NULL)<>7 THEN
    RAISE EXCEPTION 'Sorologia importada perdeu origem/proveniência da linha';
  END IF;
  BEGIN
    SET LOCAL ROLE ambulatorio_importador;
    INSERT INTO sorologia_chagas(diagnostico_chagas_id,metodo_sorologico)
      VALUES(diagnostico,'Sorologia sem proveniência sintética');
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_sorologia_sem_proveniencia_aceita';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'auditoria_importacao_sem_proveniencia' THEN RAISE; END IF;
  END;
  RESET ROLE;
  RAISE NOTICE 'OK: sorologia importada mantém origem e exige proveniência por linha';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
