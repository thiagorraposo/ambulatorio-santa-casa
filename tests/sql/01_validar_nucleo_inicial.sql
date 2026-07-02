BEGIN;
SET search_path TO ambulatorio, public;

-- ============================================================
-- Validacao reutilizavel do nucleo fisico inicial.
-- Este script cria dados temporarios dentro da transacao atual.
-- O ROLLBACK final impede persistencia dos registros de teste.
-- ============================================================

-- ------------------------------------------------------------
-- Dados positivos encadeados por modulo
-- ------------------------------------------------------------
DO $$
DECLARE
    v_codigo TEXT := 'validacao_nucleo_' || txid_current()::TEXT;

    v_paciente_id BIGINT;
    v_atendimento_id BIGINT;
    v_diagnostico_chagas_id BIGINT;
    v_comorbidade_id BIGINT;
    v_projeto_estudo_id BIGINT;
    v_tipo_encaminhamento_id BIGINT;
    v_encaminhamento_id BIGINT;
    v_tipo_exame_complementar_id BIGINT;
    v_atendimento_exame_complementar_id BIGINT;
    v_medicamento_id BIGINT;
BEGIN
    PERFORM set_config('ambulatorio.validacao_codigo', v_codigo, TRUE);

    -- Paciente, endereco, contato e atendimento.
    INSERT INTO paciente (
        codigo_planilha,
        nome,
        data_nascimento,
        sexo,
        raca,
        pertence_comunidade_tradicional,
        tipo_comunidade_tradicional,
        grupo_origem_planilha
    )
    VALUES (
        v_codigo,
        'Paciente Validacao Nucleo',
        DATE '1980-01-15',
        'feminino',
        'nao_informado',
        TRUE,
        'quilombola',
        'planilha_portador_dc'
    )
    RETURNING paciente_id INTO v_paciente_id;

    INSERT INTO paciente_endereco (paciente_id, endereco, cidade)
    VALUES (v_paciente_id, 'Endereco temporario de validacao', 'Belo Horizonte');

    INSERT INTO paciente_contato (paciente_id, telefone)
    VALUES (v_paciente_id, '31999990000');

    INSERT INTO atendimento (
        paciente_id,
        data_atendimento,
        localizacao_prontuario,
        ambulatorio_unicamente,
        ambulatorio_anexo_projeto,
        origem_registro,
        observacoes
    )
    VALUES (
        v_paciente_id,
        DATE '2026-07-01',
        'VALIDACAO-PRONTUARIO',
        TRUE,
        FALSE,
        'cadastro_sistema',
        'Atendimento temporario para validacao do nucleo inicial.'
    )
    RETURNING atendimento_id INTO v_atendimento_id;

    RAISE NOTICE 'OK: paciente, endereco, contato e atendimento inseridos';

    -- Diagnostico, sorologia, solicitacao, historico familiar, condicao e complicacao.
    INSERT INTO diagnostico_chagas (
        atendimento_id,
        possui_diagnostico_chagas,
        status_diagnostico,
        resultado_final,
        data_resultado_final,
        criterio_confirmacao,
        observacoes
    )
    VALUES (
        v_atendimento_id,
        TRUE,
        'confirmado',
        'positivo',
        DATE '2026-07-01',
        'Validacao por sorologia',
        'Diagnostico temporario de validacao.'
    )
    RETURNING diagnostico_chagas_id INTO v_diagnostico_chagas_id;

    INSERT INTO sorologia_chagas (
        diagnostico_chagas_id,
        numero_metodo_planilha,
        metodo_sorologico,
        data_solicitacao,
        data_coleta,
        data_resultado,
        resultado,
        laboratorio,
        observacoes
    )
    VALUES (
        v_diagnostico_chagas_id,
        1,
        'ELISA',
        DATE '2026-06-20',
        DATE '2026-06-21',
        DATE '2026-06-25',
        'reagente',
        'Laboratorio de validacao',
        'Sorologia temporaria de validacao.'
    );

    INSERT INTO sorologia_solicitacao (
        atendimento_id,
        solicitada,
        data_solicitacao,
        tipo_solicitacao,
        status_solicitacao,
        observacoes
    )
    VALUES (
        v_atendimento_id,
        TRUE,
        DATE '2026-06-20',
        'Sorologia Chagas',
        'realizada',
        'Solicitacao temporaria de validacao.'
    );

    INSERT INTO historico_familiar_chagas (
        paciente_id,
        possui_historico_familiar,
        parentesco,
        descricao
    )
    VALUES (
        v_paciente_id,
        TRUE,
        'mae',
        'Historico familiar temporario de validacao.'
    );

    INSERT INTO condicao_chagas (
        atendimento_id,
        forma_clinica,
        fase_doenca,
        classificacao_clinica,
        possui_sintomas,
        descricao_sintomas,
        observacoes
    )
    VALUES (
        v_atendimento_id,
        'cardiaca',
        'cronica',
        'Classe funcional de validacao',
        TRUE,
        'Sintomas temporarios de validacao.',
        'Condicao temporaria de validacao.'
    );

    INSERT INTO complicacao_chagas (
        atendimento_id,
        tipo_complicacao,
        possui_complicacao,
        descricao,
        gravidade
    )
    VALUES (
        v_atendimento_id,
        'cardiaca',
        TRUE,
        'Complicacao temporaria de validacao.',
        'leve'
    );

    RAISE NOTICE 'OK: diagnostico, sorologia, solicitacao, historico, condicao e complicacao inseridos';

    -- Comorbidade e vinculo do paciente.
    INSERT INTO comorbidade (
        nome_comorbidade,
        descricao
    )
    VALUES (
        v_codigo,
        'Comorbidade temporaria de validacao.'
    )
    RETURNING comorbidade_id INTO v_comorbidade_id;

    INSERT INTO paciente_comorbidade (
        paciente_id,
        comorbidade_id,
        atendimento_id,
        possui_comorbidade,
        data_registro,
        observacoes
    )
    VALUES (
        v_paciente_id,
        v_comorbidade_id,
        v_atendimento_id,
        TRUE,
        DATE '2026-07-01',
        'Vinculo paciente-comorbidade temporario de validacao.'
    );

    RAISE NOTICE 'OK: comorbidade e vinculo do paciente inseridos';

    -- Projeto/estudo e vinculo com atendimento.
    INSERT INTO projeto_estudo (
        codigo_projeto,
        nome_projeto,
        descricao
    )
    VALUES (
        v_codigo,
        'Projeto Validacao Nucleo',
        'Projeto temporario de validacao.'
    )
    RETURNING projeto_estudo_id INTO v_projeto_estudo_id;

    INSERT INTO atendimento_projeto_estudo (
        atendimento_id,
        projeto_estudo_id,
        participa,
        possui_pendencia,
        descricao_pendencia,
        houve_falha,
        observacoes
    )
    VALUES (
        v_atendimento_id,
        v_projeto_estudo_id,
        TRUE,
        FALSE,
        NULL,
        FALSE,
        'Vinculo atendimento-projeto temporario de validacao.'
    );

    RAISE NOTICE 'OK: projeto/estudo e vinculo com atendimento inseridos';

    -- Encaminhamento e tipo de encaminhamento.
    INSERT INTO tipo_encaminhamento (
        codigo_tipo,
        nome_tipo,
        descricao
    )
    VALUES (
        v_codigo,
        'Encaminhamento Validacao Nucleo',
        'Tipo de encaminhamento temporario de validacao.'
    )
    RETURNING tipo_encaminhamento_id INTO v_tipo_encaminhamento_id;

    INSERT INTO encaminhamento (
        atendimento_id,
        tipo_encaminhamento_id,
        origem_encaminhamento,
        destino_nome,
        destino_servico,
        especialidade_destino,
        data_encaminhamento,
        data_agendamento,
        status_encaminhamento,
        prioridade,
        motivo,
        conduta_orientada,
        observacoes
    )
    VALUES (
        v_atendimento_id,
        v_tipo_encaminhamento_id,
        'ambulatorio',
        'Servico de validacao',
        'Ambulatorio de validacao',
        'Cardiologia',
        DATE '2026-07-01',
        DATE '2026-07-15',
        'agendado',
        'media',
        'Motivo temporario de validacao.',
        'Conduta temporaria de validacao.',
        'Encaminhamento temporario de validacao.'
    )
    RETURNING encaminhamento_id INTO v_encaminhamento_id;

    RAISE NOTICE 'OK: tipo de encaminhamento e encaminhamento inseridos';

    -- Exame complementar e resultado.
    INSERT INTO tipo_exame_complementar (
        codigo_exame,
        nome_exame,
        categoria,
        descricao
    )
    VALUES (
        v_codigo,
        'Exame Validacao Nucleo',
        'cardiologico',
        'Tipo de exame temporario de validacao.'
    )
    RETURNING tipo_exame_complementar_id INTO v_tipo_exame_complementar_id;

    INSERT INTO atendimento_exame_complementar (
        atendimento_id,
        tipo_exame_complementar_id,
        origem_exame,
        status_exame,
        data_solicitacao,
        data_realizacao,
        data_resultado,
        trouxe_exame,
        solicitado_exame,
        resultado_geral,
        resumo_resultado,
        laudo_texto,
        local_realizacao,
        profissional_solicitante,
        observacoes
    )
    VALUES (
        v_atendimento_id,
        v_tipo_exame_complementar_id,
        'solicitado_ambulatorio',
        'resultado_disponivel',
        DATE '2026-07-01',
        DATE '2026-07-02',
        DATE '2026-07-03',
        FALSE,
        TRUE,
        'normal',
        'Resumo temporario de validacao.',
        'Laudo temporario de validacao.',
        'Local de validacao',
        'Profissional de validacao',
        'Exame temporario de validacao.'
    )
    RETURNING atendimento_exame_complementar_id INTO v_atendimento_exame_complementar_id;

    INSERT INTO exame_complementar_resultado (
        atendimento_exame_complementar_id,
        nome_campo,
        valor_texto,
        valor_numerico,
        unidade,
        valor_referencia,
        interpretacao,
        valor_original,
        observacoes
    )
    VALUES (
        v_atendimento_exame_complementar_id,
        'FEVE',
        '60',
        60.0000,
        '%',
        '>= 55',
        'normal',
        '60%',
        'Resultado temporario de validacao.'
    );

    RAISE NOTICE 'OK: exame complementar e resultado inseridos';

    -- Medicamento, medicamento no atendimento, tratamento e procedimento.
    INSERT INTO medicamento (
        codigo_medicamento,
        nome_medicamento,
        principio_ativo,
        classe_medicamento
    )
    VALUES (
        v_codigo,
        'Medicamento Validacao Nucleo',
        'Principio ativo de validacao',
        'classe_validacao'
    )
    RETURNING medicamento_id INTO v_medicamento_id;

    INSERT INTO atendimento_medicamento (
        atendimento_id,
        medicamento_id,
        nome_medicamento_livre,
        tipo_registro,
        finalidade_uso,
        dose,
        via_administracao,
        frequencia,
        data_inicio,
        uso_atual,
        prescrito_no_atendimento,
        status_uso,
        motivo,
        observacoes
    )
    VALUES (
        v_atendimento_id,
        v_medicamento_id,
        NULL,
        'prescricao',
        'tratamento_chagas',
        '100 mg',
        'oral',
        '12/12h',
        DATE '2026-07-01',
        TRUE,
        TRUE,
        'prescrito',
        'Motivo temporario de validacao.',
        'Medicamento no atendimento temporario de validacao.'
    );

    INSERT INTO tratamento_chagas (
        atendimento_id,
        medicamento_id,
        indicado,
        iniciado,
        concluido,
        status_tratamento,
        motivo_nao_tratamento,
        data_indicacao,
        data_inicio,
        esquema_terapeutico,
        eventos_adversos,
        descricao_eventos_adversos,
        adesao_tratamento,
        observacoes
    )
    VALUES (
        v_atendimento_id,
        v_medicamento_id,
        TRUE,
        TRUE,
        FALSE,
        'em_andamento',
        NULL,
        DATE '2026-07-01',
        DATE '2026-07-02',
        'Esquema temporario de validacao.',
        FALSE,
        NULL,
        'boa',
        'Tratamento temporario de validacao.'
    );

    INSERT INTO procedimento_clinico (
        atendimento_id,
        tipo_procedimento,
        descricao,
        data_procedimento,
        status_procedimento,
        responsavel,
        resultado,
        conduta_pos_procedimento,
        observacoes
    )
    VALUES (
        v_atendimento_id,
        'Conduta de validacao',
        'Procedimento temporario de validacao.',
        DATE '2026-07-01',
        'realizado',
        'Equipe de validacao',
        'Resultado temporario de validacao.',
        'Conduta pos-procedimento temporaria.',
        'Procedimento temporario de validacao.'
    );

    RAISE NOTICE 'OK: medicamento, atendimento_medicamento, tratamento e procedimento inseridos';

    -- Acompanhamento de cuidado e pendencia de atendimento.
    INSERT INTO acompanhamento_cuidado (
        atendimento_id,
        encaminhamento_id,
        data_prevista,
        data_realizada,
        retorno_programado,
        compareceu,
        status_acompanhamento,
        tipo_acompanhamento,
        resumo_acompanhamento,
        conduta,
        observacoes
    )
    VALUES (
        v_atendimento_id,
        v_encaminhamento_id,
        DATE '2026-07-20',
        DATE '2026-07-20',
        TRUE,
        TRUE,
        'concluido',
        'retorno',
        'Resumo temporario de validacao.',
        'Conduta temporaria de validacao.',
        'Acompanhamento temporario de validacao.'
    );

    INSERT INTO pendencia_atendimento (
        atendimento_id,
        tipo_pendencia,
        descricao,
        status_pendencia,
        data_identificacao,
        data_resolucao,
        responsavel,
        observacoes
    )
    VALUES (
        v_atendimento_id,
        'documental',
        'Pendencia temporaria de validacao.',
        'resolvida',
        DATE '2026-07-01',
        DATE '2026-07-02',
        'Equipe de validacao',
        'Pendencia temporaria de validacao.'
    );

    RAISE NOTICE 'OK: acompanhamento de cuidado e pendencia de atendimento inseridos';
