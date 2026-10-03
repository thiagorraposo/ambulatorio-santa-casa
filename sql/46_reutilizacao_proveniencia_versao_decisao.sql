-- Objetivo: reutilizar o vinculo unico da linha em uma versao sucessora aplicada.
-- Impacto: acao original da proveniencia permanece imutavel; cada alvo registra
-- a acao de sua propria aplicacao, com prova de sucesso na cadeia predecessora.
-- Reversao: bloquear novas versoes aplicaveis; nao remover vinculos ou sucessos.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$ DECLARE definicao text; trecho text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_aplicar_decisao_interna(bigint,bigint)'::regprocedure);
  trecho:=$old$      VALUES(d.linha_revisada_id,alvo.tabela_destino,alvo.registro_id,acao_alvo) RETURNING importacao_registro_id INTO proveniencia;$old$;
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Vinculo de versao inesperado'; END IF;
  EXECUTE replace(definicao,trecho,$patch$
      VALUES(d.linha_revisada_id,alvo.tabela_destino,alvo.registro_id,acao_alvo)
      ON CONFLICT (importacao_linha_id,schema_destino,tabela_destino,registro_id) DO NOTHING
      RETURNING importacao_registro_id INTO proveniencia;
    IF proveniencia IS NULL THEN
      SELECT p.importacao_registro_id INTO proveniencia FROM ambulatorio.importacao_registro p
        WHERE p.importacao_linha_id=d.linha_revisada_id AND p.schema_destino='ambulatorio'
          AND p.tabela_destino=alvo.tabela_destino AND p.registro_id=alvo.registro_id
          AND EXISTS(SELECT 1 FROM ambulatorio.revisao_alvo_predecessor(decisao,alvo.alvo_chave,alvo.tabela_destino) anterior
            JOIN ambulatorio.importacao_revisao_alvo a ON a.aplicacao_id=anterior.aplicacao_anterior
              AND a.alvo_chave=alvo.alvo_chave AND a.importacao_registro_id=p.importacao_registro_id
            WHERE anterior.registro_efetivo=alvo.registro_id);
      IF proveniencia IS NULL THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_vinculo_sem_predecessor'; END IF;
    END IF;$patch$);
  definicao:=pg_get_functiondef('ambulatorio.revisao_conferir_sucesso(bigint)'::regprocedure);
  trecho:='AND p.registro_id=a.registro_id AND p.acao=a.acao';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Prova de proveniencia inesperada'; END IF;
  EXECUTE replace(definicao,trecho,$patch$AND p.registro_id=a.registro_id AND (p.acao=a.acao OR EXISTS(
            SELECT 1 FROM ambulatorio.revisao_alvo_predecessor(d.decisao_id,v.alvo_chave,v.tabela_destino) anterior
            JOIN ambulatorio.importacao_revisao_alvo previa ON previa.aplicacao_id=anterior.aplicacao_anterior
              AND previa.alvo_chave=v.alvo_chave AND previa.importacao_registro_id=p.importacao_registro_id
            WHERE anterior.registro_efetivo=v.registro_efetivo))$patch$);
END $$;
COMMIT;
