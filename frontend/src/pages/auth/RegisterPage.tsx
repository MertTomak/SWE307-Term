import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { ApiError } from '../../api/client'
import type { CampusUserRole } from '../../api/types'
import { homePathFor } from '../../auth/roles'
import { useAuth } from '../../auth/useAuth'
import { PrivacyNotice } from '../../components/PrivacyNotice'
import { TextField } from '../../components/TextField'

// UC-01 Register · E01 api.auth.register (through useAuth().register) · FR-01, FR-02, FR-03, NFR-06

type Field = 'fullName' | 'email' | 'password' | 'role' | 'privacyNoticeAccepted'
type FieldErrors = Partial<Record<Field, string>>

const FIELDS: Field[] = ['fullName', 'email', 'password', 'role', 'privacyNoticeAccepted']

const ROLE_OPTIONS: { value: CampusUserRole; label: string }[] = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'ACADEMIC_STAFF', label: 'Academic staff' },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FormValues {
  fullName: string
  email: string
  password: string
  role: CampusUserRole | ''
  privacyNoticeAccepted: boolean
}

/**
 * The same limits as E01 (5.8.4.6), checked before sending so the user gets the message at once.
 * The server checks them again; its answer wins (NFR-03).
 */
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {}
  const name = values.fullName.trim()
  if (name.length < 2 || name.length > 100) errors.fullName = 'Enter your full name (2 to 100 characters).'
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid e-mail address.'
  // "8 characters" counts letters, not bytes; the 72-byte upper limit comes from bcrypt (5.8.5.3).
  if ([...values.password].length < 8) errors.password = 'Use at least 8 characters.'
  else if (new TextEncoder().encode(values.password).length > 72) errors.password = 'The password is too long. Use a shorter one.'
  if (!values.role) errors.role = 'Choose your role.'
  if (!values.privacyNoticeAccepted) errors.privacyNoticeAccepted = 'Read the privacy notice and tick the box.'
  return errors
}

/** VALIDATION_ERROR: details.fields = [{ path, message }] (5.8.4.3). */
function fieldErrorsFrom(error: ApiError): FieldErrors {
  const fields = error.details?.fields
  if (!Array.isArray(fields)) return {}
  const result: FieldErrors = {}
  for (const item of fields as { path?: unknown; message?: unknown }[]) {
    const path = item.path as Field
    if (FIELDS.includes(path) && typeof item.message === 'string') result[path] = item.message
  }
  return result
}

export default function RegisterPage() {
  const { status, user, register } = useAuth()
  const [values, setValues] = useState<FormValues>({
    fullName: '',
    email: '',
    password: '',
    role: '',
    privacyNoticeAccepted: false,
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'loading') return <p className="page-status">Loading…</p>
  // Registered (E01 also logs the user in) or already logged in: go to the home page of the role.
  if (user) return <Navigate to={homePathFor(user.role)} replace />

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    // The user is fixing this field: hide its old message.
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setFormError(null)

    const errors = validate(values)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    if (!values.role) return // already reported by validate(); narrows the type for TypeScript

    setSubmitting(true)
    try {
      await register({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
        privacyNoticeAccepted: true,
      })
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setFormError('Something went wrong. Please try again.')
      } else if (err.code === 'EMAIL_TAKEN') {
        setFieldErrors({ email: err.message })
      } else if (err.code === 'VALIDATION_ERROR') {
        const serverErrors = fieldErrorsFrom(err)
        setFieldErrors(serverErrors)
        if (Object.keys(serverErrors).length === 0) setFormError(err.message)
      } else {
        // NETWORK_ERROR, RATE_LIMITED, server errors: show the sentence from the API client or server.
        setFormError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <p className="auth-brand">CampusSlot</p>
        <h1>Create an account</h1>

        <form onSubmit={handleSubmit} noValidate>
          <TextField
            label="Full name"
            autoComplete="name"
            value={values.fullName}
            onChange={(v) => update('fullName', v)}
            error={fieldErrors.fullName}
            disabled={submitting}
          />
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(v) => update('email', v)}
            error={fieldErrors.email}
            disabled={submitting}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(v) => update('password', v)}
            error={fieldErrors.password}
            hint="At least 8 characters."
            disabled={submitting}
          />

          <fieldset className="field" aria-describedby={fieldErrors.role ? 'role-error' : undefined}>
            <legend>I am a</legend>
            <div className="choice-row">
              {ROLE_OPTIONS.map((option) => (
                <label key={option.value} className="choice">
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={values.role === option.value}
                    onChange={() => update('role', option.value)}
                    disabled={submitting}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {fieldErrors.role && (
              <p id="role-error" className="field-error">
                {fieldErrors.role}
              </p>
            )}
          </fieldset>

          <PrivacyNotice id="privacy-notice" />

          <div className="field">
            <label className="choice">
              <input
                type="checkbox"
                checked={values.privacyNoticeAccepted}
                onChange={(event) => update('privacyNoticeAccepted', event.target.checked)}
                aria-invalid={fieldErrors.privacyNoticeAccepted ? true : undefined}
                aria-describedby={fieldErrors.privacyNoticeAccepted ? 'privacy-error' : undefined}
                disabled={submitting}
              />
              I have read the privacy notice.
            </label>
            {fieldErrors.privacyNoticeAccepted && (
              <p id="privacy-error" className="field-error">
                {fieldErrors.privacyNoticeAccepted}
              </p>
            )}
          </div>

          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}

          <button type="submit" className="button-primary button-block" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </main>
  )
}
