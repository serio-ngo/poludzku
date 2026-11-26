# Tech

**Zero custom code where a ready tool exists.** One Astro project, one Cloudflare Worker, zero client JavaScript, no database of our own, no webhooks.

## Stack

| Part         | Choice                                                                                                                                                                                                                                            | Why                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Site         | Astro 7 with `@astrojs/cloudflare`; content pages prerendered, `/gh/**` rendered on request                                                                                                                                                       | The newsroom already runs Astro 7 on Workers; same build, same gates                |
| Client JS    | None. Folded detail is native `<details>`; freshness is a printed time and a reload link                                                                                                                                                          | Nothing to hydrate, nothing to break, nothing that moves                            |
| GitHub reads | `fetch` to GraphQL v4 with `repository.issueOrPullRequest(number:)`, `closedByPullRequestsReferences`, `closingIssuesReferences`, reviews, `statusCheckRollup`, last 100 comments; plus one REST `actions/runs?status=in_progress` per repository | No Octokit; two requests per uncached page                                          |
| Identity     | The po ludzku GitHub App: an installation token for public repositories, the viewer's user token after sign-in                                                                                                                                    | GitHub decides who sees what; one registration covers both                          |
| App token    | `universal-github-app-jwt` signs the App JWT; the installation token is cached in the Cache API for 50 of its 60 minutes                                                                                                                          | The only dependency added for auth; WebCrypto alone needs hand-written PEM handling |
| Session      | Astro sessions; the adapter binds Workers KV as `SESSION` and Wrangler provisions it on deploy. The session holds the user token for its 8-hour life; logout deletes it                                                                           | Built in: no cookie crypto of our own, no setup step                                |
| Cache        | Workers Cache API, 60 s, key = owner/repo/number or owner/repo. Responses built with a user token are never cached                                                                                                                                | One GitHub query per minute per page at most                                        |
| Tests        | `node --test` for the engine against recorded fixtures; Playwright for the task and project pages against fixture data                                                                                                                            | The runners the lifecycle gate expects                                              |

## Why no webhooks and no refresh tokens

- **Rate limits are not the constraint.** An installation gets 5,000 GraphQL points an hour. A GraphQL query costs one point per hundred connections requested: the task query is 1 point, the project query (50 issues with labels, comments and up to 3 pull requests each with reviews and checks) about 7. With the 60 s cache one busy project costs at most 420 points an hour. Webhooks would add an endpoint, a secret and signature checks to save points nobody needs.
- **User tokens expire after 8 hours; we let them.** Storing the 6-month refresh token would keep a long-lived credential at rest for every viewer. Signing in again is one click for anyone already signed in to GitHub.

## Shape

```
src/lib/stages.mjs     derive(): pure plain JS with JSDoc, the engine of stages.md; Node and Astro both import it
src/lib/github.ts      the two reads and the token choice; the only file that talks to GitHub
src/pages/gh/…         task, project and branch-redirect routes
src/pages/zaloguj/…    sign-in start and callback; wyloguj
src/config/site.ts     STATES, presets, App id; no organisation name hard-coded
src/locales/pl.ts, en.ts  every visible word, glossary included
src/content/home.md    the custom block on /
src/content/pages/     articles and /regulamin
```

## The GitHub App

Registered once from a manifest committed as `app-manifest.json`, so its permissions are reviewed in a pull request: Metadata, Issues, Pull requests, Checks, Actions and Commit statuses, all read-only, plus the **Single file** permission on `.github/poludzku.yml` instead of Contents, so no installation ever grants code. Webhook off. Callback `https://poludzku.info/zaloguj/github`; user tokens expire. The private key is converted from GitHub's PKCS#1 to the PKCS#8 that WebCrypto and `universal-github-app-jwt` need, in the same pipe that runs `wrangler secret put`; it and the client secret live only in Worker secrets, never in a file.

## Brand without a private package

`@serio-ngo/brand` is `UNLICENSED` and installs only with registry access, so an open-source repository cannot depend on it: an outside contributor's `npm ci` would fail. The repository carries its own copy of the tokens it uses (`src/styles/tokens/`, from news-interface), Newsreader, Libre Franklin and JetBrains Mono under their OFL licences, and the marks in `public/brand/` under the trademark note in the README. `brand-sync` does not run here; a brand change is copied by hand in a normal pull request. Without the private package the build needs no `NODE_AUTH_TOKEN`.

## Reused from the newsroom

`astro.config.mjs` shape, `Base.astro`, `src/styles/tokens/`, `glue` from `src/lib/format.ts` (Polish line breaks), `scripts/gates.mjs`, `scripts/docs-links.mjs`, `.pa11yci.json`, `lighthouserc.json`, `lychee.toml`, cspell, knip, prettier, `verify.yml`, `wrangler.jsonc`, deployment through Workers Builds. Not reused: records, the record verifier and its hooks, machine surfaces (RSS, ICS, llms.txt), social posting, `records.yml`, the newsroom skills.

## Reused from krok

The locale file pattern (`src/locales/pl.ts`, `en.ts`), progress as dots, the hidden-not-greyed rule.

## Lifecycle

This repository is public, so unlike the private pilots it can hold `main` rulesets: code-owner approval of the latest push and human-only updates. It joins the Serio lifecycle after the first release (topic `lifecycle`, then the console's `--setup-all`, which copies the agent secrets and workflows), and po ludzku then shows its own development. The first release is built with the local serio-focus `deliver` flow: see [delivery.md](delivery.md).

## Budgets

Task page under 30 KB of HTML and CSS and 0 KB of JS; LCP under 1.5 s on a cached view; Lighthouse accessibility 100. Copied from the newsroom's `lighthouserc.json` and tightened.
