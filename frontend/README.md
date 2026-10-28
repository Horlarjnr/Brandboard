# BrandBoard Frontend

React (Vite) single-page app for BrandBoard. Create a project once (brand name,
description, three colors, font, optional logo), then generate on-brand banners
from a short prompt and a size preset. Works in light and dark mode.

No login. A project is identified by a short `code` and protected by an owner
token that the backend returns once. Both are kept in this browser's
`localStorage`.

## Run it

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev        # http://localhost:5173
```

By default the app runs in **mock mode** (`VITE_USE_MOCK=true`): a fake backend
inside the browser, so the whole flow works with no server. On the landing page,
"load demo projects" adds two ready-made projects (TechNest and Sunrise Bakery).
In the mock, a prompt containing the word "fail" shows the error state.

To use the real API, set this in `.env.local` and restart:

```
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000
```

The backend must allow CORS for `http://localhost:5173`.

## Themes (light / dark)

- Tokens for both themes live in `src/styles/tokens.css`. Components only use
  those variables, so a color change is a one-line edit there.
- The sun/moon button switches theme. The choice is saved; until someone
  chooses, the app follows the device setting.
- `index.html` sets the theme before first paint, so there is no flash.
- Light palette: indigo primary. Dark palette: mint primary. Both come from the mockups.

## Logo

The supplied logo was a PNG with a dark glow baked in and white "Brand" text, so
it was invisible on a light background. It was traced to vector paths
(`src/assets/logoPaths.js`) and rebuilt as the `<Logo />` component:

- the gradient "B" mark is the same in both themes;
- "Brand" and "Board" read `--logo-ink` / `--logo-accent`, so they recolor per theme
  (white and mint in dark mode, near-black and a deeper green in light mode).

Static files for the README and social cards: `public/brandboard-logo-light.svg`,
`public/brandboard-logo-dark.svg`. The favicon is `public/favicon.svg`.

## Folder structure

```
frontend/
  index.html                  theme bootstrap, Inter font, favicon
  vite.config.js
  vercel.json                 SPA rewrite so /project/:code works on refresh (Vercel)
  public/
    _redirects                same rewrite for Netlify
    favicon.svg
    brandboard-logo-light.svg
    brandboard-logo-dark.svg
  src/
    main.jsx                  entry, router, global styles
    App.jsx                   routes
    assets/logoPaths.js       traced logo vectors
    styles/
      tokens.css              light + dark design tokens
      global.css              layout and component styles
    lib/
      api.js                  ALL backend calls live here
      mockApi.js              in-browser fake backend (mirrors plan.md) + demo data
      constants.js            size presets, fonts, limits, step labels
      storage.js              projects + owner tokens in localStorage
      exportImage.js          PNG/JPEG export and copy (browser side, embeds the brand font)
      colors.js               initials, hex check, readable text color
      fonts.js                Google Fonts helpers
      format.js               dates, size labels, file-name slugs
    hooks/
      useTheme.js             light/dark state
      useProjects.js          saved projects for the sidebar
      useGeneration.js        start a generation and poll until done/failed
    components/
      AppShell.jsx            sidebar + top bar + create modal
      Sidebar.jsx  Logo.jsx  Icon.jsx  Avatar.jsx  ThemeToggle.jsx  Menu.jsx
      CreateProjectModal.jsx  hex color fields, font preview, drag-and-drop logo
      BrandKit.jsx            color dots + font chip with details panel
      ActionBar.jsx           Download (format/scale menu), Copy, Regenerate
      BannerCanvas.jsx        loading / empty / generated preview
      BannerFrame.jsx         sandboxed, scaled preview used by canvas and thumbnails
      PromptBar.jsx           prompt, size picker, Generate
      VersionStrip.jsx        version history with thumbnails
    pages/
      Landing.jsx  Workspace.jsx  NotFound.jsx
```

## Flow

1. `POST /projects` (multipart) returns `code` and `owner_token`. Saved to localStorage.
2. Sidebar lists saved projects. `/project/:code` loads `GET /projects/:code`.
3. Generate: `POST /projects/:code/generations` with a fresh `request_id` per click.
4. Poll `GET /generations/:id` every second. `queued -> running -> done | failed`.
5. On `done` the sanitized markup (`svg`) is shown in a sandboxed iframe.
6. Export (PNG or JPEG, 1x/2x/3x) and copy happen in the browser.
7. Regenerate creates a new version linked by `parent_id`.

Every protected call sends `X-Project-Token`.

## Open items (waiting on backend)

| Item | Where | Status |
| --- | --- | --- |
| Exact size preset names and pixel sizes | `src/lib/constants.js` | placeholder |
| Approved font list | `src/lib/constants.js` | placeholder |
| Multipart field names for `POST /projects` | `buildProjectForm` in `src/lib/api.js` | guessed |
| Response field names (`svg`, `owner_token`, `generations`, `colors`, `logo_url`, `created_at`) | `src/lib/api.js`, `pages/Workspace.jsx` | from plan.md |
| Error response shape | `request()` in `src/lib/api.js` | assumes `{ detail: string }` |
| History list includes banner markup (for thumbnails), or a per-version fetch | `pages/Workspace.jsx` | per-version fetch as fallback |
| Banners returned as SVG, not HTML | `src/lib/exportImage.js` | export supports SVG only |
| SVG root has `width`/`height` as well as `viewBox` (Firefox needs this for export) | backend composer | to confirm |
| Project code format (mockup shows `TN-7F3A2`) | display only | cosmetic |

## Deploying the frontend

- **Vercel / Netlify:** import the repo, set the root directory to `frontend`,
  build command `npm run build`, output `dist`. Set `VITE_API_URL` (and
  `VITE_USE_MOCK=false`) in the project's environment variables.
- `vercel.json` and `public/_redirects` make deep links such as `/project/ABC` work on refresh.
- The backend must allow CORS for the deployed origin.

## Notes

- Losing the owner token (clearing browser data) means losing access to that project.
- Generated markup is shown inside `<iframe sandbox>` so it cannot run scripts.
- Exported images embed the brand font (fetched from Google Fonts at export time);
  offline, the export still works with a fallback font.
- Logo upload is optional here, matching the backend plan.

