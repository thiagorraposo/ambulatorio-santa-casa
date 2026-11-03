\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio,public;
DO $$
DECLARE admin_id bigint; leitura_id bigint;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Admin dashboard sintético','sql-dashboard-admin@example.invalid','$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO admin_id;
  IF dashboard_pode_consultar_importacoes() THEN RAISE EXCEPTION 'Contexto ausente concedeu capacidade'; END IF;
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(admin_id);
  SET LOCAL ROLE ambulatorio_aplicacao;
  IF dashboard_pode_consultar_importacoes() THEN RAISE EXCEPTION 'Perfil concedeu capacidade automática'; END IF;
  BEGIN
    INSERT INTO dashboard_importacao_leitor(usuario_id) VALUES(admin_id);
    RAISE EXCEPTION 'Aplicação provisionou capacidade';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  INSERT INTO dashboard_importacao_leitor(usuario_id) VALUES(admin_id) RETURNING dashboard_importacao_leitor_id INTO leitura_id;
  BEGIN
    INSERT INTO dashboard_importacao_leitor(usuario_id) VALUES(admin_id);
    RAISE EXCEPTION 'Capacidade ativa duplicada';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  SET LOCAL ROLE ambulatorio_aplicacao;
  IF NOT dashboard_pode_consultar_importacoes() THEN RAISE EXCEPTION 'Capacidade explícita não reconhecida'; END IF;
  RESET ROLE;
  BEGIN
    UPDATE dashboard_importacao_leitor SET provisionado_por_principal='forjado' WHERE dashboard_importacao_leitor_id=leitura_id;
    RAISE EXCEPTION 'Histórico de provisionamento alterado';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    DELETE FROM dashboard_importacao_leitor WHERE dashboard_importacao_leitor_id=leitura_id;
    RAISE EXCEPTION 'Histórico de provisionamento excluído';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE dashboard_importacao_leitor SET revogado_em=clock_timestamp(),revogado_por_principal=session_user
    WHERE dashboard_importacao_leitor_id=leitura_id;
  SET LOCAL ROLE ambulatorio_aplicacao;
  IF dashboard_pode_consultar_importacoes() THEN RAISE EXCEPTION 'Revogação não revalidada'; END IF;
  RESET ROLE;
  INSERT INTO dashboard_importacao_leitor(usuario_id) VALUES(admin_id);
  RAISE NOTICE 'OK: dashboard exige capacidade nominal, contexto, unicidade, histórico e revogação';
END $$;
ROLLBACK;
