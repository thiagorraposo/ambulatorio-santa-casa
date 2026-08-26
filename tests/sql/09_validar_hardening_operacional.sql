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
    IF has_table_privilege('ambulatorio_aplicacao','ambulatorio.importacao_linha','SELECT') THEN
        RAISE EXCEPTION 'aplicacao pode ler conteudo bruto da importacao';
    END IF;
    IF has_table_privilege('ambulatorio_importador','ambulatorio.paciente','DELETE') THEN
        RAISE EXCEPTION 'importador pode excluir paciente';
    END IF;
    IF NOT has_table_privilege('ambulatorio_importador','ambulatorio.importacao_linha','INSERT')
       OR NOT has_table_privilege('ambulatorio_importador','ambulatorio.paciente','UPDATE') THEN
        RAISE EXCEPTION 'importador sem DML necessario';
    END IF;
    RAISE NOTICE 'OK: roles sem login, sem ownership/DDL/delete validadas';
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
