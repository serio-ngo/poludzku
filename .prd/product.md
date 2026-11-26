# Product

**po ludzku answers five questions about one GitHub task, in this order: what is happening, which stage, is it fine, whose move, what next.** Everything else is a link to GitHub.

Brand `po ludzku`, address `poludzku.info`, repository `serio-ngo/poludzku`. Polish and English UI from the first release; Polish is the root path, English lives under `/en`. Documents are English.

## Who it is for

| Reader                                      | Job                                                     | What they must never need                  |
| ------------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| Developer running AI agents                 | See where a task stopped and whether the move is theirs | Reading a run log to learn the stage       |
| Project manager, team lead                  | Know what to unblock today                              | A GitHub account for a public repository   |
| Board member, funder, partner               | Trust that work moves, from a link                      | Any technical word                         |
| Neurodivergent person on any of these roles | One thing on screen, a calm tone, the next step         | Counting, scanning tables, decoding colour |

## The unit is a task, not a branch

A task is one issue and the pull requests that fix it. GitHub numbers issues and pull requests in one sequence per repository, so one number opens either: `/gh/<owner>/<repo>/<number>`. A pull request number resolves to its task when the body says `Fixes #N`; without that, the pull request is the task.

A branch is never a view of its own. `/gh/<owner>/<repo>/tree/<branch>` resolves to the open pull request of that branch, or to issue `N` for a branch named `agent/<N>-…`, and redirects. A branch with neither shows "Ta gałąź nie ma jeszcze zadania" and a link to GitHub.

## Routes

| Route                         | Shows                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                           | What the service does, one custom text block from `src/content/home.md`, the foundation's own projects as tabs                             |
| `/<slug>`                     | An article or custom page from `src/content/pages/` — the only free-text space                                                             |
| `/gh/<owner>/<repo>`          | Project: tabs of projects the viewer can see, then **one** list: tasks whose move is a person's first, then the rest. Each row is one line |
| `/gh/<owner>/<repo>/<number>` | The task: the five answers, the stage strip, then technical detail folded under "Szczegóły"                                                |

Every route is a shareable URL. No state lives only in the browser except the viewer's last project tab.

## The five answers

| Question                 | Source                                                                 | Example                      |
| ------------------------ | ---------------------------------------------------------------------- | ---------------------------- |
| Co się dzieje?           | The stage note, see [stages.md](stages.md)                             | "Agent pisze testy."         |
| Na jakim etapie?         | Stage 1–7 of the repository's preset                                   | "4 z 7 · Testy"              |
| Czy wszystko w porządku? | Checks and the parked state, never the stage alone                     | "Tak" / "Coś się zatrzymało" |
| Czyj ruch?               | The stage's owner: `Ty`, a named person, `agent`, `automat`, or `nikt` | "Ruch: Adrian"               |
| Co dalej?                | The next stage, one sentence                                           | "Potem przeglądasz testy."   |

"Czyj ruch" is the product. It is the answer the analysis behind this project missed: a status without an owner tells a reader nothing to do.

## Scope

| We do                                                                                          | We do not do                                                              |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| One task per screen, one list per project                                                      | Dashboards, charts, burndown, velocity, people metrics                    |
| Read GitHub: issues, pull requests, labels, reviews, checks, workflow runs, lifecycle comments | Write to GitHub — no merge, label or review buttons (v1)                  |
| The Serio lifecycle as the built-in preset; a label-and-checks preset for everyone else        | A new label system any team must adopt                                    |
| Public repositories without login; private ones with GitHub sign-in                            | Share links that open a private repository to someone GitHub would refuse |
| An article space on the same site                                                              | Comments, accounts of our own, notifications, e-mail                      |

Commits and deployments appear only inside "Szczegóły", only as links. Time and people statistics are out permanently: they invite comparison, which this audience does not need.

## Access

- **Public repository**: open by URL, no login, once its organisation has installed the po ludzku GitHub App. A repository without the App is not shown: anonymous GitHub reads allow 60 requests an hour per server address, which one busy page exhausts, and nobody should find their organisation's work on poludzku.info without having opted in.
- **Private repository**: "Zaloguj przez GitHub". The viewer sees exactly what GitHub lets their own account see — the server asks GitHub with the viewer's user token, never with a wider one. A person without a GitHub account cannot see a private repository; that is a GitHub rule, not ours.
- An organisation opts in by installing the App with read-only permissions: Metadata, Issues, Pull requests, Checks, Actions, Commit statuses.

## Still open

| Question                                                                 | Default if unanswered                                                            |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Write actions (approve spec, lock tests) as in the ops lifecycle console | Not in v1; the console stays the operator tool                                   |
| Other forges (GitLab, Forgejo)                                           | Not planned; the stage engine stays forge-neutral data in, so a port is possible |
| Name abroad                                                              | „po ludzku” stays; the English tagline carries meaning                           |
