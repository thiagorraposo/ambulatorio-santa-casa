import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSession } from '../../app/session';
import { Card, PageHeading } from '../../shared/ui';
import { PatientCreateLink } from '../clinical/PatientCreateGate';

const guidance = {
  consulta: 'Consulte fichas e históricos, acompanhe os registros autorizados e analise os dados do ambulatório.',
  edicao: 'Organize o atendimento: encontre o paciente, confira o cadastro e registre o acompanhamento clínico.',
  administracao: 'Acompanhe o trabalho do ambulatório, os registros clínicos, as importações e os acessos da equipe.',
};

export default function HomePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const canWrite = user?.perfil === 'edicao' || user?.perfil === 'administracao';
  const admin = user?.perfil === 'administracao';
  if (!user) return null;
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (nome.trim()) params.set('nome', nome.trim());
    navigate(`/pacientes${params.size ? `?${params}` : ''}`);
  }
  return <div className="home-page">
    <PageHeading title="Início" description={guidance[user.perfil]} />
    <div className="home-welcome"><p>Boas-vindas, <strong>{user.nome}</strong>.</p>
      <Link to="/minha-conta">Conferir meu acesso</Link></div>
    <Card className="home-patient-search">
      <h2>{canWrite ? 'Comece pelo paciente' : 'Encontre uma ficha'}</h2>
      <p className="muted">Busque pelo nome para consultar a ficha e o histórico{canWrite ? ', editar o cadastro ou iniciar um atendimento' : ''}.</p>
      <form className="filters" aria-label="Buscar paciente no início" onSubmit={search}>
        <div className="form-field"><label htmlFor="home-patient-name">Nome do paciente</label>
          <input id="home-patient-name" type="search" maxLength={120} placeholder="Digite um nome" value={nome} onChange={event => setNome(event.target.value)} /></div>
        <button className="button">Buscar paciente</button>
        <Link to="/pacientes" className="button button-secondary">Consultar pacientes</Link>
      </form>
      {canWrite && <div className="home-create"><PatientCreateLink /><p className="muted">Antes de cadastrar, confira se a pessoa já está na busca.</p></div>}
    </Card>
    <div className="home-tasks">
      <Card><span className="section-label">{canWrite ? 'ATENDIMENTO' : 'ACOMPANHAMENTO'}</span>
        <h2>{canWrite ? 'Registre o cuidado com continuidade' : 'Consulte o acompanhamento clínico'}</h2>
        <ol className="home-workflow">
          <li><strong>Abra a ficha</strong><span>Confira a identificação e os registros do paciente.</span></li>
          {canWrite ? <><li><strong>Inicie ou retome o atendimento</strong><span>Na ficha, escolha Novo atendimento ou abra o registro em edição. Preencha as 12 seções e revise antes de confirmar.</span></li>
            <li><strong>Confira a confirmação</strong><span>Releia o atendimento e acompanhe o histórico na mesma ficha.</span></li></>
            : <><li><strong>Abra o histórico</strong><span>Na ficha, selecione Atendimentos para escolher o registro que deseja consultar.</span></li>
              <li><strong>Acompanhe os recursos clínicos</strong><span>Use os links da ficha e do atendimento para acessar os detalhes autorizados.</span></li></>}
        </ol>
        <Link to="/pacientes">{canWrite ? 'Selecionar paciente para atendimento' : 'Abrir fichas e históricos'} <span aria-hidden="true">→</span></Link>
      </Card>
      <Card><span className="section-label">ANÁLISE E EXPORTAÇÃO</span><h2>Explore os dados do ambulatório</h2>
        <p>Use o Dashboard para analisar indicadores, aplicar filtros e exportar os resultados disponíveis para seu acesso.</p>
        <Link to="/dashboard" className="button button-secondary">Abrir Dashboard</Link>
      </Card>
      <Card><span className="section-label">IMPORTAÇÕES</span><h2>{canWrite ? 'Prepare e acompanhe planilhas' : 'Acompanhe os lotes autorizados'}</h2>
        <p>{canWrite ? 'Simule uma planilha, confira o relatório de validação e consulte os lotes disponibilizados para sua conta.' : 'Consulte os lotes e os detalhes disponibilizados para sua conta.'}</p>
        <div className="form-actions"><Link to="/importacoes" className="button button-secondary">Consultar importações</Link>
          {canWrite && <Link to="/importacoes/simular">Simular planilha</Link>}</div>
      </Card>
      <Card><span className="section-label">{admin ? 'EQUIPE' : 'SEU ACESSO'}</span><h2>{admin ? 'Gerencie os acessos da equipe' : 'Confira sua conta'}</h2>
        <p>{admin ? 'Consulte usuários, crie contas e revise perfil e situação de acesso com confirmação das alterações.' : canWrite ? 'Seu perfil permite cadastrar e editar registros conforme as autorizações de cada paciente.' : 'Seu perfil permite consultar os registros autorizados. Cadastro e edição exigem acesso de escrita.'}</p>
        <Link to={admin ? '/usuarios' : '/minha-conta'} className="button button-secondary">{admin ? 'Gerenciar usuários' : 'Ver minha conta'}</Link>
      </Card>
    </div>
  </div>;
}
