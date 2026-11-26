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
sign-in are built. It is not yet a public release. The contracts below
are the source of truth; the [delivery plan](.prd/delivery.md) says what release still needs.

## Run it

```sh
npm ci
npm run dev
```

Open <http://localhost:4321> and press the button: it opens `serio-ngo/poludzku`. `npm run dev`
reads live GitHub with your own `gh auth token` on the local server (`GITHUB_UPSTREAM=gh` in
`.dev.vars`, created from `.dev.vars.example`), so any repository you can read opens. This mode
never runs in production. Never expose the dev server (`--host`, a tunnel): it reads with your
token. `GITHUB_UPSTREAM=synthetic` reads the invented test upstream instead.

Production reads through the GitHub App registered from `app-manifest.json` with GitHub's
manifest flow; its values go in Worker secrets. What is left before release is tracked in
[serio-ngo/ops#140](https://github.com/serio-ngo/ops/issues/140).

- `npm test` runs the unit tests.
- `npm run check` runs types, links, build and unit tests.

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
