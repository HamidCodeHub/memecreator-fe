import { Check, Copy, KeyRound } from 'lucide-react'
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { ApiError, createApiKey, fetchApiKeys, revokeApiKey, type ApiKeys } from './api'

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const time = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

function when(iso: string | null) {
  return iso ? dateTime.format(new Date(iso)) : 'Never'
}

/** Personal API keys: create (shown once), list, revoke; today's usage. */
export function ApiKeysPanel({ onSignedOut }: { onSignedOut: () => void }) {
  const [data, setData] = useState<ApiKeys | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState<number | null>(null)
  const ids = { name: useId(), usage: useId() }

  const load = useCallback(() => {
    fetchApiKeys()
      .then((d) => {
        setData(d)
        setLoadError(false)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) onSignedOut()
        else setLoadError(true)
      })
  }, [onSignedOut])

  useEffect(load, [load])

  async function create(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const created = await createApiKey(name.trim())
      setNewKey(created.key)
      setCopied(false)
      setName('')
      load()
    } catch (err) {
      setError(err instanceof ApiError && err.message ? err.message : 'Couldn’t create a key. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: number) {
    setBusy(true)
    setError(null)
    try {
      await revokeApiKey(id)
      setConfirming(null)
      load()
    } catch {
      setError('Couldn’t revoke the key. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function copyKey() {
    if (!newKey) return
    try {
      await navigator.clipboard.writeText(newKey)
      setCopied(true)
    } catch {
      /* the key is selectable on the page */
    }
  }

  const origin = window.location.origin
  const atLimit = data !== null && data.keys.length >= 5

  return (
    <div className="api-keys">
      <p className="section-lede">
        Make memes from your own app, bot or script. Send one of your keys in the <code>X-API-Key</code> header.
      </p>

      {loadError && (
        <p className="notice notice-error" role="alert">
          Couldn’t load your API keys.{' '}
          <button type="button" className="link-button" onClick={load}>
            Try again
          </button>
        </p>
      )}

      {data && (
        <div className="usage" aria-labelledby={ids.usage}>
          <p id={ids.usage} className="usage-label">
            <strong>
              {data.quota.used} of {data.quota.limit}
            </strong>{' '}
            meme sets used today through the API · resets at {time.format(new Date(data.quota.resetsAt))}
          </p>
          <div
            className="meter"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={data.quota.limit}
            aria-valuenow={data.quota.used}
            aria-labelledby={ids.usage}
          >
            <span style={{ width: `${Math.min(100, (data.quota.used / Math.max(1, data.quota.limit)) * 100)}%` }} />
          </div>
          {data.plan === 'FREE' && <p className="field-hint">Free accounts get {data.quota.limit} sets a day.</p>}
        </div>
      )}

      {newKey && (
        <div className="new-key" role="status">
          <p className="new-key-title">
            <KeyRound size={18} aria-hidden="true" /> Your new key
          </p>
          <div className="new-key-row">
            <code className="key-value">{newKey}</code>
            <button type="button" className="quiet" onClick={copyKey}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="field-hint">
            Copy it now and keep it somewhere safe. We only show it once; if you lose it, revoke it and create a new
            one.
          </p>
          <button type="button" className="link-button" onClick={() => setNewKey(null)}>
            Done
          </button>
        </div>
      )}

      <form className="key-form" onSubmit={create}>
        <div className="field">
          <label htmlFor={ids.name}>
            Key name <span className="optional">(optional)</span>
          </label>
          <input
            id={ids.name}
            maxLength={60}
            placeholder="e.g. My Discord bot"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={atLimit}
          />
        </div>
        <button type="submit" className="primary" disabled={busy || data === null || atLimit}>
          Create key
        </button>
      </form>
      {atLimit && <p className="field-hint">You have 5 keys, the most allowed. Revoke one to create another.</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      {data && data.keys.length > 0 && (
        <table className="key-table">
          <caption className="sr-only">Your API keys</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Key</th>
              <th scope="col">Created</th>
              <th scope="col">Last used</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.keys.map((k) => (
              <tr key={k.id}>
                <td data-label="Name">{k.name}</td>
                <td data-label="Key">
                  <code>{k.prefix}…</code>
                </td>
                <td data-label="Created">{when(k.createdAt)}</td>
                <td data-label="Last used">{when(k.lastUsedAt)}</td>
                <td className="key-actions">
                  {confirming === k.id ? (
                    <span className="confirm">
                      Revoke this key?{' '}
                      <button type="button" className="danger small" onClick={() => revoke(k.id)} disabled={busy}>
                        Revoke
                      </button>{' '}
                      <button type="button" className="quiet small" onClick={() => setConfirming(null)}>
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="quiet small" onClick={() => setConfirming(k.id)}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && data.keys.length === 0 && !newKey && <p className="empty">You don’t have any API keys yet.</p>}

      <details className="example">
        <summary>Example request</summary>
        <pre>
          <code>{`curl -X POST ${origin}/api/v1/memes \\
  -H "X-API-Key: mcu_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"topic": "Monday meetings", "language": "English"}'`}</code>
        </pre>
        <p className="field-hint">
          The answer lists 6 memes; download each image from its <code>url</code> with the same header.{' '}
          <code>GET /api/v1/quota</code> shows what’s left today.
        </p>
      </details>
    </div>
  )
}
