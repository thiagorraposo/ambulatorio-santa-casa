-- R6: ledger técnico mínimo, estados consistentes e privilégios separados.
-- Dados sintéticos isolados na transação; não executa qualquer comando clínico.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE
  ator bigint;
  intencao uuid := md5(clock_timestamp()::text || random()::text)::uuid;
  campos text[];
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil)
    VALUES('Operação SQL sintética','operacao-sql-'||intencao||'@example.invalid',
      '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao')
    RETURNING usuario_id INTO ator;
  INSERT INTO operacao_clinica(operacao_id,usuario_id,metodo,caminho,corpo_hash)
    VALUES(intencao,ator,'POST','/v1/pacientes',repeat('a',64));
  IF NOT EXISTS(SELECT 1 FROM operacao_clinica WHERE operacao_id=intencao AND estado='registrada'
      AND resultado IS NULL AND motivo IS NULL AND claim_id IS NULL AND expira_em>criada_em) THEN
    RAISE EXCEPTION 'Intenção não inicia no estado/prazo esperado';
  END IF;
  BEGIN
    UPDATE operacao_clinica SET estado='em_curso' WHERE operacao_id=intencao;
    RAISE EXCEPTION 'Tentativa em curso sem claim aceita';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE operacao_clinica SET estado='em_curso',claim_id=md5(random()::text)::uuid WHERE operacao_id=intencao;
  BEGIN
    UPDATE operacao_clinica SET estado='confirmada',resultado='{"pacienteId":"1"}'::jsonb WHERE operacao_id=intencao;
    RAISE EXCEPTION 'Recibo sem instante de finalização aceito';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE operacao_clinica SET estado='confirmada',resultado='{"pacienteId":"1"}'::jsonb,
    finalizada_em=clock_timestamp() WHERE operacao_id=intencao;
  BEGIN
    UPDATE operacao_clinica SET estado='nao_aplicada' WHERE operacao_id=intencao;
    RAISE EXCEPTION 'Não aplicação com recibo confirmado aceita';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE operacao_clinica SET corpo_hash='hash_invalido' WHERE operacao_id=intencao;
    RAISE EXCEPTION 'Hash não SHA-256 aceito';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  SELECT array_agg(column_name::text ORDER BY ordinal_position) INTO campos
    FROM information_schema.columns WHERE table_schema='ambulatorio' AND table_name='operacao_clinica';
  IF campos && ARRAY['corpo','payload','token','senha','nome','observacoes'] THEN
    RAISE EXCEPTION 'Ledger passou a armazenar conteúdo clínico/credencial';
  END IF;
  IF NOT has_table_privilege('ambulatorio_aplicacao','ambulatorio.operacao_clinica','SELECT,INSERT,UPDATE')
      OR has_table_privilege('ambulatorio_aplicacao','ambulatorio.operacao_clinica','DELETE')
      OR has_table_privilege('ambulatorio_importador','ambulatorio.operacao_clinica','SELECT,INSERT,UPDATE,DELETE')
      OR has_table_privilege('ambulatorio_servico_autenticado','ambulatorio.operacao_clinica','SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'Privilégios do ledger divergentes da fronteira da aplicação';
  END IF;
  RAISE NOTICE 'OK: correlação clínica valida prazo, claim, recibo, estado e privilégios sem persistir dados sintéticos';
END $$;

ROLLBACK;
