import { useId, useState, type FormEvent } from 'react'
import { acceptTerms, ApiError, fetchMe, type User } from './api'
import { DeleteAccount } from './DeleteAccount'
import { serverText } from './errors'
import { useI18n } from './i18n'

/**
 * Shown after sign-in until the current Terms of use and Privacy policy are accepted: first-time Google/Facebook
 * sign-ins, and everyone after the terms change.
 */
export function TermsGate({
  user,
  onAccepted,
  onSignedOut,
  onDeleted,
}: {
  user: User
  onAccepted: (user: User) => void
  onSignedOut: () => void
  onDeleted: () => void
}) {
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const id = useId()
  const { t, lang } = useI18n()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!checked || busy) return
    setBusy(true)
    setError(null)
    try {
      onAccepted(await acceptTerms(user.termsVersion))
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSignedOut()
        return
      }
      if (err instanceof ApiError && err.code === 'TERMS_VERSION_CHANGED') {
        // Updated while this page was open: show the new version
        const fresh = await fetchMe().catch(() => null)
        if (fresh) onAccepted(fresh)
        setChecked(false)
        setError(t.common.termsUpdated)
      } else {
        setError(serverText(err, lang, t.common.failed))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="gate">
      <section className="gate-panel" aria-labelledby={`${id}-title`}>
        <form className="gate-form" onSubmit={submit}>
          <h1 id={`${id}-title`} className="gate-title">
            {t.terms.title}
          </h1>
          <p>{t.terms.text}</p>
          <ul className="gate-docs">
            <li>
              <a href="/terms.html" target="_blank" rel="noopener">
                {t.common.termsOfUse}
              </a>
            </li>
            <li>
              <a href="/privacy.html" target="_blank" rel="noopener">
                {t.common.privacyPolicy}
              </a>
            </li>
          </ul>
          <label className="check" htmlFor={id}>
            <input id={id} type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>{t.terms.accept}</span>
          </label>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="primary wide" disabled={!checked || busy}>
            {busy ? t.common.oneMoment : t.terms.button}
          </button>
        </form>
        <p className="fine-print gate-out">
          {t.terms.out(<DeleteAccount onDeleted={onDeleted} onSignedOut={onSignedOut} label={t.terms.deleteLabel} />)}
        </p>
      </section>
    </main>
  )
}
