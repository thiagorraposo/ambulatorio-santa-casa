import { defineConfig, devices } from '@playwright/test';

if (!/^etapa6_frontend_\d+_\d+_[a-f0-9]{6}$/.test(process.env.FRONTEND_E2E_DB ?? '')) {
  throw new Error('Execute Playwright por tests/frontend/test_e2e.sh: API e banco descartáveis obrigatórios.');
}

export default defineConfig({
  testDir: '../tests/frontend',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 40_000,
  expect: { timeout: 8_000 },
  outputDir: `${process.env.FRONTEND_E2E_DIR}/playwright-results`,
  reporter: [['list'], ['json', { outputFile: `${process.env.FRONTEND_E2E_DIR}/results.json` }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.FRONTEND_E2E_BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
