\set ON_ERROR_STOP on

SELECT 'validacao_notificacao_' || txid_current()::TEXT AS codigo \gset
SELECT set_config('ambulatorio.validacao_notificacao_codigo', :'codigo', FALSE);

BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_notificacao_codigo');
    v_paciente_ids BIGINT[];
    v_total INTEGER;
BEGIN
    INSERT INTO paciente (codigo_planilha, nome)
    SELECT v_codigo || '_' || numero, 'Paciente Sintetico Notificacao ' || numero
      FROM generate_series(1, 6) AS numero;

    SELECT array_agg(paciente_id ORDER BY codigo_planilha)
      INTO v_paciente_ids
      FROM paciente
     WHERE codigo_planilha LIKE v_codigo || '\_%' ESCAPE '\';

    INSERT INTO notificacao (
        paciente_id,
        paciente_notificado,
        numero_notificacao,
        justificativa_nao_notificacao,
        valor_original_notificado,
        valor_original_numero,
        valor_original_justificativa,
        observacoes
    )
    VALUES
        (v_paciente_ids[1], TRUE, NULL, NULL, 'sim', NULL, NULL, v_codigo),
        (v_paciente_ids[2], FALSE, NULL, NULL, 'nao', NULL, NULL, v_codigo),
        (v_paciente_ids[3], TRUE, NULL, 'Texto contraditorio sintetico.', 'sim', NULL, 'Texto original sintetico.', v_codigo),
        (v_paciente_ids[4], FALSE, '0001-A', NULL, 'nao', '0001-A', NULL, v_codigo),
        (v_paciente_ids[5], NULL, '0002-B', 'Indicador desconhecido sintetico.', 'talvez', '0002-B', 'Indicador desconhecido sintetico.', v_codigo),
        (v_paciente_ids[6], TRUE, '0001-A', NULL, NULL, NULL, NULL, v_codigo);

    SELECT count(*)
      INTO v_total
      FROM notificacao
     WHERE paciente_id = ANY (v_paciente_ids)
       AND criado_em IS NOT NULL
       AND atualizado_em IS NOT NULL;

    IF v_total <> 6 THEN
        RAISE EXCEPTION 'insercoes permissivas ou defaults de timestamps divergiram: %', v_total;
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM notificacao
         WHERE paciente_id = v_paciente_ids[2]
           AND paciente_notificado IS FALSE
           AND numero_notificacao IS NULL
           AND justificativa_nao_notificacao IS NULL
           AND valor_original_numero IS NULL
           AND valor_original_justificativa IS NULL
           AND observacoes = v_codigo
    ) THEN
        RAISE EXCEPTION 'campos opcionais nao aceitaram NULL';
    END IF;

    SELECT count(*)
      INTO v_total
      FROM notificacao
     WHERE numero_notificacao = '0001-A'
       AND paciente_id = ANY (v_paciente_ids);

    IF v_total <> 2 THEN
        RAISE EXCEPTION 'numero de notificacao repetido entre pacientes foi bloqueado';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_indexes
         WHERE schemaname = 'ambulatorio'
           AND tablename = 'notificacao'
           AND indexname = 'idx_notificacao_numero_notificacao'
           AND indexdef LIKE '%(numero_notificacao)%'
           AND indexdef NOT LIKE 'CREATE UNIQUE INDEX%'
    ) THEN
        RAISE EXCEPTION 'indice nao unico de numero_notificacao nao foi encontrado';
    END IF;

    RAISE NOTICE 'OK: cinco estados condicionais, campos opcionais, valores originais e timestamps validados';
    RAISE NOTICE 'OK: numero repetido entre pacientes e indice nao unico de numero validados';

    BEGIN
        INSERT INTO notificacao (paciente_id)
        VALUES (v_paciente_ids[1]);
        RAISE EXCEPTION 'UNIQUE de notificacao aceitou paciente duplicado';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'OK: UNIQUE(paciente_id) bloqueou segundo registro do paciente';
    END;

    BEGIN
        INSERT INTO notificacao (paciente_id)
        VALUES (-1);
        RAISE EXCEPTION 'FK de notificacao aceitou paciente inexistente';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: FK bloqueou paciente inexistente';
    END;

    DELETE FROM paciente WHERE paciente_id = v_paciente_ids[6];

    IF EXISTS (
        SELECT 1
          FROM notificacao
         WHERE paciente_id = v_paciente_ids[6]
    ) THEN
        RAISE EXCEPTION 'ON DELETE CASCADE nao removeu a notificacao';
    END IF;

    RAISE NOTICE 'OK: ON DELETE CASCADE a partir de paciente validado';
END
$$;

ROLLBACK;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_notificacao_codigo');
BEGIN
    IF EXISTS (
        SELECT 1
          FROM ambulatorio.paciente
         WHERE codigo_planilha LIKE v_codigo || '\_%' ESCAPE '\'
    ) THEN
        RAISE EXCEPTION 'ROLLBACK nao removeu os pacientes sinteticos';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM ambulatorio.notificacao
         WHERE observacoes = v_codigo
    ) THEN
        RAISE EXCEPTION 'ROLLBACK nao removeu as notificacoes sinteticas';
    END IF;

    RAISE NOTICE 'OK: ROLLBACK confirmado; nenhum dado sintetico de notificacao persistiu';
END
$$;
