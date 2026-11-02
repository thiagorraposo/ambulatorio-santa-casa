import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { fieldValidationException } from '../../src/common/http/field-validation';
import { AttendanceCreateDto, AttendanceUpdateDto } from '../../src/clinico/dto/clinico.dto';
import { databaseConflict } from '../../src/clinico/clinical-validation';

const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true,
  exceptionFactory: fieldValidationException });
const parse = (body: unknown, metatype = AttendanceCreateDto) => pipe.transform(body, { type: 'body', metatype });

describe('contrato sanitizado de validação do atendimento', () => {
  it('identifica datas e filhos por caminho e código sem ecoar valores ou validadores', async () => {
    try {
      await parse({ dataAtendimento: 'SELECT segredo', dadosClinicos: { frequenciaCardiacaBpm: 1.5 },
        exames: [{ tipoExameId: '1', bloco: 'incorreto' }],
        pendencias: [{ descricao: 'Sintética', dataResolucao: 'SQL privado' }],
        rastreioFamiliar: { familiaresExaminados: true, familiares: [{ familiar: 'Sintético', resultado: 123 }] } });
      throw new Error('Deveria rejeitar');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const body = (error as BadRequestException).getResponse();
      expect(body).toMatchObject({ errors: expect.arrayContaining([
        { path: 'dataAtendimento', code: 'date' }, { path: 'dadosClinicos.frequenciaCardiacaBpm', code: 'integer' },
        { path: 'exames.0.bloco', code: 'option' }, { path: 'pendencias.0.dataResolucao', code: 'date' },
        { path: 'rastreioFamiliar.familiares.0.resultado', code: 'length' },
      ]) });
      expect(JSON.stringify(body)).not.toMatch(/SELECT|SQL privado|isDateString|target|value/);
    }
  });
  it('não publica nomes de campos desconhecidos recebidos na requisição', async () => {
    await expect(parse({ dataAtendimento: '2026-02-01', segredo: 'token' })).rejects.toMatchObject({
      response: { message: 'Revise os campos informados.', errors: [] },
    });
  });
  it('preserva ausência, false, null e números no payload válido', async () => {
    const body = { dataAtendimento: '2026-02-01', ambulatorioUnicamente: false, ambulatorioAnexoProjeto: null,
      dadosClinicos: { pesoKg: 60.25, frequenciaCardiacaBpm: 0 } };
    await expect(parse(body)).resolves.toMatchObject(body);
  });
  it('traduz apenas a constraint conhecida de contexto, sem detalhes SQL', () => {
    for (const payload of [{ code: '23514', constraint: 'chk_atendimento_contexto_ambulatorio', detail: 'SQL privado' }]) {
      try { databaseConflict(payload); } catch (error) {
        expect((error as BadRequestException).getResponse()).toEqual({ message: 'Revise o contexto do atendimento.', errors: [
          { path: 'ambulatorioUnicamente', code: 'attendance_context' },
          { path: 'ambulatorioAnexoProjeto', code: 'attendance_context' },
        ] });
      }
    }
    expect(() => databaseConflict({ code: '23514', constraint: 'desconhecida', detail: 'SQL privado' }))
      .toThrow('Dados incompatíveis com o recurso ou seu contrato');
    const internal = new Error('SQL privado');
    expect(() => databaseConflict(internal)).toThrow(internal);
  });
  it.each([
    ['alturaCm', 1000, 'decimal_range'], ['pesoKg', -1000, 'decimal_range'],
    ['circunferenciaAbdominalCm', 1000, 'decimal_range'], ['saturacaoPercentual', 1000, 'decimal_range'],
    ['frequenciaCardiacaBpm', 2147483648, 'integer_range'], ['paSistolicaMmhg', -2147483649, 'integer_range'],
    ['paDiastolicaMmhg', 2147483648, 'integer_range'],
  ])('localiza o limite físico de %s sem inventar faixa clínica', async (field, value, code) => {
    await expect(parse({ dataAtendimento: '2026-02-01', dadosClinicos: { [field]: value } })).rejects.toMatchObject({
      response: { errors: [{ path: `dadosClinicos.${field}`, code }] },
    });
  });
  it('preserva limites físicos, zero, negativos e null sem interpretar normalidade clínica', async () => {
    const body = { dataAtendimento: '2026-02-01', dadosClinicos: { alturaCm: -999.99, pesoKg: 999.99,
      circunferenciaAbdominalCm: 0, saturacaoPercentual: null, frequenciaCardiacaBpm: -2147483648,
      paSistolicaMmhg: 2147483647, paDiastolicaMmhg: 0 } };
    await expect(parse(body)).resolves.toMatchObject(body);
  });
  it('mantém a validação da versão no PATCH', async () => {
    await expect(pipe.transform({ versao: 'incorreta', observacoes: 'Sintético' },
      { type: 'body', metatype: AttendanceUpdateDto })).rejects.toBeInstanceOf(BadRequestException);
  });
});
