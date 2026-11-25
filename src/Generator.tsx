import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ApiError, makeMemes, makePhotoMemes, type MemeSet, type TemplateCard } from './api'
import { CaptionFrame } from './CaptionFrame'
import { MemeCard, memeFileName } from './MemeCard'
import { PhotoAttach, PhotoPreview, photoProblem } from './PhotoAttach'
import { TemplatePicker } from './TemplatePicker'
import { serverText } from './errors'
import { resetWhen, useI18n, type Lang } from './i18n'
import type { Messages } from './messages'
import { planChanged, usePlan } from './plan'
import { followLink } from './router'

/** Languages the captions can be written in (each in its own language) */
const CAPTION_LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Italian', label: 'Italiano' },
  { value: 'German', label: 'Deutsch' },
]

const MAX_TOPIC = 300
const SET_SIZE = 6

type State =
  | { kind: 'idle' }
  | { kind: 'loading'; topic: string }
  | { kind: 'done'; set: MemeSet }
  | { kind: 'error'; message: string }

function errorMessage(e: unknown, t: Messages, lang: Lang, photo: boolean): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return serverText(e, lang, t.generator.hourlyLimit)
    if (e.status === 413) return t.photo.tooBig
    if (e.status === 400) return serverText(e, lang, photo ? t.photo.notPhoto : t.generator.badTopic)
    if (e.status === 502 || e.status === 503) return t.common.aiUnavailable
    if (e.status === 0) return e.message
  }
  return t.generator.failed
}

