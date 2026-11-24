import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'onChange'> {
  label: string
  value: string
  onChange: (value: string) => void
  /** Message under the field; also marks the field as invalid for screen readers. */
  error?: string
  /** Help text under the field, shown when there is no error. */
  hint?: string
}

/** Label + input + error or hint, linked with ids so that screen readers read them together. */
export function TextField({ label, value, onChange, error, hint, ...inputProps }: TextFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        {...inputProps}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
      />
      {message && (
        <p id={messageId} className={error ? 'field-error' : 'field-hint'}>
          {message}
        </p>
      )}
    </div>
  )
}
