import { useEffect, useState } from 'react'
import type { Favorite, User } from './api'
import { ApiKeysPanel } from './ApiKeysPanel'
import { DeleteAccount } from './DeleteAccount'
import { useFavorites } from './favorites'
import { useI18n } from './i18n'
import { MemeCard, memeFileName } from './MemeCard'
import { usePlan } from './plan'
import { followLink } from './router'
import { Avatar } from './SiteHeader'

export function Profile({
  user,
  onSignedOut,
  onDeleted,
}: {
  user: User
  onSignedOut: () => void
  onDeleted: () => void
}) {
  const favorites = useFavorites()
  const plan = usePlan(onSignedOut)
  const { t } = useI18n()
  const p = t.profile
  // The list as it was when the page opened: un-hearting keeps the meme here (so it can be hearted again)
  const [shown, setShown] = useState<Favorite[] | null>(null)

  useEffect(() => {
    favorites.reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (favorites.items && shown === null) setShown(favorites.items)
  }, [favorites.items, shown])

  return (
    <main className="profile">
      <section className="profile-head" aria-label={p.yourAccount}>
        <Avatar user={user} size={64} />
        <div>
          <h1 className="profile-name">{user.name ?? user.email ?? p.yourProfile}</h1>
          <p className="profile-meta">
            {user.email && <span>{user.email}</span>}
            <span>{p.signsIn(p.methods[user.signInMethod] ?? user.signInMethod)}</span>
            {plan && (
              <span>
                {plan.plan === 'PREMIUM' ? p.premiumPlan : p.freePlan}
                {plan.remainingToday !== null && ` · ${p.leftToday(plan.remainingToday, plan.promptsPerDay)}`}
                {' · '}
                <a href="/premium" onClick={followLink}>
                  {plan.plan === 'PREMIUM' ? p.yourPlan : p.aboutPremium}
                </a>
              </span>
            )}
          </p>
        </div>
      </section>

      <section className="profile-section" aria-labelledby="favorites-title">
        <h2 id="favorites-title" className="section-title">
          {p.favorites}
          {favorites.items && favorites.items.length > 0 && <span className="count">{favorites.items.length}</span>}
        </h2>
        {favorites.loadError && (
          <p className="notice notice-error" role="alert">
            {p.favoritesError}{' '}
            <button type="button" className="link-button" onClick={favorites.reload}>
              {t.common.tryAgain}
            </button>
          </p>
        )}
        {shown === null && !favorites.loadError && <div className="grid grid-loading" aria-busy="true" />}
        {shown && shown.length === 0 && (
          <div className="empty-state">
            <p>{p.noFavorites}</p>
            <a href="/" className="primary as-link" onClick={followLink}>
              {t.header.makeMemes}
            </a>
          </div>
        )}
        {shown && shown.length > 0 && (
          <div className="grid">
            {shown.map((f, i) => (
              <MemeCard
                key={f.url}
                meme={f}
                fileName={memeFileName(f.template, i, f.url)}
                onSignedOut={onSignedOut}
                onEdited={(edited) =>
                  setShown((list) =>
                    (list ?? []).map((x, k) => (k === i ? { ...x, ...edited, id: -1, createdAt: x.createdAt } : x)),
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="profile-section" aria-labelledby="api-title">
        <h2 id="api-title" className="section-title">
          {p.apiKeys}
        </h2>
        <ApiKeysPanel onSignedOut={onSignedOut} />
      </section>

      <section className="profile-section danger-zone" aria-labelledby="delete-title">
        <h2 id="delete-title" className="section-title">
          {p.deleteTitle}
        </h2>
        <p className="section-lede">{p.deleteText}</p>
        <DeleteAccount onDeleted={onDeleted} onSignedOut={onSignedOut} variant="button" />
      </section>
    </main>
  )
}
