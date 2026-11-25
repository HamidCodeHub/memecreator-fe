import { useId, useState, type FormEvent } from 'react'
import { resetPassword, type User } from './api'
import { serverText } from './errors'
import { useI18n } from './i18n'

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
  const { t, lang } = useI18n()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      onSignedIn(await resetPassword(token, password))
    } catch (err) {
      setError(serverText(err, lang, t.reset.failed))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="reset">
      <form className="reset-card" onSubmit={submit} noValidate>
        <h1 className="brand">Memes for Laughs</h1>
        <p className="auth-title">{t.reset.title}</p>
        <div className="field">
          <div className="field-head">
            <label htmlFor={ids.password}>{t.reset.newPassword}</label>
            <button type="button" className="link-button small" aria-pressed={show} onClick={() => setShow((v) => !v)}>
              {show ? t.common.hide : t.common.show}
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
            {t.reset.hint(MIN_PASSWORD)}
          </p>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary wide" disabled={busy || password.length < MIN_PASSWORD}>
          {busy ? t.common.oneMoment : t.reset.save}
        </button>
        <div className="auth-links">
          <button type="button" className="link-button" onClick={onCancel}>
            {t.emailAuth.backToSignIn}
          </button>
        </div>
      </form>
    </main>
  )
}
