-- F09/D8: aplicar associação equivalente sem mutar o alvo clínico.
-- O baseline importado é committed para que a sessão possa autenticar uma
-- identidade de aplicação distinta e a associação prove proveniência real.
-- O baseline e o staging/decisão/aplicação aprovados ficam committed no banco
-- disposable para permitir contextos de identidade distintos e testar sucesso
-- já confirmado; edição/repetição termina em ROLLBACK. Descarte o banco após validar.
-- Este teste invoca explicitamente o executor privado como integração SQL
-- privilegiada; não concede EXECUTE nem altera o catálogo operacional.
\set ON_ERROR_STOP on
SET search_path TO ambulatorio, public;

CREATE TEMP TABLE d8_assoc_fixture (
  sufixo text NOT NULL, ator bigint NOT NULL, campo bigint NOT NULL,
  paciente bigint NOT NULL, atendimento bigint NOT NULL, evento bigint NOT NULL,
  linha_base bigint NOT NULL, lote_base bigint NOT NULL,
  linha_revisada bigint, revisao bigint, autorizacao bigint, decisao bigint,
  plano_sha text, aplicacao bigint, eventos_base bigint, registros_base bigint
) ON COMMIT PRESERVE ROWS;

BEGIN;
DO $$
DECLARE
  sufixo text:=to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS');
  ator bigint; campo bigint; paciente bigint; atendimento bigint; evento bigint;
  lote bigint; linha bigint; bruto jsonb; manifesto jsonb; manifesto_sha text;
BEGIN
  SELECT campo_id INTO campo FROM auditoria_campo
    WHERE tabela_destino='evento_clinico' AND coluna_destino='ano_evento'
      AND coluna_pk='evento_clinico_id' AND tipo_sql='integer'
      AND serializacao_versao='v1' AND captura_desde IS NOT NULL;
  IF campo IS NULL THEN
    RAISE EXCEPTION 'D8 associação: campo ativo da migration 52 ausente ou incompatível';
  END IF;
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil)
    VALUES('Revisor F09 associação D8 sintético','f09-assoc-'||sufixo||'@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao')
    RETURNING usuario_id INTO ator;
  INSERT INTO importacao_revisao_gestor(usuario_id) VALUES(ator);
  INSERT INTO paciente(nome) VALUES('Paciente F09 associação D8 sintético') RETURNING paciente_id INTO paciente;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-06-01')
    RETURNING atendimento_id INTO atendimento;
  bruto:=jsonb_build_array(jsonb_build_object('posicao','A','cabecalho','Último ano informado',
    'chave','retorno_anual_realizado','bloco','geral','ocorrencia',1,'valor','2023'));
  SELECT jsonb_build_object('versao','d8-associacao-'||sufixo,'layout_versao','d8-associacao-'||sufixo,
    'sheets',jsonb_build_array(jsonb_build_object('aba_nome_original','Retornos anuais','aba_ordem',1,
      'columns',jsonb_agg(jsonb_build_object('posicao_fisica','A','cabecalho_original',x->>'cabecalho',
        'chave_semantica',x->>'chave','bloco_funcional',x->>'bloco','ocorrencia',x->'ocorrencia')))))
    INTO manifesto FROM jsonb_array_elements(bruto) x;
  manifesto_sha:=encode(sha256(convert_to(manifesto::text,'UTF8')),'hex');
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,
    manifesto_sha256,importador_versao,revisao_git)
    VALUES('d8-associacao-base-'||sufixo,encode(sha256(convert_to('base-'||sufixo,'UTF8')),'hex'),
      'd8-associacao-'||sufixo,'processando',manifesto_sha,'sintetico-1','abcdef0')
    RETURNING importacao_lote_id INTO lote;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote,'Retornos anuais',1,2,bruto,'processando') RETURNING importacao_linha_id INTO linha;

  -- Gera o campo ativo pelo escritor importador e uma proveniência de base real.
  SET LOCAL ROLE ambulatorio_importador;
  PERFORM auditoria_iniciar_importacao(linha);
  INSERT INTO evento_clinico(paciente_id,tipo_evento,ano_evento,valor_original_data,ocorreu)
    VALUES(paciente,'ultimo_comparecimento_ano_informado',2023,'2023',NULL)
    RETURNING evento_clinico_id INTO evento;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha,'paciente',paciente,'criado'),(linha,'atendimento',atendimento,'criado'),
      (linha,'evento_clinico',evento,'criado');
  UPDATE importacao_linha SET status_linha='importada' WHERE importacao_linha_id=linha;
  UPDATE importacao_lote SET status_lote='concluido' WHERE importacao_lote_id=lote;
  RESET ROLE;
  INSERT INTO d8_assoc_fixture VALUES(sufixo,ator,campo,paciente,atendimento,evento,linha,lote);
