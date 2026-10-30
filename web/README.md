# Web client

The browser version of the school management system. Same backend, same theme
tokens, same auth flow as the Expo app — only the rendering layer differs.

## Run it

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

`web/.env` must contain the backend origin:

```
VITE_API_URL=http://localhost:5000
```

No `/v1` suffix — the client appends it, because the backend serves every
route under `/v1` (URI versioning with `defaultVersion: '1'`).

### The one thing that will trip you up: CORS

The backend enables CORS with `origin: <CORS_ORIGINS>`, and falls back to
`false` — deny everything — when that variable is empty. A browser will
therefore refuse every request from `http://localhost:5173` until the backend's
`.env` says otherwise:

```
CORS_ORIGINS=http://localhost:5173
```

Comma-separate several origins. Restart the backend after changing it. This is
configuration only — no backend code change is needed.

## Stack

| Concern    | Choice                                  |
| ---------- | --------------------------------------- |
| Build      | Vite 7 + React 19 + TypeScript          |
| Styling    | Tailwind CSS v4 (`@theme` tokens)       |
| Icons      | lucide-react                            |
| Routing    | react-router-dom                        |
| Validation | Zod — every response is parsed          |
| HTTP       | axios with a refresh interceptor        |

Deliberately **no SSR**: the backend runs on a 1 GB KVM1 box, so the web client
ships as static files that nginx can serve without a Node process.

## Layout

```
src/
  api/        raw axios calls + Zod parse
  components/  shared UI
  context/     AuthContext
  hooks/      useAuth and friends
  lib/        env, api client, token store, helpers
  routes/     one directory per screen
  types/      Zod schemas for every API response
```

`api/` is never called from a component — it goes through a hook, same rule as
the app (see the repo root AGENTS.md).

## Theme

The palette is taken from the code the app actually renders with —
`app/constants/theme.ts` plus the `app/src/style/*.ts` StyleSheets — **not**
from `app/global.css`.

That distinction matters, and it is easy to get wrong. `global.css` declares a
cream/`#EA7A53`-coral `@theme` block, but nothing in `app/` or `src/`
references its token classes: `bg-accent`, `bg-background`, `text-primary` and
friends appear **zero** times across the app's `.tsx`. Every screen is styled
from `src/style/*.ts`. Those files say:

| Token            | Value     | Where it comes from                          |
| ---------------- | --------- | -------------------------------------------- |
| `background`     | `#F9FAFB` | `Teacher.ts`, `Admin.ts`, `markAttendance.ts` |
| `card`           | `#FFFFFF` | `login.ts` card, `home.ts`, every list card  |
| `primary`        | `#111827` | body text                                    |
| `label`          | `#374151` | form labels                                  |
| `muted-fg`       | `#6B7280` | secondary text                               |
| `subtle`         | `#9CA3AF` | placeholders, field icons                    |
| `accent`         | `#2563EB` | `constants/theme.ts` — "one accent for the whole app" |
| `accent-strong`  | `#1D4ED8` | `colors.accentPressed`                       |
| `border`         | `#E5E7EB` | card and input borders                       |
| `field`          | `#F9FAFB` | input rows (`login.ts`)                      |
| `destructive`    | `#DC2626` | `colors.danger`                              |
| `destructive-str`| `#B91C1C` | `colors.dangerPressed` — used for error text |
| `scrim`          | `#0F172A` | the login photo overlay `rgba(15,23,42,…)`    |

The most-used literals in the app confirm it: `#FFFFFF` ×79, `#2563EB` ×60,
`#F3F4F6` ×56, `#E5E7EB` ×49, `#9CA3AF` ×39, `#DC2626` ×30.

Geometry follows `login.ts` too: card 24px radius, inputs and the button 12px,
input height 48px, button height 50px with a blue shadow.

`--color-destructive-strong` is the only deliberate deviation, and it is an
accessibility fix rather than a style choice: `#DC2626` on the `#FEF2F2` error
tint measures 4.4:1, just under the 4.5:1 floor, so the label uses the app's own
darker pressed shade (5.9:1).

## Auth, and what is still weak

- Access and refresh tokens live in `localStorage` (`src/lib/tokenStore.ts`);
  axios attaches the access token and refreshes once on a 401.
- Backend refresh tokens are **single use** and atomically claimed, so refresh
  is serialised across tabs with the Web Locks API. Without that, two open tabs
  racing a refresh would sign each other out.
- `localStorage` is readable by any script that achieves XSS. The correct fix
  is an httpOnly, `SameSite=Strict` refresh cookie set by the backend, plus
  CSRF protection on `/auth/refresh` — a backend change, not a frontend one.
  Until then: keep a tight CSP and do not add third-party scripts here.
