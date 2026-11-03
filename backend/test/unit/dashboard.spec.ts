import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DashboardQuery } from '../../src/dashboard/dashboard.dto';
import { dashboardPeriod, DashboardService } from '../../src/dashboard/dashboard.service';

const user = { usuarioId: '31', nome: 'Consulta sintética', perfil: 'consulta' as const };

describe('Dashboard P-05', () => {
  it('usa mês corrente UTC por padrão e período inclusivo explícito', () => {
    expect(dashboardPeriod({}, new Date('2026-11-03T23:00:00Z'))).toEqual({ inicio: '2026-11-01', fim: '2026-11-03' });
    expect(dashboardPeriod({ inicio: '2026-10-30', fim: '2026-10-31' })).toEqual({ inicio: '2026-10-30', fim: '2026-10-31' });
  });
  it.each([
    { inicio: '2026-02-29', fim: '2026-03-01' },
    { inicio: '2026-11-03', fim: '2026-11-02' },
    { inicio: '2024-01-01', fim: '2026-01-01' },
    { inicio: '0000-01-01', fim: '0000-01-02' },
  ])('recusa período impossível/invertido/excessivo: %j', query => {
    expect(() => dashboardPeriod(query)).toThrow(BadRequestException);
  });
  it('recusa data/hora e arrays no DTO', async () => {
    for (const inicio of ['2026-01-01T00:00:00Z', ['2026-01-01']]) {
      expect(await validate(plainToInstance(DashboardQuery, { inicio }))).not.toHaveLength(0);
    }
  });
  it('agrega no escopo com ator e mantém ausência de capacidade distinta de zero', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ pacientes: '3', atendimentos: '3', pendencias: '2',
      lotes: null, pode_lotes: false, atualizado_em: '2026-11-03 12:00:00+00' }] });
    const database = { transaction: jest.fn(async (fn: (tx: unknown) => unknown, actor: string) => {
      expect(actor).toBe('31'); return fn({ query });
    }) };
    const access = { requireEnabled: jest.fn(), identity: jest.fn(), scope: jest.fn().mockReturnValue({
      sql: 'EXISTS (SELECT 1 FROM acesso_paciente ac WHERE ac.paciente_id=p.paciente_id AND ac.usuario_id=$3 AND ac.ativo)', values: ['31'],
    }) };
    const response = await new DashboardService(database as never, access as never).get(user, { inicio: '2026-10-30', fim: '2026-10-31' });
    expect(access.identity).toHaveBeenCalledWith({ query }, user);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('pacientes_autorizados AS MATERIALIZED'), ['2026-10-30', '2026-10-31', '31']);
    expect(response.indicadores.pacientes).toMatchObject({ estado: 'disponivel', valor: 3, periodoAplicado: false });
    expect(response.indicadores.atendimentos).toMatchObject({ valor: 3, periodoAplicado: true });
    expect(response.indicadores.pendencias).toMatchObject({ valor: 2, periodoAplicado: false });
    expect(response.indicadores.lotes).toMatchObject({ estado: 'sem_permissao', valor: null, periodoAplicado: true });
  });
  it('mantém zero autorizado e não converte falha de banco em valor', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ pacientes: '0', atendimentos: '0', pendencias: '0',
      lotes: '0', pode_lotes: true, atualizado_em: '2026-11-03 12:00:00+00' }] });
    const database = { transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn({ query })) };
    const access = { requireEnabled: jest.fn(), identity: jest.fn(), scope: jest.fn().mockReturnValue({ sql: 'TRUE', values: [] }) };
    const service = new DashboardService(database as never, access as never);
    expect((await service.get(user, {})).indicadores.lotes).toMatchObject({ estado: 'disponivel', valor: 0 });
    query.mockRejectedValueOnce(new Error('Falha sintética'));
    await expect(service.get(user, {})).rejects.toThrow('Falha sintética');
    access.identity.mockRejectedValueOnce(new UnauthorizedException());
    await expect(service.get(user, {})).rejects.toThrow(UnauthorizedException);
  });
});
