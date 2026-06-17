-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 09_tabelas_medicamentos_tratamentos.sql
-- Finalidade:
--   Criar tabelas relacionadas a medicamentos, tratamentos
--   e procedimentos/condutas clinicas.
--
-- Como executar:
--   psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -f sql/09_tabelas_medicamentos_tratamentos.sql
-- ============================================================

SET search_path TO ambulatorio, public;

CREATE TABLE IF NOT EXISTS medicamento (
    medicamento_id BIGSERIAL PRIMARY KEY,

    codigo_medicamento VARCHAR(80) NOT NULL,
    nome_medicamento VARCHAR(150) NOT NULL,
    principio_ativo VARCHAR(150),
    classe_medicamento VARCHAR(120),

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_medicamento_codigo
        UNIQUE (codigo_medicamento)
);

COMMENT ON TABLE medicamento IS
'Catálogo de medicamentos utilizados, prescritos ou registrados no atendimento.';

COMMENT ON COLUMN medicamento.codigo_medicamento IS
'Código padronizado do medicamento no sistema.';

COMMENT ON COLUMN medicamento.nome_medicamento IS
'Nome legível do medicamento.';

COMMENT ON COLUMN medicamento.principio_ativo IS
'Princípio ativo do medicamento, quando aplicável.';

COMMENT ON COLUMN medicamento.classe_medicamento IS
'Classe ou grupo terapêutico do medicamento.';


