\set ON_ERROR_STOP on

SELECT 'validacao_bzn_' || txid_current()::TEXT AS codigo \gset
SELECT set_config('ambulatorio.validacao_bzn_codigo', :'codigo', FALSE);

BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_bzn_codigo');
    v_paciente_1 BIGINT;
    v_paciente_2 BIGINT;
    v_paciente_cascade BIGINT;
    v_atendimento_1 BIGINT;
    v_atendimento_2 BIGINT;
    v_atendimento_remover BIGINT;
    v_tratamento_1 BIGINT;
    v_tratamento_2 BIGINT;
    v_tratamento_preservado BIGINT;
    v_tratamento_cascade BIGINT;
    v_reacao_1 BIGINT;
    v_reacao_cascade BIGINT;
    v_legado BIGINT;
    v_lote BIGINT;
    v_linha_1 BIGINT;
    v_linha_2 BIGINT;
    v_atualizado_anterior TIMESTAMP;
    v_canonicos_antes_legado INTEGER;
BEGIN
    INSERT INTO paciente (codigo_planilha, nome) VALUES
        (v_codigo || '_p1', 'Paciente Sintetico BZN 1')
        RETURNING paciente_id INTO v_paciente_1;
    INSERT INTO paciente (codigo_planilha, nome) VALUES
        (v_codigo || '_p2', 'Paciente Sintetico BZN 2')
        RETURNING paciente_id INTO v_paciente_2;

    INSERT INTO atendimento (paciente_id, origem_registro)
    VALUES (v_paciente_1, 'cadastro_sistema')
    RETURNING atendimento_id INTO v_atendimento_1;
    INSERT INTO atendimento (paciente_id, origem_registro)
    VALUES (v_paciente_2, 'cadastro_sistema')
    RETURNING atendimento_id INTO v_atendimento_2;

    INSERT INTO tratamento_benzonidazol (
        paciente_id, tem_indicacao, iniciado, tratamento_pelo_ambulatorio,
        duracao_cumprida_dias, ano_uso_aproximado, data_prescricao,
        motivo_nao_indicacao, motivo_nao_inicio, teve_reacao_adversa,
        valor_original_indicacao, valor_original_inicio,
        valor_original_tratamento_ambulatorio, valor_original_duracao,
        valor_original_ano_uso, valor_original_data_prescricao,
        valor_original_motivo_nao_indicacao, valor_original_motivo_nao_inicio,
        valor_original_reacao_adversa, observacoes
    ) VALUES (
        v_paciente_1, FALSE, TRUE, NULL, 42, 2020, DATE '2026-08-13',
        'Motivo sintetico de nao indicacao', 'Motivo sintetico de nao inicio', TRUE,
        'nao original', 'sim original', 'vazio original', '6 semanas',
        'aprox. 2020', '13/08/2026', 'motivo indicacao original',
        'motivo inicio original', 'sim reacao original', 'Combinacao contraditoria sintetica'
    ) RETURNING tratamento_benzonidazol_id, atualizado_em
      INTO v_tratamento_1, v_atualizado_anterior;

    IF NOT EXISTS (
        SELECT 1 FROM tratamento_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND paciente_id = v_paciente_1 AND atendimento_id IS NULL
    ) THEN
        RAISE EXCEPTION 'cenario 1: tratamento sem atendimento nao foi aceito';
    END IF;

    UPDATE tratamento_benzonidazol
       SET atendimento_id = v_atendimento_1
     WHERE tratamento_benzonidazol_id = v_tratamento_1;
    IF NOT EXISTS (
        SELECT 1 FROM tratamento_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND atendimento_id = v_atendimento_1 AND paciente_id = v_paciente_1
    ) THEN
        RAISE EXCEPTION 'cenario 2: atendimento do mesmo paciente nao foi aceito';
    END IF;

    BEGIN
        UPDATE tratamento_benzonidazol
           SET atendimento_id = v_atendimento_2
         WHERE tratamento_benzonidazol_id = v_tratamento_1;
        RAISE EXCEPTION 'cenario 3: atendimento de outro paciente foi aceito';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;

    BEGIN
        INSERT INTO tratamento_benzonidazol (paciente_id) VALUES (v_paciente_1);
        RAISE EXCEPTION 'cenario 4: segundo tratamento do paciente foi aceito';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;

    INSERT INTO tratamento_benzonidazol (
        paciente_id, tem_indicacao, iniciado, tratamento_pelo_ambulatorio,
        teve_reacao_adversa
    ) VALUES (v_paciente_2, TRUE, FALSE, FALSE, FALSE)
    RETURNING tratamento_benzonidazol_id INTO v_tratamento_2;
    IF (SELECT count(*) FROM tratamento_benzonidazol
         WHERE paciente_id IN (v_paciente_1, v_paciente_2)) <> 2 THEN
        RAISE EXCEPTION 'cenario 5: tratamentos de pacientes diferentes divergiram';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM tratamento_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND tem_indicacao IS FALSE AND iniciado IS TRUE
           AND tratamento_pelo_ambulatorio IS NULL
           AND teve_reacao_adversa IS TRUE
    ) OR NOT EXISTS (
        SELECT 1 FROM tratamento_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_2
           AND tem_indicacao IS TRUE AND iniciado IS FALSE
           AND tratamento_pelo_ambulatorio IS FALSE
           AND teve_reacao_adversa IS FALSE
    ) THEN
        RAISE EXCEPTION 'cenario 6: indicadores triestados divergiram';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM tratamento_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND motivo_nao_indicacao = 'Motivo sintetico de nao indicacao'
           AND motivo_nao_inicio = 'Motivo sintetico de nao inicio'
           AND valor_original_motivo_nao_indicacao = 'motivo indicacao original'
           AND valor_original_motivo_nao_inicio = 'motivo inicio original'
    ) THEN
        RAISE EXCEPTION 'cenario 7: motivos separados nao foram preservados';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM tratamento_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND tem_indicacao IS FALSE AND iniciado IS TRUE
           AND motivo_nao_indicacao IS NOT NULL AND motivo_nao_inicio IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'cenario 8: combinacao contraditoria nao foi preservada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM tratamento_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND duracao_cumprida_dias = 42
           AND valor_original_duracao = '6 semanas'
    ) THEN
        RAISE EXCEPTION 'cenario 9: duracao ou valor original divergiram';
    END IF;

    BEGIN
        UPDATE tratamento_benzonidazol SET duracao_cumprida_dias = 0
         WHERE tratamento_benzonidazol_id = v_tratamento_1;
        RAISE EXCEPTION 'cenario 10: duracao zero foi aceita';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE tratamento_benzonidazol SET duracao_cumprida_dias = -1
         WHERE tratamento_benzonidazol_id = v_tratamento_1;
        RAISE EXCEPTION 'cenario 10: duracao negativa foi aceita';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    IF NOT EXISTS (
        SELECT 1 FROM tratamento_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND ano_uso_aproximado = 2020
           AND valor_original_ano_uso = 'aprox. 2020'
    ) THEN
        RAISE EXCEPTION 'cenario 11: ano aproximado ou original divergiram';
    END IF;

    BEGIN
        UPDATE tratamento_benzonidazol SET ano_uso_aproximado = 0
         WHERE tratamento_benzonidazol_id = v_tratamento_1;
        RAISE EXCEPTION 'cenario 12: ano zero foi aceito';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE tratamento_benzonidazol SET ano_uso_aproximado = -1
         WHERE tratamento_benzonidazol_id = v_tratamento_1;
        RAISE EXCEPTION 'cenario 12: ano negativo foi aceito';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    IF NOT EXISTS (
        SELECT 1 FROM tratamento_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND data_prescricao = DATE '2026-08-13'
           AND valor_original_data_prescricao = '13/08/2026'
           AND ano_uso_aproximado = 2020 AND iniciado IS TRUE
    ) THEN
        RAISE EXCEPTION 'cenario 13: prescricao nao permaneceu independente';
    END IF;

    BEGIN
        INSERT INTO tratamento_benzonidazol (paciente_id) VALUES (NULL);
        RAISE EXCEPTION 'cenario 14: paciente nulo foi aceito';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO tratamento_benzonidazol (paciente_id) VALUES (-1);
        RAISE EXCEPTION 'cenario 14: paciente inexistente foi aceito';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO reacao_adversa_benzonidazol (tratamento_benzonidazol_id)
        VALUES (-1);
        RAISE EXCEPTION 'cenario 14: tratamento inexistente foi aceito na reacao';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    RAISE NOTICE 'OK: cenarios 1-14, identidade, atendimento, triestados, campos e constraints validados';

    INSERT INTO atendimento (paciente_id, origem_registro)
    VALUES (v_paciente_2, 'cadastro_sistema')
    RETURNING atendimento_id INTO v_atendimento_remover;
    UPDATE tratamento_benzonidazol SET atendimento_id = v_atendimento_remover
     WHERE tratamento_benzonidazol_id = v_tratamento_2;
    BEGIN
        DELETE FROM atendimento WHERE atendimento_id = v_atendimento_remover;
        RAISE EXCEPTION 'cenario 15: exclusão de atendimento auditado foi aceita';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    IF NOT EXISTS (
        SELECT 1 FROM tratamento_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_2
           AND paciente_id = v_paciente_2 AND atendimento_id = v_atendimento_remover
    ) THEN
        RAISE EXCEPTION 'cenario 15: recusa da exclusão não preservou tratamento, paciente e vínculo';
    END IF;

    INSERT INTO paciente (codigo_planilha, nome)
    VALUES (v_codigo || '_cascade', 'Paciente Sintetico BZN Cascade')
    RETURNING paciente_id INTO v_paciente_cascade;
    INSERT INTO tratamento_benzonidazol (paciente_id, teve_reacao_adversa)
    VALUES (v_paciente_cascade, TRUE)
    RETURNING tratamento_benzonidazol_id INTO v_tratamento_cascade;
    INSERT INTO reacao_adversa_benzonidazol (tratamento_benzonidazol_id, descricao)
    VALUES (v_tratamento_cascade, 'Reacao sintetica cascade');
    DELETE FROM paciente WHERE paciente_id = v_paciente_cascade;
    IF EXISTS (SELECT 1 FROM tratamento_benzonidazol
                WHERE tratamento_benzonidazol_id = v_tratamento_cascade)
       OR EXISTS (SELECT 1 FROM reacao_adversa_benzonidazol
                   WHERE tratamento_benzonidazol_id = v_tratamento_cascade) THEN
        RAISE EXCEPTION 'cenario 16: CASCADE do paciente falhou';
    END IF;

    IF EXISTS (SELECT 1 FROM reacao_adversa_benzonidazol
                WHERE tratamento_benzonidazol_id = v_tratamento_2) THEN
        RAISE EXCEPTION 'cenario 17: tratamento sem reacao recebeu detalhe';
    END IF;
    INSERT INTO reacao_adversa_benzonidazol (
        tratamento_benzonidazol_id, descricao, gravidade, data_reacao,
        consequencia, valor_original_descricao, valor_original_gravidade,
        valor_original_data_reacao, valor_original_consequencia, observacoes
    ) VALUES
        (v_tratamento_1, 'Reacao sintetica repetida', 'leve livre', DATE '2026-08-10',
         'consequencia livre', 'descricao original', 'gravidade original',
         '10/08/2026', 'consequencia original', 'observacao sintetica')
    RETURNING reacao_adversa_benzonidazol_id INTO v_reacao_1;
    INSERT INTO reacao_adversa_benzonidazol (
        tratamento_benzonidazol_id, descricao, gravidade, data_reacao,
        consequencia, valor_original_descricao, valor_original_gravidade,
        valor_original_data_reacao, valor_original_consequencia, observacoes
    ) VALUES (
        v_tratamento_1, 'Reacao sintetica repetida', 'outra gravidade livre', DATE '2026-08-10',
        'outra consequencia livre', 'descricao original 2', 'gravidade original 2',
        '10/08/2026', 'consequencia original 2', NULL
    );
    IF (SELECT count(*) FROM reacao_adversa_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1) <> 2 THEN
        RAISE EXCEPTION 'cenario 17: varias reacoes nao foram aceitas';
    END IF;
    IF (SELECT count(*) FROM reacao_adversa_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND descricao = 'Reacao sintetica repetida'
           AND data_reacao = DATE '2026-08-10') <> 2 THEN
        RAISE EXCEPTION 'cenario 18: unicidade clinica indevida bloqueou repeticao';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM reacao_adversa_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND descricao = 'Reacao sintetica repetida'
           AND gravidade = 'leve livre' AND data_reacao = DATE '2026-08-10'
           AND consequencia = 'consequencia livre'
           AND valor_original_descricao = 'descricao original'
           AND valor_original_gravidade = 'gravidade original'
           AND valor_original_data_reacao = '10/08/2026'
           AND valor_original_consequencia = 'consequencia original'
    ) THEN
        RAISE EXCEPTION 'cenario 19: detalhe ou valores originais da reacao divergiram';
    END IF;
    INSERT INTO reacao_adversa_benzonidazol (tratamento_benzonidazol_id, descricao)
    VALUES (v_tratamento_1, NULL);
    IF NOT EXISTS (
        SELECT 1 FROM reacao_adversa_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND descricao IS NULL AND gravidade IS NULL AND data_reacao IS NULL
           AND consequencia IS NULL AND valor_original_descricao IS NULL
    ) THEN
        RAISE EXCEPTION 'cenario 20: campos opcionais da reacao nao aceitaram NULL';
    END IF;
    INSERT INTO reacao_adversa_benzonidazol (
        tratamento_benzonidazol_id, gravidade, consequencia
    ) VALUES (v_tratamento_1, 'texto sem dominio X', 'texto sem dominio Y');
    IF NOT EXISTS (
        SELECT 1 FROM reacao_adversa_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND gravidade = 'texto sem dominio X'
           AND consequencia = 'texto sem dominio Y'
    ) THEN
        RAISE EXCEPTION 'cenario 21: textos livres de gravidade ou consequencia divergiram';
    END IF;

    INSERT INTO tratamento_benzonidazol (paciente_id)
    SELECT paciente_id FROM paciente WHERE paciente_id = v_paciente_2
    ON CONFLICT (paciente_id) DO UPDATE SET observacoes = EXCLUDED.observacoes
    RETURNING tratamento_benzonidazol_id INTO v_tratamento_preservado;
    INSERT INTO reacao_adversa_benzonidazol (tratamento_benzonidazol_id, descricao)
    VALUES (v_tratamento_preservado, 'Reacao para exclusao')
    RETURNING reacao_adversa_benzonidazol_id INTO v_reacao_cascade;
    DELETE FROM tratamento_benzonidazol
     WHERE tratamento_benzonidazol_id = v_tratamento_preservado;
    IF EXISTS (SELECT 1 FROM reacao_adversa_benzonidazol
                WHERE reacao_adversa_benzonidazol_id = v_reacao_cascade) THEN
        RAISE EXCEPTION 'cenario 22: CASCADE do tratamento falhou';
    END IF;
    RAISE NOTICE 'OK: cenarios 15-22, delecoes, multiplicidade e textos livres validados';

    SELECT count(*) INTO v_canonicos_antes_legado FROM tratamento_benzonidazol;
    INSERT INTO tratamento_chagas (
        atendimento_id, indicado, iniciado, eventos_adversos,
        descricao_eventos_adversos, valor_original_tratamento
    ) VALUES (
        v_atendimento_1, TRUE, TRUE, TRUE,
        'Evento legado sintetico', v_codigo
    ) RETURNING tratamento_chagas_id INTO v_legado;
    IF NOT EXISTS (SELECT 1 FROM tratamento_chagas WHERE tratamento_chagas_id = v_legado)
       OR (SELECT count(*) FROM tratamento_benzonidazol) <> v_canonicos_antes_legado THEN
        RAISE EXCEPTION 'cenario 23: legado nao coexistiu ou gerou escrita canonica';
    END IF;

    INSERT INTO importacao_lote (codigo_lote, hash_arquivo_sha256, layout_versao)
    VALUES (v_codigo, md5(v_codigo) || md5(v_codigo), 'layout_sintetico_bzn')
    RETURNING importacao_lote_id INTO v_lote;
    INSERT INTO importacao_linha (
        importacao_lote_id, aba_nome_original, aba_ordem, numero_linha, dados_brutos
    ) VALUES (v_lote, 'Aba Sintetica BZN', 1, 2, '[]'::jsonb)
    RETURNING importacao_linha_id INTO v_linha_1;
    INSERT INTO importacao_linha (
        importacao_lote_id, aba_nome_original, aba_ordem, numero_linha, dados_brutos
    ) VALUES (v_lote, 'Aba Sintetica BZN', 1, 3, '[]'::jsonb)
    RETURNING importacao_linha_id INTO v_linha_2;
    INSERT INTO importacao_registro (
        importacao_linha_id, tabela_destino, registro_id, acao
    ) VALUES
        (v_linha_1, 'tratamento_benzonidazol', v_tratamento_1, 'criado'),
        (v_linha_2, 'tratamento_benzonidazol', v_tratamento_1, 'associado'),
        (v_linha_1, 'reacao_adversa_benzonidazol', v_reacao_1, 'criado');
    IF (SELECT count(*) FROM importacao_registro
         WHERE registro_id = v_tratamento_1
           AND tabela_destino = 'tratamento_benzonidazol') <> 2
       OR NOT EXISTS (
           SELECT 1 FROM importacao_registro
            WHERE registro_id = v_reacao_1
              AND tabela_destino = 'reacao_adversa_benzonidazol'
       ) THEN
        RAISE EXCEPTION 'cenario 24: proveniencia N:N divergiu';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM tratamento_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND criado_em IS NOT NULL AND atualizado_em IS NOT NULL
    ) OR NOT EXISTS (
        SELECT 1 FROM reacao_adversa_benzonidazol
         WHERE reacao_adversa_benzonidazol_id = v_reacao_1
           AND criado_em IS NOT NULL AND atualizado_em IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'cenario 25: defaults dos timestamps ausentes';
    END IF;
    UPDATE tratamento_benzonidazol
       SET atualizado_em = v_atualizado_anterior + INTERVAL '1 second'
     WHERE tratamento_benzonidazol_id = v_tratamento_1;
    IF NOT EXISTS (
        SELECT 1 FROM tratamento_benzonidazol
         WHERE tratamento_benzonidazol_id = v_tratamento_1
           AND atualizado_em = v_atualizado_anterior + INTERVAL '1 second'
    ) THEN
        RAISE EXCEPTION 'cenario 25: atualizacao explicita do timestamp falhou';
    END IF;

    IF (SELECT count(*) FROM pg_constraint
         WHERE conrelid = 'ambulatorio.tratamento_benzonidazol'::regclass
           AND conname IN (
               'tratamento_benzonidazol_pkey',
               'fk_tratamento_bzn_paciente',
               'fk_tratamento_bzn_atendimento_paciente',
               'uq_tratamento_bzn_paciente',
               'chk_tratamento_bzn_duracao',
               'chk_tratamento_bzn_ano'
           )) <> 6
       OR (SELECT count(*) FROM pg_constraint
            WHERE conrelid = 'ambulatorio.reacao_adversa_benzonidazol'::regclass
              AND conname IN (
                  'reacao_adversa_benzonidazol_pkey',
                  'fk_reacao_bzn_tratamento'
              )) <> 2
       OR (SELECT count(*) FROM pg_indexes
            WHERE schemaname = 'ambulatorio'
              AND indexname IN (
                  'idx_tratamento_bzn_atendimento_id',
                  'idx_reacao_bzn_tratamento_id'
              )) <> 2
       OR NOT EXISTS (
           SELECT 1 FROM pg_constraint
            WHERE conrelid = 'ambulatorio.tratamento_benzonidazol'::regclass
              AND conname = 'fk_tratamento_bzn_atendimento_paciente'
              AND confdeltype = 'n' AND confdelsetcols IS NOT NULL
       )
       OR NOT EXISTS (
           SELECT 1 FROM pg_constraint
            WHERE conrelid = 'ambulatorio.tratamento_benzonidazol'::regclass
              AND conname = 'fk_tratamento_bzn_paciente' AND confdeltype = 'c'
       )
       OR NOT EXISTS (
           SELECT 1 FROM pg_constraint
            WHERE conrelid = 'ambulatorio.reacao_adversa_benzonidazol'::regclass
              AND conname = 'fk_reacao_bzn_tratamento' AND confdeltype = 'c'
       ) THEN
        RAISE EXCEPTION 'cenario 26: constraints, indices ou delecoes divergiram';
    END IF;
    RAISE NOTICE 'OK: cenarios 23-26, legado, proveniencia, timestamps e catalogo validados';
END;
$$;

ROLLBACK;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_bzn_codigo');
BEGIN
    IF EXISTS (SELECT 1 FROM ambulatorio.paciente WHERE codigo_planilha LIKE v_codigo || '%')
       OR EXISTS (SELECT 1 FROM ambulatorio.tratamento_chagas WHERE valor_original_tratamento = v_codigo)
       OR EXISTS (SELECT 1 FROM ambulatorio.importacao_lote WHERE codigo_lote = v_codigo)
       OR EXISTS (
           SELECT 1
             FROM ambulatorio.tratamento_benzonidazol tb
             JOIN ambulatorio.paciente p ON p.paciente_id = tb.paciente_id
            WHERE p.codigo_planilha LIKE v_codigo || '%'
       )
       OR EXISTS (
           SELECT 1
             FROM ambulatorio.reacao_adversa_benzonidazol rab
             JOIN ambulatorio.tratamento_benzonidazol tb
               ON tb.tratamento_benzonidazol_id = rab.tratamento_benzonidazol_id
             JOIN ambulatorio.paciente p ON p.paciente_id = tb.paciente_id
            WHERE p.codigo_planilha LIKE v_codigo || '%'
       ) THEN
        RAISE EXCEPTION 'cenario 27: dados sinteticos persistiram apos ROLLBACK';
    END IF;
    RAISE NOTICE 'OK: cenario 27, ROLLBACK e ausencia final de dados sinteticos confirmados';
END;
$$;
