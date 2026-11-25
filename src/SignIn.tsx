import { useEffect, useState } from 'react'
import { fetchProviders, type Provider, type User } from './api'
import { CaptionFrame } from './CaptionFrame'
import { EmailAuth } from './EmailAuth'
import { useI18n } from './i18n'

// Shown while the provider list loads, so the buttons don't jump in
const FALLBACK: Provider[] = [
  { id: 'google', label: 'Google', configured: true, loginUrl: '/oauth2/authorization/google' },
  { id: 'facebook', label: 'Facebook', configured: true, loginUrl: '/oauth2/authorization/facebook' },
]

export type Notice = { kind: 'error' | 'info'; text: string }

export function SignIn({ notice, onSignedIn }: { notice: Notice | null; onSignedIn: (user: User) => void }) {
  const [providers, setProviders] = useState<Provider[]>(FALLBACK)
  const { t } = useI18n()

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
        <CaptionFrame top={t.signIn.artTop} bottom={t.signIn.artBottom} className="frame-hero" />
      </div>

      <section className="signin-panel" aria-labelledby="signin-title">
        <h1 id="signin-title" className="signin-title">
          {t.signIn.title}
        </h1>
        <p className="lede">{t.signIn.lede}</p>

        {notice && (
          <p className={`notice notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}

        <h2 className="panel-title">{t.signIn.start}</h2>
        <div className="provider-list">
          {providers.map((p) =>
            p.configured ? (
              <a key={p.id} className={`provider provider-${p.id}`} href={p.loginUrl}>
                {t.signIn.continueWith(p.label)}
              </a>
            ) : (
              <span key={p.id} className={`provider provider-${p.id} is-disabled`} aria-disabled="true">
                {t.signIn.continueWith(p.label)}
                <small>{t.signIn.notSetUp}</small>
              </span>
            ),
          )}
        </div>

        <p className="divider">
          <span>{t.signIn.orEmail}</span>
        </p>
        <EmailAuth onSignedIn={onSignedIn} />

        <p className="fine-print">
          {t.signIn.finePrint(
            <a href="/terms.html">{t.common.termsOfUse}</a>,
            <a href="/privacy.html">{t.common.privacyPolicy}</a>,
          )}
        </p>
      </section>
    </main>
  )
}
