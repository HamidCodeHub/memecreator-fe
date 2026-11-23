import { Send } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError, sendContact, type User } from './api'

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

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await sendContact(email.trim(), subject.trim(), message.trim(), website)
      setSent(res.message)
      setSubject('')
      setMessage('')
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError('Check your email address, and write a subject and a message.')
      } else {
        setError(err instanceof ApiError && err.message ? err.message : 'Your message wasn’t sent. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page contact-page">
      <h1 className="page-title">Contact us</h1>
      <p className="section-lede">
        A question, an idea, a meme that went wrong? Write to us and we’ll answer by email.
      </p>

      {sent ? (
        <div className="sent-panel" role="status">
          <p>{sent}</p>
          <button type="button" className="quiet" onClick={() => setSent(null)}>
            Send another message
          </button>
        </div>
      ) : (
        <form className="contact-form" onSubmit={submit} noValidate={false}>
          <div className="field">
            <label htmlFor={ids.email}>Your email</label>
            <input
              id={ids.email}
              type="email"
              autoComplete="email"
              required
              maxLength={320}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={ids.subject}>Subject</label>
            <input
              id={ids.subject}
              required
              maxLength={150}
              placeholder="What is it about?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={ids.message}>Message</label>
            <textarea
              id={ids.message}
              required
              minLength={5}
              maxLength={MAX_MESSAGE}
              rows={8}
              placeholder="Write your message here"
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
            {busy ? 'Sending…' : 'Send message'}
          </button>
          <p className="fine-print">
            We use your email only to answer you. See the <a href="/privacy.html">Privacy policy</a>.
          </p>
        </form>
      )}
    </main>
  )
}
