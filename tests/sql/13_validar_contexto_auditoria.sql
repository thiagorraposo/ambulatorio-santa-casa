\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE lote bigint; linha bigint; p bigint; c bigint; u bigint; fonte bigint;
BEGIN
  INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao,captura_desde)
    VALUES('paciente','nome','paciente_id','character varying(255)','v1',clock_timestamp()) RETURNING campo_id INTO c;
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
    VALUES('contexto-sintetico',repeat('9',64),'v1','processando') RETURNING importacao_lote_id INTO lote;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote,'Sintetica',1,2,'[]','processando') RETURNING importacao_linha_id INTO linha;
  SET LOCAL ROLE ambulatorio_importador;
  PERFORM auditoria_iniciar_importacao(linha);
  INSERT INTO paciente(nome) VALUES('Paciente de contexto sintetico') RETURNING paciente_id INTO p;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha,'paciente',p,'criado');
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF NOT EXISTS(SELECT 1 FROM auditoria_campo_evento WHERE campo_id=c AND registro_id=p
    AND origem='importacao' AND importacao_linha_id=linha AND ator_usuario_id IS NULL
    AND antes->>'estado'='alvo_ausente') THEN RAISE EXCEPTION 'Origem/proveniencia nao capturada'; END IF;
  BEGIN
    SET CONSTRAINTS ALL DEFERRED;
    SET LOCAL ROLE ambulatorio_importador;
    INSERT INTO paciente(nome) VALUES('Sem proveniencia sintetico');
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'Evento de importacao sem proveniencia aceito';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    SET LOCAL ROLE ambulatorio_aplicacao;
    PERFORM auditoria_iniciar_aplicacao(1);
    RAISE EXCEPTION 'Role operacional pode afirmar identidade';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    SET LOCAL ROLE ambulatorio_importador;
    UPDATE auditoria_contexto_transacao SET origem='aplicacao';
    RAISE EXCEPTION 'Importador pode forjar contexto';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Gestor contexto sintetico','contexto@example.invalid',
     '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO u;
  UPDATE importacao_linha SET status_linha='importada' WHERE importacao_linha_id=linha;
  UPDATE importacao_lote SET status_lote='concluido' WHERE importacao_lote_id=lote;
  INSERT INTO importacao_fonte(codigo,lote_inicial_id,registrada_por_usuario_id)
    VALUES('contexto-fonte',lote,u) RETURNING fonte_id INTO fonte;
  BEGIN
    UPDATE importacao_linha SET dados_brutos='["alteracao sintetica"]' WHERE importacao_linha_id=linha;
    RAISE EXCEPTION 'Bruto auditado pode ser alterado';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE importacao_registro SET acao='associado' WHERE importacao_linha_id=linha;
    RAISE EXCEPTION 'Proveniencia auditada pode ser alterada';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF pg_has_role('ambulatorio_aplicacao','ambulatorio_servico_autenticado','MEMBER')
    OR pg_has_role('ambulatorio_importador','ambulatorio_servico_autenticado','MEMBER') THEN
    RAISE EXCEPTION 'Associacao automatica de papel confiavel';
  END IF;
  RAISE NOTICE 'OK: origem importacao, exigencia de proveniencia, contexto restrito e bruto protegido';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
