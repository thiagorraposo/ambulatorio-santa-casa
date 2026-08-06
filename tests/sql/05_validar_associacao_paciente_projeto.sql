\set ON_ERROR_STOP on

SELECT 'validacao_paciente_projeto_' || txid_current()::TEXT AS codigo \gset
SELECT set_config('ambulatorio.validacao_paciente_projeto_codigo', :'codigo', FALSE);

BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_paciente_projeto_codigo');
    v_paciente_1 BIGINT;
    v_paciente_2 BIGINT;
    v_paciente_cascade BIGINT;
    v_benbrasil BIGINT;
    v_epoca BIGINT;
    v_outro_projeto BIGINT;
    v_assoc_ben BIGINT;
    v_atendimento BIGINT;
    v_lote BIGINT;
    v_linha_1 BIGINT;
    v_linha_2 BIGINT;
    v_atualizado_anterior TIMESTAMP;
    v_total INTEGER;
BEGIN
    SELECT projeto_estudo_id INTO STRICT v_benbrasil
      FROM projeto_estudo WHERE codigo_projeto = 'benbrasil';
    SELECT projeto_estudo_id INTO STRICT v_epoca
      FROM projeto_estudo WHERE codigo_projeto = 'epoca';
    SELECT projeto_estudo_id INTO STRICT v_outro_projeto
      FROM projeto_estudo WHERE codigo_projeto = 'parachute';

    INSERT INTO paciente (codigo_planilha, nome) VALUES
        (v_codigo || '_p1', 'Paciente Sintetico Projeto 1')
        RETURNING paciente_id INTO v_paciente_1;
    INSERT INTO paciente (codigo_planilha, nome) VALUES
        (v_codigo || '_p2', 'Paciente Sintetico Projeto 2')
        RETURNING paciente_id INTO v_paciente_2;

    INSERT INTO paciente_projeto_estudo (
        paciente_id, projeto_estudo_id, participa, possui_pendencia,
        descricao_pendencia, houve_falha, descricao_falha,
        valor_original_participacao, valor_original_pendencia,
        valor_original_falha, observacoes
    ) VALUES (
        v_paciente_1, v_benbrasil, TRUE, FALSE,
        'Pendencia sintetica preservada apesar do estado falso', TRUE,
        'Falha sintetica BenBrasil', 'SIM original', 'NAO original',
        'BenBrasil falha original', 'Combinacao auditavel sintetica'
    ) RETURNING paciente_projeto_estudo_id, atualizado_em
      INTO v_assoc_ben, v_atualizado_anterior;

    INSERT INTO paciente_projeto_estudo (
        paciente_id, projeto_estudo_id, participa, possui_pendencia,
        descricao_pendencia, houve_falha, descricao_falha,
        valor_original_participacao, valor_original_pendencia,
        valor_original_falha, observacoes
    ) VALUES
        (v_paciente_1, v_epoca, FALSE, TRUE, 'Pendente EPOCA', TRUE,
         'Falha sintetica EPOCA', 'NAO', 'SIM', 'EPOCA falha', 'Contradicao preservada'),
        (v_paciente_1, v_outro_projeto, NULL, NULL, NULL, NULL,
         NULL, NULL, NULL, NULL, 'Estados desconhecidos'),
        (v_paciente_2, v_benbrasil, FALSE, FALSE, NULL, FALSE,
         NULL, 'nao', 'nao', 'nao', NULL);

    IF (SELECT count(*) FROM paciente_projeto_estudo WHERE paciente_id = v_paciente_1) <> 3 THEN
        RAISE EXCEPTION 'cenario 1: paciente nao aceitou varios projetos';
    END IF;
    IF (SELECT count(*) FROM paciente_projeto_estudo WHERE projeto_estudo_id = v_benbrasil
        AND paciente_id IN (v_paciente_1, v_paciente_2)) <> 2 THEN
        RAISE EXCEPTION 'cenario 2: projeto nao aceitou varios pacientes';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM paciente_projeto_estudo WHERE paciente_id = v_paciente_1
        AND projeto_estudo_id = v_benbrasil)
       OR NOT EXISTS (SELECT 1 FROM paciente_projeto_estudo WHERE paciente_id = v_paciente_1
        AND projeto_estudo_id = v_epoca) THEN
        RAISE EXCEPTION 'cenario 3: BenBrasil e EPOCA nao coexistiram';
    END IF;
    IF EXISTS (SELECT 1 FROM projeto_estudo WHERE codigo_projeto IN
        ('benbrasil_falha', 'epoca_falha', 'benbrasil falha', 'epoca falha'))
       OR (SELECT count(*) FROM paciente_projeto_estudo WHERE paciente_id = v_paciente_1
           AND projeto_estudo_id IN (v_benbrasil, v_epoca) AND houve_falha IS TRUE) <> 2 THEN
        RAISE EXCEPTION 'cenario 4: falhas nao usaram os projetos principais';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM paciente_projeto_estudo WHERE paciente_projeto_estudo_id = v_assoc_ben
        AND participa IS TRUE AND possui_pendencia IS FALSE AND houve_falha IS TRUE
        AND descricao_pendencia = 'Pendencia sintetica preservada apesar do estado falso'
        AND descricao_falha = 'Falha sintetica BenBrasil'
        AND valor_original_participacao = 'SIM original'
        AND valor_original_pendencia = 'NAO original'
        AND valor_original_falha = 'BenBrasil falha original'
        AND observacoes = 'Combinacao auditavel sintetica') THEN
        RAISE EXCEPTION 'cenario 5: estados, descricoes ou originais divergiram';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM paciente_projeto_estudo WHERE paciente_id = v_paciente_1
        AND projeto_estudo_id = v_outro_projeto AND participa IS NULL
        AND possui_pendencia IS NULL AND houve_falha IS NULL)
       OR NOT EXISTS (SELECT 1 FROM paciente_projeto_estudo WHERE paciente_id = v_paciente_2
        AND projeto_estudo_id = v_benbrasil AND participa IS FALSE
        AND possui_pendencia IS FALSE AND houve_falha IS FALSE) THEN
        RAISE EXCEPTION 'cenario 6: booleanos triestados divergiram';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM paciente_projeto_estudo WHERE paciente_id = v_paciente_1
        AND projeto_estudo_id = v_epoca AND participa IS FALSE AND houve_falha IS TRUE)
       OR NOT EXISTS (SELECT 1 FROM paciente_projeto_estudo WHERE paciente_projeto_estudo_id = v_assoc_ben
        AND possui_pendencia IS FALSE AND descricao_pendencia IS NOT NULL) THEN
        RAISE EXCEPTION 'cenario 7: combinacoes contraditorias foram perdidas';
    END IF;
    RAISE NOTICE 'OK: cenarios 1-7, cardinalidades, projetos oficiais, triestados e auditoria validados';

    BEGIN
        INSERT INTO paciente_projeto_estudo (paciente_id, projeto_estudo_id)
        VALUES (v_paciente_1, v_benbrasil);
        RAISE EXCEPTION 'cenario 8: UNIQUE aceitou par duplicado';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO paciente_projeto_estudo (paciente_id, projeto_estudo_id)
        VALUES (NULL, v_benbrasil);
        RAISE EXCEPTION 'cenario 9: paciente nulo aceito';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO paciente_projeto_estudo (paciente_id, projeto_estudo_id)
        VALUES (v_paciente_1, NULL);
        RAISE EXCEPTION 'cenario 9: projeto nulo aceito';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO paciente_projeto_estudo (paciente_id, projeto_estudo_id)
        VALUES (-1, v_benbrasil);
        RAISE EXCEPTION 'cenario 10: FK de paciente inexistente aceita';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO paciente_projeto_estudo (paciente_id, projeto_estudo_id)
        VALUES (v_paciente_1, -1);
        RAISE EXCEPTION 'cenario 10: FK de projeto inexistente aceita';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    RAISE NOTICE 'OK: cenarios 8-10, UNIQUE, NOT NULL e FKs validados';

    INSERT INTO paciente (codigo_planilha, nome)
    VALUES (v_codigo || '_cascade', 'Paciente Sintetico Cascade')
    RETURNING paciente_id INTO v_paciente_cascade;
    INSERT INTO paciente_projeto_estudo (paciente_id, projeto_estudo_id)
    VALUES (v_paciente_cascade, v_epoca);
    DELETE FROM paciente WHERE paciente_id = v_paciente_cascade;
    IF EXISTS (SELECT 1 FROM paciente_projeto_estudo WHERE paciente_id = v_paciente_cascade) THEN
        RAISE EXCEPTION 'cenario 11: ON DELETE CASCADE falhou';
    END IF;

    BEGIN
        DELETE FROM projeto_estudo WHERE projeto_estudo_id = v_benbrasil;
        RAISE EXCEPTION 'cenario 12: ON DELETE RESTRICT permitiu excluir projeto';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;

    IF NOT EXISTS (SELECT 1 FROM paciente_projeto_estudo WHERE paciente_projeto_estudo_id = v_assoc_ben
        AND criado_em IS NOT NULL AND atualizado_em IS NOT NULL) THEN
        RAISE EXCEPTION 'cenario 13: defaults de timestamp ausentes';
    END IF;
    UPDATE paciente_projeto_estudo
       SET atualizado_em = v_atualizado_anterior + INTERVAL '1 second'
     WHERE paciente_projeto_estudo_id = v_assoc_ben;
    IF NOT EXISTS (SELECT 1 FROM paciente_projeto_estudo WHERE paciente_projeto_estudo_id = v_assoc_ben
        AND atualizado_em = v_atualizado_anterior + INTERVAL '1 second') THEN
        RAISE EXCEPTION 'cenario 13: atualizacao explicita do timestamp falhou';
    END IF;
    RAISE NOTICE 'OK: cenarios 11-13, delecoes e timestamps validados';

    INSERT INTO atendimento (paciente_id, data_atendimento, origem_registro)
    VALUES (v_paciente_1, DATE '2026-08-06', 'cadastro_sistema')
    RETURNING atendimento_id INTO v_atendimento;
    INSERT INTO atendimento_projeto_estudo (
        atendimento_id, projeto_estudo_id, participa, observacoes
    ) VALUES (v_atendimento, v_benbrasil, FALSE, v_codigo);
    IF (SELECT count(*) FROM atendimento_projeto_estudo WHERE atendimento_id = v_atendimento
        AND projeto_estudo_id = v_benbrasil) <> 1
       OR (SELECT count(*) FROM paciente_projeto_estudo WHERE paciente_id = v_paciente_1
           AND projeto_estudo_id = v_benbrasil) <> 1 THEN
        RAISE EXCEPTION 'cenario 14: associacoes antiga e nova nao coexistiram';
    END IF;

    INSERT INTO importacao_lote (codigo_lote, hash_arquivo_sha256, layout_versao)
    VALUES (v_codigo, md5(v_codigo) || md5(v_codigo), 'layout_sintetico_paciente_projeto')
    RETURNING importacao_lote_id INTO v_lote;
    INSERT INTO importacao_linha (
        importacao_lote_id, aba_nome_original, aba_ordem, numero_linha, dados_brutos
    ) VALUES (v_lote, 'Aba Sintetica', 1, 2, '[]'::jsonb)
    RETURNING importacao_linha_id INTO v_linha_1;
    INSERT INTO importacao_linha (
        importacao_lote_id, aba_nome_original, aba_ordem, numero_linha, dados_brutos
    ) VALUES (v_lote, 'Aba Sintetica', 1, 3, '[]'::jsonb)
    RETURNING importacao_linha_id INTO v_linha_2;
    INSERT INTO importacao_registro (importacao_linha_id, tabela_destino, registro_id, acao)
    VALUES
        (v_linha_1, 'paciente_projeto_estudo', v_assoc_ben, 'criado'),
        (v_linha_2, 'paciente_projeto_estudo', v_assoc_ben, 'associado');
    IF (SELECT count(*) FROM importacao_registro WHERE tabela_destino = 'paciente_projeto_estudo'
        AND registro_id = v_assoc_ben AND importacao_linha_id IN (v_linha_1, v_linha_2)) <> 2 THEN
        RAISE EXCEPTION 'cenario 15: associacao consolidada nao foi reutilizada';
    END IF;

    SELECT count(*) INTO v_total FROM pg_constraint
     WHERE conrelid = 'ambulatorio.paciente_projeto_estudo'::regclass
       AND conname IN ('paciente_projeto_estudo_pkey', 'fk_paciente_projeto_paciente',
                       'fk_paciente_projeto_projeto', 'uq_paciente_projeto');
    IF v_total <> 4 OR NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'ambulatorio'
          AND tablename = 'paciente_projeto_estudo'
          AND indexname = 'idx_paciente_projeto_projeto_id'
    ) THEN
        RAISE EXCEPTION 'cenario 16: constraints ou indice divergiram';
    END IF;
    RAISE NOTICE 'OK: cenarios 14-16, convivencia, proveniencia reutilizada e catalogo validados';
    RAISE NOTICE 'OK: cenario 17 preparado; ROLLBACK removera todos os dados sinteticos';
END $$;

ROLLBACK;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_paciente_projeto_codigo');
BEGIN
    IF EXISTS (SELECT 1 FROM ambulatorio.paciente WHERE codigo_planilha LIKE v_codigo || '%')
       OR EXISTS (SELECT 1 FROM ambulatorio.importacao_lote WHERE codigo_lote = v_codigo)
       OR EXISTS (SELECT 1 FROM ambulatorio.atendimento_projeto_estudo WHERE observacoes = v_codigo) THEN
        RAISE EXCEPTION 'cenario 17: dados sinteticos persistiram apos ROLLBACK';
    END IF;
    RAISE NOTICE 'OK: cenario 17, ROLLBACK confirmado e nenhum dado sintetico persistiu';
END $$;
