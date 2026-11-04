import { expect, test } from '@playwright/test';
import { apiAs, fixture } from './fixtures';
import { apiJson } from './stage7-helpers';

test('setup de vínculos respeita o limite real antes de conceder acesso sintético', async () => {
  const patient = await apiJson<{ pacienteId: string }>('POST', '/pacientes', {
    nome: 'Etapa 7 Limite de vínculos Sintético',
  });
  const path = `/pacientes/${patient.pacienteId}/acesso/${fixture.users.consulta.usuarioId}`;
  let limited: Response | undefined;
  // Requisições inválidas consomem a janela sem conceder acesso nem alterar clínica.
  for (let attempt = 0; attempt <= 100; attempt++) {
    const response = await apiAs('administracao', 'PUT', path, { ativo: 'inválido', podeEditar: false });
    if (response.status === 429) { limited = response; break; }
    expect(response.status).toBe(400);
  }
  expect(limited, 'O limiter real precisa recusar a concessão antes da escrita').toBeDefined();
  const seconds = Number(limited!.headers.get('retry-after') ?? limited!.headers.get('x-ratelimit-reset'));
  expect(Number.isFinite(seconds) && seconds > 0 && seconds <= 60).toBe(true);
  const started = Date.now();
  const grant = await apiJson<{ ativo: boolean; podeEditar: boolean }>('PUT', path, { ativo: true, podeEditar: false });
  expect(Date.now() - started).toBeGreaterThanOrEqual(seconds * 1000);
  expect(grant).toMatchObject({ ativo: true, podeEditar: false });
  const visible = await apiAs('consulta', 'GET', `/pacientes/${patient.pacienteId}`);
  expect(visible.status).toBe(200);
  expect((await visible.json()).pacienteId).toBe(patient.pacienteId);
});
