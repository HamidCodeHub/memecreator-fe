import { Languages, Moon, Sun } from 'lucide-react'
import type { User } from './api'
import { LANGUAGES, useI18n, type Lang } from './i18n'
import { Logo } from './Logo'
import { followLink } from './router'
import { useTheme } from './theme'

export function Avatar({ user, size = 32 }: { user: User; size?: number }) {
  return user.picture ? (
    <img className="avatar" src={user.picture} alt="" referrerPolicy="no-referrer" width={size} height={size} />
  ) : (
    <span className="avatar avatar-initial" aria-hidden="true" style={{ width: size, height: size }}>
      {(user.name ?? user.email ?? '?').charAt(0).toUpperCase()}
    </span>
  )
}

/**
 * The bar on top of every page. Left: the account (name → profile) and Sign out, or Sign in. Middle: the site name
 * (home). Right: the pages, with Contact us as a button, dark mode and the language.
 */
export function SiteHeader({ user, path, onSignOut }: { user: User | null; path: string; onSignOut: () => void }) {
  const canUse = !!user?.termsAccepted
  const [theme, toggleTheme] = useTheme()
  const { t, lang, setLang } = useI18n()
  const current = (p: string) => (path === p ? 'page' : undefined)
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="header-account">
          {user ? (
            <>
              {canUse ? (
                <a
                  href="/profile"
                  onClick={followLink}
                  aria-current={current('/profile')}
                  className="account-link"
                  title={t.header.yourProfile}
                >
                  <Avatar user={user} />
                  <span className="account-name">{user.name ?? user.email ?? t.header.profile}</span>
                </a>
              ) : (
                <span className="account-link">
                  <Avatar user={user} />
                  <span className="account-name">{user.name ?? user.email}</span>
                </span>
              )}
              <button type="button" className="quiet" onClick={onSignOut}>
                {t.header.signOut}
              </button>
            </>
          ) : (
            path !== '/' && (
              <a href="/" onClick={followLink} className="quiet as-link">
                {t.header.signIn}
              </a>
            )
          )}
        </div>

        <a href="/" className="header-brand" onClick={followLink} aria-label={t.header.home}>
          <Logo className="logo-header" />
        </a>

        <nav className="site-nav" aria-label={t.header.mainNav}>
          {canUse && (
            <>
              <a href="/" onClick={followLink} aria-current={current('/')} className="nav-link">
                {t.header.makeMemes}
              </a>
              <a href="/templates" onClick={followLink} aria-current={current('/templates')} className="nav-link">
                {t.header.templates}
              </a>
            </>
          )}
          <a href="/contact" onClick={followLink} aria-current={current('/contact')} className="contact-button">
            {t.header.contact}
          </a>
        </nav>

        <div className="header-tools">
          <button
            type="button"
            className="icon-button theme-toggle"
            aria-label={t.header.darkMode}
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? t.header.toLight : t.header.toDark}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
          </button>
          <label className="lang-switch" title={t.header.language}>
            <Languages size={18} aria-hidden="true" />
            <span className="sr-only">{t.header.language}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} lang={l.code} aria-label={l.name}>
                  {l.code.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  )
}
