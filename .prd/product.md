# Product

**po ludzku answers five questions about one GitHub task, in this order: what is happening, which stage, is it fine, whose move, what next.** Everything else is a link to GitHub. The service reads GitHub and never writes to it.

Brand `po ludzku`, address `poludzku.info`, repository `serio-ngo/poludzku`. Polish and English UI from the first release; Polish is the root path, English lives under `/en`. Documents are English.

## Who it is for

| Reader | Job | What they must never need |
| --- | --- | --- |
| Developer running AI agents | See where a task stopped and whether the move is theirs | Reading a run log to learn the stage |
| Project manager, team lead | Know what to unblock today | A GitHub account for a public repository |
| Board member, funder, partner | Trust that work moves, from a link | Any technical word |
| Neurodivergent person in any of these roles | One thing on screen, a calm tone, the next step | Counting, scanning tables, decoding colour |

## One task

An issue is a task. A pull request with exactly one readable closing issue in the same repository resolves to that issue. Pull requests with no such issue or multiple such issues are standalone tasks. Mentions and cross-repository links do not establish a task. An issue's task view includes all pull requests that resolve to it.

A branch with exactly one matching open pull request redirects to that pull request's canonical task. With no matching open pull request, a branch named `agent/<N>-…` redirects to issue `N` if that issue can be read. Multiple matches or a branch with no resolvable task show a localized message and a link to GitHub. The branch never receives its own task state.

The project page lists each canonical task once, with person-owned moves first and most recent activity first within each group. Its rows use the same derived result as the task page. [Stage and state rules](stages.md)

List open issues and open pull requests. Follow pagination within the request budget. If pages remain, label the list as partial, rank only the rows read and link to the repository on GitHub. A partial page with zero confirmed tasks must say that the list is incomplete. Test this with a person-owned task on a later page.

## Routes

| Route | View |
| --- | --- |
| `/` | A short introduction from `src/content/home.md`, one synthetic sample, the glyph legend and an entry point for opening a GitHub repository. |
| `/<slug>` | A Markdown article from `src/content/pages/`. |
| `/gh/<owner>/<repo>` | One list for the repository the viewer opened. |
| `/gh/<owner>/<repo>/<number>` | The canonical task, its five answers, stage strip and folded technical details. |
| `/gh/<owner>/<repo>/tree/<branch>` | Canonical redirect or the unresolved branch view. |
| `/zaloguj`, `/wyloguj` | Start GitHub sign-in or sign out. |
| `/regulamin` | Terms covering the publisher, session data, retention and tracking policy. |

Polish is served at the root and English under `/en`. Both variants preserve the same routes. The sample uses synthetic data and is visibly identified. The home page has no organization tabs or repository directory.

The terms name the publisher: Fundacja Serio, ul. Lema 2C/57, 80-126 Gdańsk, KRS 0001260622, NIP 5833576778, REGON 545486785, kontakt@serio.org.pl. Nothing ships as a placeholder: every page uses real values or, in the sample and fixtures, invented data.

## The five answers

| Question | Source | Example |
| --- | --- | --- |
| Co się dzieje? | The stage note, see [stages.md](stages.md) | "Agent przygotowuje testy." |
| Na jakim etapie? | The stage of the repository's preset | "4 z 7 · Testy" |
| Czy wszystko w porządku? | Health from checks, runs and the parked state, never the stage alone | "Praca trwa." / "Nie. Sprawdzenie nie przeszło." |
| Czyj ruch? | The mover: `Ty`, a named person, a generic person, `agent`, `automat`, `nikt` or unknown | "Ty" |
| Co dalej? | The next stage or checkpoint, one sentence | "Potem ktoś sprawdzi testy." |

On a tool screen each answer is a glyph with at most one word. Its sentence lives in the folded details and in the glyph's accessible name: see the [text budget](interface.md#text-budget).

"Czyj ruch" is the product: a status without an owner tells a reader nothing to do.

## Scope

| We do | We do not do |
| --- | --- |
| One task per screen, one list per project | Dashboards, charts, burndown, velocity, people metrics |
| Read GitHub: issues, pull requests, labels, reviews, checks, workflow runs, lifecycle comments | Write to GitHub — no merge, label or review buttons (v1) |
| The Serio lifecycle as the built-in preset; a label-and-checks preset for everyone else | A new label system any team must adopt |
| Public repositories without login; private ones with GitHub sign-in | Share links that open a private repository to someone GitHub would refuse |
| An article space on the same site | Comments, accounts of our own, notifications, e-mail |

Commits and deployments appear only inside "Szczegóły", only as links. Time and people statistics are out permanently: they invite comparison, which this audience does not need.

## Access

The viewer opens a specific repository that has opted in through installation of the read-only GitHub App. An opted-in public repository can be read without signing in. A private repository requires GitHub sign-in and a read using the viewer's token. GitHub must authorize that viewer before any private task or repository information is returned. An unavailable repository view reveals no private metadata. Private and viewer-specific responses use `Cache-Control: private, no-store`.

- A repository without the App is not shown: anonymous GitHub reads allow 60 requests an hour per server address, which one busy page exhausts, and nobody should find their organisation's work on poludzku.info without having opted in.
- The App reads without access to code; its permissions are in [tech.md](tech.md#the-github-app).
- A signed-in viewer stays signed in for the 8 hours GitHub gives the token, then signs in again with one click.

The browser stores only the signed-in session cookie. There is no tracking. Live tool pages use `noindex`, show when GitHub data was read and provide a manual reload link. The interface supports keyboard use, gives every glyph its words for assistive technology and keeps the sentences and technical details folded. [Interface contract](interface.md)

## Still open

| Question | Default if unanswered |
| --- | --- |
| Write actions (approve spec, lock tests) as in the lifecycle console | Not in v1; the console stays the operator tool |
| Other forges (GitLab, Forgejo) | Not planned; the stage engine stays forge-neutral data in, so a port is possible |
| Name abroad | „po ludzku” stays; the English tagline carries meaning |
