-- Corrige a validacao do prefixo bcrypt criada na migration 18.
-- Impacto: substitui somente a constraint; nao altera dados nem privilegios.
-- Reversao: nova migration explicita, sem restaurar a expressao defeituosa.

SET search_path TO ambulatorio, public;

ALTER TABLE usuario_aplicacao
    DROP CONSTRAINT chk_usuario_aplicacao_senha_hash,
    ADD CONSTRAINT chk_usuario_aplicacao_senha_hash
        CHECK (senha_hash LIKE '$2a$%' OR senha_hash LIKE '$2b$%' OR senha_hash LIKE '$2y$%');

