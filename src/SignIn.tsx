import { useEffect, useState } from 'react'
import { fetchProviders, type Provider, type User } from './api'
import { CaptionFrame } from './CaptionFrame'
import { EmailAuth } from './EmailAuth'

// Shown while the provider list loads, so the buttons don't jump in
const FALLBACK: Provider[] = [
  { id: 'google', label: 'Google', configured: true, loginUrl: '/oauth2/authorization/google' },
  { id: 'facebook', label: 'Facebook', configured: true, loginUrl: '/oauth2/authorization/facebook' },
]

export type Notice = { kind: 'error' | 'info'; text: string }

export function SignIn({ notice, onSignedIn }: { notice: Notice | null; onSignedIn: (user: User) => void }) {
  const [providers, setProviders] = useState<Provider[]>(FALLBACK)

  useEffect(() => {
    fetchProviders()
      .then((list) => {
        // Google first: it's the option most people expect at the top
        const order = ['google', 'facebook']
        setProviders([...list].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)))
      })
      .catch(() => {
        /* keep the fallback buttons; the redirect will show any real problem */
      })
  }, [])

  return (
    <main className="signin">
      <div className="signin-art">
        <CaptionFrame top="Type anything" bottom="Get six memes" className="frame-hero" />
      </div>

      <section className="signin-panel" aria-labelledby="signin-title">
        <h1 id="signin-title" className="signin-title">Turn one line into six memes</h1>
        <p className="lede">
          Write what’s on your mind — a topic, a situation, a feeling. Memes for Laughs picks six templates and writes
          the captions.
        </p>

        {notice && (
          <p className={`notice notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}

        <h2 className="panel-title">Sign in to start</h2>
        <div className="provider-list">
          {providers.map((p) =>
            p.configured ? (
              <a key={p.id} className={`provider provider-${p.id}`} href={p.loginUrl}>
                Continue with {p.label}
              </a>
            ) : (
              <span key={p.id} className={`provider provider-${p.id} is-disabled`} aria-disabled="true">
                Continue with {p.label}
                <small>Not set up yet</small>
              </span>
            ),
          )}
        </div>

        <p className="divider">
          <span>or with your email</span>
        </p>
        <EmailAuth onSignedIn={onSignedIn} />

        <p className="fine-print">
          Memes for Laughs is for adults (18+). Captions can be rude. Read the <a href="/terms.html">Terms of use</a>{' '}
          and the <a href="/privacy.html">Privacy policy</a>; you accept them before making your first memes.
        </p>
      </section>
    </main>
  )
}
