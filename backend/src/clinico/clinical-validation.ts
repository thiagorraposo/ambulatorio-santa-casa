import { BadRequestException, PipeTransform } from '@nestjs/common';

export class ClinicalIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) {
      throw new BadRequestException('Identificador inválido');
    }
    return value;
  }
}

export function rejectFuture(date: string | null | undefined, reference: string): void {
  if (date && date > reference) throw new BadRequestException('Data de fato realizado não pode ser futura');
}

export function validatePendingResolution(status: string | null | undefined,
  date: string | null | undefined): void {
  if (status === 'resolvida' && !date) throw new BadRequestException('Resolução exige data informada');
  if (status !== 'resolvida' && date) throw new BadRequestException('Data de resolução exige status resolvida');
}

export function databaseConflict(error: unknown): never {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (['23502', '23503', '23514', '22003', '22007', '22008'].includes(code)) {
    throw new BadRequestException('Dados incompatíveis com o recurso ou seu contrato');
  }
  throw error;
}