END $$;
COMMIT;

BEGIN;
DO $$
DECLARE
  f record; manifesto jsonb; manifesto_sha text; transformacoes text; transformacoes_sha text;
  lote_revisado bigint; v_linha_revisada bigint; fonte bigint; v_autorizacao bigint;
  v_revisao bigint; v_decisao bigint; resposta jsonb; hash_plano text; plano jsonb;
  env jsonb;
BEGIN
  SELECT * INTO STRICT f FROM d8_assoc_fixture;
  SELECT jsonb_build_object('versao','d8-associacao-'||f.sufixo,'layout_versao','d8-associacao-'||f.sufixo,
    'sheets',jsonb_build_array(jsonb_build_object('aba_nome_original','Retornos anuais','aba_ordem',1,
      'columns',jsonb_agg(jsonb_build_object('posicao_fisica','A','cabecalho_original',x->>'cabecalho',
        'chave_semantica',x->>'chave','bloco_funcional',x->>'bloco','ocorrencia',x->'ocorrencia')))))
    INTO manifesto FROM jsonb_array_elements((SELECT dados_brutos FROM importacao_linha WHERE importacao_linha_id=f.linha_base)) x;
  manifesto_sha:=encode(sha256(convert_to(manifesto::text,'UTF8')),'hex');
  transformacoes:='{"formato":"revisao-transformacoes/v1","regras":[{"chave":"retorno_anual_realizado",'
    ||'"bloco":"geral","ocorrencia":1,"tabela":"evento_clinico","coluna":"ano_evento","transformacao":"ano"}]}';
  transformacoes_sha:=encode(sha256(convert_to(transformacoes,'UTF8')),'hex');
  INSERT INTO revisao_artefato(sha256,tipo,versao,conteudo)
    VALUES(manifesto_sha,'manifesto','d8-associacao-'||f.sufixo,manifesto::text),
      (transformacoes_sha,'transformacoes','d8-associacao-v1',transformacoes)
    ON CONFLICT (sha256) DO NOTHING;
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,
    manifesto_sha256,importador_versao,revisao_git)
    VALUES('d8-associacao-revisado-'||f.sufixo,encode(sha256(convert_to('revisado-'||f.sufixo,'UTF8')),'hex'),
      'd8-associacao-'||f.sufixo,'pronto',manifesto_sha,'sintetico-1','abcdef0')
    RETURNING importacao_lote_id INTO lote_revisado;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
    VALUES(lote_revisado,'Retornos anuais',1,2,
      (SELECT dados_brutos FROM importacao_linha WHERE importacao_linha_id=f.linha_base))
    RETURNING importacao_linha_id INTO v_linha_revisada;

  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(f.ator);
  RESET ROLE;
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  fonte:=revisao_registrar_fonte('d8-associacao-fonte-'||f.sufixo,f.lote_base);
  v_autorizacao:=revisao_conceder_autorizacao(fonte,f.ator);
  RESET ROLE;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  v_revisao:=revisao_preparar(fonte,f.lote_base,lote_revisado,transformacoes_sha,v_autorizacao);
  RESET ROLE;

  env:=revisao_transformar_v1('valor',to_jsonb('2023'::text),'integer','ano');
  plano:=jsonb_build_array(jsonb_build_object('campoId',f.campo,'registroId',f.evento,
    'alvoChave','evento_clinico','chaveSemantica','retorno_anual_realizado',
    'blocoFuncional','geral','ocorrencia',1,'categoria','sem_mudanca','operacao','associar',
    'base',env,'proposto',env));
  SET LOCAL ROLE ambulatorio_revisao_servico;
  v_decisao:=revisao_publicar_decisao(v_revisao,v_linha_revisada,f.linha_base,f.paciente,f.atendimento,
    v_autorizacao,'autorizar','Associação equivalente D8 sintética',plano);
  resposta:=revisao_simular_decisao(v_decisao,v_autorizacao,f.ator);
  RESET ROLE;
  IF resposta->>'resultado'<>'apta' OR resposta->>'codigo'<>'revisao_plano_atual' THEN
    RAISE EXCEPTION 'F09 associação: parecer aprovado não está apto: %',resposta;
  END IF;
  SELECT plano_sha256 INTO STRICT hash_plano FROM importacao_revisao_decisao WHERE decisao_id=v_decisao;
  IF hash_plano!~'^[0-9a-f]{64}$'
    OR NOT EXISTS(SELECT 1 FROM importacao_revisao_campo
      WHERE decisao_id=v_decisao AND campo_id=f.campo AND registro_id=f.evento
        AND operacao='associar' AND cobertura_historica='desde_base'
        AND atual_avaliado->>'estado'='valor' AND atual_avaliado->>'tipo_sql'='integer'
        AND atual_avaliado->>'valor'='2023' AND base=env AND proposto=env)
    OR NOT EXISTS(SELECT 1 FROM importacao_revisao_decisao
      WHERE decisao_id=v_decisao AND decidida_por_usuario_id=f.ator
        AND plano_sha256=hash_plano) THEN
    RAISE EXCEPTION 'F09 associação: plano/hash/ator aprovados não correspondem ao alvo e valor';
  END IF;
  UPDATE d8_assoc_fixture SET linha_revisada=v_linha_revisada,revisao=v_revisao,
    autorizacao=v_autorizacao,decisao=v_decisao,plano_sha=hash_plano
    WHERE sufixo=f.sufixo;
  RAISE NOTICE 'D8: hash/plano e parecer aprovados; pronto para executor privado de integração';
