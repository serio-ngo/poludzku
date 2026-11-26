# po ludzku

**GitHub work, in plain words. One task. Whose move. What next.**

po ludzku shows one GitHub task at a time — an issue and its pull request — as a short
answer anyone can read: what is happening, which stage it is in, whether it is fine,
whose move it is, and what comes next. The project list puts tasks waiting for a person
first. Built for teams that ship with AI agents and for people who find GitHub's own
screens too loud: neurodivergent developers, project managers, board members, funders.

Open source by [Fundacja Serio](https://serio.org.pl). Hosted at
[poludzku.info](https://poludzku.info). Read-only. No ads, no tracking, no account for
public repositories.

## Status

v1 candidate: the task and project screens, the stage engine, sessions and the GitHub App
sign-in are built and verified locally. It is not yet a public release. The contracts below
are the source of truth; the [delivery plan](.prd/delivery.md) says what release still needs.

## Run it

```sh
npm ci
npm run dev
```

Open <http://localhost:4321>. This needs no account: with `GITHUB_UPSTREAM=synthetic` it reads
invented repositories under the owner `przyklad`, for example `/gh/przyklad/strona`.

For live mode, copy `.dev.vars.example` to `.dev.vars` and fill in your GitHub App's values.
Register the App from `app-manifest.json` with GitHub's manifest flow.

- `npm test` runs the unit tests.
- `npm run test:e2e` runs the browser tests.
- `npm run a11y` runs the accessibility check.
- `npm run gates` runs the product gates.
- `npm run check` runs types, format, dead code, spelling, links, gates, build and unit tests.

## Reference

- [Product](.prd/product.md) — what it says and does, scope, routes, access
- [Stages](.prd/stages.md) — how GitHub evidence becomes a stage, health and a move
- [Interface](.prd/interface.md) — calm UI rules, task and project screens
- [Tech](.prd/tech.md) — Astro on Cloudflare, GitHub App, sessions, cache, reuse
- [Business and marketing](.prd/business.md) — audience, model, channels, risks, acceptance
- [Migration](.prd/migration.md) — replacing the po ludzku newsroom on poludzku.info
- [Delivery](.prd/delivery.md) — one-session candidate, then release setup
- [Agent instructions](AGENTS.md)

## License

Code: [MIT](LICENSE). Text in `.prd/` and `src/content/`: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
The „po ludzku” and „serio” names and marks, including `public/brand/`, are not licensed for reuse.
Fonts in `src/assets/fonts/` are under the SIL Open Font License.
