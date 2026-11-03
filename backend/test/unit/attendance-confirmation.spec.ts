import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AttendanceConfirmationDto } from '../../src/clinico/dto/attendance-confirmation.dto';
import { AttendanceConfirmationService } from '../../src/pacientes/attendance-confirmation.service';
import { operationReceipt, clinicalRoute } from '../../src/operacoes/operacoes.contract';
import { fieldValidationException, publicAttendancePath } from '../../src/common/http/field-validation';

const user = { usuarioId: '9', nome: 'Sintético', perfil: 'edicao' as const };

function context() {
  const tx = { query: jest.fn().mockImplementation(async (sql: string) => ({ rows: [], rowCount: sql.includes('evento_clinico') ? 0 : 1 })) };
  const access = { patient: jest.fn().mockResolvedValue(undefined) };
  const database = { coordinate: jest.fn(async (_actor, operation) => operation(tx)) };
  const patients = { createAttendance: jest.fn().mockResolvedValue({ atendimentoId: '50' }),
    createBznTreatment: jest.fn().mockResolvedValue({ tratamentoId: '60' }) };
  const condition = { create: jest.fn().mockResolvedValue({ condicaoChagasId: '51' }) };
  const serology = { create: jest.fn().mockResolvedValue({ sorologiaId: '52' }) };
  const complications = { create: jest.fn().mockResolvedValue({ complicacaoChagasId: '53' }) };
  const comorbidities = { create: jest.fn().mockResolvedValue({ avaliacaoComorbidadesId: '54' }) };
  const avcs = { create: jest.fn().mockResolvedValue({ eventoId: '55' }) };
  const devices = { create: jest.fn().mockResolvedValue({ dispositivoId: '56' }) };
  const death = { create: jest.fn().mockResolvedValue({ obitoId: '57' }) };
  const resources = { saveProject: jest.fn().mockResolvedValue({ projetoId: '58' }),
    createReferral: jest.fn().mockResolvedValue({ encaminhamentoId: '61' }),
    saveNotification: jest.fn().mockResolvedValue({ notificacaoId: '62' }) };
  const service = new AttendanceConfirmationService(database as never, patients as never, condition as never,
    serology as never, complications as never, comorbidities as never, avcs as never, devices as never, death as never, resources as never, access as never);
  return { service, tx, access, database, patients, condition, serology, complications, comorbidities, avcs, devices, death, resources };
}