END;
$$;

-- ------------------------------------------------------------
-- Testes negativos: FK inexistente
-- ------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO atendimento (paciente_id, origem_registro)
    VALUES (-999999999999999, 'cadastro_sistema');

    RAISE EXCEPTION 'ERRO: FK inexistente foi aceita indevidamente';
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: FK inexistente bloqueada por constraint';
END;
$$;

-- ------------------------------------------------------------
-- Testes negativos: UNIQUE duplicado
-- ------------------------------------------------------------
DO $$
DECLARE
    v_codigo TEXT := current_setting('ambulatorio.validacao_codigo');
BEGIN
    INSERT INTO comorbidade (nome_comorbidade, descricao)
    VALUES (v_codigo, 'Duplicidade temporaria indevida.');

    RAISE EXCEPTION 'ERRO: valor duplicado em UNIQUE foi aceito indevidamente';
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'OK: valor duplicado bloqueado por UNIQUE';
END;
$$;

-- ------------------------------------------------------------
-- Testes negativos: CHECK de regra booleana
-- ------------------------------------------------------------
DO $$
DECLARE
    v_paciente_id BIGINT;
BEGIN
    SELECT paciente_id
    INTO v_paciente_id
    FROM paciente
    WHERE codigo_planilha = current_setting('ambulatorio.validacao_codigo');

    INSERT INTO atendimento (
        paciente_id,
        ambulatorio_unicamente,
        ambulatorio_anexo_projeto,
        origem_registro
    )
    VALUES (
        v_paciente_id,
        TRUE,
        TRUE,
        'cadastro_sistema'
    );

    RAISE EXCEPTION 'ERRO: violacao de CHECK foi aceita indevidamente';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'OK: violacao de CHECK bloqueada';
