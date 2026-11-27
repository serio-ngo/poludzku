---
name: e2e
description: Use when writing, running or changing browser tests with Playwright, or when deciding whether a behavior needs a dev or a preview test.
---

# Browser tests

Playwright, configured in `playwright.config.ts` at the root. Specs are `e2e/*.spec.ts`; the `.spec.ts` suffix keeps them out of `node --test`.

## Commands

- `npx playwright install chromium` once, for the browser.
- `npm run build`, then `npx playwright test`.

## Projects and servers

- `dev`: the Astro dev server on port 4321, started with `GITHUB_UPSTREAM=synthetic` and `CLOUDFLARE_INCLUDE_PROCESS_ENV=true`. Default home of specs.
- `preview`: `astro preview` of the production build on port 4322, for specs named `preview.spec.ts`. Use it for behavior that differs from dev, such as pages built ahead of time and middleware.
- Playwright starts both servers; outside CI it reuses servers already running.

## Synthetic data

- Sign in with `/sign-in?as=<ola|ben>`, optionally with `next=<path>`.
- The synthetic repository is `example/website`.
- Tests use no real GitHub data and no credentials.
