export const NOT_INFORMED = 'Não informado';

export function displayText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return NOT_INFORMED;
  return value === '' ? 'Em branco' : String(value);
}

export function triState(value: boolean | null | undefined): string {
  return value === true ? 'Sim' : value === false ? 'Não' : NOT_INFORMED;
}

// Datas clínicas representam dias, não instantes. Não passar por Date evita
// deslocamento de fuso horário. Valores não reconhecidos permanecem visíveis.
export function formatClinicalDate(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return displayText(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

// NUMERIC chega em texto. A troca do separador preserva todos os dígitos e a
// escala retornada pelo servidor, inclusive zeros à direita.
export function formatNumeric(value: string | number | null | undefined, unit?: string): string {
  if (value === null || value === undefined || value === '') return displayText(value);
  const raw = String(value);
  const presented = /^-?\d+(\.\d+)?$/.test(raw) ? raw.replace('.', ',') : raw;
  return unit ? `${presented} ${unit}` : presented;
}

export function formatAge(age: number | null, reference: string): string {
  return age === null
    ? `Idade não informada · referência: ${formatClinicalDate(reference)}`
    : `${age} ${age === 1 ? 'ano' : 'anos'} · referência: ${formatClinicalDate(reference)}`;
}

const labels: Readonly<Record<string, string>> = {
  feminino: 'Feminino', masculino: 'Masculino', outro: 'Outro', nao_informado: NOT_INFORMED,
  branca: 'Branca', preta: 'Preta', parda: 'Parda', amarela: 'Amarela', indigena: 'Indígena',
  aberta: 'Aberta', em_andamento: 'Em andamento', resolvida: 'Resolvida', cancelada: 'Cancelada',
  indicado: 'Indicado', solicitado: 'Solicitado', agendado: 'Agendado', realizado: 'Realizado',
  pendente: 'Pendente', cancelado: 'Cancelado', nao_compareceu: 'Não compareceu',
  programado: 'Programado', concluido: 'Concluído', perdido_seguimento: 'Perdido seguimento',
  baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
  leve: 'Leve', moderada: 'Moderada', grave: 'Grave',
  ambulatorio: 'Ambulatório', projeto_pesquisa: 'Projeto de pesquisa', atencao_basica: 'Atenção básica',
  servico_especializado: 'Serviço especializado', hospital: 'Hospital', demanda_espontanea: 'Demanda espontânea',
  confirmado: 'Confirmado', suspeito: 'Suspeito', descartado: 'Descartado', indeterminado: 'Indeterminado',
  positivo: 'Positivo', negativo: 'Negativo', reagente: 'Reagente', nao_reagente: 'Não reagente',
  trazido: 'Trazido', exames_trazidos: 'Exames trazidos', exames_solicitados: 'Exames solicitados',
  retorno_bzn: 'Retorno BZN', retorno_anual: 'Retorno anual',
  retorno_bzn_30_dias: 'Retorno BZN de 30 dias', retorno_bzn_final: 'Retorno BZN final',
  ultimo_comparecimento_ano_informado: 'Último comparecimento — ano informado', ano: 'Ano',
};

export function clinicalLabel(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return displayText(value);
  return Object.hasOwn(labels, value) ? labels[value]! : value;
}
