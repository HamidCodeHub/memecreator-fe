import { useId, useState, type FormEvent } from 'react'
import { acceptTerms, ApiError, fetchMe, type User } from './api'
import { DeleteAccount } from './DeleteAccount'

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
        setError('The Terms were just updated. Open them again, then tick the box to accept.')
      } else {
        setError(err instanceof ApiError && err.message ? err.message : 'That didn’t work. Try again.')
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
            One step before your first memes
          </h1>
          <p>
            Memes for Laughs is for adults. The captions are written by an AI and can be rude or wrong. The two pages below
            explain the rules and what happens to your data. They’re short.
          </p>
          <ul className="gate-docs">
            <li>
              <a href="/terms.html" target="_blank" rel="noopener">
                Terms of use
              </a>
            </li>
            <li>
              <a href="/privacy.html" target="_blank" rel="noopener">
                Privacy policy
              </a>
            </li>
          </ul>
          <label className="check" htmlFor={id}>
            <input id={id} type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>I’m 18 or older and I accept the Terms of use and the Privacy policy.</span>
          </label>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="primary wide" disabled={!checked || busy}>
            {busy ? 'One moment…' : 'Accept and continue'}
          </button>
        </form>
        <p className="fine-print gate-out">
          Don’t want to accept? Sign out at the top right, or{' '}
          <DeleteAccount onDeleted={onDeleted} onSignedOut={onSignedOut} label="delete your account" />.
        </p>
      </section>
    </main>
  )
}
