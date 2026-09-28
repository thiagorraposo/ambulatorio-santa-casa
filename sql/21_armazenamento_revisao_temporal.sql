-- Objetivo: armazenamento fechado da ADR-022, sem habilitar revisao clinica.
-- Impacto: nove tabelas vazias, integridade e imutabilidade; nenhum DML clinico.
-- Reversao: nova migration restritiva, preservando todas as evidencias. Nao apagar historico.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE TABLE importacao_fonte (
    fonte_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo text NOT NULL UNIQUE CHECK (btrim(codigo) <> ''),
    lote_inicial_id bigint NOT NULL REFERENCES importacao_lote ON DELETE RESTRICT,
    registrada_por_usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
    criado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    revisao_corrente_id bigint,
    versao_controle bigint NOT NULL DEFAULT 0 CHECK (versao_controle >= 0)
);

CREATE TABLE importacao_revisao (
    revisao_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fonte_id bigint NOT NULL REFERENCES importacao_fonte ON DELETE RESTRICT,
    lote_base_id bigint NOT NULL,
    hash_base varchar(64) NOT NULL CHECK (hash_base ~ '^[0-9a-f]{64}$'),
    layout_base varchar(80) NOT NULL CHECK (btrim(layout_base) <> ''),
    lote_revisado_id bigint NOT NULL,
    hash_revisado varchar(64) NOT NULL CHECK (hash_revisado ~ '^[0-9a-f]{64}$'),
    layout_revisado varchar(80) NOT NULL CHECK (btrim(layout_revisado) <> ''),
    revisao_base_id bigint,
    revisao_substituida_id bigint,
    versao_fonte_esperada bigint NOT NULL CHECK (versao_fonte_esperada >= 0),
    contrato_versao text NOT NULL CHECK (btrim(contrato_versao) <> ''),
    manifesto_base_sha256 text NOT NULL CHECK (manifesto_base_sha256 ~ '^[0-9a-f]{64}$'),
    manifesto_revisado_sha256 text NOT NULL CHECK (manifesto_revisado_sha256 ~ '^[0-9a-f]{64}$'),
    transformacoes_versao text NOT NULL CHECK (btrim(transformacoes_versao) <> ''),
    importador_versao text NOT NULL CHECK (btrim(importador_versao) <> ''),
    revisao_git text NOT NULL CHECK (revisao_git ~ '^[0-9a-f]{7,40}$'),
    estado text NOT NULL DEFAULT 'preparada' CHECK (estado IN
        ('preparada','em_aplicacao','concluida','concluida_com_pendencias','cancelada')),
    criada_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    encerrada_em timestamptz,
    UNIQUE (revisao_id, fonte_id),
    FOREIGN KEY (lote_base_id, hash_base, layout_base)
        REFERENCES importacao_lote (importacao_lote_id, hash_arquivo_sha256, layout_versao) ON DELETE RESTRICT,
    FOREIGN KEY (lote_revisado_id, hash_revisado, layout_revisado)
        REFERENCES importacao_lote (importacao_lote_id, hash_arquivo_sha256, layout_versao) ON DELETE RESTRICT,
    FOREIGN KEY (revisao_base_id, fonte_id) REFERENCES importacao_revisao (revisao_id, fonte_id) ON DELETE RESTRICT,
    FOREIGN KEY (revisao_substituida_id, fonte_id) REFERENCES importacao_revisao (revisao_id, fonte_id) ON DELETE RESTRICT,
    CHECK (lote_base_id <> lote_revisado_id AND hash_base <> hash_revisado),
    CHECK (revisao_base_id <> revisao_id AND revisao_substituida_id <> revisao_id),
    CHECK ((estado IN ('concluida','concluida_com_pendencias','cancelada')) = (encerrada_em IS NOT NULL)),
    CHECK (encerrada_em >= criada_em)
);
CREATE UNIQUE INDEX uq_revisao_conteudo_aplicado ON importacao_revisao
    (fonte_id, hash_revisado, layout_revisado)
    WHERE estado IN ('em_aplicacao','concluida','concluida_com_pendencias');
ALTER TABLE importacao_fonte ADD CONSTRAINT fk_fonte_revisao_corrente
    FOREIGN KEY (revisao_corrente_id, fonte_id)
    REFERENCES importacao_revisao (revisao_id, fonte_id) ON DELETE RESTRICT;

