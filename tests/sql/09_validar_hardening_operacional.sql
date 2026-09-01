\set ON_ERROR_STOP on

BEGIN;
SET search_path TO ambulatorio, public;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ambulatorio_importador' AND NOT rolcanlogin) THEN
        RAISE EXCEPTION 'role de importacao ausente ou com login';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ambulatorio_aplicacao' AND NOT rolcanlogin) THEN
        RAISE EXCEPTION 'role de aplicacao ausente ou com login';
    END IF;
    IF has_schema_privilege('ambulatorio_importador','ambulatorio','CREATE') THEN
        RAISE EXCEPTION 'importador pode criar objetos no schema';
    END IF;
    IF has_table_privilege('ambulatorio_aplicacao','ambulatorio.importacao_lote','SELECT')
       OR has_table_privilege('ambulatorio_aplicacao','ambulatorio.importacao_linha','SELECT')
       OR has_table_privilege('ambulatorio_aplicacao','ambulatorio.importacao_registro','SELECT') THEN
        RAISE EXCEPTION 'aplicacao pode ler estruturas internas de proveniencia';
    END IF;
    IF has_schema_privilege('ambulatorio_aplicacao','ambulatorio','CREATE') THEN
        RAISE EXCEPTION 'aplicacao pode criar objetos no schema';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'ambulatorio'
          AND pg_get_userbyid(c.relowner) = 'ambulatorio_aplicacao'
    ) THEN
        RAISE EXCEPTION 'aplicacao possui objetos no schema';
    END IF;
    IF pg_has_role('ambulatorio_aplicacao','ambulatorio_importador','SET')
       OR pg_has_role('ambulatorio_aplicacao',current_user,'SET') THEN
        RAISE EXCEPTION 'aplicacao pode elevar privilegios para importador ou owner';
    END IF;
    IF has_table_privilege('ambulatorio_importador','ambulatorio.paciente','DELETE') THEN
        RAISE EXCEPTION 'importador pode excluir paciente';
    END IF;
    IF NOT has_table_privilege('ambulatorio_importador','ambulatorio.importacao_linha','INSERT')
       OR NOT has_table_privilege('ambulatorio_importador','ambulatorio.paciente','UPDATE') THEN
        RAISE EXCEPTION 'importador sem DML necessario';
    END IF;
    RAISE NOTICE 'OK: roles sem login, sem ownership/DDL/delete/escalacao e proveniencia isolada validadas';
END
$$;

SET LOCAL ROLE ambulatorio_importador;
INSERT INTO importacao_lote (
    codigo_lote, hash_arquivo_sha256, layout_versao, manifesto_sha256,
    importador_versao, revisao_git
) VALUES (
    'hardening-role-' || txid_current(), repeat('a',64), 'layout_teste',
    repeat('b',64), '1.1.0', repeat('c',40)
);
RESET ROLE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM importacao_lote WHERE codigo_lote LIKE 'hardening-role-%') THEN
        RAISE EXCEPTION 'role importadora nao inseriu lote';
    END IF;
    RAISE NOTICE 'OK: DML minimo da role importadora validado';
END
$$;

ROLLBACK;
