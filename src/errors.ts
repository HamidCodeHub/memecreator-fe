import { ApiError } from './api'
import type { Lang } from './i18n'

/**
 * Text for an error from the backend. The backend writes its messages in English, so on the English site its own
 * (more specific) words are shown; in other languages, the translated text given for that case.
 */
export function serverText(e: unknown, lang: Lang, translated: string): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return e.message // no connection: already in the site's language (api.ts)
    if (lang === 'en' && e.message) return e.message
  }
  return translated
}