CREATE TABLE importacao_revisao_autorizacao (
    autorizacao_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fonte_id bigint NOT NULL REFERENCES importacao_fonte ON DELETE RESTRICT,
    usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
    concedida_por_usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
    concedida_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    valida_ate timestamptz,
    revogada_em timestamptz,
    revogada_por_usuario_id bigint REFERENCES usuario_aplicacao ON DELETE RESTRICT,
    CHECK (valida_ate > concedida_em),
    CHECK (revogada_em >= concedida_em),
    CHECK ((revogada_em IS NULL) = (revogada_por_usuario_id IS NULL))
);

CREATE TABLE importacao_revisao_decisao (
    decisao_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    revisao_id bigint NOT NULL REFERENCES importacao_revisao ON DELETE RESTRICT,
    linha_revisada_id bigint NOT NULL REFERENCES importacao_linha ON DELETE RESTRICT,
    linha_base_id bigint REFERENCES importacao_linha ON DELETE RESTRICT,
    paciente_id bigint REFERENCES paciente ON DELETE RESTRICT,
    atendimento_base_id bigint REFERENCES atendimento ON DELETE RESTRICT,
    versao_decisao bigint NOT NULL CHECK (versao_decisao > 0),
    decisao_anterior_id bigint UNIQUE REFERENCES importacao_revisao_decisao ON DELETE RESTRICT,
    resultado text NOT NULL CHECK (resultado IN ('autorizar','bloquear')),
    autorizacao_id bigint NOT NULL REFERENCES importacao_revisao_autorizacao ON DELETE RESTRICT,
    decidida_por_usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
    justificativa text NOT NULL CHECK (btrim(justificativa) <> ''),
    decidida_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    plano_sha256 text NOT NULL CHECK (plano_sha256 ~ '^[0-9a-f]{64}$'),
    publicacao_xid xid8 NOT NULL DEFAULT pg_current_xact_id(),
    UNIQUE (revisao_id, linha_revisada_id, versao_decisao),
    CHECK ((versao_decisao = 1) = (decisao_anterior_id IS NULL)),
    CHECK (decisao_anterior_id <> decisao_id),
    CHECK (resultado <> 'autorizar' OR paciente_id IS NOT NULL)
);

CREATE TABLE auditoria_campo (
    campo_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tabela_destino text NOT NULL CHECK (tabela_destino ~ '^[a-z][a-z0-9_]*$'),
    coluna_destino text NOT NULL CHECK (coluna_destino ~ '^[a-z][a-z0-9_]*$'),
    coluna_pk text NOT NULL CHECK (coluna_pk ~ '^[a-z][a-z0-9_]*$'),
    tipo_sql text NOT NULL CHECK (btrim(tipo_sql) <> ''),
    serializacao_versao text NOT NULL CHECK (serializacao_versao = 'v1'),
    captura_desde timestamptz,
    UNIQUE (tabela_destino, coluna_destino),
    -- Esta migration nao instala captura em tabelas clinicas.
    CONSTRAINT chk_captura_ainda_desabilitada CHECK (captura_desde IS NULL)
);

CREATE FUNCTION revisao_envelope_valido(v jsonb, fonte boolean) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, ambulatorio, pg_temp AS $$
    SELECT COALESCE(jsonb_typeof(v) = 'object'
        AND v ?& ARRAY['estado','tipo_sql','valor','precisao','serializacao_versao']
        AND (v - ARRAY['estado','tipo_sql','valor','precisao','serializacao_versao']) = '{}'::jsonb
        AND jsonb_typeof(v->'tipo_sql') = 'string' AND btrim(v->>'tipo_sql') <> ''
        AND v->>'serializacao_versao' = 'v1'
        AND v->>'precisao' IN ('nao_temporal','data_completa','ano','instante','desconhecida')
        AND CASE WHEN fonte THEN v->>'estado' IN ('linha_ausente','coluna_ausente','celula_vazia','valor','nulo_explicito')
                 ELSE v->>'estado' IN ('valor','nulo','alvo_ausente','desconhecido') END
        AND CASE WHEN v->>'estado' = 'valor' THEN jsonb_typeof(v->'valor') IN ('string','number','boolean','array','object')
                 ELSE v->'valor' = 'null'::jsonb END, false)
$$;

