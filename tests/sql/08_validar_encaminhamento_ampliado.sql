\set ON_ERROR_STOP on

SELECT 'validacao_encaminhamento_' || txid_current()::TEXT AS codigo \gset
SELECT set_config('ambulatorio.validacao_encaminhamento_codigo', :'codigo', FALSE);

BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_encaminhamento_codigo');
    v_paciente_1 BIGINT;
    v_paciente_2 BIGINT;
    v_atendimento_1 BIGINT;
    v_atendimento_2 BIGINT;
    v_atendimento_cascade BIGINT;
    v_projeto_benbrasil BIGINT;
    v_projeto_epoca BIGINT;
    v_projeto_sintetico BIGINT;
    v_enc_true BIGINT;
    v_enc_false BIGINT;
    v_enc_null BIGINT;
    v_enc_epoca BIGINT;
    v_enc_legado BIGINT;
    v_enc_cascade BIGINT;
    v_lote BIGINT;
    v_linha BIGINT;
    v_atualizado_anterior TIMESTAMP;
BEGIN
    INSERT INTO paciente (codigo_planilha, nome) VALUES
        (v_codigo || '_p1', 'Paciente Sintetico Encaminhamento 1')
        RETURNING paciente_id INTO v_paciente_1;
    INSERT INTO paciente (codigo_planilha, nome) VALUES
        (v_codigo || '_p2', 'Paciente Sintetico Encaminhamento 2')
        RETURNING paciente_id INTO v_paciente_2;

    INSERT INTO atendimento (paciente_id, origem_registro)
    VALUES (v_paciente_1, 'cadastro_sistema')
    RETURNING atendimento_id INTO v_atendimento_1;
    INSERT INTO atendimento (paciente_id, origem_registro)
    VALUES (v_paciente_1, 'cadastro_sistema')
    RETURNING atendimento_id INTO v_atendimento_2;

    SELECT projeto_estudo_id INTO STRICT v_projeto_benbrasil
      FROM projeto_estudo WHERE codigo_projeto = 'benbrasil';
    SELECT projeto_estudo_id INTO STRICT v_projeto_epoca
      FROM projeto_estudo WHERE codigo_projeto = 'epoca';

    INSERT INTO encaminhamento (
        atendimento_id, documento_apresentado, projeto_estudo_id,
        valor_original_documento_apresentado, valor_original_projeto
    ) VALUES (
        v_atendimento_1, TRUE, v_projeto_benbrasil, 'S', 'BenBrasil'
    ) RETURNING encaminhamento_id, atualizado_em
      INTO v_enc_true, v_atualizado_anterior;
    IF NOT EXISTS (
        SELECT 1 FROM encaminhamento WHERE encaminhamento_id = v_enc_true
           AND documento_apresentado IS TRUE
    ) THEN RAISE EXCEPTION 'cenario 1: TRUE nao foi preservado'; END IF;

    INSERT INTO encaminhamento (atendimento_id, documento_apresentado)
    VALUES (v_atendimento_1, FALSE) RETURNING encaminhamento_id INTO v_enc_false;
    IF NOT EXISTS (
        SELECT 1 FROM encaminhamento WHERE encaminhamento_id = v_enc_false
           AND documento_apresentado IS FALSE
    ) THEN RAISE EXCEPTION 'cenario 2: FALSE nao foi preservado'; END IF;

    INSERT INTO encaminhamento (atendimento_id)
    VALUES (v_atendimento_1) RETURNING encaminhamento_id INTO v_enc_null;
    IF NOT EXISTS (
        SELECT 1 FROM encaminhamento WHERE encaminhamento_id = v_enc_null
           AND documento_apresentado IS NULL
    ) THEN RAISE EXCEPTION 'cenario 3: NULL nao foi aceito'; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM encaminhamento WHERE encaminhamento_id = v_enc_true
           AND valor_original_documento_apresentado = 'S'
           AND valor_original_projeto = 'BenBrasil'
    ) THEN RAISE EXCEPTION 'cenario 4: valores originais divergiram'; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM encaminhamento WHERE encaminhamento_id = v_enc_false
           AND projeto_estudo_id IS NULL
    ) THEN RAISE EXCEPTION 'cenario 5: projeto opcional nao foi aceito'; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM encaminhamento WHERE encaminhamento_id = v_enc_true
           AND projeto_estudo_id = v_projeto_benbrasil
    ) THEN RAISE EXCEPTION 'cenario 6: BenBrasil nao foi vinculado'; END IF;

    INSERT INTO encaminhamento (
        atendimento_id, documento_apresentado, projeto_estudo_id,
        valor_original_projeto
    ) VALUES (v_atendimento_1, NULL, v_projeto_epoca, 'EPOCA')
    RETURNING encaminhamento_id INTO v_enc_epoca;
    IF v_projeto_benbrasil = v_projeto_epoca OR NOT EXISTS (
        SELECT 1 FROM encaminhamento WHERE encaminhamento_id = v_enc_epoca
           AND projeto_estudo_id = v_projeto_epoca
    ) THEN RAISE EXCEPTION 'cenario 7: BenBrasil e EPOCA nao estao distintos'; END IF;

    INSERT INTO encaminhamento (atendimento_id, projeto_estudo_id)
    VALUES (v_atendimento_2, v_projeto_benbrasil);
    IF (SELECT count(*) FROM encaminhamento
         WHERE projeto_estudo_id = v_projeto_benbrasil
           AND atendimento_id IN (v_atendimento_1, v_atendimento_2)) < 2 THEN
        RAISE EXCEPTION 'cenario 8: varios encaminhamentos no mesmo projeto falharam';
    END IF;

    IF (SELECT count(*) FROM encaminhamento
         WHERE atendimento_id = v_atendimento_1
           AND encaminhamento_id IN (v_enc_true, v_enc_false, v_enc_null, v_enc_epoca)) <> 4 THEN
        RAISE EXCEPTION 'cenario 9: multiplos encaminhamentos no atendimento falharam';
    END IF;

    IF (SELECT count(DISTINCT a.atendimento_id)
          FROM encaminhamento e JOIN atendimento a USING (atendimento_id)
         WHERE a.paciente_id = v_paciente_1
           AND a.atendimento_id IN (v_atendimento_1, v_atendimento_2)) <> 2 THEN
        RAISE EXCEPTION 'cenario 10: encaminhamentos em atendimentos distintos falharam';
    END IF;

    BEGIN
        INSERT INTO encaminhamento (atendimento_id) VALUES (NULL);
        RAISE EXCEPTION 'cenario 11: atendimento nulo foi aceito';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO encaminhamento (atendimento_id) VALUES (-1);
        RAISE EXCEPTION 'cenario 11: atendimento inexistente foi aceito';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO encaminhamento (atendimento_id, projeto_estudo_id)
        VALUES (v_atendimento_1, -1);
        RAISE EXCEPTION 'cenario 12: projeto inexistente foi aceito';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;

    INSERT INTO projeto_estudo (codigo_projeto, nome_projeto)
    VALUES (v_codigo || '_projeto', 'Projeto Sintetico Encaminhamento')
    RETURNING projeto_estudo_id INTO v_projeto_sintetico;
    INSERT INTO encaminhamento (atendimento_id, projeto_estudo_id)
    VALUES (v_atendimento_1, v_projeto_sintetico);
    BEGIN
        DELETE FROM projeto_estudo WHERE projeto_estudo_id = v_projeto_sintetico;
        RAISE EXCEPTION 'cenario 13: projeto referenciado foi excluido';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;

    INSERT INTO atendimento (paciente_id, origem_registro)
    VALUES (v_paciente_2, 'cadastro_sistema')
    RETURNING atendimento_id INTO v_atendimento_cascade;
    INSERT INTO encaminhamento (atendimento_id, documento_apresentado)
    VALUES (v_atendimento_cascade, TRUE)
    RETURNING encaminhamento_id INTO v_enc_cascade;
    DELETE FROM atendimento WHERE atendimento_id = v_atendimento_cascade;
    IF EXISTS (SELECT 1 FROM encaminhamento WHERE encaminhamento_id = v_enc_cascade) THEN
        RAISE EXCEPTION 'cenario 14: CASCADE do atendimento nao foi preservado';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'ambulatorio' AND table_name = 'encaminhamento'
           AND column_name = 'paciente_id'
    ) OR NOT EXISTS (
        SELECT 1 FROM encaminhamento e JOIN atendimento a USING (atendimento_id)
         WHERE e.encaminhamento_id = v_enc_true AND a.paciente_id = v_paciente_1
    ) THEN RAISE EXCEPTION 'cenario 15: paciente nao foi determinado somente pelo atendimento'; END IF;

    INSERT INTO atendimento_projeto_estudo (atendimento_id, projeto_estudo_id)
    VALUES (v_atendimento_1, v_projeto_sintetico);
    INSERT INTO paciente_projeto_estudo (paciente_id, projeto_estudo_id)
    VALUES (v_paciente_1, v_projeto_sintetico);
    IF NOT EXISTS (SELECT 1 FROM atendimento_projeto_estudo
                    WHERE atendimento_id = v_atendimento_1
                      AND projeto_estudo_id = v_projeto_sintetico)
       OR NOT EXISTS (SELECT 1 FROM paciente_projeto_estudo
                       WHERE paciente_id = v_paciente_1
                         AND projeto_estudo_id = v_projeto_sintetico) THEN
        RAISE EXCEPTION 'cenario 16: estruturas de projeto nao coexistiram';
    END IF;

    INSERT INTO encaminhamento (atendimento_id, valor_original_encaminhamento)
    VALUES (v_atendimento_2, 'Registro legado sintetico')
    RETURNING encaminhamento_id INTO v_enc_legado;
    IF NOT EXISTS (
        SELECT 1 FROM encaminhamento WHERE encaminhamento_id = v_enc_legado
           AND documento_apresentado IS NULL AND projeto_estudo_id IS NULL
           AND valor_original_documento_apresentado IS NULL
           AND valor_original_projeto IS NULL
    ) THEN RAISE EXCEPTION 'cenario 17: campos novos receberam backfill/default'; END IF;

    UPDATE encaminhamento
       SET atualizado_em = v_atualizado_anterior + INTERVAL '1 second'
     WHERE encaminhamento_id = v_enc_true;
    IF NOT EXISTS (
        SELECT 1 FROM encaminhamento WHERE encaminhamento_id = v_enc_true
           AND criado_em IS NOT NULL AND atualizado_em > v_atualizado_anterior
    ) THEN RAISE EXCEPTION 'cenario 18: timestamps existentes divergiram'; END IF;

    IF (SELECT count(*) FROM information_schema.columns
         WHERE table_schema = 'ambulatorio' AND table_name = 'encaminhamento'
           AND column_name IN ('documento_apresentado', 'projeto_estudo_id',
               'valor_original_documento_apresentado', 'valor_original_projeto')
           AND is_nullable = 'YES' AND column_default IS NULL) <> 4
       OR NOT EXISTS (
           SELECT 1 FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           JOIN pg_namespace n ON n.oid = t.relnamespace
          WHERE n.nspname = 'ambulatorio' AND t.relname = 'encaminhamento'
            AND c.conname = 'fk_encaminhamento_projeto' AND c.contype = 'f'
            AND c.confdeltype = 'r'
       ) OR NOT EXISTS (
           SELECT 1 FROM pg_indexes
            WHERE schemaname = 'ambulatorio' AND tablename = 'encaminhamento'
              AND indexname = 'idx_encaminhamento_projeto_estudo_id'
              AND indexdef LIKE '%WHERE (projeto_estudo_id IS NOT NULL)%'
       ) THEN RAISE EXCEPTION 'cenario 19: colunas, FK ou indice divergiram'; END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'ambulatorio' AND t.relname = 'encaminhamento'
          AND c.contype = 'u'
    ) THEN RAISE EXCEPTION 'cenario 20: UNIQUE nova encontrada'; END IF;

    INSERT INTO importacao_lote (
        codigo_lote, hash_arquivo_sha256, layout_versao
    ) VALUES (
        v_codigo || '_lote', md5(v_codigo) || md5(v_codigo || '_hash'),
        v_codigo || '_layout'
    ) RETURNING importacao_lote_id INTO v_lote;
    INSERT INTO importacao_linha (
        importacao_lote_id, aba_nome_original, aba_ordem, numero_linha, dados_brutos
    ) VALUES (v_lote, 'Aba Sintetica', 1, 1, '[]'::jsonb)
    RETURNING importacao_linha_id INTO v_linha;
    INSERT INTO importacao_registro (
        importacao_linha_id, tabela_destino, registro_id, acao
    ) VALUES (v_linha, 'encaminhamento', v_enc_true, 'criado');
    IF NOT EXISTS (
        SELECT 1 FROM importacao_registro WHERE importacao_linha_id = v_linha
           AND tabela_destino = 'encaminhamento' AND registro_id = v_enc_true
           AND acao = 'criado'
    ) THEN RAISE EXCEPTION 'cenario 21: proveniencia nao foi registrada'; END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'ambulatorio' AND table_name = 'acompanhamento_cuidado'
           AND column_name ILIKE '%contrarrefer%'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'ambulatorio' AND t.relname = 'acompanhamento_cuidado'
          AND c.conname = 'fk_acompanhamento_encaminhamento'
    ) THEN RAISE EXCEPTION 'cenario 22: contrarreferencia/acompanhamento foi alterado'; END IF;

    RAISE NOTICE 'OK: cenarios 1-22 de encaminhamento ampliado validados';
END $$;

ROLLBACK;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_encaminhamento_codigo');
BEGIN
    IF EXISTS (
        SELECT 1 FROM ambulatorio.paciente
         WHERE codigo_planilha LIKE v_codigo || '%'
    ) OR EXISTS (
        SELECT 1 FROM ambulatorio.projeto_estudo
         WHERE codigo_projeto = v_codigo || '_projeto'
    ) OR EXISTS (
        SELECT 1 FROM ambulatorio.importacao_lote
         WHERE codigo_lote = v_codigo || '_lote'
    ) THEN
        RAISE EXCEPTION 'cenario 23: dados sinteticos persistiram apos ROLLBACK';
    END IF;
    RAISE NOTICE 'OK: cenario 23, ROLLBACK alcancado sem dados sinteticos persistidos';
END $$;
