\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio,public;
DO $$
DECLARE admin_id bigint; alvo bigint; paciente_id_teste bigint; recibo jsonb;
  op uuid:='85d8c47c-5c67-47aa-a88d-553434c74b39';
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Admin estado sintético','sql-estado-admin@example.invalid','$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO admin_id;
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Alvo estado sintético','sql-estado-alvo@example.invalid','$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','edicao') RETURNING usuario_id INTO alvo;
  INSERT INTO paciente(nome) VALUES('Paciente estado sintético') RETURNING paciente_id INTO paciente_id_teste;
  INSERT INTO acesso_paciente(paciente_id,usuario_id,pode_editar,concedido_por_usuario_id)
    VALUES(paciente_id_teste,alvo,true,admin_id);
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(admin_id);
  SET LOCAL ROLE ambulatorio_aplicacao;
  BEGIN
    PERFORM alterar_conta_usuario(alvo,1,'estado',NULL,false,'Comando direto proibido',op,0);
    RAISE EXCEPTION 'Helper interno exposto';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM alterar_estado_usuario(alvo,1,false,'Rollback estado sintético',op,0);
    RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='rollback_forcado';
  EXCEPTION WHEN SQLSTATE 'ZX002' THEN NULL; END;
  IF EXISTS(SELECT 1 FROM usuario_conta_operacao WHERE operacao_id=op)
    OR NOT EXISTS(SELECT 1 FROM acesso_paciente WHERE paciente_id=paciente_id_teste AND usuario_id=alvo AND ativo)
    OR NOT EXISTS(SELECT 1 FROM usuario_aplicacao WHERE usuario_id=alvo AND ativo AND versao_conta=1 AND geracao_sessao=0) THEN
    RAISE EXCEPTION 'Rollback parcial de estado/vínculo/recibo'; END IF;
  recibo:=alterar_estado_usuario(alvo,1,false,'Inativação estado sintético',op,0);
  IF recibo->'anterior'<>'true'::jsonb OR recibo->'novo'<>'false'::jsonb OR recibo->>'operacao'<>'estado'
    OR recibo->>'resultado'<>'aplicada' THEN RAISE EXCEPTION 'Recibo de estado inválido'; END IF;
  IF EXISTS(SELECT 1 FROM usuario_perfil_operacao WHERE operacao_id=op) THEN RAISE EXCEPTION 'View de perfil publicou estado'; END IF;
  IF alterar_estado_usuario(alvo,1,false,'Inativação estado sintético',op,0)<>recibo THEN RAISE EXCEPTION 'Replay escreveu de novo'; END IF;
  BEGIN
    PERFORM alterar_perfil_usuario(alvo,1,'consulta','Inativação estado sintético',op,0);
    RAISE EXCEPTION 'UUID mudou de comando';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  PERFORM alterar_estado_usuario(alvo,2,true,'Reativação estado sintético','9ef61187-4eba-44da-9d9c-efc82996314f',0);
  RESET ROLE;
  IF EXISTS(SELECT 1 FROM acesso_paciente WHERE usuario_id=alvo AND ativo)
    OR NOT EXISTS(SELECT 1 FROM acesso_paciente_evento WHERE usuario_id=alvo AND NOT ativo AND ator_usuario_id=admin_id)
    OR NOT EXISTS(SELECT 1 FROM usuario_aplicacao WHERE usuario_id=alvo AND ativo AND versao_conta=3 AND geracao_sessao=2) THEN
    RAISE EXCEPTION 'Reativação restaurou vínculo ou perdeu revogação/versão'; END IF;
  RAISE NOTICE 'OK: estado atômico, rollback/replay, helper privado, compatibilidade e revogação sem restauração';
END $$;
ROLLBACK;
