import { useI18n } from './i18n'
import { Logo } from './Logo'
import { SOCIAL } from './site'

export function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="footer-brand">
          <Logo className="logo-footer" />
          <span className="sr-only">Memes for Laughs</span>
          <span className="footer-tagline">{t.footer.tagline}</span>
        </p>
        <nav className="footer-links" aria-label={t.footer.legal}>
          <a href="/terms.html">{t.common.termsOfUse}</a>
          <a href="/privacy.html">{t.common.privacyPolicy}</a>
          <a href="/data-deletion.html">{t.common.deleteYourData}</a>
        </nav>
        <ul className="social" aria-label={t.footer.social}>
          {SOCIAL.map((s) => (
            <li key={s.name}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={t.footer.on(s.name)}>
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
