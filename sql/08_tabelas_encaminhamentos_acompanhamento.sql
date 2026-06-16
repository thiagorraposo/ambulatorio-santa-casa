-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 08_tabelas_encaminhamentos_acompanhamento.sql
-- Finalidade:
--   Criar tabelas relacionadas a encaminhamentos, pendencias
--   e acompanhamento da continuidade do cuidado.
--
-- Como executar:
--   psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -f sql/08_tabelas_encaminhamentos_acompanhamento.sql
-- ============================================================

SET search_path TO ambulatorio, public;

CREATE TABLE IF NOT EXISTS tipo_encaminhamento (
    tipo_encaminhamento_id BIGSERIAL PRIMARY KEY,

    codigo_tipo VARCHAR(80) NOT NULL,
    nome_tipo VARCHAR(150) NOT NULL,
    descricao TEXT,

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_tipo_encaminhamento_codigo
        UNIQUE (codigo_tipo)
);

COMMENT ON TABLE tipo_encaminhamento IS
'Catálogo de tipos de encaminhamento possíveis.';

COMMENT ON COLUMN tipo_encaminhamento.codigo_tipo IS
'Código padronizado do tipo de encaminhamento.';

COMMENT ON COLUMN tipo_encaminhamento.nome_tipo IS
'Nome legível do tipo de encaminhamento.';

COMMENT ON COLUMN tipo_encaminhamento.descricao IS
'Descrição opcional do tipo de encaminhamento.';


