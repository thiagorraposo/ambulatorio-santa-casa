-- Condição por consulta: seis campos independentes, autoria e ausência preservadas.
-- Somente dados sintéticos; registros/eventos encerrados por ROLLBACK.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE ator bigint; paciente bigint; consulta bigint; outra_consulta bigint; terceira bigint;
  primeira bigint; segunda bigint; tentativa bigint; diagnostico bigint; sorologia bigint;
  campo_sintomas bigint; campo_sorologia bigint; antes jsonb; definicao_captura text;
BEGIN
  IF (SELECT count(*) FROM auditoria_campo WHERE tabela_destino='condicao_chagas'
      AND captura_desde IS NOT NULL AND coluna_pk='condicao_chagas_id' AND serializacao_versao='v1')<>6
    OR EXISTS(SELECT 1 FROM auditoria_campo WHERE tabela_destino='condicao_chagas' AND coluna_destino LIKE 'valor_original_%') THEN
    RAISE EXCEPTION 'Condição: catálogo deve capturar somente os seis campos publicados';
  END IF;
  IF NOT has_table_privilege('ambulatorio_aplicacao','condicao_chagas','SELECT')
    OR NOT has_table_privilege('ambulatorio_aplicacao','condicao_chagas','INSERT')
    OR has_table_privilege('ambulatorio_aplicacao','condicao_chagas','UPDATE')
    OR has_table_privilege('ambulatorio_aplicacao','condicao_chagas','DELETE')
    OR has_table_privilege('ambulatorio_aplicacao','condicao_chagas','TRUNCATE')
    OR NOT has_sequence_privilege('ambulatorio_aplicacao','condicao_chagas_condicao_chagas_id_seq','USAGE')
    OR has_sequence_privilege('ambulatorio_aplicacao','condicao_chagas_condicao_chagas_id_seq','SELECT')
    OR NOT has_table_privilege('ambulatorio_importador','condicao_chagas','UPDATE')
    OR has_table_privilege('ambulatorio_aplicacao','auditoria_campo_evento','INSERT')
    OR has_table_privilege('ambulatorio_importador','auditoria_campo_evento','INSERT')
    OR has_function_privilege('ambulatorio_aplicacao','revisao_bloquear_condicao_chagas()','EXECUTE')
    OR has_function_privilege('ambulatorio_importador','revisao_bloquear_condicao_chagas()','EXECUTE') THEN
    RAISE EXCEPTION 'Condição: privilégios excedem criação/consulta ou alteram importador/ledger';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='ambulatorio' AND p.proname='auditoria_capturar'
        AND pg_get_userbyid(p.proowner)='ambulatorio_auditoria_owner' AND p.prosecdef)
    OR has_function_privilege('ambulatorio_aplicacao','auditoria_capturar()','EXECUTE')
    OR has_function_privilege('ambulatorio_importador','auditoria_capturar()','EXECUTE') THEN
    RAISE EXCEPTION 'Condição: correção de TRUNCATE alterou proprietário/ACL da captura';
  END IF;
  -- Regressão comprovada: copiar a SQL24 sobrescrevia os patches 39/42 e
  -- quebrava aplicações temporais existentes. A correção deve preservar ambos.
  definicao_captura:=pg_get_functiondef('ambulatorio.auditoria_capturar()'::regprocedure);
  IF strpos(definicao_captura,'pg_has_role(session_user,''ambulatorio_importador'',''MEMBER'')')=0
    OR strpos(definicao_captura,'alvo_revisao bigint; campo_revisao bigint;')=0
    OR strpos(definicao_captura,'auditoria_revisao_campo_nao_aprovado')=0
    OR strpos(definicao_captura,'ator_usuario_id,revisao_alvo_id,revisao_campo_id)')=0
    OR strpos(definicao_captura,'contexto.ator_usuario_id,alvo_revisao,campo_revisao);')=0 THEN
    RAISE EXCEPTION 'Condição: correção TRUNCATE perdeu patches de importador herdado/revisão seletiva das SQL39/42';
  END IF;
  IF (SELECT count(*) FROM pg_trigger WHERE tgrelid='ambulatorio.condicao_chagas'::regclass
      AND NOT tgisinternal AND tgenabled<>'D'
      AND tgname IN ('auditoria_captura','auditoria_protecao','auditoria_protecao_truncate'))<>3
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ambulatorio.importacao_revisao_campo'::regclass
      AND tgname='bloquear_revisao_condicao_chagas' AND NOT tgisinternal AND tgenabled<>'D')
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ambulatorio.importacao_revisao_campo'::regclass
      AND tgname='bloquear_revisao_sorologia' AND NOT tgisinternal AND tgenabled<>'D') THEN
    RAISE EXCEPTION 'Condição: captura/proteções ou guard anterior de sorologia ausentes';
  END IF;

  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil)
    VALUES('Ator condição SQL38 sintético','sql38-'||txid_current()||'@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO ator;
  INSERT INTO paciente(nome) VALUES('Paciente condição SQL38 sintético') RETURNING paciente_id INTO paciente;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-02-01') RETURNING atendimento_id INTO consulta;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-02-02') RETURNING atendimento_id INTO outra_consulta;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-02-03') RETURNING atendimento_id INTO terceira;
  INSERT INTO diagnostico_chagas(atendimento_id,possui_diagnostico_chagas,data_descoberta_autorelato,resultado_final)
    VALUES(consulta,false,'2001-02-03','inconclusivo') RETURNING diagnostico_chagas_id INTO diagnostico;
  INSERT INTO sorologia_chagas(diagnostico_chagas_id,resultado) VALUES(diagnostico,'inconclusivo') RETURNING sorologia_chagas_id INTO sorologia;
  SELECT to_jsonb(d) INTO antes FROM diagnostico_chagas d WHERE diagnostico_chagas_id=diagnostico;

  BEGIN
    SET LOCAL ROLE ambulatorio_importador;
    INSERT INTO condicao_chagas(atendimento_id,forma_clinica) VALUES(terceira,'indeterminada');
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_condicao_sem_contexto_aceita';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM<>'auditoria_importador_sem_contexto' THEN RAISE; END IF;
  END;
  RESET ROLE;

  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  INSERT INTO condicao_chagas(atendimento_id,forma_clinica,fase_doenca,classificacao_clinica,
      possui_sintomas,descricao_sintomas,observacoes)
    VALUES(consulta,'cardiodigestiva','aguda','  Texto classificatório sintético preservado  ',false,
      'Descrição independente do indicador falso','Observação sintética') RETURNING condicao_chagas_id INTO primeira;
  INSERT INTO condicao_chagas(atendimento_id,forma_clinica,possui_sintomas,descricao_sintomas)
    VALUES(outra_consulta,'nao_informado',NULL,'Descrição com indicador desconhecido') RETURNING condicao_chagas_id INTO segunda;
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF primeira=segunda OR (SELECT count(*) FROM condicao_chagas WHERE atendimento_id IN (consulta,outra_consulta))<>2
    OR NOT EXISTS(SELECT 1 FROM condicao_chagas WHERE condicao_chagas_id=primeira
      AND forma_clinica='cardiodigestiva' AND fase_doenca='aguda' AND possui_sintomas=false
      AND classificacao_clinica='  Texto classificatório sintético preservado  '
      AND descricao_sintomas='Descrição independente do indicador falso')
    OR NOT EXISTS(SELECT 1 FROM condicao_chagas WHERE condicao_chagas_id=segunda
      AND forma_clinica='nao_informado' AND fase_doenca IS NULL AND possui_sintomas IS NULL
      AND descricao_sintomas='Descrição com indicador desconhecido') THEN
    RAISE EXCEPTION 'Condição interpretou/classificou campos independentes ou confundiu ausência com falso/não informado';
  END IF;
  IF revisao_alvo_paciente('condicao_chagas',primeira) IS DISTINCT FROM paciente
    OR revisao_alvo_paciente('condicao_chagas',segunda) IS DISTINCT FROM paciente
    OR revisao_alvo_paciente('sorologia_chagas',sorologia) IS DISTINCT FROM paciente
    OR revisao_alvo_paciente('diagnostico_chagas',diagnostico) IS DISTINCT FROM paciente
    OR revisao_alvo_paciente('atendimento',consulta) IS DISTINCT FROM paciente
    OR revisao_alvo_paciente('paciente',paciente) IS DISTINCT FROM paciente
    OR (SELECT to_jsonb(d) FROM diagnostico_chagas d WHERE diagnostico_chagas_id=diagnostico) IS DISTINCT FROM antes THEN
    RAISE EXCEPTION 'Condição alterou diagnóstico/descoberta ou a resolução de paciente anterior';
  END IF;
  IF (SELECT count(*) FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='condicao_chagas' AND e.registro_id IN (primeira,segunda))<>12
    OR EXISTS(SELECT 1 FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='condicao_chagas' AND e.registro_id IN (primeira,segunda)
        AND (e.origem<>'aplicacao' OR e.ator_usuario_id IS DISTINCT FROM ator
          OR e.importacao_linha_id IS NOT NULL OR e.principal_db<>session_user
          OR e.versao_campo<>1 OR e.antes->>'estado'<>'alvo_ausente')) THEN
    RAISE EXCEPTION 'Condição perdeu eventos de criação ou autoria';
  END IF;
  SELECT campo_id INTO campo_sintomas FROM auditoria_campo WHERE tabela_destino='condicao_chagas' AND coluna_destino='possui_sintomas';
  IF NOT EXISTS(SELECT 1 FROM auditoria_campo_evento WHERE campo_id=campo_sintomas AND registro_id=primeira
      AND depois->>'estado'='valor' AND depois->'valor'='false'::jsonb)
    OR NOT EXISTS(SELECT 1 FROM auditoria_campo_evento WHERE campo_id=campo_sintomas AND registro_id=segunda AND depois->>'estado'='nulo') THEN
    RAISE EXCEPTION 'Condição não preservou envelopes distintos para false e NULL';
  END IF;

  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    INSERT INTO condicao_chagas(atendimento_id,observacoes) VALUES(consulta,'Duplicação sintética não deve sobrescrever');
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_condicao_duplicada_aceita';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  RESET ROLE;
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    INSERT INTO condicao_chagas(atendimento_id,forma_clinica) VALUES(terceira,'forma_inventada');
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_forma_invalida_aceita';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RESET ROLE;
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    INSERT INTO condicao_chagas(atendimento_id,fase_doenca) VALUES(terceira,'fase_inventada');
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_fase_invalida_aceita';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RESET ROLE;
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    INSERT INTO condicao_chagas(atendimento_id,classificacao_clinica) VALUES(terceira,repeat('x',81));
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_classificacao_longa_aceita';
  EXCEPTION WHEN string_data_right_truncation THEN NULL;
  END;
  RESET ROLE;
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    INSERT INTO condicao_chagas(atendimento_id,observacoes) VALUES(terceira,'Condição revertida sintética') RETURNING condicao_chagas_id INTO tentativa;
    RAISE EXCEPTION USING ERRCODE='P9999',MESSAGE='falha_composta_sintetica';
  EXCEPTION WHEN SQLSTATE 'P9999' THEN NULL;
  END;
  RESET ROLE;
  IF EXISTS(SELECT 1 FROM condicao_chagas WHERE condicao_chagas_id=tentativa OR atendimento_id=terceira)
    OR EXISTS(SELECT 1 FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='condicao_chagas' AND e.registro_id=tentativa) THEN
    RAISE EXCEPTION 'Condição: tentativa inválida/rollback deixou dados ou eventos parciais';
  END IF;
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    UPDATE condicao_chagas SET possui_sintomas=true WHERE condicao_chagas_id=primeira;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_edicao_condicao_aceita';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  BEGIN
    DELETE FROM condicao_chagas WHERE condicao_chagas_id=primeira;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_delete_condicao_aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'auditoria_alvo_protegido' THEN RAISE; END IF;
  END;
  BEGIN
    TRUNCATE condicao_chagas;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_truncate_condicao_aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'auditoria_alvo_protegido' THEN RAISE; END IF;
  END;
  -- O ramo compartilhado deve proteger também tabelas capturadas anteriormente.
  BEGIN
    TRUNCATE sorologia_chagas;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_truncate_sorologia_aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'auditoria_alvo_protegido' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO importacao_revisao_campo(campo_id) VALUES(campo_sintomas);
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_revisao_condicao_aceita';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'revisao_condicao_chagas_nao_habilitada' THEN RAISE; END IF;
  END;
  SELECT campo_id INTO campo_sorologia FROM auditoria_campo WHERE tabela_destino='sorologia_chagas' AND coluna_destino='resultado';
  BEGIN
    INSERT INTO importacao_revisao_campo(campo_id) VALUES(campo_sorologia);
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_revisao_sorologia_aceita';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'revisao_sorologia_nao_habilitada' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'OK: condição por consulta, campos independentes, autoria, rollback, domínios, privilégios e revisão fechada';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;

BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE paciente bigint; consulta bigint; outra bigint; lote bigint; linha bigint; condicao bigint;
BEGIN
  INSERT INTO paciente(nome) VALUES('Paciente condição importada SQL38 sintético') RETURNING paciente_id INTO paciente;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-02-03') RETURNING atendimento_id INTO consulta;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-02-04') RETURNING atendimento_id INTO outra;
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
    VALUES('condicao-sql38-'||txid_current(),repeat('8',64),'sintetico-v1','processando') RETURNING importacao_lote_id INTO lote;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote,'Sintética',1,2,'[]','processando') RETURNING importacao_linha_id INTO linha;
  SET LOCAL ROLE ambulatorio_importador;
  PERFORM auditoria_iniciar_importacao(linha);
  INSERT INTO condicao_chagas(atendimento_id,forma_clinica,possui_sintomas,descricao_sintomas)
    VALUES(consulta,'indeterminada',false,'Descrição importada sintética') RETURNING condicao_chagas_id INTO condicao;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha,'condicao_chagas',condicao,'criado');
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF (SELECT count(*) FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='condicao_chagas' AND e.registro_id=condicao AND e.versao_campo=1
        AND e.origem='importacao' AND e.importacao_linha_id=linha AND e.ator_usuario_id IS NULL)<>6 THEN
    RAISE EXCEPTION 'Condição importada perdeu criação/proveniência por linha';
  END IF;
  SET LOCAL ROLE ambulatorio_importador;
  UPDATE condicao_chagas SET observacoes='Observação importada sintética' WHERE condicao_chagas_id=condicao;
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF NOT EXISTS(SELECT 1 FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='condicao_chagas' AND c.coluna_destino='observacoes' AND e.registro_id=condicao
        AND e.versao_campo=2 AND e.origem='importacao' AND e.importacao_linha_id=linha) THEN
    RAISE EXCEPTION 'Condição importada perdeu atualização/proveniência existentes';
  END IF;
  BEGIN
    SET LOCAL ROLE ambulatorio_importador;
    INSERT INTO condicao_chagas(atendimento_id,observacoes) VALUES(outra,'Sem proveniência sintética');
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='sentinela_condicao_sem_proveniencia_aceita';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'auditoria_importacao_sem_proveniencia' THEN RAISE; END IF;
  END;
  RESET ROLE;
  RAISE NOTICE 'OK: condição importada mantém criação/atualização e exige proveniência por linha';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
