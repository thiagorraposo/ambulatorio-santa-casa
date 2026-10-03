-- F01-F07/F16: armazenamento fechado; captura e executor tem suites proprias.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE FUNCTION pg_temp.exigir_falha(comando text, estado text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        EXECUTE comando;
        SET CONSTRAINTS ALL IMMEDIATE;
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = estado THEN RETURN; END IF;
        RAISE;
    END;
    RAISE EXCEPTION 'Operacao invalida foi aceita: %', comando;
END $$;

CREATE FUNCTION pg_temp.revisao_storage(f bigint, b bigint, n bigint, hb text, hn text,
    lb text DEFAULT 'v1') RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE id bigint;
BEGIN
    INSERT INTO importacao_revisao(fonte_id,lote_base_id,hash_base,layout_base,lote_revisado_id,
      hash_revisado,layout_revisado,versao_fonte_esperada,contrato_versao,manifesto_base_sha256,
      manifesto_revisado_sha256,transformacoes_versao,importador_versao,revisao_git)
      VALUES(f,b,hb,lb,n,hn,'v1',0,'ADR-022',repeat('d',64),repeat('d',64),'v1','1.7.0','abcdef0')
      RETURNING revisao_id INTO id;
    RETURN id;
END $$;

-- Permite verificar a integridade diferida de um plano completo, sem omitir
-- a constraint ao terminar o teste com ROLLBACK.
CREATE FUNCTION pg_temp.clonar_plano_storage(d bigint, linha bigint, pessoa bigint,
    atendimento bigint, autorizacao bigint, ator bigint) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE id bigint;
BEGIN
    SET CONSTRAINTS ALL DEFERRED;
    INSERT INTO importacao_revisao_decisao(revisao_id,linha_revisada_id,linha_base_id,paciente_id,
      atendimento_base_id,versao_decisao,resultado,autorizacao_id,decidida_por_usuario_id,justificativa,plano_sha256)
      SELECT revisao_id,linha,linha_base_id,pessoa,atendimento,1,'autorizar',autorizacao,ator,
        'Plano sintetico de integridade',plano_sha256 FROM importacao_revisao_decisao WHERE decisao_id=d
      RETURNING decisao_id INTO id;
    INSERT INTO importacao_revisao_campo(decisao_id,campo_id,alvo_chave,registro_id,chave_semantica,
      bloco_funcional,ocorrencia,categoria,operacao,base,atual_avaliado,proposto,cobertura_historica,ultimo_evento_avaliado_id)
      SELECT id,campo_id,alvo_chave,registro_id,chave_semantica,bloco_funcional,ocorrencia,
        categoria,operacao,base,atual_avaliado,proposto,cobertura_historica,ultimo_evento_avaliado_id
      FROM importacao_revisao_campo WHERE decisao_id=d;
    SET CONSTRAINTS ALL IMMEDIATE;
    RETURN id;
END $$;

DO $$
DECLARE u bigint; p bigint; p2 bigint; atid bigint; la bigint; lb bigint; lc bigint;
    linhaa bigint; linhab bigint; linhac bigint; fonte bigint; revisao bigint; autorizacao bigint;
    campo bigint; decisao bigint; evento bigint; endereco bigint; seq text; r text; t text;
    valor jsonb; vazio jsonb; nulo jsonb; ausente jsonb;
    fonte2 bigint; lote_sem_cadeia bigint; lote_ciclo bigint; lote_a_reprocessado bigint; linha_b2 bigint; au2 bigint;
    sucessor bigint; campo_publicado bigint; evidencias_antes jsonb; evidencias_depois jsonb;
BEGIN
    INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
      ('Revisor sintetico','revisor.storage@example.invalid',
       '$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO u;
    INSERT INTO paciente(nome) VALUES ('Paciente armazenamento sintetico') RETURNING paciente_id INTO p;
    INSERT INTO paciente(nome) VALUES ('Outro paciente armazenamento sintetico') RETURNING paciente_id INTO p2;
    INSERT INTO paciente_endereco(paciente_id,endereco) VALUES(p,'Endereco sintetico') RETURNING endereco_id INTO endereco;
    IF revisao_alvo_paciente('paciente_endereco',endereco)<>p THEN RAISE EXCEPTION 'PK real nao resolvida'; END IF;
    INSERT INTO atendimento(paciente_id,data_atendimento) VALUES(p,DATE '2026-01-20') RETURNING atendimento_id INTO atid;
    INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
      VALUES('storage-a',repeat('a',64),'v1','concluido') RETURNING importacao_lote_id INTO la;
    INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
      VALUES('storage-b',repeat('b',64),'v1','recebido') RETURNING importacao_lote_id INTO lb;
    INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
      VALUES('storage-c',repeat('c',64),'v1','recebido') RETURNING importacao_lote_id INTO lc;
    INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
      VALUES(la,'Sintetica',1,2,'[]') RETURNING importacao_linha_id INTO linhaa;
    INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
      VALUES(lb,'Sintetica',1,2,'[]') RETURNING importacao_linha_id INTO linhab;
    INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
      VALUES(lb,'Sintetica',1,3,'[]') RETURNING importacao_linha_id INTO linha_b2;
    INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos)
      VALUES(lc,'Sintetica',1,2,'[]') RETURNING importacao_linha_id INTO linhac;
    INSERT INTO importacao_fonte(codigo,lote_inicial_id,registrada_por_usuario_id)
      VALUES('storage-fonte',la,u) RETURNING fonte_id INTO fonte;
    INSERT INTO importacao_revisao(fonte_id,lote_base_id,hash_base,layout_base,lote_revisado_id,
      hash_revisado,layout_revisado,versao_fonte_esperada,contrato_versao,manifesto_base_sha256,
      manifesto_revisado_sha256,transformacoes_versao,importador_versao,revisao_git)
      VALUES(fonte,la,repeat('a',64),'v1',lb,repeat('b',64),'v1',0,'ADR-022',repeat('d',64),
             repeat('d',64),'v1','1.4.0','abcdef0') RETURNING revisao_id INTO revisao;
    INSERT INTO importacao_revisao_autorizacao(fonte_id,usuario_id,concedida_por_usuario_id)
      VALUES(fonte,u,u) RETURNING autorizacao_id INTO autorizacao;
    INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao)
      VALUES('paciente','nome','paciente_id','character varying(255)','v1') RETURNING campo_id INTO campo;
    valor:=jsonb_build_object('estado','valor','tipo_sql','character varying(255)',
      'valor','Paciente armazenamento sintetico','precisao','nao_temporal','serializacao_versao','v1');
    vazio:=valor||'{"estado":"celula_vazia","valor":null}'::jsonb;
    nulo:=valor||'{"estado":"nulo","valor":null}'::jsonb;
    ausente:=valor||'{"estado":"coluna_ausente","valor":null}'::jsonb;
    IF NOT revisao_envelope_valido(vazio,true) OR NOT revisao_envelope_valido(ausente,true)
       OR NOT revisao_envelope_valido(nulo,false) OR vazio=ausente OR vazio=nulo
       OR revisao_envelope_valido(valor||'{"extra":true}',true)
       OR revisao_envelope_valido('{"estado":"valor"}',true) THEN
       RAISE EXCEPTION 'F04: envelope nao distingue estados';
    END IF;
    INSERT INTO auditoria_campo_evento(campo_id,registro_id,versao_campo,origem,antes,depois)
      VALUES(campo,p,1,'marco_atual',valor||'{"estado":"desconhecido","valor":null}',valor)
      RETURNING evento_id INTO evento;
    INSERT INTO importacao_revisao_decisao(revisao_id,linha_revisada_id,linha_base_id,paciente_id,
      atendimento_base_id,versao_decisao,resultado,autorizacao_id,decidida_por_usuario_id,justificativa,plano_sha256)
      VALUES(revisao,linhab,linhaa,p,atid,1,'autorizar',autorizacao,u,'Associacao sintetica',repeat('e',64)) RETURNING decisao_id INTO decisao;
    INSERT INTO importacao_revisao_campo(decisao_id,campo_id,alvo_chave,registro_id,chave_semantica,
      bloco_funcional,ocorrencia,categoria,operacao,base,atual_avaliado,proposto,cobertura_historica,ultimo_evento_avaliado_id)
      VALUES(decisao,campo,'paciente',p,'nome','cadastro',1,'sem_mudanca','associar',valor,valor,valor,'desconhecida',evento);
    SET CONSTRAINTS ALL IMMEDIATE;

    -- A FK historica continua exclusiva para o mesmo conteudo.
    PERFORM pg_temp.exigir_falha(format('INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,lote_reprocessado_de_id) VALUES(''hash-diferente'',%L,''v1'',%s)',repeat('d',64),la),'23503');
    INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,lote_reprocessado_de_id,status_lote)
      VALUES('storage-a-reprocessado',repeat('a',64),'v1',la,'concluido') RETURNING importacao_lote_id INTO lote_a_reprocessado;

    -- F02: um lote sem ancestral real não comprova a fonte. Hash e
    -- layout declarados precisam também corresponder ao lote referenciado.
    INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
      VALUES('storage-sem-cadeia',repeat('d',64),'v1','concluido') RETURNING importacao_lote_id INTO lote_sem_cadeia;
    INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote)
      VALUES('storage-outra-base',repeat('e',64),'v1','concluido') RETURNING importacao_lote_id INTO lote_ciclo;
    INSERT INTO importacao_fonte(codigo,lote_inicial_id,registrada_por_usuario_id)
      VALUES('storage-fonte-outra',lote_ciclo,u) RETURNING fonte_id INTO fonte2;
    PERFORM pg_temp.exigir_falha(format('SELECT pg_temp.revisao_storage(%s,%s,%s,%L,%L)',
      fonte2,la,lb,repeat('a',64),repeat('b',64)),'23514');
    PERFORM pg_temp.exigir_falha(format('SELECT pg_temp.revisao_storage(%s,%s,%s,%L,%L)',
      fonte,lote_sem_cadeia,lb,repeat('d',64),repeat('b',64)),'23514');
    PERFORM pg_temp.exigir_falha(format('SELECT pg_temp.revisao_storage(%s,%s,%s,%L,%L)',
      fonte,lc,lb,repeat('c',64),repeat('b',64)),'23514');
    PERFORM pg_temp.exigir_falha(format('SELECT pg_temp.revisao_storage(%s,%s,%s,%L,%L)',
      fonte,la,lb,repeat('f',64),repeat('b',64)),'23503');
    PERFORM pg_temp.exigir_falha(format('SELECT pg_temp.revisao_storage(%s,%s,%s,%L,%L,''layout-incoerente'')',
      fonte,la,lb,repeat('a',64),repeat('b',64)),'23503');
    PERFORM pg_temp.exigir_falha(format('UPDATE importacao_lote SET lote_reprocessado_de_id=%s WHERE importacao_lote_id=%s; '
      'UPDATE importacao_lote SET lote_reprocessado_de_id=%s WHERE importacao_lote_id=%s; '
      'SELECT pg_temp.revisao_storage(%s,%s,%s,%L,%L)',
      lote_a_reprocessado,la,la,lote_a_reprocessado,fonte,la,lb,repeat('a',64),repeat('b',64)),'23514');

    -- F03/F06: a segunda linha física não pode autorizar o mesmo fato; nem
    -- paciente, atendimento ou autorização de outra fonte podem ser trocados.
    INSERT INTO importacao_revisao_autorizacao(fonte_id,usuario_id,concedida_por_usuario_id)
      VALUES(fonte2,u,u) RETURNING autorizacao_id INTO au2;
    PERFORM pg_temp.exigir_falha(format('SELECT pg_temp.clonar_plano_storage(%s,%s,%s,%s,%s,%s)',
      decisao,linha_b2,p,atid,autorizacao,u),'23514');
    PERFORM pg_temp.exigir_falha(format('SELECT pg_temp.clonar_plano_storage(%s,%s,%s,%s,%s,%s)',
      decisao,linha_b2,p2,atid,autorizacao,u),'23514');
    PERFORM pg_temp.exigir_falha(format('SELECT pg_temp.clonar_plano_storage(%s,%s,%s,%s,%s,%s)',
      decisao,linha_b2,p,atid,au2,u),'23514');
    INSERT INTO importacao_revisao_decisao(revisao_id,linha_revisada_id,linha_base_id,paciente_id,
      atendimento_base_id,versao_decisao,decisao_anterior_id,resultado,autorizacao_id,
      decidida_por_usuario_id,justificativa,plano_sha256)
      VALUES(revisao,linhab,linhaa,p,atid,2,decisao,'bloquear',autorizacao,u,
        'Sucessora sintetica preserva a decisao original',repeat('f',64)) RETURNING decisao_id INTO sucessor;
    IF NOT EXISTS(SELECT 1 FROM importacao_revisao_decisao WHERE decisao_id=decisao AND versao_decisao=1)
      OR NOT EXISTS(SELECT 1 FROM importacao_revisao_decisao WHERE decisao_id=sucessor AND decisao_anterior_id=decisao) THEN
      RAISE EXCEPTION 'F03: sucessao apagou a decisao original';
    END IF;

    -- F04/F07: não existe operação de exclusão, nem edição livre dos envelopes
    -- e eventos. Uma origem de revisão precisa de aplicação/campo aprovado.
    SELECT revisao_campo_id INTO STRICT campo_publicado FROM importacao_revisao_campo WHERE decisao_id=decisao;
    PERFORM pg_temp.exigir_falha(format('UPDATE importacao_revisao_campo SET operacao=''excluir'' WHERE revisao_campo_id=%s',campo_publicado),'23514');
    PERFORM pg_temp.exigir_falha(format('UPDATE importacao_revisao_campo SET proposto=''{}'' WHERE revisao_campo_id=%s',campo_publicado),'23514');
    PERFORM pg_temp.exigir_falha(format('INSERT INTO auditoria_campo_evento(campo_id,registro_id,versao_campo,origem,antes,depois) VALUES(%s,%s,1,''marco_atual'',%L,%L)',
      campo,p,valor||'{"estado":"desconhecido","valor":null}'::jsonb,valor),'23505');
    PERFORM pg_temp.exigir_falha(format('INSERT INTO auditoria_campo_evento(campo_id,registro_id,versao_campo,evento_anterior_id,origem,antes,depois) VALUES(%s,%s,3,%s,''marco_atual'',%L,%L)',
      campo,p,evento,valor,valor),'23514');
    PERFORM pg_temp.exigir_falha(format('INSERT INTO auditoria_campo_evento(campo_id,registro_id,versao_campo,evento_anterior_id,origem,antes,depois) VALUES(%s,%s,2,%s,''operacao_tecnica'',%L,%L)',
      campo,p2,evento,valor,valor),'23514');
    PERFORM pg_temp.exigir_falha(format('INSERT INTO auditoria_campo_evento(campo_id,registro_id,versao_campo,evento_anterior_id,origem,antes,depois) VALUES(%s,%s,2,%s,''revisao'',%L,%L)',
      campo,p,evento,valor,valor),'23514');
    PERFORM pg_temp.exigir_falha(format('UPDATE auditoria_campo_evento SET depois=%L WHERE evento_id=%s',nulo,evento),'23514');

    -- F16: reverter somente a concessão operacional preserva decisões e
    -- eventos. A concessão transitória existe apenas nesta transação sintética.
    evidencias_antes:=jsonb_build_object('decisoes',(SELECT jsonb_agg(to_jsonb(d) ORDER BY decisao_id) FROM importacao_revisao_decisao d),
      'eventos',(SELECT jsonb_agg(to_jsonb(e) ORDER BY evento_id) FROM auditoria_campo_evento e));
    GRANT EXECUTE ON FUNCTION revisao_aplicar_aprovada(bigint,bigint) TO ambulatorio_revisao_servico;
    REVOKE EXECUTE ON FUNCTION revisao_aplicar_aprovada(bigint,bigint) FROM ambulatorio_revisao_servico;
    evidencias_depois:=jsonb_build_object('decisoes',(SELECT jsonb_agg(to_jsonb(d) ORDER BY decisao_id) FROM importacao_revisao_decisao d),
      'eventos',(SELECT jsonb_agg(to_jsonb(e) ORDER BY evento_id) FROM auditoria_campo_evento e));
    IF evidencias_antes<>evidencias_depois OR has_function_privilege('ambulatorio_revisao_servico',
      'revisao_aplicar_aprovada(bigint,bigint)','EXECUTE') THEN
      RAISE EXCEPTION 'F16: reversao nao preservou evidencias ou bloqueio operacional';
    END IF;
    PERFORM pg_temp.exigir_falha(format('INSERT INTO importacao_fonte(codigo,lote_inicial_id,registrada_por_usuario_id) VALUES(''nao-terminal'',%s,%s)',lc,u),'23514');
    PERFORM pg_temp.exigir_falha(format('UPDATE importacao_revisao SET hash_base=%L WHERE revisao_id=%s',repeat('c',64),revisao),'23514');
    PERFORM pg_temp.exigir_falha(format('UPDATE importacao_fonte SET versao_controle=1 WHERE fonte_id=%s',fonte),'23514');
    PERFORM pg_temp.exigir_falha(format('UPDATE importacao_revisao_decisao SET paciente_id=%s WHERE decisao_id=%s',p2,decisao),'23514');
    PERFORM pg_temp.exigir_falha(format('DELETE FROM importacao_revisao_decisao WHERE decisao_id=%s',decisao),'23514');
    -- A FK recusa TRUNCATE isolado antes mesmo de executar o gatilho.
    PERFORM pg_temp.exigir_falha('TRUNCATE auditoria_campo_evento','0A000');
    PERFORM pg_temp.exigir_falha('INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao) VALUES(''usuario_aplicacao'',''nome'',''usuario_id'',''character varying(160)'',''v1'')','23514');
    PERFORM pg_temp.exigir_falha('INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao) VALUES(''paciente'',''paciente_id'',''paciente_id'',''bigint'',''v1'')','23514');
    PERFORM pg_temp.exigir_falha(format('INSERT INTO importacao_revisao_decisao(revisao_id,linha_revisada_id,linha_base_id,paciente_id,versao_decisao,resultado,autorizacao_id,decidida_por_usuario_id,justificativa,plano_sha256) VALUES(%s,%s,%s,%s,1,''autorizar'',%s,%s,''plano incompleto'',%L)',revisao,linhac,linhaa,p,autorizacao,u,repeat('f',64)),'23514');
    PERFORM pg_temp.exigir_falha(format('INSERT INTO auditoria_campo_evento(campo_id,registro_id,versao_campo,evento_anterior_id,origem,antes,depois) VALUES(%s,%s,2,%s,''marco_atual'',%L,%L)',campo,p,evento,valor,valor),'23514');

    FOREACH t IN ARRAY ARRAY['importacao_fonte','importacao_revisao','importacao_revisao_autorizacao',
      'importacao_revisao_decisao','importacao_revisao_campo','importacao_revisao_aplicacao',
      'importacao_revisao_alvo','auditoria_campo','auditoria_campo_evento'] LOOP
        FOREACH r IN ARRAY ARRAY['ambulatorio_aplicacao','ambulatorio_importador'] LOOP
            IF has_table_privilege(r,'ambulatorio.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') THEN
                RAISE EXCEPTION 'F05: privilegio indevido em % para %',t,r;
            END IF;
            SELECT pg_get_serial_sequence('ambulatorio.'||t,a.attname) INTO seq
              FROM pg_attribute a WHERE a.attrelid=to_regclass('ambulatorio.'||t) AND a.attidentity<>'';
            IF has_sequence_privilege(r,seq,'USAGE,SELECT,UPDATE') THEN RAISE EXCEPTION 'F05: sequencia exposta'; END IF;
        END LOOP;
        IF EXISTS(SELECT 1 FROM pg_class c, LATERAL aclexplode(c.relacl) a
                  WHERE c.oid=to_regclass('ambulatorio.'||t) AND a.grantee=0) THEN
            RAISE EXCEPTION 'F05: PUBLIC autorizado';
        END IF;
    END LOOP;
    IF has_table_privilege('ambulatorio_importador','usuario_aplicacao','SELECT,INSERT,UPDATE') THEN
       RAISE EXCEPTION 'F05: identidade exposta ao importador';
    END IF;
    UPDATE importacao_revisao_autorizacao SET revogada_em=clock_timestamp(),revogada_por_usuario_id=u WHERE autorizacao_id=autorizacao;
    PERFORM pg_temp.exigir_falha(format('UPDATE importacao_revisao_autorizacao SET revogada_em=NULL,revogada_por_usuario_id=NULL WHERE autorizacao_id=%s',autorizacao),'23514');
    RAISE NOTICE 'OK: armazenamento, FK de hash, catalogo, envelopes, imutabilidade e isolamento; executor nao homologado por este teste';
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
