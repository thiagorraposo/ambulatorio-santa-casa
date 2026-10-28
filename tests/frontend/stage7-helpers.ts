import AxeBuilder from '@axe-core/playwright';
import { expect, type APIResponse, type Page, type Response as BrowserResponse } from '@playwright/test';
import type { AtendimentoDetalheResponse, PacienteDetalheResponse } from '../../frontend/src/api/contracts';
import { apiAs, fixture, type Perfil } from './fixtures';
export { signIn } from './fixtures';

export async function nextAttendanceStep(page: Page) {
  await page.getByRole('button', { name: 'Próxima etapa', exact: true }).click();
}

export async function reviewAttendance(page: Page) {
  await page.getByRole('button', { name: 'Revisar atendimento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Revisão', exact: true })).toBeVisible();
}

export async function moveAttendanceToReview(page: Page) {
  await nextAttendanceStep(page);
  await nextAttendanceStep(page);
  await nextAttendanceStep(page);
  await reviewAttendance(page);
}

export async function apiJson<T>(method: string, path: string, body?: unknown, perfil: Perfil = 'administracao'): Promise<T> {
  const response = await apiAs(perfil, method, path, body);
  expect(response.status, `${method} ${path}`).toBe(method === 'POST' ? 201 : 200);
  return await response.json() as T;
}

export async function seedPatient(label: string, extra: Record<string, unknown> = {}) {
  const patient = await apiJson<{ pacienteId: string }>('POST', '/pacientes', {
    nome: `Etapa 7 ${label} Sintético`, ...extra,
  });
  expect(typeof patient.pacienteId).toBe('string');
  for (const perfil of ['consulta', 'edicao'] as const) {
    await apiJson('PUT', `/pacientes/${patient.pacienteId}/acesso/${fixture.users[perfil].usuarioId}`, {
      ativo: true, podeEditar: perfil === 'edicao',
    });
  }
  return { ...patient, path: `/pacientes/${patient.pacienteId}` };
}

export async function seedAttendance(patientPath: string, extra: Record<string, unknown> = {}) {
  const attendance = await apiJson<{ atendimentoId: string }>('POST', `${patientPath}/atendimentos`, {
    dataAtendimento: '2026-04-03', ...extra,
  });
  expect(typeof attendance.atendimentoId).toBe('string');
  return { ...attendance, path: `${patientPath}/atendimentos/${attendance.atendimentoId}` };
}

export const readPatient = (path: string) => apiJson<PacienteDetalheResponse>('GET', `${path}?limit=100&offset=0`);
export const readAttendance = (path: string) => apiJson<AtendimentoDetalheResponse>('GET', `${path}?limit=100&offset=0`);

export async function submitWrite(page: Page, method: string, path: string, button: string, expectedStatus = method === 'POST' ? 201 : 200) {
  const traffic: string[] = [];
  const observe = (response: BrowserResponse) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith('/v1/')) {
      traffic.push(`${response.request().method()} ${pathname} ${response.status()}`);
      if (traffic.length > 12) traffic.shift();
    }
  };
  page.on('response', observe);
  const control = page.getByRole('button', { name: button, exact: true });
  try {
    expect(await control.evaluate(node => node.closest('form')?.checkValidity()), 'Formulário válido antes da confirmação').toBe(true);
    const [response] = await Promise.all([
      page.waitForResponse(item => item.request().method() === method
        && new URL(item.url()).pathname === `/v1${path}`, { timeout: 30_000 }),
      control.click(),
    ]);
    expect(response.status()).toBe(expectedStatus);
    return { response, body: response.request().postDataJSON() as Record<string, unknown> };
  } catch (error) {
    // No field values, headers, bodies or arbitrary server diagnostics enter this report.
    const form = await control.evaluate(node => {
      const form = node.closest('form');
      return { disabled: (node as HTMLButtonElement).disabled, busy: form?.getAttribute('aria-busy'),
        invalid: Array.from(form?.elements ?? []).filter(item => 'validity' in item && !(item as HTMLInputElement).validity.valid)
          .map(item => {
            const input = item as HTMLInputElement;
            const validity = input.validity;
            return { type: input.type, hasValue: typeof input.value === 'string' && input.value !== '', min: input.min, max: input.max, step: input.step,
              validity: { valueMissing: validity.valueMissing, badInput: validity.badInput,
                rangeUnderflow: validity.rangeUnderflow, rangeOverflow: validity.rangeOverflow,
                stepMismatch: validity.stepMismatch, patternMismatch: validity.patternMismatch,
                typeMismatch: validity.typeMismatch, tooLong: validity.tooLong, tooShort: validity.tooShort,
                customError: validity.customError },
              label: Array.from(input.labels ?? []).map(label => label.textContent?.trim()).join(' ').slice(0, 120) };
          }),
        alerts: Array.from(form?.querySelectorAll('[role="alert"]') ?? []).map(item => item.textContent?.slice(0, 500)) };
    }).catch(() => ({ unavailable: true }));
    console.error('Diagnóstico da confirmação sintética:', JSON.stringify({ method, path, traffic, form }));
    throw error;
  } finally { page.off('response', observe); }
}

