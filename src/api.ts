import { currentLang, currentMessages } from './i18n'

// Calls to the memecreator backend. Same origin (Vite proxy in development), session cookie set by the
// backend after Google/Facebook sign-in. Changing requests carry the CSRF token from the XSRF-TOKEN cookie.

export type User = {
  id: string
  /** "password", "google" or "facebook" */
  signInMethod: string
  name: string | null
  email: string | null
  picture: string | null
  hasPassword: boolean
  /** false: the current Terms of use / Privacy policy must be accepted before making memes */
  termsAccepted: boolean
  /** the current version, sent back when accepting */
  termsVersion: string
}

export type Legal = {
  termsVersion: string
  termsUrl: string
  privacyUrl: string
  deletionUrl: string
}

export type Provider = {
  id: string
  label: string
  configured: boolean
  loginUrl: string
}

export type Meme = {
  template: string
  texts: string[]
  url: string
}

/** A meme the user marked with the heart. */
export type Favorite = Meme & {
  id: number
  createdAt: string
}

export type Share = {
  token: string
  /** public page to post: shows a preview on Facebook, X, WhatsApp... */
  pageUrl: string
  imageUrl: string
}

export type ApiKey = {
  id: number
  name: string
  /** "mcu_" and the first characters, to tell keys apart */
  prefix: string
  createdAt: string
  lastUsedAt: string | null
}

export type ApiQuota = { limit: number; used: number; remaining: number; resetsAt: string }

export type ApiKeys = { keys: ApiKey[]; quota: ApiQuota; plan: string }

export type MemeSet = {
  topic: string
  language: string
  memes: Meme[]
  /** prompts left today after this one; null when the plan has no daily limit */
  promptsLeft?: number | null
}

/** GET /api/web/plan: the plan and today's prompts. A limit of 0 means no daily limit. */
export type PlanInfo = {
  plan: 'FREE' | 'PREMIUM'
  promptsPerDay: number
  usedToday: number
  remainingToday: number | null
  resetsAt: string
  freePromptsPerDay: number
  premiumPromptsPerDay: number
  /** false while Premium can't be bought (payments aren't open yet) */
  upgradeAvailable: boolean
}

export class ApiError extends Error {
  readonly status: number
  /** Machine-readable reason from the backend, e.g. EMAIL_NOT_CONFIRMED */
  readonly code: string | null

  constructor(status: number, message: string, code: string | null = null) {
    super(message)
    this.status = status
    this.code = code
  }
}

function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  headers.set('Accept-Language', currentLang())
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const method = (init.method ?? 'GET').toUpperCase()
  if (method !== 'GET') {
    const token = csrfToken()
    if (token) headers.set('X-XSRF-TOKEN', token)
  }

  let response: Response
  try {
    response = await fetch(path, { ...init, headers, credentials: 'same-origin' })
  } catch {
    throw new ApiError(0, currentMessages().common.offline)
  }
  if (response.status === 204) return undefined as T
  if (!response.ok) {
    let detail = ''
    let code: string | null = null
    try {
      const problem = await response.json()
      detail = typeof problem?.detail === 'string' ? problem.detail : ''
      code = typeof problem?.code === 'string' ? problem.code : null
    } catch {
      /* not JSON */
    }
    throw new ApiError(response.status, detail, code)
  }
  return (await response.json()) as T
}

