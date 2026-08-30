\set ON_ERROR_STOP on

DO $$
DECLARE
    v_tabelas integer;
    v_constraints integer;
    v_indices integer;
BEGIN
    SELECT count(*) INTO v_tabelas FROM pg_tables WHERE schemaname = 'ambulatorio';
    SELECT count(*) INTO v_constraints
      FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE n.nspname = 'ambulatorio';
    SELECT count(*) INTO v_indices FROM pg_indexes WHERE schemaname = 'ambulatorio';

    IF v_tabelas <> 38 OR v_constraints <> 155 OR v_indices <> 115 THEN
        RAISE EXCEPTION 'catálogo divergente: tabelas=%, constraints=%, índices=%',
            v_tabelas, v_constraints, v_indices;
    END IF;
    IF (SELECT count(*) FROM ambulatorio.projeto_estudo) <> 10
       OR (SELECT count(*) FROM ambulatorio.tipo_exame_complementar) <> 16
       OR (SELECT count(*) FROM ambulatorio.tipo_encaminhamento) <> 9
       OR (SELECT count(*) FROM ambulatorio.medicamento) <> 8 THEN
        RAISE EXCEPTION 'dados de catálogo divergentes após restore';
    END IF;
    RAISE NOTICE 'OK: 38 tabelas, 155 constraints, 115 índices e catálogos esperados';
END $$;
