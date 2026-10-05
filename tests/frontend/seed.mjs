// Fixtures exclusivamente sintéticas no banco novo criado pelo runner.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { randomInt } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const requireBackend = createRequire(resolve(root, 'backend/package.json'));
const { Pool } = requireBackend('pg');
const { hash } = requireBackend('bcryptjs');
const { sign } = requireBackend('jsonwebtoken');
const db = process.env.FRONTEND_E2E_DB;
if (!/^etapa6_frontend_\d+_\d+_[a-f0-9]{6}$/.test(db ?? '')) throw new Error('Banco exclusivo do runner obrigatório');
const owner = new Pool({ host: process.env.PGHOST, port: Number(process.env.PGPORT),
  user: process.env.PGUSER, password: process.env.PGPASSWORD, database: db });
const fixture = { password: 'Etapa6-sintetica!', users: {}, patients: [], main: null, reserved: null, large: null };
try {
  const passwordHash = await hash(fixture.password, 12);
  for (const perfil of ['consulta', 'edicao', 'administracao']) {
    const login = `frontend-${perfil}@example.invalid`;
    const nome = `Profissional ${perfil} Sintético`;
    const user = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
      VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [nome, login, passwordHash, perfil])).rows[0];
    fixture.users[perfil] = { usuarioId: user.usuario_id, login, nome, perfil };
  }
  // A API verifica tokens de setup como qualquer outra chamada. A interface
  // sempre autentica pelos formulários reais e /auth/login.
  const adminToken = sign({ sub: fixture.users.administracao.usuarioId, typ: 'access' }, process.env.AUTH_JWT_SECRET, { expiresIn: 900 });
  const api = async (method, path, body) => {
    const response = await fetch(`${process.env.FRONTEND_API_TARGET}/v1${path}`, { method,
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) throw new Error(`Seed API ${method} ${path}: HTTP ${response.status}`);
    return response.json();
  };
  const createPatient = async (nome, sexo, extra = {}) => ({
    ...await api('POST', '/pacientes', { nome, sexo, ...extra }), nome, sexo,
  });
  const grant = (patient, perfil, ativo = true) => api('PUT', `/pacientes/${patient.pacienteId}/acesso/${fixture.users[perfil].usuarioId}`,
    { ativo, podeEditar: perfil === 'edicao' });
  fixture.main = await createPatient('Paciente Alfa Sintético', 'feminino', {
    dataNascimento: '1980-02-10', raca: 'Valor legado sintético', pertenceComunidadeTradicional: null,
    endereco: { endereco: 'Rua Sintética 000', cidade: 'Cidade Sintética' }, telefones: ['000000000'],
  });
  fixture.patients.push(fixture.main);
  await grant(fixture.main, 'consulta');
  await grant(fixture.main, 'edicao');
  for (let i = 1; i <= 22; i++) {
    const patient = await createPatient(`Paciente Paginação ${String(i).padStart(2, '0')} Sintético`, i % 2 ? 'feminino' : 'masculino');
    fixture.patients.push(patient);
    await grant(patient, 'consulta');
  }
  fixture.reserved = await createPatient('Paciente Reservado Sintético', 'nao_informado');
  // Ajusta apenas a sequência no banco descartável, sem mudar o schema. O ID
  // grande é gerado pela API e lido via RETURNING, nunca assumido como fixture.
  const sequenceStart = (9_007_199_254_740_991n + BigInt(randomInt(2, 99_999))).toString();
  await owner.query("SELECT setval(pg_get_serial_sequence('ambulatorio.paciente','paciente_id'),$1::bigint)", [sequenceStart]);
  fixture.large = await createPatient('Paciente Identificador Sintético', 'outro');
  await grant(fixture.large, 'consulta');
  await grant(fixture.large, 'edicao');
  fixture.patients.push(fixture.large);
  const exam = (await owner.query("SELECT tipo_exame_complementar_id::text FROM ambulatorio.tipo_exame_complementar WHERE codigo_exame='holter'")).rows[0];
  const project = (await owner.query('SELECT projeto_estudo_id::text,nome_projeto FROM ambulatorio.projeto_estudo WHERE ativo ORDER BY projeto_estudo_id LIMIT 1')).rows[0];
  fixture.main.atendimentos = [];
  for (let i = 1; i <= 21; i++) {
    const day = String(i).padStart(2, '0');
    const attendance = await api('POST', `/pacientes/${fixture.main.pacienteId}/atendimentos`, {
      dataAtendimento: `2026-02-${day}`, localizacaoProntuario: `Arquivo sintético ${i}`,
      observacoes: `Observação sintética ${i}`,
      dadosClinicos: { pesoKg: 70.25, alturaCm: 170, nyha: 'II', observacoes: 'Avaliação sintética' },
      diagnosticoChagas: { possuiDiagnosticoChagas: null, statusDiagnostico: 'inconclusivo', resultadoFinal: 'indeterminado',
        dataDescobertaAutorelato: '2010-05-03', dataResultadoFinal: '2025-12-01' },
      exames: [{ tipoExameId: exam.tipo_exame_complementar_id, bloco: 'solicitado', resultado: `Resultado sintético ${i}` },
        ...(i === 1 ? [2, 3].map(n => ({ tipoExameId: exam.tipo_exame_complementar_id, bloco: 'trazido', resultado: `Resultado embutido sintético ${n}` })) : [])],
      pendencias: [{ descricao: `Pendência sintética ${i}`, status: i === 3 ? 'resolvida' : 'aberta',
        ...(i === 3 ? { dataResolucao: '2026-02-04' } : {}) },
        ...(i === 1 ? [2, 3].map(n => ({ descricao: `Pendência embutida sintética ${n}`, status: 'aberta' })) : [])],
      rastreioFamiliar: { familiaresExaminados: true, familiares: [{ familiar: `Familiar sintético ${i}`, resultado: 'Resultado familiar sintético' },
        ...(i === 1 ? [2, 3].map(n => ({ familiar: `Familiar embutido sintético ${n}`, resultado: `Resultado familiar embutido sintético ${n}` })) : [])] },
    });
    fixture.main.atendimentos.push({ ...attendance, dataAtendimento: `2026-02-${day}` });
  }
  const atendimentoId = fixture.main.atendimentos[0].atendimentoId;
  await api('PUT', `/pacientes/${fixture.main.pacienteId}/projetos`, {
    projetoId: project.projeto_estudo_id, participa: true, possuiPendencia: null, descricaoPendencia: 'Pendência de projeto sintética',
  });
  await api('PUT', `/pacientes/${fixture.main.pacienteId}/notificacao`, {
    pacienteNotificado: null, numeroNotificacao: 'SINTETICO-000', observacoes: 'Notificação sintética',
  });
  fixture.main.encaminhamento = await api('POST', `/pacientes/${fixture.main.pacienteId}/encaminhamentos`, {
    atendimentoId, destinoNome: 'Unidade Sintética', dataEncaminhamento: '2026-02-01', status: 'solicitado', documentoApresentado: null,
  });
  const counterPath = `/pacientes/${fixture.main.pacienteId}/encaminhamentos/${fixture.main.encaminhamento.encaminhamentoId}/contrarreferencias`;
  for (const [status, resumo] of [['pendente', 'Resposta pendente sintética'], ['concluido', 'Resposta concluída sintética']]) {
    await api('POST', counterPath, { status, resumo });
  }
  for (let i = 1; i <= 9; i++) await api('POST', counterPath, { status: 'pendente', resumo: `Resposta adicional sintética ${i}` });
  await api('POST', `/pacientes/${fixture.main.pacienteId}/ocorrencias-anuais`, { ano: 2025 });
  await api('POST', `/pacientes/${fixture.main.pacienteId}/retornos-anuais`, { atendimentoId, dataRealizada: '2026-03-01', resumo: 'Retorno anual sintético' });
  await api('POST', `/pacientes/${fixture.main.pacienteId}/tratamento-bzn`, {
    atendimentoId, temIndicacao: null, iniciado: true, tratamentoPeloAmbulatorio: false, duracaoCumpridaDias: 30,
    dataPrescricao: '2026-02-01', teveReacaoAdversa: true,
    reacoes: [{ descricao: 'Reação sintética', dataReacao: '2026-02-02', gravidade: 'leve' }],
  });
  await api('POST', `/pacientes/${fixture.main.pacienteId}/retornos-bzn`, {
    atendimentoId, tipo: 'retorno_bzn_30_dias', dataRealizada: '2026-03-03', resumo: 'Retorno BZN sintético',
  });
  await writeFile(process.env.FRONTEND_E2E_FIXTURE, JSON.stringify(fixture, null, 2), { mode: 0o600 });
  console.log('Fixture exclusivamente sintética criada pela API; três perfis e recursos de leitura disponíveis.');
} finally {
  await owner.end();
}
