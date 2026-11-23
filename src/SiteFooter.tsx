import { Logo } from './Logo'
import { SOCIAL } from './site'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="footer-brand">
          <Logo className="logo-footer" />
          <span className="sr-only">Memes for Laughs</span>
          <span className="footer-tagline">Type anything, get six memes.</span>
        </p>
        <nav className="footer-links" aria-label="Legal">
          <a href="/terms.html">Terms of use</a>
          <a href="/privacy.html">Privacy policy</a>
          <a href="/data-deletion.html">Delete your data</a>
        </nav>
        <ul className="social" aria-label="Memes for Laughs on social media">
          {SOCIAL.map((s) => (
            <li key={s.name}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`Memes for Laughs on ${s.name}`}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                  <path d={s.icon.path} fill="currentColor" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
