--
-- PostgreSQL database dump
--

\restrict xmwsfqkdisbiVimxy9koi5WeHnsHPr6cCc8HwZOpzKgOZdMcCrJHAyp6wtqLg2F

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ambulatorio; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA ambulatorio;


--
-- Name: SCHEMA ambulatorio; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA ambulatorio IS 'Schema principal do sistema do ambulatorio Santa Casa.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: acompanhamento_cuidado; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.acompanhamento_cuidado (
    acompanhamento_cuidado_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    encaminhamento_id bigint,
    data_prevista date,
    data_realizada date,
    retorno_programado boolean,
    compareceu boolean,
    status_acompanhamento character varying(40),
    tipo_acompanhamento character varying(80),
    resumo_acompanhamento text,
    conduta text,
    valor_original_acompanhamento text,
    valor_original_status text,
    valor_original_conduta text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_acompanhamento_status CHECK (((status_acompanhamento IS NULL) OR ((status_acompanhamento)::text = ANY ((ARRAY['programado'::character varying, 'em_andamento'::character varying, 'concluido'::character varying, 'pendente'::character varying, 'cancelado'::character varying, 'perdido_seguimento'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE acompanhamento_cuidado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.acompanhamento_cuidado IS 'Registros de acompanhamento, seguimento ou retorno relacionados ao atendimento e, opcionalmente, a um encaminhamento.';


--
-- Name: COLUMN acompanhamento_cuidado.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.acompanhamento_cuidado.atendimento_id IS 'Atendimento relacionado ao acompanhamento.';


--
-- Name: COLUMN acompanhamento_cuidado.encaminhamento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.acompanhamento_cuidado.encaminhamento_id IS 'Encaminhamento relacionado ao acompanhamento, quando aplicável.';


--
-- Name: COLUMN acompanhamento_cuidado.data_prevista; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.acompanhamento_cuidado.data_prevista IS 'Data prevista para o acompanhamento ou retorno.';


--
-- Name: COLUMN acompanhamento_cuidado.data_realizada; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.acompanhamento_cuidado.data_realizada IS 'Data em que o acompanhamento ou retorno ocorreu.';


--
-- Name: COLUMN acompanhamento_cuidado.retorno_programado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.acompanhamento_cuidado.retorno_programado IS 'Indica se havia retorno programado.';


--
-- Name: COLUMN acompanhamento_cuidado.compareceu; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.acompanhamento_cuidado.compareceu IS 'Indica se o paciente compareceu ao acompanhamento ou retorno.';


--
-- Name: COLUMN acompanhamento_cuidado.status_acompanhamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.acompanhamento_cuidado.status_acompanhamento IS 'Status do acompanhamento: programado, em_andamento, concluido, pendente, cancelado, perdido_seguimento ou nao_informado.';


--
-- Name: COLUMN acompanhamento_cuidado.tipo_acompanhamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.acompanhamento_cuidado.tipo_acompanhamento IS 'Tipo de acompanhamento ou retorno realizado.';


--
-- Name: COLUMN acompanhamento_cuidado.resumo_acompanhamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.acompanhamento_cuidado.resumo_acompanhamento IS 'Resumo textual do acompanhamento.';


--
-- Name: COLUMN acompanhamento_cuidado.conduta; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.acompanhamento_cuidado.conduta IS 'Conduta definida no acompanhamento.';


--
-- Name: acompanhamento_cuidado_acompanhamento_cuidado_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.acompanhamento_cuidado_acompanhamento_cuidado_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: acompanhamento_cuidado_acompanhamento_cuidado_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.acompanhamento_cuidado_acompanhamento_cuidado_id_seq OWNED BY ambulatorio.acompanhamento_cuidado.acompanhamento_cuidado_id;


--
-- Name: atendimento; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.atendimento (
    atendimento_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    data_atendimento date,
    localizacao_prontuario character varying(120),
    ambulatorio_unicamente boolean,
    ambulatorio_anexo_projeto boolean,
    origem_registro character varying(50),
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_atendimento_contexto_ambulatorio CHECK ((NOT ((COALESCE(ambulatorio_unicamente, false) = true) AND (COALESCE(ambulatorio_anexo_projeto, false) = true)))),
    CONSTRAINT chk_atendimento_origem_registro CHECK (((origem_registro IS NULL) OR ((origem_registro)::text = ANY ((ARRAY['planilha_portador_dc'::character varying, 'planilha_nao_portador_dc'::character varying, 'cadastro_sistema'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE atendimento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.atendimento IS 'Tabela de atendimentos realizados ou registrados para cada paciente.';


--
-- Name: COLUMN atendimento.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento.atendimento_id IS 'Identificador interno do atendimento no banco de dados.';


--
-- Name: COLUMN atendimento.paciente_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento.paciente_id IS 'Referência ao paciente atendido.';


--
-- Name: COLUMN atendimento.data_atendimento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento.data_atendimento IS 'Data do atendimento conforme registro da planilha ou cadastro no sistema.';


--
-- Name: COLUMN atendimento.localizacao_prontuario; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento.localizacao_prontuario IS 'Localização física ou lógica do prontuário do paciente.';


--
-- Name: COLUMN atendimento.ambulatorio_unicamente; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento.ambulatorio_unicamente IS 'Indica se o atendimento está vinculado apenas ao ambulatório.';


--
-- Name: COLUMN atendimento.ambulatorio_anexo_projeto; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento.ambulatorio_anexo_projeto IS 'Indica se o atendimento está vinculado ao ambulatório anexo a projeto.';


--
-- Name: COLUMN atendimento.origem_registro; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento.origem_registro IS 'Origem do registro: planilha_portador_dc, planilha_nao_portador_dc, cadastro_sistema ou nao_informado.';


--
-- Name: COLUMN atendimento.observacoes; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento.observacoes IS 'Campo textual para observações gerais sobre o atendimento.';


--
-- Name: atendimento_atendimento_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.atendimento_atendimento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: atendimento_atendimento_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.atendimento_atendimento_id_seq OWNED BY ambulatorio.atendimento.atendimento_id;


--
-- Name: atendimento_exame_complementar; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.atendimento_exame_complementar (
    atendimento_exame_complementar_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    tipo_exame_complementar_id bigint NOT NULL,
    origem_exame character varying(40),
    status_exame character varying(40),
    data_solicitacao date,
    data_realizacao date,
    data_resultado date,
    trouxe_exame boolean,
    solicitado_exame boolean,
    resultado_geral character varying(40),
    resumo_resultado text,
    laudo_texto text,
    local_realizacao character varying(150),
    profissional_solicitante character varying(150),
    valor_original_trazido text,
    valor_original_solicitado text,
    valor_original_resultado text,
    valor_original_observacao text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_atendimento_exame_origem CHECK (((origem_exame IS NULL) OR ((origem_exame)::text = ANY ((ARRAY['trazido_paciente'::character varying, 'solicitado_ambulatorio'::character varying, 'realizado_ambulatorio'::character varying, 'registrado_planilha'::character varying, 'nao_informado'::character varying])::text[])))),
    CONSTRAINT chk_atendimento_exame_resultado_geral CHECK (((resultado_geral IS NULL) OR ((resultado_geral)::text = ANY ((ARRAY['normal'::character varying, 'alterado'::character varying, 'inconclusivo'::character varying, 'nao_aplicavel'::character varying, 'nao_informado'::character varying])::text[])))),
    CONSTRAINT chk_atendimento_exame_status CHECK (((status_exame IS NULL) OR ((status_exame)::text = ANY ((ARRAY['solicitado'::character varying, 'trazido'::character varying, 'realizado'::character varying, 'pendente'::character varying, 'cancelado'::character varying, 'sem_resultado'::character varying, 'resultado_disponivel'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE atendimento_exame_complementar; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.atendimento_exame_complementar IS 'Exames complementares associados a um atendimento. Cobre exames trazidos, solicitados, realizados e registrados na planilha.';


--
-- Name: COLUMN atendimento_exame_complementar.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_exame_complementar.atendimento_id IS 'Atendimento ao qual o exame está associado.';


--
-- Name: COLUMN atendimento_exame_complementar.tipo_exame_complementar_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_exame_complementar.tipo_exame_complementar_id IS 'Tipo de exame complementar realizado, solicitado ou trazido.';


--
-- Name: COLUMN atendimento_exame_complementar.origem_exame; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_exame_complementar.origem_exame IS 'Origem do exame: trazido_paciente, solicitado_ambulatorio, realizado_ambulatorio, registrado_planilha ou nao_informado.';


--
-- Name: COLUMN atendimento_exame_complementar.status_exame; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_exame_complementar.status_exame IS 'Status do exame: solicitado, trazido, realizado, pendente, cancelado, sem_resultado, resultado_disponivel ou nao_informado.';


--
-- Name: COLUMN atendimento_exame_complementar.trouxe_exame; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_exame_complementar.trouxe_exame IS 'Indica se o paciente trouxe exame complementar.';


--
-- Name: COLUMN atendimento_exame_complementar.solicitado_exame; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_exame_complementar.solicitado_exame IS 'Indica se exame complementar foi solicitado no atendimento.';


--
-- Name: COLUMN atendimento_exame_complementar.resultado_geral; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_exame_complementar.resultado_geral IS 'Resultado geral padronizado: normal, alterado, inconclusivo, nao_aplicavel ou nao_informado.';


--
-- Name: COLUMN atendimento_exame_complementar.resumo_resultado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_exame_complementar.resumo_resultado IS 'Resumo textual do resultado do exame.';


--
-- Name: COLUMN atendimento_exame_complementar.laudo_texto; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_exame_complementar.laudo_texto IS 'Transcrição ou resumo do laudo, quando disponível.';


--
-- Name: COLUMN atendimento_exame_complementar.valor_original_trazido; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_exame_complementar.valor_original_trazido IS 'Valor bruto da planilha relacionado a exame trazido.';


--
-- Name: COLUMN atendimento_exame_complementar.valor_original_solicitado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_exame_complementar.valor_original_solicitado IS 'Valor bruto da planilha relacionado a exame solicitado.';


--
-- Name: COLUMN atendimento_exame_complementar.valor_original_resultado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_exame_complementar.valor_original_resultado IS 'Valor bruto da planilha relacionado ao resultado do exame.';


--
-- Name: atendimento_exame_complementa_atendimento_exame_complementa_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.atendimento_exame_complementa_atendimento_exame_complementa_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: atendimento_exame_complementa_atendimento_exame_complementa_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.atendimento_exame_complementa_atendimento_exame_complementa_seq OWNED BY ambulatorio.atendimento_exame_complementar.atendimento_exame_complementar_id;


--
-- Name: atendimento_medicamento; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.atendimento_medicamento (
    atendimento_medicamento_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    medicamento_id bigint,
    nome_medicamento_livre character varying(180),
    tipo_registro character varying(40),
    finalidade_uso character varying(60),
    dose character varying(80),
    via_administracao character varying(50),
    frequencia character varying(80),
    data_inicio date,
    data_fim date,
    uso_atual boolean,
    prescrito_no_atendimento boolean,
    status_uso character varying(40),
    motivo text,
    observacoes text,
    valor_original_medicamento text,
    valor_original_dose text,
    valor_original_status text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_atendimento_medicamento_finalidade CHECK (((finalidade_uso IS NULL) OR ((finalidade_uso)::text = ANY ((ARRAY['tratamento_chagas'::character varying, 'cardiovascular'::character varying, 'digestivo'::character varying, 'comorbidade'::character varying, 'sintomatico'::character varying, 'outro'::character varying, 'nao_informado'::character varying])::text[])))),
    CONSTRAINT chk_atendimento_medicamento_status CHECK (((status_uso IS NULL) OR ((status_uso)::text = ANY ((ARRAY['em_uso'::character varying, 'prescrito'::character varying, 'suspenso'::character varying, 'finalizado'::character varying, 'nao_iniciado'::character varying, 'desconhecido'::character varying, 'nao_informado'::character varying])::text[])))),
    CONSTRAINT chk_atendimento_medicamento_tipo_registro CHECK (((tipo_registro IS NULL) OR ((tipo_registro)::text = ANY ((ARRAY['uso_referido'::character varying, 'prescricao'::character varying, 'suspensao'::character varying, 'ajuste'::character varying, 'registro_planilha'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE atendimento_medicamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.atendimento_medicamento IS 'Medicamentos utilizados, prescritos, suspensos ou registrados durante um atendimento.';


--
-- Name: COLUMN atendimento_medicamento.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_medicamento.atendimento_id IS 'Atendimento ao qual o registro de medicamento está associado.';


--
-- Name: COLUMN atendimento_medicamento.medicamento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_medicamento.medicamento_id IS 'Medicamento padronizado no catálogo, quando identificado.';


--
-- Name: COLUMN atendimento_medicamento.nome_medicamento_livre; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_medicamento.nome_medicamento_livre IS 'Nome textual do medicamento quando ainda não foi padronizado no catálogo.';


--
-- Name: COLUMN atendimento_medicamento.tipo_registro; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_medicamento.tipo_registro IS 'Tipo do registro: uso_referido, prescricao, suspensao, ajuste, registro_planilha ou nao_informado.';


--
-- Name: COLUMN atendimento_medicamento.finalidade_uso; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_medicamento.finalidade_uso IS 'Finalidade do medicamento: tratamento_chagas, cardiovascular, digestivo, comorbidade, sintomatico, outro ou nao_informado.';


--
-- Name: COLUMN atendimento_medicamento.dose; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_medicamento.dose IS 'Dose registrada em texto livre.';


--
-- Name: COLUMN atendimento_medicamento.via_administracao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_medicamento.via_administracao IS 'Via de administração, quando informada.';


--
-- Name: COLUMN atendimento_medicamento.frequencia; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_medicamento.frequencia IS 'Frequência de uso do medicamento.';


--
-- Name: COLUMN atendimento_medicamento.uso_atual; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_medicamento.uso_atual IS 'Indica se o paciente estava em uso do medicamento no momento do atendimento.';


--
-- Name: COLUMN atendimento_medicamento.prescrito_no_atendimento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_medicamento.prescrito_no_atendimento IS 'Indica se o medicamento foi prescrito durante o atendimento.';


--
-- Name: COLUMN atendimento_medicamento.status_uso; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_medicamento.status_uso IS 'Status do uso do medicamento: em_uso, prescrito, suspenso, finalizado, nao_iniciado, desconhecido ou nao_informado.';


--
-- Name: atendimento_medicamento_atendimento_medicamento_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.atendimento_medicamento_atendimento_medicamento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: atendimento_medicamento_atendimento_medicamento_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.atendimento_medicamento_atendimento_medicamento_id_seq OWNED BY ambulatorio.atendimento_medicamento.atendimento_medicamento_id;


--
-- Name: atendimento_projeto_estudo; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.atendimento_projeto_estudo (
    atendimento_projeto_estudo_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    projeto_estudo_id bigint NOT NULL,
    participa boolean,
    possui_pendencia boolean,
    descricao_pendencia text,
    houve_falha boolean,
    descricao_falha text,
    valor_original_participacao text,
    valor_original_pendencia text,
    valor_original_falha text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE atendimento_projeto_estudo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.atendimento_projeto_estudo IS 'Tabela associativa entre atendimentos e projetos/estudos.';


--
-- Name: COLUMN atendimento_projeto_estudo.atendimento_projeto_estudo_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_projeto_estudo.atendimento_projeto_estudo_id IS 'Identificador interno do vínculo entre atendimento e projeto.';


--
-- Name: COLUMN atendimento_projeto_estudo.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_projeto_estudo.atendimento_id IS 'Referência ao atendimento vinculado ao projeto.';


--
-- Name: COLUMN atendimento_projeto_estudo.projeto_estudo_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_projeto_estudo.projeto_estudo_id IS 'Referência ao projeto ou estudo.';


--
-- Name: COLUMN atendimento_projeto_estudo.participa; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_projeto_estudo.participa IS 'Indica se o paciente/atendimento participa do projeto.';


--
-- Name: COLUMN atendimento_projeto_estudo.possui_pendencia; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_projeto_estudo.possui_pendencia IS 'Indica se existe pendência relacionada ao projeto.';


--
-- Name: COLUMN atendimento_projeto_estudo.descricao_pendencia; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_projeto_estudo.descricao_pendencia IS 'Descrição textual da pendência, quando houver.';


--
-- Name: COLUMN atendimento_projeto_estudo.houve_falha; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_projeto_estudo.houve_falha IS 'Indica se houve falha relacionada ao projeto.';


--
-- Name: COLUMN atendimento_projeto_estudo.descricao_falha; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_projeto_estudo.descricao_falha IS 'Descrição textual da falha, quando houver.';


--
-- Name: COLUMN atendimento_projeto_estudo.valor_original_participacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_projeto_estudo.valor_original_participacao IS 'Valor bruto original da coluna de participação na planilha.';


--
-- Name: COLUMN atendimento_projeto_estudo.valor_original_pendencia; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_projeto_estudo.valor_original_pendencia IS 'Valor bruto original da coluna de pendência na planilha.';


--
-- Name: COLUMN atendimento_projeto_estudo.valor_original_falha; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.atendimento_projeto_estudo.valor_original_falha IS 'Valor bruto original da coluna de falha na planilha.';


--
-- Name: atendimento_projeto_estudo_atendimento_projeto_estudo_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.atendimento_projeto_estudo_atendimento_projeto_estudo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: atendimento_projeto_estudo_atendimento_projeto_estudo_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.atendimento_projeto_estudo_atendimento_projeto_estudo_id_seq OWNED BY ambulatorio.atendimento_projeto_estudo.atendimento_projeto_estudo_id;


--
-- Name: comorbidade; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.comorbidade (
    comorbidade_id bigint NOT NULL,
    nome_comorbidade character varying(120) NOT NULL,
    descricao text,
    ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE comorbidade; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.comorbidade IS 'Tabela de catálogo das comorbidades possíveis.';


--
-- Name: COLUMN comorbidade.nome_comorbidade; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.comorbidade.nome_comorbidade IS 'Nome padronizado da comorbidade.';


--
-- Name: COLUMN comorbidade.descricao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.comorbidade.descricao IS 'Descrição opcional da comorbidade.';


--
-- Name: COLUMN comorbidade.ativo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.comorbidade.ativo IS 'Indica se a comorbidade está ativa para uso no sistema.';


--
-- Name: comorbidade_comorbidade_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.comorbidade_comorbidade_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comorbidade_comorbidade_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.comorbidade_comorbidade_id_seq OWNED BY ambulatorio.comorbidade.comorbidade_id;


--
-- Name: complicacao_chagas; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.complicacao_chagas (
    complicacao_chagas_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    tipo_complicacao character varying(80),
    possui_complicacao boolean,
    descricao text,
    gravidade character varying(30),
    valor_original_tipo text,
    valor_original_presenca text,
    valor_original_gravidade text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_complicacao_chagas_gravidade CHECK (((gravidade IS NULL) OR ((gravidade)::text = ANY ((ARRAY['leve'::character varying, 'moderada'::character varying, 'grave'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE complicacao_chagas; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.complicacao_chagas IS 'Complicações associadas à doença de Chagas registradas no atendimento.';


--
-- Name: COLUMN complicacao_chagas.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.complicacao_chagas.atendimento_id IS 'Atendimento ao qual a complicação está associada.';


--
-- Name: COLUMN complicacao_chagas.tipo_complicacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.complicacao_chagas.tipo_complicacao IS 'Tipo de complicação registrada, como cardíaca, digestiva ou outra classificação clínica.';


--
-- Name: COLUMN complicacao_chagas.possui_complicacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.complicacao_chagas.possui_complicacao IS 'Indica se a complicação está presente.';


--
-- Name: COLUMN complicacao_chagas.descricao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.complicacao_chagas.descricao IS 'Descrição textual da complicação.';


--
-- Name: COLUMN complicacao_chagas.gravidade; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.complicacao_chagas.gravidade IS 'Gravidade padronizada: leve, moderada, grave ou nao_informado.';


--
-- Name: complicacao_chagas_complicacao_chagas_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.complicacao_chagas_complicacao_chagas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: complicacao_chagas_complicacao_chagas_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.complicacao_chagas_complicacao_chagas_id_seq OWNED BY ambulatorio.complicacao_chagas.complicacao_chagas_id;


--
-- Name: condicao_chagas; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.condicao_chagas (
    condicao_chagas_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    forma_clinica character varying(50),
    fase_doenca character varying(50),
    classificacao_clinica character varying(80),
    possui_sintomas boolean,
    descricao_sintomas text,
    observacoes text,
    valor_original_forma_clinica text,
    valor_original_fase_doenca text,
    valor_original_classificacao text,
    valor_original_sintomas text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_condicao_chagas_fase_doenca CHECK (((fase_doenca IS NULL) OR ((fase_doenca)::text = ANY ((ARRAY['aguda'::character varying, 'cronica'::character varying, 'nao_informado'::character varying])::text[])))),
    CONSTRAINT chk_condicao_chagas_forma_clinica CHECK (((forma_clinica IS NULL) OR ((forma_clinica)::text = ANY ((ARRAY['indeterminada'::character varying, 'cardiaca'::character varying, 'digestiva'::character varying, 'cardiodigestiva'::character varying, 'aguda'::character varying, 'cronica'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE condicao_chagas; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.condicao_chagas IS 'Condição clínica relacionada à doença de Chagas registrada no atendimento.';


--
-- Name: COLUMN condicao_chagas.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.condicao_chagas.atendimento_id IS 'Atendimento ao qual a condição clínica está associada.';


--
-- Name: COLUMN condicao_chagas.forma_clinica; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.condicao_chagas.forma_clinica IS 'Forma clínica da doença de Chagas: indeterminada, cardiaca, digestiva, cardiodigestiva, aguda, cronica ou nao_informado.';


--
-- Name: COLUMN condicao_chagas.fase_doenca; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.condicao_chagas.fase_doenca IS 'Fase da doença: aguda, cronica ou nao_informado.';


--
-- Name: COLUMN condicao_chagas.classificacao_clinica; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.condicao_chagas.classificacao_clinica IS 'Classificação clínica complementar, quando informada.';


--
-- Name: COLUMN condicao_chagas.possui_sintomas; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.condicao_chagas.possui_sintomas IS 'Indica se há sintomas registrados.';


--
-- Name: COLUMN condicao_chagas.descricao_sintomas; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.condicao_chagas.descricao_sintomas IS 'Descrição textual dos sintomas registrados.';


--
-- Name: condicao_chagas_condicao_chagas_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.condicao_chagas_condicao_chagas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: condicao_chagas_condicao_chagas_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.condicao_chagas_condicao_chagas_id_seq OWNED BY ambulatorio.condicao_chagas.condicao_chagas_id;


--
-- Name: dados_clinicos_atendimento; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.dados_clinicos_atendimento (
    dados_clinicos_atendimento_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    altura_cm numeric(5,2),
    peso_kg numeric(5,2),
    circunferencia_abdominal_cm numeric(5,2),
    frequencia_cardiaca_bpm integer,
    saturacao_percentual numeric(5,2),
    pa_sistolica_mmhg integer,
    pa_diastolica_mmhg integer,
    nyha character varying(20),
    valor_original_altura text,
    valor_original_peso text,
    valor_original_circunferencia_abdominal text,
    valor_original_frequencia_cardiaca text,
    valor_original_saturacao text,
    valor_original_pa_sistolica text,
    valor_original_pa_diastolica text,
    valor_original_nyha text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE dados_clinicos_atendimento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.dados_clinicos_atendimento IS 'Avaliacao objetiva consolidada produzida em um atendimento.';


--
-- Name: COLUMN dados_clinicos_atendimento.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.dados_clinicos_atendimento.atendimento_id IS 'Atendimento que produziu a avaliacao; permite no maximo uma avaliacao por atendimento.';


--
-- Name: COLUMN dados_clinicos_atendimento.nyha; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.dados_clinicos_atendimento.nyha IS 'Classificacao funcional em texto ainda sem dominio fechado.';


--
-- Name: dados_clinicos_atendimento_dados_clinicos_atendimento_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.dados_clinicos_atendimento_dados_clinicos_atendimento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dados_clinicos_atendimento_dados_clinicos_atendimento_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.dados_clinicos_atendimento_dados_clinicos_atendimento_id_seq OWNED BY ambulatorio.dados_clinicos_atendimento.dados_clinicos_atendimento_id;


--
-- Name: diagnostico_chagas; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.diagnostico_chagas (
    diagnostico_chagas_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    possui_diagnostico_chagas boolean,
    status_diagnostico character varying(30),
    resultado_final character varying(30),
    data_resultado_final date,
    criterio_confirmacao character varying(80),
    observacoes text,
    valor_original_diagnostico text,
    valor_original_resultado_final text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_diagnostico_chagas_resultado_final CHECK (((resultado_final IS NULL) OR ((resultado_final)::text = ANY ((ARRAY['positivo'::character varying, 'negativo'::character varying, 'inconclusivo'::character varying, 'indeterminado'::character varying, 'nao_informado'::character varying])::text[])))),
    CONSTRAINT chk_diagnostico_chagas_status CHECK (((status_diagnostico IS NULL) OR ((status_diagnostico)::text = ANY ((ARRAY['confirmado'::character varying, 'descartado'::character varying, 'inconclusivo'::character varying, 'suspeito'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE diagnostico_chagas; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.diagnostico_chagas IS 'Registro do diagnóstico de doença de Chagas associado a um atendimento.';


--
-- Name: COLUMN diagnostico_chagas.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.diagnostico_chagas.atendimento_id IS 'Atendimento ao qual o diagnóstico está associado.';


--
-- Name: COLUMN diagnostico_chagas.possui_diagnostico_chagas; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.diagnostico_chagas.possui_diagnostico_chagas IS 'Indica se o paciente possui diagnóstico de doença de Chagas conforme o atendimento.';


--
-- Name: COLUMN diagnostico_chagas.status_diagnostico; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.diagnostico_chagas.status_diagnostico IS 'Status padronizado do diagnóstico: confirmado, descartado, inconclusivo, suspeito ou nao_informado.';


--
-- Name: COLUMN diagnostico_chagas.resultado_final; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.diagnostico_chagas.resultado_final IS 'Resultado final padronizado do diagnóstico.';


--
-- Name: COLUMN diagnostico_chagas.criterio_confirmacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.diagnostico_chagas.criterio_confirmacao IS 'Critério usado para confirmação diagnóstica, quando informado.';


--
-- Name: COLUMN diagnostico_chagas.valor_original_diagnostico; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.diagnostico_chagas.valor_original_diagnostico IS 'Valor bruto da planilha relacionado ao diagnóstico.';


--
-- Name: COLUMN diagnostico_chagas.valor_original_resultado_final; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.diagnostico_chagas.valor_original_resultado_final IS 'Valor bruto da planilha relacionado ao resultado final.';


--
-- Name: diagnostico_chagas_diagnostico_chagas_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.diagnostico_chagas_diagnostico_chagas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: diagnostico_chagas_diagnostico_chagas_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.diagnostico_chagas_diagnostico_chagas_id_seq OWNED BY ambulatorio.diagnostico_chagas.diagnostico_chagas_id;


--
-- Name: dispositivo_implantado; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.dispositivo_implantado (
    dispositivo_implantado_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    tipo_dispositivo character varying(100) NOT NULL,
    possui_dispositivo boolean,
    valor_original_tipo text,
    valor_original_presenca text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE dispositivo_implantado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.dispositivo_implantado IS 'Estado consolidado informado de cada tipo de dispositivo implantavel do paciente.';


--
-- Name: COLUMN dispositivo_implantado.possui_dispositivo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.dispositivo_implantado.possui_dispositivo IS 'Presenca normalizada; NULL representa informacao desconhecida ou ambigua.';


--
-- Name: dispositivo_implantado_dispositivo_implantado_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.dispositivo_implantado_dispositivo_implantado_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dispositivo_implantado_dispositivo_implantado_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.dispositivo_implantado_dispositivo_implantado_id_seq OWNED BY ambulatorio.dispositivo_implantado.dispositivo_implantado_id;


--
-- Name: encaminhamento; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.encaminhamento (
    encaminhamento_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    tipo_encaminhamento_id bigint,
    origem_encaminhamento character varying(60),
    destino_nome character varying(180),
    destino_servico character varying(180),
    especialidade_destino character varying(120),
    data_encaminhamento date,
    data_agendamento date,
    data_realizacao date,
    status_encaminhamento character varying(40),
    prioridade character varying(30),
    motivo text,
    conduta_orientada text,
    valor_original_encaminhamento text,
    valor_original_origem text,
    valor_original_destino text,
    valor_original_status text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_encaminhamento_origem CHECK (((origem_encaminhamento IS NULL) OR ((origem_encaminhamento)::text = ANY ((ARRAY['ambulatorio'::character varying, 'projeto_pesquisa'::character varying, 'atencao_basica'::character varying, 'servico_especializado'::character varying, 'hospital'::character varying, 'demanda_espontanea'::character varying, 'planilha'::character varying, 'outro'::character varying, 'nao_informado'::character varying])::text[])))),
    CONSTRAINT chk_encaminhamento_prioridade CHECK (((prioridade IS NULL) OR ((prioridade)::text = ANY ((ARRAY['baixa'::character varying, 'media'::character varying, 'alta'::character varying, 'urgente'::character varying, 'nao_informado'::character varying])::text[])))),
    CONSTRAINT chk_encaminhamento_status CHECK (((status_encaminhamento IS NULL) OR ((status_encaminhamento)::text = ANY ((ARRAY['indicado'::character varying, 'solicitado'::character varying, 'agendado'::character varying, 'realizado'::character varying, 'pendente'::character varying, 'cancelado'::character varying, 'nao_compareceu'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE encaminhamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.encaminhamento IS 'Encaminhamentos gerados a partir de um atendimento.';


--
-- Name: COLUMN encaminhamento.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.encaminhamento.atendimento_id IS 'Atendimento que originou o encaminhamento.';


--
-- Name: COLUMN encaminhamento.tipo_encaminhamento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.encaminhamento.tipo_encaminhamento_id IS 'Tipo padronizado de encaminhamento.';


--
-- Name: COLUMN encaminhamento.origem_encaminhamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.encaminhamento.origem_encaminhamento IS 'Origem do encaminhamento: ambulatorio, projeto_pesquisa, atencao_basica, servico_especializado, hospital, demanda_espontanea, planilha, outro ou nao_informado.';


--
-- Name: COLUMN encaminhamento.destino_nome; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.encaminhamento.destino_nome IS 'Nome da instituição, unidade ou local de destino.';


--
-- Name: COLUMN encaminhamento.destino_servico; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.encaminhamento.destino_servico IS 'Serviço de destino do encaminhamento.';


--
-- Name: COLUMN encaminhamento.especialidade_destino; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.encaminhamento.especialidade_destino IS 'Especialidade de destino, quando aplicável.';


--
-- Name: COLUMN encaminhamento.status_encaminhamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.encaminhamento.status_encaminhamento IS 'Status do encaminhamento: indicado, solicitado, agendado, realizado, pendente, cancelado, nao_compareceu ou nao_informado.';


--
-- Name: COLUMN encaminhamento.prioridade; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.encaminhamento.prioridade IS 'Prioridade do encaminhamento: baixa, media, alta, urgente ou nao_informado.';


--
-- Name: COLUMN encaminhamento.motivo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.encaminhamento.motivo IS 'Motivo clínico ou administrativo do encaminhamento.';


--
-- Name: COLUMN encaminhamento.conduta_orientada; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.encaminhamento.conduta_orientada IS 'Conduta orientada ao paciente relacionada ao encaminhamento.';


--
-- Name: COLUMN encaminhamento.valor_original_encaminhamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.encaminhamento.valor_original_encaminhamento IS 'Valor bruto da planilha relacionado ao encaminhamento.';


--
-- Name: encaminhamento_encaminhamento_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.encaminhamento_encaminhamento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: encaminhamento_encaminhamento_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.encaminhamento_encaminhamento_id_seq OWNED BY ambulatorio.encaminhamento.encaminhamento_id;


--
-- Name: evento_clinico; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.evento_clinico (
    evento_clinico_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    tipo_evento character varying(100) NOT NULL,
    ocorreu boolean,
    ano_evento integer,
    descricao text,
    valor_original_ocorrencia text,
    valor_original_data text,
    valor_original_descricao text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE evento_clinico; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.evento_clinico IS 'Eventos clinicos longitudinais positivos, negativos ou desconhecidos do paciente.';


--
-- Name: COLUMN evento_clinico.ocorreu; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.evento_clinico.ocorreu IS 'Ocorrencia normalizada; NULL representa informacao desconhecida ou ambigua.';


--
-- Name: COLUMN evento_clinico.ano_evento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.evento_clinico.ano_evento IS 'Ano informado para o evento, sem criacao de data artificial.';


--
-- Name: evento_clinico_evento_clinico_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.evento_clinico_evento_clinico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evento_clinico_evento_clinico_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.evento_clinico_evento_clinico_id_seq OWNED BY ambulatorio.evento_clinico.evento_clinico_id;


--
-- Name: exame_complementar_resultado; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.exame_complementar_resultado (
    exame_complementar_resultado_id bigint NOT NULL,
    atendimento_exame_complementar_id bigint NOT NULL,
    nome_campo character varying(120) NOT NULL,
    valor_texto text,
    valor_numerico numeric(14,4),
    unidade character varying(40),
    valor_referencia character varying(120),
    interpretacao character varying(40),
    valor_original text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_exame_resultado_interpretacao CHECK (((interpretacao IS NULL) OR ((interpretacao)::text = ANY ((ARRAY['normal'::character varying, 'alterado'::character varying, 'baixo'::character varying, 'alto'::character varying, 'positivo'::character varying, 'negativo'::character varying, 'inconclusivo'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE exame_complementar_resultado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.exame_complementar_resultado IS 'Resultados estruturados de exames complementares, permitindo registrar campos específicos de cada exame.';


--
-- Name: COLUMN exame_complementar_resultado.atendimento_exame_complementar_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.exame_complementar_resultado.atendimento_exame_complementar_id IS 'Exame complementar ao qual o resultado pertence.';


--
-- Name: COLUMN exame_complementar_resultado.nome_campo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.exame_complementar_resultado.nome_campo IS 'Nome do parâmetro ou campo do exame, por exemplo FEVE, ritmo, creatinina, hemoglobina.';


--
-- Name: COLUMN exame_complementar_resultado.valor_texto; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.exame_complementar_resultado.valor_texto IS 'Valor textual do resultado.';


--
-- Name: COLUMN exame_complementar_resultado.valor_numerico; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.exame_complementar_resultado.valor_numerico IS 'Valor numérico do resultado, quando aplicável.';


--
-- Name: COLUMN exame_complementar_resultado.unidade; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.exame_complementar_resultado.unidade IS 'Unidade de medida do resultado, quando aplicável.';


--
-- Name: COLUMN exame_complementar_resultado.valor_referencia; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.exame_complementar_resultado.valor_referencia IS 'Valor de referência informado no exame.';


--
-- Name: COLUMN exame_complementar_resultado.interpretacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.exame_complementar_resultado.interpretacao IS 'Interpretação padronizada do resultado.';


--
-- Name: COLUMN exame_complementar_resultado.valor_original; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.exame_complementar_resultado.valor_original IS 'Valor bruto vindo da planilha ou do laudo original.';


--
-- Name: exame_complementar_resultado_exame_complementar_resultado_i_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.exame_complementar_resultado_exame_complementar_resultado_i_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exame_complementar_resultado_exame_complementar_resultado_i_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.exame_complementar_resultado_exame_complementar_resultado_i_seq OWNED BY ambulatorio.exame_complementar_resultado.exame_complementar_resultado_id;


--
-- Name: historico_familiar_chagas; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.historico_familiar_chagas (
    historico_familiar_chagas_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    possui_historico_familiar boolean,
    parentesco character varying(120),
    descricao text,
    valor_original_historico text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE historico_familiar_chagas; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.historico_familiar_chagas IS 'Histórico familiar de doença de Chagas associado ao paciente.';


--
-- Name: COLUMN historico_familiar_chagas.paciente_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.historico_familiar_chagas.paciente_id IS 'Paciente ao qual o histórico familiar pertence.';


--
-- Name: COLUMN historico_familiar_chagas.possui_historico_familiar; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.historico_familiar_chagas.possui_historico_familiar IS 'Indica se há histórico familiar de doença de Chagas.';


--
-- Name: COLUMN historico_familiar_chagas.parentesco; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.historico_familiar_chagas.parentesco IS 'Parentesco informado no histórico familiar, quando disponível.';


--
-- Name: COLUMN historico_familiar_chagas.descricao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.historico_familiar_chagas.descricao IS 'Descrição textual do histórico familiar.';


--
-- Name: COLUMN historico_familiar_chagas.valor_original_historico; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.historico_familiar_chagas.valor_original_historico IS 'Valor bruto da planilha relacionado ao histórico familiar.';


--
-- Name: historico_familiar_chagas_historico_familiar_chagas_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.historico_familiar_chagas_historico_familiar_chagas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historico_familiar_chagas_historico_familiar_chagas_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.historico_familiar_chagas_historico_familiar_chagas_id_seq OWNED BY ambulatorio.historico_familiar_chagas.historico_familiar_chagas_id;


--
-- Name: importacao_linha; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.importacao_linha (
    importacao_linha_id bigint NOT NULL,
    importacao_lote_id bigint NOT NULL,
    aba_nome_original text NOT NULL,
    aba_ordem integer NOT NULL,
    numero_linha integer NOT NULL,
    dados_brutos jsonb NOT NULL,
    responsavel_digitacao_original text,
    status_linha character varying(40) DEFAULT 'pendente'::character varying NOT NULL,
    mensagem_processamento text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_importacao_linha_aba_nome CHECK ((btrim(aba_nome_original) <> ''::text)),
    CONSTRAINT chk_importacao_linha_aba_ordem CHECK ((aba_ordem > 0)),
    CONSTRAINT chk_importacao_linha_dados_brutos CHECK ((jsonb_typeof(dados_brutos) = 'array'::text)),
    CONSTRAINT chk_importacao_linha_numero CHECK ((numero_linha > 0)),
    CONSTRAINT chk_importacao_linha_status CHECK (((status_linha)::text = ANY ((ARRAY['pendente'::character varying, 'processando'::character varying, 'importada'::character varying, 'importada_com_pendencia'::character varying, 'rejeitada'::character varying, 'ignorada'::character varying])::text[])))
);


--
-- Name: TABLE importacao_linha; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.importacao_linha IS 'Linha de origem preservada antes de normalizacao clinica.';


--
-- Name: COLUMN importacao_linha.dados_brutos; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.importacao_linha.dados_brutos IS 'Array JSONB ordenado de celulas; preserva posicao e cabecalhos repetidos.';


--
-- Name: COLUMN importacao_linha.responsavel_digitacao_original; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.importacao_linha.responsavel_digitacao_original IS 'Texto legado preservado sem equivalencia com usuario autenticado.';


--
-- Name: importacao_linha_importacao_linha_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.importacao_linha_importacao_linha_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: importacao_linha_importacao_linha_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.importacao_linha_importacao_linha_id_seq OWNED BY ambulatorio.importacao_linha.importacao_linha_id;


--
-- Name: importacao_lote; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.importacao_lote (
    importacao_lote_id bigint NOT NULL,
    codigo_lote character varying(100) NOT NULL,
    hash_arquivo_sha256 character varying(64) NOT NULL,
    layout_versao character varying(80) NOT NULL,
    lote_reprocessado_de_id bigint,
    status_lote character varying(40) DEFAULT 'recebido'::character varying NOT NULL,
    iniciado_em timestamp without time zone,
    finalizado_em timestamp without time zone,
    mensagem_erro text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_importacao_lote_hash_sha256 CHECK (((hash_arquivo_sha256)::text ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT chk_importacao_lote_periodo CHECK (((finalizado_em IS NULL) OR (iniciado_em IS NULL) OR (finalizado_em >= iniciado_em))),
    CONSTRAINT chk_importacao_lote_reprocessamento CHECK (((lote_reprocessado_de_id IS NULL) OR (lote_reprocessado_de_id <> importacao_lote_id))),
    CONSTRAINT chk_importacao_lote_status CHECK (((status_lote)::text = ANY ((ARRAY['recebido'::character varying, 'validando'::character varying, 'pronto'::character varying, 'processando'::character varying, 'concluido'::character varying, 'concluido_com_pendencias'::character varying, 'falhou'::character varying, 'cancelado'::character varying])::text[])))
);


--
-- Name: TABLE importacao_lote; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.importacao_lote IS 'Execucao identificada de importacao, incluindo reprocessamentos auditaveis.';


--
-- Name: COLUMN importacao_lote.hash_arquivo_sha256; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.importacao_lote.hash_arquivo_sha256 IS 'SHA-256 hexadecimal minusculo do conteudo de origem, sem caminho local.';


--
-- Name: COLUMN importacao_lote.lote_reprocessado_de_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.importacao_lote.lote_reprocessado_de_id IS 'Execucao anterior do mesmo conteudo e layout quando houver reprocessamento.';


--
-- Name: importacao_lote_importacao_lote_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.importacao_lote_importacao_lote_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: importacao_lote_importacao_lote_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.importacao_lote_importacao_lote_id_seq OWNED BY ambulatorio.importacao_lote.importacao_lote_id;


--
-- Name: importacao_registro; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.importacao_registro (
    importacao_registro_id bigint NOT NULL,
    importacao_linha_id bigint NOT NULL,
    schema_destino character varying(63) DEFAULT 'ambulatorio'::character varying NOT NULL,
    tabela_destino character varying(63) NOT NULL,
    registro_id bigint NOT NULL,
    acao character varying(20) NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_importacao_registro_acao CHECK (((acao)::text = ANY ((ARRAY['criado'::character varying, 'atualizado'::character varying, 'associado'::character varying])::text[]))),
    CONSTRAINT chk_importacao_registro_id CHECK ((registro_id > 0)),
    CONSTRAINT chk_importacao_registro_schema CHECK (((schema_destino)::text = 'ambulatorio'::text)),
    CONSTRAINT chk_importacao_registro_tabela CHECK ((btrim((tabela_destino)::text) <> ''::text))
);


--
-- Name: TABLE importacao_registro; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.importacao_registro IS 'Associacao generica N:N entre linha de origem e registro estruturado.';


--
-- Name: COLUMN importacao_registro.registro_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.importacao_registro.registro_id IS 'Identificador do alvo heterogeneo, validado operacionalmente sem FK polimorfica.';


--
-- Name: importacao_registro_importacao_registro_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.importacao_registro_importacao_registro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: importacao_registro_importacao_registro_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.importacao_registro_importacao_registro_id_seq OWNED BY ambulatorio.importacao_registro.importacao_registro_id;


--
-- Name: medicamento; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.medicamento (
    medicamento_id bigint NOT NULL,
    codigo_medicamento character varying(80) NOT NULL,
    nome_medicamento character varying(150) NOT NULL,
    principio_ativo character varying(150),
    classe_medicamento character varying(120),
    ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE medicamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.medicamento IS 'Catálogo de medicamentos utilizados, prescritos ou registrados no atendimento.';


--
-- Name: COLUMN medicamento.codigo_medicamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.medicamento.codigo_medicamento IS 'Código padronizado do medicamento no sistema.';


--
-- Name: COLUMN medicamento.nome_medicamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.medicamento.nome_medicamento IS 'Nome legível do medicamento.';


--
-- Name: COLUMN medicamento.principio_ativo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.medicamento.principio_ativo IS 'Princípio ativo do medicamento, quando aplicável.';


--
-- Name: COLUMN medicamento.classe_medicamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.medicamento.classe_medicamento IS 'Classe ou grupo terapêutico do medicamento.';


--
-- Name: medicamento_medicamento_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.medicamento_medicamento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medicamento_medicamento_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.medicamento_medicamento_id_seq OWNED BY ambulatorio.medicamento.medicamento_id;


--
-- Name: notificacao; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.notificacao (
    notificacao_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    paciente_notificado boolean,
    numero_notificacao character varying(100),
    justificativa_nao_notificacao text,
    valor_original_notificado text,
    valor_original_numero text,
    valor_original_justificativa text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE notificacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.notificacao IS 'Estado consolidado informado de notificacao do paciente, sem historico de transmissoes.';


--
-- Name: COLUMN notificacao.paciente_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.notificacao.paciente_id IS 'Paciente ao qual pertence o estado consolidado; permite no maximo uma notificacao por paciente.';


--
-- Name: COLUMN notificacao.paciente_notificado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.notificacao.paciente_notificado IS 'Indicador normalizado; NULL representa informacao desconhecida ou ambigua.';


--
-- Name: COLUMN notificacao.numero_notificacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.notificacao.numero_notificacao IS 'Identificador textual informado, sem formato fechado nem unicidade global.';


--
-- Name: COLUMN notificacao.justificativa_nao_notificacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.notificacao.justificativa_nao_notificacao IS 'Justificativa livre informada, sem vocabulario fechado.';


--
-- Name: notificacao_notificacao_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.notificacao_notificacao_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificacao_notificacao_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.notificacao_notificacao_id_seq OWNED BY ambulatorio.notificacao.notificacao_id;


--
-- Name: obito; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.obito (
    obito_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    houve_obito boolean,
    data_obito date,
    causa_obito text,
    valor_original_obito text,
    valor_original_data text,
    valor_original_causa text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE obito; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.obito IS 'Desfecho consolidado de obito do paciente.';


--
-- Name: COLUMN obito.houve_obito; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.obito.houve_obito IS 'Indicador normalizado; NULL representa informacao desconhecida ou ambigua.';


--
-- Name: COLUMN obito.causa_obito; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.obito.causa_obito IS 'Causa em texto livre, sem codificacao clinica nesta fase.';


--
-- Name: obito_obito_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.obito_obito_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: obito_obito_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.obito_obito_id_seq OWNED BY ambulatorio.obito.obito_id;


--
-- Name: paciente; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.paciente (
    paciente_id bigint NOT NULL,
    codigo_planilha character varying(50),
    nome character varying(255) NOT NULL,
    data_nascimento date,
    sexo character varying(30),
    raca character varying(50),
    pertence_comunidade_tradicional boolean,
    tipo_comunidade_tradicional character varying(30),
    grupo_origem_planilha character varying(50),
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_paciente_sexo CHECK (((sexo IS NULL) OR ((sexo)::text = ANY ((ARRAY['feminino'::character varying, 'masculino'::character varying, 'outro'::character varying, 'nao_informado'::character varying])::text[])))),
    CONSTRAINT chk_paciente_tipo_comunidade CHECK (((tipo_comunidade_tradicional IS NULL) OR ((tipo_comunidade_tradicional)::text = ANY ((ARRAY['indigena'::character varying, 'quilombola'::character varying])::text[]))))
);


--
-- Name: TABLE paciente; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.paciente IS 'Tabela principal de pacientes do sistema.';


--
-- Name: COLUMN paciente.paciente_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente.paciente_id IS 'Identificador interno do paciente no banco de dados.';


--
-- Name: COLUMN paciente.codigo_planilha; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente.codigo_planilha IS 'Código ou ID original vindo da planilha, preservado para rastreabilidade.';


--
-- Name: COLUMN paciente.nome; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente.nome IS 'Nome do paciente conforme informado na planilha ou no cadastro.';


--
-- Name: COLUMN paciente.data_nascimento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente.data_nascimento IS 'Data de nascimento do paciente. Usada para cálculo de idade.';


--
-- Name: COLUMN paciente.sexo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente.sexo IS 'Sexo padronizado do paciente. Valores previstos: feminino, masculino, outro, nao_informado.';


--
-- Name: COLUMN paciente.raca; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente.raca IS 'Raça/cor conforme registro original ou padronização posterior.';


--
-- Name: COLUMN paciente.pertence_comunidade_tradicional; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente.pertence_comunidade_tradicional IS 'Indica se o paciente pertence a comunidade indígena ou quilombola.';


--
-- Name: COLUMN paciente.tipo_comunidade_tradicional; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente.tipo_comunidade_tradicional IS 'Tipo de comunidade tradicional: indigena ou quilombola.';


--
-- Name: COLUMN paciente.grupo_origem_planilha; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente.grupo_origem_planilha IS 'Indica se o paciente veio da aba de portador ou não portador de DC na planilha original.';


--
-- Name: paciente_comorbidade; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.paciente_comorbidade (
    paciente_comorbidade_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    comorbidade_id bigint NOT NULL,
    atendimento_id bigint,
    possui_comorbidade boolean DEFAULT true NOT NULL,
    data_registro date,
    observacoes text,
    valor_original_comorbidade text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE paciente_comorbidade; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.paciente_comorbidade IS 'Tabela associativa entre pacientes e comorbidades.';


--
-- Name: COLUMN paciente_comorbidade.paciente_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_comorbidade.paciente_id IS 'Paciente ao qual a comorbidade está associada.';


--
-- Name: COLUMN paciente_comorbidade.comorbidade_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_comorbidade.comorbidade_id IS 'Comorbidade associada ao paciente.';


--
-- Name: COLUMN paciente_comorbidade.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_comorbidade.atendimento_id IS 'Atendimento em que a comorbidade foi registrada, quando aplicável.';


--
-- Name: COLUMN paciente_comorbidade.possui_comorbidade; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_comorbidade.possui_comorbidade IS 'Indica se a comorbidade está presente.';


--
-- Name: COLUMN paciente_comorbidade.data_registro; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_comorbidade.data_registro IS 'Data em que a comorbidade foi registrada.';


--
-- Name: COLUMN paciente_comorbidade.valor_original_comorbidade; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_comorbidade.valor_original_comorbidade IS 'Valor bruto da planilha relacionado à comorbidade.';


--
-- Name: paciente_comorbidade_paciente_comorbidade_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.paciente_comorbidade_paciente_comorbidade_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paciente_comorbidade_paciente_comorbidade_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.paciente_comorbidade_paciente_comorbidade_id_seq OWNED BY ambulatorio.paciente_comorbidade.paciente_comorbidade_id;


--
-- Name: paciente_contato; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.paciente_contato (
    contato_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    telefone character varying(30),
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE paciente_contato; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.paciente_contato IS 'Contatos telefônicos vinculados ao paciente.';


--
-- Name: COLUMN paciente_contato.contato_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_contato.contato_id IS 'Identificador interno do contato.';


--
-- Name: COLUMN paciente_contato.paciente_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_contato.paciente_id IS 'Referência ao paciente dono do contato.';


--
-- Name: COLUMN paciente_contato.telefone; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_contato.telefone IS 'Telefone de contato do paciente.';


--
-- Name: paciente_contato_contato_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.paciente_contato_contato_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paciente_contato_contato_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.paciente_contato_contato_id_seq OWNED BY ambulatorio.paciente_contato.contato_id;


--
-- Name: paciente_endereco; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.paciente_endereco (
    endereco_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    endereco text,
    cidade character varying(120),
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE paciente_endereco; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.paciente_endereco IS 'Endereços vinculados ao paciente. Separado da tabela paciente para permitir evolução futura.';


--
-- Name: COLUMN paciente_endereco.endereco_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_endereco.endereco_id IS 'Identificador interno do endereço.';


--
-- Name: COLUMN paciente_endereco.paciente_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_endereco.paciente_id IS 'Referência ao paciente dono do endereço.';


--
-- Name: COLUMN paciente_endereco.endereco; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_endereco.endereco IS 'Endereço textual conforme origem dos dados.';


--
-- Name: COLUMN paciente_endereco.cidade; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_endereco.cidade IS 'Cidade do paciente.';


--
-- Name: paciente_endereco_endereco_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.paciente_endereco_endereco_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paciente_endereco_endereco_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.paciente_endereco_endereco_id_seq OWNED BY ambulatorio.paciente_endereco.endereco_id;


--
-- Name: paciente_exame_complementar; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.paciente_exame_complementar (
    paciente_exame_complementar_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    atendimento_id bigint,
    tipo_exame_complementar_id bigint NOT NULL,
    bloco_origem character varying(20) NOT NULL,
    tipo_exame_original text,
    resultado_texto text,
    observacoes text,
    valor_original_resultado text,
    valor_original_observacao text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_paciente_exame_bloco CHECK (((bloco_origem)::text = ANY ((ARRAY['trazido'::character varying, 'solicitado'::character varying])::text[])))
);


--
-- Name: TABLE paciente_exame_complementar; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.paciente_exame_complementar IS 'Ocorrencias canonicas de exames complementares pertencentes ao paciente, com atendimento opcional.';


--
-- Name: COLUMN paciente_exame_complementar.paciente_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_exame_complementar.paciente_id IS 'Paciente ao qual a ocorrencia de exame pertence.';


--
-- Name: COLUMN paciente_exame_complementar.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_exame_complementar.atendimento_id IS 'Atendimento clinico opcional; quando informado, deve pertencer ao mesmo paciente.';


--
-- Name: COLUMN paciente_exame_complementar.bloco_origem; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_exame_complementar.bloco_origem IS 'Bloco semantico da origem: trazido ou solicitado.';


--
-- Name: COLUMN paciente_exame_complementar.tipo_exame_original; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_exame_complementar.tipo_exame_original IS 'Rotulo ou tipo livre preservado, inclusive quando o catalogo usa o tipo outro.';


--
-- Name: COLUMN paciente_exame_complementar.resultado_texto; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_exame_complementar.resultado_texto IS 'Resultado livre sem interpretacao clinica automatica.';


--
-- Name: COLUMN paciente_exame_complementar.atualizado_em; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_exame_complementar.atualizado_em IS 'Timestamp de processamento atualizado explicitamente pela aplicacao ou importador.';


--
-- Name: paciente_exame_complementar_paciente_exame_complementar_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.paciente_exame_complementar_paciente_exame_complementar_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paciente_exame_complementar_paciente_exame_complementar_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.paciente_exame_complementar_paciente_exame_complementar_id_seq OWNED BY ambulatorio.paciente_exame_complementar.paciente_exame_complementar_id;


--
-- Name: paciente_paciente_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.paciente_paciente_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paciente_paciente_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.paciente_paciente_id_seq OWNED BY ambulatorio.paciente.paciente_id;


--
-- Name: paciente_projeto_estudo; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.paciente_projeto_estudo (
    paciente_projeto_estudo_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    projeto_estudo_id bigint NOT NULL,
    participa boolean,
    possui_pendencia boolean,
    descricao_pendencia text,
    houve_falha boolean,
    descricao_falha text,
    valor_original_participacao text,
    valor_original_pendencia text,
    valor_original_falha text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE paciente_projeto_estudo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.paciente_projeto_estudo IS 'Estado consolidado da relacao entre paciente e projeto oficial, independente de atendimento.';


--
-- Name: COLUMN paciente_projeto_estudo.participa; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_projeto_estudo.participa IS 'Estado triestado de participacao: verdadeiro, falso ou nao informado.';


--
-- Name: COLUMN paciente_projeto_estudo.possui_pendencia; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_projeto_estudo.possui_pendencia IS 'Estado triestado de pendencia: verdadeiro, falso ou nao informado.';


--
-- Name: COLUMN paciente_projeto_estudo.houve_falha; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_projeto_estudo.houve_falha IS 'Estado triestado de falha no projeto principal: verdadeiro, falso ou nao informado.';


--
-- Name: COLUMN paciente_projeto_estudo.atualizado_em; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.paciente_projeto_estudo.atualizado_em IS 'Timestamp de processamento atualizado explicitamente pela aplicacao ou importador.';


--
-- Name: paciente_projeto_estudo_paciente_projeto_estudo_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.paciente_projeto_estudo_paciente_projeto_estudo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paciente_projeto_estudo_paciente_projeto_estudo_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.paciente_projeto_estudo_paciente_projeto_estudo_id_seq OWNED BY ambulatorio.paciente_projeto_estudo.paciente_projeto_estudo_id;


--
-- Name: pendencia_atendimento; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.pendencia_atendimento (
    pendencia_atendimento_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    tipo_pendencia character varying(80),
    descricao text,
    status_pendencia character varying(40),
    data_identificacao date,
    data_resolucao date,
    responsavel character varying(150),
    valor_original_pendencia text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_pendencia_status CHECK (((status_pendencia IS NULL) OR ((status_pendencia)::text = ANY ((ARRAY['aberta'::character varying, 'em_andamento'::character varying, 'resolvida'::character varying, 'cancelada'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE pendencia_atendimento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.pendencia_atendimento IS 'Pendências gerais associadas a um atendimento.';


--
-- Name: COLUMN pendencia_atendimento.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.pendencia_atendimento.atendimento_id IS 'Atendimento ao qual a pendência está associada.';


--
-- Name: COLUMN pendencia_atendimento.tipo_pendencia; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.pendencia_atendimento.tipo_pendencia IS 'Tipo da pendência registrada.';


--
-- Name: COLUMN pendencia_atendimento.descricao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.pendencia_atendimento.descricao IS 'Descrição textual da pendência.';


--
-- Name: COLUMN pendencia_atendimento.status_pendencia; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.pendencia_atendimento.status_pendencia IS 'Status da pendência: aberta, em_andamento, resolvida, cancelada ou nao_informado.';


--
-- Name: COLUMN pendencia_atendimento.data_identificacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.pendencia_atendimento.data_identificacao IS 'Data em que a pendência foi identificada.';


--
-- Name: COLUMN pendencia_atendimento.data_resolucao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.pendencia_atendimento.data_resolucao IS 'Data em que a pendência foi resolvida.';


--
-- Name: COLUMN pendencia_atendimento.responsavel; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.pendencia_atendimento.responsavel IS 'Pessoa ou setor responsável pela pendência.';


--
-- Name: pendencia_atendimento_pendencia_atendimento_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.pendencia_atendimento_pendencia_atendimento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pendencia_atendimento_pendencia_atendimento_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.pendencia_atendimento_pendencia_atendimento_id_seq OWNED BY ambulatorio.pendencia_atendimento.pendencia_atendimento_id;


--
-- Name: procedimento_clinico; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.procedimento_clinico (
    procedimento_clinico_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    tipo_procedimento character varying(120),
    descricao text,
    data_procedimento date,
    status_procedimento character varying(40),
    responsavel character varying(150),
    resultado text,
    conduta_pos_procedimento text,
    valor_original_procedimento text,
    valor_original_resultado text,
    valor_original_conduta text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_procedimento_clinico_status CHECK (((status_procedimento IS NULL) OR ((status_procedimento)::text = ANY ((ARRAY['indicado'::character varying, 'solicitado'::character varying, 'realizado'::character varying, 'pendente'::character varying, 'cancelado'::character varying, 'nao_realizado'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE procedimento_clinico; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.procedimento_clinico IS 'Procedimentos, condutas clínicas ou intervenções registrados no atendimento.';


--
-- Name: COLUMN procedimento_clinico.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.procedimento_clinico.atendimento_id IS 'Atendimento ao qual o procedimento está associado.';


--
-- Name: COLUMN procedimento_clinico.tipo_procedimento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.procedimento_clinico.tipo_procedimento IS 'Tipo ou nome do procedimento clínico.';


--
-- Name: COLUMN procedimento_clinico.descricao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.procedimento_clinico.descricao IS 'Descrição textual do procedimento ou conduta.';


--
-- Name: COLUMN procedimento_clinico.data_procedimento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.procedimento_clinico.data_procedimento IS 'Data em que o procedimento foi realizado ou indicado.';


--
-- Name: COLUMN procedimento_clinico.status_procedimento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.procedimento_clinico.status_procedimento IS 'Status do procedimento: indicado, solicitado, realizado, pendente, cancelado, nao_realizado ou nao_informado.';


--
-- Name: COLUMN procedimento_clinico.responsavel; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.procedimento_clinico.responsavel IS 'Profissional ou setor responsável pelo procedimento.';


--
-- Name: COLUMN procedimento_clinico.resultado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.procedimento_clinico.resultado IS 'Resultado textual do procedimento, quando aplicável.';


--
-- Name: COLUMN procedimento_clinico.conduta_pos_procedimento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.procedimento_clinico.conduta_pos_procedimento IS 'Conduta definida após o procedimento.';


--
-- Name: procedimento_clinico_procedimento_clinico_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.procedimento_clinico_procedimento_clinico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: procedimento_clinico_procedimento_clinico_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.procedimento_clinico_procedimento_clinico_id_seq OWNED BY ambulatorio.procedimento_clinico.procedimento_clinico_id;


--
-- Name: projeto_estudo; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.projeto_estudo (
    projeto_estudo_id bigint NOT NULL,
    codigo_projeto character varying(80) NOT NULL,
    nome_projeto character varying(150) NOT NULL,
    descricao text,
    ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE projeto_estudo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.projeto_estudo IS 'Tabela de catálogo dos projetos, estudos ou pesquisas associados aos atendimentos.';


--
-- Name: COLUMN projeto_estudo.projeto_estudo_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.projeto_estudo.projeto_estudo_id IS 'Identificador interno do projeto ou estudo.';


--
-- Name: COLUMN projeto_estudo.codigo_projeto; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.projeto_estudo.codigo_projeto IS 'Código padronizado do projeto, usado internamente no sistema.';


--
-- Name: COLUMN projeto_estudo.nome_projeto; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.projeto_estudo.nome_projeto IS 'Nome legível do projeto ou estudo conforme origem dos dados.';


--
-- Name: COLUMN projeto_estudo.descricao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.projeto_estudo.descricao IS 'Descrição opcional do projeto ou estudo.';


--
-- Name: COLUMN projeto_estudo.ativo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.projeto_estudo.ativo IS 'Indica se o projeto ainda está ativo no sistema.';


--
-- Name: projeto_estudo_projeto_estudo_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.projeto_estudo_projeto_estudo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projeto_estudo_projeto_estudo_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.projeto_estudo_projeto_estudo_id_seq OWNED BY ambulatorio.projeto_estudo.projeto_estudo_id;


--
-- Name: sorologia_chagas; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.sorologia_chagas (
    sorologia_chagas_id bigint NOT NULL,
    diagnostico_chagas_id bigint NOT NULL,
    numero_metodo_planilha smallint,
    metodo_sorologico character varying(120),
    data_solicitacao date,
    data_coleta date,
    data_resultado date,
    resultado character varying(30),
    laboratorio character varying(120),
    valor_original_metodo text,
    valor_original_data text,
    valor_original_resultado text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_sorologia_chagas_numero_metodo CHECK (((numero_metodo_planilha IS NULL) OR ((numero_metodo_planilha >= 1) AND (numero_metodo_planilha <= 3)))),
    CONSTRAINT chk_sorologia_chagas_resultado CHECK (((resultado IS NULL) OR ((resultado)::text = ANY ((ARRAY['reagente'::character varying, 'nao_reagente'::character varying, 'inconclusivo'::character varying, 'indeterminado'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE sorologia_chagas; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.sorologia_chagas IS 'Sorologias relacionadas ao diagnóstico de doença de Chagas.';


--
-- Name: COLUMN sorologia_chagas.diagnostico_chagas_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_chagas.diagnostico_chagas_id IS 'Diagnóstico de Chagas ao qual a sorologia pertence.';


--
-- Name: COLUMN sorologia_chagas.numero_metodo_planilha; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_chagas.numero_metodo_planilha IS 'Número do método na planilha original, por exemplo método 1, 2 ou 3.';


--
-- Name: COLUMN sorologia_chagas.metodo_sorologico; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_chagas.metodo_sorologico IS 'Método sorológico utilizado, quando informado.';


--
-- Name: COLUMN sorologia_chagas.data_solicitacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_chagas.data_solicitacao IS 'Data em que a sorologia foi solicitada.';


--
-- Name: COLUMN sorologia_chagas.data_coleta; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_chagas.data_coleta IS 'Data de coleta da amostra, quando disponível.';


--
-- Name: COLUMN sorologia_chagas.data_resultado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_chagas.data_resultado IS 'Data do resultado da sorologia.';


--
-- Name: COLUMN sorologia_chagas.resultado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_chagas.resultado IS 'Resultado padronizado da sorologia.';


--
-- Name: COLUMN sorologia_chagas.valor_original_metodo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_chagas.valor_original_metodo IS 'Valor bruto da coluna de método sorológico na planilha.';


--
-- Name: COLUMN sorologia_chagas.valor_original_data; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_chagas.valor_original_data IS 'Valor bruto da coluna de data da sorologia na planilha.';


--
-- Name: COLUMN sorologia_chagas.valor_original_resultado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_chagas.valor_original_resultado IS 'Valor bruto da coluna de resultado da sorologia na planilha.';


--
-- Name: sorologia_chagas_sorologia_chagas_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.sorologia_chagas_sorologia_chagas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sorologia_chagas_sorologia_chagas_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.sorologia_chagas_sorologia_chagas_id_seq OWNED BY ambulatorio.sorologia_chagas.sorologia_chagas_id;


--
-- Name: sorologia_solicitacao; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.sorologia_solicitacao (
    sorologia_solicitacao_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    solicitada boolean DEFAULT true NOT NULL,
    data_solicitacao date,
    tipo_solicitacao character varying(120),
    status_solicitacao character varying(30),
    valor_original_solicitacao text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_sorologia_solicitacao_status CHECK (((status_solicitacao IS NULL) OR ((status_solicitacao)::text = ANY ((ARRAY['solicitada'::character varying, 'realizada'::character varying, 'pendente'::character varying, 'cancelada'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE sorologia_solicitacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.sorologia_solicitacao IS 'Solicitações de sorologia vinculadas ao atendimento.';


--
-- Name: COLUMN sorologia_solicitacao.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_solicitacao.atendimento_id IS 'Atendimento em que a sorologia foi solicitada.';


--
-- Name: COLUMN sorologia_solicitacao.solicitada; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_solicitacao.solicitada IS 'Indica se houve solicitação de sorologia.';


--
-- Name: COLUMN sorologia_solicitacao.tipo_solicitacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_solicitacao.tipo_solicitacao IS 'Tipo ou descrição da sorologia solicitada.';


--
-- Name: COLUMN sorologia_solicitacao.status_solicitacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_solicitacao.status_solicitacao IS 'Status da solicitação: solicitada, realizada, pendente, cancelada ou nao_informado.';


--
-- Name: COLUMN sorologia_solicitacao.valor_original_solicitacao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.sorologia_solicitacao.valor_original_solicitacao IS 'Valor bruto da planilha relacionado à solicitação de sorologia.';


--
-- Name: sorologia_solicitacao_sorologia_solicitacao_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.sorologia_solicitacao_sorologia_solicitacao_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sorologia_solicitacao_sorologia_solicitacao_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.sorologia_solicitacao_sorologia_solicitacao_id_seq OWNED BY ambulatorio.sorologia_solicitacao.sorologia_solicitacao_id;


--
-- Name: tipo_encaminhamento; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.tipo_encaminhamento (
    tipo_encaminhamento_id bigint NOT NULL,
    codigo_tipo character varying(80) NOT NULL,
    nome_tipo character varying(150) NOT NULL,
    descricao text,
    ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE tipo_encaminhamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.tipo_encaminhamento IS 'Catálogo de tipos de encaminhamento possíveis.';


--
-- Name: COLUMN tipo_encaminhamento.codigo_tipo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tipo_encaminhamento.codigo_tipo IS 'Código padronizado do tipo de encaminhamento.';


--
-- Name: COLUMN tipo_encaminhamento.nome_tipo; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tipo_encaminhamento.nome_tipo IS 'Nome legível do tipo de encaminhamento.';


--
-- Name: COLUMN tipo_encaminhamento.descricao; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tipo_encaminhamento.descricao IS 'Descrição opcional do tipo de encaminhamento.';


--
-- Name: tipo_encaminhamento_tipo_encaminhamento_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.tipo_encaminhamento_tipo_encaminhamento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_encaminhamento_tipo_encaminhamento_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.tipo_encaminhamento_tipo_encaminhamento_id_seq OWNED BY ambulatorio.tipo_encaminhamento.tipo_encaminhamento_id;


--
-- Name: tipo_exame_complementar; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.tipo_exame_complementar (
    tipo_exame_complementar_id bigint NOT NULL,
    codigo_exame character varying(80) NOT NULL,
    nome_exame character varying(150) NOT NULL,
    categoria character varying(50),
    descricao text,
    ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_tipo_exame_complementar_categoria CHECK (((categoria IS NULL) OR ((categoria)::text = ANY ((ARRAY['cardiologico'::character varying, 'laboratorial'::character varying, 'imagem'::character varying, 'funcional'::character varying, 'outro'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE tipo_exame_complementar; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.tipo_exame_complementar IS 'Catálogo de tipos de exames complementares.';


--
-- Name: COLUMN tipo_exame_complementar.codigo_exame; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tipo_exame_complementar.codigo_exame IS 'Código padronizado do exame complementar.';


--
-- Name: COLUMN tipo_exame_complementar.nome_exame; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tipo_exame_complementar.nome_exame IS 'Nome legível do exame complementar.';


--
-- Name: COLUMN tipo_exame_complementar.categoria; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tipo_exame_complementar.categoria IS 'Categoria do exame: cardiologico, laboratorial, imagem, funcional, outro ou nao_informado.';


--
-- Name: tipo_exame_complementar_tipo_exame_complementar_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.tipo_exame_complementar_tipo_exame_complementar_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_exame_complementar_tipo_exame_complementar_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.tipo_exame_complementar_tipo_exame_complementar_id_seq OWNED BY ambulatorio.tipo_exame_complementar.tipo_exame_complementar_id;


--
-- Name: tratamento_chagas; Type: TABLE; Schema: ambulatorio; Owner: -
--

CREATE TABLE ambulatorio.tratamento_chagas (
    tratamento_chagas_id bigint NOT NULL,
    atendimento_id bigint NOT NULL,
    medicamento_id bigint,
    indicado boolean,
    iniciado boolean,
    concluido boolean,
    status_tratamento character varying(40),
    motivo_nao_tratamento text,
    data_indicacao date,
    data_inicio date,
    data_fim date,
    esquema_terapeutico text,
    eventos_adversos boolean,
    descricao_eventos_adversos text,
    adesao_tratamento character varying(40),
    valor_original_tratamento text,
    valor_original_status text,
    valor_original_eventos_adversos text,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_tratamento_chagas_adesao CHECK (((adesao_tratamento IS NULL) OR ((adesao_tratamento)::text = ANY ((ARRAY['boa'::character varying, 'parcial'::character varying, 'baixa'::character varying, 'desconhecida'::character varying, 'nao_informado'::character varying])::text[])))),
    CONSTRAINT chk_tratamento_chagas_status CHECK (((status_tratamento IS NULL) OR ((status_tratamento)::text = ANY ((ARRAY['indicado'::character varying, 'em_andamento'::character varying, 'concluido'::character varying, 'suspenso'::character varying, 'contraindicado'::character varying, 'nao_iniciado'::character varying, 'nao_informado'::character varying])::text[]))))
);


--
-- Name: TABLE tratamento_chagas; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON TABLE ambulatorio.tratamento_chagas IS 'Registro de tratamento etiológico ou específico para doença de Chagas associado ao atendimento.';


--
-- Name: COLUMN tratamento_chagas.atendimento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tratamento_chagas.atendimento_id IS 'Atendimento ao qual o tratamento está associado.';


--
-- Name: COLUMN tratamento_chagas.medicamento_id; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tratamento_chagas.medicamento_id IS 'Medicamento usado no tratamento, quando identificado no catálogo.';


--
-- Name: COLUMN tratamento_chagas.indicado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tratamento_chagas.indicado IS 'Indica se o tratamento foi indicado.';


--
-- Name: COLUMN tratamento_chagas.iniciado; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tratamento_chagas.iniciado IS 'Indica se o tratamento foi iniciado.';


--
-- Name: COLUMN tratamento_chagas.concluido; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tratamento_chagas.concluido IS 'Indica se o tratamento foi concluído.';


--
-- Name: COLUMN tratamento_chagas.status_tratamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tratamento_chagas.status_tratamento IS 'Status do tratamento: indicado, em_andamento, concluido, suspenso, contraindicado, nao_iniciado ou nao_informado.';


--
-- Name: COLUMN tratamento_chagas.motivo_nao_tratamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tratamento_chagas.motivo_nao_tratamento IS 'Motivo para não realizar ou não iniciar o tratamento, quando informado.';


--
-- Name: COLUMN tratamento_chagas.esquema_terapeutico; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tratamento_chagas.esquema_terapeutico IS 'Descrição do esquema terapêutico usado.';


--
-- Name: COLUMN tratamento_chagas.eventos_adversos; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tratamento_chagas.eventos_adversos IS 'Indica se houve eventos adversos relacionados ao tratamento.';


--
-- Name: COLUMN tratamento_chagas.descricao_eventos_adversos; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tratamento_chagas.descricao_eventos_adversos IS 'Descrição textual dos eventos adversos.';


--
-- Name: COLUMN tratamento_chagas.adesao_tratamento; Type: COMMENT; Schema: ambulatorio; Owner: -
--

COMMENT ON COLUMN ambulatorio.tratamento_chagas.adesao_tratamento IS 'Adesão ao tratamento: boa, parcial, baixa, desconhecida ou nao_informado.';


--
-- Name: tratamento_chagas_tratamento_chagas_id_seq; Type: SEQUENCE; Schema: ambulatorio; Owner: -
--

CREATE SEQUENCE ambulatorio.tratamento_chagas_tratamento_chagas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tratamento_chagas_tratamento_chagas_id_seq; Type: SEQUENCE OWNED BY; Schema: ambulatorio; Owner: -
--

ALTER SEQUENCE ambulatorio.tratamento_chagas_tratamento_chagas_id_seq OWNED BY ambulatorio.tratamento_chagas.tratamento_chagas_id;


--
-- Name: acompanhamento_cuidado acompanhamento_cuidado_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.acompanhamento_cuidado ALTER COLUMN acompanhamento_cuidado_id SET DEFAULT nextval('ambulatorio.acompanhamento_cuidado_acompanhamento_cuidado_id_seq'::regclass);


--
-- Name: atendimento atendimento_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento ALTER COLUMN atendimento_id SET DEFAULT nextval('ambulatorio.atendimento_atendimento_id_seq'::regclass);


--
-- Name: atendimento_exame_complementar atendimento_exame_complementar_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_exame_complementar ALTER COLUMN atendimento_exame_complementar_id SET DEFAULT nextval('ambulatorio.atendimento_exame_complementa_atendimento_exame_complementa_seq'::regclass);


--
-- Name: atendimento_medicamento atendimento_medicamento_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_medicamento ALTER COLUMN atendimento_medicamento_id SET DEFAULT nextval('ambulatorio.atendimento_medicamento_atendimento_medicamento_id_seq'::regclass);


--
-- Name: atendimento_projeto_estudo atendimento_projeto_estudo_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_projeto_estudo ALTER COLUMN atendimento_projeto_estudo_id SET DEFAULT nextval('ambulatorio.atendimento_projeto_estudo_atendimento_projeto_estudo_id_seq'::regclass);


--
-- Name: comorbidade comorbidade_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.comorbidade ALTER COLUMN comorbidade_id SET DEFAULT nextval('ambulatorio.comorbidade_comorbidade_id_seq'::regclass);


--
-- Name: complicacao_chagas complicacao_chagas_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.complicacao_chagas ALTER COLUMN complicacao_chagas_id SET DEFAULT nextval('ambulatorio.complicacao_chagas_complicacao_chagas_id_seq'::regclass);


--
-- Name: condicao_chagas condicao_chagas_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.condicao_chagas ALTER COLUMN condicao_chagas_id SET DEFAULT nextval('ambulatorio.condicao_chagas_condicao_chagas_id_seq'::regclass);


--
-- Name: dados_clinicos_atendimento dados_clinicos_atendimento_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.dados_clinicos_atendimento ALTER COLUMN dados_clinicos_atendimento_id SET DEFAULT nextval('ambulatorio.dados_clinicos_atendimento_dados_clinicos_atendimento_id_seq'::regclass);


--
-- Name: diagnostico_chagas diagnostico_chagas_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.diagnostico_chagas ALTER COLUMN diagnostico_chagas_id SET DEFAULT nextval('ambulatorio.diagnostico_chagas_diagnostico_chagas_id_seq'::regclass);


--
-- Name: dispositivo_implantado dispositivo_implantado_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.dispositivo_implantado ALTER COLUMN dispositivo_implantado_id SET DEFAULT nextval('ambulatorio.dispositivo_implantado_dispositivo_implantado_id_seq'::regclass);


--
-- Name: encaminhamento encaminhamento_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.encaminhamento ALTER COLUMN encaminhamento_id SET DEFAULT nextval('ambulatorio.encaminhamento_encaminhamento_id_seq'::regclass);


--
-- Name: evento_clinico evento_clinico_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.evento_clinico ALTER COLUMN evento_clinico_id SET DEFAULT nextval('ambulatorio.evento_clinico_evento_clinico_id_seq'::regclass);


--
-- Name: exame_complementar_resultado exame_complementar_resultado_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.exame_complementar_resultado ALTER COLUMN exame_complementar_resultado_id SET DEFAULT nextval('ambulatorio.exame_complementar_resultado_exame_complementar_resultado_i_seq'::regclass);


--
-- Name: historico_familiar_chagas historico_familiar_chagas_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.historico_familiar_chagas ALTER COLUMN historico_familiar_chagas_id SET DEFAULT nextval('ambulatorio.historico_familiar_chagas_historico_familiar_chagas_id_seq'::regclass);


--
-- Name: importacao_linha importacao_linha_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_linha ALTER COLUMN importacao_linha_id SET DEFAULT nextval('ambulatorio.importacao_linha_importacao_linha_id_seq'::regclass);


--
-- Name: importacao_lote importacao_lote_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_lote ALTER COLUMN importacao_lote_id SET DEFAULT nextval('ambulatorio.importacao_lote_importacao_lote_id_seq'::regclass);


--
-- Name: importacao_registro importacao_registro_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_registro ALTER COLUMN importacao_registro_id SET DEFAULT nextval('ambulatorio.importacao_registro_importacao_registro_id_seq'::regclass);


--
-- Name: medicamento medicamento_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.medicamento ALTER COLUMN medicamento_id SET DEFAULT nextval('ambulatorio.medicamento_medicamento_id_seq'::regclass);


--
-- Name: notificacao notificacao_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.notificacao ALTER COLUMN notificacao_id SET DEFAULT nextval('ambulatorio.notificacao_notificacao_id_seq'::regclass);


--
-- Name: obito obito_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.obito ALTER COLUMN obito_id SET DEFAULT nextval('ambulatorio.obito_obito_id_seq'::regclass);


--
-- Name: paciente paciente_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente ALTER COLUMN paciente_id SET DEFAULT nextval('ambulatorio.paciente_paciente_id_seq'::regclass);


--
-- Name: paciente_comorbidade paciente_comorbidade_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_comorbidade ALTER COLUMN paciente_comorbidade_id SET DEFAULT nextval('ambulatorio.paciente_comorbidade_paciente_comorbidade_id_seq'::regclass);


--
-- Name: paciente_contato contato_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_contato ALTER COLUMN contato_id SET DEFAULT nextval('ambulatorio.paciente_contato_contato_id_seq'::regclass);


--
-- Name: paciente_endereco endereco_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_endereco ALTER COLUMN endereco_id SET DEFAULT nextval('ambulatorio.paciente_endereco_endereco_id_seq'::regclass);


--
-- Name: paciente_exame_complementar paciente_exame_complementar_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_exame_complementar ALTER COLUMN paciente_exame_complementar_id SET DEFAULT nextval('ambulatorio.paciente_exame_complementar_paciente_exame_complementar_id_seq'::regclass);


--
-- Name: paciente_projeto_estudo paciente_projeto_estudo_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_projeto_estudo ALTER COLUMN paciente_projeto_estudo_id SET DEFAULT nextval('ambulatorio.paciente_projeto_estudo_paciente_projeto_estudo_id_seq'::regclass);


--
-- Name: pendencia_atendimento pendencia_atendimento_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.pendencia_atendimento ALTER COLUMN pendencia_atendimento_id SET DEFAULT nextval('ambulatorio.pendencia_atendimento_pendencia_atendimento_id_seq'::regclass);


--
-- Name: procedimento_clinico procedimento_clinico_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.procedimento_clinico ALTER COLUMN procedimento_clinico_id SET DEFAULT nextval('ambulatorio.procedimento_clinico_procedimento_clinico_id_seq'::regclass);


--
-- Name: projeto_estudo projeto_estudo_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.projeto_estudo ALTER COLUMN projeto_estudo_id SET DEFAULT nextval('ambulatorio.projeto_estudo_projeto_estudo_id_seq'::regclass);


--
-- Name: sorologia_chagas sorologia_chagas_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.sorologia_chagas ALTER COLUMN sorologia_chagas_id SET DEFAULT nextval('ambulatorio.sorologia_chagas_sorologia_chagas_id_seq'::regclass);


--
-- Name: sorologia_solicitacao sorologia_solicitacao_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.sorologia_solicitacao ALTER COLUMN sorologia_solicitacao_id SET DEFAULT nextval('ambulatorio.sorologia_solicitacao_sorologia_solicitacao_id_seq'::regclass);


--
-- Name: tipo_encaminhamento tipo_encaminhamento_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.tipo_encaminhamento ALTER COLUMN tipo_encaminhamento_id SET DEFAULT nextval('ambulatorio.tipo_encaminhamento_tipo_encaminhamento_id_seq'::regclass);


--
-- Name: tipo_exame_complementar tipo_exame_complementar_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.tipo_exame_complementar ALTER COLUMN tipo_exame_complementar_id SET DEFAULT nextval('ambulatorio.tipo_exame_complementar_tipo_exame_complementar_id_seq'::regclass);


--
-- Name: tratamento_chagas tratamento_chagas_id; Type: DEFAULT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.tratamento_chagas ALTER COLUMN tratamento_chagas_id SET DEFAULT nextval('ambulatorio.tratamento_chagas_tratamento_chagas_id_seq'::regclass);


--
-- Name: acompanhamento_cuidado acompanhamento_cuidado_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.acompanhamento_cuidado
    ADD CONSTRAINT acompanhamento_cuidado_pkey PRIMARY KEY (acompanhamento_cuidado_id);


--
-- Name: atendimento_exame_complementar atendimento_exame_complementar_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_exame_complementar
    ADD CONSTRAINT atendimento_exame_complementar_pkey PRIMARY KEY (atendimento_exame_complementar_id);


--
-- Name: atendimento_medicamento atendimento_medicamento_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_medicamento
    ADD CONSTRAINT atendimento_medicamento_pkey PRIMARY KEY (atendimento_medicamento_id);


--
-- Name: atendimento atendimento_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento
    ADD CONSTRAINT atendimento_pkey PRIMARY KEY (atendimento_id);


--
-- Name: atendimento_projeto_estudo atendimento_projeto_estudo_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_projeto_estudo
    ADD CONSTRAINT atendimento_projeto_estudo_pkey PRIMARY KEY (atendimento_projeto_estudo_id);


--
-- Name: comorbidade comorbidade_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.comorbidade
    ADD CONSTRAINT comorbidade_pkey PRIMARY KEY (comorbidade_id);


--
-- Name: complicacao_chagas complicacao_chagas_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.complicacao_chagas
    ADD CONSTRAINT complicacao_chagas_pkey PRIMARY KEY (complicacao_chagas_id);


--
-- Name: condicao_chagas condicao_chagas_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.condicao_chagas
    ADD CONSTRAINT condicao_chagas_pkey PRIMARY KEY (condicao_chagas_id);


--
-- Name: dados_clinicos_atendimento dados_clinicos_atendimento_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.dados_clinicos_atendimento
    ADD CONSTRAINT dados_clinicos_atendimento_pkey PRIMARY KEY (dados_clinicos_atendimento_id);


--
-- Name: diagnostico_chagas diagnostico_chagas_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.diagnostico_chagas
    ADD CONSTRAINT diagnostico_chagas_pkey PRIMARY KEY (diagnostico_chagas_id);


--
-- Name: dispositivo_implantado dispositivo_implantado_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.dispositivo_implantado
    ADD CONSTRAINT dispositivo_implantado_pkey PRIMARY KEY (dispositivo_implantado_id);


--
-- Name: encaminhamento encaminhamento_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.encaminhamento
    ADD CONSTRAINT encaminhamento_pkey PRIMARY KEY (encaminhamento_id);


--
-- Name: evento_clinico evento_clinico_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.evento_clinico
    ADD CONSTRAINT evento_clinico_pkey PRIMARY KEY (evento_clinico_id);


--
-- Name: exame_complementar_resultado exame_complementar_resultado_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.exame_complementar_resultado
    ADD CONSTRAINT exame_complementar_resultado_pkey PRIMARY KEY (exame_complementar_resultado_id);


--
-- Name: historico_familiar_chagas historico_familiar_chagas_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.historico_familiar_chagas
    ADD CONSTRAINT historico_familiar_chagas_pkey PRIMARY KEY (historico_familiar_chagas_id);


--
-- Name: importacao_linha importacao_linha_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_linha
    ADD CONSTRAINT importacao_linha_pkey PRIMARY KEY (importacao_linha_id);


--
-- Name: importacao_lote importacao_lote_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_lote
    ADD CONSTRAINT importacao_lote_pkey PRIMARY KEY (importacao_lote_id);


--
-- Name: importacao_registro importacao_registro_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_registro
    ADD CONSTRAINT importacao_registro_pkey PRIMARY KEY (importacao_registro_id);


--
-- Name: medicamento medicamento_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.medicamento
    ADD CONSTRAINT medicamento_pkey PRIMARY KEY (medicamento_id);


--
-- Name: notificacao notificacao_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.notificacao
    ADD CONSTRAINT notificacao_pkey PRIMARY KEY (notificacao_id);


--
-- Name: obito obito_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.obito
    ADD CONSTRAINT obito_pkey PRIMARY KEY (obito_id);


--
-- Name: paciente_comorbidade paciente_comorbidade_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_comorbidade
    ADD CONSTRAINT paciente_comorbidade_pkey PRIMARY KEY (paciente_comorbidade_id);


--
-- Name: paciente_contato paciente_contato_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_contato
    ADD CONSTRAINT paciente_contato_pkey PRIMARY KEY (contato_id);


--
-- Name: paciente_endereco paciente_endereco_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_endereco
    ADD CONSTRAINT paciente_endereco_pkey PRIMARY KEY (endereco_id);


--
-- Name: paciente_exame_complementar paciente_exame_complementar_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_exame_complementar
    ADD CONSTRAINT paciente_exame_complementar_pkey PRIMARY KEY (paciente_exame_complementar_id);


--
-- Name: paciente paciente_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente
    ADD CONSTRAINT paciente_pkey PRIMARY KEY (paciente_id);


--
-- Name: paciente_projeto_estudo paciente_projeto_estudo_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_projeto_estudo
    ADD CONSTRAINT paciente_projeto_estudo_pkey PRIMARY KEY (paciente_projeto_estudo_id);


--
-- Name: pendencia_atendimento pendencia_atendimento_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.pendencia_atendimento
    ADD CONSTRAINT pendencia_atendimento_pkey PRIMARY KEY (pendencia_atendimento_id);


--
-- Name: procedimento_clinico procedimento_clinico_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.procedimento_clinico
    ADD CONSTRAINT procedimento_clinico_pkey PRIMARY KEY (procedimento_clinico_id);


--
-- Name: projeto_estudo projeto_estudo_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.projeto_estudo
    ADD CONSTRAINT projeto_estudo_pkey PRIMARY KEY (projeto_estudo_id);


--
-- Name: sorologia_chagas sorologia_chagas_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.sorologia_chagas
    ADD CONSTRAINT sorologia_chagas_pkey PRIMARY KEY (sorologia_chagas_id);


--
-- Name: sorologia_solicitacao sorologia_solicitacao_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.sorologia_solicitacao
    ADD CONSTRAINT sorologia_solicitacao_pkey PRIMARY KEY (sorologia_solicitacao_id);


--
-- Name: tipo_encaminhamento tipo_encaminhamento_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.tipo_encaminhamento
    ADD CONSTRAINT tipo_encaminhamento_pkey PRIMARY KEY (tipo_encaminhamento_id);


--
-- Name: tipo_exame_complementar tipo_exame_complementar_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.tipo_exame_complementar
    ADD CONSTRAINT tipo_exame_complementar_pkey PRIMARY KEY (tipo_exame_complementar_id);


--
-- Name: tratamento_chagas tratamento_chagas_pkey; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.tratamento_chagas
    ADD CONSTRAINT tratamento_chagas_pkey PRIMARY KEY (tratamento_chagas_id);


--
-- Name: atendimento uq_atendimento_id_paciente; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento
    ADD CONSTRAINT uq_atendimento_id_paciente UNIQUE (atendimento_id, paciente_id);


--
-- Name: atendimento_projeto_estudo uq_atendimento_projeto; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_projeto_estudo
    ADD CONSTRAINT uq_atendimento_projeto UNIQUE (atendimento_id, projeto_estudo_id);


--
-- Name: comorbidade uq_comorbidade_nome; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.comorbidade
    ADD CONSTRAINT uq_comorbidade_nome UNIQUE (nome_comorbidade);


--
-- Name: condicao_chagas uq_condicao_chagas_atendimento; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.condicao_chagas
    ADD CONSTRAINT uq_condicao_chagas_atendimento UNIQUE (atendimento_id);


--
-- Name: dados_clinicos_atendimento uq_dados_clinicos_atendimento_atendimento; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.dados_clinicos_atendimento
    ADD CONSTRAINT uq_dados_clinicos_atendimento_atendimento UNIQUE (atendimento_id);


--
-- Name: diagnostico_chagas uq_diagnostico_chagas_atendimento; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.diagnostico_chagas
    ADD CONSTRAINT uq_diagnostico_chagas_atendimento UNIQUE (atendimento_id);


--
-- Name: dispositivo_implantado uq_dispositivo_implantado_paciente_tipo; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.dispositivo_implantado
    ADD CONSTRAINT uq_dispositivo_implantado_paciente_tipo UNIQUE (paciente_id, tipo_dispositivo);


--
-- Name: historico_familiar_chagas uq_historico_familiar_chagas_paciente; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.historico_familiar_chagas
    ADD CONSTRAINT uq_historico_familiar_chagas_paciente UNIQUE (paciente_id);


--
-- Name: importacao_linha uq_importacao_linha_posicao; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_linha
    ADD CONSTRAINT uq_importacao_linha_posicao UNIQUE (importacao_lote_id, aba_ordem, numero_linha);


--
-- Name: importacao_lote uq_importacao_lote_codigo; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_lote
    ADD CONSTRAINT uq_importacao_lote_codigo UNIQUE (codigo_lote);


--
-- Name: importacao_lote uq_importacao_lote_identidade; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_lote
    ADD CONSTRAINT uq_importacao_lote_identidade UNIQUE (importacao_lote_id, hash_arquivo_sha256, layout_versao);


--
-- Name: importacao_registro uq_importacao_registro_vinculo; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_registro
    ADD CONSTRAINT uq_importacao_registro_vinculo UNIQUE (importacao_linha_id, schema_destino, tabela_destino, registro_id);


--
-- Name: medicamento uq_medicamento_codigo; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.medicamento
    ADD CONSTRAINT uq_medicamento_codigo UNIQUE (codigo_medicamento);


--
-- Name: notificacao uq_notificacao_paciente; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.notificacao
    ADD CONSTRAINT uq_notificacao_paciente UNIQUE (paciente_id);


--
-- Name: obito uq_obito_paciente; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.obito
    ADD CONSTRAINT uq_obito_paciente UNIQUE (paciente_id);


--
-- Name: paciente_comorbidade uq_paciente_comorbidade; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_comorbidade
    ADD CONSTRAINT uq_paciente_comorbidade UNIQUE (paciente_id, comorbidade_id);


--
-- Name: paciente_projeto_estudo uq_paciente_projeto; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_projeto_estudo
    ADD CONSTRAINT uq_paciente_projeto UNIQUE (paciente_id, projeto_estudo_id);


--
-- Name: projeto_estudo uq_projeto_estudo_codigo; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.projeto_estudo
    ADD CONSTRAINT uq_projeto_estudo_codigo UNIQUE (codigo_projeto);


--
-- Name: sorologia_chagas uq_sorologia_chagas_metodo_por_diagnostico; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.sorologia_chagas
    ADD CONSTRAINT uq_sorologia_chagas_metodo_por_diagnostico UNIQUE (diagnostico_chagas_id, numero_metodo_planilha);


--
-- Name: tipo_encaminhamento uq_tipo_encaminhamento_codigo; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.tipo_encaminhamento
    ADD CONSTRAINT uq_tipo_encaminhamento_codigo UNIQUE (codigo_tipo);


--
-- Name: tipo_exame_complementar uq_tipo_exame_complementar_codigo; Type: CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.tipo_exame_complementar
    ADD CONSTRAINT uq_tipo_exame_complementar_codigo UNIQUE (codigo_exame);


--
-- Name: idx_acompanhamento_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_acompanhamento_atendimento_id ON ambulatorio.acompanhamento_cuidado USING btree (atendimento_id);


--
-- Name: idx_acompanhamento_encaminhamento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_acompanhamento_encaminhamento_id ON ambulatorio.acompanhamento_cuidado USING btree (encaminhamento_id);


--
-- Name: idx_acompanhamento_status; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_acompanhamento_status ON ambulatorio.acompanhamento_cuidado USING btree (status_acompanhamento);


--
-- Name: idx_atendimento_data_atendimento; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_atendimento_data_atendimento ON ambulatorio.atendimento USING btree (data_atendimento);


--
-- Name: idx_atendimento_exame_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_atendimento_exame_atendimento_id ON ambulatorio.atendimento_exame_complementar USING btree (atendimento_id);


--
-- Name: idx_atendimento_exame_data_resultado; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_atendimento_exame_data_resultado ON ambulatorio.atendimento_exame_complementar USING btree (data_resultado);


--
-- Name: idx_atendimento_exame_data_solicitacao; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_atendimento_exame_data_solicitacao ON ambulatorio.atendimento_exame_complementar USING btree (data_solicitacao);


--
-- Name: idx_atendimento_exame_status; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_atendimento_exame_status ON ambulatorio.atendimento_exame_complementar USING btree (status_exame);


--
-- Name: idx_atendimento_exame_tipo_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_atendimento_exame_tipo_id ON ambulatorio.atendimento_exame_complementar USING btree (tipo_exame_complementar_id);


--
-- Name: idx_atendimento_medicamento_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_atendimento_medicamento_atendimento_id ON ambulatorio.atendimento_medicamento USING btree (atendimento_id);


--
-- Name: idx_atendimento_medicamento_medicamento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_atendimento_medicamento_medicamento_id ON ambulatorio.atendimento_medicamento USING btree (medicamento_id);


--
-- Name: idx_atendimento_medicamento_status; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_atendimento_medicamento_status ON ambulatorio.atendimento_medicamento USING btree (status_uso);


--
-- Name: idx_atendimento_paciente_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_atendimento_paciente_id ON ambulatorio.atendimento USING btree (paciente_id);


--
-- Name: idx_atendimento_projeto_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_atendimento_projeto_atendimento_id ON ambulatorio.atendimento_projeto_estudo USING btree (atendimento_id);


--
-- Name: idx_atendimento_projeto_projeto_estudo_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_atendimento_projeto_projeto_estudo_id ON ambulatorio.atendimento_projeto_estudo USING btree (projeto_estudo_id);


--
-- Name: idx_complicacao_chagas_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_complicacao_chagas_atendimento_id ON ambulatorio.complicacao_chagas USING btree (atendimento_id);


--
-- Name: idx_complicacao_chagas_tipo; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_complicacao_chagas_tipo ON ambulatorio.complicacao_chagas USING btree (tipo_complicacao);


--
-- Name: idx_condicao_chagas_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_condicao_chagas_atendimento_id ON ambulatorio.condicao_chagas USING btree (atendimento_id);


--
-- Name: idx_diagnostico_chagas_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_diagnostico_chagas_atendimento_id ON ambulatorio.diagnostico_chagas USING btree (atendimento_id);


--
-- Name: idx_encaminhamento_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_encaminhamento_atendimento_id ON ambulatorio.encaminhamento USING btree (atendimento_id);


--
-- Name: idx_encaminhamento_data; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_encaminhamento_data ON ambulatorio.encaminhamento USING btree (data_encaminhamento);


--
-- Name: idx_encaminhamento_status; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_encaminhamento_status ON ambulatorio.encaminhamento USING btree (status_encaminhamento);


--
-- Name: idx_encaminhamento_tipo_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_encaminhamento_tipo_id ON ambulatorio.encaminhamento USING btree (tipo_encaminhamento_id);


--
-- Name: idx_evento_clinico_paciente_tipo; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_evento_clinico_paciente_tipo ON ambulatorio.evento_clinico USING btree (paciente_id, tipo_evento);


--
-- Name: idx_exame_resultado_exame_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_exame_resultado_exame_id ON ambulatorio.exame_complementar_resultado USING btree (atendimento_exame_complementar_id);


--
-- Name: idx_exame_resultado_nome_campo; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_exame_resultado_nome_campo ON ambulatorio.exame_complementar_resultado USING btree (nome_campo);


--
-- Name: idx_historico_familiar_chagas_paciente_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_historico_familiar_chagas_paciente_id ON ambulatorio.historico_familiar_chagas USING btree (paciente_id);


--
-- Name: idx_importacao_linha_lote_status; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_importacao_linha_lote_status ON ambulatorio.importacao_linha USING btree (importacao_lote_id, status_linha);


--
-- Name: idx_importacao_lote_hash_layout; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_importacao_lote_hash_layout ON ambulatorio.importacao_lote USING btree (hash_arquivo_sha256, layout_versao);


--
-- Name: idx_importacao_registro_destino; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_importacao_registro_destino ON ambulatorio.importacao_registro USING btree (schema_destino, tabela_destino, registro_id);


--
-- Name: idx_medicamento_codigo; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_medicamento_codigo ON ambulatorio.medicamento USING btree (codigo_medicamento);


--
-- Name: idx_notificacao_numero_notificacao; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_notificacao_numero_notificacao ON ambulatorio.notificacao USING btree (numero_notificacao);


--
-- Name: idx_obito_data_obito; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_obito_data_obito ON ambulatorio.obito USING btree (data_obito);


--
-- Name: idx_paciente_comorbidade_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_paciente_comorbidade_atendimento_id ON ambulatorio.paciente_comorbidade USING btree (atendimento_id);


--
-- Name: idx_paciente_comorbidade_comorbidade_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_paciente_comorbidade_comorbidade_id ON ambulatorio.paciente_comorbidade USING btree (comorbidade_id);


--
-- Name: idx_paciente_comorbidade_paciente_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_paciente_comorbidade_paciente_id ON ambulatorio.paciente_comorbidade USING btree (paciente_id);


--
-- Name: idx_paciente_exame_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_paciente_exame_atendimento_id ON ambulatorio.paciente_exame_complementar USING btree (atendimento_id) WHERE (atendimento_id IS NOT NULL);


--
-- Name: idx_paciente_exame_paciente_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_paciente_exame_paciente_id ON ambulatorio.paciente_exame_complementar USING btree (paciente_id);


--
-- Name: idx_paciente_exame_tipo_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_paciente_exame_tipo_id ON ambulatorio.paciente_exame_complementar USING btree (tipo_exame_complementar_id);


--
-- Name: idx_paciente_projeto_projeto_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_paciente_projeto_projeto_id ON ambulatorio.paciente_projeto_estudo USING btree (projeto_estudo_id);


--
-- Name: idx_pendencia_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_pendencia_atendimento_id ON ambulatorio.pendencia_atendimento USING btree (atendimento_id);


--
-- Name: idx_pendencia_status; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_pendencia_status ON ambulatorio.pendencia_atendimento USING btree (status_pendencia);


--
-- Name: idx_procedimento_clinico_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_procedimento_clinico_atendimento_id ON ambulatorio.procedimento_clinico USING btree (atendimento_id);


--
-- Name: idx_procedimento_clinico_status; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_procedimento_clinico_status ON ambulatorio.procedimento_clinico USING btree (status_procedimento);


--
-- Name: idx_sorologia_chagas_diagnostico_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_sorologia_chagas_diagnostico_id ON ambulatorio.sorologia_chagas USING btree (diagnostico_chagas_id);


--
-- Name: idx_sorologia_chagas_resultado; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_sorologia_chagas_resultado ON ambulatorio.sorologia_chagas USING btree (resultado);


--
-- Name: idx_sorologia_solicitacao_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_sorologia_solicitacao_atendimento_id ON ambulatorio.sorologia_solicitacao USING btree (atendimento_id);


--
-- Name: idx_tratamento_chagas_atendimento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_tratamento_chagas_atendimento_id ON ambulatorio.tratamento_chagas USING btree (atendimento_id);


--
-- Name: idx_tratamento_chagas_medicamento_id; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_tratamento_chagas_medicamento_id ON ambulatorio.tratamento_chagas USING btree (medicamento_id);


--
-- Name: idx_tratamento_chagas_status; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE INDEX idx_tratamento_chagas_status ON ambulatorio.tratamento_chagas USING btree (status_tratamento);


--
-- Name: uq_importacao_lote_inicial; Type: INDEX; Schema: ambulatorio; Owner: -
--

CREATE UNIQUE INDEX uq_importacao_lote_inicial ON ambulatorio.importacao_lote USING btree (hash_arquivo_sha256, layout_versao) WHERE (lote_reprocessado_de_id IS NULL);


--
-- Name: acompanhamento_cuidado fk_acompanhamento_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.acompanhamento_cuidado
    ADD CONSTRAINT fk_acompanhamento_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: acompanhamento_cuidado fk_acompanhamento_encaminhamento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.acompanhamento_cuidado
    ADD CONSTRAINT fk_acompanhamento_encaminhamento FOREIGN KEY (encaminhamento_id) REFERENCES ambulatorio.encaminhamento(encaminhamento_id) ON DELETE SET NULL;


--
-- Name: atendimento_exame_complementar fk_atendimento_exame_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_exame_complementar
    ADD CONSTRAINT fk_atendimento_exame_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: atendimento_exame_complementar fk_atendimento_exame_tipo; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_exame_complementar
    ADD CONSTRAINT fk_atendimento_exame_tipo FOREIGN KEY (tipo_exame_complementar_id) REFERENCES ambulatorio.tipo_exame_complementar(tipo_exame_complementar_id) ON DELETE RESTRICT;


--
-- Name: atendimento_medicamento fk_atendimento_medicamento_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_medicamento
    ADD CONSTRAINT fk_atendimento_medicamento_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: atendimento_medicamento fk_atendimento_medicamento_medicamento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_medicamento
    ADD CONSTRAINT fk_atendimento_medicamento_medicamento FOREIGN KEY (medicamento_id) REFERENCES ambulatorio.medicamento(medicamento_id) ON DELETE SET NULL;


--
-- Name: atendimento fk_atendimento_paciente; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento
    ADD CONSTRAINT fk_atendimento_paciente FOREIGN KEY (paciente_id) REFERENCES ambulatorio.paciente(paciente_id) ON DELETE RESTRICT;


--
-- Name: atendimento_projeto_estudo fk_atendimento_projeto_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_projeto_estudo
    ADD CONSTRAINT fk_atendimento_projeto_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: atendimento_projeto_estudo fk_atendimento_projeto_projeto; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.atendimento_projeto_estudo
    ADD CONSTRAINT fk_atendimento_projeto_projeto FOREIGN KEY (projeto_estudo_id) REFERENCES ambulatorio.projeto_estudo(projeto_estudo_id) ON DELETE RESTRICT;


--
-- Name: complicacao_chagas fk_complicacao_chagas_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.complicacao_chagas
    ADD CONSTRAINT fk_complicacao_chagas_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: condicao_chagas fk_condicao_chagas_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.condicao_chagas
    ADD CONSTRAINT fk_condicao_chagas_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: dados_clinicos_atendimento fk_dados_clinicos_atendimento_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.dados_clinicos_atendimento
    ADD CONSTRAINT fk_dados_clinicos_atendimento_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: diagnostico_chagas fk_diagnostico_chagas_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.diagnostico_chagas
    ADD CONSTRAINT fk_diagnostico_chagas_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: dispositivo_implantado fk_dispositivo_implantado_paciente; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.dispositivo_implantado
    ADD CONSTRAINT fk_dispositivo_implantado_paciente FOREIGN KEY (paciente_id) REFERENCES ambulatorio.paciente(paciente_id) ON DELETE CASCADE;


--
-- Name: encaminhamento fk_encaminhamento_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.encaminhamento
    ADD CONSTRAINT fk_encaminhamento_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: encaminhamento fk_encaminhamento_tipo; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.encaminhamento
    ADD CONSTRAINT fk_encaminhamento_tipo FOREIGN KEY (tipo_encaminhamento_id) REFERENCES ambulatorio.tipo_encaminhamento(tipo_encaminhamento_id) ON DELETE SET NULL;


--
-- Name: evento_clinico fk_evento_clinico_paciente; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.evento_clinico
    ADD CONSTRAINT fk_evento_clinico_paciente FOREIGN KEY (paciente_id) REFERENCES ambulatorio.paciente(paciente_id) ON DELETE CASCADE;


--
-- Name: exame_complementar_resultado fk_exame_resultado_exame; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.exame_complementar_resultado
    ADD CONSTRAINT fk_exame_resultado_exame FOREIGN KEY (atendimento_exame_complementar_id) REFERENCES ambulatorio.atendimento_exame_complementar(atendimento_exame_complementar_id) ON DELETE CASCADE;


--
-- Name: historico_familiar_chagas fk_historico_familiar_chagas_paciente; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.historico_familiar_chagas
    ADD CONSTRAINT fk_historico_familiar_chagas_paciente FOREIGN KEY (paciente_id) REFERENCES ambulatorio.paciente(paciente_id) ON DELETE CASCADE;


--
-- Name: importacao_linha fk_importacao_linha_lote; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_linha
    ADD CONSTRAINT fk_importacao_linha_lote FOREIGN KEY (importacao_lote_id) REFERENCES ambulatorio.importacao_lote(importacao_lote_id) ON DELETE RESTRICT;


--
-- Name: importacao_lote fk_importacao_lote_reprocessamento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_lote
    ADD CONSTRAINT fk_importacao_lote_reprocessamento FOREIGN KEY (lote_reprocessado_de_id, hash_arquivo_sha256, layout_versao) REFERENCES ambulatorio.importacao_lote(importacao_lote_id, hash_arquivo_sha256, layout_versao) ON DELETE RESTRICT;


--
-- Name: importacao_registro fk_importacao_registro_linha; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.importacao_registro
    ADD CONSTRAINT fk_importacao_registro_linha FOREIGN KEY (importacao_linha_id) REFERENCES ambulatorio.importacao_linha(importacao_linha_id) ON DELETE RESTRICT;


--
-- Name: notificacao fk_notificacao_paciente; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.notificacao
    ADD CONSTRAINT fk_notificacao_paciente FOREIGN KEY (paciente_id) REFERENCES ambulatorio.paciente(paciente_id) ON DELETE CASCADE;


--
-- Name: obito fk_obito_paciente; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.obito
    ADD CONSTRAINT fk_obito_paciente FOREIGN KEY (paciente_id) REFERENCES ambulatorio.paciente(paciente_id) ON DELETE CASCADE;


--
-- Name: paciente_comorbidade fk_paciente_comorbidade_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_comorbidade
    ADD CONSTRAINT fk_paciente_comorbidade_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE SET NULL;


--
-- Name: paciente_comorbidade fk_paciente_comorbidade_comorbidade; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_comorbidade
    ADD CONSTRAINT fk_paciente_comorbidade_comorbidade FOREIGN KEY (comorbidade_id) REFERENCES ambulatorio.comorbidade(comorbidade_id) ON DELETE RESTRICT;


--
-- Name: paciente_comorbidade fk_paciente_comorbidade_paciente; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_comorbidade
    ADD CONSTRAINT fk_paciente_comorbidade_paciente FOREIGN KEY (paciente_id) REFERENCES ambulatorio.paciente(paciente_id) ON DELETE CASCADE;


--
-- Name: paciente_contato fk_paciente_contato_paciente; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_contato
    ADD CONSTRAINT fk_paciente_contato_paciente FOREIGN KEY (paciente_id) REFERENCES ambulatorio.paciente(paciente_id) ON DELETE CASCADE;


--
-- Name: paciente_endereco fk_paciente_endereco_paciente; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_endereco
    ADD CONSTRAINT fk_paciente_endereco_paciente FOREIGN KEY (paciente_id) REFERENCES ambulatorio.paciente(paciente_id) ON DELETE CASCADE;


--
-- Name: paciente_exame_complementar fk_paciente_exame_atendimento_paciente; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_exame_complementar
    ADD CONSTRAINT fk_paciente_exame_atendimento_paciente FOREIGN KEY (atendimento_id, paciente_id) REFERENCES ambulatorio.atendimento(atendimento_id, paciente_id) ON DELETE SET NULL (atendimento_id);


--
-- Name: paciente_exame_complementar fk_paciente_exame_paciente; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_exame_complementar
    ADD CONSTRAINT fk_paciente_exame_paciente FOREIGN KEY (paciente_id) REFERENCES ambulatorio.paciente(paciente_id) ON DELETE CASCADE;


--
-- Name: paciente_exame_complementar fk_paciente_exame_tipo; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_exame_complementar
    ADD CONSTRAINT fk_paciente_exame_tipo FOREIGN KEY (tipo_exame_complementar_id) REFERENCES ambulatorio.tipo_exame_complementar(tipo_exame_complementar_id) ON DELETE RESTRICT;


--
-- Name: paciente_projeto_estudo fk_paciente_projeto_paciente; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_projeto_estudo
    ADD CONSTRAINT fk_paciente_projeto_paciente FOREIGN KEY (paciente_id) REFERENCES ambulatorio.paciente(paciente_id) ON DELETE CASCADE;


--
-- Name: paciente_projeto_estudo fk_paciente_projeto_projeto; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.paciente_projeto_estudo
    ADD CONSTRAINT fk_paciente_projeto_projeto FOREIGN KEY (projeto_estudo_id) REFERENCES ambulatorio.projeto_estudo(projeto_estudo_id) ON DELETE RESTRICT;


--
-- Name: pendencia_atendimento fk_pendencia_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.pendencia_atendimento
    ADD CONSTRAINT fk_pendencia_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: procedimento_clinico fk_procedimento_clinico_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.procedimento_clinico
    ADD CONSTRAINT fk_procedimento_clinico_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: sorologia_chagas fk_sorologia_chagas_diagnostico; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.sorologia_chagas
    ADD CONSTRAINT fk_sorologia_chagas_diagnostico FOREIGN KEY (diagnostico_chagas_id) REFERENCES ambulatorio.diagnostico_chagas(diagnostico_chagas_id) ON DELETE CASCADE;


--
-- Name: sorologia_solicitacao fk_sorologia_solicitacao_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.sorologia_solicitacao
    ADD CONSTRAINT fk_sorologia_solicitacao_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: tratamento_chagas fk_tratamento_chagas_atendimento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.tratamento_chagas
    ADD CONSTRAINT fk_tratamento_chagas_atendimento FOREIGN KEY (atendimento_id) REFERENCES ambulatorio.atendimento(atendimento_id) ON DELETE CASCADE;


--
-- Name: tratamento_chagas fk_tratamento_chagas_medicamento; Type: FK CONSTRAINT; Schema: ambulatorio; Owner: -
--

ALTER TABLE ONLY ambulatorio.tratamento_chagas
    ADD CONSTRAINT fk_tratamento_chagas_medicamento FOREIGN KEY (medicamento_id) REFERENCES ambulatorio.medicamento(medicamento_id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict xmwsfqkdisbiVimxy9koi5WeHnsHPr6cCc8HwZOpzKgOZdMcCrJHAyp6wtqLg2F

