-- Objetivo: alinhar a simulacao virtual a criacao de destino sem coluna em ambos os arquivos.
-- Impacto: somente cria comparacao ausente+ausente para campo de criacao fechado por catalogo e transformacao.
-- Reversao: restaurar a simulacao sem persistencia em migration posterior; sem ativar executor ou HTTP.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE definicao text; trecho text;
BEGIN
  definicao:=pg_get_functiondef(
    'ambulatorio.revisao_simular_proposta(bigint,bigint,bigint,bigint,text,text,jsonb)'::regprocedure);
  trecho:=$old$    SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.chave,x.bloco,x.ocorrencia),'[]'::jsonb)
      INTO comparacao
      FROM ambulatorio.revisao_comparar_brutos_virtuais(base_bruto,bruto) x;$old$;
  IF strpos(definicao,trecho)=0 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='simulador_comparacao_virtual_inesperada';
  END IF;
  definicao:=replace(definicao,trecho,trecho||$patch$
    -- A comparacao virtual nao contem chaves ausentes nos dois arrays. Materializa
    -- somente as ausencias explicitamente planejadas para criacao e mapeadas por
    -- uma regra unica para a coluna ativa do catalogo temporal.
    FOR item IN SELECT value FROM jsonb_array_elements(plano) value
      WHERE value->>'operacao'='criar' LOOP
      IF item ?& ARRAY['campoId','alvoChave','registroId','chaveSemantica',
          'blocoFuncional','ocorrencia','categoria','operacao']
        AND item->'registroId'='null'::jsonb
        AND linha->>'resultado'='autorizar'
        AND item->>'categoria' IN ('nova_visita','atualizacao_consolidada')
        AND COALESCE(item->>'campoId','')~'^[0-9]+$'
        AND COALESCE(item->>'ocorrencia','')~'^[0-9]+$'
        AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(comparacao) x
          WHERE x->>'chave'=item->>'chaveSemantica'
            AND x->>'bloco'=item->>'blocoFuncional'
            AND (x->>'ocorrencia')::bigint=(item->>'ocorrencia')::bigint) THEN
        SELECT * INTO c FROM ambulatorio.auditoria_campo
          WHERE campo_id=(item->>'campoId')::bigint;
        SELECT count(*) INTO regra_count
          FROM jsonb_array_elements(transformacoes->'regras') AS r(value)
          WHERE r.value->>'chave'=item->>'chaveSemantica'
            AND r.value->>'bloco'=item->>'blocoFuncional'
            AND (r.value->>'ocorrencia')::bigint=(item->>'ocorrencia')::bigint
            AND r.value->>'tabela'=c.tabela_destino
            AND r.value->>'coluna'=c.coluna_destino;
        IF c.campo_id IS NOT NULL AND c.captura_desde IS NOT NULL AND regra_count=1 THEN
          comparacao:=comparacao||jsonb_build_array(jsonb_build_object(
            'chave',item->>'chaveSemantica','bloco',item->>'blocoFuncional',
            'ocorrencia',(item->>'ocorrencia')::bigint,
            'estado_base','coluna_ausente','valor_base','null'::jsonb,
            'estado_proposto','coluna_ausente','valor_proposto','null'::jsonb,
            'alterado',false));
        END IF;
      END IF;
    END LOOP;$patch$);
  EXECUTE definicao;
END $$;

COMMIT;