END;
$$;

-- ------------------------------------------------------------
-- Testes negativos: campo obrigatorio ausente
-- ------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO paciente (codigo_planilha)
    VALUES (current_setting('ambulatorio.validacao_codigo') || '_sem_nome');

    RAISE EXCEPTION 'ERRO: campo obrigatorio ausente foi aceito indevidamente';
EXCEPTION
    WHEN not_null_violation THEN
        RAISE NOTICE 'OK: campo obrigatorio ausente bloqueado por NOT NULL';
END;
$$;

-- ------------------------------------------------------------
-- Testes negativos: dominio textual restrito por CHECK
-- ------------------------------------------------------------
DO $$
BEGIN
    INSERT INTO paciente (
        codigo_planilha,
        nome,
        sexo
    )
    VALUES (
        current_setting('ambulatorio.validacao_codigo') || '_sexo_invalido',
        'Paciente Sexo Invalido',
        'valor_invalido'
    );

    RAISE EXCEPTION 'ERRO: valor invalido de dominio restrito foi aceito indevidamente';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'OK: valor invalido de dominio restrito bloqueado por CHECK';
END;
$$;

-- ------------------------------------------------------------
-- Consulta final: registros temporarios existentes antes do ROLLBACK
-- ------------------------------------------------------------
WITH
vars AS (
    SELECT current_setting('ambulatorio.validacao_codigo') AS codigo
),
p AS (
    SELECT paciente_id
    FROM paciente, vars
    WHERE paciente.codigo_planilha = vars.codigo
),
a AS (
    SELECT atendimento_id
    FROM atendimento
    JOIN p USING (paciente_id)
),
d AS (
    SELECT diagnostico_chagas_id
    FROM diagnostico_chagas
    JOIN a USING (atendimento_id)
),
cb AS (
    SELECT comorbidade_id
    FROM comorbidade, vars
    WHERE comorbidade.nome_comorbidade = vars.codigo
),
pr AS (
    SELECT projeto_estudo_id
    FROM projeto_estudo, vars
    WHERE projeto_estudo.codigo_projeto = vars.codigo
),
te AS (
    SELECT tipo_encaminhamento_id
    FROM tipo_encaminhamento, vars
    WHERE tipo_encaminhamento.codigo_tipo = vars.codigo
),
e AS (
    SELECT encaminhamento_id
    FROM encaminhamento
    JOIN a USING (atendimento_id)
),
tx AS (
    SELECT tipo_exame_complementar_id
    FROM tipo_exame_complementar, vars
    WHERE tipo_exame_complementar.codigo_exame = vars.codigo
),
ax AS (
    SELECT atendimento_exame_complementar_id
    FROM atendimento_exame_complementar
    JOIN a USING (atendimento_id)
),
m AS (
    SELECT medicamento_id
    FROM medicamento, vars
    WHERE medicamento.codigo_medicamento = vars.codigo
)
SELECT 'paciente' AS modulo, COUNT(*) AS registros_encontrados FROM p
UNION ALL
SELECT 'paciente_endereco', COUNT(*) FROM paciente_endereco JOIN p USING (paciente_id)
UNION ALL
SELECT 'paciente_contato', COUNT(*) FROM paciente_contato JOIN p USING (paciente_id)
UNION ALL
SELECT 'atendimento', COUNT(*) FROM a
UNION ALL
SELECT 'diagnostico_chagas', COUNT(*) FROM d
UNION ALL
SELECT 'sorologia_chagas', COUNT(*) FROM sorologia_chagas JOIN d USING (diagnostico_chagas_id)
UNION ALL
SELECT 'sorologia_solicitacao', COUNT(*) FROM sorologia_solicitacao JOIN a USING (atendimento_id)
UNION ALL
SELECT 'historico_familiar_chagas', COUNT(*) FROM historico_familiar_chagas JOIN p USING (paciente_id)
UNION ALL
SELECT 'condicao_chagas', COUNT(*) FROM condicao_chagas JOIN a USING (atendimento_id)
UNION ALL
SELECT 'complicacao_chagas', COUNT(*) FROM complicacao_chagas JOIN a USING (atendimento_id)
UNION ALL
SELECT 'comorbidade', COUNT(*) FROM cb
UNION ALL
SELECT 'paciente_comorbidade', COUNT(*) FROM paciente_comorbidade JOIN p USING (paciente_id) JOIN cb USING (comorbidade_id)
UNION ALL
SELECT 'projeto_estudo', COUNT(*) FROM pr
UNION ALL
SELECT 'atendimento_projeto_estudo', COUNT(*) FROM atendimento_projeto_estudo JOIN a USING (atendimento_id) JOIN pr USING (projeto_estudo_id)
UNION ALL
SELECT 'tipo_encaminhamento', COUNT(*) FROM te
UNION ALL
SELECT 'encaminhamento', COUNT(*) FROM e
UNION ALL
SELECT 'tipo_exame_complementar', COUNT(*) FROM tx
UNION ALL
SELECT 'atendimento_exame_complementar', COUNT(*) FROM ax
UNION ALL
SELECT 'exame_complementar_resultado', COUNT(*) FROM exame_complementar_resultado JOIN ax USING (atendimento_exame_complementar_id)
UNION ALL
SELECT 'medicamento', COUNT(*) FROM m
UNION ALL
SELECT 'atendimento_medicamento', COUNT(*) FROM atendimento_medicamento JOIN a USING (atendimento_id) JOIN m USING (medicamento_id)
UNION ALL
SELECT 'tratamento_chagas', COUNT(*) FROM tratamento_chagas JOIN a USING (atendimento_id) JOIN m USING (medicamento_id)
UNION ALL
SELECT 'procedimento_clinico', COUNT(*) FROM procedimento_clinico JOIN a USING (atendimento_id)
UNION ALL
SELECT 'acompanhamento_cuidado', COUNT(*) FROM acompanhamento_cuidado JOIN a USING (atendimento_id) JOIN e USING (encaminhamento_id)
UNION ALL
SELECT 'pendencia_atendimento', COUNT(*) FROM pendencia_atendimento JOIN a USING (atendimento_id)
ORDER BY modulo;

DO $$
BEGIN
    RAISE NOTICE 'OK: consulta final executada; ROLLBACK removera os registros temporarios';
END;
$$;

ROLLBACK;
