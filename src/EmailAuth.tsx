import { useEffect, useId, useState, type FormEvent } from 'react'
import { ApiError, fetchLegal, forgotPassword, resendConfirmation, signIn, signUp, type User } from './api'
import { serverText } from './errors'
import { useI18n } from './i18n'
import type { Messages } from './messages'

type Mode = 'signin' | 'signup' | 'forgot' | 'sent'

const MIN_PASSWORD = 10

/** The translated text for an error status (used on non-English sites; English shows the server's words). */
function byStatus(e: unknown, t: Messages, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return t.emailAuth.wrongCredentials
    if (e.status === 400) return t.emailAuth.checkDetails
    if (e.status === 429) return t.common.tooManyAttempts
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
  const { t, lang } = useI18n()

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
          setError(t.emailAuth.confirmFirst)
        } else if (err instanceof ApiError && err.code === 'TERMS_VERSION_CHANGED') {
          setTermsVersion(null) // fetch the new version
          setAccepted(false)
          setError(t.common.termsUpdated)
        } else if (err instanceof ApiError && err.status === 403) {
          setError(t.common.sessionExpired)
        } else {
          setError(serverText(err, lang, byStatus(err, t, t.common.failed)))
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
        setError(serverText(err, lang, byStatus(err, t, t.emailAuth.couldntSend)))
      }
    })
  }

  if (mode === 'sent') {
    return (
      <div className="email-auth" aria-live="polite">
        <p className="sent-title">{t.emailAuth.checkInbox}</p>
        <p className="sent-text">
          {sentFor === 'forgot' ? t.emailAuth.sentReset(email) : t.emailAuth.sentConfirm(email)}{' '}
          {t.emailAuth.checkSpam}
        </p>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="auth-links">
          {sentFor !== 'forgot' && (
            <button type="button" className="link-button" onClick={resend} disabled={busy}>
              {t.emailAuth.sendAgain}
            </button>
          )}
          <button type="button" className="link-button" onClick={() => go('signin')}>
            {t.emailAuth.backToSignIn}
          </button>
        </div>
      </div>
    )
  }

  const ea = t.emailAuth
  const title = mode === 'signin' ? ea.titleSignIn : mode === 'signup' ? ea.titleSignUp : ea.titleForgot
  const action = mode === 'signin' ? ea.actionSignIn : mode === 'signup' ? ea.actionSignUp : ea.actionForgot

  return (
    <form className="email-auth" onSubmit={submit} noValidate>
      <p className="auth-title">{title}</p>
      {mode === 'forgot' && <p className="auth-help">{ea.forgotHelp}</p>}

      {mode === 'signup' && (
        <div className="field">
          <label htmlFor={ids.name}>
            {ea.name} <span className="optional">{t.common.optional}</span>
          </label>
          <input id={ids.name} autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      )}

      <div className="field">
        <label htmlFor={ids.email}>{ea.email}</label>
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
            <label htmlFor={ids.password}>{ea.password}</label>
            <button
              type="button"
              className="link-button small"
              aria-controls={ids.password}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? t.common.hide : t.common.show}
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
              {ea.passwordHint(MIN_PASSWORD)}
            </p>
          )}
        </div>
      )}

      {mode === 'signup' && (
        <label className="check" htmlFor={ids.terms}>
          <input id={ids.terms} type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span>
            {t.common.acceptTerms(
              <a href="/terms.html" target="_blank" rel="noopener">
                {t.common.termsOfUse}
              </a>,
              <a href="/privacy.html" target="_blank" rel="noopener">
                {t.common.privacyPolicy}
              </a>,
            )}
          </span>
        </label>
      )}

      {error && (
        <p className="field-error" role="alert">
          {error}{' '}
          {notConfirmed && (
            <button type="button" className="link-button" onClick={resend} disabled={busy}>
              {ea.sendAgain}
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
        {busy ? t.common.oneMoment : action}
      </button>

      <div className="auth-links">
        {mode === 'signin' && (
          <>
            <button type="button" className="link-button" onClick={() => go('signup')}>
              {ea.createAccount}
            </button>
            <button type="button" className="link-button" onClick={() => go('forgot')}>
              {ea.forgotLink}
            </button>
          </>
        )}
        {mode !== 'signin' && (
          <button type="button" className="link-button" onClick={() => go('signin')}>
            {mode === 'signup' ? ea.haveAccount : ea.backToSignIn}
          </button>
        )}
      </div>
    </form>
  )
}
