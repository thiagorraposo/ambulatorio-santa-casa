-- Snapshot sintético por atendimento: captura, permissões, rollback e guard.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE p bigint; a bigint; b bigint; c bigint; v bigint; outro bigint; i bigint; ator bigint; campo bigint; tabela text;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES('Ator SQL40 sintético',
    'sql40-'||txid_current()||'@example.invalid','$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO ator;
  INSERT INTO paciente(nome) VALUES('Paciente SQL40 sintético') RETURNING paciente_id INTO p;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(p,'2026-02-01') RETURNING atendimento_id INTO a;
  INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(p,'2026-02-02') RETURNING atendimento_id INTO b;
  INSERT INTO comorbidade(nome_comorbidade) VALUES('Catálogo SQL40 sintético') RETURNING comorbidade_id INTO c;
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  INSERT INTO avaliacao_comorbidades(atendimento_id,historico_familiar_avaliado,possui_doenca_familiar)
    VALUES(a,true,NULL) RETURNING avaliacao_comorbidades_id INTO v;
  INSERT INTO avaliacao_comorbidade_item(avaliacao_comorbidades_id,comorbidade_id,nome_comorbidade,possui_comorbidade)
    VALUES(v,c,'Nome no snapshot',false) RETURNING item_id INTO i;
  INSERT INTO avaliacao_comorbidades(atendimento_id,historico_familiar_avaliado)
    VALUES(b,false) RETURNING avaliacao_comorbidades_id INTO outro;
  INSERT INTO avaliacao_comorbidade_item(avaliacao_comorbidades_id,comorbidade_id,nome_comorbidade,possui_comorbidade)
    VALUES(outro,c,'Nome posterior',NULL);
  RESET ROLE;
  SET CONSTRAINTS ALL IMMEDIATE;
  IF revisao_alvo_paciente('avaliacao_comorbidade_item',i)<>p OR revisao_alvo_paciente('avaliacao_comorbidades',v)<>p THEN
    RAISE EXCEPTION 'Resolução da avaliação não encontrou o paciente correto';
  END IF;
  IF (SELECT count(*) FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE (c.tabela_destino='avaliacao_comorbidades' AND e.registro_id IN (v,outro))
        OR (c.tabela_destino='avaliacao_comorbidade_item' AND e.registro_id IN
          (SELECT item_id FROM avaliacao_comorbidade_item WHERE avaliacao_comorbidades_id IN (v,outro))))<>14 THEN
    RAISE EXCEPTION 'Captura deve abranger 3 campos do bloco e 4 por item';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='avaliacao_comorbidade_item' AND c.coluna_destino='possui_comorbidade'
        AND e.registro_id=i AND e.depois->'valor'='false'::jsonb AND e.origem='aplicacao' AND e.ator_usuario_id=ator) THEN
    RAISE EXCEPTION 'Negativa/autoria da avaliação foi perdida';
  END IF;
  BEGIN
    INSERT INTO avaliacao_comorbidade_item(avaliacao_comorbidades_id,comorbidade_id,nome_comorbidade)
      VALUES(v,c,'Duplicado');
    RAISE EXCEPTION 'Unicidade do item não funcionou';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO avaliacao_comorbidades(atendimento_id,historico_familiar_avaliado) VALUES(a,false);
    RAISE EXCEPTION 'Unicidade do atendimento não funcionou';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    UPDATE avaliacao_comorbidades SET historico_familiar_avaliado=false,possui_doenca_familiar=true
      WHERE avaliacao_comorbidades_id=v;
    RAISE EXCEPTION 'Bloco não avaliado recebeu resposta';
  EXCEPTION WHEN check_violation THEN NULL; END;
  FOREACH tabela IN ARRAY ARRAY['avaliacao_comorbidades','avaliacao_comorbidade_item'] LOOP
    IF NOT has_table_privilege('ambulatorio_aplicacao',tabela,'SELECT')
      OR NOT has_table_privilege('ambulatorio_aplicacao',tabela,'INSERT')
      OR has_table_privilege('ambulatorio_aplicacao',tabela,'UPDATE')
      OR has_table_privilege('ambulatorio_aplicacao',tabela,'DELETE')
      OR has_table_privilege('ambulatorio_aplicacao',tabela,'TRUNCATE')
      OR has_table_privilege('ambulatorio_importador',tabela,'INSERT') THEN
      RAISE EXCEPTION 'Grants indevidos na avaliação: %', tabela;
    END IF;
    BEGIN
      EXECUTE format('DELETE FROM %I',tabela);
      RAISE EXCEPTION 'Exclusão de snapshot foi permitida';
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM<>'auditoria_alvo_protegido' THEN RAISE; END IF;
    END;
  END LOOP;
  FOR campo IN SELECT campo_id FROM auditoria_campo
      WHERE tabela_destino IN ('avaliacao_comorbidades','avaliacao_comorbidade_item') LOOP
    BEGIN
      INSERT INTO importacao_revisao_campo(campo_id) VALUES(campo);
      RAISE EXCEPTION 'Revisão temporal habilitada sem contrato';
    EXCEPTION WHEN check_violation THEN
      IF SQLERRM<>'revisao_avaliacao_comorbidades_nao_habilitada' THEN RAISE; END IF;
    END;
  END LOOP;
  RAISE NOTICE 'OK: avaliações por consulta, FK/resolução, triestado, auditoria, grants e guard';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
