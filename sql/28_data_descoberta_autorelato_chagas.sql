-- Etapa 5C: data informada pelo paciente como descoberta da doença de Chagas.
-- A data é semanticamente distinta de qualquer data de sorologia.
SET search_path TO ambulatorio, public;

ALTER TABLE diagnostico_chagas
  ADD COLUMN data_descoberta_autorelato DATE;

COMMENT ON COLUMN diagnostico_chagas.data_descoberta_autorelato IS
  'Data em que o paciente descobriu que possui doença de Chagas; pode diferir das datas de sorologia.';
