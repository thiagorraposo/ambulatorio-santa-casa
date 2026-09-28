-- Objetivo: disponibilizar acompanhamento operacional sem expor proveniência bruta.
-- A aplicação consulta somente contagens e estados sanitizados; escrita permanece
-- exclusiva do importador e a revisão temporal continua desabilitada.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE OR REPLACE VIEW importacao_lote_consulta AS
SELECT l.importacao_lote_id,
       l.codigo_lote,
       l.layout_versao,
       l.status_lote,
       l.lote_reprocessado_de_id,
       l.iniciado_em,
       l.finalizado_em,
       l.criado_em,
       l.atualizado_em,
       (l.mensagem_erro IS NOT NULL) AS possui_erro,
       (SELECT count(*) FROM importacao_linha i WHERE i.importacao_lote_id=l.importacao_lote_id) AS total_linhas,
       (SELECT count(*) FROM importacao_linha i WHERE i.importacao_lote_id=l.importacao_lote_id AND i.status_linha='importada') AS linhas_importadas,
       (SELECT count(*) FROM importacao_linha i WHERE i.importacao_lote_id=l.importacao_lote_id AND i.status_linha='importada_com_pendencia') AS linhas_com_pendencia,
       (SELECT count(*) FROM importacao_linha i WHERE i.importacao_lote_id=l.importacao_lote_id AND i.status_linha='rejeitada') AS linhas_rejeitadas
FROM importacao_lote l;

CREATE OR REPLACE VIEW importacao_linha_consulta AS
SELECT i.importacao_linha_id,
       i.importacao_lote_id,
       i.aba_nome_original,
       i.aba_ordem,
       i.numero_linha,
       i.status_linha,
       (i.mensagem_processamento IS NOT NULL) AS possui_erro,
       i.criado_em,
       i.atualizado_em
FROM importacao_linha i;

COMMENT ON VIEW importacao_lote_consulta IS
'Acompanhamento sanitizado de lotes para a aplicação; não expõe hash, bruto ou mensagens clínicas.';
COMMENT ON VIEW importacao_linha_consulta IS
'Estado operacional sanitizado das linhas; não expõe dados brutos nem mensagem de processamento.';
REVOKE ALL ON importacao_lote_consulta,importacao_linha_consulta FROM PUBLIC,ambulatorio_importador;
GRANT SELECT ON importacao_lote_consulta,importacao_linha_consulta TO ambulatorio_aplicacao;
COMMIT;
