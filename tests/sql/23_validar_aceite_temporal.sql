-- Aceite parcial entre hashes: identidade explicita, bruto reordenado e ausencia de inferencia.
-- Todos os valores sao sinteticos; a transacao inteira e revertida.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE FUNCTION pg_temp.manifesto_aceite(bruto jsonb, aba text DEFAULT 'Sintetica')
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object('versao','aceite-v1','layout_versao','aceite-v1','sheets',jsonb_build_array(
    jsonb_build_object('aba_nome_original',aba,'aba_ordem',1,'columns',
      jsonb_agg(jsonb_build_object('posicao_fisica',c->'posicao',
        'cabecalho_original',c->'cabecalho','chave_semantica',c->'chave',
        'bloco_funcional',c->'bloco','ocorrencia',c->'ocorrencia') ORDER BY n))))
  FROM jsonb_array_elements(bruto) WITH ORDINALITY AS x(c,n)
$$;

DO $$
DECLARE ator bigint; v_paciente_id bigint; outro bigint; v_atendimento_id bigint; atendimento_outro bigint;
  campo_nome bigint; campo_data bigint; lote_base bigint; lote_novo bigint;
  linha_base bigint; linha_nova bigint; fonte bigint; autorizacao bigint; revisao bigint;
  decisao bigint; bruto_base jsonb; bruto_novo jsonb; bruto_alterado jsonb;
  manifesto_base jsonb; manifesto_novo jsonb; manifesto_alterado jsonb;
  regras text; hash_regras text; plano jsonb; plano_vazio jsonb; plano_ausente jsonb;
  linha jsonb; resposta jsonb; antes jsonb; depois jsonb; env_nome jsonb; env_data jsonb;
  resultado_aplicacao jsonb; ano text; chave text; posicao integer;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil)
    VALUES('Revisor aceite sintetico','aceite.temporal@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao')
    RETURNING usuario_id INTO ator;
  INSERT INTO paciente(nome) VALUES('Paciente aceite sintetico') RETURNING paciente_id INTO v_paciente_id;
  INSERT INTO paciente(nome) VALUES('Outro paciente aceite sintetico') RETURNING paciente_id INTO outro;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(v_paciente_id,'2026-01-01')
    RETURNING atendimento_id INTO v_atendimento_id;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(outro,'2026-01-01')
    RETURNING atendimento_id INTO atendimento_outro;
  INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao)
    VALUES('paciente','nome','paciente_id','character varying(255)','v1') RETURNING campo_id INTO campo_nome;
  SELECT campo_id INTO STRICT campo_data FROM auditoria_campo
    WHERE tabela_destino='atendimento' AND coluna_destino='data_atendimento'
      AND coluna_pk='atendimento_id' AND tipo_sql='date'
      AND serializacao_versao='v1' AND captura_desde IS NOT NULL;

  bruto_base:=jsonb_build_array(
    jsonb_build_object('posicao','A','cabecalho','Nome','chave','nome','bloco','cadastro','ocorrencia',1,'valor','Paciente aceite sintetico'),
    jsonb_build_object('posicao','B','cabecalho','Data','chave','data_visita','bloco','geral','ocorrencia',1,'valor','01/01/2026'),
    jsonb_build_object('posicao','C','cabecalho','Ultimo ano','chave','ultimo_ano','bloco','geral','ocorrencia',1,'valor','2023'),
    jsonb_build_object('posicao','D','cabecalho','D9','chave','data_planejada','bloco','geral','ocorrencia',1,'valor','10/02/2026'),
    jsonb_build_object('posicao','E','cabecalho','Retorno BZN','chave','retorno_bzn','bloco','geral','ocorrencia',1,'valor','30 dias'));
  -- A antiga posicao A agora contem o ano. A identidade vem da chave semantica
  -- e da ancora explicita, nunca da coluna ou do numero fisico da linha.
  bruto_novo:=jsonb_build_array(
    jsonb_build_object('posicao','A','cabecalho','Ultimo ano','chave','ultimo_ano','bloco','geral','ocorrencia',1,'valor','2023'),
    jsonb_build_object('posicao','B','cabecalho','Nome','chave','nome','bloco','cadastro','ocorrencia',1,'valor','Paciente aceite sintetico'),
    jsonb_build_object('posicao','C','cabecalho','D9','chave','data_planejada','bloco','geral','ocorrencia',1,'valor','10/02/2026'),
    jsonb_build_object('posicao','D','cabecalho','Data','chave','data_visita','bloco','geral','ocorrencia',1,'valor','01/01/2026'),
    jsonb_build_object('posicao','E','cabecalho','Retorno BZN','chave','retorno_bzn','bloco','geral','ocorrencia',1,'valor','30 dias'));
  manifesto_base:=pg_temp.manifesto_aceite(bruto_base);
  manifesto_novo:=pg_temp.manifesto_aceite(bruto_novo);
  regras:='{"formato":"revisao-transformacoes/v1","regras":[
    {"chave":"nome","bloco":"cadastro","ocorrencia":1,"tabela":"paciente","coluna":"nome","transformacao":"texto"},
    {"chave":"data_visita","bloco":"geral","ocorrencia":1,"tabela":"atendimento","coluna":"data_atendimento","transformacao":"data_dd_mm_aaaa"}]}';
  hash_regras:=encode(sha256(convert_to(regras,'UTF8')),'hex');
  INSERT INTO revisao_artefato(sha256,tipo,versao,conteudo) VALUES
    (encode(sha256(convert_to(manifesto_base::text,'UTF8')),'hex'),'manifesto','aceite-v1',manifesto_base::text),
    (encode(sha256(convert_to(manifesto_novo::text,'UTF8')),'hex'),'manifesto','aceite-v1',manifesto_novo::text),
    (hash_regras,'transformacoes','aceite-v1',regras);
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,
    manifesto_sha256,importador_versao,revisao_git)
    VALUES('aceite-temporal-base',repeat('a',64),'aceite-v1','concluido',
      encode(sha256(convert_to(manifesto_base::text,'UTF8')),'hex'),'1.5.0','abcdef0')
    RETURNING importacao_lote_id INTO lote_base;
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,
    manifesto_sha256,importador_versao,revisao_git)
    VALUES('aceite-temporal-reordenado',repeat('b',64),'aceite-v1','pronto',
      encode(sha256(convert_to(manifesto_novo::text,'UTF8')),'hex'),'1.5.0','abcdef0')
    RETURNING importacao_lote_id INTO lote_novo;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote_base,'Sintetica',1,2,bruto_base,'importada') RETURNING importacao_linha_id INTO linha_base;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
    VALUES(lote_novo,'Sintetica',1,44,bruto_novo) RETURNING importacao_linha_id INTO linha_nova;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha_base,'paciente',v_paciente_id,'criado'),(linha_base,'atendimento',v_atendimento_id,'criado');
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  RESET ROLE;
  INSERT INTO importacao_revisao_gestor(usuario_id) VALUES(ator);
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  fonte:=revisao_registrar_fonte('aceite-temporal-fonte',lote_base);
  autorizacao:=revisao_conceder_autorizacao(fonte,ator);
  RESET ROLE;

  env_nome:=revisao_transformar_v1('valor',to_jsonb('Paciente aceite sintetico'::text),'character varying(255)','texto');
  env_data:=revisao_transformar_v1('valor',to_jsonb('01/01/2026'::text),'date','data_dd_mm_aaaa');
  plano:=jsonb_build_array(
    jsonb_build_object('campoId',campo_nome,'alvoChave','paciente','registroId',v_paciente_id,
      'chaveSemantica','nome','blocoFuncional','cadastro','ocorrencia',1,'categoria','sem_mudanca',
      'operacao','associar','base',env_nome,'proposto',env_nome),
    jsonb_build_object('campoId',campo_data,'alvoChave','atendimento','registroId',v_atendimento_id,
      'chaveSemantica','data_visita','blocoFuncional','geral','ocorrencia',1,'categoria','sem_mudanca',
      'operacao','associar','base',env_data,'proposto',env_data));
  linha:=jsonb_build_object('linhaBaseId',linha_base,'pacienteId',v_paciente_id,
    'atendimentoBaseId',v_atendimento_id,'abaNomeOriginal','Sintetica','abaOrdem',1,
    'numeroLinha',44,'dadosBrutos',bruto_novo,'resultado','autorizar','campos',plano);
  IF (SELECT count(*) FROM revisao_comparar_brutos_virtuais(bruto_base,bruto_novo) WHERE alterado)<>0 THEN
    RAISE EXCEPTION 'T03: reordenacao fisica foi interpretada como mudanca clinica'; END IF;
  SELECT jsonb_build_object('pacientes',(SELECT count(*) FROM paciente),
    'atendimentos',(SELECT count(*) FROM atendimento),'dependentes',(SELECT count(*) FROM pendencia_atendimento),
    'aplicacoes',(SELECT count(*) FROM importacao_revisao_aplicacao)) INTO antes;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  resposta:=revisao_simular_proposta(fonte,lote_base,autorizacao,ator,manifesto_novo::text,regras,
    jsonb_build_object('linhas',jsonb_build_array(linha)));
  RESET ROLE;
  IF resposta->>'resultado'<>'apta' OR (resposta->'linhas'->0->>'camposAlterados')::integer<>0
    OR (resposta->'linhas'->0->>'alvosNovos')::integer<>0 THEN
    RAISE EXCEPTION 'T03: mesmos fatos e alvos nao foram reconhecidos'; END IF;

  -- Ano isolado, planejamento D9 e texto de retorno nao criam comparecimento.
  FOREACH ano IN ARRAY ARRAY['2025','2021'] LOOP
    bruto_alterado:=jsonb_set(bruto_novo,'{0,valor}',to_jsonb(ano));
    SET LOCAL ROLE ambulatorio_revisao_servico;
    resposta:=revisao_simular_proposta(fonte,lote_base,autorizacao,ator,manifesto_novo::text,regras,
      jsonb_build_object('linhas',jsonb_build_array(linha||jsonb_build_object('dadosBrutos',bruto_alterado))));
    RESET ROLE;
    IF resposta->>'resultado'<>'conflito' OR resposta->'linhas'->0->>'codigo'<>'revisao_campos_alterados_omitidos' THEN
      RAISE EXCEPTION 'T09/T16: ano nao mapeado produziu plano aplicavel'; END IF;
  END LOOP;
  FOREACH chave IN ARRAY ARRAY['data_planejada','retorno_bzn'] LOOP
    posicao:=CASE chave WHEN 'data_planejada' THEN 2 ELSE 4 END;
    bruto_alterado:=jsonb_set(bruto_novo,ARRAY[posicao::text,'valor'],to_jsonb('Valor novo sintetico'::text));
    SET LOCAL ROLE ambulatorio_revisao_servico;
    resposta:=revisao_simular_proposta(fonte,lote_base,autorizacao,ator,manifesto_novo::text,regras,
      jsonb_build_object('linhas',jsonb_build_array(linha||jsonb_build_object('dadosBrutos',bruto_alterado))));
    RESET ROLE;
    IF resposta->>'resultado'<>'conflito' OR resposta->'linhas'->0->>'codigo'<>'revisao_campos_alterados_omitidos' THEN
      RAISE EXCEPTION 'T16: planejamento ou retorno sem comparecimento foi aceito'; END IF;
  END LOOP;

  -- Apos reuso de posicao, o paciente e atendimento de outra pessoa nao podem
  -- ser descobertos por aproximacao. Sem proveniencia, a linha tambem falha.
  FOREACH chave IN ARRAY ARRAY['pacienteId','atendimentoBaseId','linhaBaseId'] LOOP
    BEGIN
      SET LOCAL ROLE ambulatorio_revisao_servico;
      PERFORM revisao_simular_proposta(fonte,lote_base,autorizacao,ator,manifesto_novo::text,regras,
        jsonb_build_object('linhas',jsonb_build_array(jsonb_set(linha,ARRAY[chave],
          CASE chave WHEN 'pacienteId' THEN to_jsonb(outro)
            WHEN 'atendimentoBaseId' THEN to_jsonb(atendimento_outro) ELSE 'null'::jsonb END))));
      RAISE EXCEPTION 'T04/T12: ancora incompatível foi aceita';
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM<>'revisao_ancora_sem_proveniencia' THEN RAISE; END IF;
    END;
    RESET ROLE;
  END LOOP;
  BEGIN
    SET LOCAL ROLE ambulatorio_revisao_servico;
    PERFORM revisao_simular_proposta(fonte,lote_base,autorizacao,ator,manifesto_novo::text,regras,
      jsonb_build_object('linhas',jsonb_build_array(linha,linha)));
    RAISE EXCEPTION 'T04: duas candidatas na mesma posicao foram aceitas';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM<>'revisao_linha_proposta_ambigua' THEN RAISE; END IF;
  END;
  RESET ROLE;

  -- A celula vazia e a coluna removida permanecem sem efeito clinico quando
  -- a decisao explicita escolhe conservar o valor anterior.
  plano_vazio:=jsonb_set(jsonb_set(plano,'{0,categoria}','"revisao_necessaria"'),
    '{0,operacao}','"conservar"');
  plano_vazio:=jsonb_set(plano_vazio,'{0,proposto}',
    revisao_transformar_v1('celula_vazia','""'::jsonb,'character varying(255)','texto'));
  bruto_alterado:=jsonb_set(bruto_novo,'{1,valor}','""'::jsonb);
  SET LOCAL ROLE ambulatorio_revisao_servico;
  resposta:=revisao_simular_proposta(fonte,lote_base,autorizacao,ator,manifesto_novo::text,regras,
    jsonb_build_object('linhas',jsonb_build_array(linha||jsonb_build_object('dadosBrutos',bruto_alterado,'campos',plano_vazio))));
  RESET ROLE;
  IF resposta->>'resultado'<>'apta' OR (resposta->'linhas'->0->>'alvosNovos')::integer<>0 THEN
    RAISE EXCEPTION 'T10: vazio com conservacao explicita nao foi aceito'; END IF;
  bruto_alterado:=bruto_novo - 1;
  manifesto_alterado:=pg_temp.manifesto_aceite(bruto_alterado);
  plano_ausente:=jsonb_set(plano_vazio,'{0,proposto}',
    revisao_transformar_v1('coluna_ausente','null'::jsonb,'character varying(255)','texto'));
  SET LOCAL ROLE ambulatorio_revisao_servico;
  resposta:=revisao_simular_proposta(fonte,lote_base,autorizacao,ator,manifesto_alterado::text,regras,
    jsonb_build_object('linhas',jsonb_build_array(linha||jsonb_build_object('dadosBrutos',bruto_alterado,'campos',plano_ausente))));
  RESET ROLE;
  IF resposta->>'resultado'<>'apta' OR (resposta->'linhas'->0->>'alvosNovos')::integer<>0 THEN
    RAISE EXCEPTION 'T10: coluna ausente com conservacao explicita nao foi aceita'; END IF;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  resposta:=revisao_simular_proposta(fonte,lote_base,autorizacao,ator,manifesto_novo::text,regras,
    '{"linhas":[]}'::jsonb);
  RESET ROLE;
  IF resposta->>'resultado'<>'sem_aplicacao' OR (resposta->>'quantidadeLinhas')::integer<>0 THEN
    RAISE EXCEPTION 'T10: linha removida gerou aplicacao'; END IF;
  SELECT jsonb_build_object('pacientes',(SELECT count(*) FROM paciente),
    'atendimentos',(SELECT count(*) FROM atendimento),'dependentes',(SELECT count(*) FROM pendencia_atendimento),
    'aplicacoes',(SELECT count(*) FROM importacao_revisao_aplicacao)) INTO depois;
  IF depois<>antes THEN RAISE EXCEPTION 'Simulacoes alteraram dados clinicos ou ledger'; END IF;

  -- Publicacao e aplicacao da revisao A->B: novo bruto e proveniencia, mesmos IDs.
  SET LOCAL ROLE ambulatorio_revisao_servico;
  revisao:=revisao_preparar(fonte,lote_base,lote_novo,hash_regras,autorizacao);
  decisao:=revisao_publicar_decisao(revisao,linha_nova,linha_base,v_paciente_id,v_atendimento_id,
    autorizacao,'autorizar','Reordenacao sintetica com ancoras explicitas',plano);
  RESET ROLE;
  resultado_aplicacao:=revisao_aplicar_decisao_interna(decisao,autorizacao);
  IF resultado_aplicacao->>'resultado'<>'apta' AND resultado_aplicacao->>'resultado'<>'aplicada' THEN
    RAISE EXCEPTION 'T03: decisao sem mudanca nao foi aplicada: %',resultado_aplicacao; END IF;
  IF (SELECT nome FROM paciente WHERE paciente_id=v_paciente_id)<>'Paciente aceite sintetico'
    OR (SELECT data_atendimento FROM atendimento WHERE atendimento_id=v_atendimento_id)<>'2026-01-01'
    OR (SELECT count(*) FROM paciente)<>(antes->>'pacientes')::bigint
    OR (SELECT count(*) FROM atendimento)<>(antes->>'atendimentos')::bigint
    OR (SELECT count(*) FROM pendencia_atendimento)<>(antes->>'dependentes')::bigint
    OR NOT EXISTS(SELECT 1 FROM importacao_registro WHERE importacao_linha_id=linha_nova
      AND tabela_destino='paciente' AND registro_id=v_paciente_id)
    OR NOT EXISTS(SELECT 1 FROM importacao_registro WHERE importacao_linha_id=linha_nova
      AND tabela_destino='atendimento' AND registro_id=v_atendimento_id)
    OR (SELECT hash_arquivo_sha256 FROM importacao_lote WHERE importacao_lote_id=lote_base)
      =(SELECT hash_arquivo_sha256 FROM importacao_lote WHERE importacao_lote_id=lote_novo) THEN
    RAISE EXCEPTION 'T03: identidade clinica ou proveniencia entre hashes divergiu'; END IF;
  RAISE NOTICE 'OK: T03 integrado; T04/T09/T10/T12/T16 nas fronteiras declaradas';
END $$;

SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
