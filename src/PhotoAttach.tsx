import { ImagePlus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']

/** Checks a chosen or dropped file; returns an error message, or null when it can be used. */
export function photoProblem(file: File): string | null {
  if (!TYPES.includes(file.type)) return 'That file isn’t a photo. Choose a JPEG or PNG image.'
  if (file.size > MAX_PHOTO_BYTES) return 'That photo is too big. Choose one under 10 MB.'
  return null
}

/** "Use your photo" button; once a photo is chosen, its thumbnail with a × to remove it. */
export function PhotoAttach({
  photo,
  onChange,
  onError,
  disabled,
}: {
  photo: File | null
  onChange: (f: File | null) => void
  onError: (message: string | null) => void
  disabled?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const id = useId()

  useEffect(() => {
    if (!photo) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  function chosen(files: FileList | null) {
    const f = files?.[0]
    if (input.current) input.current.value = '' // choosing the same file again still fires
    if (!f) return
    const problem = photoProblem(f)
    onError(problem)
    if (!problem) onChange(f)
  }

  return (
    <div className="photo-attach">
      <input
        ref={input}
        id={id}
        type="file"
        accept={TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={(e) => chosen(e.target.files)}
      />
      {photo && preview ? (
        <div className="photo-chip">
          <img src={preview} alt="" className="picker-thumb" />
          <span className="picker-value">{photo.name}</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Remove the photo"
            title="Remove the photo"
            disabled={disabled}
            onClick={() => {
              onChange(null)
              onError(null)
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button type="button" className="picker-button" disabled={disabled} onClick={() => input.current?.click()}>
          <ImagePlus size={20} aria-hidden="true" className="picker-thumb picker-thumb-any" />
          <span className="picker-value">Use your photo</span>
        </button>
      )}
    </div>
  )
}

/** The chosen photo, shown where the sample meme frame usually is. */
export function PhotoPreview({ photo }: { photo: File }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(photo)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [photo])
  return url ? (
    <figure className="photo-preview">
      <img src={url} alt="Your photo" />
      <figcaption>Six memes will be made from this photo.</figcaption>
    </figure>
  ) : null
}
