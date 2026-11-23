import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { ApiError, deleteAccount } from './api'

/** "Delete my account": a dialog where the person types DELETE. */
export function DeleteAccount({
  onDeleted,
  onSignedOut,
  label = 'Delete my account',
  variant = 'link',
}: {
  onDeleted: () => void
  onSignedOut: () => void
  label?: string
  /** link: inline text; button: a red button (profile page) */
  variant?: 'link' | 'button'
}) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  function close() {
    if (busy) return
    setOpen(false)
    setTyped('')
    setError(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation() // the dialog is portaled, but React still bubbles to any form around the button
    if (typed !== 'DELETE' || busy) return
    setBusy(true)
    setError(null)
    try {
      await deleteAccount()
      onDeleted()
    } catch (err) {
      setBusy(false)
      if (err instanceof ApiError && err.status === 401) {
        onSignedOut()
        return
      }
      setError(err instanceof ApiError && err.message ? err.message : 'Your account wasn’t deleted. Try again.')
    }
  }

  return (
    <>
      <button type="button" className={variant === 'button' ? 'danger' : 'link-button danger-link'} onClick={() => setOpen(true)}>
        {label}
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          className="dialog"
          aria-labelledby={`${id}-title`}
          onCancel={(e) => {
            e.preventDefault()
            close()
          }}
        >
          <form onSubmit={submit} className="dialog-body">
            <h2 id={`${id}-title`} className="dialog-title">
              Delete your account?
            </h2>
            <p>
              Your account, favorites, API keys, share links and every meme you made here are deleted for good. This can’t be undone.
              Memes you already downloaded stay on your device.
            </p>
            <div className="field">
              <label htmlFor={id}>Type DELETE to confirm</label>
              <input
                id={id}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            </div>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button type="button" className="quiet" onClick={close} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="danger" disabled={typed !== 'DELETE' || busy}>
                {busy ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </form>
        </dialog>,
        document.body,
      )}
    </>
  )
}
