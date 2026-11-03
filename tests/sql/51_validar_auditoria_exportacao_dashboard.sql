\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio,public;
DO $$
DECLARE ator bigint; evento bigint;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Consulta exportação sintética','sql-exportacao@example.invalid','$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','consulta') RETURNING usuario_id INTO ator;
  SET LOCAL ROLE ambulatorio_aplicacao;
  BEGIN
    PERFORM dashboard_registrar_exportacao('{}','data_desc',1);
    RAISE EXCEPTION 'Exportação sem contexto aceita';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  evento:=dashboard_registrar_exportacao('{"inicio":"2026-10-01","fim":"2026-10-31","nomeFiltrado":true}','nome_asc',2);
  BEGIN
    INSERT INTO dashboard_exportacao_evento(transacao_id,ator_usuario_id,principal_db,filtros,ordenacao,quantidade)
      VALUES(pg_current_xact_id(),ator,session_user,'{}','data_desc',0);
    RAISE EXCEPTION 'Inserção direta aceita';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM dashboard_registrar_exportacao('{"nome":"termo sensível"}','data_desc',1);
    RAISE EXCEPTION 'Filtro fora allowlist aceito';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    PERFORM dashboard_registrar_exportacao('{}','data_desc',5001);
    RAISE EXCEPTION 'Volume excessivo aceito';
  EXCEPTION WHEN check_violation THEN NULL; END;
  RESET ROLE;
  IF NOT EXISTS(SELECT 1 FROM dashboard_exportacao_evento WHERE exportacao_id=evento AND ator_usuario_id=ator AND quantidade=2) THEN
    RAISE EXCEPTION 'Ator/volume não atribuídos corretamente';
  END IF;
  BEGIN
    UPDATE dashboard_exportacao_evento SET quantidade=0 WHERE exportacao_id=evento;
    RAISE EXCEPTION 'Auditoria reescrita';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    DELETE FROM dashboard_exportacao_evento WHERE exportacao_id=evento;
    RAISE EXCEPTION 'Auditoria excluída';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    TRUNCATE dashboard_exportacao_evento;
    RAISE EXCEPTION 'Auditoria truncada';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE usuario_aplicacao SET ativo=false WHERE usuario_id=ator;
  SET LOCAL ROLE ambulatorio_aplicacao;
  BEGIN
    PERFORM dashboard_registrar_exportacao('{}','data_desc',1);
    RAISE EXCEPTION 'Ator inativo exportou';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  RAISE NOTICE 'OK: exportação auditada com contexto/ator ativo, allowlist, limite e imutabilidade';
END $$;
ROLLBACK;
