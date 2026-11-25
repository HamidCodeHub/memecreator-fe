// The site's language. English unless the visitor picks another one; the choice is remembered (localStorage
// "lang"). The language of the meme captions follows it by default (see Generator).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en, it, type Messages } from './messages'

export type Lang = 'en' | 'it'

export const LANGUAGES: {
  code: Lang
  /** in its own language, for the switch */
  name: string
  /** the caption language that goes with it (the value the backend expects) */
  caption: string
  /** for dates and times */
  locale: string
}[] = [
  { code: 'en', name: 'English', caption: 'English', locale: 'en' },
  { code: 'it', name: 'Italiano', caption: 'Italian', locale: 'it-IT' },
]

const MESSAGES: Record<Lang, Messages> = { en, it }

function isLang(v: unknown): v is Lang {
  return LANGUAGES.some((l) => l.code === v)
}

function savedLang(): Lang {
  try {
    const l = localStorage.getItem('lang')
    if (isLang(l)) return l
  } catch {
    /* storage blocked: English */
  }
  return 'en'
}

// For code outside React (api.ts): the language currently shown
let current: Lang = savedLang()
export const currentLang = () => current
export const currentMessages = () => MESSAGES[current]

type I18n = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Messages
  locale: string
  /** The caption language that matches the site language, e.g. "Italian" */
  captionLanguage: string
}

const I18nContext = createContext<I18n | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current)

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem('lang', l)
    } catch {
      /* not remembered, still switched */
    }
    current = l
    setLangState(l)
  }, [])

  useEffect(() => {
    current = lang
    document.documentElement.lang = lang
    document.querySelector('meta[name="description"]')?.setAttribute('content', MESSAGES[lang].meta.description)
  }, [lang])

  const value = useMemo<I18n>(() => {
    const info = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]
    return { lang, setLang, t: MESSAGES[lang], locale: info.locale, captionLanguage: info.caption }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const v = useContext(I18nContext)
  if (!v) throw new Error('useI18n outside LanguageProvider')
  return v
}

/** "at midnight" / "a mezzanotte", or "at 6:00 PM" / "alle 18:00": when today's limit resets, on the visitor's clock */
export function resetWhen(resetsAt: string, t: Messages, locale: string): string {
  const d = new Date(resetsAt)
  if (d.getHours() === 0 && d.getMinutes() === 0) return t.common.atMidnight
  return t.common.atTime(d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }))
}