CREATE TABLE importacao_revisao_campo (
    revisao_campo_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    decisao_id bigint NOT NULL REFERENCES importacao_revisao_decisao ON DELETE RESTRICT,
    campo_id bigint NOT NULL REFERENCES auditoria_campo ON DELETE RESTRICT,
    alvo_chave text NOT NULL CHECK (btrim(alvo_chave) <> ''),
    registro_id bigint CHECK (registro_id > 0),
    chave_semantica text NOT NULL CHECK (btrim(chave_semantica) <> ''),
    bloco_funcional text NOT NULL CHECK (btrim(bloco_funcional) <> ''),
    ocorrencia bigint NOT NULL CHECK (ocorrencia > 0),
    categoria text NOT NULL CHECK (categoria IN
        ('sem_mudanca','correcao_ocorrencia','nova_visita','atualizacao_consolidada','revisao_necessaria')),
    operacao text NOT NULL CHECK (operacao IN ('conservar','associar','definir','anular','criar')),
    base jsonb NOT NULL CHECK (revisao_envelope_valido(base, true)),
    atual_avaliado jsonb NOT NULL CHECK (revisao_envelope_valido(atual_avaliado, false)),
    proposto jsonb NOT NULL CHECK (revisao_envelope_valido(proposto, true)),
    ultimo_evento_avaliado_id bigint,
    cobertura_historica text NOT NULL CHECK (cobertura_historica IN ('desde_base','posterior_base','desconhecida','alvo_novo')),
    UNIQUE (decisao_id, alvo_chave, campo_id),
    CHECK ((operacao = 'criar') = (registro_id IS NULL)),
    CHECK ((operacao = 'criar') = (cobertura_historica = 'alvo_novo')),
    CHECK (operacao <> 'criar' OR atual_avaliado->>'estado' = 'alvo_ausente'),
    CHECK (operacao <> 'anular' OR proposto->>'estado' = 'nulo_explicito'),
    CHECK (operacao NOT IN ('criar','definir') OR proposto->>'estado' = 'valor'),
    CHECK (categoria <> 'revisao_necessaria' OR operacao = 'conservar'),
    CHECK (categoria <> 'sem_mudanca' OR operacao IN ('conservar','associar')),
    CHECK (cobertura_historica <> 'desde_base' OR ultimo_evento_avaliado_id IS NOT NULL)
);

CREATE TABLE importacao_revisao_aplicacao (
    aplicacao_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    decisao_id bigint NOT NULL REFERENCES importacao_revisao_decisao ON DELETE RESTRICT,
    numero_tentativa bigint NOT NULL CHECK (numero_tentativa > 0),
    resultado text NOT NULL CHECK (resultado IN ('aplicada','obsoleta','conflito','falha_operacional')),
    codigo_resultado text NOT NULL CHECK (codigo_resultado ~ '^[a-z][a-z0-9_]*$'),
    executor_db text NOT NULL DEFAULT session_user CHECK (btrim(executor_db) <> ''),
    executada_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    plano_sha256 text NOT NULL CHECK (plano_sha256 ~ '^[0-9a-f]{64}$'),
    atendimento_criado_id bigint REFERENCES atendimento ON DELETE RESTRICT,
    publicacao_xid xid8 NOT NULL DEFAULT pg_current_xact_id(),
    UNIQUE (decisao_id, numero_tentativa),
    CHECK (resultado = 'aplicada' OR atendimento_criado_id IS NULL)
);
CREATE UNIQUE INDEX uq_revisao_aplicacao_sucesso ON importacao_revisao_aplicacao (decisao_id)
    WHERE resultado = 'aplicada';

CREATE TABLE importacao_revisao_alvo (
    revisao_alvo_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aplicacao_id bigint NOT NULL REFERENCES importacao_revisao_aplicacao ON DELETE RESTRICT,
    alvo_chave text NOT NULL CHECK (btrim(alvo_chave) <> ''),
    tabela_destino text NOT NULL CHECK (tabela_destino ~ '^[a-z][a-z0-9_]*$'),
    registro_id bigint NOT NULL CHECK (registro_id > 0),
    importacao_registro_id bigint NOT NULL REFERENCES importacao_registro ON DELETE RESTRICT,
    acao text NOT NULL CHECK (acao IN ('criado','atualizado','associado')),
    UNIQUE (aplicacao_id, alvo_chave)
);

