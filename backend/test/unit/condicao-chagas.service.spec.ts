import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { CondicaoChagasCreateDto, fasesDoenca, formasClinicas } from '../../src/clinico/dto/condicao-chagas.dto';
import { CondicaoChagasController } from '../../src/pacientes/condicao-chagas.controller';
import { CondicaoChagasService } from '../../src/pacientes/condicao-chagas.service';

const user = { usuarioId: '7', nome: 'Edição de teste', perfil: 'edicao' as const };
const patientId = '9007199254740993';
const attendanceId = '9007199254740994';
const conditionId = '9007199254740995';

function setup() {
  const query = jest.fn(async (sql: string, _values?: readonly unknown[]) => {
    if (sql.startsWith('SELECT 1 FROM atendimento')) return { rows: [{ '?column?': 1 }], rowCount: 1 };
    if (sql.startsWith('INSERT INTO condicao_chagas')) return { rows: [{ condicao_chagas_id: conditionId }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });
  const tx = { query };
  const transaction = jest.fn(async (operation: (value: typeof tx) => Promise<unknown>, _actorId?: string) => operation(tx));
  const patient = jest.fn().mockResolvedValue(undefined);
  return { service: new CondicaoChagasService({ transaction } as never, { patient } as never), query, tx, transaction, patient };
}

describe('Condição por atendimento', () => {
  it('lê ausência como null sem escrita ou proveniência bruta e autoriza o contexto', async () => {
    const { service, query, tx, patient, transaction } = setup();
    await expect(service.read(user, patientId, attendanceId)).resolves.toBeNull();
    expect(patient).toHaveBeenCalledWith(tx, user, patientId, false);
    expect(transaction.mock.calls[0][1]).toBeUndefined();
    expect(query.mock.calls[1][0]).not.toMatch(/valor_original|INSERT|UPDATE|DELETE/);
    expect(query.mock.calls[1][1]).toEqual([attendanceId]);
  });

  it.each([false, true])('recusa vínculo antes de acessar condição, escrita=%s', async write => {
    const { service, query, patient } = setup();
    patient.mockRejectedValue(new ForbiddenException());
    await expect(write ? service.create(user, patientId, attendanceId, { possuiSintomas: null })
      : service.read(user, patientId, attendanceId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).not.toHaveBeenCalled();
  });

  it.each([false, true])('recusa contexto de outro paciente sem tocar na condição, escrita=%s', async write => {
    const { service, query } = setup();
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(write ? service.create(user, patientId, attendanceId, { possuiSintomas: false })
      : service.read(user, patientId, attendanceId)).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('preserva os seis campos independentes, false, null e texto sem inferir diagnóstico', async () => {
    const { service, query, transaction, patient, tx } = setup();
    const dto = { formaClinica: 'digestiva' as const, faseDoenca: null, classificacaoClinica: ' Classificação de teste ',
      possuiSintomas: false, descricaoSintomas: 'Descrição preservada apesar de false', observacoes: '' };
    await expect(service.create(user, patientId, attendanceId, dto)).resolves.toEqual({ condicaoChagasId: conditionId });
    expect(patient).toHaveBeenCalledWith(tx, user, patientId, true);
    expect(transaction.mock.calls[0][1]).toBe(user.usuarioId);
    expect(query.mock.calls[0]).toEqual([expect.stringContaining('FOR UPDATE'), [patientId, attendanceId]]);
    expect(query.mock.calls[2][1]).toEqual([attendanceId, 'digestiva', null, ' Classificação de teste ', false,
      'Descrição preservada apesar de false', '']);
    expect(query.mock.calls.map(([sql]) => sql).join('\n')).not.toMatch(/diagnostico_chagas|valor_original|ON CONFLICT|UPDATE condicao/);
  });

  it('recusa {} antes de gravar, mas aceita null explícito sem preencher demais campos', async () => {
    const { service, query } = setup();
    await expect(service.create(user, patientId, attendanceId, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(query).toHaveBeenCalledTimes(1);
    await expect(service.create(user, patientId, attendanceId, { possuiSintomas: null })).resolves.toEqual({ condicaoChagasId: conditionId });
    expect(query.mock.calls.at(-1)?.[1]).toEqual([attendanceId, null]);
  });

  it('preserva registro existente/importado e responde conflito antes do INSERT', async () => {
    const { service, query } = setup();
    query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });
    query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });
    await expect(service.create(user, patientId, attendanceId, { formaClinica: null })).rejects.toBeInstanceOf(ConflictException);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('mapeia corrida da unicidade por atendimento sem publicar SQL nem sobrescrever dados', async () => {
    const { service, query } = setup();
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT 1 FROM atendimento')) return { rows: [{ '?column?': 1 }], rowCount: 1 };
      if (sql.startsWith('SELECT 1 FROM condicao_chagas')) return { rows: [], rowCount: 0 };
      throw { code: '23505', constraint: 'uq_condicao_chagas_atendimento', message: 'Detalhe SQL de teste' };
    });
    const failure = service.create(user, patientId, attendanceId, { possuiSintomas: false });
    await expect(failure).rejects.toBeInstanceOf(ConflictException);
    await expect(failure).rejects.not.toThrow('Detalhe SQL de teste');
  });

  it('deixa outras violações de unicidade disponíveis à investigação', async () => {
    const { service, query } = setup();
    const failure = { code: '23505', constraint: 'condicao_chagas_pkey' };
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT 1 FROM atendimento')) return { rows: [{ '?column?': 1 }], rowCount: 1 };
      if (sql.startsWith('SELECT 1 FROM condicao_chagas')) return { rows: [], rowCount: 0 };
      throw failure;
    });
    await expect(service.create(user, patientId, attendanceId, { possuiSintomas: false })).rejects.toBe(failure);
  });

  it('mantém falha SQL para rollback transacional com erro público sanitizado', async () => {
    const { service, query } = setup();
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT 1 FROM atendimento')) return { rows: [{ '?column?': 1 }], rowCount: 1 };
      if (sql.startsWith('SELECT 1 FROM condicao_chagas')) return { rows: [], rowCount: 0 };
      throw { code: '23514', message: 'Detalhe SQL de teste' };
    });
    const failure = service.create(user, patientId, attendanceId, { possuiSintomas: false });
    await expect(failure).rejects.toBeInstanceOf(BadRequestException);
    await expect(failure).rejects.not.toThrow('Detalhe SQL de teste');
  });

  it('entrega JSON null explicitamente no GET para não produzir corpo vazio', async () => {
    const read = jest.fn().mockResolvedValue(null);
    const response = { json: jest.fn().mockReturnValue('response') };
    const controller = new CondicaoChagasController({ read } as never);
    await expect(controller.read(patientId, attendanceId, user, response as never)).resolves.toBe('response');
    expect(response.json).toHaveBeenCalledWith(null);
  });
});