/** The signed-in user, or null when nobody is signed in. */
export async function fetchMe(): Promise<User | null> {
  try {
    return await request<User>('/api/web/me')
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

export const fetchProviders = () => request<Provider[]>('/api/web/providers')

export const fetchPlan = () => request<PlanInfo>('/api/web/plan')

/** Fired after each set and on the daily limit, so every page showing the plan can refresh it. */
export const PLAN_CHANGED = 'memecreator:plan-changed'

/** @param template a template id: all memes use it; null lets the AI pick the templates */
export const makeMemes = (topic: string, language: string, template: string | null = null) =>
  request<MemeSet>('/api/web/memes', { method: 'POST', body: JSON.stringify({ topic, language, template }) })

/** Memes from the user's own photo; without a topic the AI decides what's funny about it. */
export function makePhotoMemes(photo: File, topic: string, language: string) {
  const form = new FormData()
  form.append('image', photo)
  if (topic) form.append('topic', topic)
  form.append('language', language)
  return request<MemeSet>('/api/web/photo-memes', { method: 'POST', body: form })
}

export const signOut = () => request<void>('/api/web/logout', { method: 'POST' })

export const fetchLegal = () => request<Legal>('/api/web/legal')

export const acceptTerms = (version: string) =>
  request<User>('/api/web/terms/accept', { method: 'POST', body: JSON.stringify({ version }) })

/** Deletes the account and everything it made, and signs out. Can't be undone. */
export const deleteAccount = () =>
  request<void>('/api/web/account', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE' }) })

// ---- email + password accounts ----

type Message = { message: string }

const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const signUp = (email: string, password: string, name: string, termsVersion: string) =>
  post<Message>('/api/web/auth/signup', { email, password, name: name || null, termsVersion })

export const signIn = (email: string, password: string) => post<User>('/api/web/auth/login', { email, password })

export const resendConfirmation = (email: string) => post<Message>('/api/web/auth/resend', { email })

export const forgotPassword = (email: string) => post<Message>('/api/web/auth/forgot', { email })

export const confirmEmail = (token: string) => post<User>('/api/web/auth/verify', { token })

export const resetPassword = (token: string, password: string) =>
  post<User>('/api/web/auth/reset', { token, password })

// ---- profile: favorites, sharing, API keys ----

const memeBody = (m: Meme) => ({ url: m.url, template: m.template, texts: m.texts })

export const fetchFavorites = () => request<Favorite[]>('/api/web/favorites')

export const addFavorite = (m: Meme) => post<Favorite>('/api/web/favorites', memeBody(m))

export const removeFavorite = (id: number) => request<void>(`/api/web/favorites/${id}`, { method: 'DELETE' })

export const shareMeme = (m: Meme) => post<Share>('/api/web/shares', memeBody(m))

export const fetchApiKeys = () => request<ApiKeys>('/api/web/api-keys')

export const createApiKey = (name: string) => post<{ info: ApiKey; key: string }>('/api/web/api-keys', { name })

export const revokeApiKey = (id: number) => request<void>(`/api/web/api-keys/${id}`, { method: 'DELETE' })

// ---- templates page, contact form ----

export type TemplateCard = { id: string; name: string; url: string }

export const fetchTemplates = () => request<TemplateCard[]>('/api/web/templates')

/** @param website hidden field: only bots fill it in */
export const sendContact = (email: string, subject: string, message: string, website: string) =>
  post<{ message: string }>('/api/web/contact', { email, subject, message, website })

// ---- editing a meme's words ----

/**
 * What can be changed in a meme.
 * @param labels one per text: what that text is for
 * @param aiTexts / aiUrl the AI's version, for "Back to the AI's version"
 */
export type EditInfo = {
  url: string
  template: string
  labels: string[]
  texts: string[]
  aiTexts: string[]
  aiUrl: string
}

export const fetchEditInfo = (url: string) => request<EditInfo>(`/api/web/edits?url=${encodeURIComponent(url)}`)

/** The meme with other words, as an image (nothing saved). */
export async function previewEdit(url: string, texts: string[], signal?: AbortSignal): Promise<Blob> {
  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'image/jpeg, application/json',
    'Accept-Language': currentLang(),
  })
  const token = csrfToken()
  if (token) headers.set('X-XSRF-TOKEN', token)
  let response: Response
  try {
    response = await fetch('/api/web/edits/preview', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, texts }),
      credentials: 'same-origin',
      signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, currentMessages().common.offline)
  }
  if (!response.ok) {
    let detail = ''
    try {
      const problem = await response.json()
      detail = typeof problem?.detail === 'string' ? problem.detail : ''
    } catch {
      /* not JSON */
    }
    throw new ApiError(response.status, detail)
  }
  return response.blob()
}

/** Saves the meme with these words as a new meme; the original stays. */
export const saveEdit = (url: string, texts: string[]) => post<Meme>('/api/web/edits', { url, texts })
