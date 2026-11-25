import { Download, Search, Sparkles } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { ApiError, fetchTemplates, type TemplateCard } from './api'
import { useI18n } from './i18n'

function fileName(t: TemplateCard) {
  const slug = t.name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'template'}.jpg`
}

/** Every template, blank, to look at and download. */
export function Templates({ onSignedOut, onUse }: {
  onSignedOut: () => void
  /** "Make memes with it": go to the generator with this template picked */
  onUse: (t: TemplateCard) => void
}) {
  const [all, setAll] = useState<TemplateCard[] | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const searchId = useId()
  const { t } = useI18n()

  function load() {
    setError(false)
    fetchTemplates()
      .then(setAll)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) onSignedOut()
        else setError(true)
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (all ?? []).filter((t) => !q || t.name.toLowerCase().includes(q))
  }, [all, query])

  return (
    <main className="page templates-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">{t.templates.title}</h1>
          <p className="section-lede">
            {all ? t.templates.ledeAll(all.length) : t.templates.ledeNone} {t.templates.ledeDownload}
          </p>
        </div>
        <div className="search">
          <label htmlFor={searchId} className="sr-only">
            {t.picker.search}
          </label>
          <Search size={18} aria-hidden="true" className="search-icon" />
          <input
            id={searchId}
            type="search"
            placeholder={t.picker.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="notice notice-error" role="alert">
          {t.picker.loadError}{' '}
          <button type="button" className="link-button" onClick={load}>
            {t.common.tryAgain}
          </button>
        </p>
      )}
      {all === null && !error && <div className="grid grid-loading" aria-busy="true" />}
      {all && shown.length === 0 && <p className="empty">{t.picker.noMatch(query.trim())}</p>}
      {shown.length > 0 && (
        <ul className="template-grid" aria-label={t.picker.list}>
          {shown.map((tpl) => (
            <li key={tpl.id} className="template-card">
              <img src={tpl.url} alt={tpl.name} loading="lazy" />
              <div className="template-card-foot">
                <span className="template-name">{tpl.name}</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t.templates.use(tpl.name)}
                  title={t.templates.useTitle}
                  onClick={() => onUse(tpl)}
                >
                  <Sparkles size={20} aria-hidden="true" />
                </button>
                <a
                  className="icon-button"
                  href={tpl.url}
                  download={fileName(tpl)}
                  aria-label={t.templates.downloadNamed(tpl.name)}
                  title={t.common.download}
                >
                  <Download size={20} aria-hidden="true" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
