-- F05: extensoes posteriores ao armazenamento inicial mantem a fronteira de acesso.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$
DECLARE objeto text; papel text; coluna record; sequencia text; rotina text;
BEGIN
  FOREACH objeto IN ARRAY ARRAY[
    'importacao_fonte', 'importacao_revisao', 'importacao_revisao_autorizacao',
    'importacao_revisao_decisao', 'importacao_revisao_campo',
    'importacao_revisao_aplicacao', 'importacao_revisao_alvo',
    'importacao_revisao_gestor',
    'auditoria_campo', 'auditoria_campo_evento',
    'auditoria_contexto_transacao', 'revisao_artefato',
    'importacao_revisao_preparacao', 'importacao_revisao_encerramento',
    'importacao_revisao_recebimento'
  ] LOOP
    IF to_regclass('ambulatorio.' || objeto) IS NULL THEN
      RAISE EXCEPTION 'Relacao restrita ausente: %', objeto;
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_class c, LATERAL aclexplode(c.relacl) acl
      WHERE c.oid=to_regclass('ambulatorio.' || objeto) AND acl.grantee=0
    ) THEN
      RAISE EXCEPTION 'PUBLIC recebeu acesso a %', objeto;
    END IF;
    FOREACH papel IN ARRAY ARRAY[
      'ambulatorio_importador', 'ambulatorio_aplicacao',
      'ambulatorio_servico_autenticado', 'ambulatorio_revisao_servico',
      'ambulatorio_revisao_gestor'
    ] LOOP
      IF has_table_privilege(papel, 'ambulatorio.' || objeto,
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
        RAISE EXCEPTION 'Acesso direto indevido: % em %', papel, objeto;
      END IF;
    END LOOP;
    FOR coluna IN
      SELECT attname FROM pg_attribute
      WHERE attrelid=to_regclass('ambulatorio.' || objeto)
        AND attnum>0 AND NOT attisdropped
    LOOP
      sequencia:=pg_get_serial_sequence('ambulatorio.' || objeto, coluna.attname);
      IF sequencia IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM pg_class c, LATERAL aclexplode(c.relacl) acl
          WHERE c.oid=sequencia::regclass AND acl.grantee=0
        ) THEN
          RAISE EXCEPTION 'PUBLIC recebeu acesso a sequencia %', sequencia;
        END IF;
        FOREACH papel IN ARRAY ARRAY[
          'ambulatorio_importador','ambulatorio_aplicacao',
          'ambulatorio_servico_autenticado','ambulatorio_revisao_servico',
          'ambulatorio_revisao_gestor'
        ] LOOP
          IF has_sequence_privilege(papel,sequencia,'USAGE,SELECT,UPDATE') THEN
            RAISE EXCEPTION 'Acesso indevido: % em sequencia %', papel, sequencia;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  FOREACH rotina IN ARRAY ARRAY[
    'revisao_aplicar_decisao_interna(bigint,bigint)',
    'revisao_aplicar_aprovada(bigint,bigint)',
    'revisao_finalizar_aprovada(bigint,bigint,text)',
    'revisao_diagnosticar_falha(bigint,bigint,text)',
    'revisao_terminar_interna(bigint,bigint,text)',
    'revisao_resolver_alvos(bigint)',
    'revisao_registrar_falha_interna(bigint,bigint,text)',
    'revisao_conferir_sucessao_com_efeito(bigint)',
    'revisao_conferir_criacao(bigint)',
    'revisao_conferir_criacao_base(bigint)',
    'revisao_comparar_brutos_virtuais(jsonb,jsonb)'
  ] LOOP
    IF to_regprocedure('ambulatorio.' || rotina) IS NULL THEN
      RAISE EXCEPTION 'Rotina privada ausente: %', rotina;
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_proc p, LATERAL aclexplode(p.proacl) acl
      WHERE p.oid=to_regprocedure('ambulatorio.' || rotina) AND acl.grantee=0
    ) THEN
      RAISE EXCEPTION 'PUBLIC recebeu EXECUTE em %', rotina;
    END IF;
    FOREACH papel IN ARRAY ARRAY[
      'ambulatorio_importador', 'ambulatorio_aplicacao',
      'ambulatorio_servico_autenticado', 'ambulatorio_revisao_servico',
      'ambulatorio_revisao_gestor'
    ] LOOP
      IF has_function_privilege(papel,'ambulatorio.' || rotina,'EXECUTE') THEN
        RAISE EXCEPTION 'EXECUTE indevido: % em %', papel, rotina;
      END IF;
    END LOOP;
  END LOOP;
  IF NOT has_function_privilege('ambulatorio_revisao_servico',
      'ambulatorio.revisao_simular_proposta(bigint,bigint,bigint,bigint,text,text,jsonb)','EXECUTE')
    OR has_function_privilege('ambulatorio_importador',
      'ambulatorio.revisao_simular_proposta(bigint,bigint,bigint,bigint,text,text,jsonb)','EXECUTE')
    OR has_function_privilege('ambulatorio_aplicacao',
      'ambulatorio.revisao_simular_proposta(bigint,bigint,bigint,bigint,text,text,jsonb)','EXECUTE')
    OR has_function_privilege('ambulatorio_revisao_gestor',
      'ambulatorio.revisao_simular_proposta(bigint,bigint,bigint,bigint,text,text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Fronteira de simulacao da proposta incorreta';
  END IF;
  IF has_column_privilege('ambulatorio_importador',
      'ambulatorio.usuario_aplicacao','senha_hash','SELECT') THEN
    RAISE EXCEPTION 'Importador recebeu acesso a credencial';
  END IF;
  RAISE NOTICE 'OK: relacoes, sequencias e rotinas temporais privadas isoladas';
END $$;

ROLLBACK;
