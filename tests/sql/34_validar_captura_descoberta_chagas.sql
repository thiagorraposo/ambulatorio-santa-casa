-- D2: captura prospectiva; NULL capturado da linha-base difere de legado desconhecido.
-- Fixture sintética, com BEGIN/ROLLBACK; não altera dados persistentes.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE p_capturado bigint; a_capturado bigint; d_capturado bigint;
  p_tecnico bigint; a_tecnico bigint; d_tecnico bigint;
  lote_base bigint; linha_base bigint; lote_atual bigint; linha_atual bigint;
  bruto jsonb; campo bigint; resultado boolean;
BEGIN
  SELECT campo_id INTO campo FROM auditoria_campo
    WHERE tabela_destino='diagnostico_chagas' AND coluna_destino='data_descoberta_autorelato'
      AND coluna_pk='diagnostico_chagas_id' AND tipo_sql='date'
      AND serializacao_versao='v1' AND captura_desde IS NOT NULL;
  IF campo IS NULL THEN RAISE EXCEPTION 'D2: catálogo SQL61 ausente/incompatível'; END IF;

  bruto:='[{"posicao":"A","cabecalho":"Data descoberta","chave":"autorelato_diagnostico_de_chagas_do_participante_data","ocorrencia":1,"bloco":"geral","valor":"01/01/2020"}]';
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
    VALUES('d2-captura-base-'||txid_current(),repeat('a',64),'d2-captura-v1','processando')
    RETURNING importacao_lote_id INTO lote_base;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote_base,'Não portadores',2,2,bruto,'processando') RETURNING importacao_linha_id INTO linha_base;

  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,lote_reprocessado_de_id,status_lote)
    VALUES('d2-captura-atual-'||txid_current(),repeat('a',64),'d2-captura-v1',lote_base,'processando')
    RETURNING importacao_lote_id INTO lote_atual;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote_atual,'Não portadores',2,2,bruto,'processando') RETURNING importacao_linha_id INTO linha_atual;

  -- Escritor técnico owner sem contexto: a cadeia conserva autoria/origem
  -- técnica e não se confunde com captura importada nem com autoria clínica.
  INSERT INTO paciente(nome) VALUES('Paciente manutenção D2 sintético') RETURNING paciente_id INTO p_tecnico;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(p_tecnico,'2026-02-03') RETURNING atendimento_id INTO a_tecnico;
  INSERT INTO diagnostico_chagas(atendimento_id,possui_diagnostico_chagas,data_descoberta_autorelato)
    VALUES(a_tecnico,true,NULL) RETURNING diagnostico_chagas_id INTO d_tecnico;
  UPDATE diagnostico_chagas SET data_descoberta_autorelato='2020-01-01'
    WHERE diagnostico_chagas_id=d_tecnico;
  UPDATE diagnostico_chagas SET data_descoberta_autorelato='2021-01-01'
    WHERE diagnostico_chagas_id=d_tecnico;
  UPDATE diagnostico_chagas SET data_descoberta_autorelato=NULL
    WHERE diagnostico_chagas_id=d_tecnico;

  SET LOCAL ROLE ambulatorio_importador;
  PERFORM auditoria_iniciar_importacao(linha_base);
  INSERT INTO paciente(nome) VALUES('Paciente D2 captura sintético') RETURNING paciente_id INTO p_capturado;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(p_capturado,'2026-02-02') RETURNING atendimento_id INTO a_capturado;
  INSERT INTO diagnostico_chagas(atendimento_id,possui_diagnostico_chagas,data_descoberta_autorelato)
    VALUES(a_capturado,true,NULL) RETURNING diagnostico_chagas_id INTO d_capturado;
  INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(linha_base,'paciente',p_capturado,'criado'),(linha_base,'atendimento',a_capturado,'criado'),
      (linha_base,'diagnostico_chagas',d_capturado,'criado');
  UPDATE importacao_linha SET status_linha='importada_com_pendencia' WHERE importacao_linha_id=linha_base;
  UPDATE importacao_lote SET status_lote='concluido_com_pendencias',finalizado_em=clock_timestamp()
    WHERE importacao_lote_id=lote_base;
  PERFORM auditoria_iniciar_importacao(linha_atual);
  resultado:=auditoria_d2_null_captura_comprovada(linha_atual,linha_base,d_capturado);
  RESET ROLE;

  IF NOT EXISTS(SELECT 1 FROM auditoria_campo_evento WHERE campo_id=campo
      AND registro_id=d_capturado AND versao_campo=1 AND origem='importacao'
      AND importacao_linha_id=linha_base AND antes->>'estado'='alvo_ausente'
      AND depois->>'estado'='nulo') THEN
    RAISE EXCEPTION 'D2: NULL da linha-base não foi capturado com proveniência';
  END IF;
  IF resultado IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'D2: helper não reconheceu NULL capturado e inalterado da linha-base';
  END IF;
  RESET ROLE;
  IF NOT EXISTS(SELECT 1 FROM diagnostico_chagas WHERE diagnostico_chagas_id=d_tecnico
      AND data_descoberta_autorelato IS NULL)
    OR (SELECT count(*) FROM auditoria_campo_evento WHERE campo_id=campo
      AND registro_id=d_tecnico AND versao_campo IN (1,2,3,4)
      AND origem='operacao_tecnica' AND ator_usuario_id IS NULL AND importacao_linha_id IS NULL)<>4 THEN
    RAISE EXCEPTION 'D2: manutenção técnica A→B→A não preservou a trilha técnica sem identidade clínica';
  END IF;

  IF has_table_privilege('ambulatorio_importador','auditoria_campo','SELECT')
    OR has_table_privilege('ambulatorio_importador','auditoria_campo_evento','SELECT')
    OR NOT has_function_privilege('ambulatorio_importador',
      'auditoria_d2_null_captura_comprovada(bigint,bigint,bigint)','EXECUTE')
    OR has_function_privilege('ambulatorio_aplicacao',
      'auditoria_d2_null_captura_comprovada(bigint,bigint,bigint)','EXECUTE')
    OR has_function_privilege('ambulatorio_servico_autenticado',
      'auditoria_d2_null_captura_comprovada(bigint,bigint,bigint)','EXECUTE')
    OR has_function_privilege('ambulatorio_revisao_servico',
      'auditoria_d2_null_captura_comprovada(bigint,bigint,bigint)','EXECUTE')
    OR has_function_privilege('ambulatorio_revisao_gestor',
      'auditoria_d2_null_captura_comprovada(bigint,bigint,bigint)','EXECUTE') THEN
    RAISE EXCEPTION 'D2: helper de prova ou fronteira F05 indevida';
  END IF;
  RAISE NOTICE 'OK: D2 helper restrito prova captura positiva; manutenção técnica A→B→A preserva origem técnica';
END $$;

SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
