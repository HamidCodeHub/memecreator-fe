import { useId, useState, type FormEvent } from 'react'
import { ApiError, resetPassword, type User } from './api'

const MIN_PASSWORD = 10

/** Opened from the emailed reset link (?reset=...). */
export function ResetPassword({
  token,
  onSignedIn,
  onCancel,
}: {
  token: string
  onSignedIn: (user: User) => void
  onCancel: () => void
}) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ids = { password: useId(), hint: useId() }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      onSignedIn(await resetPassword(token, password))
    } catch (err) {
      setError(err instanceof ApiError && err.message ? err.message : 'That didn’t work. Ask for a new link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="reset">
      <form className="reset-card" onSubmit={submit} noValidate>
        <h1 className="brand">Memes for Laughs</h1>
        <p className="auth-title">Choose a new password</p>
        <div className="field">
          <div className="field-head">
            <label htmlFor={ids.password}>New password</label>
            <button type="button" className="link-button small" aria-pressed={show} onClick={() => setShow((v) => !v)}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id={ids.password}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            maxLength={64}
            aria-describedby={ids.hint}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p id={ids.hint} className="field-hint">
            At least {MIN_PASSWORD} characters.
          </p>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary wide" disabled={busy || password.length < MIN_PASSWORD}>
          {busy ? 'One moment…' : 'Save password and sign in'}
        </button>
        <div className="auth-links">
          <button type="button" className="link-button" onClick={onCancel}>
            Back to sign in
          </button>
        </div>
      </form>
    </main>
  )
}