END $$;
COMMIT;

BEGIN;
DO $$
DECLARE
  f record; resposta jsonb; app bigint; eventos_antes bigint; valor_antes integer;
  registros_antes bigint;
BEGIN
  SELECT * INTO STRICT f FROM d8_assoc_fixture;
  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname=session_user)
    OR has_function_privilege('ambulatorio_revisao_servico',
      'revisao_aplicar_decisao_interna(bigint,bigint)','EXECUTE') THEN
    RAISE EXCEPTION 'F09 associação: exige sessão de integração privilegiada e executor sem EXECUTE operacional';
  END IF;
  SELECT count(*) INTO eventos_antes FROM auditoria_campo_evento WHERE campo_id=f.campo AND registro_id=f.evento;
  SELECT ano_evento INTO STRICT valor_antes FROM evento_clinico WHERE evento_clinico_id=f.evento;
  SELECT count(*) INTO registros_antes FROM importacao_registro WHERE importacao_linha_id=f.linha_revisada;
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(f.ator);
  RESET ROLE;
  -- Integração SQL privilegiada: executor interno permanece sem EXECUTE operacional.
  resposta:=revisao_aplicar_decisao_interna(f.decisao,f.autorizacao);
  IF resposta->>'resultado'<>'aplicada' OR resposta->>'codigo'<>'revisao_plano_aplicado' THEN
    RAISE EXCEPTION 'F09 associação: executor não aplicou o plano aprovado: %',resposta;
  END IF;
  app:=(resposta->>'aplicacaoId')::bigint;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF (SELECT ano_evento FROM evento_clinico WHERE evento_clinico_id=f.evento)<>valor_antes
    OR (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=f.campo AND registro_id=f.evento)<>eventos_antes
    OR (SELECT count(*) FROM atendimento WHERE paciente_id=f.paciente)<>1 THEN
    RAISE EXCEPTION 'F09 associação: valor, história ou quantidade de atendimentos mudou';
  END IF;
  IF (SELECT count(*) FROM importacao_revisao_aplicacao WHERE decisao_id=f.decisao
      AND resultado='aplicada' AND plano_sha256=f.plano_sha)<>1
    OR (SELECT count(*) FROM importacao_revisao_alvo WHERE aplicacao_id=app
      AND alvo_chave='evento_clinico' AND tabela_destino='evento_clinico'
      AND registro_id=f.evento AND acao='associado')<>1
    OR (SELECT count(*) FROM importacao_registro WHERE importacao_linha_id=f.linha_revisada
      AND tabela_destino='evento_clinico' AND registro_id=f.evento AND acao='associado')<>1
    OR (SELECT count(*) FROM importacao_registro WHERE importacao_linha_id=f.linha_revisada
      AND tabela_destino='paciente' AND registro_id=f.paciente AND acao='associado')<>1
    OR (SELECT count(*) FROM importacao_registro WHERE importacao_linha_id=f.linha_revisada
      AND tabela_destino='atendimento' AND registro_id=f.atendimento AND acao='associado')<>1 THEN
    RAISE EXCEPTION 'F09 associação: sucesso/proveniência não está associada ao mesmo alvo';
  END IF;
  UPDATE d8_assoc_fixture SET aplicacao=app,eventos_base=eventos_antes,registros_base=registros_antes
    WHERE sufixo=f.sufixo;
