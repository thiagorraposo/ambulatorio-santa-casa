-- Objetivo: validar alvos do catalogo ADR-022 pela PK fisica, sem inferir seu nome.
-- Impacto: corrige destinos como paciente_endereco/endereco_id; revisao segue fechada.
-- Reversao: nova migration restritiva preservando catalogo, decisoes e historico.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE OR REPLACE FUNCTION revisao_alvo_paciente(tabela text, registro bigint) RETURNS bigint
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, ambulatorio, pg_temp AS $$
DECLARE p bigint; pk text;
BEGIN
    IF tabela NOT IN ('paciente','atendimento','paciente_endereco','paciente_contato',
        'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
        'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas',
        'encaminhamento','acompanhamento_cuidado','evento_clinico','dispositivo_implantado',
        'notificacao','obito','tratamento_chagas') THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_destino_nao_homologado';
    END IF;
    SELECT a.attname INTO STRICT pk FROM pg_index i
      JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=i.indkey[0]
      WHERE i.indrelid=to_regclass('ambulatorio.'||tabela) AND i.indisprimary AND i.indnkeyatts=1;
    IF tabela = 'paciente' THEN
        SELECT paciente_id INTO p FROM ambulatorio.paciente WHERE paciente_id=registro;
    ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ambulatorio.'||tabela)
                 AND attname='paciente_id' AND NOT attisdropped) THEN
        EXECUTE format('SELECT paciente_id FROM ambulatorio.%I WHERE %I=$1',tabela,pk) INTO p USING registro;
    ELSE
        EXECUTE format('SELECT a.paciente_id FROM ambulatorio.%I t JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE t.%I=$1',
                       tabela,pk) INTO p USING registro;
    END IF;
    IF p IS NULL THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_alvo_ausente';
    END IF;
    RETURN p;
END $$;

REVOKE ALL ON FUNCTION revisao_alvo_paciente(text,bigint)
    FROM PUBLIC, ambulatorio_importador, ambulatorio_aplicacao;
-- OLD/NEW sao registros polimorficos: validar campos comuns via JSON antes do ramo especifico.
CREATE OR REPLACE FUNCTION revisao_proteger_escrita() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, ambulatorio, pg_temp AS $$
DECLARE d importacao_revisao_decisao; a importacao_revisao_aplicacao;
BEGIN
    IF TG_OP = 'DELETE' OR TG_OP = 'TRUNCATE' THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_evidencia_imutavel';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'importacao_revisao_autorizacao'
           AND to_jsonb(OLD)->>'revogada_em' IS NULL AND to_jsonb(NEW)->>'revogada_em' IS NOT NULL
           AND (to_jsonb(NEW) - ARRAY['revogada_em','revogada_por_usuario_id']) =
               (to_jsonb(OLD) - ARRAY['revogada_em','revogada_por_usuario_id']) THEN
            NEW.revogada_em := clock_timestamp();
            RETURN NEW;
        END IF;
        -- O executor/avanco de fonte sera outro incremento. Neste, so cancelar
        -- proposta sem aplicacao, sem mudar o contrato ou a base.
        IF TG_TABLE_NAME = 'importacao_revisao'
           AND to_jsonb(OLD)->>'estado' = 'preparada' AND to_jsonb(NEW)->>'estado' = 'cancelada'
           AND (to_jsonb(NEW) - ARRAY['estado','encerrada_em']) =
               (to_jsonb(OLD) - ARRAY['estado','encerrada_em'])
           AND NOT EXISTS (SELECT 1 FROM importacao_revisao_aplicacao ap
                           JOIN importacao_revisao_decisao de USING(decisao_id)
                           WHERE de.revisao_id = (to_jsonb(OLD)->>'revisao_id')::bigint AND ap.resultado = 'aplicada') THEN
            NEW.encerrada_em := clock_timestamp();
            RETURN NEW;
        END IF;
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_evidencia_imutavel';
    END IF;
    CASE TG_TABLE_NAME
    WHEN 'importacao_fonte' THEN
        NEW.criado_em := clock_timestamp();
        IF NEW.revisao_corrente_id IS NOT NULL OR NEW.versao_controle <> 0 THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_executor_nao_habilitado';
        END IF;
    WHEN 'importacao_revisao' THEN
        NEW.criada_em := clock_timestamp();
        IF NEW.estado <> 'preparada' OR NEW.encerrada_em IS NOT NULL THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_executor_nao_habilitado';
        END IF;
    WHEN 'importacao_revisao_autorizacao' THEN
        NEW.concedida_em := clock_timestamp();
        IF NEW.revogada_em IS NOT NULL THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_autorizacao_invalida';
        END IF;
    WHEN 'importacao_revisao_decisao' THEN
        NEW.decidida_em := clock_timestamp(); NEW.publicacao_xid := pg_current_xact_id();
    WHEN 'importacao_revisao_campo' THEN
        SELECT * INTO STRICT d FROM importacao_revisao_decisao WHERE decisao_id = NEW.decisao_id FOR UPDATE;
        IF d.publicacao_xid <> pg_current_xact_id() THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_plano_ja_publicado';
        END IF;
    WHEN 'importacao_revisao_aplicacao' THEN
        NEW.executada_em := clock_timestamp(); NEW.executor_db := session_user;
        NEW.publicacao_xid := pg_current_xact_id();
        IF NEW.resultado = 'aplicada' THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_executor_nao_habilitado';
        END IF;
    WHEN 'importacao_revisao_alvo' THEN
        SELECT * INTO STRICT a FROM importacao_revisao_aplicacao WHERE aplicacao_id = NEW.aplicacao_id FOR UPDATE;
        IF a.publicacao_xid <> pg_current_xact_id() OR a.resultado <> 'aplicada' THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_aplicacao_sem_sucesso';
        END IF;
    WHEN 'auditoria_campo_evento' THEN
        NEW.ocorrido_em := clock_timestamp(); NEW.principal_db := session_user;
        IF NEW.origem <> 'marco_atual' THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_captura_nao_habilitada';
        END IF;
    ELSE NULL;
    END CASE;
    RETURN NEW;
END $$;

COMMIT;