export async function visitByLink(page: Page, path: string) {
  // Navigation now carries the source page and attendance. Check all requested
  // parameters while allowing that additional context to travel with the link.
  let href: string | undefined;
  await expect.poll(async () => {
    href = await page.locator('a[href]').evaluateAll((links, requested) => {
      const target = new URL(requested, location.origin);
      return links.map(link => link.getAttribute('href')!).find(value => {
        const candidate = new URL(value, location.origin);
        return candidate.pathname === target.pathname && [...target.searchParams]
          .every(([key, item]) => candidate.searchParams.get(key) === item);
      });
    }, path);
    return href;
  }, { message: `Link para ${path}` }).toBeTruthy();
  await page.locator(`a[href=${JSON.stringify(href)}]`).first().click();
  await expect.poll(() => `${new URL(page.url()).pathname}${new URL(page.url()).search}${new URL(page.url()).hash}`).toBe(href);
  // Router updates location before React commits the destination. Wait for
  // that destination so a following click cannot select a link from the old UI.
  const target = new URL(path, page.url());
  if (/^\/pacientes\/[1-9]\d*$/.test(target.pathname)) {
    await expect(page.getByRole('heading', { level: 1, name: 'Ficha do paciente', exact: true })).toBeVisible();
  } else if (target.pathname.endsWith('/registrar') && target.searchParams.has('tipo')) {
    const current = page.getByRole('navigation', { name: 'Operações clínicas', exact: true }).locator('a[aria-current="page"]');
    await expect(current).toHaveAttribute('href', new RegExp(`[?&]tipo=${target.searchParams.get('tipo')}(?:&|$)`));
  }
}

export async function assertAccessible(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(result.violations.map(violation => ({ id: violation.id, impact: violation.impact,
    nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([]);
}

export async function assertFitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

// A escrita acontece na API real. Somente a entrega de sua resposta ao
// navegador é interrompida, reproduzindo uma conexão perdida após o commit.
export async function loseResponseAfterCommit(page: Page, method: string, path: string) {
  let announce!: (response: APIResponse) => void;
  const committed = new Promise<APIResponse>(resolve => { announce = resolve; });
  let writes = 0;
  let requestBody: Record<string, unknown> | null = null;
  let first = true;
  page.on('request', request => {
    if (request.method() === method && new URL(request.url()).pathname === `/v1${path}`) writes++;
  });
  await page.route(`**/v1${path}`, async route => {
    if (route.request().method() !== method || !first) { await route.continue(); return; }
    first = false;
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    const response = await route.fetch();
    announce(response);
    await route.abort('connectionreset');
  });
  return { committed, writes: () => writes, requestBody: () => requestBody };
}
