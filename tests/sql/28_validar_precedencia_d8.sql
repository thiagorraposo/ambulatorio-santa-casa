-- F08/F09/D8: precedencia real para o unico campo habilitado por migration.
-- A linha-base importada precisa de commit proprio para a transacao seguinte
-- poder iniciar identidade de aplicacao/gestao; ambas usam somente dados
-- sinteticos. A base fica no banco descartavel; revisao e mutacoes A-B-A rodam
-- em BEGIN/ROLLBACK. Descartar o banco ao fim da validacao.
\set ON_ERROR_STOP on
SET search_path TO ambulatorio, public;
CREATE TEMP TABLE d8_precedencia_fixture (
  sufixo text NOT NULL,
  ator bigint NOT NULL,
  campo bigint NOT NULL,
  paciente bigint NOT NULL,
  atendimento bigint NOT NULL,
  evento bigint NOT NULL,
  linha_base bigint NOT NULL,
  lote_base bigint NOT NULL,
  paciente_legado bigint NOT NULL,
  atendimento_legado bigint NOT NULL,
  evento_legado bigint NOT NULL,
  linha_legada bigint NOT NULL
) ON COMMIT PRESERVE ROWS;

BEGIN;
DO $$
DECLARE
  sufixo text := to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS');
  ator bigint; campo bigint; paciente bigint; atendimento bigint; evento bigint; lote bigint; linha bigint;
  paciente_legado bigint; atendimento_legado bigint; evento_legado bigint; linha_legada bigint;
  bruto jsonb; bruto_legado jsonb; manifesto jsonb; manifesto_sha text;
