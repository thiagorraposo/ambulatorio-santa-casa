-- F08/F09: todos os escritores de campos habilitados, A->B->A e rollback.
-- Origem atribuivel de importacao/aplicacao e executor sao incrementos separados.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE p bigint; antigo bigint; c bigint; primeiro bigint; contagem bigint; estado jsonb;
BEGIN
  INSERT INTO paciente(nome) VALUES('Legado sintetico sem historia') RETURNING paciente_id INTO antigo;
  INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao,captura_desde)
    VALUES('paciente','nome','paciente_id','character varying(255)','v1',clock_timestamp()) RETURNING campo_id INTO c;
  INSERT INTO paciente(nome) VALUES('A sintetico') RETURNING paciente_id INTO p;
  SELECT evento_id INTO primeiro FROM auditoria_campo_evento WHERE campo_id=c AND registro_id=p;
  IF primeiro IS NULL THEN RAISE EXCEPTION 'INSERT nao capturado'; END IF;

  SET LOCAL ROLE ambulatorio_aplicacao;
  UPDATE paciente SET nome='B sintetico' WHERE paciente_id=p;
  UPDATE paciente SET nome='A sintetico' WHERE paciente_id=p;
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT count(*) INTO contagem FROM auditoria_campo_evento WHERE campo_id=c AND registro_id=p;
  IF contagem<>3 OR NOT EXISTS(SELECT 1 FROM auditoria_campo_evento
      WHERE campo_id=c AND registro_id=p AND versao_campo=3 AND evento_id<>primeiro
        AND origem='operacao_tecnica' AND ator_usuario_id IS NULL AND depois->>'valor'='A sintetico') THEN
    RAISE EXCEPTION 'F08: A->B->A perdeu historia';
  END IF;
  BEGIN
    SET LOCAL ROLE ambulatorio_importador;
    UPDATE paciente SET nome='Importador sem contexto' WHERE paciente_id=p;
    RAISE EXCEPTION 'Importador sem contexto aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- Atualizacao sem mudanca nao fabrica evento; nomes de GUC nao atribuem autoria.
  PERFORM set_config('app.usuario_id','123',true);
  PERFORM set_config('app.origem','revisao',true);
  UPDATE paciente SET nome=nome WHERE paciente_id=p;
  IF (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=c AND registro_id=p)<>3 THEN
    RAISE EXCEPTION 'UPDATE equivalente criou evento';
  END IF;
  SET CONSTRAINTS ALL DEFERRED;
  UPDATE paciente SET nome='Legado corrigido sinteticamente' WHERE paciente_id=antigo;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF NOT EXISTS(SELECT 1 FROM auditoria_campo_evento WHERE campo_id=c AND registro_id=antigo
      AND versao_campo=1 AND origem='marco_atual' AND antes->>'estado'='desconhecido')
    OR (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=c AND registro_id=antigo)<>2 THEN
    RAISE EXCEPTION 'F09: marco inventou historia legada';
  END IF;
  BEGIN
    UPDATE paciente SET nome='Mudanca revertida sinteticamente' WHERE paciente_id=p;
    RAISE EXCEPTION USING ERRCODE='P9999',MESSAGE='falha_composta_sintetica';
  EXCEPTION WHEN SQLSTATE 'P9999' THEN NULL;
  END;
  IF (SELECT nome FROM paciente WHERE paciente_id=p)<>'A sintetico'
    OR (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=c AND registro_id=p)<>3 THEN
    RAISE EXCEPTION 'Rollback nao desfez campo e evento';
  END IF;
  BEGIN
    DELETE FROM paciente WHERE paciente_id=p;
    RAISE EXCEPTION 'Exclusao de alvo auditado aceita';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    SET LOCAL ROLE ambulatorio_importador;
    INSERT INTO auditoria_campo_evento(campo_id,registro_id,versao_campo,origem,antes,depois)
      VALUES(c,p,1,'marco_atual','{}','{}');
    RAISE EXCEPTION 'Importador pode forjar evento';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE auditoria_campo_evento SET principal_db='inventado' WHERE evento_id=primeiro;
    RAISE EXCEPTION 'Historico pode ser reescrito';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ambulatorio_auditoria_owner'
    AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole))
    OR pg_has_role('ambulatorio_aplicacao','ambulatorio_auditoria_owner','MEMBER')
    OR pg_has_role('ambulatorio_importador','ambulatorio_auditoria_owner','MEMBER')
    OR has_column_privilege('ambulatorio_auditoria_owner','usuario_aplicacao','senha_hash','SELECT') THEN
    RAISE EXCEPTION 'Dono da captura tem privilegio indevido';
  END IF;
  RAISE NOTICE 'OK: captura de INSERT/UPDATE por app/importador/manutencao, A->B->A, marco sem autoria, rollback e protecao';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
