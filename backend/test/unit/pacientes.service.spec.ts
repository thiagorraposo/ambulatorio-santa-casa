import { PacientesRepository } from '../../src/pacientes/pacientes.repository';
import { PacientesService } from '../../src/pacientes/pacientes.service';

describe('PacientesService', () => {
  it('mapeia somente os campos públicos do DTO', async () => {
    const repository = { list: jest.fn().mockResolvedValue([
      { paciente_id: '42', nome: 'Paciente Sintético', codigo_planilha: 'interno' },
    ]) } as unknown as PacientesRepository;
    await expect(new PacientesService(repository).list(10)).resolves.toEqual([
      { pacienteId: '42', nome: 'Paciente Sintético' },
    ]);
    expect(repository.list).toHaveBeenCalledWith(10);
  });
});
