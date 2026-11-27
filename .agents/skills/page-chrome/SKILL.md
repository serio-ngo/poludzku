---
name: page-chrome
description: Use when changing or testing the top bar or footer of any page, the sign-in state shown on pages, or their locale texts.
---

# Page chrome

The top bar and footer are the same components on every page: `/`, `/en`, `/terms`, `/en/terms`, `/404`, `/sign-in/callback` and `/gh/...`.

## Top bar

- `src/components/TopBar.astro` is the only top bar. It reads the sign-in state from `locals.viewer`, set by `src/middleware.ts` from the session.
- Pages that show the session are rendered on the server, never built ahead of time and fall under the middleware `DYNAMIC` rule: no-store and noindex.
- The middleware clears an expired session cookie.
- Signed out: the `header` holds a sign-in link to `/sign-in?next=<path and query>`.
- Signed in: the `header` holds the login and a form posting to `/sign-out`.

## Footer

- `src/components/Footer.astro` is the only footer, identical on every page.
- It is a `nav` with an accessible name from the locale, holding in order the logo, the terms link and the source link.
- The logo is an `img` of `public/brand/serio-logo.svg`, alt from the brand; the brand file is never changed.
- The terms link path depends on the locale. The source link has `rel="noopener"`.

## Texts and layout

- Texts live in `src/locales/pl.ts` and `src/locales/en.ts`, with the same shape. Tests read them from there.
- Links and buttons in the top bar and footer are at least 44x44 px.
- No horizontal scroll at 320 px width.
- Browser tests follow the `e2e` skill.
