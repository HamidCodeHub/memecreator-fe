import { Download, Heart, Pencil } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { ApiError, type Meme } from './api'
import { EditMeme } from './EditMeme'
import { serverText } from './errors'
import { useFavorites } from './favorites'
import { useI18n } from './i18n'
import { ShareMenu } from './ShareMenu'

export function memeFileName(topic: string, index: number, url: string) {
  const ext = url.split('.').pop() || 'jpg'
  const slug = topic
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `${slug || 'meme'}-${index + 1}.${ext}`
}

/** One meme with its actions: edit the words, favorite (heart), share, download. */
export function MemeCard({ meme, fileName, style, onEdited, onSignedOut }: {
  meme: Meme
  fileName: string
  style?: CSSProperties
  /** The words were changed: the edited meme (a new image; the original stays) */
  onEdited: (edited: Meme) => void
  onSignedOut: () => void
}) {
  const favorites = useFavorites()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const liked = favorites.isFavorite(meme.url)
  const { t, lang } = useI18n()

  async function toggle() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await favorites.toggle(meme)
    } catch (e) {
      setError(
        serverText(
          e,
          lang,
          e instanceof ApiError && e.status === 409
            ? t.meme.tooManyFavorites
            : liked
              ? t.meme.couldntRemove
              : t.meme.couldntSave,
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <figure className="tile" style={style}>
      <img src={meme.url} alt={t.meme.alt(meme.template, meme.texts.filter(Boolean).join(' / '))} />
      <figcaption>
        <span className="template-name">{meme.template}</span>
        <div className="tile-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={t.meme.edit}
            title={t.meme.edit}
            aria-haspopup="dialog"
            onClick={() => setEditing(true)}
          >
            <Pencil size={19} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`icon-button heart${liked ? ' is-on' : ''}`}
            aria-pressed={liked}
            aria-label={t.meme.favorite}
            title={liked ? t.meme.removeFavorite : t.meme.addFavorite}
            disabled={busy || favorites.items === null}
            onClick={toggle}
          >
            <Heart size={20} aria-hidden="true" fill={liked ? 'currentColor' : 'none'} />
          </button>
          <ShareMenu meme={meme} fileName={fileName} />
          <a
            className="icon-button"
            href={meme.url}
            download={fileName}
            aria-label={t.common.download}
            title={t.common.download}
          >
            <Download size={20} aria-hidden="true" />
          </a>
        </div>
      </figcaption>
      {error && (
        <p className="tile-error" role="alert">
          {error}
        </p>
      )}
      {editing && (
        <EditMeme
          meme={meme}
          open={editing}
          onClose={() => setEditing(false)}
          onSaved={onEdited}
          onSignedOut={onSignedOut}
        />
      )}
    </figure>
  )
}
