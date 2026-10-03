-- Gestao da ADR-022: identidade atribuivel e concessoes explicitas, sem executor.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE gestor bigint; revisor bigint; inativo bigint; p bigint; atid bigint;
  lote bigint; linha bigint; fonte bigint; autorizacao bigint; outra bigint; instante timestamptz; papel text;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Gestor temporal sintetico','gestor.temporal@example.invalid',
     '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO gestor;
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Revisor temporal sintetico','revisor.temporal@example.invalid',
     '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','edicao') RETURNING usuario_id INTO revisor;
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil,ativo) VALUES
    ('Inativo temporal sintetico','inativo.temporal@example.invalid',
     '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','consulta',false) RETURNING usuario_id INTO inativo;
  INSERT INTO paciente(nome) VALUES('Paciente autorizacao sintetico') RETURNING paciente_id INTO p;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(p,'2026-01-01') RETURNING atendimento_id INTO atid;
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
    VALUES('autorizacao-base-sintetica',repeat('8',64),'v1','concluido') RETURNING importacao_lote_id INTO lote;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote,'Sintetica',1,2,'[]','importada') RETURNING importacao_linha_id INTO linha;
  BEGIN
    SET LOCAL ROLE ambulatorio_revisao_gestor;
    PERFORM revisao_registrar_fonte('sem-identidade',lote);
    RAISE EXCEPTION 'Identidade livre aceita';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(gestor);
  RESET ROLE;
  -- Identidade ativa não basta: a competência nominal precisa estar provisionada.
  BEGIN
    SET LOCAL ROLE ambulatorio_revisao_gestor;
    PERFORM revisao_registrar_fonte('sem-entitlement',lote);
    RAISE EXCEPTION 'Gestor sem entitlement registrou fonte';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  INSERT INTO importacao_revisao_gestor(usuario_id) VALUES(gestor);
  BEGIN
    SET LOCAL ROLE ambulatorio_revisao_gestor;
    PERFORM revisao_registrar_fonte('sem-proveniencia',lote);
    RAISE EXCEPTION 'Fonte sem ancora aceita';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha,'paciente',p,'criado'),(linha,'atendimento',atid,'criado');
  BEGIN
    INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
      VALUES(lote,'Sintetica',1,3,'[]','recebida');
    SET LOCAL ROLE ambulatorio_revisao_gestor;
    PERFORM revisao_registrar_fonte('linha-ainda-nao-terminal',lote);
    RAISE EXCEPTION 'Linha nao terminal aceita na fonte';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  fonte:=revisao_registrar_fonte('fonte-autorizacao-sintetica',lote);
  autorizacao:=revisao_conceder_autorizacao(fonte,revisor,clock_timestamp()+interval '1 hour');
  -- A verificacao diferida deve funcionar tambem com o papel restrito no commit.
  SET CONSTRAINTS ALL IMMEDIATE;
  RESET ROLE;
  IF NOT EXISTS(SELECT 1 FROM importacao_fonte WHERE fonte_id=fonte AND registrada_por_usuario_id=gestor)
    OR NOT EXISTS(SELECT 1 FROM importacao_revisao_autorizacao WHERE autorizacao_id=autorizacao
      AND concedida_por_usuario_id=gestor AND usuario_id=revisor AND revogada_em IS NULL) THEN
    RAISE EXCEPTION 'Ator ou autorizacao perdidos';
  END IF;
  BEGIN
    SET LOCAL ROLE ambulatorio_revisao_gestor;
    PERFORM revisao_conceder_autorizacao(fonte,inativo);
    RAISE EXCEPTION 'Usuario inativo autorizado';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    SET LOCAL ROLE ambulatorio_revisao_gestor;
    PERFORM revisao_conceder_autorizacao(fonte,revisor,clock_timestamp()-interval '1 hour');
    RAISE EXCEPTION 'Concessao expirada aceita';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  PERFORM revisao_revogar_autorizacao(autorizacao);
  RESET ROLE;
  SELECT revogada_em INTO instante FROM importacao_revisao_autorizacao WHERE autorizacao_id=autorizacao;
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  PERFORM revisao_revogar_autorizacao(autorizacao);
  outra:=revisao_conceder_autorizacao(fonte,revisor);
  RESET ROLE;
  IF outra=autorizacao OR NOT EXISTS(SELECT 1 FROM importacao_revisao_autorizacao WHERE autorizacao_id=autorizacao
    AND revogada_por_usuario_id=gestor AND revogada_em=instante) THEN RAISE EXCEPTION 'Revogacao alterada'; END IF;
  UPDATE usuario_aplicacao SET ativo=false WHERE usuario_id=gestor;
  BEGIN
    SET LOCAL ROLE ambulatorio_revisao_gestor;
    PERFORM revisao_conceder_autorizacao(fonte,revisor);
    RAISE EXCEPTION 'Ator inativo pode conceder';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE usuario_aplicacao SET ativo=true WHERE usuario_id=gestor;
  BEGIN
    UPDATE importacao_linha SET dados_brutos='["Alteracao sintetica bloqueada"]' WHERE importacao_linha_id=linha;
    RAISE EXCEPTION 'Fonte permite alterar bruto da base';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    SET LOCAL ROLE ambulatorio_revisao_gestor;
    PERFORM fonte_id FROM importacao_fonte WHERE fonte_id=fonte;
    RAISE EXCEPTION 'Gestor pode ler tabela restrita';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE importacao_revisao_autorizacao SET revogada_em=NULL,revogada_por_usuario_id=NULL WHERE autorizacao_id=autorizacao;
    RAISE EXCEPTION 'Revogacao reversivel';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  FOREACH papel IN ARRAY ARRAY['ambulatorio_aplicacao','ambulatorio_importador','ambulatorio_servico_autenticado','ambulatorio_revisao_servico'] LOOP
    IF has_function_privilege(papel,'revisao_registrar_fonte(text,bigint)','EXECUTE')
      OR has_function_privilege(papel,'revisao_conceder_autorizacao(bigint,bigint,timestamptz)','EXECUTE')
      OR has_table_privilege(papel,'importacao_revisao_autorizacao','SELECT,INSERT,UPDATE,DELETE')
      OR pg_has_role(papel,'ambulatorio_revisao_gestor','MEMBER') THEN
      RAISE EXCEPTION 'Permissao de gestao indevida para %',papel;
    END IF;
  END LOOP;
  IF has_column_privilege('ambulatorio_revisao_owner','usuario_aplicacao','senha_hash','SELECT') THEN
    RAISE EXCEPTION 'Owner de revisao pode ler credencial';
  END IF;
  RAISE NOTICE 'OK: fonte com proveniencia, identidade confiavel, concessao explicita, expiracao e revogacao irreversivel';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
