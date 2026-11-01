-- Complicações por atendimento: multiplicidade, quatro campos e captura prospectiva.
-- Somente dados sintéticos, com BEGIN/ROLLBACK; não é migration.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE ator bigint; paciente bigint; outro_paciente bigint; consulta bigint; outra bigint;
  primeira bigint; segunda bigint; desconhecida bigint; tentativa bigint; campo bigint;
  condicao bigint; diagnostico bigint; sorologia bigint; fotografia jsonb; captura text;
BEGIN
  IF (SELECT count(*) FROM auditoria_campo WHERE tabela_destino='complicacao_chagas'
      AND coluna_pk='complicacao_chagas_id' AND captura_desde IS NOT NULL AND serializacao_versao='v1')<>4
    OR EXISTS(SELECT 1 FROM auditoria_campo WHERE tabela_destino='complicacao_chagas' AND coluna_destino LIKE 'valor_original_%') THEN
    RAISE EXCEPTION 'Complicação: captura deve abranger somente quatro campos publicados';
  END IF;
  IF NOT has_table_privilege('ambulatorio_aplicacao','complicacao_chagas','SELECT')
    OR NOT has_table_privilege('ambulatorio_aplicacao','complicacao_chagas','INSERT')
    OR has_table_privilege('ambulatorio_aplicacao','complicacao_chagas','UPDATE')
    OR has_table_privilege('ambulatorio_aplicacao','complicacao_chagas','DELETE')
    OR has_table_privilege('ambulatorio_aplicacao','complicacao_chagas','TRUNCATE')
    OR NOT has_sequence_privilege('ambulatorio_aplicacao','complicacao_chagas_complicacao_chagas_id_seq','USAGE')
    OR has_sequence_privilege('ambulatorio_aplicacao','complicacao_chagas_complicacao_chagas_id_seq','SELECT')
    OR NOT has_table_privilege('ambulatorio_importador','complicacao_chagas','UPDATE')
    OR has_table_privilege('ambulatorio_aplicacao','auditoria_campo_evento','INSERT')
    OR has_table_privilege('ambulatorio_importador','auditoria_campo_evento','INSERT')
    OR has_function_privilege('ambulatorio_aplicacao','revisao_bloquear_complicacao_chagas()','EXECUTE')
    OR has_function_privilege('ambulatorio_importador','revisao_bloquear_complicacao_chagas()','EXECUTE') THEN
    RAISE EXCEPTION 'Complicação: grants indevidos ou privilégios existentes removidos';
  END IF;
  IF (SELECT count(*) FROM pg_trigger WHERE tgrelid='ambulatorio.complicacao_chagas'::regclass
      AND NOT tgisinternal AND tgenabled<>'D'
      AND tgname IN ('auditoria_captura','auditoria_protecao','auditoria_protecao_truncate'))<>3
    OR (SELECT count(*) FROM pg_trigger WHERE tgrelid='ambulatorio.importacao_revisao_campo'::regclass
      AND NOT tgisinternal AND tgenabled<>'D' AND tgname IN
        ('bloquear_revisao_complicacao_chagas','bloquear_revisao_condicao_chagas','bloquear_revisao_sorologia'))<>3 THEN
    RAISE EXCEPTION 'Complicação: captura/proteções ou guards anteriores ausentes';
  END IF;
  captura:=pg_get_functiondef('ambulatorio.auditoria_capturar()'::regprocedure);
  IF strpos(captura,'pg_has_role(session_user,''ambulatorio_importador'',''MEMBER'')')=0
    OR strpos(captura,'auditoria_revisao_campo_nao_aprovado')=0
    OR NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid='ambulatorio.auditoria_capturar()'::regprocedure
      AND pg_get_userbyid(p.proowner)='ambulatorio_auditoria_owner' AND p.prosecdef)
    OR has_function_privilege('ambulatorio_aplicacao','auditoria_capturar()','EXECUTE') THEN
    RAISE EXCEPTION 'Complicação: infraestrutura de auditoria vigente foi enfraquecida';
  END IF;
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil)
    VALUES('Ator complicação SQL39 sintético','sql39-'||txid_current()||'@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO ator;
  INSERT INTO paciente(nome) VALUES('Paciente complicação SQL39 sintético') RETURNING paciente_id INTO paciente;
  INSERT INTO paciente(nome) VALUES('Outro paciente complicação SQL39 sintético') RETURNING paciente_id INTO outro_paciente;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-02-01') RETURNING atendimento_id INTO consulta;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(outro_paciente,'2026-02-02') RETURNING atendimento_id INTO outra;
  INSERT INTO diagnostico_chagas(atendimento_id,possui_diagnostico_chagas,resultado_final)
    VALUES(consulta,false,'inconclusivo') RETURNING diagnostico_chagas_id INTO diagnostico;
  INSERT INTO sorologia_chagas(diagnostico_chagas_id,resultado) VALUES(diagnostico,'inconclusivo') RETURNING sorologia_chagas_id INTO sorologia;
  INSERT INTO condicao_chagas(atendimento_id,possui_sintomas) VALUES(consulta,NULL) RETURNING condicao_chagas_id INTO condicao;
  SELECT to_jsonb(d) INTO fotografia FROM diagnostico_chagas d WHERE diagnostico_chagas_id=diagnostico;
  BEGIN
    SET LOCAL ROLE ambulatorio_importador;
    INSERT INTO complicacao_chagas(atendimento_id,descricao) VALUES(consulta,'Sem contexto sintético');
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_importador_sem_contexto_aceito';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM<>'auditoria_importador_sem_contexto' THEN RAISE; END IF;
  END;
  RESET ROLE;
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  INSERT INTO complicacao_chagas(atendimento_id,tipo_complicacao,possui_complicacao,descricao,gravidade)
    VALUES(consulta,'  Tipo livre sintético  ',false,'Descrição independente do indicador falso','nao_informado')
    RETURNING complicacao_chagas_id INTO primeira;
  INSERT INTO complicacao_chagas(atendimento_id,tipo_complicacao,possui_complicacao,descricao,gravidade)
    VALUES(consulta,'  Tipo livre sintético  ',false,'Descrição independente do indicador falso','nao_informado')
    RETURNING complicacao_chagas_id INTO segunda;
  INSERT INTO complicacao_chagas(atendimento_id,possui_complicacao,descricao)
    VALUES(outra,NULL,'') RETURNING complicacao_chagas_id INTO desconhecida;
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF primeira=segunda OR (SELECT count(*) FROM complicacao_chagas WHERE atendimento_id=consulta)<>2
    OR NOT EXISTS(SELECT 1 FROM complicacao_chagas WHERE complicacao_chagas_id=primeira
      AND tipo_complicacao='  Tipo livre sintético  ' AND possui_complicacao=false
      AND descricao='Descrição independente do indicador falso' AND gravidade='nao_informado')
    OR NOT EXISTS(SELECT 1 FROM complicacao_chagas WHERE complicacao_chagas_id=desconhecida
      AND tipo_complicacao IS NULL AND possui_complicacao IS NULL AND descricao='' AND gravidade IS NULL)
    OR EXISTS(SELECT 1 FROM condicao_chagas WHERE atendimento_id=outra)
    OR EXISTS(SELECT 1 FROM diagnostico_chagas WHERE atendimento_id=outra)
    OR (SELECT to_jsonb(d) FROM diagnostico_chagas d WHERE diagnostico_chagas_id=diagnostico) IS DISTINCT FROM fotografia THEN
    RAISE EXCEPTION 'Complicação perdeu multiplicidade/campos independentes ou inferiu condição/diagnóstico';
  END IF;
  IF revisao_alvo_paciente('complicacao_chagas',primeira) IS DISTINCT FROM paciente
    OR revisao_alvo_paciente('complicacao_chagas',desconhecida) IS DISTINCT FROM outro_paciente
    OR revisao_alvo_paciente('condicao_chagas',condicao) IS DISTINCT FROM paciente
    OR revisao_alvo_paciente('sorologia_chagas',sorologia) IS DISTINCT FROM paciente THEN
    RAISE EXCEPTION 'Complicação: resolução de paciente ou guards anteriores regrediram';
  END IF;
  IF (SELECT count(*) FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='complicacao_chagas' AND e.registro_id IN (primeira,segunda,desconhecida))<>12
    OR EXISTS(SELECT 1 FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='complicacao_chagas' AND e.registro_id IN (primeira,segunda,desconhecida)
        AND (e.origem<>'aplicacao' OR e.ator_usuario_id IS DISTINCT FROM ator
          OR e.importacao_linha_id IS NOT NULL OR e.versao_campo<>1 OR e.antes->>'estado'<>'alvo_ausente')) THEN
    RAISE EXCEPTION 'Complicação: captura perdeu campos/autoria/versão de criação';
  END IF;
  SELECT campo_id INTO campo FROM auditoria_campo WHERE tabela_destino='complicacao_chagas' AND coluna_destino='possui_complicacao';
  IF NOT EXISTS(SELECT 1 FROM auditoria_campo_evento WHERE campo_id=campo AND registro_id=primeira AND depois->'valor'='false'::jsonb)
    OR NOT EXISTS(SELECT 1 FROM auditoria_campo_evento WHERE campo_id=campo AND registro_id=desconhecida AND depois->>'estado'='nulo') THEN
    RAISE EXCEPTION 'Complicação: envelopes confundem false e null';
  END IF;
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    INSERT INTO complicacao_chagas(atendimento_id,gravidade) VALUES(consulta,'inventada');
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_gravidade_invalida_aceita';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RESET ROLE;
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    INSERT INTO complicacao_chagas(atendimento_id,tipo_complicacao) VALUES(consulta,repeat('x',81));
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_tipo_longo_aceito';
  EXCEPTION WHEN string_data_right_truncation THEN NULL;
  END;
  RESET ROLE;
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    INSERT INTO complicacao_chagas(atendimento_id,descricao) VALUES(consulta,'Tentativa revertida sintética') RETURNING complicacao_chagas_id INTO tentativa;
    RAISE EXCEPTION USING ERRCODE='P9999',MESSAGE='falha_sintetica';
  EXCEPTION WHEN SQLSTATE 'P9999' THEN NULL;
  END;
  RESET ROLE;
  IF EXISTS(SELECT 1 FROM complicacao_chagas WHERE complicacao_chagas_id=tentativa)
    OR EXISTS(SELECT 1 FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='complicacao_chagas' AND e.registro_id=tentativa) THEN
    RAISE EXCEPTION 'Complicação: rollback deixou registro ou auditoria parcial';
  END IF;
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    UPDATE complicacao_chagas SET possui_complicacao=true WHERE complicacao_chagas_id=primeira;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_update_aplicacao_aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  BEGIN
    DELETE FROM complicacao_chagas WHERE complicacao_chagas_id=primeira;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_delete_aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'auditoria_alvo_protegido' THEN RAISE; END IF;
  END;
  BEGIN
    TRUNCATE complicacao_chagas;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_truncate_aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'auditoria_alvo_protegido' THEN RAISE; END IF;
  END;
  FOR campo IN SELECT campo_id FROM auditoria_campo WHERE tabela_destino IN ('complicacao_chagas','condicao_chagas','sorologia_chagas') LOOP
    BEGIN
      INSERT INTO importacao_revisao_campo(campo_id) VALUES(campo);
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_revisao_temporal_aceita';
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM NOT IN ('revisao_complicacao_chagas_nao_habilitada','revisao_condicao_chagas_nao_habilitada','revisao_sorologia_nao_habilitada') THEN RAISE; END IF;
    END;
  END LOOP;
  RAISE NOTICE 'OK: complicações repetíveis, null/false, isolamento, autoria, rollback, privilégios e guards temporais';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;

BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE paciente bigint; consulta bigint; outra bigint; lote bigint; linha bigint; complicacao bigint;
BEGIN
  INSERT INTO paciente(nome) VALUES('Paciente complicação importada SQL39 sintético') RETURNING paciente_id INTO paciente;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-02-03') RETURNING atendimento_id INTO consulta;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-02-04') RETURNING atendimento_id INTO outra;
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
    VALUES('complicacao-sql39-'||txid_current(),repeat('9',64),'sintetico-v1','processando') RETURNING importacao_lote_id INTO lote;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote,'Sintética',1,2,'[]','processando') RETURNING importacao_linha_id INTO linha;
  SET LOCAL ROLE ambulatorio_importador;
  PERFORM auditoria_iniciar_importacao(linha);
  INSERT INTO complicacao_chagas(atendimento_id,tipo_complicacao,possui_complicacao,descricao)
    VALUES(consulta,'geral',false,'Descrição importada sintética') RETURNING complicacao_chagas_id INTO complicacao;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha,'complicacao_chagas',complicacao,'criado');
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF (SELECT count(*) FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='complicacao_chagas' AND e.registro_id=complicacao AND e.versao_campo=1
        AND e.origem='importacao' AND e.importacao_linha_id=linha AND e.ator_usuario_id IS NULL)<>4 THEN
    RAISE EXCEPTION 'Complicação importada perdeu proveniência de criação';
  END IF;
  SET LOCAL ROLE ambulatorio_importador;
  UPDATE complicacao_chagas SET descricao='Descrição importada alterada sintética' WHERE complicacao_chagas_id=complicacao;
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF NOT EXISTS(SELECT 1 FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='complicacao_chagas' AND c.coluna_destino='descricao' AND e.registro_id=complicacao
        AND e.versao_campo=2 AND e.origem='importacao' AND e.importacao_linha_id=linha) THEN
    RAISE EXCEPTION 'Complicação importada perdeu atualização/proveniência';
  END IF;
  BEGIN
    SET LOCAL ROLE ambulatorio_importador;
    INSERT INTO complicacao_chagas(atendimento_id,descricao) VALUES(outra,'Sem proveniência sintética');
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_sem_proveniencia_aceita';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'auditoria_importacao_sem_proveniencia' THEN RAISE; END IF;
  END;
  RESET ROLE;
  RAISE NOTICE 'OK: complicações importadas preservam criação/atualização e exigem proveniência';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
