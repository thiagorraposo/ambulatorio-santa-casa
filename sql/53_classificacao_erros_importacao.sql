-- Objetivo: disponibilizar códigos estáveis para acompanhamento de problemas
-- de importação, sem expor mensagens livres, valores clínicos ou dados brutos.
-- Impacto: substitui as views de consulta por versões compatíveis que adicionam
-- somente códigos fechados de erro/ocorrência; escrita e permissões não mudam.
-- Reversão: uma migration posterior pode restaurar as definições das views de
-- sql/27_consulta_lotes_importacao.sql; nenhuma tabela ou dado é removido.
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
       (SELECT count(*) FROM importacao_linha i WHERE i.importacao_lote_id=l.importacao_lote_id AND i.status_linha='rejeitada') AS linhas_rejeitadas,
       CASE WHEN l.status_lote='falhou' AND l.mensagem_erro IS NOT NULL
         THEN 'falha_operacional'::text ELSE NULL::text END AS codigo_erro
FROM importacao_lote l;

CREATE OR REPLACE VIEW importacao_linha_consulta AS
SELECT i.importacao_linha_id,
       i.importacao_lote_id,
       i.aba_nome_original,
       i.aba_ordem,
       i.numero_linha,
       i.status_linha,
       (i.status_linha IN ('rejeitada','importada_com_pendencia')
          OR (i.status_linha='pendente' AND i.mensagem_processamento IS NOT NULL)) AS possui_erro,
       i.criado_em,
       i.atualizado_em,
       CASE
         WHEN i.status_linha='rejeitada' THEN
           CASE
             WHEN i.mensagem_processamento LIKE '%valor obrigatório ausente%' THEN 'campo_obrigatorio_ausente'
             WHEN i.mensagem_processamento LIKE '%data inválida%' THEN 'data_invalida'
             WHEN i.mensagem_processamento LIKE '%booleano inválido%' THEN 'booleano_invalido'
             WHEN i.mensagem_processamento LIKE '%número inválido%' THEN 'numero_invalido'
             WHEN i.mensagem_processamento LIKE '%ano inválido%' THEN 'ano_invalido'
             WHEN i.mensagem_processamento LIKE '%duração ambígua%' THEN 'duracao_ambigua'
             WHEN i.mensagem_processamento LIKE '%domínio inválido%' THEN 'dominio_invalido'
             WHEN i.mensagem_processamento LIKE '%múltiplos pacientes candidatos%' THEN 'identidade_ambigua'
             WHEN i.mensagem_processamento LIKE '%conflitante%' OR i.mensagem_processamento LIKE '%conflito%' THEN 'dados_conflitantes'
             WHEN i.mensagem_processamento LIKE '%catálogo%inexistente%' OR i.mensagem_processamento LIKE '%catálogo não resolvido%' THEN 'catalogo_indisponivel'
             WHEN i.mensagem_processamento LIKE '%proveniência ambígua%' THEN 'proveniencia_ambigua'
             WHEN i.mensagem_processamento LIKE '%divergência%' OR i.mensagem_processamento LIKE '%divergente%' THEN 'dados_divergentes'
             WHEN i.mensagem_processamento LIKE '%ciclo na cadeia%' THEN 'cadeia_reprocessamento_invalida'
             ELSE 'linha_rejeitada'
           END
         WHEN i.status_linha='importada_com_pendencia' THEN 'pendencia_nao_promovida'
         WHEN i.status_linha='pendente' AND i.mensagem_processamento IS NOT NULL THEN 'falha_operacional'
         ELSE NULL
       END AS codigo_erro
FROM importacao_linha i;

COMMENT ON VIEW importacao_lote_consulta IS
'Acompanhamento sanitizado de lotes; inclui código fechado de falha, sem hash, mensagens ou dados brutos.';
COMMENT ON VIEW importacao_linha_consulta IS
'Acompanhamento sanitizado das linhas; códigos fechados não revelam mensagens, valores clínicos ou dados brutos.';
REVOKE ALL ON importacao_lote_consulta,importacao_linha_consulta FROM PUBLIC,ambulatorio_importador;
GRANT SELECT ON importacao_lote_consulta,importacao_linha_consulta TO ambulatorio_aplicacao;
COMMIT;
