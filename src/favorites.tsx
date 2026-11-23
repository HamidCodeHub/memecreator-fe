import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { addFavorite, ApiError, fetchFavorites, removeFavorite, type Favorite, type Meme } from './api'

type Favorites = {
  /** newest first; null while loading */
  items: Favorite[] | null
  loadError: boolean
  isFavorite: (url: string) => boolean
  /** Adds or removes the heart. Rejects with an ApiError when the server says no. */
  toggle: (meme: Meme) => Promise<void>
  reload: () => void
}

const FavoritesContext = createContext<Favorites | null>(null)

/** The signed-in user's favorites, shared by the results grid and the profile page. */
export function FavoritesProvider({ children, onSignedOut }: { children: ReactNode; onSignedOut: () => void }) {
  const [items, setItems] = useState<Favorite[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  const reload = useCallback(() => {
    setLoadError(false)
    fetchFavorites()
      .then(setItems)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) onSignedOut()
        else setLoadError(true)
      })
  }, [onSignedOut])

  useEffect(reload, [reload])

  const value = useMemo<Favorites>(() => {
    const byUrl = new Map((items ?? []).map((f) => [f.url, f]))
    return {
      items,
      loadError,
      isFavorite: (url) => byUrl.has(url),
      reload,
      toggle: async (meme) => {
        const existing = byUrl.get(meme.url)
        try {
          if (existing) {
            await removeFavorite(existing.id)
            setItems((list) => (list ?? []).filter((f) => f.id !== existing.id))
          } else {
            const added = await addFavorite(meme)
            setItems((list) => [added, ...(list ?? []).filter((f) => f.id !== added.id)])
          }
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) onSignedOut()
          throw e
        }
      },
    }
  }, [items, loadError, reload, onSignedOut])

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites(): Favorites {
  const f = useContext(FavoritesContext)
  if (!f) throw new Error('useFavorites outside FavoritesProvider')
  return f
}
