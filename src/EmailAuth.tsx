import { useEffect, useId, useState, type FormEvent } from 'react'
import { ApiError, fetchLegal, forgotPassword, resendConfirmation, signIn, signUp, type User } from './api'

type Mode = 'signin' | 'signup' | 'forgot' | 'sent'

const MIN_PASSWORD = 10

function message(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return e.message
    if (e.message) return e.message
  }
  return fallback
}

/** Sign in / create an account / forgot password, with email and password. */
export function EmailAuth({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notConfirmed, setNotConfirmed] = useState(false)
  const [sentFor, setSentFor] = useState<'signup' | 'forgot' | 'resend'>('signup')
  const [accepted, setAccepted] = useState(false)
  const [termsVersion, setTermsVersion] = useState<string | null>(null)
  const ids = { email: useId(), password: useId(), name: useId(), hint: useId(), terms: useId() }

  // The version the checkbox accepts; fetched when the sign-up form opens
  useEffect(() => {
    if (mode !== 'signup' || termsVersion) return
    fetchLegal()
      .then((l) => setTermsVersion(l.termsVersion))
      .catch(() => {
        /* the submit shows the connection problem */
      })
  }, [mode, termsVersion])

  function go(next: Mode) {
    setMode(next)
    setError(null)
    setNotConfirmed(false)
    setPassword('')
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    void run(async () => {
      try {
        if (mode === 'signin') {
          onSignedIn(await signIn(email, password))
        } else if (mode === 'signup') {
          const version = termsVersion ?? (await fetchLegal()).termsVersion
          await signUp(email, password, name.trim(), version)
          setSentFor('signup')
          setMode('sent')
        } else if (mode === 'forgot') {
          await forgotPassword(email)
          setSentFor('forgot')
          setMode('sent')
        }
      } catch (err) {
        if (err instanceof ApiError && err.code === 'EMAIL_NOT_CONFIRMED') {
          setNotConfirmed(true)
          setError('Confirm your email first: open the link we sent you.')
        } else if (err instanceof ApiError && err.code === 'TERMS_VERSION_CHANGED') {
          setTermsVersion(null) // fetch the new version
          setAccepted(false)
          setError('The Terms were just updated. Open them again, then tick the box to accept.')
        } else if (err instanceof ApiError && err.status === 403) {
          setError('Your session expired. Reload the page and try again.')
        } else {
          setError(message(err, 'That didn’t work. Try again.'))
        }
      }
    })
  }

  function resend() {
    void run(async () => {
      try {
        await resendConfirmation(email)
        setSentFor('resend')
        setMode('sent')
      } catch (err) {
        setError(message(err, 'Couldn’t send the link. Try again.'))
      }
    })
  }

  if (mode === 'sent') {
    return (
      <div className="email-auth" aria-live="polite">
        <p className="sent-title">Check your inbox</p>
        <p className="sent-text">
          {sentFor === 'forgot'
            ? `If ${email} has an account, we sent a link to choose a new password. It works for 1 hour.`
            : `We sent a confirmation link to ${email}. Open it to finish creating your account.`}{' '}
          Nothing there? Check your spam folder.
        </p>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="auth-links">
          {sentFor !== 'forgot' && (
            <button type="button" className="link-button" onClick={resend} disabled={busy}>
              Send the link again
            </button>
          )}
          <button type="button" className="link-button" onClick={() => go('signin')}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  const title = mode === 'signin' ? 'Sign in with email' : mode === 'signup' ? 'Create an account' : 'Forgot your password?'
  const action =
    mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'

  return (
    <form className="email-auth" onSubmit={submit} noValidate>
      <p className="auth-title">{title}</p>
      {mode === 'forgot' && <p className="auth-help">We’ll email you a link to choose a new password.</p>}

      {mode === 'signup' && (
        <div className="field">
          <label htmlFor={ids.name}>
            Name <span className="optional">(optional)</span>
          </label>
          <input id={ids.name} autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}

      <div className="field">
        <label htmlFor={ids.email}>Email</label>
        <input
          id={ids.email}
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {mode !== 'forgot' && (
        <div className="field">
          <div className="field-head">
            <label htmlFor={ids.password}>Password</label>
            <button
              type="button"
              className="link-button small"
              aria-controls={ids.password}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id={ids.password}
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={mode === 'signup' ? MIN_PASSWORD : undefined}
            maxLength={64}
            aria-describedby={mode === 'signup' ? ids.hint : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'signup' && (
            <p id={ids.hint} className="field-hint">
              At least {MIN_PASSWORD} characters. A short sentence is easy to remember.
            </p>
          )}
        </div>
      )}

      {mode === 'signup' && (
        <label className="check" htmlFor={ids.terms}>
          <input id={ids.terms} type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span>
            I’m 18 or older and I accept the{' '}
            <a href="/terms.html" target="_blank" rel="noopener">
              Terms of use
            </a>{' '}
            and the{' '}
            <a href="/privacy.html" target="_blank" rel="noopener">
              Privacy policy
            </a>
            .
          </span>
        </label>
      )}

      {error && (
        <p className="field-error" role="alert">
          {error}{' '}
          {notConfirmed && (
            <button type="button" className="link-button" onClick={resend} disabled={busy}>
              Send the link again
            </button>
          )}
        </p>
      )}

      <button
        type="submit"
        className="primary wide"
        disabled={
          busy ||
          !email.trim() ||
          (mode !== 'forgot' && (mode === 'signup' ? password.length < MIN_PASSWORD || !accepted : !password))
        }
      >
        {busy ? 'One moment…' : action}
      </button>

      <div className="auth-links">
        {mode === 'signin' && (
          <>
            <button type="button" className="link-button" onClick={() => go('signup')}>
              Create an account
            </button>
            <button type="button" className="link-button" onClick={() => go('forgot')}>
              Forgot password?
            </button>
          </>
        )}
        {mode !== 'signin' && (
          <button type="button" className="link-button" onClick={() => go('signin')}>
            {mode === 'signup' ? 'I already have an account' : 'Back to sign in'}
          </button>
        )}
      </div>
    </form>
  )
}