export function Generator({
  onSignedOut,
  onTermsNeeded,
  template,
  onTemplateChange,
}: {
  onSignedOut: () => void
  /** The backend says the current terms aren't accepted (they changed): show the terms again */
  onTermsNeeded: () => void
  /** the template all memes should use; null: the AI picks */
  template: TemplateCard | null
  onTemplateChange: (t: TemplateCard | null) => void
}) {
  const { t, lang, locale, captionLanguage } = useI18n()
  const [topic, setTopic] = useState('')
  // The captions are in the site's language unless the person picks another one (until the site language changes)
  const [language, setLanguage] = useState(captionLanguage)
  useEffect(() => setLanguage(captionLanguage), [captionLanguage])
  const [state, setState] = useState<State>({ kind: 'idle' })
  /** "Use your photo": memes are made from it, and the topic becomes optional */
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultsRef = useRef<HTMLElement>(null)
  const ids = { topic: useId(), language: useId(), hint: useId() }

  const plan = usePlan(onSignedOut)
  /** null: no daily limit (or not known yet) */
  const promptsLeft = plan?.remainingToday ?? null
  const outOfPrompts = promptsLeft === 0

  const loading = state.kind === 'loading'
  const trimmed = topic.trim()

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if ((!trimmed && !photo) || loading || outOfPrompts) return
    setState({ kind: 'loading', topic: trimmed })
    try {
      const set = photo
        ? await makePhotoMemes(photo, trimmed, language)
        : await makeMemes(trimmed, language, template?.id ?? null)
      setState({ kind: 'done', set })
      planChanged()
      requestAnimationFrame(() => resultsRef.current?.focus())
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DAILY_LIMIT') {
        setState({ kind: 'idle' })
        planChanged()
        return
      }
      if (err instanceof ApiError && err.status === 401) {
        onSignedOut()
        return
      }
      if (err instanceof ApiError && err.code === 'TERMS_NOT_ACCEPTED') {
        setState({ kind: 'idle' })
        onTermsNeeded()
        return
      }
      setState({ kind: 'error', message: errorMessage(err, t, lang, photo !== null) })
    }
  }

  function pickExample(text: string) {
    setTopic(text)
    inputRef.current?.focus()
  }

  return (
    <main className="workspace">
      <form
        className={`composer${dragging ? ' is-dragging' : ''}`}
        onSubmit={submit}
        onDragOver={(e) => {
          if (loading || !e.dataTransfer.types.includes('Files')) return
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
        }}
        onDrop={(e) => {
          if (loading || !e.dataTransfer.files.length) return
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          const problem = photoProblem(f, t)
          setPhotoError(problem)
          if (!problem) setPhoto(f)
        }}
      >
        <label htmlFor={ids.topic} className="composer-label">
          {photo ? (
            <>
              {t.generator.photoLabel} <span className="optional">{t.common.optional}</span>
            </>
          ) : (
            t.generator.topicLabel
          )}
        </label>
        <textarea
          id={ids.topic}
          ref={inputRef}
          className="topic"
          rows={2}
          maxLength={MAX_TOPIC}
          value={topic}
          placeholder={photo ? t.generator.photoPlaceholder : t.generator.topicPlaceholder}
          aria-describedby={ids.hint}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            // Enter makes memes; Shift+Enter adds a line
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void submit()
            }
          }}
        />
        <div className="composer-row">
          {!photo && (
            <TemplatePicker value={template} onChange={onTemplateChange} onSignedOut={onSignedOut} disabled={loading} />
          )}
          <PhotoAttach photo={photo} onChange={setPhoto} onError={setPhotoError} disabled={loading} />
          <div className="field-inline">
            <label htmlFor={ids.language}>{t.generator.captionLanguage}</label>
            <select id={ids.language} value={language} onChange={(e) => setLanguage(e.target.value)}>
              {CAPTION_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <span id={ids.hint} className="counter">
            {topic.length}/{MAX_TOPIC}
          </span>
          <button type="submit" className="primary" disabled={(!trimmed && !photo) || loading || outOfPrompts}>
            {loading ? t.generator.making : state.kind === 'done' ? t.generator.makeNew : t.generator.make}
          </button>
        </div>

        {photoError && (
          <p className="field-error" role="alert">
            {photoError}
          </p>
        )}

        {plan && promptsLeft !== null && !outOfPrompts && (
          <p className="prompts-left">
            {t.generator.promptsLeft(promptsLeft, plan.promptsPerDay)}{' '}
            {plan.plan === 'FREE' && (
              <a href="/premium" onClick={followLink}>
                {t.generator.needMore}
              </a>
            )}
          </p>
        )}

        {state.kind !== 'done' && !loading && !photo && !outOfPrompts && (
          <div className="examples">
            <span>{t.generator.tryLabel}</span>
            {t.generator.examples.map((ex) => (
              <button key={ex} type="button" className="chip" onClick={() => pickExample(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}
      </form>

      <p className={`status${state.kind === 'done' ? ' sr-only' : ''}`} role="status" aria-live="polite">
        {loading &&
          (photo
            ? t.generator.loadingPhoto
            : template
              ? t.generator.loadingTemplate(template.name)
              : t.generator.loadingAny)}
        {state.kind === 'done' && t.generator.ready(state.set.memes.length)}
      </p>

      {state.kind === 'error' && (
        <p className="notice notice-error" role="alert">
          {state.message}
        </p>
      )}

      {plan && outOfPrompts && !loading && (
        <section className="limit-card" role="status" aria-labelledby="limit-title">
          <h2 id="limit-title" className="limit-title">
            {t.generator.limitTitle(plan.promptsPerDay)}
          </h2>
          <p className="limit-text">
            {t.generator.limitBack(resetWhen(plan.resetsAt, t, locale))}
            {plan.plan === 'FREE' && ` ${t.generator.premiumMore}`}
          </p>
          {plan.plan === 'FREE' && (
            <a href="/premium" className="primary as-link" onClick={followLink}>
              {t.generator.seePremium}
            </a>
          )}
        </section>
      )}

      {(state.kind === 'idle' || state.kind === 'error') && photo && <PhotoPreview photo={photo} />}

      {(state.kind === 'idle' || state.kind === 'error') && !photo && !outOfPrompts && (
        <CaptionFrame
          className="frame-preview"
          top={trimmed || t.generator.frameTop}
          placeholder={!trimmed}
          bottom={t.generator.frameBottom}
        />
      )}

      {loading && (
        <section className="grid" aria-label={t.generator.onTheWay} aria-busy="true">
          {Array.from({ length: SET_SIZE }, (_, i) => (
            <div key={i} className="tile tile-pending" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </section>
      )}

      {state.kind === 'done' && (
        <section ref={resultsRef} tabIndex={-1} className="results" aria-labelledby="results-title">
          <h2 id="results-title" className="results-title">
            {state.set.topic ? t.generator.resultsAbout(state.set.topic) : t.generator.resultsPhoto}
          </h2>
          {state.set.memes.length < SET_SIZE && (
            <p className="results-note">
              {t.generator.partial(state.set.memes.length, SET_SIZE)}
            </p>
          )}
          <div className="grid">
            {state.set.memes.map((m, i) => (
              <MemeCard
                key={m.url}
                meme={m}
                fileName={memeFileName(state.set.topic || 'my-photo', i, m.url)}
                style={{ animationDelay: `${i * 70}ms` }}
                onSignedOut={onSignedOut}
                onEdited={(edited) =>
                  setState((st) =>
                    st.kind === 'done'
                      ? { kind: 'done', set: { ...st.set, memes: st.set.memes.map((x, k) => (k === i ? edited : x)) } }
                      : st,
                  )
                }
              />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
