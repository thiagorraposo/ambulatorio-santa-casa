import { Link, useLocation } from 'react-router';
import { useSession } from '../../app/session';
import { followupOperationPath } from './followup-navigation';

const actions = [
  ['bzn', 'Registrar BZN', 'bzn'], ['retorno-bzn', 'Registrar retorno BZN', 'bzn'],
  ['projeto', 'Registrar projeto', 'projetos'], ['notificacao', 'Registrar notificação', 'notificacao'],
  ['encaminhamento', 'Registrar encaminhamento', 'encaminhamentos'],
  ['contrarreferencia', 'Registrar contrarreferência', 'encaminhamentos'],
  ['retorno-anual', 'Registrar retorno anual', 'acompanhamento'],
  ['ocorrencia-anual', 'Registrar ano informado', 'acompanhamento'], ['pendencia', 'Registrar pendência', 'pendencias'],
] as const;

export default function ClinicalActions({ pacienteId, section, atendimentoId }: {
  pacienteId: string; section?: string; atendimentoId?: string;
}) {
  const session = useSession();
  const location = useLocation();
  if (session.user?.perfil === 'consulta') return null;
  const selected = section ? actions.filter(action => action[2] === section) : actions;
  if (!selected.length) return null;
  return <nav className="form-actions" aria-label="Ações de acompanhamento">{selected.map(([type, label]) => {
    const params = new URLSearchParams({ retorno: `${location.pathname}${location.search}${location.hash}` });
    return <Link className="button button-secondary" key={type}
      to={followupOperationPath(`/pacientes/${encodeURIComponent(pacienteId)}`, type, atendimentoId, params)}>{label}</Link>;
  })}</nav>;
}
