import { BadRequestException, ForbiddenException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { SorologiaCreateDto } from '../../src/clinico/dto/sorologia.dto';
import { SorologiasService } from '../../src/pacientes/sorologias.service';

const user = { usuarioId: '7', nome: 'Edição sintética', perfil: 'edicao' as const };
const patientId = '9007199254740993';
const attendanceId = '9007199254740994';
const diagnosisId = '9007199254740995';
const sorologiaId = '9007199254740996';

function setup(existingDiagnosis = true) {
  const query = jest.fn(async (sql: string, _values?: readonly unknown[]) => {
    if (sql.startsWith('SELECT 1 FROM atendimento')) return { rows: [{ '?column?': 1 }], rowCount: 1 };
    if (sql.startsWith('SELECT diagnostico_chagas_id')) return {
      rows: existingDiagnosis ? [{ diagnostico_chagas_id: diagnosisId }] : [], rowCount: existingDiagnosis ? 1 : 0,
    };
    if (sql.startsWith('INSERT INTO diagnostico_chagas')) return { rows: [{ diagnostico_chagas_id: diagnosisId }], rowCount: 1 };
    if (sql.startsWith('INSERT INTO sorologia_chagas')) return { rows: [{ sorologia_chagas_id: sorologiaId }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });
  const tx = { query };
  const transaction = jest.fn(async (operation: (value: typeof tx) => Promise<unknown>, _actorId?: string) => operation(tx));
  const patient = jest.fn().mockResolvedValue(undefined);
  const service = new SorologiasService({ transaction } as never, { patient } as never);
  return { service, query, tx, transaction, patient };
}

describe('SorologiasService', () => {
  it('autoriza e pagina a consulta pelo atendimento sem retornar proveniência bruta', async () => {
    const { service, query, tx, transaction, patient } = setup();
    await expect(service.list(user, patientId, attendanceId, { limit: 5, offset: 10 })).resolves.toEqual([]);
    expect(patient).toHaveBeenCalledWith(tx, user, patientId, false);
    expect(transaction.mock.calls[0][1]).toBeUndefined();
    const [sql, values] = query.mock.calls[1];
    expect(sql).toContain('ORDER BY s.sorologia_chagas_id DESC LIMIT $2 OFFSET $3');
    expect(sql).not.toMatch(/valor_original|numero_metodo_planilha/);
    expect(values).toEqual([attendanceId, 5, 10]);
  });

  it('não lê nem escreve recursos quando o vínculo é recusado', async () => {
    const { service, query, patient } = setup();
    patient.mockRejectedValue(new ForbiddenException());
    await expect(service.create(user, patientId, attendanceId, { resultado: null })).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
  });

  it.each([false, true])('contexto de outro paciente é 404 antes de acessar diagnóstico, escrita=%s', async write => {
    const { service, query } = setup();
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const operation = write ? service.create(user, patientId, attendanceId, { resultado: null })
      : service.list(user, patientId, attendanceId, { limit: 20, offset: 0 });
    await expect(operation).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('reutiliza diagnóstico sem modificar seus fatos, preserva null e campos discriminantes', async () => {
    const { service, query, tx, transaction, patient } = setup();
    await expect(service.create(user, patientId, attendanceId, {
      metodoSorologico: 'Método sintético repetível', dataSolicitacao: '2026-04-09', dataColeta: '2026-04-03',
      dataResultado: null, resultado: 'nao_informado', laboratorio: null, observacoes: 'Registro sintético',
    })).resolves.toEqual({ sorologiaId });
    expect(patient).toHaveBeenCalledWith(tx, user, patientId, true);
    expect(transaction.mock.calls[0][1]).toBe(user.usuarioId);
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(query.mock.calls[0][1]).toEqual([patientId, attendanceId]);
    expect(query).not.toHaveBeenCalledWith(expect.stringMatching(/UPDATE diagnostico_chagas|INSERT INTO diagnostico_chagas/), expect.anything());
    const [sql, values] = query.mock.calls[2];
    expect(sql).not.toMatch(/valor_original|numero_metodo_planilha|ON CONFLICT/);
    expect(values).toEqual([diagnosisId, 'Método sintético repetível', '2026-04-09', '2026-04-03', null,
      'nao_informado', null, 'Registro sintético']);
  });

  it('cria somente a âncora técnica e a sorologia na mesma transação quando não há diagnóstico', async () => {
    const { service, query, transaction } = setup(false);
    await expect(service.create(user, patientId, attendanceId, { resultado: null })).resolves.toEqual({ sorologiaId });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[2]).toEqual([
      'INSERT INTO diagnostico_chagas(atendimento_id) VALUES($1) RETURNING diagnostico_chagas_id::text', [attendanceId],
    ]);
    expect(query.mock.calls[3][1]).toEqual([diagnosisId, null]);
  });

  it('recusa corpo vazio antes de criar qualquer âncora', async () => {
    const { service, query } = setup(false);
    await expect(service.create(user, patientId, attendanceId, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('preserva erro do filho para o rollback transacional e sanitiza erro de integridade', async () => {
    const { service, query } = setup(false);
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT 1 FROM atendimento')) return { rows: [{ '?column?': 1 }], rowCount: 1 };
      if (sql.startsWith('SELECT diagnostico_chagas_id')) return { rows: [], rowCount: 0 };
      if (sql.startsWith('INSERT INTO diagnostico_chagas')) return { rows: [{ diagnostico_chagas_id: diagnosisId }], rowCount: 1 };
      throw { code: '23514', message: 'SQL sintético não publicável' };
    });
    const failure = service.create(user, patientId, attendanceId, { resultado: null });
    await expect(failure).rejects.toBeInstanceOf(BadRequestException);
    await expect(failure).rejects.not.toThrow('SQL sintético não publicável');
  });
});

describe('SorologiaCreateDto', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const validate = (body: unknown) => pipe.transform(body, { type: 'body', metatype: SorologiaCreateDto });
  it('preserva null e não informado sem impor ordem clínica às datas', async () => {
    await expect(validate({ metodoSorologico: null, dataSolicitacao: '2026-04-09', dataColeta: '2026-04-03',
      dataResultado: null, resultado: 'nao_informado' })).resolves.toEqual({ metodoSorologico: null,
      dataSolicitacao: '2026-04-09', dataColeta: '2026-04-03', dataResultado: null, resultado: 'nao_informado' });
  });
  it.each([
    { dataColeta: '2026-02-30' }, { dataResultado: '2026-04-03T12:00:00Z' }, { resultado: 'positivo' },
    { metodoSorologico: 'x'.repeat(121) }, { laboratorio: 'x'.repeat(121) }, { observacoes: 'x'.repeat(10001) },
    { numeroMetodoPlanilha: 1 }, { valor_original_resultado: 'não publicar' },
  ])('recusa dado inválido ou campo não publicado %j', async body => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});
