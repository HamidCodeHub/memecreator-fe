import { Check, LayoutGrid, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ApiError, fetchTemplates, type TemplateCard } from './api'
import { useI18n } from './i18n'

/**
 * "Template: Any (AI picks)" button. It opens a scrolling grid of every template; picking one makes all six memes
 * use it. The × next to a picked template goes back to letting the AI pick.
 */
export function TemplatePicker({
  value,
  onChange,
  onSignedOut,
  disabled,
}: {
  value: TemplateCard | null
  onChange: (t: TemplateCard | null) => void
  onSignedOut: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState<TemplateCard[] | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const id = useId()
  const { t } = useI18n()

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  function load() {
    setError(false)
    fetchTemplates()
      .then(setAll)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) onSignedOut()
        else setError(true)
      })
  }

  function show() {
    setQuery('')
    setOpen(true)
    if (!all) load()
  }

  function close() {
    setOpen(false)
    button.current?.focus()
  }

  function pick(t: TemplateCard | null) {
    onChange(t)
    close()
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (all ?? []).filter((t) => !q || t.name.toLowerCase().includes(q))
  }, [all, query])

  return (
    <div className="template-picker">
      <span className="picker-label" id={`${id}-label`}>
        {t.picker.label}
      </span>
      <div className="picker-row">
        <button
          ref={button}
          type="button"
          className="picker-button"
          aria-labelledby={`${id}-label ${id}-value`}
          aria-haspopup="dialog"
          disabled={disabled}
          onClick={show}
        >
          {value ? (
            <img src={value.url} alt="" className="picker-thumb" />
          ) : (
            <LayoutGrid size={20} aria-hidden="true" className="picker-thumb picker-thumb-any" />
          )}
          <span id={`${id}-value`} className="picker-value">
            {value ? value.name : t.picker.any}
          </span>
        </button>
        {value && (
          <button
            type="button"
            className="icon-button"
            aria-label={t.picker.clear}
            title={t.picker.clearTitle}
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {createPortal(
        <dialog
          ref={dialog}
          className="dialog picker-dialog"
          aria-labelledby={`${id}-title`}
          onCancel={(e) => {
            e.preventDefault()
            close()
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) close() // click on the backdrop
          }}
        >
          <div className="picker-head">
            <h2 id={`${id}-title`} className="dialog-title">
              {t.picker.title}
            </h2>
            <button type="button" className="icon-button" aria-label={t.common.close} onClick={close}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="picker-lede">{t.picker.lede}</p>
          <div className="search">
            <label htmlFor={`${id}-search`} className="sr-only">
              {t.picker.search}
            </label>
            <Search size={18} aria-hidden="true" className="search-icon" />
            <input
              id={`${id}-search`}
              type="search"
              placeholder={t.picker.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="picker-scroll">
            {error && (
              <p className="notice notice-error" role="alert">
                {t.picker.loadError}{' '}
                <button type="button" className="link-button" onClick={load}>
                  {t.common.tryAgain}
                </button>
              </p>
            )}
            {all === null && !error && <p className="empty">{t.picker.loading}</p>}
            {all && shown.length === 0 && <p className="empty">{t.picker.noMatch(query.trim())}</p>}
            {(all !== null || query === '') && (
              <ul className="picker-grid" aria-label={t.picker.list}>
                {query.trim() === '' && (
                  <li>
                    <button
                      type="button"
                      className={`picker-option picker-any${value === null ? ' is-picked' : ''}`}
                      aria-pressed={value === null}
                      onClick={() => pick(null)}
                    >
                      <span className="picker-any-art">
                        <LayoutGrid size={36} aria-hidden="true" />
                      </span>
                      <span className="picker-option-name">{t.picker.any}</span>
                    </button>
                  </li>
                )}
                {shown.map((t) => {
                  const picked = value?.id === t.id
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={`picker-option${picked ? ' is-picked' : ''}`}
                        aria-pressed={picked}
                        onClick={() => pick(t)}
                      >
                        <img src={t.url} alt="" loading="lazy" />
                        <span className="picker-option-name">{t.name}</span>
                        {picked && <Check size={18} aria-hidden="true" className="picker-check" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </dialog>,
        document.body,
      )}
    </div>
  )
}
