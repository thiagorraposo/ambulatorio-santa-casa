import { describe, expect, it } from 'vitest';
import type { AtendimentoDetalheResponse, PacienteDetalheResponse } from '../../api/contracts';
import { attendanceBody, attendanceInitial, patientBody, patientInitial, type AttendanceDraft } from './core-contracts';

const patient: PacienteDetalheResponse = {
  pacienteId: '9007199254740993', nome: 'Paciente sintético', dataNascimento: null, sexo: 'nao_informado', idade: null,
  dataReferenciaIdade: '2026-10-04', raca: '', pertenceComunidadeTradicional: null, tipoComunidadeTradicional: null,
  versao: '9007199254740994', endereco: { endereco: 'Endereço anterior sintético', cidade: null }, telefones: ['000000000'],
  paginacaoColecoes: { limit: 20, offset: 0 }, atendimentos: [],
};
const attendance: AtendimentoDetalheResponse = {
  atendimentoId: '9007199254740995', dataAtendimento: '2026-02-01', localizacaoProntuario: null,
  ambulatorioUnicamente: null, ambulatorioAnexoProjeto: false, observacoes: 'Anterior', versao: '12345678901234567',
  dadosClinicos: null, diagnosticoChagas: null, exames: [], pendencias: [], rastreioFamiliar: null,
  rastreiosFamiliares: [], paginacaoColecoes: { limit: 20, offset: 0 },
};
function draft(): AttendanceDraft {
  const initial = attendanceInitial();
  return { values: { ...initial, dataAtendimento: '2026-02-02' }, initial, clinical: {}, diagnosis: {},
    exams: [], pending: [], families: [], familyStatus: '' };
}

