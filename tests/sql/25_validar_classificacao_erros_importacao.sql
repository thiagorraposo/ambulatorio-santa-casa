\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,mensagem_erro)
VALUES('teste-classificacao-erros','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'teste_sintetico','falhou','falha operacional com VALOR_CLINICO_SINTETICO');
INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha,mensagem_processamento)
SELECT importacao_lote_id,'Sintetica',1,2,'[{"valor":"SEGREDO_CLINICO_SINTETICO"}]','rejeitada',
  'diagnostico_chagas.resultado: domínio inválido: VALOR_CLINICO_SINTETICO'
FROM importacao_lote WHERE codigo_lote='teste-classificacao-erros';
INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha,mensagem_processamento)
SELECT importacao_lote_id,'Sintetica',1,3,'[]','importada_com_pendencia',
  'campos preservados apenas em dados_brutos: diagnostico_chagas.observacoes'
FROM importacao_lote WHERE codigo_lote='teste-classificacao-erros';
INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha,mensagem_processamento)
SELECT importacao_lote_id,'Sintetica',1,4,'[]','importada','linha importada'
FROM importacao_lote WHERE codigo_lote='teste-classificacao-erros';
INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha,mensagem_processamento)
SELECT importacao_lote_id,'Sintetica',1,5,'[]','rejeitada',
  'identidade: múltiplos pacientes candidatos; SEGREDO_CLINICO_SINTETICO'
FROM importacao_lote WHERE codigo_lote='teste-classificacao-erros';

SET LOCAL ROLE ambulatorio_aplicacao;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM importacao_lote_consulta WHERE codigo_lote='teste-classificacao-erros'
      AND codigo_erro='falha_operacional' AND possui_erro) THEN
    RAISE EXCEPTION 'classificacao sanitizada do lote ausente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha_consulta li JOIN importacao_lote_consulta l USING(importacao_lote_id)
      WHERE l.codigo_lote='teste-classificacao-erros' AND li.numero_linha=2
      AND li.codigo_erro='dominio_invalido' AND li.possui_erro) THEN
    RAISE EXCEPTION 'classificacao sanitizada da rejeicao ausente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha_consulta li JOIN importacao_lote_consulta l USING(importacao_lote_id)
      WHERE l.codigo_lote='teste-classificacao-erros' AND li.numero_linha=3
      AND li.codigo_erro='pendencia_nao_promovida' AND li.possui_erro) THEN
    RAISE EXCEPTION 'classificacao da pendencia ausente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha_consulta li JOIN importacao_lote_consulta l USING(importacao_lote_id)
      WHERE l.codigo_lote='teste-classificacao-erros' AND li.numero_linha=4
      AND li.codigo_erro IS NULL AND NOT li.possui_erro) THEN
    RAISE EXCEPTION 'linha importada sem erro foi marcada incorretamente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha_consulta li JOIN importacao_lote_consulta l USING(importacao_lote_id)
      WHERE l.codigo_lote='teste-classificacao-erros' AND li.numero_linha=5
      AND li.codigo_erro='identidade_ambigua' AND li.possui_erro) THEN
    RAISE EXCEPTION 'classificacao de identidade ambigua não reconheceu texto variável';
  END IF;
  IF EXISTS (SELECT 1 FROM importacao_lote_consulta WHERE codigo_lote='teste-classificacao-erros'
      AND to_jsonb(importacao_lote_consulta)::text LIKE '%VALOR_CLINICO_SINTETICO%') OR
     EXISTS (SELECT 1 FROM importacao_linha_consulta li JOIN importacao_lote_consulta l USING(importacao_lote_id)
      WHERE l.codigo_lote='teste-classificacao-erros'
      AND to_jsonb(li)::text LIKE '%SEGREDO_CLINICO_SINTETICO%') THEN
    RAISE EXCEPTION 'view sanitizada expôs conteúdo de mensagem ou dado bruto';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
\echo 'OK: códigos de erro sanitizados reconhecem motivos com sufixo variável sem expô-los'
