\set ON_ERROR_STOP on

SELECT 'validacao_exames_paciente_' || txid_current()::TEXT AS codigo \gset
SELECT set_config('ambulatorio.validacao_exames_paciente_codigo', :'codigo', FALSE);

BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_exames_paciente_codigo');
    v_paciente_1 BIGINT;
    v_paciente_2 BIGINT;
    v_paciente_cascade BIGINT;
    v_atendimento_1 BIGINT;
    v_atendimento_2 BIGINT;
    v_atendimento_remover BIGINT;
    v_ecocardiograma BIGINT;
    v_laboratoriais BIGINT;
    v_imagem BIGINT;
    v_holter BIGINT;
    v_endoscopia BIGINT;
    v_colonoscopia BIGINT;
    v_teste_ergometrico BIGINT;
    v_mapa BIGINT;
    v_outro BIGINT;
    v_exame_sem_atendimento BIGINT;
    v_exame_atendimento BIGINT;
    v_exame_preservado BIGINT;
    v_legado_exame BIGINT;
    v_lote BIGINT;
    v_linha BIGINT;
    v_timestamp TIMESTAMP;
    v_total INTEGER;
    v_canonicos_antes_legado INTEGER;
BEGIN
    SELECT tipo_exame_complementar_id INTO STRICT v_ecocardiograma FROM tipo_exame_complementar WHERE codigo_exame = 'ecocardiograma';
    SELECT tipo_exame_complementar_id INTO STRICT v_laboratoriais FROM tipo_exame_complementar WHERE codigo_exame = 'laboratoriais';
    SELECT tipo_exame_complementar_id INTO STRICT v_imagem FROM tipo_exame_complementar WHERE codigo_exame = 'imagem';
    SELECT tipo_exame_complementar_id INTO STRICT v_holter FROM tipo_exame_complementar WHERE codigo_exame = 'holter';
    SELECT tipo_exame_complementar_id INTO STRICT v_endoscopia FROM tipo_exame_complementar WHERE codigo_exame = 'endoscopia';
    SELECT tipo_exame_complementar_id INTO STRICT v_colonoscopia FROM tipo_exame_complementar WHERE codigo_exame = 'colonoscopia';
    SELECT tipo_exame_complementar_id INTO STRICT v_teste_ergometrico FROM tipo_exame_complementar WHERE codigo_exame = 'teste_ergometrico';
    SELECT tipo_exame_complementar_id INTO STRICT v_mapa FROM tipo_exame_complementar WHERE codigo_exame = 'mapa';
    SELECT tipo_exame_complementar_id INTO STRICT v_outro FROM tipo_exame_complementar WHERE codigo_exame = 'outro';

    INSERT INTO paciente (codigo_planilha, nome) VALUES
        (v_codigo || '_p1', 'Paciente Sintetico Exame 1') RETURNING paciente_id INTO v_paciente_1;
    INSERT INTO paciente (codigo_planilha, nome) VALUES
        (v_codigo || '_p2', 'Paciente Sintetico Exame 2') RETURNING paciente_id INTO v_paciente_2;

    INSERT INTO atendimento (paciente_id, origem_registro)
    VALUES (v_paciente_1, 'cadastro_sistema') RETURNING atendimento_id INTO v_atendimento_1;
    INSERT INTO atendimento (paciente_id, origem_registro)
    VALUES (v_paciente_2, 'cadastro_sistema') RETURNING atendimento_id INTO v_atendimento_2;

    INSERT INTO paciente_exame_complementar (
        paciente_id, tipo_exame_complementar_id, bloco_origem,
        tipo_exame_original, resultado_texto, observacoes,
        valor_original_resultado, valor_original_observacao
    ) VALUES (
        v_paciente_1, v_ecocardiograma, 'trazido', 'ECO',
        'Resultado sintetico livre ECO', 'Observacao sintetica livre',
        'ECO bruto sintetico', 'Observacao bruta sintetica'
    ) RETURNING paciente_exame_complementar_id, atualizado_em
      INTO v_exame_sem_atendimento, v_timestamp;

    IF NOT EXISTS (
        SELECT 1 FROM paciente_exame_complementar
         WHERE paciente_exame_complementar_id = v_exame_sem_atendimento
           AND paciente_id = v_paciente_1
           AND atendimento_id IS NULL
    ) THEN
        RAISE EXCEPTION 'cenario 1: exame sem atendimento nao foi associado ao paciente';
    END IF;

    INSERT INTO paciente_exame_complementar (
        paciente_id, atendimento_id, tipo_exame_complementar_id, bloco_origem
    ) VALUES (v_paciente_1, v_atendimento_1, v_holter, 'solicitado')
    RETURNING paciente_exame_complementar_id INTO v_exame_atendimento;

    IF NOT EXISTS (
        SELECT 1 FROM paciente_exame_complementar
         WHERE paciente_exame_complementar_id = v_exame_atendimento
           AND paciente_id = v_paciente_1
           AND atendimento_id = v_atendimento_1
    ) THEN
        RAISE EXCEPTION 'cenario 2: atendimento valido nao foi aceito';
    END IF;

    BEGIN
        INSERT INTO paciente_exame_complementar (
            paciente_id, atendimento_id, tipo_exame_complementar_id, bloco_origem
        ) VALUES (v_paciente_1, v_atendimento_2, v_holter, 'trazido');
        RAISE EXCEPTION 'cenario 3: atendimento de outro paciente foi aceito';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;

    INSERT INTO paciente_exame_complementar (
        paciente_id, tipo_exame_complementar_id, bloco_origem
    ) VALUES
        (v_paciente_1, v_holter, 'trazido'),
        (v_paciente_1, v_holter, 'trazido'),
        (v_paciente_1, v_holter, 'solicitado'),
        (v_paciente_2, v_holter, 'trazido');

    IF (SELECT count(*) FROM paciente_exame_complementar
         WHERE paciente_id = v_paciente_1 AND tipo_exame_complementar_id = v_holter) <> 4 THEN
        RAISE EXCEPTION 'cenario 4: multiplos exames do mesmo tipo foram bloqueados';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM paciente_exame_complementar WHERE paciente_id = v_paciente_1 AND tipo_exame_complementar_id = v_holter AND bloco_origem = 'trazido')
       OR NOT EXISTS (SELECT 1 FROM paciente_exame_complementar WHERE paciente_id = v_paciente_1 AND tipo_exame_complementar_id = v_holter AND bloco_origem = 'solicitado') THEN
        RAISE EXCEPTION 'cenario 5: blocos trazido e solicitado nao coexistiram';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM paciente_exame_complementar WHERE paciente_id = v_paciente_2 AND tipo_exame_complementar_id = v_holter) THEN
        RAISE EXCEPTION 'cenario 6: varios pacientes nao aceitaram o mesmo tipo';
    END IF;
    RAISE NOTICE 'OK: cenarios 1-6, paciente, atendimento opcional, consistencia e multiplicidade validados';

    IF (SELECT count(*) FROM tipo_exame_complementar WHERE codigo_exame IN (
        'ecocardiograma', 'laboratoriais', 'imagem', 'holter', 'endoscopia',
        'colonoscopia', 'teste_ergometrico', 'mapa', 'outro'
    )) <> 9 THEN
        RAISE EXCEPTION 'cenario 7: tipos aprovados nao estao no catalogo';
    END IF;

    INSERT INTO paciente_exame_complementar (
        paciente_id, tipo_exame_complementar_id, bloco_origem,
        tipo_exame_original, resultado_texto, observacoes,
        valor_original_resultado, valor_original_observacao
    ) VALUES (
        v_paciente_1, v_outro, 'trazido', 'Tipo Livre Sintetico',
        'Resultado livre sintetico', 'Observacao livre sintetica',
        'Valor original sintetico', 'Observacao original sintetica'
    );

    IF NOT EXISTS (
        SELECT 1 FROM paciente_exame_complementar
         WHERE paciente_id = v_paciente_1
           AND tipo_exame_complementar_id = v_outro
           AND tipo_exame_original = 'Tipo Livre Sintetico'
    ) THEN
        RAISE EXCEPTION 'cenario 8: tipo livre nao foi preservado com catalogo outro';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM paciente_exame_complementar
         WHERE paciente_id = v_paciente_1
           AND resultado_texto = 'Resultado livre sintetico'
           AND observacoes = 'Observacao livre sintetica'
           AND valor_original_resultado = 'Valor original sintetico'
           AND valor_original_observacao = 'Observacao original sintetica'
    ) THEN
        RAISE EXCEPTION 'cenario 9: textos livres ou valores originais divergiram';
    END IF;

    INSERT INTO paciente_exame_complementar (
        paciente_id, tipo_exame_complementar_id, bloco_origem
    ) VALUES (v_paciente_2, v_imagem, 'solicitado');
    IF NOT EXISTS (
        SELECT 1 FROM paciente_exame_complementar
         WHERE paciente_id = v_paciente_2 AND tipo_exame_complementar_id = v_imagem
           AND tipo_exame_original IS NULL AND resultado_texto IS NULL
           AND observacoes IS NULL AND valor_original_resultado IS NULL
           AND valor_original_observacao IS NULL
    ) THEN
        RAISE EXCEPTION 'cenario 10: campos opcionais nao aceitaram NULL';
    END IF;

    BEGIN
        INSERT INTO paciente_exame_complementar (paciente_id, tipo_exame_complementar_id, bloco_origem)
        VALUES (NULL, v_holter, 'trazido');
        RAISE EXCEPTION 'cenario 11: paciente nulo aceito';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO paciente_exame_complementar (paciente_id, tipo_exame_complementar_id, bloco_origem)
        VALUES (v_paciente_1, NULL, 'trazido');
        RAISE EXCEPTION 'cenario 11: tipo nulo aceito';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO paciente_exame_complementar (paciente_id, tipo_exame_complementar_id, bloco_origem)
        VALUES (v_paciente_1, v_holter, NULL);
        RAISE EXCEPTION 'cenario 11: bloco nulo aceito';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO paciente_exame_complementar (paciente_id, tipo_exame_complementar_id, bloco_origem)
        VALUES (v_paciente_1, v_holter, 'realizado');
        RAISE EXCEPTION 'cenario 12: bloco invalido aceito';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO paciente_exame_complementar (paciente_id, tipo_exame_complementar_id, bloco_origem)
        VALUES (-1, v_holter, 'trazido');
        RAISE EXCEPTION 'cenario 13: paciente inexistente aceito';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO paciente_exame_complementar (paciente_id, tipo_exame_complementar_id, bloco_origem)
        VALUES (v_paciente_1, -1, 'trazido');
        RAISE EXCEPTION 'cenario 13: tipo inexistente aceito';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    RAISE NOTICE 'OK: cenarios 7-13, catalogo, tipo livre, textos, nulabilidade e constraints validados';

    INSERT INTO paciente (codigo_planilha, nome)
    VALUES (v_codigo || '_cascade', 'Paciente Sintetico Exame Cascade')
    RETURNING paciente_id INTO v_paciente_cascade;
    INSERT INTO paciente_exame_complementar (paciente_id, tipo_exame_complementar_id, bloco_origem)
    VALUES (v_paciente_cascade, v_laboratoriais, 'trazido');
    DELETE FROM paciente WHERE paciente_id = v_paciente_cascade;
    IF EXISTS (SELECT 1 FROM paciente_exame_complementar WHERE paciente_id = v_paciente_cascade) THEN
        RAISE EXCEPTION 'cenario 14: ON DELETE CASCADE falhou';
    END IF;

    INSERT INTO atendimento (paciente_id, origem_registro)
    VALUES (v_paciente_1, 'cadastro_sistema') RETURNING atendimento_id INTO v_atendimento_remover;
    INSERT INTO paciente_exame_complementar (
        paciente_id, atendimento_id, tipo_exame_complementar_id, bloco_origem
    ) VALUES (v_paciente_1, v_atendimento_remover, v_endoscopia, 'solicitado')
    RETURNING paciente_exame_complementar_id INTO v_exame_preservado;
    DELETE FROM atendimento WHERE atendimento_id = v_atendimento_remover;
    IF NOT EXISTS (
        SELECT 1 FROM paciente_exame_complementar
         WHERE paciente_exame_complementar_id = v_exame_preservado
           AND paciente_id = v_paciente_1 AND atendimento_id IS NULL
    ) THEN
        RAISE EXCEPTION 'cenario 15: exclusao do atendimento nao preservou exame e paciente';
    END IF;

    BEGIN
        DELETE FROM tipo_exame_complementar WHERE tipo_exame_complementar_id = v_endoscopia;
        RAISE EXCEPTION 'cenario 16: ON DELETE RESTRICT permitiu excluir tipo referenciado';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;

    IF NOT EXISTS (
        SELECT 1 FROM paciente_exame_complementar
         WHERE paciente_exame_complementar_id = v_exame_sem_atendimento
           AND criado_em IS NOT NULL AND atualizado_em IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'cenario 17: defaults dos timestamps ausentes';
    END IF;
    UPDATE paciente_exame_complementar
       SET atualizado_em = v_timestamp + INTERVAL '1 second'
     WHERE paciente_exame_complementar_id = v_exame_sem_atendimento;
    IF NOT EXISTS (
        SELECT 1 FROM paciente_exame_complementar
         WHERE paciente_exame_complementar_id = v_exame_sem_atendimento
           AND atualizado_em = v_timestamp + INTERVAL '1 second'
    ) THEN
        RAISE EXCEPTION 'cenario 17: atualizacao explicita do timestamp falhou';
    END IF;
    RAISE NOTICE 'OK: cenarios 14-17, regras ON DELETE e timestamps validados';

    IF (SELECT count(*) FROM pg_constraint
         WHERE conrelid = 'ambulatorio.paciente_exame_complementar'::regclass
           AND conname IN (
               'paciente_exame_complementar_pkey',
               'fk_paciente_exame_paciente',
               'fk_paciente_exame_atendimento_paciente',
               'fk_paciente_exame_tipo',
               'chk_paciente_exame_bloco'
           )) <> 5
       OR NOT EXISTS (
           SELECT 1 FROM pg_constraint
            WHERE conrelid = 'ambulatorio.atendimento'::regclass
              AND conname = 'uq_atendimento_id_paciente'
              AND contype = 'u'
       )
       OR (SELECT count(*) FROM pg_indexes
            WHERE schemaname = 'ambulatorio'
              AND tablename = 'paciente_exame_complementar'
              AND indexname IN (
                  'idx_paciente_exame_paciente_id',
                  'idx_paciente_exame_tipo_id',
                  'idx_paciente_exame_atendimento_id'
              )) <> 3
       OR NOT EXISTS (
           SELECT 1 FROM pg_constraint
            WHERE conrelid = 'ambulatorio.paciente_exame_complementar'::regclass
              AND conname = 'fk_paciente_exame_atendimento_paciente'
              AND confdeltype = 'n'
              AND confdelsetcols IS NOT NULL
       ) THEN
        RAISE EXCEPTION 'cenario 18: catalogo de constraints ou indices divergiu';
    END IF;

    IF EXISTS (
        SELECT 1 FROM paciente_exame_complementar
         WHERE paciente_id = v_paciente_1
    ) THEN
        NULL;
    ELSE
        RAISE EXCEPTION 'cenario 19: nova estrutura indisponivel para convivencia';
    END IF;

    SELECT count(*) INTO v_canonicos_antes_legado
      FROM paciente_exame_complementar
     WHERE paciente_id = v_paciente_1;

    INSERT INTO atendimento_exame_complementar (
        atendimento_id, tipo_exame_complementar_id, origem_exame
    ) VALUES (v_atendimento_1, v_ecocardiograma, 'registrado_planilha')
    RETURNING atendimento_exame_complementar_id INTO v_legado_exame;
    INSERT INTO exame_complementar_resultado (
        atendimento_exame_complementar_id, nome_campo, valor_texto, valor_original
    ) VALUES (v_legado_exame, 'campo_sintetico', 'texto sintetico', v_codigo);
    IF NOT EXISTS (SELECT 1 FROM atendimento_exame_complementar WHERE atendimento_exame_complementar_id = v_legado_exame)
       OR NOT EXISTS (SELECT 1 FROM exame_complementar_resultado WHERE atendimento_exame_complementar_id = v_legado_exame) THEN
        RAISE EXCEPTION 'cenario 19: tabelas legadas nao coexistiram';
    END IF;
    IF (SELECT count(*) FROM paciente_exame_complementar WHERE paciente_id = v_paciente_1) <> v_canonicos_antes_legado THEN
        RAISE EXCEPTION 'cenario 21: escrita legada gerou backfill ou escrita dupla';
    END IF;

    INSERT INTO importacao_lote (codigo_lote, hash_arquivo_sha256, layout_versao)
    VALUES (v_codigo, md5(v_codigo) || md5(v_codigo), 'layout_sintetico_exames')
    RETURNING importacao_lote_id INTO v_lote;
    INSERT INTO importacao_linha (
        importacao_lote_id, aba_nome_original, aba_ordem, numero_linha, dados_brutos
    ) VALUES (
        v_lote, 'Aba Sintetica Exames', 1, 2,
        jsonb_build_array(
            jsonb_build_object('coluna_ordem', 1, 'cabecalho_original', 'ECO', 'bloco', 'trazido', 'ocorrencia', 1),
            jsonb_build_object('coluna_ordem', 2, 'cabecalho_original', 'ECO', 'bloco', 'solicitado', 'ocorrencia', 2)
        )
    ) RETURNING importacao_linha_id INTO v_linha;
    INSERT INTO importacao_registro (importacao_linha_id, tabela_destino, registro_id, acao)
    VALUES
        (v_linha, 'paciente_exame_complementar', v_exame_sem_atendimento, 'criado'),
        (v_linha, 'paciente_exame_complementar', v_exame_atendimento, 'associado');
    IF (SELECT count(*) FROM importacao_registro
         WHERE importacao_linha_id = v_linha
           AND tabela_destino = 'paciente_exame_complementar') <> 2 THEN
        RAISE EXCEPTION 'cenario 20: cabecalhos repetidos nao apontaram para ocorrencias distintas';
    END IF;

    SELECT count(*) INTO v_total
      FROM pg_constraint
     WHERE conrelid = 'ambulatorio.paciente_exame_complementar'::regclass
       AND contype = 'u';
    IF v_total <> 0 OR (SELECT count(*) FROM paciente_exame_complementar
        WHERE paciente_id = v_paciente_1 AND tipo_exame_complementar_id = v_holter
          AND bloco_origem = 'trazido') < 2 THEN
        RAISE EXCEPTION 'cenario 21: unicidade indevida bloqueou ocorrencias';
    END IF;
    RAISE NOTICE 'OK: cenarios 18-21, catalogo, legado, proveniencia, ausencia de UNIQUE e backfill validados';
    RAISE NOTICE 'OK: cenario 22 preparado; ROLLBACK removera todos os dados sinteticos';
END $$;

ROLLBACK;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_exames_paciente_codigo');
BEGIN
    IF EXISTS (SELECT 1 FROM ambulatorio.paciente WHERE codigo_planilha LIKE v_codigo || '%')
       OR EXISTS (SELECT 1 FROM ambulatorio.importacao_lote WHERE codigo_lote = v_codigo)
       OR EXISTS (SELECT 1 FROM ambulatorio.exame_complementar_resultado WHERE valor_original = v_codigo) THEN
        RAISE EXCEPTION 'cenario 22: dados sinteticos persistiram apos ROLLBACK';
    END IF;
    RAISE NOTICE 'OK: cenario 22, ROLLBACK confirmado e nenhum dado sintetico persistiu';
END $$;
