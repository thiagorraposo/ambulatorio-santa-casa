-- Publicacao atomica/canonica e autoria; nao cobre executor ou ativacao.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
CREATE FUNCTION pg_temp.deve_recusar(comando text,estado text DEFAULT '23514') RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  BEGIN
    EXECUTE comando;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE=estado THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Plano invalido foi aceito';
END $$;
DO $$
DECLARE u bigint; outro bigint; p bigint; atid bigint; la bigint; lb bigint; linhaa bigint; linhab bigint;
  fonte bigint; revisao bigint; au bigint; auoutro bigint; auexp bigint; campo1 bigint; campo2 bigint;
  d bigint; sucessor bigint; hash1 text; hash2 text; v1 jsonb; v2 jsonb; campos jsonb; reverso jsonb; item jsonb;
  chamada text; antes bigint; campos_antes bigint;
  bruto jsonb; manifesto jsonb; transformacoes jsonb; hm text; ht text;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Publicador sintetico','publicador@example.invalid',
     '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO u;
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Outro publicador sintetico','outro.publicador@example.invalid',
     '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','edicao') RETURNING usuario_id INTO outro;
  INSERT INTO paciente(nome,sexo) VALUES('Paciente plano sintetico','feminino') RETURNING paciente_id INTO p;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(p,'2026-01-01') RETURNING atendimento_id INTO atid;
  bruto:='[{"posicao":"A","cabecalho":"Nome","chave":"nome","bloco":"cadastro","ocorrencia":1,"valor":"Paciente plano sintetico"},
    {"posicao":"B","cabecalho":"Sexo","chave":"sexo","bloco":"cadastro","ocorrencia":1,"valor":"feminino"}]';
  SELECT jsonb_build_object('versao','publicacao-v1','layout_versao','v1','sheets',jsonb_build_array(
    jsonb_build_object('aba_nome_original','Sintetica','aba_ordem',1,'columns',jsonb_agg(jsonb_build_object(
      'posicao_fisica',x->'posicao','cabecalho_original',x->'cabecalho','chave_semantica',x->'chave',
      'bloco_funcional',x->'bloco','ocorrencia',x->'ocorrencia') ORDER BY x->>'posicao'))))
    INTO manifesto FROM jsonb_array_elements(bruto) x;
  transformacoes:='{"formato":"revisao-transformacoes/v1","regras":[
    {"chave":"nome","bloco":"cadastro","ocorrencia":1,"tabela":"paciente","coluna":"nome","transformacao":"texto"},
    {"chave":"sexo","bloco":"cadastro","ocorrencia":1,"tabela":"paciente","coluna":"sexo","transformacao":"texto"}]}';
  hm:=encode(sha256(convert_to(manifesto::text,'UTF8')),'hex'); ht:=encode(sha256(convert_to(transformacoes::text,'UTF8')),'hex');
  INSERT INTO revisao_artefato(sha256,tipo,versao,conteudo)
    VALUES(hm,'manifesto','publicacao-v1',manifesto::text),(ht,'transformacoes','publicacao-v1',transformacoes::text);
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git)
    VALUES('publicacao-base',repeat('3',64),'v1','concluido',hm,'1.5.0','abcdef0') RETURNING importacao_lote_id INTO la;
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git)
    VALUES('publicacao-revisado',repeat('4',64),'v1','pronto',hm,'1.5.0','abcdef0') RETURNING importacao_lote_id INTO lb;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(la,'Sintetica',1,2,bruto,'importada') RETURNING importacao_linha_id INTO linhaa;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
    VALUES(lb,'Sintetica',1,2,bruto) RETURNING importacao_linha_id INTO linhab;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linhaa,'paciente',p,'criado'),(linhaa,'atendimento',atid,'criado');
  INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao)
    VALUES('paciente','nome','paciente_id','character varying(255)','v1') RETURNING campo_id INTO campo1;
  INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao)
    VALUES('paciente','sexo','paciente_id','character varying(30)','v1') RETURNING campo_id INTO campo2;
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(u);
  RESET ROLE;
  INSERT INTO importacao_revisao_gestor(usuario_id) VALUES(u);
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  fonte:=revisao_registrar_fonte('fonte-publicacao',la);
  au:=revisao_conceder_autorizacao(fonte,u);
  auoutro:=revisao_conceder_autorizacao(fonte,outro);
  SET LOCAL ROLE ambulatorio_revisao_servico;
  revisao:=revisao_preparar(fonte,la,lb,ht,au);
  RESET ROLE;
  v1:=auditoria_envelope(to_jsonb('Paciente plano sintetico'::text),'character varying(255)');
  v2:=auditoria_envelope(to_jsonb('feminino'::text),'character varying(30)');
  campos:=jsonb_build_array(
    jsonb_build_object('campoId',campo1,'registroId',p,'alvoChave','paciente','chaveSemantica','nome',
      'blocoFuncional','cadastro','ocorrencia',1,'categoria','sem_mudanca','operacao','associar','base',v1,'proposto',v1),
    jsonb_build_object('campoId',campo2,'registroId',p,'alvoChave','paciente','chaveSemantica','sexo',
      'blocoFuncional','cadastro','ocorrencia',1,'categoria','sem_mudanca','operacao','associar','base',v2,'proposto',v2));
  chamada:=format('SELECT revisao_publicar_decisao(%s,%s,%s,%s,%s,%%s,''autorizar'',''Associacao sintetica'',%%L)',
    revisao,linhab,linhaa,p,atid);
  SELECT count(*) INTO antes FROM importacao_revisao_decisao;
  SELECT count(*) INTO campos_antes FROM importacao_revisao_campo;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  PERFORM pg_temp.deve_recusar(format(chamada,auoutro,campos));
  -- O mesmo plano nao pode confiar em snapshot/token fornecido pelo cliente.
  PERFORM pg_temp.deve_recusar(format(chamada,au,jsonb_build_array(campos->0||'{"atualAvaliado":{}}')));
  PERFORM pg_temp.deve_recusar(format(chamada,au,'[]'::jsonb));
  -- A porta publica rejeita o valor adulterado antes de publicar metadados.
  PERFORM pg_temp.deve_recusar(format(chamada,au,jsonb_set(campos,'{1,base,tipo_sql}','"date"')));
  RESET ROLE;
  -- O mantenedor testa ainda a atomicidade da primitiva privada: o segundo
  -- campo falha na integridade diferida depois de inserir o primeiro.
  PERFORM pg_temp.deve_recusar(format(replace(chamada,'revisao_publicar_decisao(',
    'revisao_publicar_decisao_interna('),au,jsonb_set(campos,'{1,base,tipo_sql}','"date"')));
  IF (SELECT count(*) FROM importacao_revisao_decisao)<>antes
    OR (SELECT count(*) FROM importacao_revisao_campo)<>campos_antes THEN
    RAISE EXCEPTION 'Falha tardia deixou cabecalho ou campo parcial';
  END IF;
  BEGIN
    SET LOCAL ROLE ambulatorio_revisao_servico;
    d:=revisao_publicar_decisao(revisao,linhab,linhaa,p,atid,au,'autorizar','Associacao sintetica',campos);
    RESET ROLE;
    SELECT plano_sha256 INTO hash1 FROM importacao_revisao_decisao WHERE decisao_id=d;
    RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='rollback_de_comparacao_sintetica';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
  IF (SELECT count(*) FROM importacao_revisao_decisao)<>antes
    OR (SELECT count(*) FROM importacao_revisao_campo)<>campos_antes THEN
    RAISE EXCEPTION 'Plano parcial persistiu';
  END IF;
  reverso:='[]';
  FOR item IN SELECT value FROM jsonb_array_elements(campos) WITH ORDINALITY AS x(value,n) ORDER BY n DESC LOOP
    reverso:=reverso||jsonb_build_array(item||jsonb_build_object('campoId',item->>'campoId',
      'registroId',item->>'registroId','ocorrencia',item->>'ocorrencia'));
  END LOOP;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  d:=revisao_publicar_decisao(revisao,linhab,linhaa,p,atid,au,'autorizar','Associacao sintetica',reverso);
  RESET ROLE;
  SELECT plano_sha256 INTO hash2 FROM importacao_revisao_decisao WHERE decisao_id=d;
  IF hash1<>hash2 OR hash2!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Hash nao canonico'; END IF;
  IF NOT EXISTS(SELECT 1 FROM importacao_revisao_decisao WHERE decisao_id=d AND decidida_por_usuario_id=u)
    OR (SELECT count(*) FROM importacao_revisao_campo WHERE decisao_id=d)<>2
    OR EXISTS(SELECT 1 FROM importacao_revisao_campo WHERE decisao_id=d AND
      (cobertura_historica<>'desconhecida' OR ultimo_evento_avaliado_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'Plano nao atribuivel ou historia inventada';
  END IF;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  PERFORM pg_temp.deve_recusar(format(chamada,au,campos));
  PERFORM pg_temp.deve_recusar(format('SELECT revisao_publicar_decisao(%s,%s,%s,%s,%s,%s,''autorizar'',''Correcao bloqueada'',%L,%s)',
    revisao,linhab,linhaa,p,atid,au,jsonb_build_array(campos->0||'{"operacao":"definir","categoria":"correcao_ocorrencia"}'),d));
  sucessor:=revisao_publicar_decisao(revisao,linhab,linhaa,p,atid,au,'bloquear','Bloqueio sintetico','[]',d);
  RESET ROLE;
  IF NOT EXISTS(SELECT 1 FROM importacao_revisao_decisao WHERE decisao_id=sucessor AND decisao_anterior_id=d AND versao_decisao=2)
    OR (SELECT nome FROM paciente WHERE paciente_id=p)<>'Paciente plano sintetico' THEN RAISE EXCEPTION 'Versao ou fato alterado'; END IF;
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  PERFORM revisao_revogar_autorizacao(au);
  auexp:=revisao_conceder_autorizacao(fonte,u,clock_timestamp()+interval '25 milliseconds');
  PERFORM pg_sleep(0.05);
  SET LOCAL ROLE ambulatorio_revisao_servico;
  PERFORM pg_temp.deve_recusar(format('SELECT revisao_publicar_decisao(%s,%s,%s,%s,%s,%s,''bloquear'',''Revogada'',''[]'',%s)',
    revisao,linhab,linhaa,p,atid,au,sucessor));
  PERFORM pg_temp.deve_recusar(format('SELECT revisao_publicar_decisao(%s,%s,%s,%s,%s,%s,''bloquear'',''Expirada'',''[]'',%s)',
    revisao,linhab,linhaa,p,atid,auexp,sucessor));
  RESET ROLE;
  IF has_function_privilege('ambulatorio_revisao_servico',
      'revisao_publicar_decisao_interna(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)','EXECUTE')
    OR has_table_privilege('ambulatorio_revisao_servico','importacao_revisao_decisao','SELECT,INSERT,UPDATE')
    OR has_column_privilege('ambulatorio_revisao_owner','usuario_aplicacao','senha_hash','SELECT') THEN
    RAISE EXCEPTION 'Permissao indevida';
  END IF;
  RAISE NOTICE 'OK: publicacao atomica, hash canonico, autoria/autorizacao, sucessao e barreira de captura';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
