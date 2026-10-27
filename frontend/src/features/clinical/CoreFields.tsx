import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { clinicalLabel } from '../../shared/formatters';

export function InputField({ label, value, onChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string; value: string; onChange: (value: string) => void;
}) {
  const auto = useId();
  const id = props.id ?? auto;
  return <div className="form-field"><label htmlFor={id}>{label}</label>
    <input {...props} id={id} value={value} onChange={event => onChange(event.target.value)} /></div>;
}

export function SelectField({ label, value, onChange, options, blank = 'Não informado', required = false }: {
  label: string; value: string; onChange: (value: string) => void; options: ReadonlyArray<readonly [string, string]>;
  blank?: string; required?: boolean;
}) {
  const id = useId();
  return <div className="form-field"><label htmlFor={id}>{label}</label><select id={id} value={value}
    required={required} onChange={event => onChange(event.target.value)}>
    <option value="">{blank}</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    {value && !options.some(option => option[0] === value) && <option value={value}>{clinicalLabel(value)}</option>}
  </select></div>;
}

export function TextAreaField({ label, value, onChange, maxLength = 10000, required = false }: {
  label: string; value: string; onChange: (value: string) => void; maxLength?: number; required?: boolean;
}) {
  const id = useId();
  return <div className="form-field"><label htmlFor={id}>{label}</label><textarea id={id} required={required} value={value}
    maxLength={maxLength} rows={3} onChange={event => onChange(event.target.value)} /></div>;
}

export const booleanOptions = [['sim', 'Sim'], ['nao', 'Não']] as const;
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset className="form-section"><legend>{title}</legend><div className="form-grid">{children}</div></fieldset>;
}
