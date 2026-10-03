import { PacientesRepository } from '../../src/pacientes/pacientes.repository';
import { PacientesService } from '../../src/pacientes/pacientes.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('PacientesService', () => {
  it('lista somente pelo escopo autenticado, incluindo paginação', async () => {
    const tx = { query: jest.fn() };
    const database = { transaction: jest.fn(async (operation: (value: unknown) => Promise<unknown>) => operation(tx)) } as never;
    const access = { identity: jest.fn().mockResolvedValue(undefined) } as never;
    const repository = { listScoped: jest.fn().mockResolvedValue([
      { paciente_id: '42', nome: 'Paciente Sintético', codigo_planilha: 'interno' },
    ]) } as unknown as PacientesRepository;
    const user = { usuarioId: '1', nome: 'Consulta', perfil: 'consulta' as const };
    const query = { limit: 10, offset: 20 };
    await expect(new PacientesService(repository, database, access).list(query, user)).resolves.toEqual([
      { pacienteId: '42', nome: 'Paciente Sintético' },
    ]);
    expect(repository.listScoped).toHaveBeenCalledWith(tx, query, user, access);
  });

  it('bloqueia exportação CSV quando a política clínica está desabilitada', async () => {
    const database = { transaction: jest.fn(async (operation: (tx: unknown) => Promise<unknown>) => operation({ query: jest.fn() })) } as never;
    const access = {
      policy: 'desabilitada',
      identity: jest.fn().mockRejectedValue(new ServiceUnavailableException()),
    } as never;
    const service = new PacientesService({ list: jest.fn() } as never, database, access);
    await expect(service.exportCsv({ usuarioId: '1', nome: 'Consulta', perfil: 'consulta' },
      { limit: 20, offset: 0 } as never)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('usa transação e escopo explícito ao exportar com vínculo', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ paciente_id: '7', nome: 'Paciente Sintético' }] });
    const database = { transaction: jest.fn(async (operation: (tx: unknown) => Promise<unknown>) => operation({ query })) } as never;
    const access = {
      policy: 'vinculo_explicito',
      identity: jest.fn().mockResolvedValue(undefined),
    } as never;
    const service = new PacientesService({ list: jest.fn() } as never, database, access);
    await expect(service.exportCsv({ usuarioId: '3', nome: 'Consulta', perfil: 'consulta' },
      { limit: 20, offset: 0 } as never)).resolves.toEqual([{ pacienteId: '7', nome: 'Paciente Sintético' }]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('acesso_paciente'), expect.arrayContaining(['3']));
  });

  it('concede vínculo somente pela função administrativa e contexto do ator', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const database = { transaction: jest.fn(async (operation: (tx: unknown) => Promise<unknown>, actor?: string) => {
      expect(actor).toBe('9');
      return operation({ query });
    }) } as never;
    const access = { identity: jest.fn().mockResolvedValue(undefined) } as never;
    const service = new PacientesService({ list: jest.fn() } as never, database, access);
    await expect(service.setAccess({ usuarioId: '9', nome: 'Admin', perfil: 'administracao' }, '4', '8',
      { ativo: true, podeEditar: false })).resolves.toEqual({ pacienteId: '4', usuarioId: '8', ativo: true, podeEditar: false });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('definir_acesso_paciente'), ['4', '8', false, true]);
  });
});
