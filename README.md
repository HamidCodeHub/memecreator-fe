# memecreator-fe

The website of **Memes for Laughs** (memesforlaughs.com): a React + TypeScript app built with Vite. Sign in, type
what the memes should be about (or upload a photo), get 6 memes, then edit, favorite, share or download them.

Everything else (sign-in, meme making, accounts, limits) is done by the backend in the `memecreator` repository.
This app only talks to it over `/api/web/**`.

## Run it locally

You need Node.js 22 (Vite 8 needs 20.19 or newer), and the backend running on port 8081 (see memecreator's README, "Web app").

```bash
npm install        # first time, and after package.json changes
npm run dev        # http://localhost:5173
```

Open the site at `http://localhost:5173`, not at 8081. The dev server forwards `/api`, `/oauth2`, `/login`,
`/generated` and `/s/` to `http://localhost:8081` (`vite.config.ts`), so the browser sees one site: the session
cookie works and Google/Facebook send people back to port 5173.

## Build

```bash
npm run build      # type-checks, then writes the static site to dist/
```

In production the files in `dist/` are served by the web server in front of the backend (Caddy on the server),
which forwards the same paths to Spring Boot. See the "Deploying Memes for Laughs" guide.

## Where things are

| Path | What |
|---|---|
| `src/App.tsx`, `src/router.ts` | pages and the tiny router: `/`, `/profile`, `/templates`, `/contact`, `/premium` |
| `src/Generator.tsx` | the meme maker: topic, template picker, photo upload, results, daily prompts left |
| `src/MemeCard.tsx`, `src/EditMeme.tsx`, `src/ShareMenu.tsx` | one meme: download, favorite, share, edit the words |
| `src/Profile.tsx`, `src/ApiKeysPanel.tsx`, `src/DeleteAccount.tsx` | profile: plan, favorites, API keys, delete account |
| `src/Premium.tsx`, `src/plan.ts` | the Premium page and the daily-prompts state (payments aren't open yet) |
| `src/api.ts` | every call to the backend (CSRF token, error codes) |
| `src/site.ts` | site name, domain, social profile links |
| `src/theme.ts`, `index.html` | dark mode (follows the system until someone picks) |
| `src/styles.css` | all styles; colour tokens at the top, dark mode under `:root[data-theme='dark']` |
| `public/terms.html`, `privacy.html`, `data-deletion.html`, `legal.css` | legal pages, **drafts for legal review** |
| `public/logo.svg`, `favicon.svg` | the logo (also inlined in `src/Logo.tsx`) |

## Languages

The site is in English by default; the switch in the header (EN / IT) changes it, and the choice is remembered in
`localStorage` (`lang`). The site name and the logo never change. The meme captions are written in the site's
language unless the person picks another one under "Caption language".

- Every text is in `src/messages.tsx`: `en` and `it`, with the same shape (TypeScript reports a missing text).
  Components read them with `const { t } = useI18n()`, e.g. `t.generator.make`.
- To add a language: copy `it` into a new object, translate it, and add it to `LANGUAGES` in `src/i18n.tsx`.
- The backend writes its error messages in English. On the English site they are shown as they are; in other
  languages the site shows its own translated message for that case (`src/errors.ts`). Requests carry
  `Accept-Language`, so the backend can translate later.
- Not translated yet: the legal pages (`public/*.html`, still drafts for legal review) and the emails the backend
  sends.

## Legal pages and the terms version

When you change `terms.html` or `privacy.html`, change the version date in the pages **and**
`meme.accounts.terms-version` in the backend. Everyone is then asked to accept the new version before making memes
again.
