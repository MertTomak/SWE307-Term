import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { ApiError } from '../../api/client'
import { homePathFor } from '../../auth/roles'
import { useAuth } from '../../auth/useAuth'
import { TextField } from '../../components/TextField'

// UC-01 Log in · E02 api.auth.login (through useAuth().login) · FR-04

/**
 * RequireRole sends a logged-out user here with `state.from` = the page they wanted.
 * Only a path inside this app is accepted ("/…", not "//other-site").
 */
function returnPath(state: unknown): string | null {
  const from = (state as { from?: unknown } | null)?.from
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return null
  if (from === '/login' || from === '/register') return null
  return from
}

export default function LoginPage() {
  const { status, user, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'loading') return <p className="page-status">Loading…</p>

  // Logged in (also right after a successful login): go to the page the user wanted, or to the home page of the role.
  // If that page is not allowed for the role, RequireRole sends the user to the home page.
  if (user) return <Navigate to={returnPath(location.state) ?? homePathFor(user.role)} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    if (!email.trim() || !password) {
      setError('Enter your e-mail and password.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await login(email.trim(), password)
      // No navigate() here: login() sets the user, the page renders again and the <Navigate> above runs.
    } catch (err) {
      // INVALID_CREDENTIALS (401), RATE_LIMITED (429), VALIDATION_ERROR (400) and NETWORK_ERROR all come
      // with a ready sentence in `message` (5.8.4.3). Clear the password after a wrong attempt.
      if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') setPassword('')
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <p className="auth-brand">CampusSlot</p>
        <h1>Log in</h1>

        <form onSubmit={handleSubmit} noValidate>
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={setEmail}
            disabled={submitting}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            disabled={submitting}
          />

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button-primary button-block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </main>
  )
}
