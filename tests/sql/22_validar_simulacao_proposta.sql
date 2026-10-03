-- F15/T17: proposta completa sem staging, com snapshot por campo e sem efeito.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE FUNCTION pg_temp.pegada_revisao() RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE objeto record; resumo jsonb:='{}'; valor text;
BEGIN
  FOR objeto IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='ambulatorio' AND c.relkind IN ('r','p') ORDER BY c.relname LOOP
    EXECUTE format('SELECT md5(COALESCE(string_agg(to_jsonb(x)::text,''|'' ORDER BY to_jsonb(x)::text),'''')) FROM ambulatorio.%I x',
      objeto.relname) INTO valor;
    resumo:=resumo||jsonb_build_object('tabela:'||objeto.relname,valor);
  END LOOP;
  FOR objeto IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='ambulatorio' AND c.relkind='S' ORDER BY c.relname LOOP
    EXECUTE format('SELECT last_value::text || '':'' || is_called::text FROM ambulatorio.%I',
      objeto.relname) INTO valor;
    resumo:=resumo||jsonb_build_object('sequencia:'||objeto.relname,valor);
  END LOOP;
  RETURN resumo;
END $$;

DO $$
DECLARE ator bigint; paciente_teste bigint; atendimento_teste bigint; lote bigint;
  linha_base bigint; fonte bigint; autorizacao bigint; campo_nome bigint; campo_sexo bigint;
  campo_data bigint; campo_observacoes bigint; campo_pendencia bigint; bruto jsonb; bruto_visita jsonb;
  manifesto jsonb; manifesto_visita jsonb; regras jsonb; regras_visita jsonb;
  linha jsonb; linha_visita jsonb; proposta jsonb; plano jsonb; plano_visita jsonb;
  manifesto_texto text; regras_texto text; envelope_nome jsonb; envelope_sexo jsonb;
  resposta jsonb; repetida jsonb; obsoleta jsonb; antes jsonb; depois jsonb;
  snapshot text; evento_antes bigint; evento_depois bigint;
  lote_revisado bigint; linha_revisada bigint; revisao bigint;
  hash_manifesto_revisado text; hash_transformacoes text;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Simulador sintetico','simulador.proposta@example.invalid',
     '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao')
    RETURNING usuario_id INTO ator;
  INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao,captura_desde)
    VALUES('paciente','nome','paciente_id','character varying(255)','v1',clock_timestamp())
    RETURNING campo_id INTO campo_nome;
  INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao,captura_desde)
    VALUES('paciente','sexo','paciente_id','character varying(30)','v1',clock_timestamp())
    RETURNING campo_id INTO campo_sexo;
  SELECT campo_id INTO STRICT campo_data FROM auditoria_campo
    WHERE tabela_destino='atendimento' AND coluna_destino='data_atendimento'
      AND coluna_pk='atendimento_id' AND tipo_sql='date' AND captura_desde IS NOT NULL;
  SELECT campo_id INTO STRICT campo_observacoes FROM auditoria_campo
    WHERE tabela_destino='atendimento' AND coluna_destino='observacoes'
      AND coluna_pk='atendimento_id' AND tipo_sql='text' AND captura_desde IS NOT NULL;
  INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao,captura_desde)
    VALUES('pendencia_atendimento','descricao','pendencia_atendimento_id','text','v1',clock_timestamp())
    RETURNING campo_id INTO campo_pendencia;
  INSERT INTO paciente(nome,sexo) VALUES('Paciente proposta sintetica','feminino')
    RETURNING paciente_id INTO paciente_teste;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente_teste,'2026-01-01')
    RETURNING atendimento_id INTO atendimento_teste;
  bruto:='[{"posicao":"A","cabecalho":"Nome","chave":"nome","bloco":"cadastro","ocorrencia":1,"valor":"Paciente proposta sintetica"},
    {"posicao":"B","cabecalho":"Sexo","chave":"sexo","bloco":"cadastro","ocorrencia":1,"valor":"feminino"},
    {"posicao":"C","cabecalho":"Pendencia","chave":"descricao","bloco":"geral","ocorrencia":1,"valor":"Pendencia copiada sintetica"}]';
  SELECT jsonb_build_object('versao','proposta-v1','layout_versao','proposta-v1','sheets',jsonb_build_array(
    jsonb_build_object('aba_nome_original','Sintetica','aba_ordem',1,'columns',jsonb_agg(jsonb_build_object(
      'posicao_fisica',x->'posicao','cabecalho_original',x->'cabecalho','chave_semantica',x->'chave',
      'bloco_funcional',x->'bloco','ocorrencia',x->'ocorrencia') ORDER BY x->>'posicao'))))
    INTO manifesto FROM jsonb_array_elements(bruto) x;
  regras:='{"formato":"revisao-transformacoes/v1","regras":[
    {"chave":"nome","bloco":"cadastro","ocorrencia":1,"tabela":"paciente","coluna":"nome","transformacao":"texto"},
    {"chave":"sexo","bloco":"cadastro","ocorrencia":1,"tabela":"paciente","coluna":"sexo","transformacao":"texto"}]}';
  bruto_visita:=bruto||jsonb_build_array(jsonb_build_object('posicao','D','cabecalho','Data',
    'chave','data_visita','bloco','geral','ocorrencia',1,'valor','05/04/2026'),
    jsonb_build_object('posicao','E','cabecalho','Observacao','chave','observacao_ausente',
      'bloco','geral','ocorrencia',1,'valor',''));
  SELECT jsonb_build_object('versao','proposta-visita-v1','layout_versao','proposta-visita-v1','sheets',jsonb_build_array(
    jsonb_build_object('aba_nome_original','Sintetica','aba_ordem',1,'columns',jsonb_agg(jsonb_build_object(
      'posicao_fisica',x->'posicao','cabecalho_original',x->'cabecalho','chave_semantica',x->'chave',
      'bloco_funcional',x->'bloco','ocorrencia',x->'ocorrencia') ORDER BY x->>'posicao'))))
    INTO manifesto_visita FROM jsonb_array_elements(bruto_visita) x;
  regras_visita:='{"formato":"revisao-transformacoes/v1","regras":[
    {"chave":"data_visita","bloco":"geral","ocorrencia":1,"tabela":"atendimento","coluna":"data_atendimento","transformacao":"data_dd_mm_aaaa"},
    {"chave":"observacao_ausente","bloco":"geral","ocorrencia":1,"tabela":"atendimento","coluna":"observacoes","transformacao":"texto"},
    {"chave":"descricao","bloco":"geral","ocorrencia":1,"tabela":"pendencia_atendimento","coluna":"descricao","transformacao":"texto"}]}';
  manifesto_texto:=manifesto::text; regras_texto:=regras::text;
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,
    manifesto_sha256,importador_versao,revisao_git)
    VALUES('simulacao-proposta-base',repeat('8',64),'proposta-v1','concluido',
      encode(sha256(convert_to(manifesto_texto,'UTF8')),'hex'),'1.5.0','abcdef0')
    RETURNING importacao_lote_id INTO lote;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote,'Sintetica',1,2,bruto,'importada') RETURNING importacao_linha_id INTO linha_base;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha_base,'paciente',paciente_teste,'criado'),
      (linha_base,'atendimento',atendimento_teste,'criado');
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  RESET ROLE;
  INSERT INTO importacao_revisao_gestor(usuario_id) VALUES(ator);
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  fonte:=revisao_registrar_fonte('simulacao-proposta-fonte',lote);
  autorizacao:=revisao_conceder_autorizacao(fonte,ator);
  RESET ROLE;
  envelope_nome:=revisao_transformar_v1('valor',to_jsonb('Paciente proposta sintetica'::text),
    'character varying(255)','texto');
  envelope_sexo:=revisao_transformar_v1('valor',to_jsonb('feminino'::text),
    'character varying(30)','texto');
  plano:=jsonb_build_array(
    jsonb_build_object('campoId',campo_nome,'alvoChave','paciente','registroId',paciente_teste,
      'chaveSemantica','nome','blocoFuncional','cadastro','ocorrencia',1,
      'categoria','sem_mudanca','operacao','associar','base',envelope_nome,'proposto',envelope_nome),
    jsonb_build_object('campoId',campo_sexo,'alvoChave','paciente','registroId',paciente_teste,
      'chaveSemantica','sexo','blocoFuncional','cadastro','ocorrencia',1,
      'categoria','sem_mudanca','operacao','associar','base',envelope_sexo,'proposto',envelope_sexo));
  linha:=jsonb_build_object('linhaBaseId',linha_base,'pacienteId',paciente_teste,
    'atendimentoBaseId',atendimento_teste,'abaNomeOriginal','Sintetica','abaOrdem',1,
    'numeroLinha',10,'dadosBrutos',bruto,'resultado','autorizar','campos',plano);
  proposta:=jsonb_build_object('linhas',jsonb_build_array(linha));
  SELECT evento_id INTO evento_antes FROM auditoria_campo_evento
    WHERE campo_id=campo_nome AND registro_id=paciente_teste ORDER BY versao_campo DESC LIMIT 1;
  IF evento_antes IS NULL THEN RAISE EXCEPTION 'Captura sintetica inicial ausente'; END IF;

  antes:=pg_temp.pegada_revisao();
  SET LOCAL ROLE ambulatorio_revisao_servico;
  resposta:=revisao_simular_proposta(fonte,lote,autorizacao,ator,manifesto_texto,regras_texto,proposta);
  RESET ROLE;
  depois:=pg_temp.pegada_revisao();
  IF depois<>antes OR resposta->>'resultado'<>'apta' OR (resposta->>'quantidadeLinhas')::integer<>1
    OR (resposta->>'aptas')::integer<>1 OR resposta::text LIKE '%Paciente proposta sintetica%'
    OR resposta::text LIKE '%$2b$12$%' THEN
    RAISE EXCEPTION 'Simulacao alterou estado, vazou valor ou nao aceitou proposta valida';
  END IF;
  snapshot:=resposta->'linhas'->0->>'snapshotSha256';
  IF snapshot!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Snapshot ausente'; END IF;
  proposta:=jsonb_build_object('linhas',jsonb_build_array(linha||jsonb_build_object('snapshotSha256',snapshot)));
  SET LOCAL ROLE ambulatorio_revisao_servico;
  repetida:=revisao_simular_proposta(fonte,lote,autorizacao,ator,manifesto_texto,regras_texto,proposta);
  RESET ROLE;
  IF repetida->>'resultado'<>'apta' OR repetida->'linhas'->0->>'snapshotSha256'<>snapshot
    OR pg_temp.pegada_revisao()<>antes THEN
    RAISE EXCEPTION 'Snapshot vigente mudou ou simulacao persistiu';
  END IF;

  SET LOCAL ROLE ambulatorio_revisao_servico;
  resposta:=revisao_simular_proposta(fonte,lote,autorizacao,ator,manifesto_texto,regras_texto,
    jsonb_build_object('linhas',jsonb_build_array(
      jsonb_set(jsonb_set(linha,'{dadosBrutos,0,valor}','"Nome alterado sintetico"'),'{campos}','[]'::jsonb))));
  RESET ROLE;
  IF resposta->>'resultado'<>'conflito'
    OR resposta->'linhas'->0->>'codigo'<>'revisao_campos_alterados_omitidos'
    OR pg_temp.pegada_revisao()<>antes THEN
    RAISE EXCEPTION 'Campo alterado omitido foi aceito ou houve persistencia';
  END IF;

  SET LOCAL ROLE ambulatorio_revisao_servico;
  BEGIN
    PERFORM revisao_simular_proposta(fonte,lote,autorizacao,ator,'{',regras_texto,proposta);
    RAISE EXCEPTION 'Artefato invalido aceito';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM LIKE '%Paciente proposta sintetica%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM revisao_simular_proposta(fonte,lote,autorizacao,ator,manifesto_texto,regras_texto,
      jsonb_build_object('linhas',jsonb_build_array(jsonb_set(linha,'{resultado}','null'::jsonb))));
    RAISE EXCEPTION 'Resultado nulo aceito';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RESET ROLE;
  IF pg_temp.pegada_revisao()<>antes THEN RAISE EXCEPTION 'Erro de simulacao persistiu estado'; END IF;

  -- Data vazia nao cria comparecimento, mesmo quando o restante da proposta e valido.
  plano_visita:=jsonb_build_array(jsonb_build_object('campoId',campo_data,
    'alvoChave','visita','registroId',NULL,'chaveSemantica','data_visita',
    'blocoFuncional','geral','ocorrencia',1,'categoria','nova_visita','operacao','criar',
    'base',revisao_transformar_v1('coluna_ausente','null'::jsonb,'date','data_dd_mm_aaaa'),
    'proposto',revisao_transformar_v1('celula_vazia','""'::jsonb,'date','data_dd_mm_aaaa')));
  plano_visita:=plano_visita||jsonb_build_array(jsonb_build_object('campoId',campo_observacoes,
    'alvoChave','visita','registroId',NULL,'chaveSemantica','observacao_ausente',
    'blocoFuncional','geral','ocorrencia',1,'categoria','nova_visita','operacao','criar',
    'base',revisao_transformar_v1('coluna_ausente','null'::jsonb,'text','texto'),
    'proposto',revisao_transformar_v1('celula_vazia','""'::jsonb,'text','texto')));
  linha_visita:=linha||jsonb_build_object('atendimentoBaseId',NULL,
    'dadosBrutos',jsonb_set(bruto_visita,'{3,valor}','""'::jsonb),'campos',plano_visita);
  SET LOCAL ROLE ambulatorio_revisao_servico;
  resposta:=revisao_simular_proposta(fonte,lote,autorizacao,ator,manifesto_visita::text,
    regras_visita::text,jsonb_build_object('linhas',jsonb_build_array(linha_visita)));
  RESET ROLE;
  IF resposta->>'resultado'<>'conflito'
    OR resposta->'linhas'->0->>'codigo'<>'revisao_visita_exige_data_completa'
    OR pg_temp.pegada_revisao()<>antes THEN
    RAISE EXCEPTION 'Visita sem data completa foi aceita ou persistida: %',resposta;
  END IF;

  -- Nova visita comprovada tem alvo virtual, data completa e nenhum ID reservado.
  plano_visita:=jsonb_build_array(jsonb_build_object('campoId',campo_data,
    'alvoChave','visita','registroId',NULL,'chaveSemantica','data_visita',
    'blocoFuncional','geral','ocorrencia',1,'categoria','nova_visita','operacao','criar',
    'base',revisao_transformar_v1('coluna_ausente','null'::jsonb,'date','data_dd_mm_aaaa'),
    'proposto',revisao_transformar_v1('valor',to_jsonb('05/04/2026'::text),'date','data_dd_mm_aaaa')));
  -- Cada campo habilitado da visita deve constar do plano, inclusive ausencia.
  plano_visita:=plano_visita||jsonb_build_array(jsonb_build_object('campoId',campo_observacoes,
    'alvoChave','visita','registroId',NULL,'chaveSemantica','observacao_ausente',
    'blocoFuncional','geral','ocorrencia',1,'categoria','nova_visita','operacao','criar',
    'base',revisao_transformar_v1('coluna_ausente','null'::jsonb,'text','texto'),
    'proposto',revisao_transformar_v1('celula_vazia','""'::jsonb,'text','texto')));
  linha_visita:=linha||jsonb_build_object('atendimentoBaseId',NULL,
    'dadosBrutos',bruto_visita,'campos',plano_visita);
  SET LOCAL ROLE ambulatorio_revisao_servico;
  resposta:=revisao_simular_proposta(fonte,lote,autorizacao,ator,manifesto_visita::text,
    regras_visita::text,jsonb_build_object('linhas',jsonb_build_array(linha_visita)));
  RESET ROLE;
  IF resposta->>'resultado'<>'apta' OR (resposta->'linhas'->0->>'alvosNovos')::integer<>1
    OR pg_temp.pegada_revisao()<>antes THEN
    RAISE EXCEPTION 'Nova visita comprovada nao foi simulada sem reservar ID';
  END IF;

  -- A pendencia copiada do bruto anterior nao comprova outra ocorrencia.
  plano_visita:=plano_visita||jsonb_build_array(jsonb_build_object('campoId',campo_pendencia,
    'alvoChave','pendencia-copiada',
    'registroId',NULL,'chaveSemantica','descricao','blocoFuncional','geral',
    'ocorrencia',1,'categoria','nova_visita','operacao','criar',
    'base',revisao_transformar_v1('valor',to_jsonb('Pendencia copiada sintetica'::text),'text','texto'),
    'proposto',revisao_transformar_v1('valor',to_jsonb('Pendencia copiada sintetica'::text),'text','texto')));
  linha_visita:=linha||jsonb_build_object('atendimentoBaseId',NULL,
    'dadosBrutos',bruto_visita,'campos',plano_visita);
  SET LOCAL ROLE ambulatorio_revisao_servico;
  resposta:=revisao_simular_proposta(fonte,lote,autorizacao,ator,manifesto_visita::text,
    regras_visita::text,jsonb_build_object('linhas',jsonb_build_array(linha_visita)));
  RESET ROLE;
  IF resposta->>'resultado'<>'conflito'
    OR resposta->'linhas'->0->>'codigo'<>'revisao_ocorrencia_sem_identidade'
    OR pg_temp.pegada_revisao()<>antes THEN
    RAISE EXCEPTION 'Pendencia copiada sem identidade foi aceita ou persistida';
  END IF;

  UPDATE paciente SET nome='Nome transitorio sintetico' WHERE paciente_id=paciente_teste;
  UPDATE paciente SET nome='Paciente proposta sintetica' WHERE paciente_id=paciente_teste;
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT evento_id INTO evento_depois FROM auditoria_campo_evento
    WHERE campo_id=campo_nome AND registro_id=paciente_teste ORDER BY versao_campo DESC LIMIT 1;
  IF evento_depois=evento_antes THEN RAISE EXCEPTION 'A-B-A nao alterou token'; END IF;
  antes:=pg_temp.pegada_revisao();
  SET LOCAL ROLE ambulatorio_revisao_servico;
  obsoleta:=revisao_simular_proposta(fonte,lote,autorizacao,ator,manifesto_texto,regras_texto,proposta);
  RESET ROLE;
  IF obsoleta->>'resultado'<>'obsoleta'
    OR obsoleta->'linhas'->0->>'codigo'<>'revisao_snapshot_obsoleto'
    OR obsoleta->'linhas'->0->>'snapshotSha256'=snapshot
    OR pg_temp.pegada_revisao()<>antes THEN
    RAISE EXCEPTION 'Edicao A-B-A do primeiro campo nao invalidou o snapshot';
  END IF;

  -- A mesma pendencia copiada e recusada na publicacao, sem depender do dry-run.
  hash_manifesto_revisado:=encode(sha256(convert_to(manifesto_visita::text,'UTF8')),'hex');
  hash_transformacoes:=encode(sha256(convert_to(regras_visita::text,'UTF8')),'hex');
  INSERT INTO revisao_artefato(sha256,tipo,versao,conteudo) VALUES
    (encode(sha256(convert_to(manifesto_texto,'UTF8')),'hex'),'manifesto','proposta-v1',manifesto_texto),
    (hash_manifesto_revisado,'manifesto','proposta-visita-v1',manifesto_visita::text),
    (hash_transformacoes,'transformacoes','proposta-t18-v1',regras_visita::text);
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,
    manifesto_sha256,importador_versao,revisao_git)
    VALUES('simulacao-proposta-revisada',repeat('9',64),'proposta-visita-v1','pronto',
      hash_manifesto_revisado,'1.5.0','abcdef0') RETURNING importacao_lote_id INTO lote_revisado;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
    VALUES(lote_revisado,'Sintetica',1,10,bruto_visita) RETURNING importacao_linha_id INTO linha_revisada;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  revisao:=revisao_preparar(fonte,lote,lote_revisado,hash_transformacoes,autorizacao);
  BEGIN
    PERFORM revisao_publicar_decisao(revisao,linha_revisada,linha_base,paciente_teste,NULL,
      autorizacao,'autorizar','Pendencia copiada sem nova identidade sintetica',plano_visita);
    RAISE EXCEPTION 'Plano copiado foi publicado';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'revisao_ocorrencia_sem_identidade' THEN RAISE; END IF;
  END;
  RESET ROLE;
  RAISE NOTICE 'OK: proposta pre-staging, plano completo, erros tecnicos, snapshot A-B-A e zero efeito';
END $$;

SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
