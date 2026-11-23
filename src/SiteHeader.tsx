import { Moon, Sun } from 'lucide-react'
import type { User } from './api'
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
 * (home). Right: the pages, with Contact us as a button.
 */
export function SiteHeader({ user, path, onSignOut }: { user: User | null; path: string; onSignOut: () => void }) {
  const canUse = !!user?.termsAccepted
  const [theme, toggleTheme] = useTheme()
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
                  title="Your profile"
                >
                  <Avatar user={user} />
                  <span className="account-name">{user.name ?? user.email ?? 'Profile'}</span>
                </a>
              ) : (
                <span className="account-link">
                  <Avatar user={user} />
                  <span className="account-name">{user.name ?? user.email}</span>
                </span>
              )}
              <button type="button" className="quiet" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            path !== '/' && (
              <a href="/" onClick={followLink} className="quiet as-link">
                Sign in
              </a>
            )
          )}
        </div>

        <a href="/" className="header-brand" onClick={followLink} aria-label="Memes for Laughs, home">
          <Logo className="logo-header" />
        </a>

        <nav className="site-nav" aria-label="Main">
          {canUse && (
            <>
              <a href="/" onClick={followLink} aria-current={current('/')} className="nav-link">
                Make memes
              </a>
              <a href="/templates" onClick={followLink} aria-current={current('/templates')} className="nav-link">
                Templates
              </a>
            </>
          )}
          <a href="/contact" onClick={followLink} aria-current={current('/contact')} className="contact-button">
            Contact us
          </a>
          <button
            type="button"
            className="icon-button theme-toggle"
            aria-label="Dark mode"
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
          </button>
        </nav>
      </div>
    </header>
  )
}