describe('escrita cadastral e atendimento composto', () => {
  it('envia apenas alterações, preserva ausências, endereço e versão original textual', () => {
    const values = { ...patientInitial(patient), cidade: 'Cidade sintética nova' };
    expect(patientBody(values, ['000000001'], patient)).toEqual({ versao: patient.versao,
      endereco: { cidade: 'Cidade sintética nova' }, telefonesAdicionar: ['000000001'] });
  });
  it('permite remover explicitamente campo conhecido, sem transformar desconhecidos em falso', () => {
    expect(patientBody({ ...patientInitial(patient), sexo: '' }, [], patient)).toEqual({ versao: patient.versao, sexo: null });
    expect(patientBody({ ...patientInitial(), nome: 'Nome sintético' }, [])).toEqual({ nome: 'Nome sintético' });
  });
  it('recusa telefone adicionado em branco em vez de descartá-lo silenciosamente', () => {
    expect(() => patientBody(patientInitial(patient), ['000000001', ''], patient)).toThrow(/telefone/);
  });
  it('edita somente núcleo com a versão inicial, mesmo se filhos são presentes na resposta', () => {
    const initial = attendanceInitial(attendance);
    expect(attendanceBody({ ...draft(), values: { ...initial, observacoes: 'Alteração sintética' },
      initial, original: attendance, clinical: { pesoKg: '60' } })).toEqual({ versao: attendance.versao, observacoes: 'Alteração sintética' });
  });
  it('edita legado sem data preservando desconhecido e a versão textual original', () => {
    const original = { ...attendance, dataAtendimento: null };
    const initial = attendanceInitial(original);
    expect(attendanceBody({ ...draft(), initial, original,
      values: { ...initial, observacoes: 'Correção sem estimar data' } })).toEqual({
      versao: original.versao, observacoes: 'Correção sem estimar data',
    });
    expect(attendanceBody({ ...draft(), initial, original,
      values: { ...initial, dataAtendimento: '2020-01-01' } })).toEqual({
      versao: original.versao, dataAtendimento: '2020-01-01',
    });
  });
  it('continua exigindo data em criação e impede apagar data conhecida na edição', () => {
    const initial = attendanceInitial(attendance);
    expect(() => attendanceBody({ ...draft(), values: { ...draft().values, dataAtendimento: '' } })).toThrow(/Data do atendimento/);
    expect(() => attendanceBody({ ...draft(), original: attendance, initial,
      values: { ...initial, dataAtendimento: '', observacoes: 'Outra alteração' } })).toThrow(/Data do atendimento/);
  });
  it('envia criação transacional com descoberta distinta, exame solicitado sem resultado e familiar identificado', () => {
    const value = draft();
    value.clinical = { pesoKg: '65.50', frequenciaCardiacaBpm: '70' };
    value.diagnosis = { dataDescobertaAutorelato: '2011-03-04', resultadoFinal: 'nao_informado' };
    value.exams = [{ tipoExameId: '9007199254740993', bloco: 'solicitado', identificacao: 'Exame sintético', resultado: '', observacoes: '',
      catalog: { id: '9007199254740993', codigo: 'outro', nome: 'Outro', ativo: true } }];
    value.familyStatus = 'sim'; value.families = [{ familiar: 'Irmão sintético', resultado: 'Inconclusivo sintético' }];
    value.pending = [{ descricao: 'Trazer resultado sintético', status: 'aberta' }];
    expect(attendanceBody(value)).toEqual({ dataAtendimento: '2026-02-02',
      dadosClinicos: { pesoKg: 65.5, frequenciaCardiacaBpm: 70 },
      diagnosticoChagas: { dataDescobertaAutorelato: '2011-03-04', resultadoFinal: 'nao_informado' },
      exames: [{ tipoExameId: '9007199254740993', bloco: 'solicitado', identificacao: 'Exame sintético' }],
      pendencias: value.pending, rastreioFamiliar: { familiaresExaminados: true, familiares: value.families } });
  });
  it('recusa dados familiares incompatíveis e categorias genéricas não identificadas', () => {
    const value = draft(); value.familyStatus = 'sim';
    expect(() => attendanceBody(value)).toThrow(/familiar/);
    value.families = [{ familiar: 'Familiar sintético', resultado: 'Resultado sintético' }]; value.familyStatus = 'nao';
    expect(() => attendanceBody(value)).toThrow(/descartado/);
    value.familyStatus = 'sim';
    value.exams = [{ tipoExameId: '42', bloco: 'trazido', identificacao: '', resultado: '', observacoes: '',
      catalog: { id: '42', codigo: 'laboratoriais', nome: 'Laboratoriais', ativo: true } }];
    expect(() => attendanceBody(value)).toThrow(/identifique/);
  });
  it('preserva rastreio explicitamente desconhecido e valida precisão das medidas', () => {
    const value = draft(); value.familyStatus = 'desconhecido';
    expect(attendanceBody(value).rastreioFamiliar).toEqual({ familiaresExaminados: null, familiares: [] });
    value.clinical = { frequenciaCardiacaBpm: '80.5' };
    expect(() => attendanceBody(value)).toThrow(/inteiro/);
    value.clinical = { pesoKg: '65.123' };
    expect(() => attendanceBody(value)).toThrow(/decimais/);
  });
  it('exige resolução datada na criação composta e não descarta uma data incompatível', () => {
    const value = draft();
    value.pending = [{ descricao: 'Pendência sintética', status: 'resolvida' }];
    expect(() => attendanceBody(value)).toThrow(/data de resolução/);
    value.pending[0]!.dataResolucao = '2026-02-02';
    expect(attendanceBody(value).pendencias).toEqual([
      { descricao: 'Pendência sintética', status: 'resolvida', dataResolucao: '2026-02-02' },
    ]);
    value.pending[0]!.status = 'aberta';
    expect(() => attendanceBody(value)).toThrow(/Nenhum campo será descartado/);
  });
  it('preserva desconhecido e não informado como estados distintos da pendência', () => {
    const value = draft();
    value.pending = [{ descricao: 'Estado desconhecido sintético', status: '' },
      { descricao: 'Não informado sintético', status: 'nao_informado' }];
    expect(attendanceBody(value).pendencias).toEqual([
      { descricao: 'Estado desconhecido sintético', status: null },
      { descricao: 'Não informado sintético', status: 'nao_informado' },
    ]);
  });
});
