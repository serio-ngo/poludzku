# Tech

**Zero custom code where a ready tool exists.** One Astro project, one Cloudflare Worker, no database, no client framework.

## Stack

| Part         | Choice                                                                                                                                                                            | Why                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Site         | Astro 7 with `@astrojs/cloudflare`; content pages prerendered, `/gh/**` rendered on request                                                                                       | The newsroom already runs Astro 7 on Workers; same build, same gates |
| Client JS    | One small script for the "Zmieniło się — odśwież" line and the folded details; zero islands                                                                                       | The newsroom's rule; a status page needs no hydration                |
| GitHub reads | `fetch` to GraphQL v4: one query per task (issue, linked pull requests, labels, reviews, check rollup, last 100 comments); one REST call per repository for running workflow runs | No Octokit; two requests per uncached task                           |
| Identity     | The po ludzku GitHub App: installation token for public repositories, user-to-server token for a signed-in viewer                                                                 | Read-only scopes; GitHub decides who sees what                       |
| Session      | The viewer's GitHub token, AES-GCM encrypted with a Worker secret, in an `HttpOnly; Secure; SameSite=Lax` cookie that expires with the token (8 h)                                | No session store, nothing to breach at rest                          |
| Cache        | Workers Cache API, 60 s, key = repository + number. Private responses are never written to a shared cache                                                                         | Freshness without polling GitHub per view                            |
| Tests        | `node --test` for the stage engine against recorded fixtures; Playwright for the task screen                                                                                      | Same runners the lifecycle gate expects                              |

Webhook-driven cache purge is the first upgrade when 60 s proves too slow; v1 does not ship it.

## Shape

```
src/lib/stages.ts      derive(): pure, the engine of stages.md, ported from ops lifecycle/console-mcp.mjs
src/lib/github.ts      the two reads and the token choice; the only file that talks to GitHub
src/config/site.ts     STATES, presets, App id; no model, no org name hard-coded
src/config/words.ts    PL/EN glossary
src/content/home.md    the custom block on /
src/content/pages/     articles
```

## Brand without a private package

`@serio-ngo/brand` is `UNLICENSED` and installs only with registry access, so an open-source repository cannot depend on it: an outside contributor's `npm ci` would fail. The repository carries its own copy of the tokens it uses (`src/styles/tokens/`, from news-interface), Newsreader, Libre Franklin and JetBrains Mono under their OFL licences, and the marks in `public/brand/` under the trademark note in the README. `brand-sync` does not run here; a brand change is copied by hand in a normal pull request.

## Reused from the newsroom

`astro.config.mjs` shape, `Base.astro`, `src/styles/tokens/`, `glue` from `src/lib/format.ts` (Polish line breaks), `scripts/gates.mjs`, `scripts/docs-links.mjs`, `.pa11yci.json`, `lighthouserc.json`, `lychee.toml`, cspell, knip, prettier, `verify.yml`, `wrangler.jsonc`. Not reused: records, the record verifier and its hooks, machine surfaces (RSS, ICS, llms.txt), social posting, `records.yml`, the newsroom skills.

## Reused from krok

The locale file pattern (`src/locales/pl.ts`, `en.ts`), progress as dots, the hidden-not-greyed rule.

## Lifecycle

This repository is public, so unlike the private pilots it can hold `main` rulesets: code-owner approval of the latest push and human-only updates. It joins the Serio lifecycle (topic `lifecycle`, `agent.yml`, the lifecycle gate) with its first code task, and po ludzku then shows its own development — the first live demo.

## Budgets

Task page under 30 KB of HTML and CSS, under 2 KB of JS; LCP under 1.5 s on a cached view; Lighthouse accessibility 100. Copied from the newsroom's `lighthouserc.json` and tightened.