describe('CondicaoChagasCreateDto', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const validate = (body: unknown) => pipe.transform(body, { type: 'body', metatype: CondicaoChagasCreateDto });

  it('preserva desconhecido, falso, descrição independente e texto literal sem transformações clínicas', async () => {
    const body = { formaClinica: null, faseDoenca: 'nao_informado', classificacaoClinica: '',
      possuiSintomas: false, descricaoSintomas: ' Texto de teste ', observacoes: null };
    await expect(validate(body)).resolves.toEqual(body);
  });

  it.each(formasClinicas)('aceita forma existente %s sem classificar sintomas', async formaClinica => {
    await expect(validate({ formaClinica })).resolves.toEqual({ formaClinica });
  });
  it.each(fasesDoenca)('aceita fase existente %s', async faseDoenca => {
    await expect(validate({ faseDoenca })).resolves.toEqual({ faseDoenca });
  });
  it.each([
    { formaClinica: 'outra' }, { faseDoenca: 'indeterminada' }, { possuiSintomas: 'false' },
    { classificacaoClinica: 'x'.repeat(81) }, { descricaoSintomas: 'x'.repeat(10001) }, { observacoes: 'x'.repeat(10001) },
    { classificacaoClinica: 1 }, { valor_original_forma_clinica: 'Não publicar' }, { dispneia: true },
  ])('recusa domínio, tipo, limite ou campo sem contrato %j', async body => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});
