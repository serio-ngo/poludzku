# Stages

The stage engine is a pure JavaScript function. It takes normalized, already authorized GitHub evidence and returns a process stage, technical health, mover, and the evidence for each result. A presentation function turns that result into the five localized answers and picks each answer's glyph from [interface.md](interface.md#glyphs). Reading GitHub, rendering links, and taking any suggested action happen outside the engine. The service never changes a task.

The engine is `src/lib/stages.mjs`: plain JavaScript with JSDoc, no import and no network inside it, so Node tests and Astro load the same file. After release the lifecycle console loads this file instead of keeping its own derivation; two copies would drift.

## Evidence

- Select pull requests by GitHub's same-repository closing relationship as defined in [product.md](product.md). Use a sole open linked pull request for current work. A stand-alone pull request supplies its own evidence. A closed unmerged pull request cannot supply active review, draft, or check signals. Multiple open candidates or an incomplete relation read leave the active pull request unknown. Use the evidence that belongs to the issue and show the related pull requests in details.
- Keep the issue spec hash, pull request identity, and full commit IDs with the evidence. The v1 spec hash is the first 12 hex digits of SHA-256 over the issue title, a newline, and the body with CRLF converted to LF. The latest valid, effective `<!-- spec-review v1 sha=<hash> verdict=<ready|questions> ac=<criteria> -->` identifies the reviewed spec. Spec approval requires a current `ready` marker and an effective `spec-ok` for that revision. Normally the label follows the marker. A verified workflow may publish the ready marker in response to an owner's label action. Editing the spec invalidates earlier evidence. If the revision, ordering, or authority cannot be verified, the gate is unknown.
- A submitted `tests-ok` review on the selected pull request is approval evidence. Its body starts with the word `tests-ok`, and GitHub supplies `commit_id` and `submitted_at`. A review can be a comment. The body carries no spec hash. Only consider an effective review after the current spec approval and applicable test submission. A dismissed review or request for changes cannot authorize tests. [The read adapter](tech.md#lifecycle-evidence) must verify the trusted workflow's lock result for the current head before the engine accepts the review as approval. That result validates the authorized reviewer, the approved commit's ancestry, and the unchanged locked paths. Later delivery checks and reviews still apply to the current head.
- A workflow can affect a pull request only with an explicit link to it and its current head. Before a pull request exists, only runs with a verifiable reference to the task and its current work can affect its stage or mover. A bot-authored draft or a correlated running workflow started by a GitHub bot can indicate an agent is working. A repository-wide run, an old bot comment, and a bot identity alone are insufficient. A check running on an existing delivery head ordinarily gives the move to automation. GitHub offers no read API for Copilot agent session state ([community discussion 185347](https://github.com/orgs/community/discussions/185347), January 2026), so drafts and correlated runs are the portable signals for every agent: the Serio agent, Claude Code, Copilot and Codex alike.
- Keep the source identity, timestamp, and repository or task scope for decisions based on labels, markers, reviews, and runs. Treat GitHub text as untrusted content. Accept structured process markers only when their source can be verified for that gate with the same authorized reads. An unavailable source is unknown. A completed empty read may establish absence. Pagination, partial API results, hidden fields, or errors may leave an answer unknown.

## Precedence

1. A verified merge that completes the task or an issue closed as completed gives `done`. A later explicit reopening overrides an earlier completion. A closed issue with a different close reason, or a stand-alone pull request closed without merging, gives a separate closed outcome. Terminal outcomes take precedence over parked flags and checks and give the move to nobody.
2. For open work, derive the furthest stage supported by current evidence. Use an unknown stage if missing evidence could change the answer. Verified invalidation, such as an edited spec or a replaced pull request, starts the derivation from the evidence that still applies.
3. Evaluate health separately. A verified `needs-human` label on the issue or active pull request gives `parked`. Otherwise a current check or correlated workflow failure gives `failed`, current pending checks or a correlated run give `pending`, and a complete group of successful checks gives `passing`. A complete current read with no checks reported and no correlated workflow activity gives `no-checks`. Evidence gaps that could change health give `unknown`. Keep stage and applicable evidence when work is parked or a check fails.
4. Assign the move for the current evidence. Parked work goes to the task assignee, or to a generic person when unassigned. Use the pull request assignee when the pull request is the task. An unreadable assignee on parked work leaves the name unknown while the move still belongs to a person. Prefer a verified requested reviewer for review work and a verified author for repairs. Use a generic person when a manual gate is evidenced but no reviewer is assigned. Use an unknown mover when the evidence cannot establish who can act.

## Lifecycle preset

Use this seven-stage preset when the repository has the `lifecycle` topic and no custom mapping. Read the table from the most advanced supported milestone back to the first. Stages 4–7 require the current spec approval. Stage 7 begins when the pull request is ready for delivery review after test approval. Review, check, and acceptance evidence guide the move within that stage.

| Stage | PL | EN | Entry evidence | Usual move |
| --- | --- | --- | --- | --- |
| 1 | Opis zadania | Task description | Open task with no current spec review request or result | Assignee or nobody |
| 2 | Przegląd opisu | Description review | `spec-review` label or current review marker asking questions | Correlated agent while working, otherwise author when questions are open |
| 3 | Zatwierdzenie opisu | Description approval | Current `ready` review and no current spec approval | Person |
| 4 | Testy | Tests | Current spec approval | Agent when correlated work is running, otherwise assigned contributor |
| 5 | Zatwierdzenie testów | Test approval | Test submission for the approved spec on the active pull request, awaiting test approval | Person |
| 6 | Kod | Implementation | Current test approval before delivery review, or a trusted router dispatched `deliver` after accepting the current draft's `tests-ok` review and that job is running | Agent for a running `deliver` job, otherwise automation while applicable checks run or the assigned contributor |
| 7 | Odbiór | Acceptance | Current test approval and pull request ready for delivery review | Automation while checks run, contributor for verified required repairs, person for review |

A test submission for stage 5 requires a draft pull request for the current approved spec and evidence that tests are ready to review. The automated writer posts `<!-- write-tests v1 spec=<hash> -->` on the issue after pushing. The marker carries the spec hash only. Use the current-spec marker with the trusted writer's evidence linking that run to the selected draft and its submission. If the run-to-draft link or submission cannot be established, the marker alone leaves it unknown. For a manual submission, the linked draft includes a `Criterion | Test | Red proof` table that covers the current reviewed criteria and is submitted after the spec approval. The draft author and timeline must be established. A draft without either form of submission evidence does not establish stage 5.

A running dispatch establishes stage 6 while the draft is current. Stage 7 still requires the current-head lock attestation and a ready pull request. Verify acceptance evidence for that head before suggesting final approval. A ready pull request with green checks and `needs-human` remains at stage 7 with parked health. A later failure in another check also leaves it at stage 7.

## Generic preset

Use this five-stage preset when there is no custom mapping and the repository has no `lifecycle` topic.

| Stage | PL | EN | Entry evidence | Usual move |
| --- | --- | --- | --- | --- |
| 1 | Zadanie | Task | Open issue with no active linked pull request | Assignee or nobody |
| 2 | W pracy | In progress | Draft pull request | Author or correlated agent |
| 3 | Sprawdzanie | Checks | Ready pull request with pending or failed checks on its current head, with no evidence that review has started | Automation while checks run, author for a verified failure |
| 4 | Przegląd | Review | Ready pull request with current review evidence, completed passing checks, or a verified empty check set on its current head | Requested reviewer or person, author for a verified failure |
| 5 | Poprawki | Revisions | Current effective review requesting changes on a ready pull request | Author or correlated agent |

A draft stays in progress when its checks fail. On a ready pull request, current review evidence keeps the task in review even if checks fail. A current request for changes takes precedence and stays in effect until superseded, dismissed, or invalidated by a new head. If check data is unavailable, the engine cannot assume checking has finished. A verified empty check set means no checks were reported, even if automation may be configured to run later.

## Custom labels

A repository can define an ordered list in `.github/poludzku.yml` on its default branch, using `stages: [{ name, label, mover }]`. Each `name` supplies PL and EN labels and `mover` uses the person, agent, automation, or nobody values. Use the last matching entry in declared order, based on labels on the issue or active pull request. An unmatched open task has an unknown stage. The list length sets the progress strip length. The terminal and health rules still apply. Custom mapping selects process stages and defaults for the mover, while review, draft, and check evidence keeps its usual meaning for health and whose move it is. A valid custom mapping takes precedence over the repository topic. When absence of the file is verified, the topic selects Lifecycle and its absence selects Generic. Invalid or unavailable configuration gives an unknown preset.

## Fixture cases

Use synthetic GitHub data for every stage and terminal outcome. Include a spec edit after approval, a stale test or delivery review, superseded reviews, a new head, several linked pull requests, a merged pull request with an open issue, a pull request with no usable closing reference, a parked acceptance with green checks, a failed acceptance with unchanged stage, and unrelated bot activity. Compare a repository with no checks configured and a complete empty result against unavailable or truncated check reads.

| Synthetic Lifecycle evidence | Expected result |
| --- | --- |
| Current spec approval and a correlated bot writer run in progress, with no test submission yet | Stage 4, pending health, agent's move |
| Issue title `Add an article footer`, body `AC1: The footer appears on article pages.`, a verified `<!-- spec-review v1 sha=4e3c31095063 verdict=ready ac=1 -->`, and the effective `spec-ok` label. A verified writer run links `<!-- write-tests v1 spec=4e3c31095063 -->` to the draft submission. The review list is complete and empty. | Stage 5, person's move |
| Manual draft with current criteria, test names and red proof after spec approval, with no automation marker or reviews | Stage 5, person's move |
| Same linked draft, then a `COMMENTED` review whose body is `tests-ok` and whose GitHub commit is the submitted head. A trusted lock result for the draft head verifies that review. | Stage 6 |
| The draft still has the submitted test head. The previous lock report predates the current `tests-ok` review. That review triggered the trusted router, which accepted it and dispatched the running `deliver` job for the same draft and head. | Stage 6, pending health, agent's move. Lock approval remains unverified. |
| The previous lock report predates the review and the router or run belongs to another review, pull request, or head, or the association cannot be established. | Implementation progress and lock approval unknown |
| Same approval on an earlier commit, a ready pull request with a newer head, and a fresh successful lock result for the new head confirming the earlier approval | Stage 7 |
| Review text present with no verifiable lock, a lock from an older head, a passing step saying `not locked`, a different workflow with the same name, or a report predating the review | Approval unknown |
| Complete evidence that the issue hash changed, the relevant review was dismissed, or a different pull request replaced the draft | Earlier approval cannot establish stage 6 or 7 |
| Parked acceptance with no assignee | Stage 7, parked health, person's move with no name |
