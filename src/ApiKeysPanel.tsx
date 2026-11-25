import { Check, Copy, KeyRound } from 'lucide-react'
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { ApiError, createApiKey, fetchApiKeys, revokeApiKey, type ApiKeys } from './api'
import { serverText } from './errors'
import { useI18n } from './i18n'

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
  const { t, lang, locale, captionLanguage } = useI18n()
  const k = t.apiKeys
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
  const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short' })
  const when = (iso: string | null) => (iso ? dateTime.format(new Date(iso)) : k.never)

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
      setError(serverText(err, lang, err instanceof ApiError && err.status === 409 ? k.atLimit : k.createFailed))
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
      setError(k.revokeFailed)
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
      <p className="section-lede">{k.lede(<code>X-API-Key</code>)}</p>

      {loadError && (
        <p className="notice notice-error" role="alert">
          {k.loadError}{' '}
          <button type="button" className="link-button" onClick={load}>
            {t.common.tryAgain}
          </button>
        </p>
      )}

      {data && (
        <div className="usage" aria-labelledby={ids.usage}>
          <p id={ids.usage} className="usage-label">
            {k.usage(data.quota.used, data.quota.limit, time.format(new Date(data.quota.resetsAt)))}
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
          {data.plan === 'FREE' && <p className="field-hint">{k.freeHint(data.quota.limit)}</p>}
        </div>
      )}

      {newKey && (
        <div className="new-key" role="status">
          <p className="new-key-title">
            <KeyRound size={18} aria-hidden="true" /> {k.newKey}
          </p>
          <div className="new-key-row">
            <code className="key-value">{newKey}</code>
            <button type="button" className="quiet" onClick={copyKey}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied ? k.copied : k.copy}
            </button>
          </div>
          <p className="field-hint">{k.keepSafe}</p>
          <button type="button" className="link-button" onClick={() => setNewKey(null)}>
            {t.common.done}
          </button>
        </div>
      )}

      <form className="key-form" onSubmit={create}>
        <div className="field">
          <label htmlFor={ids.name}>
            {k.keyName} <span className="optional">{t.common.optional}</span>
          </label>
          <input
            id={ids.name}
            maxLength={60}
            placeholder={k.keyPlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={atLimit}
          />
        </div>
        <button type="submit" className="primary" disabled={busy || data === null || atLimit}>
          {k.create}
        </button>
      </form>
      {atLimit && <p className="field-hint">{k.atLimit}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      {data && data.keys.length > 0 && (
        <table className="key-table">
          <caption className="sr-only">{k.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{k.colName}</th>
              <th scope="col">{k.colKey}</th>
              <th scope="col">{k.colCreated}</th>
              <th scope="col">{k.colLastUsed}</th>
              <th scope="col">
                <span className="sr-only">{k.colActions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.keys.map((key) => (
              <tr key={key.id}>
                <td data-label={k.colName}>{key.name}</td>
                <td data-label={k.colKey}>
                  <code>{key.prefix}…</code>
                </td>
                <td data-label={k.colCreated}>{when(key.createdAt)}</td>
                <td data-label={k.colLastUsed}>{when(key.lastUsedAt)}</td>
                <td className="key-actions">
                  {confirming === key.id ? (
                    <span className="confirm">
                      {k.confirmRevoke}{' '}
                      <button type="button" className="danger small" onClick={() => revoke(key.id)} disabled={busy}>
                        {k.revoke}
                      </button>{' '}
                      <button type="button" className="quiet small" onClick={() => setConfirming(null)}>
                        {k.keep}
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="quiet small" onClick={() => setConfirming(key.id)}>
                      {k.revoke}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && data.keys.length === 0 && !newKey && <p className="empty">{k.none}</p>}

      <details className="example">
        <summary>{k.example}</summary>
        <pre>
          <code>{`curl -X POST ${origin}/api/v1/memes \\
  -H "X-API-Key: mcu_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"topic": "${k.exampleTopic}", "language": "${captionLanguage}"}'`}</code>
        </pre>
        <p className="field-hint">{k.exampleHint(<code>url</code>, <code>GET /api/v1/quota</code>)}</p>
      </details>
    </div>
  )
}