CREATE TABLE auditoria_campo_evento (
    evento_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    campo_id bigint NOT NULL REFERENCES auditoria_campo ON DELETE RESTRICT,
    registro_id bigint NOT NULL CHECK (registro_id > 0),
    versao_campo bigint NOT NULL CHECK (versao_campo > 0),
    evento_anterior_id bigint UNIQUE REFERENCES auditoria_campo_evento ON DELETE RESTRICT,
    origem text NOT NULL CHECK (origem IN ('marco_atual','importacao','revisao','aplicacao','operacao_tecnica')),
    antes jsonb NOT NULL CHECK (revisao_envelope_valido(antes, false)),
    depois jsonb NOT NULL CHECK (revisao_envelope_valido(depois, false)),
    ocorrido_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    principal_db text NOT NULL DEFAULT session_user CHECK (btrim(principal_db) <> ''),
    ator_usuario_id bigint REFERENCES usuario_aplicacao ON DELETE RESTRICT,
    importacao_linha_id bigint REFERENCES importacao_linha ON DELETE RESTRICT,
    revisao_alvo_id bigint REFERENCES importacao_revisao_alvo ON DELETE RESTRICT,
    revisao_campo_id bigint REFERENCES importacao_revisao_campo ON DELETE RESTRICT,
    UNIQUE (campo_id, registro_id, versao_campo),
    CHECK ((versao_campo = 1) = (evento_anterior_id IS NULL)),
    CHECK (evento_anterior_id <> evento_id),
    CHECK ((origem = 'importacao') = (importacao_linha_id IS NOT NULL)),
    CHECK ((origem = 'revisao') = (revisao_alvo_id IS NOT NULL AND revisao_campo_id IS NOT NULL)),
    CHECK ((revisao_alvo_id IS NULL) = (revisao_campo_id IS NULL)),
    CHECK (origem <> 'marco_atual' OR (versao_campo = 1 AND antes->>'estado' = 'desconhecido'))
);
ALTER TABLE importacao_revisao_campo ADD CONSTRAINT fk_revisao_campo_evento
    FOREIGN KEY (ultimo_evento_avaliado_id) REFERENCES auditoria_campo_evento ON DELETE RESTRICT;

-- Somente destinos clinicos com ancora direta verificavel neste incremento.
CREATE FUNCTION revisao_alvo_paciente(tabela text, registro bigint) RETURNS bigint
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, ambulatorio, pg_temp AS $$
DECLARE p bigint;
BEGIN
    IF tabela NOT IN ('paciente','atendimento','paciente_endereco','paciente_contato',
        'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
        'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas',
        'encaminhamento','acompanhamento_cuidado','evento_clinico','dispositivo_implantado',
        'notificacao','obito','tratamento_chagas') THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_destino_nao_homologado';
    END IF;
    IF tabela = 'paciente' THEN
        SELECT paciente_id INTO p FROM paciente WHERE paciente_id = registro;
    ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('ambulatorio.' || tabela)
                 AND attname = 'paciente_id' AND NOT attisdropped) THEN
        EXECUTE format('SELECT paciente_id FROM ambulatorio.%I WHERE %I = $1', tabela, tabela || '_id') INTO p USING registro;
    ELSE
        EXECUTE format('SELECT a.paciente_id FROM ambulatorio.%I t JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE t.%I = $1',
                       tabela, tabela || '_id') INTO p USING registro;
    END IF;
    IF p IS NULL THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_alvo_ausente';
    END IF;
    RETURN p;
END $$;

