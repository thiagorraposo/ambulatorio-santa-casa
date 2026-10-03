-- T10/T18 na fronteira de publicacao/aplicacao, com dados exclusivamente sinteticos.
-- A transacao e revertida; nenhuma ausencia implica UPDATE/DELETE clinico.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE FUNCTION pg_temp.manifesto_t10_t18(bruto jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object('versao','t10-t18-v1','layout_versao','t10-t18-v1','sheets',jsonb_build_array(
    jsonb_build_object('aba_nome_original','Sintetica','aba_ordem',1,'columns',jsonb_agg(
      jsonb_build_object('posicao_fisica',x->'posicao','cabecalho_original',x->'cabecalho',
        'chave_semantica',x->'chave','bloco_funcional',x->'bloco','ocorrencia',x->'ocorrencia')
      ORDER BY n))))
  FROM jsonb_array_elements(bruto) WITH ORDINALITY AS a(x,n)
$$;

DO $$
DECLARE ator bigint; p1 bigint; p_removido bigint; p_t18 bigint;
  at1 bigint; at_removido bigint; at_t18 bigint; pendencia bigint;
  campo_nome bigint; campo_pendencia bigint;
  base jsonb; rev_vazio jsonb; rev_t18 jsonb; manifesto_base jsonb; manifesto_rev jsonb;
  regras text; h_base text; h_rev text; h_regras text; lote_base bigint; lote_rev bigint;
  linha_base1 bigint; linha_base2 bigint; linha_base3 bigint; linha_rev1 bigint; linha_rev3 bigint;
  fonte bigint; autorizacao bigint; revisao bigint; decisao_t10 bigint; decisao_t18 bigint;
  env_nome_base jsonb; env_nome_vazio jsonb;
  env_nome_t18 jsonb; env_pendencia jsonb; plano_t10 jsonb; plano_t18 jsonb;
  resposta jsonb; antes jsonb; depois jsonb; aplicacoes_antes bigint; eventos_nome_antes bigint;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil)
    VALUES('Revisor T10 T18 sintetico','t10.t18@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao')
    RETURNING usuario_id INTO ator;
  INSERT INTO paciente(nome) VALUES('Paciente T10 sintetico') RETURNING paciente_id INTO p1;
  INSERT INTO paciente(nome) VALUES('Paciente removido sintetico') RETURNING paciente_id INTO p_removido;
  INSERT INTO paciente(nome) VALUES('Paciente T18 sintetico') RETURNING paciente_id INTO p_t18;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(p1,'2026-02-01') RETURNING atendimento_id INTO at1;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(p_removido,'2026-02-02') RETURNING atendimento_id INTO at_removido;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(p_t18,'2026-02-03') RETURNING atendimento_id INTO at_t18;
  INSERT INTO pendencia_atendimento(atendimento_id,descricao)
    VALUES(at_t18,'Pendencia copiada sintetica') RETURNING pendencia_atendimento_id INTO pendencia;

  INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,
      serializacao_versao,captura_desde)
    VALUES('paciente','nome','paciente_id','character varying(255)','v1',clock_timestamp())
    RETURNING campo_id INTO campo_nome;
  INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,
      serializacao_versao,captura_desde)
    VALUES('pendencia_atendimento','descricao','pendencia_atendimento_id','text','v1',clock_timestamp())
    RETURNING campo_id INTO campo_pendencia;

  base:=jsonb_build_array(
    jsonb_build_object('posicao','A','cabecalho','Nome','chave','nome','bloco','cadastro','ocorrencia',1,'valor','Paciente T10 sintetico'),
    jsonb_build_object('posicao','B','cabecalho','Pendencia','chave','descricao_pendencia','bloco','geral','ocorrencia',1,'valor',''));
  rev_vazio:=jsonb_set(base,'{0,valor}','""'::jsonb);
  rev_t18:=jsonb_build_array(
    jsonb_build_object('posicao','A','cabecalho','Nome','chave','nome','bloco','cadastro','ocorrencia',1,'valor','Paciente T18 sintetico'),
    jsonb_build_object('posicao','B','cabecalho','Pendencia','chave','descricao_pendencia','bloco','geral','ocorrencia',1,'valor','Pendencia copiada sintetica'));
  manifesto_base:=pg_temp.manifesto_t10_t18(base);
  manifesto_rev:=pg_temp.manifesto_t10_t18(rev_vazio);
  h_base:=encode(sha256(convert_to(manifesto_base::text,'UTF8')),'hex');
  h_rev:=encode(sha256(convert_to(manifesto_rev::text,'UTF8')),'hex');
  regras:='{"formato":"revisao-transformacoes/v1","regras":[
    {"chave":"nome","bloco":"cadastro","ocorrencia":1,"tabela":"paciente","coluna":"nome","transformacao":"texto"},
    {"chave":"descricao_pendencia","bloco":"geral","ocorrencia":1,"tabela":"pendencia_atendimento","coluna":"descricao","transformacao":"texto"}]}';
  h_regras:=encode(sha256(convert_to(regras,'UTF8')),'hex');
  INSERT INTO revisao_artefato(sha256,tipo,versao,conteudo) VALUES
    (h_base,'manifesto','t10-t18-v1',manifesto_base::text),
    (h_rev,'manifesto','t10-t18-v1',manifesto_rev::text),
    (h_regras,'transformacoes','t10-t18-v1',regras)
    ON CONFLICT (sha256) DO NOTHING;

  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,
      manifesto_sha256,importador_versao,revisao_git)
    VALUES('t10-t18-base',repeat('c',64),'t10-t18-v1','concluido',h_base,'1.7.0','abcdef0')
    RETURNING importacao_lote_id INTO lote_base;
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,
      manifesto_sha256,importador_versao,revisao_git)
    VALUES('t10-t18-revisado',repeat('d',64),'t10-t18-v1','pronto',h_rev,'1.7.0','abcdef0')
    RETURNING importacao_lote_id INTO lote_rev;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote_base,'Sintetica',1,2,base,'importada') RETURNING importacao_linha_id INTO linha_base1;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote_base,'Sintetica',1,3,jsonb_set(base,'{0,valor}','"Paciente removido sintetico"'),'importada')
    RETURNING importacao_linha_id INTO linha_base2;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote_base,'Sintetica',1,4,rev_t18,'importada') RETURNING importacao_linha_id INTO linha_base3;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
    VALUES(lote_rev,'Sintetica',1,20,rev_vazio) RETURNING importacao_linha_id INTO linha_rev1;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
    VALUES(lote_rev,'Sintetica',1,22,rev_t18) RETURNING importacao_linha_id INTO linha_rev3;
  -- linha_base2 foi removida do lote revisado; seus destinos continuam existentes.
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha_base1,'paciente',p1,'criado'),
      (linha_base1,'atendimento',at1,'criado'),
      (linha_base2,'paciente',p_removido,'criado'),
      (linha_base2,'atendimento',at_removido,'criado'),
      (linha_base3,'paciente',p_t18,'criado'),
      (linha_base3,'atendimento',at_t18,'criado'),
      (linha_base3,'pendencia_atendimento',pendencia,'criado');

  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  RESET ROLE;
  INSERT INTO importacao_revisao_gestor(usuario_id) VALUES(ator);
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  fonte:=revisao_registrar_fonte('t10-t18-fonte',lote_base);
  autorizacao:=revisao_conceder_autorizacao(fonte,ator);
  RESET ROLE;

  SET LOCAL ROLE ambulatorio_revisao_servico;
  revisao:=revisao_preparar(fonte,lote_base,lote_rev,h_regras,autorizacao);
  RESET ROLE;

  env_nome_base:=revisao_transformar_v1('valor',to_jsonb('Paciente T10 sintetico'::text),'character varying(255)','texto');
  env_nome_vazio:=revisao_transformar_v1('celula_vazia','""'::jsonb,'character varying(255)','texto');
  plano_t10:=jsonb_build_array(jsonb_build_object('campoId',campo_nome,'alvoChave','paciente',
    'registroId',p1,'chaveSemantica','nome','blocoFuncional','cadastro','ocorrencia',1,
    'categoria','sem_mudanca','operacao','conservar','base',env_nome_base,'proposto',env_nome_vazio));
  SET LOCAL ROLE ambulatorio_revisao_servico;
  decisao_t10:=revisao_publicar_decisao(revisao,linha_rev1,linha_base1,p1,at1,autorizacao,
    'autorizar','Conservar valor anterior diante de celula vazia sintetica',plano_t10);
  RESET ROLE;

  -- T18: a proposta tenta criar novamente uma pendencia cujo fato foi copiado
  -- sem alteração de chave/ocorrência entre bruto base e revisado. A barreira
  -- da aplicação está no contrato atual já na publicação: não se contorna.
  env_nome_t18:=revisao_transformar_v1('valor',to_jsonb('Paciente T18 sintetico'::text),'character varying(255)','texto');
  env_pendencia:=revisao_transformar_v1('valor',to_jsonb('Pendencia copiada sintetica'::text),'text','texto');
  plano_t18:=jsonb_build_array(
    jsonb_build_object('campoId',campo_nome,'alvoChave','paciente','registroId',p_t18,
      'chaveSemantica','nome','blocoFuncional','cadastro','ocorrencia',1,'categoria','sem_mudanca',
      'operacao','associar','base',env_nome_t18,'proposto',env_nome_t18),
    jsonb_build_object('campoId',campo_pendencia,'alvoChave','pendencia-copiada',
      'registroId',NULL,'chaveSemantica','descricao_pendencia','blocoFuncional','geral','ocorrencia',1,
      'categoria','atualizacao_consolidada','operacao','criar','base',env_pendencia,'proposto',env_pendencia));
  aplicacoes_antes:=(SELECT count(*) FROM importacao_revisao_aplicacao);
  BEGIN
    SET LOCAL ROLE ambulatorio_revisao_servico;
    decisao_t18:=revisao_publicar_decisao(revisao,linha_rev3,linha_base3,p_t18,at_t18,autorizacao,
      'autorizar','Reproducao sintetica de pendencia sem identidade de ocorrencia',plano_t18);
    RESET ROLE;
    RAISE EXCEPTION 'T18: pendencia copiada sem identidade de ocorrencia foi publicada (decisao %)',decisao_t18;
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'revisao_ocorrencia_sem_identidade' THEN RAISE; END IF;
  END;
  RESET ROLE;
  IF (SELECT count(*) FROM importacao_revisao_decisao WHERE revisao_id=revisao)<>1
    OR (SELECT count(*) FROM importacao_revisao_aplicacao)<>aplicacoes_antes
    OR (SELECT count(*) FROM pendencia_atendimento WHERE pendencia_atendimento_id=pendencia)<>1
    OR (SELECT count(*) FROM pendencia_atendimento WHERE atendimento_id=at_t18
        AND descricao='Pendencia copiada sintetica')<>1
    OR (SELECT count(*) FROM importacao_registro WHERE importacao_linha_id=linha_rev3
        AND tabela_destino='pendencia_atendimento')<>0 THEN
    RAISE EXCEPTION 'T18: bloqueio da ocorrencia copiada teve efeito ou duplicou alvo';
  END IF;

  SELECT jsonb_build_object('nome_t10',(SELECT nome FROM paciente WHERE paciente_id=p1),
      'nome_removido',(SELECT nome FROM paciente WHERE paciente_id=p_removido),
      'pacientes',(SELECT count(*) FROM paciente),
      'pendencias',(SELECT count(*) FROM pendencia_atendimento),
      'aplicacoes',(SELECT count(*) FROM importacao_revisao_aplicacao)) INTO antes;
  SELECT count(*) INTO eventos_nome_antes FROM auditoria_campo_evento
    WHERE campo_id=campo_nome AND registro_id=p1;
  -- A migration mantém EXECUTE revogado para o serviço HTTP (SQL42). Primeiro
  -- prova-se essa fronteira; a chamada owner abaixo testa a rotina privada,
  -- não constitui prova de autorização/ativação do endpoint.
  BEGIN
    SET LOCAL ROLE ambulatorio_revisao_servico;
    PERFORM revisao_aplicar_decisao_interna(decisao_t10,autorizacao);
    RAISE EXCEPTION 'Executor privado ficou executavel pelo papel de servico';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  RESET ROLE;
  -- Chamada privilegiada de integração para testar o efeito da função privada.
  resposta:=revisao_aplicar_decisao_interna(decisao_t10,autorizacao);
  IF resposta->>'resultado'<>'aplicada' OR resposta->>'codigo'<>'revisao_plano_aplicado' THEN
    RAISE EXCEPTION 'T10: executor nao aplicou a decisao explicita de conservar: %',resposta;
  END IF;
  SELECT jsonb_build_object('nome_t10',(SELECT nome FROM paciente WHERE paciente_id=p1),
      'nome_removido',(SELECT nome FROM paciente WHERE paciente_id=p_removido),
      'pacientes',(SELECT count(*) FROM paciente),
      'pendencias',(SELECT count(*) FROM pendencia_atendimento),
      'aplicacoes',(SELECT count(*) FROM importacao_revisao_aplicacao)) INTO depois;
  IF depois->>'nome_t10'<>'Paciente T10 sintetico'
    OR depois->>'nome_removido'<>'Paciente removido sintetico'
    OR (depois->>'pacientes')::bigint<>(antes->>'pacientes')::bigint
    OR (depois->>'pendencias')::bigint<>(antes->>'pendencias')::bigint
    OR (depois->>'aplicacoes')::bigint<>(antes->>'aplicacoes')::bigint+1
    OR NOT EXISTS(SELECT 1 FROM importacao_revisao_aplicacao WHERE decisao_id=decisao_t10 AND resultado='aplicada')
    OR (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=campo_nome AND registro_id=p1)<>eventos_nome_antes THEN
    RAISE EXCEPTION 'T10: vazio/linha removida alterou ou excluiu estado clinico: antes %, depois %',antes,depois;
  END IF;
  IF EXISTS(SELECT 1 FROM importacao_registro WHERE importacao_linha_id=linha_rev1
      AND tabela_destino='paciente' AND registro_id=p_removido) THEN
    RAISE EXCEPTION 'T10: linha removida ganhou proveniencia por aproximacao';
  END IF;

  RAISE NOTICE 'OK: T10 aplicado com conservar nao nulifica nem exclui; linha removida permanece intacta. T18 bloqueado pela barreira de publicacao, antes do executor, com efeito zero.';
END $$;

SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
