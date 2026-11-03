\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio,public;
DO $$
DECLARE admin_a bigint; alvo bigint; op uuid:='31be3a4e-9a8c-4a7e-9761-aef0fa4d11ad'; r jsonb;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Admin perfil sintético','sql-perfil-admin@example.invalid','$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO admin_a;
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Alvo perfil sintético','sql-perfil-alvo@example.invalid','$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','consulta') RETURNING usuario_id INTO alvo;
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(admin_a);
  SET LOCAL ROLE ambulatorio_aplicacao;
  BEGIN
    UPDATE usuario_aplicacao SET perfil='administracao' WHERE usuario_id=alvo;
    RAISE EXCEPTION 'Mutação direta aceita';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  r:=alterar_perfil_usuario(alvo,1,'edicao','Justificativa sintética SQL',op,0);
  IF r->>'resultado'<>'aplicada' OR r->>'versaoNova'<>'2' THEN RAISE EXCEPTION 'Recibo incorreto'; END IF;
  IF alterar_perfil_usuario(alvo,1,'edicao','Justificativa sintética SQL',op,0)<>r THEN RAISE EXCEPTION 'Replay divergente'; END IF;
  BEGIN
    UPDATE usuario_perfil_operacao SET recibo='{}' WHERE operacao_id=op;
    RAISE EXCEPTION 'Recibo alterável';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM usuario_perfil_operacao WHERE operacao_id=op;
    RAISE EXCEPTION 'Recibo apagável';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM alterar_perfil_usuario(alvo,2,'consulta','Rollback sintético SQL','d78d7bca-663d-482f-8a3e-a910e0b2960e',0);
    RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='rollback_forcado';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
  IF EXISTS(SELECT 1 FROM usuario_perfil_operacao WHERE operacao_id='d78d7bca-663d-482f-8a3e-a910e0b2960e')
    OR NOT EXISTS(SELECT 1 FROM usuario_aplicacao WHERE usuario_id=alvo AND perfil='edicao' AND versao_conta=2 AND geracao_sessao=1) THEN
    RAISE EXCEPTION 'Rollback não atômico'; END IF;
  RESET ROLE;
  UPDATE usuario_aplicacao SET ativo=false WHERE usuario_id=alvo;
  UPDATE usuario_aplicacao SET ativo=true WHERE usuario_id=alvo;
  UPDATE usuario_aplicacao SET senha_hash='$2b$12$ihrzl1PutKrmTkYREM1fBu9SRK94CJ7mZLYlmSdW3h3hgtymRQiRW' WHERE usuario_id=alvo;
  IF NOT EXISTS(SELECT 1 FROM usuario_aplicacao WHERE usuario_id=alvo AND geracao_sessao=4 AND versao_conta=5) THEN
    RAISE EXCEPTION 'Geração/versão não avançaram'; END IF;
  RAISE NOTICE 'OK: perfil/recibo atômicos, replay, RBAC, imutabilidade e gerações de sessão';
END $$;
ROLLBACK;