-- Imutabilidade nao depende de datas do cliente. XID somente sela publicacao
-- atomica de metadados; nao e token de versao de campo clinico.
CREATE FUNCTION revisao_proteger_escrita() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, ambulatorio, pg_temp AS $$
DECLARE d importacao_revisao_decisao; a importacao_revisao_aplicacao;
BEGIN
    IF TG_OP = 'DELETE' OR TG_OP = 'TRUNCATE' THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_evidencia_imutavel';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'importacao_revisao_autorizacao'
           AND OLD.revogada_em IS NULL AND NEW.revogada_em IS NOT NULL
           AND (to_jsonb(NEW) - ARRAY['revogada_em','revogada_por_usuario_id']) =
               (to_jsonb(OLD) - ARRAY['revogada_em','revogada_por_usuario_id']) THEN
            NEW.revogada_em := clock_timestamp();
            RETURN NEW;
        END IF;
        -- O executor/avanco de fonte sera outro incremento. Neste, so cancelar
        -- proposta sem aplicacao, sem mudar o contrato ou a base.
        IF TG_TABLE_NAME = 'importacao_revisao'
           AND OLD.estado = 'preparada' AND NEW.estado = 'cancelada'
           AND (to_jsonb(NEW) - ARRAY['estado','encerrada_em']) =
               (to_jsonb(OLD) - ARRAY['estado','encerrada_em'])
           AND NOT EXISTS (SELECT 1 FROM importacao_revisao_aplicacao ap
                           JOIN importacao_revisao_decisao de USING(decisao_id)
                           WHERE de.revisao_id = OLD.revisao_id AND ap.resultado = 'aplicada') THEN
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

-- Validacao de plano completo, adiada ate COMMIT / SET CONSTRAINTS IMMEDIATE.
CREATE FUNCTION revisao_validar_integridade() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, ambulatorio, pg_temp AS $$
DECLARE
    f importacao_fonte; r importacao_revisao; prev importacao_revisao;
    d importacao_revisao_decisao; anterior importacao_revisao_decisao;
    au importacao_revisao_autorizacao; c auditoria_campo;
    v importacao_revisao_campo; ev auditoria_campo_evento;
    l importacao_lote; root_id bigint; next_id bigint; visited bigint[];
    expected_lote bigint; expected_patient bigint; actual_type text; actual_pk text;