BEGIN
  SELECT campo_id INTO campo FROM auditoria_campo
    WHERE tabela_destino='evento_clinico' AND coluna_destino='ano_evento'
      AND coluna_pk='evento_clinico_id' AND tipo_sql='integer'
      AND serializacao_versao='v1' AND captura_desde IS NOT NULL;
  IF campo IS NULL THEN
    RAISE EXCEPTION 'D8: campo de ano da migration 52 ausente ou incompatível';
  END IF;

  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil)
    VALUES('Revisor F08 D8 sintetico','f08-'||sufixo||'@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao')
    RETURNING usuario_id INTO ator;
  INSERT INTO importacao_revisao_gestor(usuario_id) VALUES(ator);
  INSERT INTO paciente(nome) VALUES('Paciente F08 D8 sintetico') RETURNING paciente_id INTO paciente;
  INSERT INTO paciente(nome) VALUES('Paciente legado F09 D8 sintetico') RETURNING paciente_id INTO paciente_legado;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente,'2026-05-10')
    RETURNING atendimento_id INTO atendimento;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(paciente_legado,'2026-05-11')
    RETURNING atendimento_id INTO atendimento_legado;

  bruto:=jsonb_build_array(jsonb_build_object('posicao','A','cabecalho','Ultimo ano informado',
    'chave','retorno_anual_realizado','bloco','geral','ocorrencia',1,'valor','2023'));
  bruto_legado:=jsonb_build_array(jsonb_build_object('posicao','A','cabecalho','Ultimo ano informado',
    'chave','retorno_anual_realizado','bloco','geral','ocorrencia',1,'valor','2024'));
  SELECT jsonb_build_object('versao','d8-precedencia-v1','layout_versao','d8-precedencia-v1',
    'sheets',jsonb_build_array(jsonb_build_object('aba_nome_original','Retornos anuais','aba_ordem',1,
      'columns',jsonb_agg(jsonb_build_object('posicao_fisica','A','cabecalho_original',x->>'cabecalho',
        'chave_semantica',x->>'chave','bloco_funcional',x->>'bloco','ocorrencia',x->'ocorrencia')))))
    INTO manifesto FROM jsonb_array_elements(bruto) x;
  manifesto_sha:=encode(sha256(convert_to(manifesto::text,'UTF8')),'hex');
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,
    manifesto_sha256,importador_versao,revisao_git)
    VALUES('d8-precedencia-base-'||sufixo,encode(sha256(convert_to('base-'||sufixo,'UTF8')),'hex'),'d8-precedencia-v1','processando',
      manifesto_sha,'sintetico-1','abcdef0') RETURNING importacao_lote_id INTO lote;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote,'Retornos anuais',1,2,bruto,'processando') RETURNING importacao_linha_id INTO linha;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote,'Retornos anuais',1,3,bruto_legado,'processando') RETURNING importacao_linha_id INTO linha_legada;

  -- Simula um evento legado anterior à captura com trigger localmente suspenso
  -- apenas durante este INSERT. O catálogo ativo da migration 52 não é alterado;
  -- eventual erro aborta a transação e restaura o trigger.
  ALTER TABLE evento_clinico DISABLE TRIGGER auditoria_captura;
  INSERT INTO evento_clinico(paciente_id,tipo_evento,ano_evento,valor_original_data,ocorreu)
    VALUES(paciente_legado,'ultimo_comparecimento_ano_informado',2023,'2023',NULL)
    RETURNING evento_clinico_id INTO evento_legado;
  ALTER TABLE evento_clinico ENABLE TRIGGER auditoria_captura;

  -- Escritor Python/importador: captura normal do alvo novo e primeiro marco
  -- desconhecido ao alterar o valor de um alvo legado sem cobertura anterior.
  SET LOCAL ROLE ambulatorio_importador;
  PERFORM auditoria_iniciar_importacao(linha);
  INSERT INTO evento_clinico(paciente_id,tipo_evento,ano_evento,valor_original_data,ocorreu)
    VALUES(paciente,'ultimo_comparecimento_ano_informado',2023,'2023',NULL)
    RETURNING evento_clinico_id INTO evento;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha,'paciente',paciente,'criado'),(linha,'atendimento',atendimento,'criado'),
      (linha,'evento_clinico',evento,'criado');
  UPDATE importacao_linha SET status_linha='importada' WHERE importacao_linha_id=linha;

  PERFORM auditoria_iniciar_importacao(linha_legada);
  UPDATE evento_clinico SET ano_evento=2024,valor_original_data='2024'
    WHERE evento_clinico_id=evento_legado;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha_legada,'paciente',paciente_legado,'criado'),
      (linha_legada,'atendimento',atendimento_legado,'criado'),
      (linha_legada,'evento_clinico',evento_legado,'atualizado');
  UPDATE importacao_linha SET status_linha='importada' WHERE importacao_linha_id=linha_legada;
  UPDATE importacao_lote SET status_lote='concluido' WHERE importacao_lote_id=lote;
  RESET ROLE;

  INSERT INTO d8_precedencia_fixture(sufixo,ator,campo,paciente,atendimento,evento,linha_base,lote_base,
    paciente_legado,atendimento_legado,evento_legado,linha_legada)
    VALUES(sufixo,ator,campo,paciente,atendimento,evento,linha,lote,
      paciente_legado,atendimento_legado,evento_legado,linha_legada);
END $$;
COMMIT;

BEGIN;
DO $$
DECLARE
  f record;
  bruto_base jsonb; bruto_revisado jsonb; manifesto jsonb; transformacoes text;
  manifesto_sha text; transformacoes_sha text; lote_revisado bigint; linha_revisada bigint;
  fonte bigint; autorizacao bigint; revisao bigint; decisao bigint;
  envelope_base jsonb; envelope_novo jsonb; cobertura text; avaliacao jsonb;
  evento_anterior bigint; evento_final bigint; eventos_antes bigint; eventos_depois bigint;
  consultas bigint;
