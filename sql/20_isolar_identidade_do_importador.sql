-- Isola identidades funcionais do processo de importacao.
-- Impacto: remove privilegios automaticos do importador somente desta tabela/sequencia.
-- Reversao: nova migration explicita; nao se recomenda acoplar importacao a usuarios.

SET search_path TO ambulatorio, public;

REVOKE ALL ON usuario_aplicacao FROM ambulatorio_importador;
REVOKE ALL ON SEQUENCE usuario_aplicacao_usuario_id_seq FROM ambulatorio_importador;

