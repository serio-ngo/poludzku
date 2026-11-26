# Delivery

The full product ships in five pull requests built with the local serio-focus `deliver` flow (architect, tester, coder, reviewer, then `/code-review`). The owner merges; nothing else waits on the owner except the consents and the one switch listed below.

## Setup, done by the agent

| Step                                     | How                                                                                                                                                                                                              | Owner's part                                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Register the GitHub App                  | Manifest flow in the built-in browser from the committed `app-manifest.json`; the agent exchanges the code with `POST /app-manifests/{code}/conversions` and pipes the key and secret into `wrangler secret put` | A "yes" in chat before the agent clicks Create and Install: GitHub requires an organisation owner's session for both |
| Connect the repository to Workers Builds | Cloudflare dashboard in the built-in browser; there is no API to connect a repository yet ([workers-sdk 12058](https://github.com/cloudflare/workers-sdk/issues/12058))                                          | A "yes" in chat                                                                                                      |
| `main` ruleset                           | `gh api` as the organisation owner: code-owner approval of the latest push, human-only updates                                                                                                                   | None beyond the same "yes"                                                                                           |
| Join the lifecycle after release 1       | Topic `lifecycle`, then `node lifecycle/console-mcp.mjs --setup-all`                                                                                                                                             | None                                                                                                                 |

If the built-in browser is not signed in to GitHub or Cloudflare, signing in there is the owner's only extra step.

## Pull requests

Each has at most five acceptance checks, each proved by a test or a gate.

| #   | Pull request                                                                                                            | Done when                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Site: Astro and the Cloudflare adapter, tokens, layout and gates from the newsroom, `/`, `/<slug>`, `/regulamin`, `/en` | `npm run gates` green; pa11y zero errors; Lighthouse accessibility 100; Workers Builds preview serves `/` and one article                                                             |
| 2   | Engine: `stages.mjs` with both presets, the bot rule and the `.github/poludzku.yml` mapping                             | Every row of [stages.md](stages.md) and its listed edge cases pass as fixtures under `node --test`                                                                                    |
| 3   | Public pages: App token, the two reads, cache, the task page, the project page, the branch redirect                     | Playwright on recorded fixtures shows the five answers for stages 1, 4 and 7 and a stuck task; the project list puts person moves first; a branch `agent/<N>-x` redirects to task `N` |
| 4   | Sign-in: Astro sessions, the user token, private repositories, sign-out                                                 | A private fixture repository is readable only after sign-in; no response built with a user token is cached; sign-out deletes the session                                              |
| 5   | Migration: `/newsroom`, the 301 map from the 49 newsroom URLs, the custom domain in `wrangler.jsonc`                    | `lychee` over the old sitemap gives only 301 → 200; deployed on `*.workers.dev` first                                                                                                 |

Then one hand-made pull request in `serio-ngo/ops`: the console loads `stages.mjs` from this repository and drops its own `derive()`.

## The one switch

Moving `poludzku.info` from the newsroom Worker to this one replaces what readers see, so the agent asks once on the day, then detaches the domain from `news-interface` and deploys. Then [migration.md](migration.md) steps 5 and 6 follow without the owner.

## Owner's total

Two consents, five merges in this repository, one merge in ops, one "go" for the switch. No issue, spec, review or test approval is asked of the owner for release 1.
