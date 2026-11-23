// A tiny router for the pages ("/", "/profile", "/templates", "/contact", "/premium"). History API, no library.
import { useEffect, useState, type MouseEvent } from 'react'

const EVENT = 'memecreator:navigate'

export function navigate(path: string) {
  if (path === window.location.pathname + window.location.hash) return
  window.history.pushState(null, '', path)
  window.dispatchEvent(new Event(EVENT))
  window.scrollTo(0, 0)
}

export function usePath(): string {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const update = () => setPath(window.location.pathname)
    window.addEventListener('popstate', update)
    window.addEventListener(EVENT, update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener(EVENT, update)
    }
  }, [])
  return path
}

/** onClick for <a href="/..."> links inside the app: no page reload (new-tab clicks still work). */
export function followLink(e: MouseEvent<HTMLAnchorElement>) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  navigate(e.currentTarget.getAttribute('href') ?? '/')
}