END $$;
COMMIT;

BEGIN;
DO $$
DECLARE f record; resposta jsonb; linha_status text;
BEGIN
  SELECT * INTO STRICT f FROM d8_assoc_fixture;
  -- A repetição depois de edição manual deve reconhecer sucesso já confirmado,
  -- sem restaurar o valor aprovado pela associação.
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(f.ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  UPDATE evento_clinico SET ano_evento=2022,valor_original_data='2022' WHERE evento_clinico_id=f.evento;
  RESET ROLE;
  resposta:=revisao_aplicar_decisao_interna(f.decisao,f.autorizacao);
  IF resposta->>'resultado'<>'ja_aplicada' THEN
    RAISE EXCEPTION 'F09 associação: repetição retornou resultado inesperado: %',resposta;
  END IF;
  SELECT status_linha INTO linha_status FROM importacao_linha WHERE importacao_linha_id=f.linha_revisada;
  IF (SELECT ano_evento FROM evento_clinico WHERE evento_clinico_id=f.evento)<>2022
    OR (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=f.campo AND registro_id=f.evento)<>f.eventos_base+1
    OR (SELECT count(*) FROM importacao_revisao_aplicacao WHERE decisao_id=f.decisao AND resultado='aplicada')<>1
    OR (SELECT count(*) FROM importacao_revisao_alvo WHERE aplicacao_id=f.aplicacao)<>1
    OR (SELECT count(*) FROM importacao_registro WHERE importacao_linha_id=f.linha_revisada)<>f.registros_base+3
    OR linha_status<>'importada' THEN
    RAISE EXCEPTION 'F09 associação: repetição sobrescreveu edição ou duplicou sucesso/vínculo';
  END IF;
  RAISE NOTICE 'OK: D8 associação aplicada no mesmo evento/valor; sem mutação clínica/história na associação; proveniência associada; repetição preserva edição manual';
END $$;
ROLLBACK;
