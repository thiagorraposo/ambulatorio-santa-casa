import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

// Public paths are a contract, never validator messages, values or unknown keys.
const roots = new Set(['dataAtendimento', 'localizacaoProntuario', 'ambulatorioUnicamente', 'ambulatorioAnexoProjeto', 'observacoes']);
const clinical = new Set(['alturaCm', 'pesoKg', 'circunferenciaAbdominalCm', 'frequenciaCardiacaBpm', 'saturacaoPercentual', 'paSistolicaMmhg', 'paDiastolicaMmhg', 'nyha', 'observacoes']);
const diagnosis = new Set(['possuiDiagnosticoChagas', 'statusDiagnostico', 'resultadoFinal', 'dataResultadoFinal', 'dataDescobertaAutorelato', 'criterioConfirmacao', 'observacoes']);
export function publicAttendancePath(path: string): boolean {
  const parts = path.split('.');
  if (parts.length === 1) return roots.has(path);
  if (parts.length === 2) return parts[0] === 'dadosClinicos' ? clinical.has(parts[1])
    : parts[0] === 'diagnosticoChagas' ? diagnosis.has(parts[1])
    : parts[0] === 'rastreioFamiliar' && parts[1] === 'familiaresExaminados';
  if (parts.length === 3 && /^(?:[0-9]|[12][0-9])$/.test(parts[1])) {
    return parts[0] === 'exames' ? ['tipoExameId', 'bloco', 'identificacao', 'resultado', 'observacoes'].includes(parts[2])
      : parts[0] === 'pendencias' && ['descricao', 'status', 'dataResolucao'].includes(parts[2]);
  }
  return parts.length === 4 && parts[0] === 'rastreioFamiliar' && parts[1] === 'familiares'
    && /^(?:[0-9]|[1-4][0-9])$/.test(parts[2]) && ['familiar', 'resultado'].includes(parts[3]);
}
export interface FieldViolation { path: string; code: string }
export function fieldValidationException(errors: ValidationError[]): BadRequestException {
  const violations: FieldViolation[] = [];
  function visit(items: ValidationError[], parent = ''): void {
    for (const error of items) {
      const path = parent ? `${parent}.${error.property}` : error.property;
      if (error.constraints && publicAttendancePath(path)) {
        const keys = Object.keys(error.constraints);
        const code = keys.some(key => ['isDateString', 'matches'].includes(key)) && /[Dd]ata/.test(path) ? 'date'
          : keys.includes('isInt') ? 'integer' : keys.includes('isNumber') ? 'number'
          : keys.includes('maxLength') || keys.includes('isLength') ? 'length'
          : keys.includes('isBoolean') || keys.includes('isIn') ? 'option' : 'invalid';
        violations.push({ path, code });
      }
      if (error.children) visit(error.children, path);
    }
  }
  visit(errors);
  return new BadRequestException({ message: 'Revise os campos informados.', errors: violations });
}
export function attendanceContextException(): BadRequestException {
  return new BadRequestException({ message: 'Revise o contexto do atendimento.', errors: [
    { path: 'ambulatorioUnicamente', code: 'attendance_context' },
    { path: 'ambulatorioAnexoProjeto', code: 'attendance_context' },
  ] });
}
