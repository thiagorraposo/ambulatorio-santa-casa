import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

// Public paths are a contract, never validator messages, values or unknown keys.
const roots = new Set(['dataAtendimento', 'localizacaoProntuario', 'ambulatorioUnicamente', 'ambulatorioAnexoProjeto', 'observacoes']);
const clinical = new Set(['alturaCm', 'pesoKg', 'circunferenciaAbdominalCm', 'frequenciaCardiacaBpm', 'saturacaoPercentual', 'paSistolicaMmhg', 'paDiastolicaMmhg', 'nyha', 'observacoes']);
const diagnosis = new Set(['possuiDiagnosticoChagas', 'statusDiagnostico', 'resultadoFinal', 'dataResultadoFinal', 'dataDescobertaAutorelato', 'criterioConfirmacao', 'observacoes']);
// Only declared contract keys may enter public errors; arbitrary payload keys stay private.
const confirmationFields: Record<string, readonly string[]> = {
  condicaoChagas: ['formaClinica', 'faseDoenca', 'classificacaoClinica', 'possuiSintomas', 'descricaoSintomas', 'observacoes'],
  sorologias: ['metodoSorologico', 'dataSolicitacao', 'dataColeta', 'dataResultado', 'resultado', 'laboratorio', 'observacoes'],
  complicacoesChagas: ['tipoComplicacao', 'possuiComplicacao', 'descricao', 'gravidade'],
  avcs: ['ocorreu', 'anoEvento', 'descricao', 'observacoes'],
  dispositivos: ['tipoDispositivo', 'possuiDispositivo', 'observacoes'],
  obito: ['houveObito', 'dataObito', 'causaObito', 'observacoes'],
  projetos: ['projetoId', 'participa', 'possuiPendencia', 'descricaoPendencia', 'houveFalha', 'descricaoFalha', 'observacoes'],
  tratamentoBzn: ['temIndicacao', 'iniciado', 'tratamentoPeloAmbulatorio', 'duracaoCumpridaDias', 'anoUsoAproximado', 'dataPrescricao', 'motivoNaoIndicacao', 'motivoNaoInicio', 'teveReacaoAdversa', 'observacoes'],
  encaminhamentos: ['tipoEncaminhamentoId', 'projetoId', 'origem', 'destinoNome', 'destinoServico', 'especialidadeDestino', 'dataEncaminhamento', 'dataAgendamento', 'dataRealizacao', 'status', 'prioridade', 'documentoApresentado', 'motivo', 'condutaOrientada', 'observacoes'],
  notificacao: ['pacienteNotificado', 'numeroNotificacao', 'justificativaNaoNotificacao', 'observacoes'],
};
function publicConfirmationPath(parts: string[]): boolean {
  const fields = confirmationFields[parts[0]];
  if (fields && parts.length === 2 && ['condicaoChagas', 'obito', 'tratamentoBzn', 'notificacao'].includes(parts[0])) return fields.includes(parts[1]);
  if (fields && parts.length === 3 && /^(?:[0-9]|[12][0-9])$/.test(parts[1])
    && ['sorologias', 'complicacoesChagas', 'avcs', 'dispositivos', 'projetos', 'encaminhamentos'].includes(parts[0])) return fields.includes(parts[2]);
  if (parts[0] === 'comorbidades') {
    return parts.length === 3 && parts[1] === 'historicoFamiliar' && ['possuiDoenca', 'descricao'].includes(parts[2])
      || parts.length === 4 && parts[1] === 'itens' && /^(?:[0-9]|[1-9][0-9])$/.test(parts[2])
        && ['comorbidadeId', 'possuiComorbidade', 'observacoes'].includes(parts[3]);
  }
  return parts.length === 4 && parts[0] === 'tratamentoBzn' && parts[1] === 'reacoes'
    && /^(?:[0-9]|[12][0-9])$/.test(parts[2]) && ['descricao', 'gravidade', 'dataReacao', 'consequencia', 'observacoes'].includes(parts[3]);
}
export function publicAttendancePath(path: string): boolean {
  const parts = path.split('.');
  if (publicConfirmationPath(parts)) return true;
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
const isClinicalNumberPath = (path: string): boolean => path.startsWith('dadosClinicos.')
  && clinical.has(path.split('.')[1]) && !['nyha', 'observacoes'].includes(path.split('.')[1]);
export interface FieldViolation { path: string; code: string }
export function fieldValidationException(errors: ValidationError[]): BadRequestException {
  const violations: FieldViolation[] = [];
  function visit(items: ValidationError[], parent = ''): void {
    for (const error of items) {
      const path = parent ? `${parent}.${error.property}` : error.property;
      if (error.constraints && publicAttendancePath(path)) {
        const keys = Object.keys(error.constraints);
        const code = keys.some(key => ['isDateString', 'matches'].includes(key)) && /[Dd]ata/.test(path) ? 'date'
          : (keys.includes('min') || keys.includes('max')) && isClinicalNumberPath(path) ?
            (['frequenciaCardiacaBpm', 'paSistolicaMmhg', 'paDiastolicaMmhg'].includes(path.split('.')[1]) ? 'integer_range' : 'decimal_range')
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

export function attendanceFieldException(path: string, code: string): BadRequestException {
  return new BadRequestException({ message: 'Revise os campos informados.', errors: [{ path, code }] });
}
