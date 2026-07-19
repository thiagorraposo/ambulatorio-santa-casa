\set ON_ERROR_STOP on

SELECT 'validacao_importacao_' || txid_current()::TEXT AS codigo \gset
SELECT set_config('ambulatorio.validacao_importacao_codigo', :'codigo', FALSE);

BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_importacao_codigo');
    v_hash_a TEXT := repeat('a', 64);
    v_hash_b TEXT := repeat('b', 64);
    v_lote_inicial_id BIGINT;
    v_lote_reprocessado_id BIGINT;
    v_lote_outro_id BIGINT;
    v_linha_1_id BIGINT;
    v_linha_2_id BIGINT;
    v_linha_reprocessada_id BIGINT;
    v_paciente_1_id BIGINT;
    v_paciente_2_id BIGINT;
    v_status TEXT;
    v_total INTEGER;
BEGIN
    INSERT INTO importacao_lote (
        codigo_lote,
        hash_arquivo_sha256,
        layout_versao
    )
    VALUES (v_codigo || '_inicial', v_hash_a, 'layout_sintetico_v1')
    RETURNING importacao_lote_id INTO v_lote_inicial_id;

    IF NOT EXISTS (
        SELECT 1
          FROM importacao_lote
         WHERE importacao_lote_id = v_lote_inicial_id
           AND status_lote = 'recebido'
           AND criado_em IS NOT NULL
           AND atualizado_em IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'defaults do lote inicial nao foram preenchidos';
    END IF;

    FOREACH v_status IN ARRAY ARRAY[
        'recebido', 'validando', 'pronto', 'processando',
        'concluido', 'concluido_com_pendencias', 'falhou', 'cancelado'
    ] LOOP
        UPDATE importacao_lote
           SET status_lote = v_status
         WHERE importacao_lote_id = v_lote_inicial_id;
    END LOOP;

    INSERT INTO importacao_lote (
        codigo_lote,
        hash_arquivo_sha256,
        layout_versao,
        lote_reprocessado_de_id,
        status_lote,
        iniciado_em,
        finalizado_em
    )
    VALUES (
        v_codigo || '_reprocessado',
        v_hash_a,
        'layout_sintetico_v1',
        v_lote_inicial_id,
        'pronto',
        TIMESTAMP '2026-07-19 10:00:00',
        TIMESTAMP '2026-07-19 10:01:00'
    )
    RETURNING importacao_lote_id INTO v_lote_reprocessado_id;

    INSERT INTO importacao_lote (
        codigo_lote,
        hash_arquivo_sha256,
        layout_versao
    )
    VALUES (v_codigo || '_outro', v_hash_b, 'layout_sintetico_v1')
    RETURNING importacao_lote_id INTO v_lote_outro_id;

    RAISE NOTICE 'OK: lote inicial, defaults, status validos e reprocessamento inseridos';

    BEGIN
        INSERT INTO importacao_lote (
            codigo_lote,
            hash_arquivo_sha256,
            layout_versao
        )
        VALUES (v_codigo || '_inicial_duplicado', v_hash_a, 'layout_sintetico_v1');
        RAISE EXCEPTION 'indice unico parcial aceitou segundo lote inicial';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'OK: segundo lote inicial do mesmo hash e layout bloqueado';
    END;

    BEGIN
        INSERT INTO importacao_lote (
            codigo_lote,
            hash_arquivo_sha256,
            layout_versao,
            lote_reprocessado_de_id
        )
        VALUES (
            v_codigo || '_predecessor_invalido',
            v_hash_a,
            'layout_sintetico_v1',
            v_lote_outro_id
        );
        RAISE EXCEPTION 'FK composta aceitou predecessor de hash diferente';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: predecessor com hash ou layout diferente bloqueado';
    END;

    BEGIN
        UPDATE importacao_lote
           SET lote_reprocessado_de_id = v_lote_reprocessado_id
         WHERE importacao_lote_id = v_lote_reprocessado_id;
        RAISE EXCEPTION 'CHECK aceitou autorreferencia de reprocessamento';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: autorreferencia de reprocessamento bloqueada';
    END;

    BEGIN
        INSERT INTO importacao_lote (
            codigo_lote,
            hash_arquivo_sha256,
            layout_versao
        )
        VALUES (v_codigo || '_hash_invalido', 'ABC123', 'layout_sintetico_v2');
        RAISE EXCEPTION 'CHECK aceitou SHA-256 invalido';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: SHA-256 invalido bloqueado';
    END;

    BEGIN
        UPDATE importacao_lote SET status_lote = 'desconhecido'
         WHERE importacao_lote_id = v_lote_inicial_id;
        RAISE EXCEPTION 'CHECK aceitou status de lote invalido';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: status de lote invalido bloqueado';
    END;

    BEGIN
        UPDATE importacao_lote
           SET iniciado_em = TIMESTAMP '2026-07-19 11:00:00',
               finalizado_em = TIMESTAMP '2026-07-19 10:00:00'
         WHERE importacao_lote_id = v_lote_inicial_id;
        RAISE EXCEPTION 'CHECK aceitou periodo de lote invertido';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: periodo de lote invertido bloqueado';
    END;

    INSERT INTO importacao_linha (
        importacao_lote_id,
        aba_nome_original,
        aba_ordem,
        numero_linha,
        dados_brutos,
        responsavel_digitacao_original,
        mensagem_processamento
    )
    VALUES (
        v_lote_inicial_id,
        'Aba Sintetica',
        1,
        2,
        jsonb_build_array(
            jsonb_build_object(
                'coluna_ordem', 1,
                'cabecalho_original', 'ECO',
                'ocorrencia_cabecalho', 1,
                'coluna_chave', 'eco_trazido',
                'valor_original', 'valor sintetico A'
            ),
            jsonb_build_object(
                'coluna_ordem', 2,
                'cabecalho_original', 'ECO',
                'ocorrencia_cabecalho', 2,
                'coluna_chave', 'eco_solicitado',
                'valor_original', 'valor sintetico B'
            )
        ),
        'Digitador Legado Sintetico',
        v_codigo
    )
    RETURNING importacao_linha_id INTO v_linha_1_id;

    INSERT INTO importacao_linha (
        importacao_lote_id,
        aba_nome_original,
        aba_ordem,
        numero_linha,
        dados_brutos,
        status_linha,
        mensagem_processamento
    )
    VALUES (
        v_lote_inicial_id,
        'Aba Sintetica',
        1,
        3,
        '[]'::JSONB,
        'ignorada',
        v_codigo
    )
    RETURNING importacao_linha_id INTO v_linha_2_id;

    INSERT INTO importacao_linha (
        importacao_lote_id,
        aba_nome_original,
        aba_ordem,
        numero_linha,
        dados_brutos,
        mensagem_processamento
    )
    VALUES (
        v_lote_reprocessado_id,
        'Aba Sintetica',
        1,
        2,
        '[]'::JSONB,
        v_codigo
    )
    RETURNING importacao_linha_id INTO v_linha_reprocessada_id;

    FOREACH v_status IN ARRAY ARRAY[
        'pendente', 'processando', 'importada',
        'importada_com_pendencia', 'rejeitada', 'ignorada'
    ] LOOP
        UPDATE importacao_linha
           SET status_linha = v_status
         WHERE importacao_linha_id = v_linha_reprocessada_id;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1
          FROM importacao_linha
         WHERE importacao_linha_id = v_linha_1_id
           AND status_linha = 'pendente'
           AND responsavel_digitacao_original = 'Digitador Legado Sintetico'
           AND criado_em IS NOT NULL
           AND atualizado_em IS NOT NULL
           AND jsonb_array_length(dados_brutos) = 2
           AND dados_brutos -> 0 ->> 'cabecalho_original' = 'ECO'
           AND dados_brutos -> 0 ->> 'ocorrencia_cabecalho' = '1'
           AND dados_brutos -> 1 ->> 'cabecalho_original' = 'ECO'
           AND dados_brutos -> 1 ->> 'ocorrencia_cabecalho' = '2'
           AND dados_brutos -> 0 ->> 'valor_original' = 'valor sintetico A'
           AND dados_brutos -> 1 ->> 'valor_original' = 'valor sintetico B'
    ) THEN
        RAISE EXCEPTION 'JSONB ordenado, duplicatas, responsavel ou defaults divergiram';
    END IF;

    RAISE NOTICE 'OK: JSONB ordenado, cabecalhos repetidos, responsavel legado e status de linha validados';

    BEGIN
        INSERT INTO importacao_linha (
            importacao_lote_id,
            aba_nome_original,
            aba_ordem,
            numero_linha,
            dados_brutos
        )
        VALUES (v_lote_inicial_id, 'Aba Sintetica', 1, 2, '[]'::JSONB);
        RAISE EXCEPTION 'UNIQUE aceitou linha duplicada no lote, aba e posicao';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'OK: linha duplicada no lote, aba e posicao bloqueada';
    END;

    BEGIN
        INSERT INTO importacao_linha (
            importacao_lote_id,
            aba_nome_original,
            aba_ordem,
            numero_linha,
            dados_brutos
        )
        VALUES (v_lote_inicial_id, 'Aba Sintetica', 1, 4, '{}'::JSONB);
        RAISE EXCEPTION 'CHECK aceitou JSONB que nao e array';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: JSONB que nao e array bloqueado';
    END;

    BEGIN
        UPDATE importacao_linha SET status_linha = 'desconhecido'
         WHERE importacao_linha_id = v_linha_1_id;
        RAISE EXCEPTION 'CHECK aceitou status de linha invalido';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: status de linha invalido bloqueado';
    END;

    BEGIN
        INSERT INTO importacao_linha (
            importacao_lote_id,
            aba_nome_original,
            aba_ordem,
            numero_linha,
            dados_brutos
        )
        VALUES (v_lote_inicial_id, ' ', 1, 4, '[]'::JSONB);
        RAISE EXCEPTION 'CHECK aceitou nome de aba vazio';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: nome de aba vazio bloqueado';
    END;

    BEGIN
        INSERT INTO importacao_linha (
            importacao_lote_id,
            aba_nome_original,
            aba_ordem,
            numero_linha,
            dados_brutos
        )
        VALUES (v_lote_inicial_id, 'Aba Sintetica', 0, 4, '[]'::JSONB);
        RAISE EXCEPTION 'CHECK aceitou ordem de aba nao positiva';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: ordem de aba nao positiva bloqueada';
    END;

    BEGIN
        INSERT INTO importacao_linha (
            importacao_lote_id,
            aba_nome_original,
            aba_ordem,
            numero_linha,
            dados_brutos
        )
        VALUES (v_lote_inicial_id, 'Aba Sintetica', 1, 0, '[]'::JSONB);
        RAISE EXCEPTION 'CHECK aceitou numero de linha nao positivo';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: numero de linha nao positivo bloqueado';
    END;

    INSERT INTO paciente (codigo_planilha, nome)
    VALUES (v_codigo || '_paciente_1', 'Paciente Sintetico Importacao 1')
    RETURNING paciente_id INTO v_paciente_1_id;

    INSERT INTO paciente (codigo_planilha, nome)
    VALUES (v_codigo || '_paciente_2', 'Paciente Sintetico Importacao 2')
    RETURNING paciente_id INTO v_paciente_2_id;

    INSERT INTO importacao_registro (
        importacao_linha_id,
        tabela_destino,
        registro_id,
        acao
    )
    VALUES
        (v_linha_1_id, 'paciente', v_paciente_1_id, 'criado'),
        (v_linha_1_id, 'paciente', v_paciente_2_id, 'associado'),
        (v_linha_2_id, 'paciente', v_paciente_1_id, 'atualizado');

    SELECT count(*)
      INTO v_total
      FROM importacao_registro
     WHERE schema_destino = 'ambulatorio'
       AND tabela_destino = 'paciente'
       AND (
            importacao_linha_id IN (v_linha_1_id, v_linha_2_id)
            OR registro_id IN (v_paciente_1_id, v_paciente_2_id)
       );

    IF v_total <> 3 THEN
        RAISE EXCEPTION 'cardinalidade N:N ou default de schema divergiram: %', v_total;
    END IF;

    RAISE NOTICE 'OK: associacao generica N:N e todas as acoes validas validadas';

    BEGIN
        INSERT INTO importacao_registro (
            importacao_linha_id,
            tabela_destino,
            registro_id,
            acao
        )
        VALUES (v_linha_1_id, 'paciente', v_paciente_1_id, 'atualizado');
        RAISE EXCEPTION 'UNIQUE aceitou vinculo generico duplicado';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'OK: vinculo generico duplicado bloqueado';
    END;

    BEGIN
        INSERT INTO importacao_registro (
            importacao_linha_id,
            schema_destino,
            tabela_destino,
            registro_id,
            acao
        )
        VALUES (v_linha_1_id, 'public', 'paciente', v_paciente_1_id, 'criado');
        RAISE EXCEPTION 'CHECK aceitou schema de destino invalido';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: schema de destino invalido bloqueado';
    END;

    BEGIN
        INSERT INTO importacao_registro (
            importacao_linha_id,
            tabela_destino,
            registro_id,
            acao
        )
        VALUES (v_linha_1_id, ' ', v_paciente_1_id, 'criado');
        RAISE EXCEPTION 'CHECK aceitou tabela vazia';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: tabela vazia bloqueada';
    END;

    BEGIN
        INSERT INTO importacao_registro (
            importacao_linha_id,
            tabela_destino,
            registro_id,
            acao
        )
        VALUES (v_linha_1_id, 'paciente', 0, 'criado');
        RAISE EXCEPTION 'CHECK aceitou ID de registro nao positivo';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: ID de registro nao positivo bloqueado';
    END;

    BEGIN
        INSERT INTO importacao_registro (
            importacao_linha_id,
            tabela_destino,
            registro_id,
            acao
        )
        VALUES (v_linha_1_id, 'paciente', v_paciente_1_id + 1000, 'desconhecida');
        RAISE EXCEPTION 'CHECK aceitou acao invalida';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'OK: acao invalida bloqueada';
    END;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
         WHERE schemaname = 'ambulatorio'
           AND indexname = 'uq_importacao_lote_inicial'
           AND indexdef LIKE 'CREATE UNIQUE INDEX%WHERE (lote_reprocessado_de_id IS NULL)'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_indexes
         WHERE schemaname = 'ambulatorio'
           AND indexname = 'idx_importacao_lote_hash_layout'
           AND indexdef LIKE '%(hash_arquivo_sha256, layout_versao)%'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_indexes
         WHERE schemaname = 'ambulatorio'
           AND indexname = 'idx_importacao_linha_lote_status'
           AND indexdef LIKE '%(importacao_lote_id, status_linha)%'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_indexes
         WHERE schemaname = 'ambulatorio'
           AND indexname = 'idx_importacao_registro_destino'
           AND indexdef LIKE '%(schema_destino, tabela_destino, registro_id)%'
    ) OR EXISTS (
        SELECT 1 FROM pg_indexes
         WHERE schemaname = 'ambulatorio'
           AND tablename = 'importacao_linha'
           AND indexdef LIKE '%USING gin%'
    ) THEN
        RAISE EXCEPTION 'indices esperados ausentes ou indice GIN indevido encontrado';
    END IF;

    RAISE NOTICE 'OK: indices explicitos e ausencia de GIN validados';

    BEGIN
        DELETE FROM importacao_lote
         WHERE importacao_lote_id = v_lote_inicial_id;
        RAISE EXCEPTION 'ON DELETE RESTRICT aceitou excluir lote referenciado';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: ON DELETE RESTRICT protegeu lote referenciado';
    END;

    BEGIN
        DELETE FROM importacao_linha
         WHERE importacao_linha_id = v_linha_1_id;
        RAISE EXCEPTION 'ON DELETE RESTRICT aceitou excluir linha vinculada';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: ON DELETE RESTRICT protegeu linha vinculada';
    END;

    BEGIN
        INSERT INTO importacao_linha (
            importacao_lote_id,
            aba_nome_original,
            aba_ordem,
            numero_linha,
            dados_brutos
        )
        VALUES (-1, 'Aba Sintetica', 1, 1, '[]'::JSONB);
        RAISE EXCEPTION 'FK aceitou lote inexistente';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: FK bloqueou lote inexistente';
    END;

    BEGIN
        INSERT INTO importacao_registro (
            importacao_linha_id,
            tabela_destino,
            registro_id,
            acao
        )
        VALUES (-1, 'paciente', 1, 'associado');
        RAISE EXCEPTION 'FK aceitou linha inexistente';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: FK bloqueou linha inexistente';
    END;
END
$$;

ROLLBACK;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_importacao_codigo');
BEGIN
    IF EXISTS (
        SELECT 1
          FROM ambulatorio.importacao_lote
         WHERE codigo_lote LIKE v_codigo || '\_%' ESCAPE '\'
    ) OR EXISTS (
        SELECT 1
          FROM ambulatorio.importacao_linha
         WHERE mensagem_processamento = v_codigo
    ) OR EXISTS (
        SELECT 1
          FROM ambulatorio.paciente
         WHERE codigo_planilha LIKE v_codigo || '\_%' ESCAPE '\'
    ) THEN
        RAISE EXCEPTION 'ROLLBACK nao removeu todos os dados sinteticos';
    END IF;

    RAISE NOTICE 'OK: ROLLBACK confirmado; nenhum dado sintetico de importacao persistiu';
END
$$;
