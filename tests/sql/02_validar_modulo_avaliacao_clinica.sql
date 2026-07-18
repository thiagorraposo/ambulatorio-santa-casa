\set ON_ERROR_STOP on

SELECT 'validacao_avaliacao_' || txid_current()::TEXT AS codigo \gset
SELECT set_config('ambulatorio.validacao_avaliacao_codigo', :'codigo', FALSE);

BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_avaliacao_codigo');
    v_paciente_id BIGINT;
    v_atendimento_id BIGINT;
    v_eventos_avc INTEGER;
BEGIN
    INSERT INTO paciente (codigo_planilha, nome)
    VALUES (v_codigo, 'Paciente Sintetico Avaliacao')
    RETURNING paciente_id INTO v_paciente_id;

    INSERT INTO atendimento (
        paciente_id,
        data_atendimento,
        ambulatorio_unicamente,
        ambulatorio_anexo_projeto,
        origem_registro
    )
    VALUES (
        v_paciente_id,
        DATE '2026-07-18',
        TRUE,
        FALSE,
        'cadastro_sistema'
    )
    RETURNING atendimento_id INTO v_atendimento_id;

    INSERT INTO dados_clinicos_atendimento (
        atendimento_id,
        altura_cm,
        peso_kg,
        circunferencia_abdominal_cm,
        frequencia_cardiaca_bpm,
        saturacao_percentual,
        pa_sistolica_mmhg,
        pa_diastolica_mmhg,
        nyha,
        valor_original_altura,
        valor_original_nyha,
        observacoes
    )
    VALUES (
        v_atendimento_id,
        165.50,
        70.25,
        88.00,
        72,
        98.00,
        120,
        80,
        'II',
        '165,5',
        'Classe II',
        'Registro sintetico temporario.'
    );

    INSERT INTO evento_clinico (
        paciente_id,
        tipo_evento,
        ocorreu,
        ano_evento,
        descricao,
        valor_original_ocorrencia
    )
    VALUES
        (v_paciente_id, 'avc', TRUE, 2020, 'Primeiro evento sintetico.', 'sim'),
        (v_paciente_id, 'avc', FALSE, 2020, 'Segundo registro sintetico.', 'nao');

    SELECT count(*)
      INTO v_eventos_avc
      FROM evento_clinico
     WHERE paciente_id = v_paciente_id
       AND tipo_evento = 'avc'
       AND ano_evento = 2020;

    IF v_eventos_avc <> 2 THEN
        RAISE EXCEPTION 'eventos repetidos por paciente, tipo e ano foram bloqueados';
    END IF;

    INSERT INTO dispositivo_implantado (
        paciente_id,
        tipo_dispositivo,
        possui_dispositivo,
        valor_original_presenca
    )
    VALUES (v_paciente_id, 'marcapasso', TRUE, 'sim');

    INSERT INTO obito (
        paciente_id,
        houve_obito,
        data_obito,
        causa_obito,
        valor_original_obito
    )
    VALUES (v_paciente_id, FALSE, NULL, NULL, 'nao');

    IF NOT EXISTS (
        SELECT 1
          FROM dados_clinicos_atendimento
         WHERE atendimento_id = v_atendimento_id
           AND criado_em IS NOT NULL
           AND atualizado_em IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'defaults de timestamps nao foram preenchidos';
    END IF;

    RAISE NOTICE 'OK: insercoes, relacionamentos, tipos permissivos, defaults e eventos repetidos validados';

    BEGIN
        INSERT INTO dados_clinicos_atendimento (atendimento_id)
        VALUES (v_atendimento_id);
        RAISE EXCEPTION 'UNIQUE de dados clinicos aceitou atendimento duplicado';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'OK: UNIQUE de dados clinicos bloqueou atendimento duplicado';
    END;

    BEGIN
        INSERT INTO dispositivo_implantado (paciente_id, tipo_dispositivo)
        VALUES (v_paciente_id, 'marcapasso');
        RAISE EXCEPTION 'UNIQUE de dispositivo aceitou paciente e tipo duplicados';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'OK: UNIQUE de dispositivo bloqueou paciente e tipo duplicados';
    END;

    BEGIN
        INSERT INTO obito (paciente_id) VALUES (v_paciente_id);
        RAISE EXCEPTION 'UNIQUE de obito aceitou paciente duplicado';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'OK: UNIQUE de obito bloqueou paciente duplicado';
    END;

    BEGIN
        INSERT INTO dados_clinicos_atendimento (atendimento_id) VALUES (-1);
        RAISE EXCEPTION 'FK de dados clinicos aceitou atendimento inexistente';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: FK de dados clinicos bloqueou atendimento inexistente';
    END;

    BEGIN
        INSERT INTO evento_clinico (paciente_id, tipo_evento) VALUES (-1, 'avc');
        RAISE EXCEPTION 'FK de evento aceitou paciente inexistente';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: FK de evento bloqueou paciente inexistente';
    END;

    BEGIN
        INSERT INTO dispositivo_implantado (paciente_id, tipo_dispositivo)
        VALUES (-1, 'cdi');
        RAISE EXCEPTION 'FK de dispositivo aceitou paciente inexistente';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: FK de dispositivo bloqueou paciente inexistente';
    END;

    BEGIN
        INSERT INTO obito (paciente_id) VALUES (-1);
        RAISE EXCEPTION 'FK de obito aceitou paciente inexistente';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: FK de obito bloqueou paciente inexistente';
    END;

    BEGIN
        INSERT INTO evento_clinico (paciente_id, tipo_evento)
        VALUES (v_paciente_id, NULL);
        RAISE EXCEPTION 'NOT NULL de tipo_evento aceitou valor nulo';
    EXCEPTION WHEN not_null_violation THEN
        RAISE NOTICE 'OK: NOT NULL de tipo_evento bloqueou valor nulo';
    END;

    BEGIN
        INSERT INTO dispositivo_implantado (paciente_id, tipo_dispositivo)
        VALUES (v_paciente_id, NULL);
        RAISE EXCEPTION 'NOT NULL de tipo_dispositivo aceitou valor nulo';
    EXCEPTION WHEN not_null_violation THEN
        RAISE NOTICE 'OK: NOT NULL de tipo_dispositivo bloqueou valor nulo';
    END;

    DELETE FROM atendimento WHERE atendimento_id = v_atendimento_id;

    IF EXISTS (
        SELECT 1 FROM dados_clinicos_atendimento
         WHERE atendimento_id = v_atendimento_id
    ) THEN
        RAISE EXCEPTION 'ON DELETE CASCADE de dados clinicos nao removeu o registro';
    END IF;

    DELETE FROM paciente WHERE paciente_id = v_paciente_id;

    IF EXISTS (SELECT 1 FROM evento_clinico WHERE paciente_id = v_paciente_id)
       OR EXISTS (SELECT 1 FROM dispositivo_implantado WHERE paciente_id = v_paciente_id)
       OR EXISTS (SELECT 1 FROM obito WHERE paciente_id = v_paciente_id) THEN
        RAISE EXCEPTION 'ON DELETE CASCADE das tabelas por paciente nao removeu os registros';
    END IF;

    RAISE NOTICE 'OK: ON DELETE CASCADE validado para atendimento e paciente';
END
$$;

ROLLBACK;

DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_avaliacao_codigo');
BEGIN
    IF EXISTS (
        SELECT 1
          FROM ambulatorio.paciente
         WHERE codigo_planilha = v_codigo
    ) THEN
        RAISE EXCEPTION 'ROLLBACK nao removeu os dados sinteticos';
    END IF;

    RAISE NOTICE 'OK: ROLLBACK confirmado; nenhum paciente sintetico persistiu';
END
$$;
