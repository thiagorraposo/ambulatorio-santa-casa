\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE admin_id bigint; alvo bigint; recibo jsonb; repetido jsonb;
 op uuid:=gen_random_uuid(); op_rollback uuid:=gen_random_uuid(); op_perfil uuid:=gen_random_uuid();
 dados jsonb:='{"nome":"Pessoa SQL sintética","login":"sql-criacao-pessoa@example.invalid","perfil":"edicao","justificativa":""}';
 hash_teste text:='$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK';
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ambulatorio_credencial_owner'
   AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolinherit)
  OR pg_has_role('ambulatorio_aplicacao','ambulatorio_credencial_owner','MEMBER')
  OR pg_has_role('ambulatorio_importador','ambulatorio_credencial_owner','MEMBER')
  OR pg_has_role('ambulatorio_credencial_owner','ambulatorio_aplicacao','MEMBER')
  OR pg_has_role('ambulatorio_credencial_owner','ambulatorio_importador','MEMBER') THEN
  RAISE EXCEPTION 'Owner de credenciais tem login, privilégios globais ou membership indevido'; END IF;
 IF has_column_privilege('ambulatorio_auditoria_owner','usuario_aplicacao','senha_hash','SELECT') THEN
  RAISE EXCEPTION 'Owner da captura clínica recebeu leitura de hash'; END IF;
 INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
 ('Admin criação SQL sintético','sql-criacao-admin@example.invalid',hash_teste,'administracao') RETURNING usuario_id INTO admin_id;
 SET LOCAL ROLE ambulatorio_aplicacao;
 BEGIN
  PERFORM criar_usuario(op,dados,hash_teste,clock_timestamp()+interval '24 hours',0);
  RAISE EXCEPTION 'Criação sem contexto autorizada';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RESET ROLE;
 SET LOCAL ROLE ambulatorio_servico_autenticado;
 PERFORM auditoria_iniciar_aplicacao(admin_id);
 SET LOCAL ROLE ambulatorio_aplicacao;
 BEGIN
  PERFORM criar_usuario(op_rollback,dados,hash_teste,clock_timestamp()+interval '24 hours',0);
  RAISE EXCEPTION USING ERRCODE='ZX003',MESSAGE='rollback_sintetico';
 EXCEPTION WHEN SQLSTATE 'ZX003' THEN NULL; END;
 IF EXISTS(SELECT 1 FROM usuario_credencial_operacao WHERE operacao_id=op_rollback)
  OR EXISTS(SELECT 1 FROM usuario_aplicacao WHERE login=dados->>'login') THEN RAISE EXCEPTION 'Rollback parcial de criação'; END IF;
 recibo:=criar_usuario(op,dados,hash_teste,clock_timestamp()+interval '24 hours',0);
 alvo:=(recibo->>'usuarioId')::bigint;
 IF recibo->>'resultado'<>'aplicada' OR recibo->>'atorUsuarioId'<>admin_id::text THEN RAISE EXCEPTION 'Recibo de criação inválido'; END IF;
 repetido:=criar_usuario(op,dados,hash_teste,clock_timestamp()+interval '24 hours',0);
 IF repetido<>recibo THEN RAISE EXCEPTION 'Replay divergente'; END IF;
 IF EXISTS(SELECT 1 FROM acesso_paciente WHERE usuario_id=alvo) THEN RAISE EXCEPTION 'Criação concedeu vínculo'; END IF;
 BEGIN
  PERFORM criar_usuario(op,jsonb_set(dados,'{nome}','"Outra pessoa"'),hash_teste,clock_timestamp()+interval '24 hours',0);
  RAISE EXCEPTION 'UUID divergente aceito';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  PERFORM alterar_perfil_usuario(alvo,1,'consulta','Perfil sintético com UUID já usado',op,0);
  RAISE EXCEPTION 'UUID de criação reutilizado em perfil';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 IF EXISTS(SELECT 1 FROM usuario_conta_operacao WHERE operacao_id=op)
  OR NOT EXISTS(SELECT 1 FROM usuario_aplicacao WHERE usuario_id=alvo AND perfil='edicao' AND versao_conta=1) THEN
  RAISE EXCEPTION 'Colisão UUID deixou mutação parcial'; END IF;
 -- Autoação recusada também confirma um recibo, sem alterar geração/versão.
 PERFORM alterar_perfil_usuario(admin_id,1,'consulta','Autoação sintética para namespace',op_perfil,0);
 BEGIN
  PERFORM criar_usuario(op_perfil,jsonb_set(dados,'{login}','"sql-criacao-outro@example.invalid"'),hash_teste,clock_timestamp()+interval '24 hours',0);
  RAISE EXCEPTION 'UUID de perfil reutilizado em criação';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 IF consumir_credencial_inicial(alvo,hash_teste,1) THEN RAISE EXCEPTION 'Consumo aceitou geração incorreta'; END IF;
 IF consumir_credencial_inicial(alvo,'hash-divergente',0) THEN RAISE EXCEPTION 'Consumo aceitou hash incorreto'; END IF;
 IF NOT consumir_credencial_inicial(alvo,hash_teste,0) THEN RAISE EXCEPTION 'Consumo inicial recusado'; END IF;
 IF consumir_credencial_inicial(alvo,hash_teste,0) THEN RAISE EXCEPTION 'Credencial reutilizada'; END IF;
 BEGIN
  UPDATE usuario_aplicacao SET troca_obrigatoria=false WHERE usuario_id=alvo;
  RAISE EXCEPTION 'Aplicação alterou credencial sem wrapper';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS(SELECT 1 FROM usuario_credencial_operacao o WHERE o.recibo::text LIKE '%senha_hash%' OR o.recibo::text LIKE '%$2b$%'
  OR o.payload::text LIKE '%$2b$%') THEN RAISE EXCEPTION 'Hash no recibo/auditoria'; END IF;
 RAISE NOTICE 'OK: criação autorizada, rollback/replay, UUID, vínculo ausente, consumo único/CAS e segredo fora da auditoria';
END $$;
ROLLBACK;
