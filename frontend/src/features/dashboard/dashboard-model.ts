export type DashboardKey = 'pacientes' | 'atendimentos' | 'pendencias' | 'lotes';
export interface DashboardIndicator {
  estado: 'disponivel' | 'sem_permissao'; valor: number | null; definicao: string; periodoAplicado: boolean;
}
export interface DashboardResponse {
  periodo: { inicio: string; fim: string; limites: 'inclusivos'; tempoLotes: 'timestamp_sem_fuso' };
  atualizadoEm: string; indicadores: Record<DashboardKey, DashboardIndicator>;
}
export const dashboardCards: Array<{ key: DashboardKey; title: string }> = [
  { key: 'pacientes', title: 'Pacientes autorizados' },
  { key: 'atendimentos', title: 'Atendimentos realizados' },
  { key: 'pendencias', title: 'Pendências abertas' },
  { key: 'lotes', title: 'Lotes de importação concluídos' },
];
export function defaultDashboardPeriod(now = new Date()) {
  const fim = now.toISOString().slice(0, 10);
  return { inicio: `${fim.slice(0, 7)}-01`, fim };
}
export function validDashboardPeriod(inicio: string, fim: string): boolean {
  const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '0001-01-01'
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  return date(inicio) && date(fim) && inicio <= fim && Date.parse(fim) - Date.parse(inicio) <= 366 * 86400000;
}
export const displayDashboardDate = (value: string) => value.split('-').reverse().join('/');
export function validDashboardResponse(value: DashboardResponse): boolean {
  return !!value && validDashboardPeriod(value.periodo?.inicio ?? '', value.periodo?.fim ?? '')
    && Number.isFinite(Date.parse(value.atualizadoEm)) && dashboardCards.every(({ key }) => {
      const indicator = value.indicadores?.[key];
      return indicator && typeof indicator.definicao === 'string' && typeof indicator.periodoAplicado === 'boolean'
        && (indicator.estado === 'sem_permissao' ? indicator.valor === null
          : indicator.estado === 'disponivel' && Number.isSafeInteger(indicator.valor) && indicator.valor! >= 0);
    });
}
