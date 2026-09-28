\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$
DECLARE lote bigint; total bigint; bruto boolean;
BEGIN
  INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
    VALUES('lote-consulta-sintetico',repeat('a',64),'v1','concluido_com_pendencias')
    RETURNING importacao_lote_id INTO lote;
  INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha)
    VALUES(lote,'Aba sintética',1,2,'[{"valor":"não expor"}]'::jsonb,'importada_com_pendencia');
  SELECT total_linhas INTO total FROM importacao_lote_consulta WHERE importacao_lote_id=lote;
  IF total<>1 THEN RAISE EXCEPTION 'Contagem de linhas incorreta'; END IF;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='ambulatorio'
            AND table_name='importacao_lote_consulta' AND column_name IN ('hash_arquivo_sha256','mensagem_erro')) THEN
    RAISE EXCEPTION 'View expõe proveniência sensível';
  END IF;
  SET LOCAL ROLE ambulatorio_aplicacao;
  SELECT EXISTS(SELECT 1 FROM importacao_lote_consulta WHERE importacao_lote_id=lote) INTO bruto;
  IF NOT bruto THEN RAISE EXCEPTION 'Aplicação não consulta lote sanitizado'; END IF;
  BEGIN
    INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao)
      VALUES('lote-negado-sintetico',repeat('b',64),'v1');
    RAISE EXCEPTION 'Aplicação conseguiu escrever lote';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'OK: consulta de lotes sanitizada e somente leitura';
END $$;
ROLLBACK;