describe('Confirmação única do atendimento', () => {
  it('compõe recursos reais na ordem de dependência e retorna somente IDs verificáveis no recibo', async () => {
    const ctx = context();
    const dto: AttendanceConfirmationDto = { dataAtendimento: '2026-04-12', condicaoChagas: { possuiSintomas: false },
      sorologias: [{ resultado: 'nao_reagente' }], complicacoesChagas: [{ possuiComplicacao: null }],
      comorbidades: { historicoFamiliar: { possuiDoenca: null } }, avcs: [{ ocorreu: true, anoEvento: 2010 }],
      dispositivos: [{ tipoDispositivo: 'cdi', possuiDispositivo: false }], obito: { houveObito: false },
      projetos: [{ projetoId: '58', participa: false }], tratamentoBzn: { iniciado: false },
      encaminhamentos: [{ motivo: 'Sintético' }], notificacao: { pacienteNotificado: false } };
    const result = await ctx.service.confirm(user, '8', dto);
    expect(ctx.database.coordinate).toHaveBeenCalledWith('9', expect.any(Function));
    expect(ctx.access.patient).toHaveBeenCalledWith(ctx.tx, user, '8', true);
    expect(ctx.tx.query.mock.invocationCallOrder[0]).toBeLessThan(ctx.patients.createAttendance.mock.invocationCallOrder[0]);
    expect(ctx.serology.create).toHaveBeenCalledWith(user, '8', '50', { resultado: 'nao_reagente' });
    expect(ctx.resources.createReferral).toHaveBeenCalledWith(user, '8', { motivo: 'Sintético', atendimentoId: '50' });
    expect(ctx.patients.createBznTreatment).toHaveBeenCalledWith(user, '8', { iniciado: false });
    expect(ctx.resources.saveProject).toHaveBeenCalledWith(user, '8', { projetoId: '58', participa: false }, true);
    expect(ctx.resources.saveNotification).toHaveBeenCalledWith(user, '8', { pacienteNotificado: false }, true);
    expect(ctx.avcs.create).toHaveBeenCalledWith(user, '8', dto.avcs![0]);
    expect(result).toEqual({ atendimentoId: '50', condicaoChagasId: '51', sorologia0Id: '52', complicacao0Id: '53',
      avaliacaoComorbidadesId: '54', avc0Id: '55', dispositivo0Id: '56', obitoId: '57', projeto0Id: '58',
      tratamentoId: '60', encaminhamento0Id: '61', notificacaoId: '62' });
    expect(operationReceipt(clinicalRoute('POST', '/v1/pacientes/8/atendimentos/confirmacao'), result)).toEqual(result);
  });

  it('não copia registros longitudinais quando não há intenção explícita', async () => {
    const ctx = context();
    expect(await ctx.service.confirm(user, '8', { dataAtendimento: '2026-04-12' })).toEqual({ atendimentoId: '50' });
    for (const service of [ctx.avcs, ctx.devices, ctx.death]) expect(service.create).not.toHaveBeenCalled();
    expect(ctx.resources.saveProject).not.toHaveBeenCalled();
    expect(ctx.resources.saveNotification).not.toHaveBeenCalled();
    expect(ctx.patients.createBznTreatment).not.toHaveBeenCalled();
  });

  it('propaga falha dependente e impede as operações seguintes', async () => {
    const ctx = context();
    ctx.serology.create.mockRejectedValue(new ConflictException('Sintético'));
    await expect(ctx.service.confirm(user, '8', { dataAtendimento: '2026-04-12', sorologias: [{ resultado: null }],
      avcs: [{ ocorreu: true }] })).rejects.toBeInstanceOf(ConflictException);
    expect(ctx.avcs.create).not.toHaveBeenCalled();
  });

  it('recusa AVC indistinguível já registrado e não cria outro evento', async () => {
    const ctx = context();
    ctx.tx.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }).mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(ctx.service.confirm(user, '8', { dataAtendimento: '2026-04-12', avcs: [{ ocorreu: true }] }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(ctx.avcs.create).not.toHaveBeenCalled();
  });

  it('não aceita vínculo externo em exames nem tratamento vazio', async () => {
    const ctx = context();
    await expect(ctx.service.confirm(user, '8', { dataAtendimento: '2026-04-12',
      exames: [{ tipoExameId: '1', bloco: 'solicitado', atendimentoId: '40' }] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(ctx.service.confirm(user, '8', { dataAtendimento: '2026-04-12', tratamentoBzn: {} })).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.database.coordinate).not.toHaveBeenCalled();
  });

  it('valida filhos por campo, preserva false/null e rejeita associação histórica e campos desconhecidos', async () => {
    const valid = plainToInstance(AttendanceConfirmationDto, { dataAtendimento: '2026-04-12',
      condicaoChagas: { possuiSintomas: false }, comorbidades: { itens: [{ comorbidadeId: '7', possuiComorbidade: null }] } });
    expect(await validate(valid, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    const invalid = plainToInstance(AttendanceConfirmationDto, { dataAtendimento: '2026-04-12',
      tratamentoBzn: { atendimentoId: '9' }, encaminhamentos: [{ atendimentoId: '9' }],
      condicaoChagas: { formaClinica: 'inventada' }, sorologias: [{ dataColeta: 'ontem' }] });
    const errors = await validate(invalid, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['tratamentoBzn', 'encaminhamentos', 'condicaoChagas', 'sorologias']));
    expect(fieldValidationException(errors).getResponse()).toMatchObject({ errors: expect.arrayContaining([
      { path: 'condicaoChagas.formaClinica', code: 'option' }, { path: 'sorologias.0.dataColeta', code: 'date' },
    ]) });
    expect(publicAttendancePath('sorologias.30.resultado')).toBe(false);
    expect(publicAttendancePath('tratamentoBzn.atendimentoId')).toBe(false);
  });
});