BEGIN
    IF TG_TABLE_NAME = 'importacao_fonte' THEN
        SELECT * INTO f FROM importacao_fonte WHERE fonte_id = NEW.fonte_id;
        IF NOT EXISTS (SELECT 1 FROM importacao_lote WHERE importacao_lote_id=f.lote_inicial_id
                       AND status_lote IN ('concluido','concluido_com_pendencias')) THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_base_nao_terminal';
        END IF;
    ELSIF TG_TABLE_NAME = 'importacao_revisao' THEN
        SELECT * INTO r FROM importacao_revisao WHERE revisao_id=NEW.revisao_id;
        SELECT * INTO STRICT f FROM importacao_fonte WHERE fonte_id=r.fonte_id FOR UPDATE;
        expected_lote := f.lote_inicial_id;
        IF r.revisao_base_id IS NOT NULL THEN
            SELECT * INTO STRICT prev FROM importacao_revisao WHERE revisao_id=r.revisao_base_id;
            IF prev.estado NOT IN ('concluida','concluida_com_pendencias') THEN
                RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_base_nao_terminal';
            END IF;
            expected_lote := prev.lote_revisado_id;
        END IF;
        SELECT * INTO STRICT l FROM importacao_lote WHERE importacao_lote_id=r.lote_base_id;
        IF l.status_lote NOT IN ('concluido','concluido_com_pendencias') THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_base_nao_terminal';
        END IF;
        -- Exige ancestral comum real, nao somente igualdade do hash.
        root_id := r.lote_base_id; visited := ARRAY[]::bigint[];
        LOOP
            IF root_id = ANY(visited) THEN
                RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_ciclo_lotes';
            END IF;
            visited := array_append(visited,root_id);
            SELECT lote_reprocessado_de_id INTO next_id FROM importacao_lote WHERE importacao_lote_id=root_id;
            EXIT WHEN next_id IS NULL; root_id := next_id;
        END LOOP;
        next_id := expected_lote; visited := ARRAY[]::bigint[];
        LOOP
            IF next_id = ANY(visited) THEN
                RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_ciclo_lotes';
            END IF;
            visited := array_append(visited,next_id);
            SELECT lote_reprocessado_de_id INTO expected_lote FROM importacao_lote WHERE importacao_lote_id=next_id;
            EXIT WHEN expected_lote IS NULL; next_id := expected_lote;
        END LOOP;
        IF root_id <> next_id OR r.revisao_base_id IS DISTINCT FROM f.revisao_corrente_id
           OR r.versao_fonte_esperada <> f.versao_controle THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_base_incompativel';
        END IF;
        SELECT * INTO STRICT l FROM importacao_lote WHERE importacao_lote_id=r.lote_revisado_id;
        IF l.lote_reprocessado_de_id IS NOT NULL THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_conteudo_deve_iniciar_cadeia';
        END IF;
        IF r.revisao_substituida_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM importacao_revisao WHERE revisao_id=r.revisao_substituida_id
            AND estado='cancelada' AND fonte_id=r.fonte_id
            AND hash_revisado=r.hash_revisado AND layout_revisado=r.layout_revisado) THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_substituicao_invalida';
        END IF;
        IF r.hash_revisado = (SELECT hash_arquivo_sha256 FROM importacao_lote WHERE importacao_lote_id=f.lote_inicial_id)
           OR EXISTS (WITH RECURSIVE bases AS (
                SELECT revisao_id,revisao_base_id,hash_base,hash_revisado FROM importacao_revisao WHERE revisao_id=r.revisao_base_id
                UNION
                SELECT p.revisao_id,p.revisao_base_id,p.hash_base,p.hash_revisado FROM importacao_revisao p JOIN bases b ON p.revisao_id=b.revisao_base_id
           ) SELECT 1 FROM bases WHERE revisao_id=r.revisao_id OR hash_base=r.hash_revisado OR hash_revisado=r.hash_revisado) THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_ciclo_conteudos';
        END IF;
    ELSIF TG_TABLE_NAME IN ('importacao_revisao_decisao','importacao_revisao_campo') THEN
        SELECT * INTO STRICT d FROM importacao_revisao_decisao WHERE decisao_id=NEW.decisao_id;
        SELECT * INTO STRICT r FROM importacao_revisao WHERE revisao_id=d.revisao_id FOR UPDATE;
        IF r.estado <> 'preparada' THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_nao_aberta';
        END IF;
        SELECT * INTO STRICT au FROM importacao_revisao_autorizacao WHERE autorizacao_id=d.autorizacao_id FOR UPDATE;
        IF au.fonte_id <> r.fonte_id OR au.usuario_id <> d.decidida_por_usuario_id
           OR au.revogada_em IS NOT NULL OR au.concedida_em > d.decidida_em
           OR (au.valida_ate IS NOT NULL AND au.valida_ate <= clock_timestamp())
           OR NOT EXISTS (SELECT 1 FROM usuario_aplicacao WHERE usuario_id=au.usuario_id AND ativo) THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_autorizacao_invalida';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM importacao_linha WHERE importacao_linha_id=d.linha_revisada_id AND importacao_lote_id=r.lote_revisado_id)
           OR (d.linha_base_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM importacao_linha WHERE importacao_linha_id=d.linha_base_id AND importacao_lote_id=r.lote_base_id)) THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_linha_de_outro_lote';
        END IF;
        IF d.atendimento_base_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM atendimento WHERE atendimento_id=d.atendimento_base_id AND paciente_id=d.paciente_id) THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_paciente_incompativel';
        END IF;
        IF d.decisao_anterior_id IS NOT NULL THEN
            SELECT * INTO STRICT anterior FROM importacao_revisao_decisao WHERE decisao_id=d.decisao_anterior_id;
            IF anterior.revisao_id <> d.revisao_id OR anterior.linha_revisada_id <> d.linha_revisada_id
               OR anterior.versao_decisao + 1 <> d.versao_decisao THEN
                RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_versao_decisao_invalida';
            END IF;
        END IF;
        IF d.resultado='autorizar' AND NOT EXISTS (SELECT 1 FROM importacao_revisao_campo WHERE decisao_id=d.decisao_id) THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_plano_incompleto';
        END IF;
        IF d.resultado='autorizar' AND d.linha_base_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM importacao_revisao_decisao x WHERE x.revisao_id=d.revisao_id
            AND x.linha_base_id=d.linha_base_id AND x.linha_revisada_id<>d.linha_revisada_id AND x.resultado='autorizar'
            AND NOT EXISTS (SELECT 1 FROM importacao_revisao_decisao y WHERE y.decisao_anterior_id=x.decisao_id)
            AND NOT EXISTS (SELECT 1 FROM importacao_revisao_decisao y WHERE y.decisao_anterior_id=d.decisao_id)) THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_mapeamento_ambiguo';
        END IF;
        FOR v IN SELECT * FROM importacao_revisao_campo WHERE decisao_id=d.decisao_id LOOP
            SELECT * INTO STRICT c FROM auditoria_campo WHERE campo_id=v.campo_id;
            IF EXISTS (SELECT 1 FROM importacao_revisao_campo x JOIN auditoria_campo cx USING(campo_id)
                WHERE x.decisao_id=d.decisao_id AND x.alvo_chave=v.alvo_chave
                AND (cx.tabela_destino<>c.tabela_destino OR x.registro_id IS DISTINCT FROM v.registro_id))
               OR EXISTS (SELECT 1 FROM importacao_revisao_campo x WHERE x.decisao_id=d.decisao_id
                AND x.campo_id=v.campo_id AND x.registro_id=v.registro_id AND x.alvo_chave<>v.alvo_chave) THEN
                RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_alvo_inconsistente';
            END IF;
            IF v.registro_id IS NOT NULL THEN
                expected_patient := revisao_alvo_paciente(c.tabela_destino,v.registro_id);
                IF d.paciente_id IS DISTINCT FROM expected_patient THEN
                    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_paciente_incompativel';
                END IF;
            END IF;
            IF v.base->>'tipo_sql' <> c.tipo_sql OR v.atual_avaliado->>'tipo_sql' <> c.tipo_sql
               OR v.proposto->>'tipo_sql' <> c.tipo_sql THEN
                RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_tipo_incompativel';
            END IF;
            IF v.operacao='anular' AND EXISTS (SELECT 1 FROM pg_attribute
                WHERE attrelid=to_regclass('ambulatorio.'||c.tabela_destino) AND attname=c.coluna_destino AND attnotnull) THEN
                RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_coluna_nao_anulavel';
            END IF;
            IF (v.categoria='correcao_ocorrencia' AND (d.atendimento_base_id IS NULL OR d.linha_base_id IS NULL))
               OR (d.resultado='autorizar' AND v.categoria='revisao_necessaria')
               OR (d.resultado='bloquear' AND v.operacao<>'conservar') THEN
                RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_categoria_incompativel';
            END IF;
            IF v.ultimo_evento_avaliado_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM auditoria_campo_evento WHERE evento_id=v.ultimo_evento_avaliado_id
                AND campo_id=v.campo_id AND registro_id=v.registro_id) THEN
                RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_evento_de_outro_alvo';
            END IF;
            IF v.cobertura_historica='desde_base' OR v.operacao IN ('definir','anular') THEN
                RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_captura_nao_habilitada';
            END IF;
        END LOOP;
    ELSIF TG_TABLE_NAME = 'auditoria_campo' THEN
        SELECT * INTO STRICT c FROM auditoria_campo WHERE campo_id=NEW.campo_id;
        -- A lista da funcao e a allowlist, inclusive para tabelas vazias.
        BEGIN
            PERFORM revisao_alvo_paciente(c.tabela_destino,0);
        EXCEPTION WHEN check_violation THEN
            IF SQLERRM <> 'revisao_alvo_ausente' THEN RAISE; END IF;
        END;
        SELECT format_type(a.atttypid,a.atttypmod) INTO actual_type FROM pg_attribute a
        WHERE a.attrelid=to_regclass('ambulatorio.'||c.tabela_destino) AND a.attname=c.coluna_destino
          AND a.attnum>0 AND NOT a.attisdropped;
        SELECT a.attname INTO actual_pk FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=i.indkey[0]
        WHERE i.indrelid=to_regclass('ambulatorio.'||c.tabela_destino) AND i.indisprimary AND i.indnkeyatts=1;
        IF actual_type IS DISTINCT FROM c.tipo_sql OR actual_pk IS DISTINCT FROM c.coluna_pk
           OR c.coluna_destino=c.coluna_pk OR c.coluna_destino IN ('paciente_id','atendimento_id','criado_em','atualizado_em') THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_catalogo_invalido';
        END IF;
    ELSIF TG_TABLE_NAME = 'auditoria_campo_evento' THEN
        SELECT * INTO STRICT ev FROM auditoria_campo_evento WHERE evento_id=NEW.evento_id;
        SELECT * INTO STRICT c FROM auditoria_campo WHERE campo_id=ev.campo_id;
        PERFORM revisao_alvo_paciente(c.tabela_destino,ev.registro_id);
        IF ev.antes->>'tipo_sql'<>c.tipo_sql OR ev.depois->>'tipo_sql'<>c.tipo_sql THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_tipo_incompativel';
        END IF;
        -- Enquanto nao houver captura, so o marco atual e representavel.
        IF ev.versao_campo<>1 OR ev.evento_anterior_id IS NOT NULL OR ev.origem<>'marco_atual' THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_captura_nao_habilitada';
        END IF;
    ELSIF TG_TABLE_NAME = 'importacao_revisao_aplicacao' THEN
        SELECT * INTO STRICT d FROM importacao_revisao_decisao WHERE decisao_id=NEW.decisao_id;
        IF NEW.plano_sha256<>d.plano_sha256 THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_plano_divergente';
        END IF;
    END IF;
    RETURN NULL;
