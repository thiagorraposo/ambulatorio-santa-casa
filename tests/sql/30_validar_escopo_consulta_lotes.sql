\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE ator bigint; paciente_a bigint; paciente_b bigint; endereco bigint; linha_a bigint; linha_b bigint;
  lote_sem_proveniencia bigint; lote_completo bigint; lote_misto bigint; lote_base bigint;
  lote_revisado bigint; fonte bigint; revisao bigint; resultado boolean; contexto xid8;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Auditoria escopo síntética','escopo-lotes@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','consulta')
    RETURNING usuario_id INTO ator;
  INSERT INTO paciente(nome) VALUES('Paciente A escopo sintético') RETURNING paciente_id INTO paciente_a;
  INSERT INTO paciente(nome) VALUES('Paciente B escopo sintético') RETURNING paciente_id INTO paciente_b;
  INSERT INTO acesso_paciente(paciente_id,usuario_id,pode_editar,ativo,concedido_por_usuario_id)
    VALUES(paciente_a,ator,false,true,ator);

  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,mensagem_erro)
    VALUES('escopo-sem-proveniencia-'||txid_current(),repeat('a',64),'teste_sintetico','falhou','mensagem privada')
    RETURNING importacao_lote_id INTO lote_sem_proveniencia;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote_sem_proveniencia,'Sintética',1,2,'[]','rejeitada');

  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
    VALUES('escopo-completo-'||txid_current(),repeat('b',64),'teste_sintetico','concluido')
    RETURNING importacao_lote_id INTO lote_completo;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote_completo,'Sintética',1,2,'[]','importada') RETURNING importacao_linha_id INTO linha_a;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha_a,'paciente',paciente_a,'associado');
  INSERT INTO paciente_endereco(paciente_id,endereco) VALUES(paciente_a,'Endereço sintético') RETURNING endereco_id INTO endereco;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha_a,'paciente_endereco',endereco,'criado');
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote_completo,'Sintética',1,3,'[]','importada') RETURNING importacao_linha_id INTO linha_b;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha_b,'paciente',paciente_b,'associado');

  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
    VALUES('escopo-misto-'||txid_current(),repeat('c',64),'teste_sintetico','concluido')
    RETURNING importacao_lote_id INTO lote_misto;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote_misto,'Sintética',1,2,'[]','importada') RETURNING importacao_linha_id INTO linha_b;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha_b,'paciente',paciente_a,'associado');
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote_misto,'Sintética',1,3,'[]','importada') RETURNING importacao_linha_id INTO linha_b;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha_b,'paciente',paciente_b,'associado');

  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
    VALUES('escopo-base-'||txid_current(),repeat('d',64),'revisao_base','concluido')
    RETURNING importacao_lote_id INTO lote_base;
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
    VALUES('escopo-revisado-'||txid_current(),repeat('e',64),'revisao_destino','pronto')
    RETURNING importacao_lote_id INTO lote_revisado;
  INSERT INTO importacao_fonte(codigo,lote_inicial_id,registrada_por_usuario_id)
    VALUES('escopo-fonte-'||txid_current(),lote_base,ator) RETURNING fonte_id INTO fonte;
  INSERT INTO importacao_revisao(fonte_id,lote_base_id,hash_base,layout_base,lote_revisado_id,hash_revisado,
    layout_revisado,versao_fonte_esperada,contrato_versao,manifesto_base_sha256,manifesto_revisado_sha256,
    transformacoes_versao,importador_versao,revisao_git)
    VALUES(fonte,lote_base,repeat('d',64),'revisao_base',lote_revisado,repeat('e',64),'revisao_destino',
      0,'teste-v1',repeat('f',64),repeat('0',64),'transformacoes-v1','1.0.0','abcdef0') RETURNING revisao_id INTO revisao;

  -- Identificadores e configurações de sessão não substituem o ledger confiável.
  PERFORM set_config('app.usuario_id',ator::text,true);
  SET LOCAL ROLE ambulatorio_aplicacao;
  IF importacao_lote_pode_consultar(lote_completo) OR importacao_lote_pode_consultar(lote_sem_proveniencia)
    OR importacao_lote_pode_consultar(lote_revisado) THEN
    RAISE EXCEPTION 'helper aceitou identidade ausente, GUC forjada ou lote de revisão'; END IF;
  IF has_function_privilege('ambulatorio_aplicacao','importacao_registro_paciente_id(text,bigint)','EXECUTE')
    OR has_function_privilege('ambulatorio_importador','importacao_lote_pode_consultar(bigint)','EXECUTE')
    OR NOT has_function_privilege('ambulatorio_aplicacao','importacao_lote_pode_consultar(bigint)','EXECUTE') THEN
    RAISE EXCEPTION 'privilégios do helper de escopo divergentes'; END IF;
  BEGIN
    INSERT INTO auditoria_contexto_transacao(transacao_id,principal_db,origem,ator_usuario_id)
      VALUES(pg_current_xact_id(),'forjado','aplicacao',ator);
    RAISE EXCEPTION 'role aplicação escreveu ledger diretamente';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  IF importacao_lote_pode_consultar(lote_completo) OR importacao_lote_pode_consultar(lote_sem_proveniencia)
    OR importacao_lote_pode_consultar(lote_misto) OR importacao_lote_pode_consultar(lote_revisado) THEN
    RAISE EXCEPTION 'consulta viu lote sem proveniência completa/vínculo ou lote revisado'; END IF;
  RESET ROLE;

  UPDATE usuario_aplicacao SET perfil='administracao' WHERE usuario_id=ator;
  SET LOCAL ROLE ambulatorio_aplicacao;
  IF NOT importacao_lote_pode_consultar(lote_sem_proveniencia)
    OR NOT importacao_lote_pode_consultar(lote_misto) OR importacao_lote_pode_consultar(lote_revisado) THEN
    RAISE EXCEPTION 'admin não recebeu metadados globais ordinários ou viu lote revisado'; END IF;
  RESET ROLE;

  UPDATE usuario_aplicacao SET perfil='edicao' WHERE usuario_id=ator;
  UPDATE acesso_paciente SET ativo=true WHERE paciente_id=paciente_b AND usuario_id=ator;
  INSERT INTO acesso_paciente(paciente_id,usuario_id,pode_editar,ativo,concedido_por_usuario_id)
    VALUES(paciente_b,ator,false,true,ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  IF NOT importacao_lote_pode_consultar(lote_completo) OR NOT importacao_lote_pode_consultar(lote_misto) THEN
    RAISE EXCEPTION 'edição não viu lote com todas as proveniências vinculadas'; END IF;
  RESET ROLE;

  UPDATE acesso_paciente SET ativo=false WHERE paciente_id=paciente_b AND usuario_id=ator;
  SET LOCAL ROLE ambulatorio_aplicacao;
  IF importacao_lote_pode_consultar(lote_completo) OR importacao_lote_pode_consultar(lote_misto) THEN
    RAISE EXCEPTION 'vínculo revogado não foi aplicado ao escopo do lote'; END IF;
  RESET ROLE;

  UPDATE usuario_aplicacao SET ativo=false WHERE usuario_id=ator;
  SET LOCAL ROLE ambulatorio_aplicacao;
  IF importacao_lote_pode_consultar(lote_completo) THEN RAISE EXCEPTION 'identidade inativa recebeu acesso'; END IF;
  RESET ROLE;
  RAISE NOTICE 'OK: escopo de lotes por proveniência, perfil, vínculo, ledger e exclusão de revisão';
END $$;

ROLLBACK;
