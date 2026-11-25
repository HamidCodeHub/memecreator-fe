import { useCallback, useEffect, useState } from 'react'
import { ApiError, confirmEmail, fetchMe, signOut, type TemplateCard, type User } from './api'
import { Contact } from './Contact'
import { FavoritesProvider } from './favorites'
import { Generator } from './Generator'
import { useI18n } from './i18n'
import { Premium } from './Premium'
import { Profile } from './Profile'
import { ResetPassword } from './ResetPassword'
import { navigate, usePath } from './router'
import { SignIn, type Notice } from './SignIn'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'
import { TermsGate } from './TermsGate'
import { Templates } from './Templates'

type EmailLink = { kind: 'verify' | 'reset'; token: string }

/** Reads ?login=failed, ?verify=… and ?reset=… once, then removes them from the address bar. */
function readUrl(): { loginFailed: boolean; link: EmailLink | null } {
  const params = new URLSearchParams(window.location.search)
  const loginFailed = params.has('login')
  const verify = params.get('verify')
  const reset = params.get('reset')
  if (loginFailed || verify || reset) {
    ;['login', 'verify', 'reset'].forEach((p) => params.delete(p))
    const query = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''))
  }
  const link: EmailLink | null = verify ? { kind: 'verify', token: verify } : reset ? { kind: 'reset', token: reset } : null
  return { loginFailed, link }
}

export function App() {
  const { t, lang } = useI18n()
  // undefined = still checking the session
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [start] = useState(readUrl)
  const [resetToken, setResetToken] = useState<string | null>(start.link?.kind === 'reset' ? start.link.token : null)
  const [notice, setNotice] = useState<Notice | null>(
    start.loginFailed ? { kind: 'error', text: t.app.loginFailed } : null,
  )
  const [loadError, setLoadError] = useState(false)
  const path = usePath()
  const signedOut = useCallback(() => setUser(null), [])
  /** The template picked for the next memes (in the generator, or "Use this template" on the templates page) */
  const [template, setTemplate] = useState<TemplateCard | null>(null)

  useEffect(() => {
    const verifyToken = start.link?.kind === 'verify' ? start.link.token : null
    const load = verifyToken
      ? confirmEmail(verifyToken).catch(async (e) => {
          setNotice({
            kind: 'error',
            text: lang === 'en' && e instanceof ApiError && e.message ? e.message : t.app.badConfirmLink,
          })
          return fetchMe()
        })
      : fetchMe()
    load.then(setUser).catch(() => {
      setLoadError(true)
      setUser(null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once; the texts are the ones shown at that moment
  }, [start])

  function signedIn(u: User) {
    setNotice(null)
    setResetToken(null)
    setUser(u)
  }

  /** The backend refused because the terms changed: reload the user, which shows the terms again. */
  function termsNeeded() {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
  }

  function accountDeleted() {
    setUser(null)
    setNotice({ kind: 'info', text: t.app.deleted })
    navigate('/')
  }

  async function handleSignOut() {
    try {
      await signOut()
    } finally {
      setUser(null)
      navigate('/')
    }
  }

  if (user === undefined) {
    return <div className="boot" aria-busy="true" aria-label={t.app.loading} />
  }

  let page
  if (path === '/contact') {
    page = <Contact user={user} />
  } else if (!user && resetToken) {
    page = <ResetPassword token={resetToken} onSignedIn={signedIn} onCancel={() => setResetToken(null)} />
  } else if (!user) {
    page = (
      <>
        {loadError && (
          <p className="notice notice-error banner" role="alert">
            {t.app.serverDown}
          </p>
        )}
        <SignIn notice={notice} onSignedIn={signedIn} />
      </>
    )
  } else if (!user.termsAccepted) {
    page = <TermsGate user={user} onAccepted={setUser} onSignedOut={signedOut} onDeleted={accountDeleted} />
  } else {
    page = (
      <FavoritesProvider onSignedOut={signedOut}>
        {/* Kept mounted on the other pages, so the last memes are still there on the way back */}
        <div hidden={path === '/profile' || path === '/templates' || path === '/premium'}>
          <Generator
            onSignedOut={signedOut}
            onTermsNeeded={termsNeeded}
            template={template}
            onTemplateChange={setTemplate}
          />
        </div>
        {path === '/profile' && <Profile user={user} onSignedOut={signedOut} onDeleted={accountDeleted} />}
        {path === '/premium' && <Premium onSignedOut={signedOut} />}
        {path === '/templates' && (
          <Templates
            onSignedOut={signedOut}
            onUse={(t) => {
              setTemplate(t)
              navigate('/')
            }}
          />
        )}
      </FavoritesProvider>
    )
  }

  return (
    <div className="site">
      <SiteHeader user={user} path={path} onSignOut={handleSignOut} />
      <div className="site-main">{page}</div>
      <SiteFooter />
    </div>
  )
}
