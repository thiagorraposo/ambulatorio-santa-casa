import type { Transaction } from '../../src/common/database/database.service';
import { ConflictException } from '@nestjs/common';
import { RecursosClinicosService } from '../../src/pacientes/recursos-clinicos.service';

const user = { usuarioId: '9', nome: 'Sintético', perfil: 'edicao' as const };

function context() {
  const query = jest.fn().mockImplementation(async (sql: string) => {
    if (sql.startsWith('INSERT')) return { rows: [{ notificacao_id: '70' }], rowCount: 1 };
    return { rows: [{}], rowCount: 1 };
  });
  const database = { transaction: async <T>(operation: (tx: Transaction) => Promise<T>) => operation({ query }) };
  const access = { patient: jest.fn().mockResolvedValue(undefined) };
  const service = new RecursosClinicosService(database as never, access as never);
  return { service, query, access };
}

describe('Intenção longitudinal na confirmação integrada', () => {
  it('cria vínculo novo e usa DO NOTHING para não substituir informação concorrente', async () => {
    const ctx = context();
    await expect(ctx.service.saveProject(user, '8', { projetoId: '7', participa: false }, true)).resolves.toEqual({ projetoId: '7' });
    const insert = ctx.query.mock.calls.find(([sql]) => sql.startsWith('INSERT'));
    expect(insert![0]).toContain('ON CONFLICT(paciente_id,projeto_estudo_id)');
    expect(insert![0]).toContain('DO NOTHING');
    expect(insert![0]).not.toContain('DO UPDATE');
    expect(insert![1]).toEqual(['8', '7', false]);
    expect(ctx.access.patient).toHaveBeenCalledWith(expect.anything(), user, '8', true);
  });

  it('conflita quando o vínculo já existe, inclusive após corrida no INSERT', async () => {
    const ctx = context();
    ctx.query.mockImplementation(async (sql: string) => ({ rows: [], rowCount: sql.startsWith('INSERT') ? 0 : 1 }));
    await expect(ctx.service.saveProject(user, '8', { projetoId: '7', participa: true }, true)).rejects.toBeInstanceOf(ConflictException);
  });

  it('notificação existente nunca é alterada pela confirmação integrada', async () => {
    const ctx = context();
    await expect(ctx.service.saveNotification(user, '8', { pacienteNotificado: false }, true)).resolves.toEqual({ notificacaoId: '70' });
    const insert = ctx.query.mock.calls.find(([sql]) => sql.startsWith('INSERT'));
    expect(insert![0]).toContain('ON CONFLICT(paciente_id) DO NOTHING');
    expect(insert![1]).toEqual(['8', false]);
    ctx.query.mockImplementation(async (sql: string) => ({ rows: [], rowCount: sql.startsWith('INSERT') ? 0 : 1 }));
    await expect(ctx.service.saveNotification(user, '8', { pacienteNotificado: true }, true)).rejects.toBeInstanceOf(ConflictException);
  });

  it('preserva PUT canônico de projetos e notificação para edição explícita', async () => {
    const ctx = context();
    await ctx.service.saveProject(user, '8', { projetoId: '7', participa: true });
    await ctx.service.saveNotification(user, '8', { pacienteNotificado: true });
    const inserts = ctx.query.mock.calls.filter(([sql]) => sql.startsWith('INSERT'));
    expect(inserts).toHaveLength(2);
    for (const [sql] of inserts) expect(sql).toContain('DO UPDATE SET');
  });
});
