# Business and marketing

po ludzku is a foundation tool first and a public good second. It earns its keep when the foundation's own work moves with fewer questions, and when an outside team adopts it without asking us anything.

## Problem

Teams that ship with AI agents produce more pull requests, labels and bot comments than a person can read. GitHub shows everything at once; the question a manager, a funder or a tired developer has — _is this moving, and is it my turn?_ — has no screen. For neurodivergent people the cost is higher: every scan of a noisy page is a decision, and the next step hides among forty signals.

## Position

| Alternative | What it does well | Why po ludzku is still needed |
| --- | --- | --- |
| GitHub pull request page | Complete truth | Built for the author; no "whose move", every signal at once |
| GitHub Projects, Linear, Jira | Planning, boards | Someone must move the cards; the board drifts from the code |
| Graphite, review dashboards | Developer review speed | For developers only; dense by design |
| Serio lifecycle console | Acts: approves, locks, merges | Local, for an operator with `gh`; not shareable |

po ludzku is read-only, shareable by URL, derived from GitHub so it never drifts, and written for the person who is not the author.

## Audience, in order

1. **Fundacja Serio's own team** — the lifecycle across its repositories. Success here is the only gate to step 2.
2. **Neurodivergent developers and small teams using AI agents** — open source, self-hostable, Polish and English.
3. **NGOs and grant-funded teams** — showing funders progress by a link instead of a report.

## Model

No revenue. No ads, no paid tier, no tracking — the same posture as the newsroom footer. Costs stay inside Cloudflare's free Workers plan at foundation scale; the footer says "serwis niekomercyjny" only while that holds. Funding paths, each to be checked before applying: open-source grants for public digital infrastructure (NLnet's current calls; its NGI Zero Commons Fund closed its final call on 1 June 2026), accessibility and digital-inclusion programmes, corporate open-source sponsorship through GitHub Sponsors, 1.5% after OPP status.

## Message

- PL: **„Twoja praca na GitHubie, po ludzku. Jedno zadanie. Czyj ruch. Co dalej.”**
- EN: **"GitHub work, in plain words. One task. Whose move. What next."**
- Proof, not adjectives: every claim links a live task page of a public Serio repository.

## Channels

| Channel | Action | Cost |
| --- | --- | --- |
| Build in public | po ludzku shows its own repository; every release note links a real task page | Zero; it is the product |
| serio.org.pl | One article on AI dev workflow and neurodivergence; the po ludzku project card describes this product | One article |
| Developer communities | Show HN, r/ADHD_Programmers, dev.to, Polish meetups — after the first outside adopter, not before | Time |
| Grant applications | The repository, the live demo and the lifecycle design as evidence | Time |
| Search | Article pages on poludzku.info; the tool pages are `noindex` | Zero |

## Measures

| Measure | Source | Target after 3 months |
| --- | --- | --- |
| Foundation tasks opened in po ludzku before GitHub | Aggregate request counts Cloudflare keeps for every Worker; the service itself collects nothing | Most lifecycle tasks |
| Outside organisations with the App installed | GitHub App installations | 3 |
| Questions "where is this task?" in the team | Owner's judgement | Fewer, stated in words |

No per-person metrics, ever.

## Risks

| Risk | Effect | Answer |
| --- | --- | --- |
| The name is the newsroom's | Readers of 49 law records land on a developer tool | [migration.md](migration.md) |
| The lifecycle changes its markers | Stages read wrong | One engine in this repository; the console loads it; one change, one place |
| GitHub API limits or terms change | Pages fail | The App and a 60 s cache; a page that says "GitHub nie odpowiada", never a guess |
| "Neurodiversity-friendly" becomes a slogan | Lost trust in the community it names | Claims only what pa11y, keyboard tests and named design rules prove; test sessions with neurodivergent users before any marketing says it |
| A single maintainer | The project stalls | Small surface by design; contracts in `.prd/`; the lifecycle runs the agents |

## Acceptance

A teammate opens a shared task link, understands the current situation and decides whether they need to act. A project lead opens a repository and finds the tasks waiting on people. Use a synthetic repository on the Lifecycle preset: an issue has one linked pull request in acceptance, a required check has failed and the verified contributor has the next move.

- A reader can identify the action in progress, stage, failed state, mover and next step from the task screen before opening its details. The failed check leaves the acceptance stage intact. Both languages and keyboard-only navigation support the same reading flow.
- The issue, linked pull request and its branch lead to the same task. The project list shows one row with matching stage, state and mover, ahead of rows waiting on automation.
- A visitor can open the labelled synthetic sample without signing in. Live repository data appears only after the visitor explicitly opens an opted-in repository and GitHub authorizes the applicable access. A private view stays unavailable to an unauthorized viewer and uses `private, no-store` for an authorized viewer.
- Check outcomes using fixtures and access scenarios. The service collects no usage or individual activity metrics.

[Delivery checks](delivery.md)
