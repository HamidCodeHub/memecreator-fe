import { Send } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError, sendContact, type User } from './api'
import { serverText } from './errors'
import { useI18n } from './i18n'

const MAX_MESSAGE = 5000

/** "Contact us": email, subject, message. Works signed in or not. */
export function Contact({ user }: { user: User | null }) {
  const [email, setEmail] = useState(user?.email ?? '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // hidden; bots fill it in
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const ids = { email: useId(), subject: useId(), message: useId(), count: useId(), website: useId() }
  const { t, lang } = useI18n()
  const c = t.contact

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await sendContact(email.trim(), subject.trim(), message.trim(), website)
      setSent(lang === 'en' && res.message ? res.message : c.sent(email.trim()))
      setSubject('')
      setMessage('')
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(c.invalid)
      } else if (err instanceof ApiError && err.status === 429) {
        setError(serverText(err, lang, c.tooMany))
      } else {
        setError(serverText(err, lang, c.failed))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page contact-page">
      <h1 className="page-title">{c.title}</h1>
      <p className="section-lede">{c.lede}</p>

      {sent ? (
        <div className="sent-panel" role="status">
          <p>{sent}</p>
          <button type="button" className="quiet" onClick={() => setSent(null)}>
            {c.sendAnother}
          </button>
        </div>
      ) : (
        <form className="contact-form" onSubmit={submit} noValidate={false}>
          <div className="field">
            <label htmlFor={ids.email}>{c.yourEmail}</label>
            <input
              id={ids.email}
              type="email"
              autoComplete="email"
              required
              maxLength={320}
              placeholder={c.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={ids.subject}>{c.subject}</label>
            <input
              id={ids.subject}
              required
              maxLength={150}
              placeholder={c.subjectPlaceholder}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={ids.message}>{c.message}</label>
            <textarea
              id={ids.message}
              required
              minLength={5}
              maxLength={MAX_MESSAGE}
              rows={8}
              placeholder={c.messagePlaceholder}
              aria-describedby={ids.count}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p id={ids.count} className="field-hint count-hint">
              {message.length}/{MAX_MESSAGE}
            </p>
          </div>
          <div className="trap" aria-hidden="true">
            <label htmlFor={ids.website}>Website</label>
            <input
              id={ids.website}
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="primary"
            disabled={busy || !email.trim() || !subject.trim() || message.trim().length < 5}
          >
            <Send size={18} aria-hidden="true" />
            {busy ? c.sending : c.send}
          </button>
          <p className="fine-print">
            {c.privacy(<a href="/privacy.html">{t.common.privacyPolicy}</a>)}
          </p>
        </form>
      )}
    </main>
  )
}