END $$;

DO $$
DECLARE t text; fn record; s text;
BEGIN
    FOREACH t IN ARRAY ARRAY['importacao_fonte','importacao_revisao','importacao_revisao_autorizacao',
        'importacao_revisao_decisao','auditoria_campo','importacao_revisao_campo',
        'importacao_revisao_aplicacao','importacao_revisao_alvo','auditoria_campo_evento'] LOOP
        EXECUTE format('CREATE TRIGGER proteger_revisao BEFORE INSERT OR UPDATE OR DELETE ON ambulatorio.%I FOR EACH ROW EXECUTE FUNCTION ambulatorio.revisao_proteger_escrita()',t);
        EXECUTE format('CREATE TRIGGER proteger_revisao_truncate BEFORE TRUNCATE ON ambulatorio.%I FOR EACH STATEMENT EXECUTE FUNCTION ambulatorio.revisao_proteger_escrita()',t);
        EXECUTE format('CREATE CONSTRAINT TRIGGER validar_revisao AFTER INSERT OR UPDATE ON ambulatorio.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ambulatorio.revisao_validar_integridade()',t);
        EXECUTE format('REVOKE ALL ON ambulatorio.%I FROM PUBLIC, ambulatorio_importador, ambulatorio_aplicacao',t);
        SELECT pg_get_serial_sequence('ambulatorio.'||t,a.attname) INTO s
        FROM pg_attribute a WHERE a.attrelid=to_regclass('ambulatorio.'||t) AND a.attidentity<>'';
        EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, ambulatorio_importador, ambulatorio_aplicacao',s);
        EXECUTE format('COMMENT ON TABLE ambulatorio.%I IS %L',t,'ADR-022: armazenamento fechado; captura e executor de revisao nao habilitados.');
    END LOOP;
    FOR fn IN SELECT oid::regprocedure AS signature FROM pg_proc
        WHERE pronamespace='ambulatorio'::regnamespace
        AND proname IN ('revisao_envelope_valido','revisao_alvo_paciente','revisao_proteger_escrita','revisao_validar_integridade') LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, ambulatorio_importador, ambulatorio_aplicacao',fn.signature);
    END LOOP;
