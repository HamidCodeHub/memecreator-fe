import { useEffect, useState } from 'react'
import type { Favorite, User } from './api'
import { ApiKeysPanel } from './ApiKeysPanel'
import { DeleteAccount } from './DeleteAccount'
import { useFavorites } from './favorites'
import { MemeCard, memeFileName } from './MemeCard'
import { promptsWord, usePlan } from './plan'
import { followLink } from './router'
import { Avatar } from './SiteHeader'

const SIGN_IN_METHODS: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  password: 'email and password',
}

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
      <section className="profile-head" aria-label="Your account">
        <Avatar user={user} size={64} />
        <div>
          <h1 className="profile-name">{user.name ?? user.email ?? 'Your profile'}</h1>
          <p className="profile-meta">
            {user.email && <span>{user.email}</span>}
            <span>Signs in with {SIGN_IN_METHODS[user.signInMethod] ?? user.signInMethod}</span>
            {plan && (
              <span>
                {plan.plan === 'PREMIUM' ? 'Premium plan' : 'Free plan'}
                {plan.remainingToday !== null &&
                  ` · ${plan.remainingToday} of ${plan.promptsPerDay} ${promptsWord(plan.promptsPerDay)} left today`}
                {' · '}
                <a href="/premium" onClick={followLink}>
                  {plan.plan === 'PREMIUM' ? 'Your plan' : 'About Premium'}
                </a>
              </span>
            )}
          </p>
        </div>
      </section>

      <section className="profile-section" aria-labelledby="favorites-title">
        <h2 id="favorites-title" className="section-title">
          Favorites
          {favorites.items && favorites.items.length > 0 && <span className="count">{favorites.items.length}</span>}
        </h2>
        {favorites.loadError && (
          <p className="notice notice-error" role="alert">
            Couldn’t load your favorites.{' '}
            <button type="button" className="link-button" onClick={favorites.reload}>
              Try again
            </button>
          </p>
        )}
        {shown === null && !favorites.loadError && <div className="grid grid-loading" aria-busy="true" />}
        {shown && shown.length === 0 && (
          <div className="empty-state">
            <p>No favorites yet. Tap the heart under a meme to keep it here.</p>
            <a href="/" className="primary as-link" onClick={followLink}>
              Make memes
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
          API keys
        </h2>
        <ApiKeysPanel onSignedOut={onSignedOut} />
      </section>

      <section className="profile-section danger-zone" aria-labelledby="delete-title">
        <h2 id="delete-title" className="section-title">
          Delete your account
        </h2>
        <p className="section-lede">
          Deletes your account, your favorites, your API keys, your share links and every meme you made here. This can’t
          be undone.
        </p>
        <DeleteAccount onDeleted={onDeleted} onSignedOut={onSignedOut} variant="button" />
      </section>
    </main>
  )
}
