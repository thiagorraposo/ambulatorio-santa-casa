import type { MedicamentoResponse } from '../../api/contracts';
import { displayText, formatClinicalDate, triState } from '../../shared/formatters';

export const medicamentoFields = [
  ['medicamentoId','Identificação no catálogo'],['codigoMedicamento','Código do catálogo'],
  ['nomeMedicamento','Nome no catálogo'],['principioAtivo','Princípio ativo no catálogo'],
  ['classeMedicamento','Classe no catálogo'],['nomeMedicamentoLivre','Nome livre informado'],
  ['tipoRegistro','Tipo de registro'],['finalidadeUso','Finalidade informada'],['dose','Dose informada'],
  ['viaAdministracao','Via informada'],['frequencia','Frequência informada'],['dataInicio','Data de início informada'],
  ['dataFim','Data de fim informada'],['usoAtual','Uso atual informado'],
  ['prescritoNoAtendimento','Prescrito neste atendimento'],['statusUso','Estado de uso informado'],
  ['motivo','Motivo informado'],['observacoes','Observações do medicamento'],
] as const satisfies ReadonlyArray<readonly [keyof MedicamentoResponse,string]>;
export type MedicamentoField = typeof medicamentoFields[number][0];
export function medicamentoValue(name: MedicamentoField, value: string | boolean | null): string {
  if (name === 'usoAtual' || name === 'prescritoNoAtendimento') return triState(value as boolean | null);
  if (name === 'dataInicio' || name === 'dataFim') return formatClinicalDate(value as string | null);
  return displayText(value as string | null);
}
