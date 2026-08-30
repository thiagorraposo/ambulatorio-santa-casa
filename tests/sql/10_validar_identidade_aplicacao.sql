\set ON_ERROR_STOP on

BEGIN;
SET search_path TO ambulatorio, public;

INSERT INTO usuario_aplicacao (nome, login, senha_hash, perfil)
VALUES ('Usuario Sintetico SQL', 'sql.consulta@example.invalid', '$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'consulta');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM usuario_aplicacao
        WHERE login = 'sql.consulta@example.invalid' AND ativo AND perfil = 'consulta'
          AND senha_hash <> 'senha-sintetica'
    ) THEN
        RAISE EXCEPTION 'identidade sintetica nao foi armazenada corretamente';
    END IF;
    IF has_table_privilege('ambulatorio_aplicacao', 'ambulatorio.usuario_aplicacao', 'INSERT')
       OR has_table_privilege('ambulatorio_aplicacao', 'ambulatorio.usuario_aplicacao', 'UPDATE')
       OR has_table_privilege('ambulatorio_aplicacao', 'ambulatorio.usuario_aplicacao', 'DELETE') THEN
        RAISE EXCEPTION 'role operacional recebeu escrita sobre identidades';
    END IF;
    IF NOT has_table_privilege('ambulatorio_aplicacao', 'ambulatorio.usuario_aplicacao', 'SELECT') THEN
        RAISE EXCEPTION 'role operacional nao consegue autenticar identidades';
    END IF;
    IF has_table_privilege('ambulatorio_importador', 'ambulatorio.usuario_aplicacao', 'SELECT')
       OR has_table_privilege('ambulatorio_importador', 'ambulatorio.usuario_aplicacao', 'INSERT')
       OR has_table_privilege('ambulatorio_importador', 'ambulatorio.usuario_aplicacao', 'UPDATE') THEN
        RAISE EXCEPTION 'importador recebeu acesso a identidades funcionais';
    END IF;
    RAISE NOTICE 'OK: identidade funcional, hash e privilegios minimos validados';
END
$$;

DO $$
BEGIN
    BEGIN
        INSERT INTO usuario_aplicacao (nome, login, senha_hash, perfil)
        VALUES ('Invalido', 'sql.invalido@example.invalid', 'senha-em-texto-puro', 'consulta');
        RAISE EXCEPTION 'senha em texto puro foi aceita';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
END
$$;

ROLLBACK;