BEGIN
  SELECT * INTO STRICT f FROM d8_precedencia_fixture;
  SELECT dados_brutos INTO STRICT bruto_base FROM importacao_linha WHERE importacao_linha_id=f.linha_base;
  bruto_revisado:=jsonb_set(bruto_base,'{0,valor}','"2024"'::jsonb);
  SELECT jsonb_build_object('versao','d8-precedencia-v1','layout_versao','d8-precedencia-v1',
    'sheets',jsonb_build_array(jsonb_build_object('aba_nome_original','Retornos anuais','aba_ordem',1,
      'columns',jsonb_agg(jsonb_build_object('posicao_fisica','A','cabecalho_original',x->>'cabecalho',
        'chave_semantica',x->>'chave','bloco_funcional',x->>'bloco','ocorrencia',x->'ocorrencia')))))
    INTO manifesto FROM jsonb_array_elements(bruto_base) x;
  manifesto_sha:=encode(sha256(convert_to(manifesto::text,'UTF8')),'hex');
  transformacoes:='{"formato":"revisao-transformacoes/v1","regras":[{"chave":"retorno_anual_realizado",'
    ||'"bloco":"geral","ocorrencia":1,"tabela":"evento_clinico","coluna":"ano_evento","transformacao":"ano"}]}';
  transformacoes_sha:=encode(sha256(convert_to(transformacoes,'UTF8')),'hex');
  INSERT INTO revisao_artefato(sha256,tipo,versao,conteudo)
    VALUES(manifesto_sha,'manifesto','d8-precedencia-v1',manifesto::text),
      (transformacoes_sha,'transformacoes','d8-precedencia-v1',transformacoes);
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,
    manifesto_sha256,importador_versao,revisao_git)
    VALUES('d8-precedencia-revisado-'||f.sufixo,encode(sha256(convert_to('revisado-'||f.sufixo,'UTF8')),'hex'),'d8-precedencia-v1','pronto',
      manifesto_sha,'sintetico-1','abcdef0') RETURNING importacao_lote_id INTO lote_revisado;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
    VALUES(lote_revisado,'Retornos anuais',1,2,bruto_revisado) RETURNING importacao_linha_id INTO linha_revisada;

  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(f.ator);
  RESET ROLE;
  SET LOCAL ROLE ambulatorio_revisao_gestor;
  fonte:=revisao_registrar_fonte('d8-precedencia-fonte-'||f.sufixo,f.lote_base);
  autorizacao:=revisao_conceder_autorizacao(fonte,f.ator);
  RESET ROLE;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  revisao:=revisao_preparar(fonte,f.lote_base,lote_revisado,transformacoes_sha,autorizacao);
  RESET ROLE;

  envelope_base:=revisao_transformar_v1('valor',to_jsonb('2023'::text),'integer','ano');
  envelope_novo:=revisao_transformar_v1('valor',to_jsonb('2024'::text),'integer','ano');
  cobertura:=revisao_cobertura_base(f.linha_base,f.campo,f.evento,envelope_base);
  IF cobertura<>'desde_base' THEN RAISE EXCEPTION 'F09 D8: captura importada deveria cobrir a base, obtido %',cobertura; END IF;
  IF NOT EXISTS(SELECT 1 FROM auditoria_campo_evento e WHERE e.campo_id=f.campo
      AND e.registro_id=f.evento_legado AND e.versao_campo=1 AND e.origem='marco_atual'
      AND e.antes->>'estado'='desconhecido' AND e.depois->>'valor'='2023') THEN
    RAISE EXCEPTION 'F09 D8: fixture legada nao produziu primeiro marco desconhecido';
  END IF;
  SET LOCAL ROLE ambulatorio_auditoria_owner;
  cobertura:=revisao_cobertura_base(f.linha_legada,f.campo,f.evento_legado,
    envelope_novo);
  IF cobertura<>'posterior_base' THEN RAISE EXCEPTION 'F09 D8: igualdade legada conferiu cobertura: %',cobertura; END IF;
  cobertura:=revisao_cobertura_base(f.linha_legada,f.campo,f.evento_legado,
    auditoria_envelope(NULL::jsonb,'integer'));
  RESET ROLE;
  IF cobertura<>'posterior_base' THEN RAISE EXCEPTION 'F09 D8: NULL legado conferiu cobertura: %',cobertura; END IF;

  -- Plano D8 autorizado, baseado na trilha de importacao real.
  SET LOCAL ROLE ambulatorio_revisao_servico;
  decisao:=revisao_publicar_decisao(revisao,linha_revisada,f.linha_base,f.paciente,f.atendimento,
    autorizacao,'autorizar','Correcao anual sintetica D8',jsonb_build_array(jsonb_build_object(
      'campoId',f.campo,'registroId',f.evento,'alvoChave','evento_clinico',
      'chaveSemantica','retorno_anual_realizado','blocoFuncional','geral','ocorrencia',1,
      'categoria','correcao_ocorrencia','operacao','definir','base',envelope_base,'proposto',envelope_novo)));
  RESET ROLE;
  IF NOT EXISTS(SELECT 1 FROM importacao_revisao_campo c WHERE c.decisao_id=decisao
      AND c.campo_id=f.campo AND c.cobertura_historica='desde_base') THEN
    RAISE EXCEPTION 'F09 D8: publicacao nao preservou cobertura comprovada desde a base';
  END IF;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  avaliacao:=revisao_simular_decisao(decisao,autorizacao,f.ator);
  RESET ROLE;
  IF avaliacao->>'resultado'<>'apta' OR avaliacao->>'codigo'<>'revisao_plano_atual' THEN
    RAISE EXCEPTION 'F08 D8: decisao nao estava apta antes da edicao: %',avaliacao;
  END IF;
  SELECT evento_id INTO evento_anterior FROM auditoria_campo_evento
    WHERE campo_id=f.campo AND registro_id=f.evento ORDER BY versao_campo DESC LIMIT 1;
  SELECT count(*) INTO eventos_antes FROM auditoria_campo_evento WHERE campo_id=f.campo AND registro_id=f.evento;
  SELECT count(*) INTO consultas FROM atendimento WHERE paciente_id=f.paciente;

  -- Escritor manual/API autorizado: A->B->A mantem o valor, mas avanca o token.
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(f.ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  UPDATE evento_clinico SET ano_evento=2022,valor_original_data='2022' WHERE evento_clinico_id=f.evento;
  UPDATE evento_clinico SET ano_evento=2023,valor_original_data='2023' WHERE evento_clinico_id=f.evento;
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT evento_id INTO evento_final FROM auditoria_campo_evento
    WHERE campo_id=f.campo AND registro_id=f.evento ORDER BY versao_campo DESC LIMIT 1;
  SELECT count(*) INTO eventos_depois FROM auditoria_campo_evento WHERE campo_id=f.campo AND registro_id=f.evento;
  IF evento_final=evento_anterior OR eventos_depois<>eventos_antes+2
    OR (SELECT ano_evento FROM evento_clinico WHERE evento_clinico_id=f.evento)<>2023
    OR (SELECT count(*) FROM atendimento WHERE paciente_id=f.paciente)<>consultas THEN
    RAISE EXCEPTION 'F08 D8: A-B-A nao avancou somente a historia/tokens esperados';
  END IF;
  SET LOCAL ROLE ambulatorio_revisao_servico;
  avaliacao:=revisao_simular_decisao(decisao,autorizacao,f.ator);
  RESET ROLE;
  IF avaliacao->>'resultado'<>'obsoleta' OR avaliacao->>'codigo'<>'revisao_alvo_alterado' THEN
    RAISE EXCEPTION 'F08 D8: A-B-A nao tornou a decisao obsoleta: %',avaliacao;
  END IF;
  IF (SELECT count(*) FROM auditoria_campo_evento e WHERE e.campo_id=f.campo AND e.registro_id=f.evento
      AND e.origem='aplicacao' AND e.ator_usuario_id=f.ator AND e.importacao_linha_id IS NULL)<>2 THEN
    RAISE EXCEPTION 'F08 D8: edicoes A-B-A sem origem/ator de aplicacao';
  END IF;
  RAISE NOTICE 'OK: D8 ativo; F08 decisao obsoleta por token A-B-A; F09 marco legado, igualdade e NULL sem cobertura; zero visita inferida';
END $$;
ROLLBACK;
