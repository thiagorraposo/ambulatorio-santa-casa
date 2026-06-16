-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 07_tabelas_exames_complementares.sql
-- Finalidade:
--   Criar tabelas relacionadas a exames complementares,
--   incluindo exames trazidos pelo paciente, exames solicitados
--   e resultados estruturados.
--
-- Como executar:
--   psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -f sql/07_tabelas_exames_complementares.sql
-- ============================================================

SET search_path TO ambulatorio, public;

CREATE TABLE IF NOT EXISTS tipo_exame_complementar (
    tipo_exame_complementar_id BIGSERIAL PRIMARY KEY,

    codigo_exame VARCHAR(80) NOT NULL,
    nome_exame VARCHAR(150) NOT NULL,
    categoria VARCHAR(50),
    descricao TEXT,

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_tipo_exame_complementar_codigo
        UNIQUE (codigo_exame),

    CONSTRAINT chk_tipo_exame_complementar_categoria
        CHECK (
            categoria IS NULL
            OR categoria IN (
                'cardiologico',
                'laboratorial',
                'imagem',
                'funcional',
                'outro',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE tipo_exame_complementar IS
'Catálogo de tipos de exames complementares.';

COMMENT ON COLUMN tipo_exame_complementar.codigo_exame IS
'Código padronizado do exame complementar.';

COMMENT ON COLUMN tipo_exame_complementar.nome_exame IS
'Nome legível do exame complementar.';

COMMENT ON COLUMN tipo_exame_complementar.categoria IS
'Categoria do exame: cardiologico, laboratorial, imagem, funcional, outro ou nao_informado.';


CREATE TABLE IF NOT EXISTS atendimento_exame_complementar (
    atendimento_exame_complementar_id BIGSERIAL PRIMARY KEY,

    atendimento_id BIGINT NOT NULL,
    tipo_exame_complementar_id BIGINT NOT NULL,

    origem_exame VARCHAR(40),
    status_exame VARCHAR(40),

    data_solicitacao DATE,
    data_realizacao DATE,
    data_resultado DATE,

    trouxe_exame BOOLEAN,
    solicitado_exame BOOLEAN,

    resultado_geral VARCHAR(40),
    resumo_resultado TEXT,
    laudo_texto TEXT,

    local_realizacao VARCHAR(150),
    profissional_solicitante VARCHAR(150),

    valor_original_trazido TEXT,
    valor_original_solicitado TEXT,
    valor_original_resultado TEXT,
    valor_original_observacao TEXT,

    observacoes TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_atendimento_exame_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_atendimento_exame_tipo
        FOREIGN KEY (tipo_exame_complementar_id)
        REFERENCES tipo_exame_complementar (tipo_exame_complementar_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_atendimento_exame_origem
        CHECK (
            origem_exame IS NULL
            OR origem_exame IN (
                'trazido_paciente',
                'solicitado_ambulatorio',
                'realizado_ambulatorio',
                'registrado_planilha',
                'nao_informado'
            )
        ),

    CONSTRAINT chk_atendimento_exame_status
        CHECK (
            status_exame IS NULL
            OR status_exame IN (
                'solicitado',
                'trazido',
                'realizado',
                'pendente',
                'cancelado',
                'sem_resultado',
                'resultado_disponivel',
                'nao_informado'
            )
        ),

    CONSTRAINT chk_atendimento_exame_resultado_geral
        CHECK (
            resultado_geral IS NULL
            OR resultado_geral IN (
                'normal',
                'alterado',
                'inconclusivo',
                'nao_aplicavel',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE atendimento_exame_complementar IS
'Exames complementares associados a um atendimento. Cobre exames trazidos, solicitados, realizados e registrados na planilha.';

COMMENT ON COLUMN atendimento_exame_complementar.atendimento_id IS
'Atendimento ao qual o exame está associado.';

COMMENT ON COLUMN atendimento_exame_complementar.tipo_exame_complementar_id IS
'Tipo de exame complementar realizado, solicitado ou trazido.';

COMMENT ON COLUMN atendimento_exame_complementar.origem_exame IS
'Origem do exame: trazido_paciente, solicitado_ambulatorio, realizado_ambulatorio, registrado_planilha ou nao_informado.';

COMMENT ON COLUMN atendimento_exame_complementar.status_exame IS
'Status do exame: solicitado, trazido, realizado, pendente, cancelado, sem_resultado, resultado_disponivel ou nao_informado.';

COMMENT ON COLUMN atendimento_exame_complementar.trouxe_exame IS
'Indica se o paciente trouxe exame complementar.';

COMMENT ON COLUMN atendimento_exame_complementar.solicitado_exame IS
'Indica se exame complementar foi solicitado no atendimento.';

COMMENT ON COLUMN atendimento_exame_complementar.resultado_geral IS
'Resultado geral padronizado: normal, alterado, inconclusivo, nao_aplicavel ou nao_informado.';

COMMENT ON COLUMN atendimento_exame_complementar.resumo_resultado IS
'Resumo textual do resultado do exame.';

COMMENT ON COLUMN atendimento_exame_complementar.laudo_texto IS
'Transcrição ou resumo do laudo, quando disponível.';

COMMENT ON COLUMN atendimento_exame_complementar.valor_original_trazido IS
'Valor bruto da planilha relacionado a exame trazido.';

COMMENT ON COLUMN atendimento_exame_complementar.valor_original_solicitado IS
'Valor bruto da planilha relacionado a exame solicitado.';

COMMENT ON COLUMN atendimento_exame_complementar.valor_original_resultado IS
'Valor bruto da planilha relacionado ao resultado do exame.';


CREATE TABLE IF NOT EXISTS exame_complementar_resultado (
    exame_complementar_resultado_id BIGSERIAL PRIMARY KEY,

    atendimento_exame_complementar_id BIGINT NOT NULL,

    nome_campo VARCHAR(120) NOT NULL,
    valor_texto TEXT,
    valor_numerico NUMERIC(14,4),
    unidade VARCHAR(40),
    valor_referencia VARCHAR(120),

    interpretacao VARCHAR(40),

    valor_original TEXT,
    observacoes TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_exame_resultado_exame
        FOREIGN KEY (atendimento_exame_complementar_id)
        REFERENCES atendimento_exame_complementar (atendimento_exame_complementar_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_exame_resultado_interpretacao
        CHECK (
            interpretacao IS NULL
            OR interpretacao IN (
                'normal',
                'alterado',
                'baixo',
                'alto',
                'positivo',
                'negativo',
                'inconclusivo',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE exame_complementar_resultado IS
'Resultados estruturados de exames complementares, permitindo registrar campos específicos de cada exame.';

COMMENT ON COLUMN exame_complementar_resultado.atendimento_exame_complementar_id IS
'Exame complementar ao qual o resultado pertence.';

COMMENT ON COLUMN exame_complementar_resultado.nome_campo IS
'Nome do parâmetro ou campo do exame, por exemplo FEVE, ritmo, creatinina, hemoglobina.';

COMMENT ON COLUMN exame_complementar_resultado.valor_texto IS
'Valor textual do resultado.';

COMMENT ON COLUMN exame_complementar_resultado.valor_numerico IS
'Valor numérico do resultado, quando aplicável.';

COMMENT ON COLUMN exame_complementar_resultado.unidade IS
'Unidade de medida do resultado, quando aplicável.';

COMMENT ON COLUMN exame_complementar_resultado.valor_referencia IS
'Valor de referência informado no exame.';

COMMENT ON COLUMN exame_complementar_resultado.interpretacao IS
'Interpretação padronizada do resultado.';

COMMENT ON COLUMN exame_complementar_resultado.valor_original IS
'Valor bruto vindo da planilha ou do laudo original.';


CREATE INDEX IF NOT EXISTS idx_atendimento_exame_atendimento_id
ON atendimento_exame_complementar (atendimento_id);

CREATE INDEX IF NOT EXISTS idx_atendimento_exame_tipo_id
ON atendimento_exame_complementar (tipo_exame_complementar_id);

CREATE INDEX IF NOT EXISTS idx_atendimento_exame_status
ON atendimento_exame_complementar (status_exame);

CREATE INDEX IF NOT EXISTS idx_atendimento_exame_data_solicitacao
ON atendimento_exame_complementar (data_solicitacao);

CREATE INDEX IF NOT EXISTS idx_atendimento_exame_data_resultado
ON atendimento_exame_complementar (data_resultado);

CREATE INDEX IF NOT EXISTS idx_exame_resultado_exame_id
ON exame_complementar_resultado (atendimento_exame_complementar_id);

CREATE INDEX IF NOT EXISTS idx_exame_resultado_nome_campo
ON exame_complementar_resultado (nome_campo);


INSERT INTO tipo_exame_complementar (
    codigo_exame,
    nome_exame,
    categoria,
    descricao
)
VALUES
    ('eletrocardiograma', 'Eletrocardiograma', 'cardiologico', 'Exame de ECG.'),
    ('ecocardiograma', 'Ecocardiograma', 'cardiologico', 'Exame ecocardiográfico.'),
    ('holter', 'Holter', 'cardiologico', 'Monitorização cardíaca ambulatorial.'),
    ('teste_ergometrico', 'Teste ergométrico', 'funcional', 'Teste funcional cardiovascular.'),
    ('radiografia_torax', 'Radiografia de tórax', 'imagem', 'Exame de imagem do tórax.'),
    ('tomografia', 'Tomografia', 'imagem', 'Exame de tomografia.'),
    ('ressonancia', 'Ressonância magnética', 'imagem', 'Exame de ressonância magnética.'),
    ('hemograma', 'Hemograma', 'laboratorial', 'Exame laboratorial hematológico.'),
    ('creatinina', 'Creatinina', 'laboratorial', 'Exame laboratorial de função renal.'),
    ('outro', 'Outro exame complementar', 'outro', 'Tipo genérico para exame não classificado.'),
    ('nao_informado', 'Não informado', 'nao_informado', 'Tipo usado quando o exame não foi informado.')
ON CONFLICT (codigo_exame) DO NOTHING;