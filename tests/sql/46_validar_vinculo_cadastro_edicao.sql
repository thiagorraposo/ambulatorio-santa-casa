\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE ator bigint; paciente_novo bigint; sem_contexto bigint; falho bigint;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Edicao vinculo sintetico','vinculo-cadastro@example.invalid',
     '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','edicao') RETURNING usuario_id INTO ator;
  INSERT INTO paciente(nome) VALUES('Sem contexto sintetico') RETURNING paciente_id INTO sem_contexto;
  IF EXISTS(SELECT 1 FROM acesso_paciente WHERE paciente_id=sem_contexto) THEN
    RAISE EXCEPTION 'Cadastro sem contexto ganhou acesso'; END IF;
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  INSERT INTO paciente(nome) VALUES('Novo vinculado sintetico') RETURNING paciente_id INTO paciente_novo;
  BEGIN
    PERFORM definir_acesso_paciente(sem_contexto,ator,true,true);
    RAISE EXCEPTION 'Role operacional concedeu vinculo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO acesso_paciente(paciente_id,usuario_id,pode_editar,concedido_por_usuario_id)
      VALUES(sem_contexto,ator,true,ator);
    RAISE EXCEPTION 'Mutacao direta aceita';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- Falha depois de o gatilho criar o vinculo deve desfazer o agregado inteiro.
  BEGIN
    INSERT INTO paciente(nome) VALUES('Rollback vinculo sintetico') RETURNING paciente_id INTO falho;
    INSERT INTO paciente_contato(paciente_id,telefone) VALUES(falho,repeat('1',31));
    RAISE EXCEPTION 'Contato invalido aceito';
  EXCEPTION WHEN string_data_right_truncation THEN NULL;
  END;
  RESET ROLE;
  IF EXISTS(SELECT 1 FROM paciente WHERE paciente_id=falho)
    OR EXISTS(SELECT 1 FROM acesso_paciente WHERE paciente_id=falho)
    OR EXISTS(SELECT 1 FROM acesso_paciente_evento WHERE paciente_id=falho) THEN
    RAISE EXCEPTION 'Rollback parcial do cadastro'; END IF;
  IF (SELECT count(*) FROM acesso_paciente WHERE usuario_id=ator)<>1
    OR NOT EXISTS(SELECT 1 FROM acesso_paciente WHERE paciente_id=paciente_novo AND usuario_id=ator
      AND ativo AND pode_editar AND concedido_por_usuario_id=ator)
    OR NOT EXISTS(SELECT 1 FROM acesso_paciente_evento WHERE paciente_id=paciente_novo AND usuario_id=ator
      AND ativo AND ator_usuario_id=ator AND principal_db=session_user) THEN
    RAISE EXCEPTION 'Vinculo/auditoria especificos ausentes'; END IF;
  UPDATE usuario_aplicacao SET ativo=false WHERE usuario_id=ator;
  UPDATE usuario_aplicacao SET ativo=true WHERE usuario_id=ator;
  IF EXISTS(SELECT 1 FROM acesso_paciente WHERE usuario_id=ator AND ativo)
    OR NOT EXISTS(SELECT 1 FROM acesso_paciente_evento WHERE usuario_id=ator AND NOT ativo) THEN
    RAISE EXCEPTION 'Reativacao restaurou acesso ou revogacao sem evento'; END IF;
  RAISE NOTICE 'OK: vinculo atomico/especifico/auditavel, RBAC, rollback e inativacao sem restauracao';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
