-- Staging não clínico: íntegro, idempotente, atômico e isolado.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE ator bigint; paciente bigint; atendimento bigint; lote bigint; linha bigint;
  fonte bigint; autorizacao bigint; manifesto text; transformacoes text; hm text; ht text;
  bruto jsonb; linhas jsonb; resposta jsonb; repetida jsonb; quantidade bigint; papel text;
  lotes_antes bigint; revisoes_antes bigint; pacientes_antes bigint; atendimentos_antes bigint;
  recebimentos_antes bigint; aplicacoes_antes bigint;
BEGIN
  SELECT count(*) INTO lotes_antes FROM importacao_lote;
  SELECT count(*) INTO revisoes_antes FROM importacao_revisao;
  SELECT count(*) INTO pacientes_antes FROM paciente;
  SELECT count(*) INTO atendimentos_antes FROM atendimento;
  SELECT count(*) INTO recebimentos_antes FROM importacao_revisao_recebimento;
  SELECT count(*) INTO aplicacoes_antes FROM importacao_revisao_aplicacao;
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil)
    VALUES('Recebimento SQL sintético','recebimento-sql@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO ator;
  INSERT INTO importacao_revisao_gestor(usuario_id) VALUES(ator);
  INSERT INTO paciente(nome) VALUES('Paciente recebimento sintético') RETURNING paciente_id INTO paciente;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-01-01') RETURNING atendimento_id INTO atendimento;
  manifesto:='{"versao":"recebimento-v1","layout_versao":"recebimento-layout-v1","sheets":[{"aba_nome_original":"Sintética","aba_ordem":1,"columns":[{"posicao_fisica":"A","cabecalho_original":"Ano","chave_semantica":"retorno_anual_realizado","ocorrencia":null,"bloco_funcional":"geral"}]}]}';
  transformacoes:='{"formato":"revisao-transformacoes/v1","regras":[]}';
  hm:=encode(sha256(convert_to(manifesto,'UTF8')),'hex'); ht:=encode(sha256(convert_to(transformacoes,'UTF8')),'hex');
  INSERT INTO revisao_artefato(sha256,tipo,versao,conteudo)
    VALUES(hm,'manifesto','recebimento-v1',manifesto),(ht,'transformacoes','recebimento-transformacoes-v1',transformacoes);
  bruto:='[{"posicao":"A","cabecalho":"Ano","chave":"retorno_anual_realizado","ocorrencia":null,"bloco":"geral","valor":"2023"}]';
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,
    manifesto_sha256,importador_versao,revisao_git)
    VALUES('recebimento-base',repeat('d',64),'recebimento-layout-v1','concluido',hm,'1.7.0','abcdef0') RETURNING importacao_lote_id INTO lote;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote,'Sintética',1,2,bruto,'importada') RETURNING importacao_linha_id INTO linha;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha,'paciente',paciente,'criado'),(linha,'atendimento',atendimento,'criado');
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  fonte:=revisao_registrar_fonte('recebimento-fonte',lote);
  autorizacao:=revisao_conceder_autorizacao(fonte,ator);
  linhas:=jsonb_build_array(jsonb_build_object('abaNomeOriginal','Sintética','abaOrdem',1,'numeroLinha',2,'dadosBrutos',bruto));
  SET LOCAL ROLE ambulatorio_revisao_servico;
  resposta:=revisao_receber_arquivo(fonte,lote,autorizacao,repeat('e',64),hm,ht,'revisao-http-1.0.0','abcdef0',linhas);
  repetida:=revisao_receber_arquivo(fonte,lote,autorizacao,repeat('e',64),hm,ht,'revisao-http-1.0.0','abcdef0',linhas);
  IF resposta->>'reutilizada'<>'false' OR repetida<>resposta||'{"reutilizada":true}'::jsonb THEN
    RAISE EXCEPTION 'Recebimento repetido não reutilizou a identidade'; END IF;
  BEGIN
    PERFORM revisao_receber_arquivo(fonte,lote,autorizacao,repeat('e',64),hm,ht,
      'revisao-http-1.0.0','abcdef0',jsonb_set(linhas,'{0,dadosBrutos,0,valor}','"2022"'));
    RAISE EXCEPTION 'Mesmo hash aceitou bruto divergente';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'revisao_recebimento_divergente' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM revisao_receber_arquivo(fonte,lote,autorizacao,repeat('f',64),repeat('0',64),ht,
      'revisao-http-1.0.0','abcdef0',linhas);
    RAISE EXCEPTION 'Artefato não cadastrado foi aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'revisao_artefato_nao_cadastrado' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM revisao_receber_arquivo(fonte,lote,autorizacao,repeat('f',64),hm,ht,
      'revisao-http-1.0.0','abcdef0',jsonb_set(linhas,'{0,dadosBrutos,0,cabecalho}','"Incompatível"'));
    RAISE EXCEPTION 'Bruto incompatível foi aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'revisao_bruto_incompativel' THEN RAISE; END IF;
  END;
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT count(*) INTO quantidade FROM importacao_revisao_recebimento;
  IF quantidade<>recebimentos_antes+1 OR (SELECT count(*) FROM importacao_lote)<>lotes_antes+2
    OR (SELECT count(*) FROM importacao_revisao)<>revisoes_antes+1
    OR NOT EXISTS(SELECT 1 FROM importacao_revisao_preparacao p JOIN importacao_revisao r USING(revisao_id)
      WHERE p.revisao_id=(resposta->>'revisaoId')::bigint AND r.estado='preparada'
        AND r.lote_revisado_id=(resposta->>'loteRevisadoId')::bigint AND p.preparada_por_usuario_id=ator)
    OR (SELECT count(*) FROM paciente)<>pacientes_antes+1 OR (SELECT count(*) FROM atendimento)<>atendimentos_antes+1
    OR (SELECT count(*) FROM importacao_revisao_aplicacao)<>aplicacoes_antes
    OR EXISTS(SELECT 1 FROM importacao_registro WHERE importacao_linha_id IN
      (SELECT importacao_linha_id FROM importacao_linha WHERE importacao_lote_id=(resposta->>'loteRevisadoId')::bigint)) THEN
    RAISE EXCEPTION 'Staging parcial ou efeito clínico indevido'; END IF;
  FOREACH papel IN ARRAY ARRAY['ambulatorio_importador','ambulatorio_aplicacao',
    'ambulatorio_servico_autenticado','ambulatorio_revisao_gestor','ambulatorio_revisao_servico'] LOOP
    IF has_table_privilege(papel,'importacao_revisao_recebimento','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') THEN
      RAISE EXCEPTION 'Recebimento exposto para %',papel; END IF;
  END LOOP;
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  PERFORM revisao_revogar_autorizacao(autorizacao);
  SET LOCAL ROLE ambulatorio_revisao_servico;
  BEGIN
    PERFORM revisao_receber_arquivo(fonte,lote,autorizacao,repeat('e',64),hm,ht,'revisao-http-1.0.0','abcdef0',linhas);
    RAISE EXCEPTION 'Recebimento reutilizado sem autorização';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'revisao_autorizacao_invalida' THEN RAISE; END IF;
  END;
  RESET ROLE;
  RAISE NOTICE 'OK: staging íntegro, idempotente, sem efeitos clínicos, rollback e revogação';
END $$;
ROLLBACK;
