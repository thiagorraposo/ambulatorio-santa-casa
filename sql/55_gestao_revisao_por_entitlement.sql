-- Objetivo: separar competência de gestor da revisão clínica e do perfil app.
-- Impacto: entitlement nominal provisionado externamente; sem associação automática.
-- Reversão: remover o uso do helper somente em migration posterior; preservar o
-- histórico de provisionamento/revogação e manter a barreira do executor.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE TABLE importacao_revisao_gestor (
  revisao_gestor_id bigserial PRIMARY KEY,
  usuario_id bigint NOT NULL REFERENCES usuario_aplicacao(usuario_id) ON DELETE RESTRICT,
  provisionado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  provisionado_por_principal text NOT NULL DEFAULT session_user,
  revogado_em timestamptz,
  revogado_por_principal text,
  CHECK (btrim(provisionado_por_principal)<>''),
  CHECK ((revogado_em IS NULL)=(revogado_por_principal IS NULL)),
  CHECK (revogado_por_principal IS NULL OR btrim(revogado_por_principal)<>'')
);
CREATE UNIQUE INDEX uq_importacao_revisao_gestor_ativo
  ON importacao_revisao_gestor(usuario_id) WHERE revogado_em IS NULL;
COMMENT ON TABLE importacao_revisao_gestor IS
  'Competencia de gestão provisionada fora da API; não implica perfil administração nem autorização clínica por fonte.';

CREATE FUNCTION revisao_proteger_gestor_provisionado() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_gestor_historico_imutavel';
  END IF;
  IF TG_OP='UPDATE'
    AND OLD.revogado_em IS NULL AND NEW.revogado_em IS NOT NULL
    AND (to_jsonb(NEW)-ARRAY['revogado_em','revogado_por_principal'])
      =(to_jsonb(OLD)-ARRAY['revogado_em','revogado_por_principal']) THEN
    NEW.revogado_em:=clock_timestamp();
    RETURN NEW;
  END IF;
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_gestor_historico_imutavel';
END $$;
CREATE TRIGGER importacao_revisao_gestor_imutavel
  BEFORE UPDATE OR DELETE ON importacao_revisao_gestor
  FOR EACH ROW EXECUTE FUNCTION revisao_proteger_gestor_provisionado();
CREATE TRIGGER importacao_revisao_gestor_sem_truncate
  BEFORE TRUNCATE ON importacao_revisao_gestor
  FOR EACH STATEMENT EXECUTE FUNCTION revisao_proteger_gestor_provisionado();

REVOKE ALL ON importacao_revisao_gestor,importacao_revisao_gestor_revisao_gestor_id_seq
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,
    ambulatorio_servico_autenticado,ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT SELECT ON importacao_revisao_gestor TO ambulatorio_revisao_owner;

CREATE FUNCTION revisao_ator_gestor_autenticado() RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint;
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_gestor','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_gestao_nao_autorizada';
  END IF;
  ator:=ambulatorio.revisao_ator_autenticado();
  IF NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_gestor g
      JOIN ambulatorio.usuario_aplicacao u USING(usuario_id)
      WHERE g.usuario_id=ator AND g.revogado_em IS NULL AND u.ativo) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_gestao_nao_autorizada';
  END IF;
  RETURN ator;
END $$;
ALTER FUNCTION revisao_ator_gestor_autenticado() OWNER TO ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_ator_gestor_autenticado() FROM PUBLIC,
  ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;

-- Mantém as funções públicas atuais e adiciona verificação por identidade ativa;
-- ser membro do papel técnico do pool, por si só, não confere competência.
DO $$
DECLARE alvo text; definicao text; original text; funcao regprocedure;
BEGIN
  FOREACH alvo IN ARRAY ARRAY[
    'revisao_registrar_fonte(text,bigint)',
    'revisao_conceder_autorizacao(bigint,bigint,timestamp with time zone)',
    'revisao_revogar_autorizacao(bigint)'
  ] LOOP
    funcao:=to_regprocedure('ambulatorio.'||alvo);
    IF funcao IS NULL THEN RAISE EXCEPTION 'Função de gestão ausente: %',alvo; END IF;
    definicao:=pg_get_functiondef(funcao);
    original:='ator:=ambulatorio.revisao_ator_autenticado();';
    IF strpos(definicao,original)=0 THEN RAISE EXCEPTION 'Contrato da função inesperado: %',alvo; END IF;
    definicao:=replace(definicao,original,'ator:=ambulatorio.revisao_ator_gestor_autenticado();');
    EXECUTE definicao;
  END LOOP;
END $$;

COMMIT;
