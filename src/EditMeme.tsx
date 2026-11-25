import { RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { ApiError, fetchEditInfo, previewEdit, saveEdit, type EditInfo, type Meme } from './api'
import { serverText } from './errors'
import { useI18n } from './i18n'

const MAX_TEXT = 200

/**
 * "Edit the words" dialog: one field per text, a live preview drawn by the server (with the real font and the
 * watermark), and Save, which keeps the original and adds the edited meme.
 */
export function EditMeme({
  meme,
  open,
  onClose,
  onSaved,
  onSignedOut,
}: {
  meme: Meme
  open: boolean
  onClose: () => void
  onSaved: (edited: Meme) => void
  onSignedOut: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [info, setInfo] = useState<EditInfo | null>(null)
  const [texts, setTexts] = useState<string[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { t, lang } = useI18n()

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  // Load what can be changed whenever the dialog opens
  useEffect(() => {
    if (!open) return
    setInfo(null)
    setLoadError(null)
    setError(null)
    setPreview(null)
    fetchEditInfo(meme.url)
      .then((i) => {
        setInfo(i)
        setTexts(i.texts)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) onSignedOut()
        else
          setLoadError(e instanceof ApiError && e.status === 404 ? t.edit.notEditable : t.edit.openFailed)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on open, not on a language switch
  }, [open, meme.url, onSignedOut])

  // Live preview: half a second after the last change
  const changed = info !== null && texts.some((t, i) => t !== info.texts[i])
  useEffect(() => {
    if (!info || !changed) {
      setPreview(null)
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      setUpdating(true)
      previewEdit(info.url, texts, ctrl.signal)
        .then((blob) => setPreview(URL.createObjectURL(blob)))
        .catch((e) => {
          if (e instanceof DOMException && e.name === 'AbortError') return
          if (e instanceof ApiError && e.status === 400) setError(serverText(e, lang, t.edit.badText))
        })
        .finally(() => setUpdating(false))
    }, 500)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [info, texts, changed])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const atAi = info !== null && texts.every((t, i) => t === info.aiTexts[i])
  const empty = texts.every((t) => t.trim() === '')

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!info || saving || !changed || empty) return
    setSaving(true)
    setError(null)
    try {
      const edited = await saveEdit(info.url, texts)
      onSaved(edited)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onSignedOut()
      else
        setError(
          serverText(err, lang, err instanceof ApiError && err.status === 400 ? t.edit.badText : t.meme.couldntSave),
        )
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      className="dialog edit-dialog"
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault()
        if (!saving) onClose()
      }}
    >
      <form className="edit-body" onSubmit={save}>
        <h2 id={`${id}-title`} className="dialog-title">
          {t.edit.title}
        </h2>
        <div className="edit-layout">
          <figure className="edit-preview" aria-busy={updating}>
            <img src={preview ?? meme.url} alt={t.edit.previewAlt(meme.template)} />
            {updating && <span className="edit-updating">{t.edit.updating}</span>}
          </figure>
          <div className="edit-fields">
            {loadError && (
              <p className="notice notice-error" role="alert">
                {loadError}
              </p>
            )}
            {!info && !loadError && <p className="empty">{t.common.loading}</p>}
            {info &&
              info.labels.map((label, i) => (
                <div className="field" key={i}>
                  <label htmlFor={`${id}-t${i}`}>{t.edit.boxLabel(label)}</label>
                  <textarea
                    id={`${id}-t${i}`}
                    rows={2}
                    maxLength={MAX_TEXT}
                    value={texts[i] ?? ''}
                    onChange={(e) => {
                      const next = [...texts]
                      next[i] = e.target.value.replace(/\n/g, ' ')
                      setTexts(next)
                      setError(null)
                    }}
                  />
                </div>
              ))}
            {info && !atAi && (
              <button type="button" className="link-button back-to-ai" onClick={() => setTexts(info.aiTexts)}>
                <RotateCcw size={16} aria-hidden="true" /> {t.edit.back}
              </button>
            )}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <p className="field-hint">{t.edit.hint}</p>
          </div>
        </div>
        <div className="dialog-actions">
          <button type="button" className="quiet" onClick={onClose} disabled={saving}>
            {t.common.cancel}
          </button>
          <button type="submit" className="primary" disabled={!info || !changed || empty || saving}>
            {saving ? t.common.saving : t.common.save}
          </button>
        </div>
      </form>
    </dialog>,
    document.body,
  )
}
