import { RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { ApiError, fetchEditInfo, previewEdit, saveEdit, type EditInfo, type Meme } from './api'

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
          setLoadError(
            e instanceof ApiError && e.status === 404
              ? 'This meme can’t be edited: it was made before editing was added. Make a new set to edit its memes.'
              : 'Couldn’t open the editor. Try again.',
          )
      })
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
          if (e instanceof ApiError && e.status === 400 && e.message) setError(e.message)
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
      else setError(err instanceof ApiError && err.message ? err.message : 'Couldn’t save it. Try again.')
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
          Edit the words
        </h2>
        <div className="edit-layout">
          <figure className="edit-preview" aria-busy={updating}>
            <img src={preview ?? meme.url} alt={`${meme.template} meme, as it will look`} />
            {updating && <span className="edit-updating">Updating preview…</span>}
          </figure>
          <div className="edit-fields">
            {loadError && (
              <p className="notice notice-error" role="alert">
                {loadError}
              </p>
            )}
            {!info && !loadError && <p className="empty">Loading…</p>}
            {info &&
              info.labels.map((label, i) => (
                <div className="field" key={i}>
                  <label htmlFor={`${id}-t${i}`}>{label}</label>
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
                <RotateCcw size={16} aria-hidden="true" /> Back to the AI’s version
              </button>
            )}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <p className="field-hint">Saving adds the edited meme; the original stays as it is.</p>
          </div>
        </div>
        <div className="dialog-actions">
          <button type="button" className="quiet" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={!info || !changed || empty || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>,
    document.body,
  )
}
