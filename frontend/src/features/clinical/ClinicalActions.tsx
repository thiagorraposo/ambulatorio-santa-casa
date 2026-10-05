import { Link } from 'react-router';
import { useSession } from '../../app/session';

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
  if (session.user?.perfil === 'consulta') return null;
  const selected = section ? actions.filter(action => action[2] === section) : actions;
  if (!selected.length) return null;
  return <nav className="form-actions" aria-label="Ações de acompanhamento">{selected.map(([type, label]) => {
    const params = new URLSearchParams({ tipo: type });
    if (atendimentoId) params.set('atendimentoId', atendimentoId);
    return <Link className="button button-secondary" key={type} to={`/pacientes/${encodeURIComponent(pacienteId)}/registrar?${params}`}>{label}</Link>;
  })}</nav>;
}