END $$;

CREATE INDEX idx_fonte_lote ON importacao_fonte(lote_inicial_id);
CREATE INDEX idx_revisao_base ON importacao_revisao(lote_base_id);
CREATE INDEX idx_revisao_lote ON importacao_revisao(lote_revisado_id);
CREATE INDEX idx_revisao_base_fonte ON importacao_revisao(revisao_base_id,fonte_id);
CREATE INDEX idx_autorizacao_fonte_usuario ON importacao_revisao_autorizacao(fonte_id,usuario_id);
CREATE INDEX idx_decisao_autorizacao ON importacao_revisao_decisao(autorizacao_id);
CREATE INDEX idx_decisao_linha_base ON importacao_revisao_decisao(linha_base_id);
CREATE INDEX idx_campo_catalogo ON importacao_revisao_campo(campo_id,registro_id);
CREATE INDEX idx_campo_evento ON importacao_revisao_campo(ultimo_evento_avaliado_id);
CREATE INDEX idx_alvo_proveniencia ON importacao_revisao_alvo(importacao_registro_id);
CREATE INDEX idx_evento_linha ON auditoria_campo_evento(importacao_linha_id);
CREATE INDEX idx_evento_alvo ON auditoria_campo_evento(revisao_alvo_id);
CREATE INDEX idx_evento_campo_aprovado ON auditoria_campo_evento(revisao_campo_id);

COMMIT;