CREATE TABLE IF NOT EXISTS encaminhamento (
    encaminhamento_id BIGSERIAL PRIMARY KEY,

    atendimento_id BIGINT NOT NULL,
    tipo_encaminhamento_id BIGINT,

    origem_encaminhamento VARCHAR(60),
    destino_nome VARCHAR(180),
    destino_servico VARCHAR(180),
    especialidade_destino VARCHAR(120),

    data_encaminhamento DATE,
    data_agendamento DATE,
    data_realizacao DATE,

    status_encaminhamento VARCHAR(40),
    prioridade VARCHAR(30),

    motivo TEXT,
    conduta_orientada TEXT,

    valor_original_encaminhamento TEXT,
    valor_original_origem TEXT,
    valor_original_destino TEXT,
    valor_original_status TEXT,

    observacoes TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_encaminhamento_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_encaminhamento_tipo
        FOREIGN KEY (tipo_encaminhamento_id)
        REFERENCES tipo_encaminhamento (tipo_encaminhamento_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_encaminhamento_origem
        CHECK (
            origem_encaminhamento IS NULL
            OR origem_encaminhamento IN (
                'ambulatorio',
                'projeto_pesquisa',
                'atencao_basica',
                'servico_especializado',
                'hospital',
                'demanda_espontanea',
                'planilha',
                'outro',
                'nao_informado'
            )
        ),

    CONSTRAINT chk_encaminhamento_status
        CHECK (
            status_encaminhamento IS NULL
            OR status_encaminhamento IN (
                'indicado',
                'solicitado',
                'agendado',
                'realizado',
                'pendente',
                'cancelado',
                'nao_compareceu',
                'nao_informado'
            )
        ),

    CONSTRAINT chk_encaminhamento_prioridade
        CHECK (
            prioridade IS NULL
            OR prioridade IN (
                'baixa',
                'media',
                'alta',
                'urgente',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE encaminhamento IS
'Encaminhamentos gerados a partir de um atendimento.';

COMMENT ON COLUMN encaminhamento.atendimento_id IS
'Atendimento que originou o encaminhamento.';

COMMENT ON COLUMN encaminhamento.tipo_encaminhamento_id IS
'Tipo padronizado de encaminhamento.';

COMMENT ON COLUMN encaminhamento.origem_encaminhamento IS
'Origem do encaminhamento: ambulatorio, projeto_pesquisa, atencao_basica, servico_especializado, hospital, demanda_espontanea, planilha, outro ou nao_informado.';

COMMENT ON COLUMN encaminhamento.destino_nome IS
'Nome da instituição, unidade ou local de destino.';

COMMENT ON COLUMN encaminhamento.destino_servico IS
'Serviço de destino do encaminhamento.';

COMMENT ON COLUMN encaminhamento.especialidade_destino IS
'Especialidade de destino, quando aplicável.';

COMMENT ON COLUMN encaminhamento.status_encaminhamento IS
'Status do encaminhamento: indicado, solicitado, agendado, realizado, pendente, cancelado, nao_compareceu ou nao_informado.';

COMMENT ON COLUMN encaminhamento.prioridade IS
'Prioridade do encaminhamento: baixa, media, alta, urgente ou nao_informado.';

COMMENT ON COLUMN encaminhamento.motivo IS
'Motivo clínico ou administrativo do encaminhamento.';

COMMENT ON COLUMN encaminhamento.conduta_orientada IS
'Conduta orientada ao paciente relacionada ao encaminhamento.';

COMMENT ON COLUMN encaminhamento.valor_original_encaminhamento IS
'Valor bruto da planilha relacionado ao encaminhamento.';


CREATE TABLE IF NOT EXISTS acompanhamento_cuidado (
    acompanhamento_cuidado_id BIGSERIAL PRIMARY KEY,

    atendimento_id BIGINT NOT NULL,
    encaminhamento_id BIGINT,

    data_prevista DATE,
    data_realizada DATE,

    retorno_programado BOOLEAN,
    compareceu BOOLEAN,

    status_acompanhamento VARCHAR(40),
    tipo_acompanhamento VARCHAR(80),

    resumo_acompanhamento TEXT,
    conduta TEXT,

    valor_original_acompanhamento TEXT,
    valor_original_status TEXT,
    valor_original_conduta TEXT,

    observacoes TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_acompanhamento_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_acompanhamento_encaminhamento
        FOREIGN KEY (encaminhamento_id)
        REFERENCES encaminhamento (encaminhamento_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_acompanhamento_status
        CHECK (
            status_acompanhamento IS NULL
            OR status_acompanhamento IN (
                'programado',
                'em_andamento',
                'concluido',
                'pendente',
                'cancelado',
                'perdido_seguimento',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE acompanhamento_cuidado IS
'Registros de acompanhamento, seguimento ou retorno relacionados ao atendimento e, opcionalmente, a um encaminhamento.';

COMMENT ON COLUMN acompanhamento_cuidado.atendimento_id IS
'Atendimento relacionado ao acompanhamento.';

COMMENT ON COLUMN acompanhamento_cuidado.encaminhamento_id IS
'Encaminhamento relacionado ao acompanhamento, quando aplicável.';

COMMENT ON COLUMN acompanhamento_cuidado.data_prevista IS
'Data prevista para o acompanhamento ou retorno.';

COMMENT ON COLUMN acompanhamento_cuidado.data_realizada IS
'Data em que o acompanhamento ou retorno ocorreu.';

COMMENT ON COLUMN acompanhamento_cuidado.retorno_programado IS
'Indica se havia retorno programado.';

COMMENT ON COLUMN acompanhamento_cuidado.compareceu IS
'Indica se o paciente compareceu ao acompanhamento ou retorno.';

COMMENT ON COLUMN acompanhamento_cuidado.status_acompanhamento IS
'Status do acompanhamento: programado, em_andamento, concluido, pendente, cancelado, perdido_seguimento ou nao_informado.';

COMMENT ON COLUMN acompanhamento_cuidado.tipo_acompanhamento IS
'Tipo de acompanhamento ou retorno realizado.';

COMMENT ON COLUMN acompanhamento_cuidado.resumo_acompanhamento IS
'Resumo textual do acompanhamento.';

COMMENT ON COLUMN acompanhamento_cuidado.conduta IS
'Conduta definida no acompanhamento.';


CREATE TABLE IF NOT EXISTS pendencia_atendimento (
    pendencia_atendimento_id BIGSERIAL PRIMARY KEY,

    atendimento_id BIGINT NOT NULL,

    tipo_pendencia VARCHAR(80),
    descricao TEXT,

    status_pendencia VARCHAR(40),
    data_identificacao DATE,
    data_resolucao DATE,

    responsavel VARCHAR(150),

    valor_original_pendencia TEXT,
    observacoes TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pendencia_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_pendencia_status
        CHECK (
            status_pendencia IS NULL
            OR status_pendencia IN (
                'aberta',
                'em_andamento',
                'resolvida',
                'cancelada',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE pendencia_atendimento IS
'Pendências gerais associadas a um atendimento.';

COMMENT ON COLUMN pendencia_atendimento.atendimento_id IS
'Atendimento ao qual a pendência está associada.';

COMMENT ON COLUMN pendencia_atendimento.tipo_pendencia IS
'Tipo da pendência registrada.';

COMMENT ON COLUMN pendencia_atendimento.descricao IS
'Descrição textual da pendência.';

COMMENT ON COLUMN pendencia_atendimento.status_pendencia IS
'Status da pendência: aberta, em_andamento, resolvida, cancelada ou nao_informado.';

COMMENT ON COLUMN pendencia_atendimento.data_identificacao IS
'Data em que a pendência foi identificada.';

COMMENT ON COLUMN pendencia_atendimento.data_resolucao IS
'Data em que a pendência foi resolvida.';

COMMENT ON COLUMN pendencia_atendimento.responsavel IS
'Pessoa ou setor responsável pela pendência.';


CREATE INDEX IF NOT EXISTS idx_encaminhamento_atendimento_id
ON encaminhamento (atendimento_id);

CREATE INDEX IF NOT EXISTS idx_encaminhamento_tipo_id
ON encaminhamento (tipo_encaminhamento_id);

CREATE INDEX IF NOT EXISTS idx_encaminhamento_status
ON encaminhamento (status_encaminhamento);

CREATE INDEX IF NOT EXISTS idx_encaminhamento_data
ON encaminhamento (data_encaminhamento);

CREATE INDEX IF NOT EXISTS idx_acompanhamento_atendimento_id
ON acompanhamento_cuidado (atendimento_id);

CREATE INDEX IF NOT EXISTS idx_acompanhamento_encaminhamento_id
ON acompanhamento_cuidado (encaminhamento_id);

CREATE INDEX IF NOT EXISTS idx_acompanhamento_status
ON acompanhamento_cuidado (status_acompanhamento);

CREATE INDEX IF NOT EXISTS idx_pendencia_atendimento_id
ON pendencia_atendimento (atendimento_id);

CREATE INDEX IF NOT EXISTS idx_pendencia_status
ON pendencia_atendimento (status_pendencia);


INSERT INTO tipo_encaminhamento (
    codigo_tipo,
    nome_tipo,
    descricao
)
VALUES
    ('cardiologia', 'Cardiologia', 'Encaminhamento para avaliação cardiológica.'),
    ('gastroenterologia', 'Gastroenterologia', 'Encaminhamento para avaliação gastroenterológica.'),
    ('infectologia', 'Infectologia', 'Encaminhamento para avaliação infectológica.'),
    ('atencao_basica', 'Atenção básica', 'Encaminhamento para acompanhamento na atenção básica.'),
    ('servico_social', 'Serviço social', 'Encaminhamento para serviço social.'),
    ('exame_complementar', 'Exame complementar', 'Encaminhamento para realização de exame complementar.'),
    ('hospital', 'Hospital', 'Encaminhamento para serviço hospitalar.'),
    ('outro', 'Outro', 'Tipo genérico de encaminhamento.'),
    ('nao_informado', 'Não informado', 'Tipo usado quando o encaminhamento não foi informado.')
ON CONFLICT (codigo_tipo) DO NOTHING;