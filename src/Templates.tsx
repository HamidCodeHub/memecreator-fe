import { Download, Search, Sparkles } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { ApiError, fetchTemplates, type TemplateCard } from './api'

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
          <h1 className="page-title">Templates</h1>
          <p className="section-lede">
            {all
              ? `All ${all.length} templates our memes are made from, blank.`
              : 'The templates our memes are made from.'}{' '}
            Download any of them to make your own.
          </p>
        </div>
        <div className="search">
          <label htmlFor={searchId} className="sr-only">
            Search templates
          </label>
          <Search size={18} aria-hidden="true" className="search-icon" />
          <input
            id={searchId}
            type="search"
            placeholder="Search templates"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="notice notice-error" role="alert">
          Couldn’t load the templates.{' '}
          <button type="button" className="link-button" onClick={load}>
            Try again
          </button>
        </p>
      )}
      {all === null && !error && <div className="grid grid-loading" aria-busy="true" />}
      {all && shown.length === 0 && <p className="empty">No template matches “{query.trim()}”.</p>}
      {shown.length > 0 && (
        <ul className="template-grid" aria-label="Templates">
          {shown.map((t) => (
            <li key={t.id} className="template-card">
              <img src={t.url} alt={t.name} loading="lazy" />
              <div className="template-card-foot">
                <span className="template-name">{t.name}</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Make memes with ${t.name}`}
                  title="Make memes with it"
                  onClick={() => onUse(t)}
                >
                  <Sparkles size={20} aria-hidden="true" />
                </button>
                <a
                  className="icon-button"
                  href={t.url}
                  download={fileName(t)}
                  aria-label={`Download ${t.name}`}
                  title="Download"
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
