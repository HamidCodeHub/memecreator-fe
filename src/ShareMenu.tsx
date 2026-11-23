import { Check, Download, Globe, Link2, Share2 } from 'lucide-react'
import { siFacebook, siInstagram, siTelegram, siWhatsapp, siX, type SimpleIcon } from 'simple-icons'
import { useEffect, useId, useRef, useState } from 'react'
import { ApiError, shareMeme, type Meme, type Share } from './api'

function BrandIcon({ icon }: { icon: SimpleIcon }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d={icon.path} fill="currentColor" />
    </svg>
  )
}

type State =
  | { kind: 'closed' }
  | { kind: 'loading' }
  | { kind: 'ready'; share: Share; file: File | null }
  | { kind: 'error'; message: string }

/** Share button with a menu: the phone's share sheet, Facebook, X, WhatsApp, Telegram, copy link. */
export function ShareMenu({ meme, fileName }: { meme: Meme; fileName: string }) {
  const [state, setState] = useState<State>({ kind: 'closed' })
  const [copied, setCopied] = useState(false)
  const [share, setShare] = useState<Share | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const open = state.kind !== 'closed'
  const text = meme.texts.filter(Boolean).join(' / ')

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setState({ kind: 'closed' })
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setState({ kind: 'closed' })
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Focus the first option once the menu is ready
  useEffect(() => {
    if (state.kind === 'ready') root.current?.querySelector<HTMLElement>('.share-menu [data-first]')?.focus()
  }, [state.kind])

  async function toggle() {
    if (open) {
      setState({ kind: 'closed' })
      return
    }
    setCopied(false)
    setState({ kind: 'loading' })
    try {
      const s = share ?? (await shareMeme(meme))
      setShare(s)
      // The image itself, for the phone's share sheet (Instagram, WhatsApp...). Loaded now: the share sheet
      // must open right on the next tap.
      let file: File | null = null
      if (typeof navigator.canShare === 'function') {
        const blob = await fetch(meme.url, { credentials: 'same-origin' })
          .then((r) => (r.ok ? r.blob() : null))
          .catch(() => null)
        if (blob) {
          const f = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
          if (navigator.canShare({ files: [f] })) file = f
        }
      }
      setState({ kind: 'ready', share: s, file })
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof ApiError && e.message ? e.message : 'Couldn’t get a link for this meme. Try again.',
      })
    }
  }

  async function nativeShare(s: Share, file: File | null) {
    try {
      if (file) await navigator.share({ files: [file], title: 'Meme', text: s.pageUrl })
      else await navigator.share({ title: 'Meme', text, url: s.pageUrl })
      setState({ kind: 'closed' })
    } catch {
      /* closed the share sheet */
    }
  }

  async function copy(s: Share) {
    try {
      await navigator.clipboard.writeText(s.pageUrl)
      setCopied(true)
    } catch {
      window.prompt('Copy this link:', s.pageUrl)
    }
  }

  const enc = encodeURIComponent
  const targets = (s: Share) => [
    { name: 'Facebook', icon: siFacebook, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(s.pageUrl)}` },
    { name: 'X', icon: siX, href: `https://x.com/intent/post?url=${enc(s.pageUrl)}&text=${enc(text)}` },
    { name: 'WhatsApp', icon: siWhatsapp, href: `https://wa.me/?text=${enc(`${text} ${s.pageUrl}`.trim())}` },
    { name: 'Telegram', icon: siTelegram, href: `https://t.me/share/url?url=${enc(s.pageUrl)}&text=${enc(text)}` },
  ]

  return (
    <div className="share" ref={root}>
      <button
        ref={button}
        type="button"
        className="icon-button"
        aria-label="Share"
        title="Share"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
      >
        <Share2 size={20} aria-hidden="true" />
      </button>
      {open && (
        <div id={menuId} className="share-menu" role="group" aria-label="Share this meme">
          {state.kind === 'loading' && <p className="share-status">Getting a link…</p>}
          {state.kind === 'error' && (
            <p className="share-status share-error" role="alert">
              {state.message}
            </p>
          )}
          {state.kind === 'ready' && (
            <>
              {typeof navigator.share === 'function' && (
                <button
                  type="button"
                  className="share-item"
                  data-first
                  onClick={() => nativeShare(state.share, state.file)}
                >
                  <Share2 size={18} aria-hidden="true" />
                  Share to an app…
                </button>
              )}
              {targets(state.share).map((t, i) => (
                <a
                  key={t.name}
                  className="share-item"
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-first={typeof navigator.share !== 'function' && i === 0 ? true : undefined}
                  onClick={() => setState({ kind: 'closed' })}
                >
                  <BrandIcon icon={t.icon} />
                  {t.name}
                </a>
              ))}
              <button type="button" className="share-item" onClick={() => copy(state.share)}>
                {copied ? <Check size={18} aria-hidden="true" /> : <Link2 size={18} aria-hidden="true" />}
                {copied ? 'Link copied' : 'Copy link'}
              </button>
              <a className="share-item" href={meme.url} download={fileName}>
                <BrandIcon icon={siInstagram} />
                <span>
                  Instagram
                  <small>Save the image, then post it from the app</small>
                </span>
                <Download size={16} aria-hidden="true" className="share-item-end" />
              </a>
              <p className="share-note">
                <Globe size={14} aria-hidden="true" /> Anyone with the link can see this meme.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