CREATE TABLE IF NOT EXISTS atendimento_medicamento (
    atendimento_medicamento_id BIGSERIAL PRIMARY KEY,

    atendimento_id BIGINT NOT NULL,
    medicamento_id BIGINT,

    nome_medicamento_livre VARCHAR(180),

    tipo_registro VARCHAR(40),
    finalidade_uso VARCHAR(60),

    dose VARCHAR(80),
    via_administracao VARCHAR(50),
    frequencia VARCHAR(80),

    data_inicio DATE,
    data_fim DATE,

    uso_atual BOOLEAN,
    prescrito_no_atendimento BOOLEAN,

    status_uso VARCHAR(40),

    motivo TEXT,
    observacoes TEXT,

    valor_original_medicamento TEXT,
    valor_original_dose TEXT,
    valor_original_status TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_atendimento_medicamento_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_atendimento_medicamento_medicamento
        FOREIGN KEY (medicamento_id)
        REFERENCES medicamento (medicamento_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_atendimento_medicamento_tipo_registro
        CHECK (
            tipo_registro IS NULL
            OR tipo_registro IN (
                'uso_referido',
                'prescricao',
                'suspensao',
                'ajuste',
                'registro_planilha',
                'nao_informado'
            )
        ),

    CONSTRAINT chk_atendimento_medicamento_finalidade
        CHECK (
            finalidade_uso IS NULL
            OR finalidade_uso IN (
                'tratamento_chagas',
                'cardiovascular',
                'digestivo',
                'comorbidade',
                'sintomatico',
                'outro',
                'nao_informado'
            )
        ),

    CONSTRAINT chk_atendimento_medicamento_status
        CHECK (
            status_uso IS NULL
            OR status_uso IN (
                'em_uso',
                'prescrito',
                'suspenso',
                'finalizado',
                'nao_iniciado',
                'desconhecido',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE atendimento_medicamento IS
'Medicamentos utilizados, prescritos, suspensos ou registrados durante um atendimento.';

COMMENT ON COLUMN atendimento_medicamento.atendimento_id IS
'Atendimento ao qual o registro de medicamento está associado.';

COMMENT ON COLUMN atendimento_medicamento.medicamento_id IS
'Medicamento padronizado no catálogo, quando identificado.';

COMMENT ON COLUMN atendimento_medicamento.nome_medicamento_livre IS
'Nome textual do medicamento quando ainda não foi padronizado no catálogo.';

COMMENT ON COLUMN atendimento_medicamento.tipo_registro IS
'Tipo do registro: uso_referido, prescricao, suspensao, ajuste, registro_planilha ou nao_informado.';

COMMENT ON COLUMN atendimento_medicamento.finalidade_uso IS
'Finalidade do medicamento: tratamento_chagas, cardiovascular, digestivo, comorbidade, sintomatico, outro ou nao_informado.';

COMMENT ON COLUMN atendimento_medicamento.dose IS
'Dose registrada em texto livre.';

COMMENT ON COLUMN atendimento_medicamento.via_administracao IS
'Via de administração, quando informada.';

COMMENT ON COLUMN atendimento_medicamento.frequencia IS
'Frequência de uso do medicamento.';

COMMENT ON COLUMN atendimento_medicamento.uso_atual IS
'Indica se o paciente estava em uso do medicamento no momento do atendimento.';

COMMENT ON COLUMN atendimento_medicamento.prescrito_no_atendimento IS
'Indica se o medicamento foi prescrito durante o atendimento.';

COMMENT ON COLUMN atendimento_medicamento.status_uso IS
'Status do uso do medicamento: em_uso, prescrito, suspenso, finalizado, nao_iniciado, desconhecido ou nao_informado.';


CREATE TABLE IF NOT EXISTS tratamento_chagas (
    tratamento_chagas_id BIGSERIAL PRIMARY KEY,

    atendimento_id BIGINT NOT NULL,
    medicamento_id BIGINT,

    indicado BOOLEAN,
    iniciado BOOLEAN,
    concluido BOOLEAN,

    status_tratamento VARCHAR(40),
    motivo_nao_tratamento TEXT,

    data_indicacao DATE,
    data_inicio DATE,
    data_fim DATE,

    esquema_terapeutico TEXT,
    eventos_adversos BOOLEAN,
    descricao_eventos_adversos TEXT,

    adesao_tratamento VARCHAR(40),

    valor_original_tratamento TEXT,
    valor_original_status TEXT,
    valor_original_eventos_adversos TEXT,

    observacoes TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tratamento_chagas_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_tratamento_chagas_medicamento
        FOREIGN KEY (medicamento_id)
        REFERENCES medicamento (medicamento_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_tratamento_chagas_status
        CHECK (
            status_tratamento IS NULL
            OR status_tratamento IN (
                'indicado',
                'em_andamento',
                'concluido',
                'suspenso',
                'contraindicado',
                'nao_iniciado',
                'nao_informado'
            )
        ),

    CONSTRAINT chk_tratamento_chagas_adesao
        CHECK (
            adesao_tratamento IS NULL
            OR adesao_tratamento IN (
                'boa',
                'parcial',
                'baixa',
                'desconhecida',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE tratamento_chagas IS
'Registro de tratamento etiológico ou específico para doença de Chagas associado ao atendimento.';

COMMENT ON COLUMN tratamento_chagas.atendimento_id IS
'Atendimento ao qual o tratamento está associado.';

COMMENT ON COLUMN tratamento_chagas.medicamento_id IS
'Medicamento usado no tratamento, quando identificado no catálogo.';

COMMENT ON COLUMN tratamento_chagas.indicado IS
'Indica se o tratamento foi indicado.';

COMMENT ON COLUMN tratamento_chagas.iniciado IS
'Indica se o tratamento foi iniciado.';

COMMENT ON COLUMN tratamento_chagas.concluido IS
'Indica se o tratamento foi concluído.';

COMMENT ON COLUMN tratamento_chagas.status_tratamento IS
'Status do tratamento: indicado, em_andamento, concluido, suspenso, contraindicado, nao_iniciado ou nao_informado.';

COMMENT ON COLUMN tratamento_chagas.motivo_nao_tratamento IS
'Motivo para não realizar ou não iniciar o tratamento, quando informado.';

COMMENT ON COLUMN tratamento_chagas.esquema_terapeutico IS
'Descrição do esquema terapêutico usado.';

COMMENT ON COLUMN tratamento_chagas.eventos_adversos IS
'Indica se houve eventos adversos relacionados ao tratamento.';

COMMENT ON COLUMN tratamento_chagas.descricao_eventos_adversos IS
'Descrição textual dos eventos adversos.';

COMMENT ON COLUMN tratamento_chagas.adesao_tratamento IS
'Adesão ao tratamento: boa, parcial, baixa, desconhecida ou nao_informado.';


CREATE TABLE IF NOT EXISTS procedimento_clinico (
    procedimento_clinico_id BIGSERIAL PRIMARY KEY,

    atendimento_id BIGINT NOT NULL,

    tipo_procedimento VARCHAR(120),
    descricao TEXT,

    data_procedimento DATE,
    status_procedimento VARCHAR(40),

    responsavel VARCHAR(150),

    resultado TEXT,
    conduta_pos_procedimento TEXT,

    valor_original_procedimento TEXT,
    valor_original_resultado TEXT,
    valor_original_conduta TEXT,

    observacoes TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_procedimento_clinico_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_procedimento_clinico_status
        CHECK (
            status_procedimento IS NULL
            OR status_procedimento IN (
                'indicado',
                'solicitado',
                'realizado',
                'pendente',
                'cancelado',
                'nao_realizado',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE procedimento_clinico IS
'Procedimentos, condutas clínicas ou intervenções registrados no atendimento.';

COMMENT ON COLUMN procedimento_clinico.atendimento_id IS
'Atendimento ao qual o procedimento está associado.';

COMMENT ON COLUMN procedimento_clinico.tipo_procedimento IS
'Tipo ou nome do procedimento clínico.';

COMMENT ON COLUMN procedimento_clinico.descricao IS
'Descrição textual do procedimento ou conduta.';

COMMENT ON COLUMN procedimento_clinico.data_procedimento IS
'Data em que o procedimento foi realizado ou indicado.';

COMMENT ON COLUMN procedimento_clinico.status_procedimento IS
'Status do procedimento: indicado, solicitado, realizado, pendente, cancelado, nao_realizado ou nao_informado.';

COMMENT ON COLUMN procedimento_clinico.responsavel IS
'Profissional ou setor responsável pelo procedimento.';

COMMENT ON COLUMN procedimento_clinico.resultado IS
'Resultado textual do procedimento, quando aplicável.';

COMMENT ON COLUMN procedimento_clinico.conduta_pos_procedimento IS
'Conduta definida após o procedimento.';


CREATE INDEX IF NOT EXISTS idx_medicamento_codigo
ON medicamento (codigo_medicamento);

CREATE INDEX IF NOT EXISTS idx_atendimento_medicamento_atendimento_id
ON atendimento_medicamento (atendimento_id);

CREATE INDEX IF NOT EXISTS idx_atendimento_medicamento_medicamento_id
ON atendimento_medicamento (medicamento_id);

CREATE INDEX IF NOT EXISTS idx_atendimento_medicamento_status
ON atendimento_medicamento (status_uso);

CREATE INDEX IF NOT EXISTS idx_tratamento_chagas_atendimento_id
ON tratamento_chagas (atendimento_id);

CREATE INDEX IF NOT EXISTS idx_tratamento_chagas_medicamento_id
ON tratamento_chagas (medicamento_id);

CREATE INDEX IF NOT EXISTS idx_tratamento_chagas_status
ON tratamento_chagas (status_tratamento);

CREATE INDEX IF NOT EXISTS idx_procedimento_clinico_atendimento_id
ON procedimento_clinico (atendimento_id);

CREATE INDEX IF NOT EXISTS idx_procedimento_clinico_status
ON procedimento_clinico (status_procedimento);


INSERT INTO medicamento (
    codigo_medicamento,
    nome_medicamento,
    principio_ativo,
    classe_medicamento
)
VALUES
    ('benznidazol', 'Benznidazol', 'Benznidazol', 'antiparasitario'),
    ('nifurtimox', 'Nifurtimox', 'Nifurtimox', 'antiparasitario'),
    ('antihipertensivo_nao_especificado', 'Anti-hipertensivo não especificado', NULL, 'cardiovascular'),
    ('diuretico_nao_especificado', 'Diurético não especificado', NULL, 'cardiovascular'),
    ('betabloqueador_nao_especificado', 'Betabloqueador não especificado', NULL, 'cardiovascular'),
    ('antiarritmico_nao_especificado', 'Antiarrítmico não especificado', NULL, 'cardiovascular'),
    ('outro', 'Outro medicamento', NULL, 'outro'),
    ('nao_informado', 'Não informado', NULL, 'nao_informado')
ON CONFLICT (codigo_medicamento) DO NOTHING;