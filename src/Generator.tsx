import { useId, useRef, useState, type FormEvent } from 'react'
import { ApiError, makeMemes, makePhotoMemes, type MemeSet, type TemplateCard } from './api'
import { CaptionFrame } from './CaptionFrame'
import { MemeCard, memeFileName } from './MemeCard'
import { PhotoAttach, PhotoPreview, photoProblem } from './PhotoAttach'
import { TemplatePicker } from './TemplatePicker'
import { planChanged, promptsWord, resetTime, usePlan } from './plan'
import { followLink } from './router'

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Italian', label: 'Italiano' },
  { value: 'German', label: 'Deutsch' },
]

const EXAMPLES = [
  'Monday meetings that could have been an email',
  'Deploying to production on a Friday',
  'The gym in January',
  'Group projects at university',
]

const MAX_TOPIC = 300
const SET_SIZE = 6

type State =
  | { kind: 'idle' }
  | { kind: 'loading'; topic: string }
  | { kind: 'done'; set: MemeSet }
  | { kind: 'error'; message: string }

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return e.message || 'You’ve reached the hourly limit. Try again later.'
    if (e.status === 413) return 'That photo is too big. Choose one under 10 MB.'
    if (e.status === 400) return e.message || 'That topic can’t be used. Try different words.'
    if (e.status === 502 || e.status === 503)
      return e.message || 'The server isn’t responding right now. Please try again later.'
    if (e.status === 0) return e.message
  }
  return 'Something went wrong while making your memes. Try again.'
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
  const [topic, setTopic] = useState('')
  const [language, setLanguage] = useState('English')
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
      setState({ kind: 'error', message: errorMessage(err) })
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
          const problem = photoProblem(f)
          setPhotoError(problem)
          if (!problem) setPhoto(f)
        }}
      >
        <label htmlFor={ids.topic} className="composer-label">
          {photo ? (
            <>
              What should the memes say about your photo? <span className="optional">(optional)</span>
            </>
          ) : (
            'What should your memes be about?'
          )}
        </label>
        <textarea
          id={ids.topic}
          ref={inputRef}
          className="topic"
          rows={2}
          maxLength={MAX_TOPIC}
          value={topic}
          placeholder={
            photo
              ? 'Leave it empty and the AI decides what’s funny about your photo'
              : 'e.g. My cat ignoring me until I open the fridge'
          }
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
            <label htmlFor={ids.language}>Caption language</label>
            <select id={ids.language} value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
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
            {loading ? 'Making memes…' : state.kind === 'done' ? 'Make 6 new memes' : 'Make 6 memes'}
          </button>
        </div>

        {photoError && (
          <p className="field-error" role="alert">
            {photoError}
          </p>
        )}

        {plan && promptsLeft !== null && !outOfPrompts && (
          <p className="prompts-left">
            {promptsLeft} of {plan.promptsPerDay} {promptsWord(plan.promptsPerDay)} left today.{' '}
            {plan.plan === 'FREE' && (
              <a href="/premium" onClick={followLink}>
                Need more?
              </a>
            )}
          </p>
        )}

        {state.kind !== 'done' && !loading && !photo && !outOfPrompts && (
          <div className="examples">
            <span>Try:</span>
            {EXAMPLES.map((ex) => (
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
            ? 'Looking at your photo and writing captions. This usually takes 10–30 seconds.'
            : template
              ? `Writing six jokes on “${template.name}”. This usually takes 10–30 seconds.`
              : 'Writing captions and picking templates. This usually takes 10–30 seconds.')}
        {state.kind === 'done' && `${state.set.memes.length} memes ready.`}
      </p>

      {state.kind === 'error' && (
        <p className="notice notice-error" role="alert">
          {state.message}
        </p>
      )}

      {plan && outOfPrompts && !loading && (
        <section className="limit-card" role="status" aria-labelledby="limit-title">
          <h2 id="limit-title" className="limit-title">
            That’s your {plan.promptsPerDay} {promptsWord(plan.promptsPerDay)} for today
          </h2>
          <p className="limit-text">
            They come back at {resetTime(plan.resetsAt)}.
            {plan.plan === 'FREE' && ' Premium will give you more every day.'}
          </p>
          {plan.plan === 'FREE' && (
            <a href="/premium" className="primary as-link" onClick={followLink}>
              See Premium
            </a>
          )}
        </section>
      )}

      {(state.kind === 'idle' || state.kind === 'error') && photo && <PhotoPreview photo={photo} />}

      {(state.kind === 'idle' || state.kind === 'error') && !photo && !outOfPrompts && (
        <CaptionFrame
          className="frame-preview"
          top={trimmed || 'Your topic goes here'}
          placeholder={!trimmed}
          bottom="Get six memes"
        />
      )}

      {loading && (
        <section className="grid" aria-label="Memes on the way" aria-busy="true">
          {Array.from({ length: SET_SIZE }, (_, i) => (
            <div key={i} className="tile tile-pending" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </section>
      )}

      {state.kind === 'done' && (
        <section ref={resultsRef} tabIndex={-1} className="results" aria-labelledby="results-title">
          <h2 id="results-title" className="results-title">
            {state.set.topic ? <>Memes about “{state.set.topic}”</> : 'Memes from your photo'}
          </h2>
          {state.set.memes.length < SET_SIZE && (
            <p className="results-note">
              {state.set.memes.length} of {SET_SIZE} came out this time. Make a new set to get more.
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
