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
    expect(query).toHaveBeenCalledWith(expect.stringContaining('pacientes_autorizados AS MATERIALIZED'), ['2026-10-30', '2026-10-31', '31', 20, 0]);
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


describe('Dashboard filtered CSV contract', () => {
  function service(rows: unknown[] = []) {
    const query = jest.fn().mockResolvedValueOnce({ rows });
    const database = { transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn({ query })) };
    const access = { requireEnabled: jest.fn(), identity: jest.fn(), scope: jest.fn().mockReturnValue({
      sql: 'p.paciente_id IN (SELECT paciente_id FROM acesso_paciente WHERE usuario_id=$3)', values: ['31'],
    }) };
    return { query, access, service: new DashboardService(database as never, access as never) };
  }
  it('valida dimensões, paginação e ordenação por allowlist', async () => {
    for (const input of [{ pacienteId: '0' }, { projetoId: '1 OR TRUE' }, { sexo: 'x' },
      { statusPendencia: 'cancelada' }, { ordenacao: 'nome DESC; SELECT 1' }, { limit: '101' },
      { offset: '-1' }, { nome: ['A','B'] }, { limit: ['1','2'] }]) {
      expect(await validate(plainToInstance(DashboardQuery, input))).not.toHaveLength(0);
    }
    expect(await validate(plainToInstance(DashboardQuery, { pacienteId: '12', projetoId: '2',
      sexo: 'feminino', statusPendencia: 'resolvida', ordenacao: 'nome_asc', limit: '10', offset: '20' }))).toHaveLength(0);
  });
  it('exporta todas as linhas filtradas e audita sem guardar nome pesquisado ou paginação', async () => {
    const row = { pacienteId: '1', nome: '=CMD()', atendimentoId: '2', dataAtendimento: '2026-10-31', pendenciasAbertas: 1 };
    const setup = service([row]);
    expect(await setup.service.exportCsv(user, { inicio: '2026-10-30', fim: '2026-10-31',
      nome: 'busca sintética', pacienteId: '1', sexo: 'feminino', projetoId: '2', statusPendencia: 'aberta',
      ordenacao: 'nome_asc', limit: 1, offset: 100 })).toEqual([row]);
    const [sql, values] = setup.query.mock.calls[0];
    expect(sql).toContain('LIMIT 5001'); expect(sql).not.toContain('OFFSET');
    expect(sql).toContain('AND pp.participa IS TRUE'); expect(sql).toContain('ORDER BY nome ASC,paciente_id ASC');
    expect(values).toEqual(['2026-10-30', '2026-10-31', '31', '%busca sintética%', '1', 'feminino', '2', 'aberta']);
    expect(setup.access.identity).toHaveBeenCalled();
    const [auditSql, auditValues] = setup.query.mock.calls[1];
    expect(auditSql).toContain('dashboard_registrar_exportacao');
    expect(JSON.parse(auditValues[0])).toEqual({ inicio: '2026-10-30', fim: '2026-10-31',
      pacienteId: '1', nomeFiltrado: true, sexo: 'feminino', projetoId: '2', statusPendencia: 'aberta' });
    expect(auditValues.slice(1)).toEqual(['nome_asc', 1]);
  });
  it('não entrega nem audita arquivo truncado acima de5000', async () => {
    const setup = service(Array.from({ length: 5001 }, () => ({})));
    await expect(setup.service.exportCsv(user, {})).rejects.toThrow('Exportação excede 5000');
    expect(setup.query).toHaveBeenCalledTimes(1);
  });
});
