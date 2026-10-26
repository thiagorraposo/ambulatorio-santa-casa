-- Objetivo: correlacionar uma tentativa HTTP a seu recibo na mesma transação clínica.
-- Impacto: ledger técnico sem corpo clínico, token ou reexecução de comando.
-- Reversão: desativar o protocolo em nova migration; preservar recibos existentes.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE TABLE operacao_clinica (
  operacao_id uuid PRIMARY KEY,
  usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
  paciente_id bigint REFERENCES paciente ON DELETE RESTRICT,
  metodo text NOT NULL CHECK (metodo IN ('POST','PATCH','PUT')),
  caminho text NOT NULL CHECK (length(caminho) BETWEEN 1 AND 220),
  corpo_hash text NOT NULL CHECK (corpo_hash ~ '^[0-9a-f]{64}$'),
  estado text NOT NULL DEFAULT 'registrada'
    CHECK (estado IN ('registrada','em_curso','confirmada','nao_aplicada')),
  claim_id uuid,
  resultado jsonb,
  motivo text CHECK (motivo IN ('falha','expirada','encerrada')),
  criada_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  expira_em timestamptz NOT NULL DEFAULT clock_timestamp() + interval '120 seconds',
  finalizada_em timestamptz,
  CHECK (expira_em > criada_em),
  CHECK ((estado='confirmada') = (resultado IS NOT NULL)),
  CHECK (resultado IS NULL OR jsonb_typeof(resultado)='object'),
  CHECK ((estado='nao_aplicada') = (motivo IS NOT NULL)),
  CHECK ((estado IN ('confirmada','nao_aplicada')) = (finalizada_em IS NOT NULL)),
  CHECK (estado<>'em_curso' OR claim_id IS NOT NULL)
);
COMMENT ON TABLE operacao_clinica IS
'Uma tentativa por UUID/ator/método/caminho/hash. Recibo atômico de IDs; consulta não reexecuta clínica. Sem purge automático.';
CREATE INDEX operacao_clinica_usuario_criada_idx ON operacao_clinica(usuario_id,criada_em DESC);

-- Não herdar concessões destinadas ao importador por ALTER DEFAULT PRIVILEGES.
REVOKE ALL ON operacao_clinica FROM PUBLIC,ambulatorio_importador,
  ambulatorio_servico_autenticado,ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT SELECT,INSERT,UPDATE ON operacao_clinica TO ambulatorio_aplicacao;

COMMIT;
