-- Artefatos exatos, preparacao atribuivel, comparacao completa e isolamento.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
CREATE FUNCTION pg_temp.recusar_preparacao(comando text,estado text DEFAULT '23514',mensagem text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  BEGIN EXECUTE comando;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE=estado AND (mensagem IS NULL OR SQLERRM=mensagem) THEN RETURN; END IF; RAISE; END;
  RAISE EXCEPTION 'Preparacao invalida foi aceita';
END $$;
DO $$
DECLARE ator bigint; outro bigint; paciente_id_teste bigint; atendimento_id_teste bigint;
  lb bigint; ln bigint; ib bigint; inovo bigint; fonte bigint; au bigint; auoutro bigint; revisao bigint;
  rawb jsonb; rawn jsonb; mb jsonb; mn jsonb; hb text; hn text; ht text; transformacoes text;
  comparacao jsonb; papel text; q text; antes bigint; seq_antes bigint; seq_depois bigint; campo bigint; envelope jsonb; plano jsonb;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Preparador sintetico','preparador@example.invalid',
    '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO ator;
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Outro preparador','preparador.outro@example.invalid',
    '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','edicao') RETURNING usuario_id INTO outro;
  INSERT INTO paciente(nome) VALUES('Paciente preparacao sintetico') RETURNING paciente_id INTO paciente_id_teste;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente_id_teste,'2026-01-01') RETURNING atendimento_id INTO atendimento_id_teste;
  rawb:='[{"posicao":"A","cabecalho":"Nome","chave":"nome","ocorrencia":null,"bloco":"cadastro","valor":"Paciente preparacao sintetico"},
    {"posicao":"B","cabecalho":"Observacao","chave":"observacao","ocorrencia":null,"bloco":"geral","valor":"Observacao sintetica"},
    {"posicao":"C","cabecalho":"Legado","chave":"legado","ocorrencia":null,"bloco":"geral","valor":"Preservar legado"}]';
  rawn:='[{"posicao":"A","cabecalho":"Nome","chave":"nome","ocorrencia":null,"bloco":"cadastro","valor":"Paciente preparacao sintetico"},
    {"posicao":"B","cabecalho":"Observacao","chave":"observacao","ocorrencia":null,"bloco":"geral","valor":null},
    {"posicao":"C","cabecalho":"Novo","chave":"novo","ocorrencia":null,"bloco":"geral","valor":""}]';
  SELECT jsonb_build_object('versao','sint-base','layout_versao','layout-sint-base','sheets',jsonb_build_array(
    jsonb_build_object('aba_nome_original','Sintetica','aba_ordem',1,'columns',jsonb_agg(jsonb_build_object(
      'posicao_fisica',c->'posicao','cabecalho_original',c->'cabecalho','chave_semantica',c->'chave',
      'ocorrencia',c->'ocorrencia','bloco_funcional',c->'bloco') ORDER BY n)))) INTO mb
      FROM jsonb_array_elements(rawb) WITH ORDINALITY AS x(c,n);
  SELECT jsonb_build_object('versao','sint-novo','layout_versao','layout-sint-novo','sheets',jsonb_build_array(
    jsonb_build_object('aba_nome_original','Sintetica','aba_ordem',1,'columns',jsonb_agg(jsonb_build_object(
      'posicao_fisica',c->'posicao','cabecalho_original',c->'cabecalho','chave_semantica',c->'chave',
      'ocorrencia',c->'ocorrencia','bloco_funcional',c->'bloco') ORDER BY n)))) INTO mn
      FROM jsonb_array_elements(rawn) WITH ORDINALITY AS x(c,n);
  hb:=encode(sha256(convert_to(mb::text,'UTF8')),'hex'); hn:=encode(sha256(convert_to(mn::text,'UTF8')),'hex');
  transformacoes:='{"formato":"revisao-transformacoes/v1","regras":[{"chave":"nome","bloco":"cadastro","ocorrencia":1,"tabela":"paciente","coluna":"nome","transformacao":"texto"}]}';
  ht:=encode(sha256(convert_to(transformacoes,'UTF8')),'hex');
  INSERT INTO revisao_artefato(sha256,tipo,versao,conteudo)
    VALUES(hb,'manifesto','sint-base',mb::text),(hn,'manifesto','sint-novo',mn::text);
  PERFORM pg_temp.recusar_preparacao(format('INSERT INTO revisao_artefato VALUES(%L,''transformacoes'',''sint-v1'',%L,clock_timestamp())',
    repeat('0',64),transformacoes));
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git)
    VALUES('preparacao-base',repeat('6',64),'layout-sint-base','concluido',hb,'sint-1','abcdef0') RETURNING importacao_lote_id INTO lb;
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git)
    VALUES('preparacao-novo',repeat('7',64),'layout-sint-novo','pronto',hn,'sint-1','abcdef0') RETURNING importacao_lote_id INTO ln;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lb,'Sintetica',1,2,rawb,'importada') RETURNING importacao_linha_id INTO ib;
  -- Posicao muda; somente o ID explicitamente escolhido determina a comparacao.
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
    VALUES(ln,'Sintetica',1,37,rawn) RETURNING importacao_linha_id INTO inovo;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(ib,'paciente',paciente_id_teste,'criado'),(ib,'atendimento',atendimento_id_teste,'criado');
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  fonte:=revisao_registrar_fonte('preparacao-fonte',lb);
  au:=revisao_conceder_autorizacao(fonte,ator); auoutro:=revisao_conceder_autorizacao(fonte,outro);
  RESET ROLE;
  q:=format('SELECT revisao_preparar(%s,%s,%s,%L,%%s)',fonte,lb,ln,ht);
  SELECT count(*) INTO antes FROM importacao_revisao;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  PERFORM pg_temp.recusar_preparacao(format(q,au)); -- Transformacao ausente.
  RESET ROLE;
  IF (SELECT count(*) FROM importacao_revisao)<>antes THEN RAISE EXCEPTION 'Preparacao parcial persistiu'; END IF;
  INSERT INTO revisao_artefato(sha256,tipo,versao,conteudo) VALUES(ht,'transformacoes','sint-v1',transformacoes);
  SET LOCAL ROLE ambulatorio_revisao_servico;
  PERFORM pg_temp.recusar_preparacao(format(q,auoutro));
  RESET ROLE;
  -- Erro depois de conferir a base: a nova celula nao pode inventar sua chave.
  BEGIN
    UPDATE importacao_linha SET dados_brutos=jsonb_set(rawn,'{1,chave}','"chave_adulterada"') WHERE importacao_linha_id=inovo;
    SET LOCAL ROLE ambulatorio_revisao_servico;
    PERFORM revisao_preparar(fonte,lb,ln,ht,au);
    RAISE EXCEPTION 'Bruto adulterado aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'revisao_bruto_incompativel' THEN RAISE; END IF;
  END;
  IF (SELECT count(*) FROM importacao_revisao)<>antes THEN RAISE EXCEPTION 'Revisao parcial persistiu'; END IF;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  revisao:=revisao_preparar(fonte,lb,ln,ht,au);
  IF revisao_recuperar_artefato(revisao,au,'manifesto_base')<>mb::text
    OR revisao_recuperar_artefato(revisao,au,'manifesto_revisado')<>mn::text
    OR revisao_recuperar_artefato(revisao,au,'transformacoes')<>transformacoes THEN
    RAISE EXCEPTION 'Artefatos irrecuperaveis';
  END IF;
  PERFORM pg_temp.recusar_preparacao(format('SELECT revisao_recuperar_artefato(%s,%s,''senha_hash'')',revisao,au));
  PERFORM pg_temp.recusar_preparacao(format('SELECT revisao_recuperar_artefato(%s,%s,''transformacoes'')',revisao,auoutro));
  PERFORM pg_temp.recusar_preparacao(format('SELECT * FROM revisao_comparar_linhas(%s,%s,%s,%s)',revisao,inovo,ib,au));
  SELECT jsonb_agg(to_jsonb(c) ORDER BY c.chave) INTO comparacao FROM revisao_comparar_linhas(revisao,ib,inovo,au) c;
  IF jsonb_array_length(comparacao)<>4 OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(comparacao) c
      WHERE c->>'chave'='nome' AND c->>'alterado'='false')
    OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(comparacao) c WHERE c->>'chave'='legado'
      AND c->>'estado_base'='valor' AND c->>'estado_proposto'='coluna_ausente' AND c->>'alterado'='true')
    OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(comparacao) c WHERE c->>'chave'='novo'
      AND c->>'estado_base'='coluna_ausente' AND c->>'estado_proposto'='celula_vazia')
    OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(comparacao) c WHERE c->>'chave'='observacao'
      AND c->>'estado_base'='valor' AND c->>'estado_proposto'='celula_vazia') THEN
    RAISE EXCEPTION 'Comparacao perdeu ausencia/vazio/valor ou alinhou por posicao';
  END IF;
  IF EXISTS (SELECT 1 FROM revisao_comparar_linhas(revisao,NULL,inovo,au) WHERE estado_base<>'linha_ausente') THEN
    RAISE EXCEPTION 'Linha ausente confundida com celula vazia';
  END IF;
  RESET ROLE;
  SELECT last_value INTO seq_antes FROM importacao_revisao_revisao_id_seq;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  PERFORM * FROM revisao_comparar_linhas(revisao,ib,inovo,au);
  RESET ROLE;
  SELECT last_value INTO seq_depois FROM importacao_revisao_revisao_id_seq;
  IF seq_antes<>seq_depois OR (SELECT count(*) FROM importacao_revisao)<>antes+1
    OR NOT EXISTS(SELECT 1 FROM importacao_revisao_preparacao p WHERE p.revisao_id=revisao
      AND p.preparada_por_usuario_id=ator AND p.autorizacao_id=au AND p.transformacoes_sha256=ht)
    OR EXISTS(SELECT 1 FROM importacao_revisao_aplicacao) THEN RAISE EXCEPTION 'Preparacao tem efeitos indevidos'; END IF;
  INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao)
    VALUES('paciente','nome','paciente_id','character varying(255)','v1') RETURNING campo_id INTO campo;
  envelope:=auditoria_envelope(to_jsonb('Paciente preparacao sintetico'::text),'character varying(255)');
  plano:=jsonb_build_array(jsonb_build_object('campoId',campo,'registroId',paciente_id_teste,'alvoChave','paciente',
    'chaveSemantica','nome','blocoFuncional','cadastro','ocorrencia',1,'categoria','sem_mudanca','operacao','associar',
    'base',envelope,'proposto',envelope));
  SET LOCAL ROLE ambulatorio_revisao_servico;
  PERFORM pg_temp.recusar_preparacao(format('SELECT revisao_publicar_decisao(%s,%s,%s,%s,%s,%s,''autorizar'',''Omissao sintetica'',%L)',
    revisao,inovo,ib,paciente_id_teste,atendimento_id_teste,au,plano),'23514','revisao_campos_alterados_omitidos');
  RESET ROLE;
  PERFORM pg_temp.recusar_preparacao(format('UPDATE revisao_artefato SET versao=''alterada'' WHERE sha256=%L',ht));
  PERFORM pg_temp.recusar_preparacao(format('DELETE FROM importacao_revisao_preparacao WHERE revisao_id=%s',revisao));
  PERFORM pg_temp.recusar_preparacao(format('INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos) VALUES(%s,''Sintetica'',1,99,%L)',ln,rawn));
  FOREACH papel IN ARRAY ARRAY['ambulatorio_importador','ambulatorio_aplicacao','ambulatorio_revisao_gestor','ambulatorio_revisao_servico'] LOOP
    IF has_table_privilege(papel,'revisao_artefato','SELECT,INSERT,UPDATE,DELETE')
      OR has_table_privilege(papel,'importacao_revisao_preparacao','SELECT,INSERT,UPDATE,DELETE')
      OR has_function_privilege(papel,'revisao_conferir_manifesto(bigint,text)','EXECUTE') THEN
      RAISE EXCEPTION 'Artefato ou rotina privada exposta';
    END IF;
  END LOOP;
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  PERFORM revisao_revogar_autorizacao(au);
  SET LOCAL ROLE ambulatorio_revisao_servico;
  PERFORM pg_temp.recusar_preparacao(format('SELECT * FROM revisao_comparar_linhas(%s,%s,%s,%s)',revisao,ib,inovo,au));
  RESET ROLE;
  RAISE NOTICE 'OK: artefatos exatos, autoria, autorizacao, bruto completo, diff exaustivo, imutabilidade e isolamento';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
