// Perfil de demonstração do seed existente. Somente banco novo do runner.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const version = 'chagas-demo-v1';
export async function seedDemo(owner, { hash, sign }) {
  const db = process.env.FRONTEND_E2E_DB;
  if (!/^etapa6_frontend_\d+_\d+_[a-f0-9]{6}$/.test(db ?? '') || process.env.APP_DB_NAME !== db
    || process.env.CLINICAL_ACCESS_POLICY !== 'vinculo_explicito') throw new Error('Demo exige banco e política exclusivos do runner');
  const actual = (await owner.query('SELECT current_database() AS db')).rows[0].db;
  if (actual !== db) throw new Error('Destino PostgreSQL divergente');
  // Serializa reexecuções; não remove registros nem contorna auditoria imutável.
  const connection = await owner.connect();
  await connection.query("SELECT pg_advisory_lock(hashtext('chagas-demo-v1'))");
  try {
    let previous;
    try { previous = JSON.parse(await readFile(process.env.FRONTEND_E2E_FIXTURE, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const count = Number((await owner.query('SELECT count(*) FROM ambulatorio.paciente')).rows[0].count);
    if (previous?.demo?.version === version && previous.demo.database === db && count === 10) {
      const ids = (await owner.query('SELECT paciente_id::text AS id FROM ambulatorio.paciente ORDER BY paciente_id')).rows.map(r => r.id);
      if (JSON.stringify(ids) !== JSON.stringify(previous.patients.map(p => p.pacienteId))) throw new Error('Demo alterada; recrie pelo runner');
      console.log('Demo já carregada; nenhuma escrita ou duplicação.');
      return;
    }
    if (count || Number((await owner.query('SELECT count(*) FROM ambulatorio.usuario_aplicacao')).rows[0].count)) {
      throw new Error('Demo exige banco vazio; use dev-sintetico-stop/start para substituir a base descartável');
    }
    const today = new Date().toISOString().slice(0, 10);
    const date = (months, day = 12) => {
      const d = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() - months);
      d.setUTCDate(months ? day : Math.min(day, Number(today.slice(8))));
      return d.toISOString().slice(0, 10);
    };
    const fixture = { password: 'Etapa6-sintetica!', users: {}, patients: [],
      demo: { version, database: db, anchor: today, inicio: date(5, 1), fim: today } };
    const passwordHash = await hash(fixture.password, 12);
    for (const perfil of ['consulta', 'edicao', 'administracao']) {
      const login = `frontend-${perfil}@example.invalid`;
      const nome = `Equipe de demonstração · ${perfil}`;
      const row = (await owner.query(`INSERT INTO ambulatorio.usuario_aplicacao(nome,login,senha_hash,perfil)
        VALUES($1,$2,$3,$4) RETURNING usuario_id::text`, [nome, login, passwordHash, perfil])).rows[0];
      fixture.users[perfil] = { usuarioId: row.usuario_id, login, nome, perfil };
    }
    const token = sign({ sub: fixture.users.administracao.usuarioId, typ: 'access' }, process.env.AUTH_JWT_SECRET, { expiresIn: 900 });
    const api = async (method, path, body) => {
      const response = await fetch(`${process.env.FRONTEND_API_TARGET}/v1${path}`, { method,
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body) });
      if (!response.ok) throw new Error(`Demo ${method} ${path}: HTTP ${response.status}: ${await response.text()}`);
      return response.json();
    };
    // Catálogo canônico já consumido pelo importador; não cria projetos/diagnósticos novos.
    await owner.query(`INSERT INTO ambulatorio.comorbidade(nome_comorbidade) VALUES ('hipertensao_arterial'),('diabetes')
      ON CONFLICT (nome_comorbidade) DO NOTHING`);
    const exams = await api('GET', '/catalogos/exames?limit=100');
    const projects = await api('GET', '/catalogos/projetos?limit=100');
    const comorbidities = await api('GET', '/catalogos/comorbidades?limit=100');
    if (!projects.length) throw new Error('Catálogo de projetos ausente');
    fixture.demo.projects = projects;
    const cases = [
      ['Aurora Ipê · Fictícia', 'feminino', '1984-04-18', 'indeterminada', 'Acompanhamento assintomático; tratamento etiológico concluído.'],
      ['Bento Cedro · Fictício', 'masculino', '1956-08-09', 'cardiaca', 'Dispneia aos esforços; seguimento cardiológico e marcapasso previamente implantado.'],
      ['Celina Acácia · Fictícia', 'feminino', '1968-11-24', 'digestiva', 'Disfagia intermitente; avaliação digestiva em curso.'],
      ['Davi Jacarandá · Fictício', 'masculino', '1975-01-16', 'cardiodigestiva', 'Palpitações e constipação; acompanhamento compartilhado.'],
      ['Elisa Jatobá · Fictícia', 'feminino', '1992-06-03', null, 'Investigação após triagem inconclusiva; aguarda nova sorologia.'],
      ['Flávio Buriti · Fictício', 'masculino', '1988-03-27', null, 'Investigação encerrada com sorologias não reagentes; diagnóstico descartado.'],
      ['Gema Aroeira · Fictícia', 'feminino', '1979-09-12', 'indeterminada', 'Tratamento com benznidazol interrompido após exantema; reavaliação registrada.'],
      ['Hélio Angico · Fictício', 'outro', '1961-12-05', 'cardiaca', 'Cardiopatia crônica com antecedente de AVC; seguimento regular.'],
      ['Íris Quaresmeira · Fictícia', 'nao_informado', '1950-02-21', 'cardiaca', 'Histórico encerrado por óbito; acesso clínico reservado.'],
      ['Jaci Manacá · Fictícia', 'feminino', '1998-07-14', null, 'Cadastro recente; primeira avaliação ainda não realizada.'],
    ];
    for (const [index, [nome, sexo, dataNascimento, form, scenario]] of cases.entries()) {
      const p = { ...await api('POST', '/pacientes', { nome, sexo, dataNascimento,
        endereco: { cidade: index % 2 ? 'Montes Claros' : 'Belo Horizonte', endereco: 'Endereço fictício de demonstração, sem correspondência postal' } }), nome, sexo, scenario, atendimentos: [] };
      fixture.patients.push(p);
      const path = `/pacientes/${p.pacienteId}`;
      if (index < 8) await api('PUT', `${path}/acesso/${fixture.users.consulta.usuarioId}`, { ativo: true, podeEditar: false });
      if (index !== 8) await api('PUT', `${path}/acesso/${fixture.users.edicao.usuarioId}`, { ativo: true, podeEditar: true });
      if (index === 9) continue;
      const dates = index === 6 ? [date(2, 1), date(1, 1), date(0, 1)] : index === 8 ? [date(5), date(3), date(1)] : [date(4 + index % 2), date(1 + index % 3), date(0, 1 + index % 3)];
      for (const [visit, day] of dates.entries()) {
        const confirmed = Boolean(form);
        const status = index === 4 ? 'inconclusivo' : index === 5 ? 'descartado' : 'confirmado';
        const pending = ['aberta', 'em_andamento', 'resolvida', 'cancelada'][index % 4];
        const a = await api('POST', `${path}/atendimentos`, { dataAtendimento: day,
          ambulatorioUnicamente: index % 2 === 0, ambulatorioAnexoProjeto: index % 2 !== 0,
          localizacaoProntuario: `DEMO-${String(index + 1).padStart(2, '0')}`,
          observacoes: `${visit === 0 ? 'Avaliação inicial' : 'Reavaliação ambulatorial'}. ${scenario} Caso inteiramente fictício.`,
          dadosClinicos: { pesoKg: 58 + index * 3 + visit * .5, alturaCm: 158 + index * 2,
            paSistolicaMmhg: index === 1 ? 138 : 118 + index, paDiastolicaMmhg: 76 + index,
            frequenciaCardiacaBpm: 64 + index * 2, saturacaoPercentual: 97, ...(form?.includes('card') ? { nyha: index === 1 ? 'II' : 'I' } : {}) },
          diagnosticoChagas: { possuiDiagnosticoChagas: index === 4 ? null : confirmed, statusDiagnostico: status,
            resultadoFinal: index === 4 ? 'inconclusivo' : confirmed ? 'positivo' : 'negativo', dataResultadoFinal: dates[0],
            observacoes: 'Conclusão explícita do cenário fictício; não inferida pelo sistema.' },
          exames: [{ tipoExameId: exams.find(e => e.codigo === (form?.includes('card') ? 'holter' : 'eletrocardiograma')).id,
            bloco: visit === 0 ? 'trazido' : 'solicitado', ...(visit === 0 ? { resultado: form?.includes('card') ? 'Extrassístoles ventriculares isoladas no laudo fictício.' : 'Ritmo sinusal no laudo fictício.' } : {}) }],
          ...(visit === 2 ? { pendencias: [{ descricao: ['Apresentar exame de controle', 'Conferir avaliação cardiológica', 'Revisar laudo digestivo', 'Agendamento substituído'][index % 4],
            status: pending, ...(pending === 'resolvida' ? { dataResolucao: day } : {}) }] } : {}),
          ...(visit === 0 && index < 4 ? { rastreioFamiliar: { familiaresExaminados: index !== 2,
            familiares: index === 2 ? [] : [{ familiar: 'Irmão fictício (sem identificação pessoal)', resultado: index === 0 ? 'Não reagente em triagem fictícia' : 'Encaminhado para investigação após triagem reagente fictícia' }] } } : {}),
        });
        const attendance = { ...a, dataAtendimento: day };
        p.atendimentos.push(attendance);
        const ap = `${path}/atendimentos/${a.atendimentoId}`;
        if (form) await api('POST', `${ap}/condicao-chagas`, { formaClinica: form, faseDoenca: 'cronica',
          possuiSintomas: form !== 'indeterminada', ...(form !== 'indeterminada' ? { descricaoSintomas: scenario } : {}) });
        if (visit === 0) {
          for (const method of ['ELISA', 'Imunofluorescência indireta']) await api('POST', `${ap}/sorologias`, {
            metodoSorologico: method, resultado: index === 4 ? 'inconclusivo' : confirmed ? 'reagente' : 'nao_reagente',
            dataColeta: day, dataResultado: day, laboratorio: 'Laboratório fictício de demonstração' });
          await api('POST', `${ap}/comorbidades`, { itens: comorbidities.slice(0, 2).map(c => ({ comorbidadeId: c.id,
            possuiComorbidade: index === 4 ? null : index === 1 || (index === 7 && c.nome === 'hipertensao_arterial') })),
            historicoFamiliar: { possuiDoenca: index === 4 ? null : index < 4, descricao: 'História familiar fictícia, sem nomes ou contatos.' } });
        }
      }
      const first = p.atendimentos[0];
      const last = p.atendimentos[2];
      if (index < 4) await api('PUT', `${path}/projetos`, { projetoId: projects[index % projects.length].id,
        participa: true, possuiPendencia: index === 2, ...(index === 2 ? { descricaoPendencia: 'Conferir formulário de acompanhamento fictício' } : {}),
        observacoes: 'Vínculo exclusivamente demonstrativo em catálogo existente; não representa recrutamento real.' });
      await api('PUT', `${path}/notificacao`, { pacienteNotificado: form ? index !== 6 : index === 5 ? false : null,
        ...(form && index !== 6 ? { numeroNotificacao: `DEMO-SEM-VALOR-${index + 1}` } : {}),
        ...(index === 5 ? { justificativaNaoNotificacao: 'Diagnóstico descartado no caso fictício.' } : {}), observacoes: 'Registro fictício sem validade de notificação oficial.' });
      if ([1, 2, 3].includes(index)) {
        const done = index === 1;
        const referral = await api('POST', `${path}/encaminhamentos`, { atendimentoId: first.atendimentoId,
          origem: 'ambulatorio', destinoNome: 'Serviço fictício de referência', destinoServico: index === 2 ? 'Gastroenterologia' : 'Cardiologia',
          motivo: scenario, dataEncaminhamento: first.dataAtendimento, status: done ? 'realizado' : index === 2 ? 'agendado' : 'pendente',
          prioridade: index === 3 ? 'alta' : 'media', documentoApresentado: done,
          ...(done ? { dataRealizacao: p.atendimentos[1].dataAtendimento } : index === 2 ? { dataAgendamento: today } : {}) });
        await api('POST', `${path}/encaminhamentos/${referral.encaminhamentoId}/contrarreferencias`, {
          status: done ? 'concluido' : 'pendente', ...(done ? { dataRealizada: p.atendimentos[1].dataAtendimento } : {}),
          resumo: done ? 'Avaliação cardiológica fictícia recebida; manter seguimento compartilhado.' : 'Aguarda resposta do serviço fictício.' });
      }
      await api('POST', `${path}/ocorrencias-anuais`, { ano: Number(first.dataAtendimento.slice(0, 4)) });
      await api('POST', `${path}/retornos-anuais`, { atendimentoId: last.atendimentoId, dataRealizada: last.dataAtendimento, resumo: 'Revisão de acompanhamento fictício.' });
      if ([0, 6].includes(index)) {
        await api('POST', `${path}/tratamento-bzn`, { atendimentoId: first.atendimentoId, temIndicacao: true, iniciado: true,
          tratamentoPeloAmbulatorio: true, dataPrescricao: first.dataAtendimento, duracaoCumpridaDias: index === 0 ? 60 : 12,
          teveReacaoAdversa: index === 6, observacoes: index === 0 ? 'Curso concluído no cenário fictício.' : 'Suspenso após reação cutânea; reavaliação no segundo atendimento.',
          ...(index === 6 ? { reacoes: [{ descricao: 'Exantema pruriginoso fictício', gravidade: 'moderada', dataReacao: new Date(Date.parse(`${first.dataAtendimento}T12:00:00Z`) + 11 * 86400000).toISOString().slice(0, 10),
            consequencia: 'Suspensão e reavaliação registradas no cenário.' }] } : {}) });
        await api('POST', `${path}/retornos-bzn`, { atendimentoId: p.atendimentos[1].atendimentoId,
          tipo: index === 0 ? 'retorno_bzn_final' : 'retorno_bzn_30_dias', dataRealizada: p.atendimentos[1].dataAtendimento,
          resumo: index === 0 ? 'Tratamento concluído; sem reação referida.' : 'Após interrupção, reação cutânea resolvida no retorno fictício.' });
      }
      if ([1, 7].includes(index)) {
        await api('POST', `${path}/dispositivos`, { tipoDispositivo: 'marcapasso', possuiDispositivo: index === 1,
          observacoes: index === 1 ? 'Implante prévio por distúrbio de condução no cenário fictício.' : 'Ausência explicitamente referida.' });
        await api('POST', `${path}/avcs`, { ocorreu: index === 7, ...(index === 7 ? { anoEvento: Number(today.slice(0, 4)) - 2,
          descricao: 'AVC isquêmico prévio fictício; sem atribuição causal automática.' } : {}) });
        await api('POST', `${path}/atendimentos/${first.atendimentoId}/complicacoes-chagas`, {
          tipoComplicacao: 'Distúrbio de condução', possuiComplicacao: index === 1,
          descricao: index === 1 ? 'Bloqueio atrioventricular prévio no caso fictício.' : 'Não identificado nesta avaliação fictícia.', gravidade: index === 1 ? 'grave' : null });
      }
      if (index === 8) await api('POST', `${path}/obito`, { houveObito: true, dataObito: today,
        causaObito: null, observacoes: 'Óbito fictício após o último atendimento; causa não informada, sem inferência.' });
      const detail = await api('GET', `${path}/atendimentos/${first.atendimentoId}`);
      await api('POST', `${path}/exames/${detail.exames[0].exameId}/resultados`, { nomeParametro: 'Frequência cardíaca média',
        valorInformado: String(68 + index), unidadeInformada: 'bpm', observacoes: 'Valor de laudo inteiramente fictício; sem interpretação automática.' });
    }
    fixture.main = fixture.patients[0];
    fixture.reserved = fixture.patients[8];
    // Bootstrap nominal auditável: apenas editor/admin recebem a capacidade do indicador.
    for (const perfil of ['edicao', 'administracao']) await owner.query(`INSERT INTO ambulatorio.dashboard_importacao_leitor(usuario_id)
      VALUES($1)`, [fixture.users[perfil].usuarioId]);
    fixture.demo.lotes = [];
    // Fixtures de histórico, declaradas como tal; não alegam execução de importador.
    for (const [index, status] of ['concluido', 'concluido_com_pendencias', 'concluido'].entries()) {
      const source = JSON.stringify({ version, index, fixture: 'historico_importacao_sintetico' });
      const lot = (await owner.query(`INSERT INTO ambulatorio.importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,iniciado_em,finalizado_em)
        VALUES($1,$2,'demo_fixture_v1',$3,$4::date,$4::date) RETURNING importacao_lote_id::text AS id`,
      [`DEMO-HISTORICO-${index + 1}`, createHash('sha256').update(source).digest('hex'), status, index === 2 ? date(1) : today])).rows[0].id;
      const p = fixture.patients[index === 2 ? 8 : index];
      const line = (await owner.query(`INSERT INTO ambulatorio.importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,status_linha,mensagem_processamento)
        VALUES($1,'Fixture demonstrativa',1,2,$2::jsonb,$3,$4) RETURNING importacao_linha_id::text AS id`,
      [lot, JSON.stringify([{ nome: p.nome, origem: 'seed demonstrativo, sem arquivo externo' }]), index === 1 ? 'importada_com_pendencia' : 'importada',
        index === 1 ? 'Fixture: conferir campo não informado na fonte sintética.' : null])).rows[0].id;
      await owner.query(`INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
        VALUES($1,'paciente',$2,'associado')`, [line, p.pacienteId]);
      fixture.demo.lotes.push(lot);
    }
    // Leitura de medicamentos ainda não tem POST: bootstrap SQL explícito com contexto/ator.
    await connection.query('BEGIN');
    try {
      await connection.query('SELECT ambulatorio.auditoria_iniciar_aplicacao($1)', [fixture.users.administracao.usuarioId]);
      await connection.query(`INSERT INTO ambulatorio.atendimento_medicamento(atendimento_id,nome_medicamento_livre,tipo_registro,
        finalidade_uso,uso_atual,prescrito_no_atendimento,status_uso,observacoes)
        VALUES($1,'Losartana','uso_referido','comorbidade',true,false,'em_uso','Bootstrap demonstrativo fictício: uso referido, sem prescrição ou posologia inventada.')`,
      [fixture.patients[1].atendimentos[2].atendimentoId]);
      await connection.query('COMMIT');
    } catch (error) { await connection.query('ROLLBACK'); throw error; }
    await writeFile(process.env.FRONTEND_E2E_FIXTURE, JSON.stringify(fixture, null, 2), { mode: 0o600 });
    console.log('Demo v1: 10 pacientes fictícios, 27 atendimentos; dados clínicos via API e bootstrap nominal/legado identificado.');
  } finally {
    await connection.query("SELECT pg_advisory_unlock(hashtext('chagas-demo-v1'))");
    connection.release();
  }
}
