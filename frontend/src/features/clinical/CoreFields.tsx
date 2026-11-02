import { fieldReason, useFieldValidation } from '../../shared/field-validation';
import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { clinicalLabel } from '../../shared/formatters';

export function InputField({ label, value, onChange, fieldPath, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string; value: string; fieldPath?: string; onChange: (value: string) => void;
}) {
  const auto = useId();
  const validation = useFieldValidation(fieldPath);
  const id = props.id ?? validation.id ?? auto;
  return <div className="form-field"><label htmlFor={id}>{label}</label>
    <input {...props} aria-invalid={validation.error ? true : undefined} aria-describedby={validation.errorId} id={id} value={value} onChange={event => onChange(event.target.value)} />
    {validation.error && <p id={validation.errorId} className="field-error">{fieldReason(validation.error.code)}</p>}</div>;
}

export function SelectField({ label, value, onChange, options, blank = 'Não informado', required = false, fieldPath }: {
  label: string; value: string; fieldPath?: string; onChange: (value: string) => void; options: ReadonlyArray<readonly [string, string]>;
  blank?: string; required?: boolean;
}) {
  const auto = useId();
  const validation = useFieldValidation(fieldPath);
  const id = validation.id ?? auto;
  return <div className="form-field"><label htmlFor={id}>{label}</label><select aria-invalid={validation.error ? true : undefined} aria-describedby={validation.errorId} id={id} value={value}
    required={required} onChange={event => onChange(event.target.value)}>
    <option value="">{blank}</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    {value && !options.some(option => option[0] === value) && <option value={value}>{clinicalLabel(value)}</option>}
  </select>
    {validation.error && <p id={validation.errorId} className="field-error">{fieldReason(validation.error.code)}</p>}</div>;
}

export function TextAreaField({ label, value, onChange, maxLength = 10000, required = false, fieldPath }: {
  label: string; value: string; fieldPath?: string; onChange: (value: string) => void; maxLength?: number; required?: boolean;
}) {
  const auto = useId();
  const validation = useFieldValidation(fieldPath);
  const id = validation.id ?? auto;
  return <div className="form-field"><label htmlFor={id}>{label}</label><textarea aria-invalid={validation.error ? true : undefined} aria-describedby={validation.errorId} id={id} required={required} value={value}
    maxLength={maxLength} rows={3} onChange={event => onChange(event.target.value)} />
    {validation.error && <p id={validation.errorId} className="field-error">{fieldReason(validation.error.code)}</p>}</div>;
}

export const booleanOptions = [['sim', 'Sim'], ['nao', 'Não']] as const;
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset className="form-section"><legend>{title}</legend><div className="form-grid">{children}</div></fieldset>;
}
